import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, Header, HTTPException
from supabase import create_client, Client
import spacy
from spacy.matcher import PhraseMatcher

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="DNounce spaCy Classifier")

# Load spaCy model
nlp = spacy.load("en_core_web_sm", exclude=["lemmatizer"])
if "sentencizer" not in nlp.pipe_names:
    nlp.add_pipe("sentencizer")

EVIDENCE_PHRASES = [
    "screenshot", "screenshots", "photo", "photos", "video", "recording",
    "invoice", "receipt", "contract", "agreement", "email", "text message",
    "bank statement", "police report", "case number", "report number",
    "evidence", "proof", "documentation", "documents",
]
OPINION_PHRASES = [
    "i think", "i feel", "i believe", "in my opinion", "seems like",
    "probably", "maybe", "kind of", "sort of", "i guess",
]
ACCUSATION_VERBS = {
    "scam", "scammed", "steal", "stole", "stolen", "abuse", "abused",
    "cheat", "cheated", "lie", "lied", "gaslight", "gaslit", "harass", "harassed",
}

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
matcher.add("EVIDENCE", [nlp.make_doc(p) for p in EVIDENCE_PHRASES])
matcher.add("OPINION", [nlp.make_doc(p) for p in OPINION_PHRASES])

URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)


def fetch_record(record_id: str) -> Dict[str, Any]:
    res = (
        sb.table("records")
        .select("id,description,record_type")
        .eq("id", record_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Record not found")
    return res.data


def fetch_evidence(record_id: str) -> List[Dict[str, Any]]:
    """
    Your schema has record_attachments (not record_evidence).
    We'll treat attachments as evidence signals.
    """
    res = (
        sb.table("record_attachments")
        .select("id,path,mime_type,label,created_at")
        .eq("record_id", record_id)
        .execute()
    )
    return res.data or []


def update_record_classification(
    record_id: str,
    label: str,
    score: float,
    features: Dict[str, Any],
) -> None:
    # Map label -> DB record_type values (must match your CHECK constraint)
    if label == "Evidence-Based":
        record_type = "evidence"
    elif label == "Opinion-Based":
        record_type = "opinion"
    else:
        record_type = "pending"

    credibility_summary = (
        f"spaCy vendor1 score={score:.2f} | "
        f"evidence_hits={features.get('evidence_hits')} opinion_hits={features.get('opinion_hits')} "
        f"evidence_files={features.get('evidence_count')} strong_types={features.get('strong_evidence_types')} "
        f"dates={features.get('has_dates')} money={features.get('has_money')} url={features.get('has_url')} "
        f"accusations={features.get('accusation_count')} words={features.get('word_count')}"
    )

    sb.table("records").update({
        "record_type": record_type,
        "ai_vendor_1_result": label,
        "ai_vendor_1_score": score,
        "credibility": credibility_summary,
        "ai_completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", record_id).execute()


def compute_features(text: str, evidence_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    doc = nlp(text)
    matches = matcher(doc)

    evidence_hits = 0
    opinion_hits = 0
    for match_id, start, end in matches:
        mlabel = nlp.vocab.strings[match_id]
        if mlabel == "EVIDENCE":
            evidence_hits += 1
        elif mlabel == "OPINION":
            opinion_hits += 1

    ents = list(doc.ents)
    has_dates = any(e.label_ in ("DATE", "TIME") for e in ents)
    has_money = any(e.label_ == "MONEY" for e in ents)
    has_org_or_gpe = any(e.label_ in ("ORG", "GPE") for e in ents)
    has_person = any(e.label_ == "PERSON" for e in ents)

    word_count = len([t for t in doc if t.is_alpha])
    has_url = bool(URL_RE.search(text)) or any(t.like_url for t in doc)

    # Accusation-ish verbs (spaCy lemma can be blank sometimes, so guard)
    accusation_count = 0
    for t in doc:
        lemma = (t.lemma_ or t.text).lower()
        if lemma in ACCUSATION_VERBS:
            accusation_count += 1

    evidence_count = len(evidence_rows)

    # Derive "types" from mime_type if present; else from file extension in `path`
    evidence_types: set[str] = set()
    for r in evidence_rows:
        mt = (r.get("mime_type") or "").lower()
        path = (r.get("path") or "").lower()

        if mt:
            evidence_types.add(mt)
        elif "." in path:
            evidence_types.add(path.rsplit(".", 1)[-1])

    has_evidence_files = evidence_count > 0
    strong_evidence_types = any(
        t in evidence_types
        for t in ["application/pdf", "pdf", "image/jpeg", "image/png", "jpg", "jpeg", "png", "video/mp4", "mp4"]
    )

    return {
        "evidence_hits": evidence_hits,
        "opinion_hits": opinion_hits,
        "accusation_count": accusation_count,
        "has_dates": has_dates,
        "has_money": has_money,
        "has_org_or_gpe": has_org_or_gpe,
        "has_person": has_person,
        "has_url": has_url,
        "word_count": word_count,
        "entity_count": len(ents),
        "evidence_count": evidence_count,
        "has_evidence_files": has_evidence_files,
        "strong_evidence_types": strong_evidence_types,
    }


def classify(features: Dict[str, Any]) -> Dict[str, Any]:
    score = 0.5

    score += min(0.25, 0.05 * features["evidence_hits"])
    if features["has_evidence_files"]:
        score += 0.25
    if features["strong_evidence_types"]:
        score += 0.10
    if features["has_dates"]:
        score += 0.08
    if features["has_money"]:
        score += 0.06
    if features["has_url"]:
        score += 0.08
    if features["entity_count"] >= 2:
        score += 0.05
    if features["has_org_or_gpe"]:
        score += 0.04
    if features["has_person"]:
        score += 0.03

    score -= min(0.25, 0.06 * features["opinion_hits"])
    if features["accusation_count"] >= 2 and not features["has_evidence_files"]:
        score -= 0.18

    if features["word_count"] < 25:
        score -= 0.10

    score = max(0.0, min(1.0, score))

    if score >= 0.67:
        label = "Evidence-Based"
    elif score <= 0.33:
        label = "Opinion-Based"
    else:
        label = "Unclear"

    return {"label": label, "score": score}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/webhook/classify-record")
async def webhook(req: Request, authorization: Optional[str] = Header(default=None)):
    # Optional auth
    if WEBHOOK_SECRET:
        if not authorization or authorization.strip() != f"Bearer {WEBHOOK_SECRET}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await req.json()
    record = payload.get("record") or {}
    record_id = record.get("id") or payload.get("record_id")

    if not record_id:
        raise HTTPException(status_code=400, detail="Missing record.id")

    r = fetch_record(record_id)
    evidence_rows = fetch_evidence(record_id)
    text = (r.get("description") or "").strip()

    if not text:
        update_record_classification(record_id, "Unclear", 0.0, {})
        return {
            "ok": True,
            "record_id": record_id,
            "classification": "Unclear",
            "reason": "missing description",
        }

    features = compute_features(text, evidence_rows)
    result = classify(features)

    update_record_classification(record_id, result["label"], result["score"], features)

    return {
        "ok": True,
        "record_id": record_id,
        "classification": result["label"],
        "score": result["score"],
        "features": features,
        "evidence_count": len(evidence_rows),
    }
