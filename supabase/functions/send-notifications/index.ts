import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_URL") || "https://www.dnounce.com").replace(/\/$/, "");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ───────────────────────────── Email design ─────────────────────────────
 * One layout for every DNounce email: logo header, colored banner with a
 * label and headline, a white card with the message, one clear button,
 * an optional "what happens next" timeline, and a consistent footer.
 * Table-based with inline styles so it renders in Gmail, Outlook and Apple Mail.
 */

type Theme = { label: string; color: string; soft: string; icon: string };

const THEMES: Record<string, Theme> = {
  record:    { label: "New on your profile",      color: "#2563EB", soft: "#EFF6FF", icon: "📝" },
  challenge: { label: "Your record",       color: "#D97706", soft: "#FFFBEB", icon: "⚖️" },
  bothsides: { label: "Debate",          color: "#0891B2", soft: "#ECFEFF", icon: "💬" },
  vote:      { label: "Community vote",  color: "#7C3AED", soft: "#F5F3FF", icon: "🗳️" },
  results:   { label: "Results",         color: "#4F46E5", soft: "#EEF2FF", icon: "📣" },
  account:   { label: "Your profile",    color: "#059669", soft: "#ECFDF5", icon: "✅" },
  billing:   { label: "Your plan",         color: "#111827", soft: "#F3F4F6", icon: "💳" },
  badge:     { label: "New badge",       color: "#C026D3", soft: "#FDF4FF", icon: "🏅" },
  heads_up:  { label: "Heads up",        color: "#DC2626", soft: "#FEF2F2", icon: "⚠️" },
  activity:  { label: "Update",        color: "#0EA5E9", soft: "#F0F9FF", icon: "🔔" },
};

function themeFor(type: string): Theme {
  const t = (type || "").toLowerCase();
  if (t === "stage_2_subject" || t.startsWith("stage_1") || t.startsWith("stage_2") || t.startsWith("stage_3")) return THEMES.record;
  if (t.startsWith("stage_4")) return THEMES.challenge;
  if (t.startsWith("stage_5") || t.includes("debate")) return THEMES.bothsides;
  if (t.startsWith("stage_6") || t.includes("voting")) return THEMES.vote;
  if (t.startsWith("verdict") || t.includes("decided") || t.includes("outcome") || t === "seven_day_unlock") return THEMES.results;
  if (t.startsWith("claim")) return THEMES.account;
  if (t.startsWith("trial") || t.includes("billing") || t.includes("subscription")) return THEMES.billing;
  if (t.includes("badge")) return THEMES.badge;
  if (t.includes("flagged") || t.includes("convicted")) return THEMES.heads_up;
  return THEMES.activity;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function button(href: string, label: string, color: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td bgcolor="${color}" style="border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
    </td></tr>
  </table>`;
}

function para(html: string) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:#374151;">${html}</p>`;
}

/** A small highlighted box, e.g. "Private for 24 hours". */
function callout(html: string, theme: Theme) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td style="background:${theme.soft};border-left:4px solid ${theme.color};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:#1F2937;">${html}</td></tr>
  </table>`;
}

/** A short, friendly list (optional heading). */
function tips(heading: string, items: string[]) {
  const head = heading
    ? `<div style="font-family:${FONT};font-size:15px;font-weight:700;color:#111827;margin:0 0 10px;">${heading}</div>`
    : "";
  const rows = items
    .map((t) => `<tr><td width="22" valign="top" style="font-family:${FONT};font-size:15px;line-height:24px;color:#9CA3AF;">•</td><td style="font-family:${FONT};font-size:15px;line-height:24px;color:#374151;padding-bottom:6px;">${t}</td></tr>`)
    .join("");
  return `<div style="margin:24px 0 8px;">${head}<table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table></div>`;
}

function layout(opts: {
  theme: Theme;
  preheader: string;
  headline: string;
  body: string;
  firstName: string;
}) {
  const { theme, preheader, headline, body, firstName } = opts;
  const settings = `${APP_URL}/dashboard/settings/notifications`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F4F6">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

        <!-- Logo -->
        <tr><td style="padding:0 4px 20px;">
          <a href="${APP_URL}" style="text-decoration:none;">
            <img src="${APP_URL}/icons/logoicon-120x120.png" width="36" height="36" alt="" style="vertical-align:middle;border:0;border-radius:8px;">
            <span style="vertical-align:middle;margin-left:8px;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-.3px;color:#111827;">DNounce</span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:6px;line-height:6px;font-size:0;background:${theme.color};">&nbsp;</td></tr>
            <tr><td style="padding:32px 36px 8px;">
              <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${theme.soft};font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${theme.color};">${theme.icon}&nbsp; ${theme.label}</div>
              <h1 style="margin:18px 0 20px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-.4px;color:#111827;">${headline}</h1>
              ${para(`Hi ${esc(firstName)},`)}
              ${body}
            </td></tr>
            <tr><td style="padding:8px 36px 32px;">
              <p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:#374151;">— The DNounce team</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Trust note -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
          We'll never ask for your password by email. Not sure a link is real? Just go to <a href="${APP_URL}" style="color:#4B5563;">dnounce.com</a> and sign in.
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:20px;color:#9CA3AF;text-align:center;">
          <a href="${APP_URL}/support" style="color:#6B7280;text-decoration:none;">Help Center</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#privacy" style="color:#6B7280;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#terms" style="color:#6B7280;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
          <a href="${settings}" style="color:#6B7280;text-decoration:none;">Email settings</a>
          <br>You're getting this because you have a DNounce account.
          <br>© ${year} DNounce · New York, NY
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text copy of every email (better delivery, and for mail apps that block HTML). */
function toText(headline: string, firstName: string, lines: string[], link?: { label: string; href: string }) {
  return [
    headline,
    "",
    `Hi ${firstName},`,
    "",
    ...lines,
    ...(link ? ["", `${link.label}: ${link.href}`] : []),
    "",
    "— The DNounce team",
    "",
    `Email settings: ${APP_URL}/dashboard/settings/notifications`,
  ].join("\n");
}

async function recordInfo(recordId: string, userId: string) {
  const { data } = await supabase
    .from("records")
    .select("id, category, rating, final_outcome, debate_ends_at, contributor_id, subject_id, contributor_display_name, contributor_identity_preference")
    .eq("id", recordId)
    .maybeSingle();
  const rec = data as any;
  let subjectName = "the person it's about";
  let subjectOwner: string | null = null;
  let writerUser: string | null = null;
  if (rec?.subject_id) {
    const { data: s } = await supabase.from("subjects").select("name, owner_auth_user_id").eq("subject_uuid", rec.subject_id).maybeSingle();
    if ((s as any)?.name) subjectName = (s as any).name;
    subjectOwner = (s as any)?.owner_auth_user_id ?? null;
  }
  if (rec?.contributor_id) {
    const { data: c } = await supabase.from("contributors").select("user_id").eq("id", rec.contributor_id).maybeSingle();
    writerUser = (c as any)?.user_id ?? null;
  }
  const showWriter = !!rec && rec.contributor_identity_preference !== false && !!rec.contributor_display_name;
  const role: "writer" | "subject" | "other" =
    userId && userId === writerUser ? "writer" : userId && userId === subjectOwner ? "subject" : "other";
  return {
    record: rec,
    writer: showWriter ? String(rec.contributor_display_name) : "the writer",
    subject: subjectName,
    role,
  };
}

/* ───────────────────────────── Handler ───────────────────────────── */

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record;

    if (!notification?.user_id) {
      return new Response("No user_id", { status: 200 });
    }

    // 1. Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
    if (userError || !userData?.user?.email) {
      console.error("User not found:", userError);
      return new Response("User not found", { status: 200 });
    }
    const email = userData.user.email;

    // 2. Get first name
    const { data: accountData } = await supabase
      .from("user_accountdetails")
      .select("first_name")
      .eq("user_id", notification.user_id)
      .single();
    const firstName = accountData?.first_name || "there";

    const type: string = notification.type || "";

    // No email for these (KJ, Oct 25): the writer already sees a confirmation screen
    // after submitting, and the person who challenged knows their challenge opens the debate.
    // The in-app notification still shows.
    const NO_EMAIL = new Set(["stage_2_contributor", "stage_5_subject"]);
    if (NO_EMAIL.has(type)) return new Response("No email for this type", { status: 200 });
    const theme = themeFor(type);
    const recordUrl = notification.record_id ? `${APP_URL}/record/${notification.record_id}` : null;

    let subject = notification.title || "An update from DNounce";
    let headline = esc(subject);
    let preheader = notification.body || "";
    let body = "";
    let textLines: string[] = [];
    let link: { label: string; href: string } | undefined;

    // Wording drafted by Runable (Oct 25), checked against how the site works.
    const info = notification.record_id ? await recordInfo(notification.record_id, notification.user_id) : null;
    const writerName = info?.writer ?? "the writer";
    const personName = info?.subject ?? "the person it's about";
    const otherName = info?.role === "writer" ? personName : writerName;
    // Add a full stop unless the text already ends with one ("Devon A.").
    const dot = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
    const GUIDELINES = `${APP_URL}/?section=guidelines-section`;
    const simple = (opts: { subj: string; pre: string; head: string; paras: string[]; btn: string; href: string; extra?: string }) => {
      subject = opts.subj;
      preheader = opts.pre;
      headline = esc(opts.head);
      link = { label: opts.btn, href: opts.href };
      body = opts.paras.map((p) => para(esc(p))).join("") + (opts.extra ?? "") + button(opts.href, opts.btn, theme.color);
      textLines = [...opts.paras];
    };

    // Wording by StoreClaw (Oct 27), checked against how the site works. Voice: one fact, one feeling, one action.
    const writerShown = writerName === "the writer" ? "The writer" : writerName;
    const REFRESHER = callout(
      `<strong>Quick refresher:</strong> once a record is public, ${esc(personName)} can challenge it once. After that, ${esc(writerName)} and ${esc(personName)} get three days to tell their side — messages, photos, receipts, whatever backs up the story. Then the community reads both sides and votes on who they side with. Nobody at DNounce decides — the community does.`,
      theme,
    );

    if (type === "stage_2_subject" && info?.record) {
      simple({
        subj: "Someone shared an experience about you",
        pre: "Only you can see this for the next 24 hours.",
        head: "You're the only one who can see this right now",
        paras: [
          `${writerShown} shared a firsthand experience about you on DNounce. For the next 24 hours, you're the only one who can see it — nobody else yet. Take a look before it goes public.`,
          "Once it's public, you can challenge it and tell your side.",
        ],
        btn: "See what they said",
        href: recordUrl!,
      });

    } else if (type === "stage_3_subject" && info?.record) {
      simple({
        subj: "Your private look has ended",
        pre: "The record is now visible on your profile.",
        head: "It's public now — here's what you can do",
        paras: [
          `Your 24-hour private window has ended. ${writerShown}'s record is now visible on your profile. If you see it differently, you can challenge it once and tell your side.`,
        ],
        btn: "View the record",
        href: recordUrl!,
        extra: REFRESHER,
      });

    } else if (type === "stage_3_contributor" && info?.record) {
      simple({
        subj: "Your record is live",
        pre: `Your experience about ${personName} is now public.`,
        head: "Your record is now public",
        paras: [`Your experience about ${personName} is now visible on their profile. Thanks for sharing it honestly — that's what makes DNounce work.`],
        btn: "View your record",
        href: recordUrl!,
      });

    } else if (type === "stage_4_contributor" && info?.record) {
      simple({
        subj: `${personName} challenged your record`,
        pre: "A debate opens in 24 hours.",
        head: `${personName} wants to tell their side`,
        paras: [`${personName} challenged your record. In 24 hours, a 3-day debate opens where you can both share your side — messages, photos, or receipts, whatever backs up your story.`],
        btn: "Get ready to respond",
        href: recordUrl!,
        extra: REFRESHER,
      });

    } else if (type === "stage_5_contributor" && info?.record) {
      simple({
        subj: "The debate is open — 3 days",
        pre: "Post your side before the debate closes.",
        head: "The debate is open",
        paras: ["You can now post your side of the story — messages, photos, receipts, whatever tells it best. The debate stays open for 3 days, then voting begins."],
        btn: "Join the debate",
        href: recordUrl!,
      });

    } else if (type === "debate_reply" && info?.record) {
      const who = otherName === "the writer" ? "The writer" : otherName === "the person it's about" ? "The person it's about" : otherName;
      const endsMs = info.record.debate_ends_at ? new Date(info.record.debate_ends_at).getTime() - Date.now() : null;
      const hoursLeft = endsMs !== null && endsMs > 0 ? Math.max(1, Math.round(endsMs / 3_600_000)) : null;
      simple({
        subj: `${who} just replied`,
        pre: "Take a look, and reply if you want to.",
        head: `${who} posted in the debate`,
        paras: [
          `${who} just added their side. Take a look, and reply if you want to.`,
          ...(hoursLeft ? [`You have about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left to reply.`] : []),
        ],
        btn: "Read their reply",
        href: recordUrl!,
      });

    } else if ((type === "stage_6_subject" || type === "stage_6_contributor") && info?.record) {
      simple({
        subj: "Voting is now open",
        pre: "The community reads both sides for the next 2 days.",
        head: "The debate's closed — now the community decides",
        paras: ["The debate is over. For the next 2 days, community members will read both sides and vote on who they side with. There's nothing left to post — just sit tight."],
        btn: "View the record",
        href: recordUrl!,
      });

    } else if ((type === "voting_ended_subject" || type === "voting_ended_contributor") && info?.record) {
      simple({
        subj: "Voting's closed — results soon",
        pre: "Results will be ready in about a week.",
        head: "Voting has ended",
        paras: ["Community voting is closed. Results will be ready in about a week. We'll email you the moment they're in."],
        btn: "View the record",
        href: recordUrl!,
      });

    } else if (type === "voting_ended_voter" && info?.record) {
      simple({
        subj: "Voting's closed — results soon",
        pre: "Results will be ready in about a week.",
        head: "Voting has ended",
        paras: [
          `Voting on the record about ${personName} is closed. Results will be ready in about a week.`,
          "Thanks for taking part — your reason is part of the record.",
        ],
        btn: "See the record",
        href: recordUrl!,
      });

    } else if (type === "verdict_announced" && info?.record) {
      // Never reveal the result in the email.
      const hasResult = (info.record.final_outcome ?? "") !== "";
      const mine = info.role === "writer" ? "your record" : info.role === "subject" ? "the record about you" : `the record about ${personName}`;
      if (!hasResult) {
        simple({
          subj: "No votes came in",
          pre: "There's no result this time.",
          head: "No result this time",
          paras: [`Nobody voted on ${mine}, so there's no result this time.`],
          btn: "View the record",
          href: recordUrl!,
        });
      } else {
        simple({
          subj: "The results are in",
          pre: "See how the community sided.",
          head: "The results are in",
          paras: [`The community has finished voting on ${mine}. Open it to see who people sided with, and why.`],
          btn: "See the results",
          href: recordUrl!,
        });
      }

    } else if (type === "seven_day_unlock" && info?.record) {
      const other = info.role === "writer" ? personName : writerName;
      simple({
        subj: "You can comment now",
        pre: "Say what you want people to know.",
        head: "Now it's your turn to comment",
        paras: [`Now that the results are out, you and ${other} can comment directly on the record. Say what you want people to know.`],
        btn: "Add your comment",
        href: recordUrl!,
      });

    } else if (type === "voter_reply" && recordUrl) {
      simple({
        subj: "Someone replied to your vote",
        pre: "Take a look at what they said.",
        head: "Someone responded to your vote",
        paras: ["You voted on a record, and someone replied to your reason. Take a look."],
        btn: "See the reply",
        href: recordUrl,
      });

    } else if (type === "voter_flagged") {
      simple({
        subj: "Your vote reason was flagged",
        pre: "Your vote still counts for now.",
        head: "Your vote reason was flagged",
        paras: [
          "Another member flagged your reason as careless. If enough members agree, your vote could be removed. For now, it still counts.",
        ],
        btn: "Read the guidelines",
        href: GUIDELINES,
      });

    } else if (type === "voter_convicted") {
      simple({
        subj: "Your vote didn't count this time",
        pre: "Here's what happened.",
        head: "Your vote was removed",
        paras: ["Enough members flagged your reason as careless, so your vote was removed from the count, and you've received a \"Lost voting rights\" badge. A clear, specific reason helps your vote count."],
        btn: "Learn more",
        href: GUIDELINES,
      });

    } else if (type === "badge_earned") {
      const badge = String(notification.title || "").split("—").pop()?.replace(/^[^A-Za-z]+/, "").trim() || "a new badge";
      const LINE: Record<string, string> = {
        "Top Writer": "Your records hold up. People believe what you share.",
        "Well Regarded": "Records about you tend to hold up well.",
        "Top Community Member": "Your comments get real reactions from the community.",
        "Top Voter": "Your vote reasons get real reactions. People trust your judgment.",
        "Rising Star": "One of your records has the community talking.",
        "Fan Favorite": "Every reaction on your posts has been positive.",
      };
      simple({
        subj: `You earned a badge: ${badge}`,
        pre: "It now shows on your profile.",
        head: `You earned ${badge}`,
        paras: [LINE[badge] ? `${LINE[badge]} Keep it up.` : (notification.body || "It now shows on your profile. Keep it up.")],
        btn: "See your badge",
        href: `${APP_URL}/dashboard/reputation`,
      });

    } else if (/^(pinned|following)_/.test(type)) {
      simple({
        subj: "There's an update on a record you're following",
        pre: notification.body || "Take a look at what's new.",
        head: "New activity on a record you follow",
        paras: [notification.body || "Something new happened on a record you're following or pinned."],
        btn: "See what's new",
        href: recordUrl ?? `${APP_URL}/dashboard/following`,
      });

    } else if (type === "claim_approved") {
      simple({
        subj: "Your profile is now yours",
        pre: "You can manage it from here on.",
        head: "Your claim was approved",
        paras: ["You're verified — this profile is now officially yours. You can see and respond to records about you from here on."],
        btn: "Go to your profile",
        href: `${APP_URL}/dashboard/myrecords`,
      });

    } else if (type === "claim_rejected") {
      simple({
        subj: "Your claim wasn't approved",
        pre: "Here's why, and what you can do next.",
        head: "We couldn't approve your claim",
        paras: [
          `We weren't able to verify your claim this time. Reason: ${dot(notification.body || "we didn't have enough to confirm it")}`,
          "Have more details? Send them to us and we'll take another look.",
        ],
        btn: "Contact support",
        href: `${APP_URL}/dashboard/settings/support`,
      });

    } else if (type === "trial_ending") {
      const { data: sub } = await supabase.from("subscriptions").select("plan_id, trial_ends_at").eq("user_id", notification.user_id).maybeSingle();
      const pro = (sub as any)?.plan_id === "pro";
      const ends = (sub as any)?.trial_ends_at
        ? new Date((sub as any).trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" })
        : null;
      simple({
        subj: "Your trial ends in 3 days",
        pre: "Keep your plan or let it end — your choice.",
        head: "Your trial ends in 3 days",
        paras: [`Your free trial of ${pro ? "Pro" : "Insights"} ends ${ends ? `on ${ends}` : "in 3 days"}. After that, you'll be billed ${pro ? "$24.99/mo" : "$9.99/mo"} unless you cancel. You can manage this anytime in billing.`],
        btn: "Manage your plan",
        href: `${APP_URL}/dashboard/settings/billing`,
      });

    } else {
      // Anything else (comments on your record, etc.): same design, the notice's own wording.
      simple({
        subj: notification.title || "Something new on DNounce",
        pre: notification.body || "There's something new for you on DNounce.",
        head: notification.title || "Something new on DNounce",
        paras: [notification.body || "There's something new for you on DNounce."],
        btn: recordUrl ? "Take a look" : "Open DNounce",
        href: recordUrl ?? `${APP_URL}/dashboard`,
      });
    }

    const html = layout({ theme, preheader, headline, body, firstName });
    const text = toText(subject, firstName, textLines, link);

    // 3. Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DNounce <notifications@dnounce.com>",
        to: email,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response("Resend failed", { status: 200 });
    }

    console.log(`Email sent — type: ${type}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal error", { status: 200 });
  }
});
