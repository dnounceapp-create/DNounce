"""
DNounce Reddit Lead Generation Tool
Runs daily. Finds 10 perfect-fit Reddit posts, generates demo records,
emails a summary card with Reddit + DNounce demo links.
"""

import os
import sys
import logging
import time
import uuid
import json
import re
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("dnounce-monitor")

# ── Config ───────────────────────────────────────────────────────────────────
GROQ_API_KEY         = os.environ["GROQ_API_KEY"]
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_KEY         = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_API_KEY       = os.environ["RESEND_API_KEY"]
ALERT_EMAIL          = os.environ.get("ALERT_EMAIL", "vasquezkenny97@outlook.com")
FROM_EMAIL           = os.environ.get("FROM_EMAIL", "notifications@dnounce.com")
DNOUNCE_BASE_URL     = "https://dnounce.com"

# ── Subreddits ────────────────────────────────────────────────────────────────
SUBREDDITS = [
    "freelance", "Upwork", "smallbusiness", "realtors",
    "Entrepreneur", "nail", "barber", "weddingplanning",
    "legaladvice", "TalesFromYourServer", "malegrooming",
    "personalfinance", "consumer", "contractors"
]

# ── Scoring Keywords ──────────────────────────────────────────────────────────
PROFESSION_KEYWORDS = [
    "barber", "nail tech", "realtor", "freelancer", "contractor",
    "waitress", "waiter", "server", "plumber", "electrician",
    "designer", "developer", "photographer", "cleaner", "stylist",
    "makeup artist", "lash tech", "esthetician", "mechanic", "painter"
]

EVIDENCE_KEYWORDS = [
    "receipt", "screenshot", "contract", "invoice", "proof",
    "text message", "email", "dms", "photos", "records", "documentation"
]

URGENCY_KEYWORDS = [
    "won't pay", "wont pay", "didn't pay", "ghosted", "scammed",
    "stiffed", "chargeback", "refuses to pay", "false review",
    "bad review", "left a review", "ruined my reputation",
    "owes me", "never paid", "stole", "fraud", "dispute",
    "took my money", "blocked me", "no refund", "lied"
]

POWERLESS_KEYWORDS = [
    "don't know what to do", "need help", "any advice",
    "what can i do", "feels hopeless", "no recourse",
    "platform won't help", "yelp removed", "google took down",
    "nothing i can do", "at a loss", "desperate"
]


def score_post(title: str, body: str) -> tuple[int, str]:
    """Score a Reddit post 0-10 for DNounce fit. Returns (score, persona)."""
    text = (title + " " + body).lower()
    score = 0
    persona = "consumer"  # default

    # Profession mentioned → +3
    for kw in PROFESSION_KEYWORDS:
        if kw in text:
            score += 3
            break

    # Determine persona
    professional_indicators = [
        "my client", "client won't pay", "customer", "my work",
        "my services", "i did the work", "bad client", "hired me"
    ]
    for ind in professional_indicators:
        if ind in text:
            persona = "professional"
            break

    # Dollar amount mentioned → +2
    if re.search(r'\$[\d,]+|\d+\s*dollars?|\d+k\b', text):
        score += 2

    # Evidence mentioned → +2
    for kw in EVIDENCE_KEYWORDS:
        if kw in text:
            score += 2
            break

    # Urgency keywords → +2
    matches = sum(1 for kw in URGENCY_KEYWORDS if kw in text)
    score += min(matches * 1, 2)

    # Powerless/wants help → +1
    for kw in POWERLESS_KEYWORDS:
        if kw in text:
            score += 1
            break

    # Cap at 10
    return min(score, 10), persona


def fetch_reddit_posts() -> list[dict]:
    """Fetch recent posts from target subreddits using Reddit's public JSON API."""
    import requests

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    }
    candidates = []

    for sub_name in SUBREDDITS:
        try:
            log.info(f"Scanning r/{sub_name}...")
            url = f"https://www.reddit.com/r/{sub_name}/new.json?limit=50"
            r = requests.get(url, headers=headers, timeout=15)

            if r.status_code == 429:
                log.warning(f"Rate limited on r/{sub_name}. Waiting 60s...")
                time.sleep(60)
                continue

            if r.status_code != 200:
                log.warning(f"r/{sub_name} returned {r.status_code}. Skipping.")
                continue

            posts = r.json().get("data", {}).get("children", [])

            for post in posts:
                data = post.get("data", {})

                # Skip if older than 48 hours
                age_hours = (time.time() - data.get("created_utc", 0)) / 3600
                if age_hours > 48:
                    continue

                # Skip if no body
                body = data.get("selftext", "") or ""
                if len(body) < 100:
                    continue

                # Skip deleted/removed
                if body in ("[deleted]", "[removed]"):
                    continue

                title = data.get("title", "")
                score, persona = score_post(title, body)

                if score >= 5:
                    candidates.append({
                        "reddit_id": data.get("id"),
                        "title": title,
                        "body": body[:2000],
                        "author": data.get("author", "unknown"),
                        "subreddit": sub_name,
                        "url": f"https://reddit.com{data.get('permalink', '')}",
                        "score": score,
                        "persona": persona,
                        "created_utc": data.get("created_utc", 0),
                    })

            time.sleep(3)  # Be respectful — 3 seconds between subreddits

        except Exception as e:
            log.warning(f"Error scanning r/{sub_name}: {e}")
            continue

    # Sort by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)

    # Return top 10 (5 professional + 5 consumer if possible)
    professionals = [c for c in candidates if c["persona"] == "professional"][:5]
    consumers = [c for c in candidates if c["persona"] == "consumer"][:5]

    result = professionals + consumers
    if len(result) < 10:
        extras = [c for c in candidates if c not in result]
        result += extras[:10 - len(result)]

    log.info(f"Found {len(result)} qualifying posts")
    return result[:10]


def generate_demo_record(post: dict) -> dict:
    """Use Groq to generate a realistic DNounce record from a Reddit post."""
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY)

    persona = post["persona"]
    role = "professional defending themselves against a bad client" if persona == "professional" else "consumer filing a record against a professional"

    prompt = f"""You are generating a realistic DNounce record. DNounce is a community-powered reputation platform where both sides get a fair process and the community votes to keep or delete the record.

Based on this Reddit post, generate a realistic DNounce record in JSON format.

Reddit post title: {post['title']}
Reddit post body: {post['body'][:1000]}
User role: {role}

Generate a JSON object with these exact fields:
{{
  "subject_name": "the professional's name or business (invent a realistic one if not mentioned)",
  "subject_profession": "their profession/job title",
  "subject_location": "city, state (invent realistic one based on context)",
  "relationship": "the relationship between the two parties",
  "category": "the profession category (e.g. Barber, Nail Tech, Freelancer)",
  "description": "a detailed, factual 3-4 sentence description of what happened, written as the record filer",
  "rating": a number from 1 to 4 (bad experience),
  "contributor_display_name": "realistic first name + last initial for the person filing",
  "debate_subject_opening": "2-3 sentences from the subject (other side) defending themselves professionally",
  "debate_subject_response": "2-3 sentences responding to any counter-arguments",
  "voter_1_alias": "a realistic voter alias",
  "voter_1_choice": "side_with_contributor or side_with_subject",
  "voter_1_explanation": "1-2 sentences explaining their vote",
  "voter_2_alias": "a realistic voter alias",
  "voter_2_choice": "side_with_contributor or side_with_subject",
  "voter_2_explanation": "1-2 sentences explaining their vote",
  "voter_3_alias": "a realistic voter alias",
  "voter_3_choice": "side_with_contributor or side_with_subject",
  "voter_3_explanation": "1-2 sentences explaining their vote",
  "citizen_1_alias": "a realistic citizen alias",
  "citizen_1_statement": "1-2 sentences of community commentary",
  "citizen_2_alias": "a realistic citizen alias",
  "citizen_2_statement": "1-2 sentences of community commentary"
}}

Return ONLY valid JSON. No markdown, no explanation, no backticks."""

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.7,
            )
            content = response.choices[0].message.content.strip()
            # Strip any accidental markdown
            content = re.sub(r'^```json\s*', '', content)
            content = re.sub(r'\s*```$', '', content)
            return json.loads(content)
        except json.JSONDecodeError as e:
            log.warning(f"JSON parse error on attempt {attempt + 1}: {e}")
            time.sleep(2)
        except Exception as e:
            log.warning(f"Groq error on attempt {attempt + 1}: {e}")
            if "429" in str(e):
                wait = 30 * (2 ** attempt)
                log.info(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                time.sleep(2)

    return None


def insert_demo_record(post: dict, generated: dict) -> str | None:
    """Insert demo record into Supabase. Returns the record ID or None."""
    import requests

    record_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    # Find or create a demo subject
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # Create demo subject
    subject_id = str(uuid.uuid4())
    subject_payload = {
        "subject_uuid": subject_id,
        "name": generated.get("subject_name", "Demo Subject"),
        "job_title": generated.get("subject_profession", "Professional"),
        "location": generated.get("subject_location", "New York, NY"),
        "organization": None,
    }

    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/subjects",
            headers=headers,
            json=subject_payload,
            timeout=10
        )
        if r.status_code not in (200, 201):
            log.error(f"Subject insert failed: {r.status_code} {r.text}")
            return None
    except Exception as e:
        log.error(f"Subject insert exception: {e}")
        return None

    # Insert the demo record
    record_payload = {
        "id": record_id,
        "subject_id": subject_id,
        "record_type": "pending",
        "is_published": True,
        "is_demo": True,
        "demo_source_url": post["url"],
        "demo_persona": post["persona"],
        "demo_expires_at": expires_at,
        "description": generated.get("description", ""),
        "category": generated.get("category", "Professional"),
        "relationship": generated.get("relationship", "Client"),
        "location": generated.get("subject_location", "New York, NY"),
        "rating": generated.get("rating", 2),
        "anonymity_status": "Anonymity Granted",
        "contributor_identity_preference": False,
        "contributor_display_name": generated.get("contributor_display_name", "Anonymous"),
        "status": "voting",
        "agree_terms": True,
        "first_name": generated.get("subject_name", "Demo").split()[0],
        "last_name": generated.get("subject_name", "Subject Demo").split()[-1],
    }

    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/records",
            headers=headers,
            json=record_payload,
            timeout=10
        )
        if r.status_code not in (200, 201):
            log.error(f"Record insert failed: {r.status_code} {r.text}")
            return None
    except Exception as e:
        log.error(f"Record insert exception: {e}")
        return None

    log.info(f"Demo record created: {record_id}")
    return record_id


def send_summary_email(matches: list[dict]) -> None:
    """Send daily summary email via Resend."""
    import requests

    if not matches:
        log.info("No matches to email.")
        return

    # Build HTML summary card
    cards_html = ""
    for i, m in enumerate(matches, 1):
        persona_badge = "🔨 Professional" if m["persona"] == "professional" else "👤 Consumer"
        cards_html += f"""
        <div style="border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px; background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:#6b7280;">{persona_badge} · Score: {m['score']}/10 · r/{m['subreddit']}</span>
          </div>
          <p style="font-weight:600; color:#111; margin:0 0 8px 0; font-size:14px;">{m['title'][:120]}...</p>
          <p style="color:#6b7280; font-size:13px; margin:0 0 12px 0;">{m['body'][:200]}...</p>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <a href="{m['reddit_url']}" style="display:inline-block; padding:8px 16px; background:#ff4500; color:#fff; border-radius:999px; text-decoration:none; font-size:12px; font-weight:600;">View Reddit Post →</a>
            <a href="{m['demo_url']}" style="display:inline-block; padding:8px 16px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:12px; font-weight:600;">View DNounce Demo →</a>
          </div>
          <div style="margin-top:12px; background:#f9fafb; border-radius:8px; padding:12px;">
            <p style="font-size:11px; color:#6b7280; margin:0 0 4px 0;">💬 Suggested comment to post on Reddit:</p>
            <p style="font-size:12px; color:#374151; margin:0; font-style:italic;">
              "Hey u/{m['author']}, I came across your post and built a structured public record from your situation — it shows both sides with evidence columns, community debate, and a formal verdict. Might be more effective than a Reddit post alone: {m['demo_url']}"
            </p>
          </div>
        </div>
        """

    html = f"""
    <div style="font-family:sans-serif; max-width:680px; margin:0 auto; padding:24px; color:#333;">
      <h2 style="color:#111;">🎯 DNounce Daily Lead Report — {datetime.now().strftime('%B %d, %Y')}</h2>
      <p style="color:#6b7280;">Found <strong>{len(matches)} Reddit posts</strong> that are perfect fits for DNounce today. Demo records have been created and are live for 7 days.</p>
      {cards_html}
      <p style="margin-top:32px; font-size:12px; color:#9ca3af;">DNounce Lead Generation Tool · Automated Daily Report</p>
    </div>
    """

    payload = {
        "from": FROM_EMAIL,
        "to": [ALERT_EMAIL],
        "subject": f"DNounce Daily Leads — {len(matches)} matches found ({datetime.now().strftime('%b %d')})",
        "html": html,
    }

    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=10
        )
        if r.status_code in (200, 201):
            log.info("Summary email sent successfully")
        else:
            log.error(f"Email send failed: {r.status_code} {r.text}")
    except Exception as e:
        log.error(f"Email exception: {e}")


def main():
    log.info("=== DNounce Reddit Monitor Starting ===")
    log.info(f"Run time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 1 — Fetch and score Reddit posts
    posts = fetch_reddit_posts()
    if not posts:
        log.warning("No qualifying posts found today.")
        return

    # Step 2 — Generate demo records for each match
    matches = []
    for post in posts:
        log.info(f"Processing: {post['title'][:60]}... (score: {post['score']}, persona: {post['persona']})")

        # Generate AI content
        generated = generate_demo_record(post)
        if not generated:
            log.warning(f"Skipping post — AI generation failed")
            continue

        # Insert into DB
        record_id = insert_demo_record(post, generated)
        if not record_id:
            log.warning(f"Skipping post — DB insert failed")
            continue

        demo_url = f"{DNOUNCE_BASE_URL}/record/{record_id}"

        matches.append({
            "title": post["title"],
            "body": post["body"],
            "author": post["author"],
            "subreddit": post["subreddit"],
            "score": post["score"],
            "persona": post["persona"],
            "reddit_url": post["url"],
            "demo_url": demo_url,
            "generated": generated,
        })

        log.info(f"✅ Match ready: {post['url']} → {demo_url}")
        time.sleep(2)  # Be respectful to Groq rate limits

    # Step 3 — Send summary email
    log.info(f"Sending summary email with {len(matches)} matches...")
    send_summary_email(matches)

    log.info(f"=== Done. {len(matches)}/{len(posts)} records created successfully ===")


if __name__ == "__main__":
    main()
