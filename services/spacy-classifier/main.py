import os
import re
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, Request, Header, HTTPException
from supabase import create_client, Client
import spacy
from spacy.matcher import PhraseMatcher

# -------------------------
# Config
# -------------------------
CLASSIFIER_VERSION = "dnounce_spacy_v3_text_only"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="DNounce spaCy Classifier", version=CLASSIFIER_VERSION)

# -------------------------
# spaCy setup
# -------------------------
nlp = spacy.load("en_core_web_sm", exclude=["lemmatizer"])
if "sentencizer" not in nlp.pipe_names:
    nlp.add_pipe("sentencizer")

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

# Evidence-ish words/phrases (verifiable artifacts)
EVIDENCE_PHRASES = [
    "receipt", "receipts", "invoice", "invoices", "contract", "agreement",
    "email thread", "email", "emails", "text message", "text messages",
    "screenshots", "screenshot", "bank statement", "statement",
    "wire transfer", "zelle", "cash app", "paypal",
    "police report", "case number", "report number", "ticket number",
    "order number", "tracking number", "reference number",
    "attached", "attachment", "see attached", "uploaded", "upload",
    "documentation", "proof", "evidence", "recording", "video", "photo", "photos",
    "written worksheet", "worksheet", "quote", "quoted", "estimate", "bill",
]

# Opinion/hedging words (but should NOT override strong facts)
OPINION_PHRASES = [
    "i think", "i feel", "i believe", "in my opinion", "seems like",
    "probably", "maybe", "kind of", "sort of", "i guess", "i assume",
    "it felt", "it seems", "i suspect",
]

# Accusation / strong claims (penalize only when there are no facts)
ACCUSATION_TERMS = {
    "scam", "scammed", "steal", "stole", "stolen", "fraud", "fraudulent",
    "abuse", "abused", "cheat", "cheated", "lie", "lied", "gaslight", "gaslit",
    "harass", "harassed", "threaten", "threatened",
}

# Verifiable ID patterns
ID_PATTERNS = [
    re.compile(r"\b(case|report|ticket|order|invoice|ref|reference)\s*#?\s*[A-Z0-9\-]{4,}\b", re.I),
    re.compile(r"\b[A-Z]{2,5}\-[0-9]{3,}\b", re.I),
]

URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

matcher.add("EVIDENCE", [nlp.make_doc(p) for p in EVIDENCE_PHRASES])
matcher.add("OPINION", [nlp.make_doc(p) for p in OPINION_PHRASES])

# -------------------------
# Helpers
# -------------------------
def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def safe_str(x: Any) -> str:
    return (x or "").strip()

# -------------------------
# Supabase
# -------------------------
def fetch_record(record_id: str) -> Optional[Dict[str, Any]]:
    res = (
        sb.table("records")
        .select("id,description")
        .eq("id", record_id)
        .single()
        .execute()
    )
    return res.data

def fetch_attachments(record_id: str) -> List[Dict[str, Any]]:
    try:
        res = (
            sb.table("record_attachments")
            .select("id,path,mime_type,label,size_bytes,created_at")
            .eq("record_id", record_id)
            .execute()
        )
        return res.data or []
    except Exception:
        return []

def update_record_ai(record_id: str, label: str, score: float, explanation: Dict[str, Any]) -> bool:
    """
    Prototype rule:
    - credibility = ONLY label (Evidence-Based / Opinion-Based / Unclear)
    - ai_vendor_1_result = label + version
    - ai_vendor_1_score = score
    - ai_vendor_2_result = summary/explanation (optional)
    """
    # map record_type
    record_type = (
        "evidence" if label == "Evidence-Based"
        else "opinion" if label == "Opinion-Based"
        else "unclear"
    )

    payload = {
        "record_type": record_type,
        "credibility": label,  # IMPORTANT: keep clean for UI
        "ai_vendor_1_result": f"{label} ({CLASSIFIER_VERSION})",
        "ai_vendor_1_score": score,
        "ai_vendor_2_result": explanation.get("summary", ""),
        "ai_completed_at": now_iso(),
    }

    try:
        sb.table("records").update(payload).eq("id", record_id).execute()
        return True
    except Exception:
        return False

# -------------------------
# Feature extraction (TEXT ONLY)
# -------------------------
def compute_features(text: str, attachments: List[Dict[str, Any]]) -> Dict[str, Any]:
    doc = nlp(text)
    matches = matcher(doc)

    evidence_hits = 0
    opinion_hits = 0
    for match_id, start, end in matches:
        label = nlp.vocab.strings[match_id]
        if label == "EVIDENCE":
            evidence_hits += 1
        elif label == "OPINION":
            opinion_hits += 1

    ents = list(doc.ents)
    has_dates = any(e.label_ in ("DATE", "TIME") for e in ents)
    has_money = any(e.label_ == "MONEY" for e in ents)
    has_url = bool(URL_RE.search(text)) or any(t.like_url for t in doc)

    # “facts density”: counts that imply a concrete narrative
    has_named_entities = len(ents) >= 2
    word_count = len([t for t in doc if t.is_alpha])

    # accusations: only matter when facts are weak
    accusation_count = 0
    for t in doc:
        lemma = (t.lemma_ or t.text).lower()
        if lemma in ACCUSATION_TERMS:
            accusation_count += 1

    id_hits = 0
    for pat in ID_PATTERNS:
        if pat.search(text):
            id_hits += 1

    # attachments exist, but for prototype we treat them as a small bonus only
    attachment_count = len(attachments or [])

    return {
        "word_count": word_count,
        "evidence_hits": evidence_hits,
        "opinion_hits": opinion_hits,
        "has_dates": has_dates,
        "has_money": has_money,
        "has_url": has_url,
        "has_named_entities": has_named_entities,
        "entity_count": len(ents),
        "id_hits": id_hits,
        "accusation_count": accusation_count,
        "attachment_count": attachment_count,
    }

# -------------------------
# Scoring model (TEXT ONLY, “tone-aware”)
# -------------------------
def score_and_explain(f: Dict[str, Any]) -> Dict[str, Any]:
    """
    Goal:
    - “I think” shouldn't tank a factual story.
    - Evidence-Based if there are multiple factual anchors (dates/money/entities/ids/evidence words).
    - Opinion-Based only when it's mostly feelings/claims without anchors.
    """

    wc = f["word_count"]
    ev = f["evidence_hits"]
    op = f["opinion_hits"]
    dates = 1.0 if f["has_dates"] else 0.0
    money = 1.0 if f["has_money"] else 0.0
    url = 1.0 if f["has_url"] else 0.0
    ents = 1.0 if f["has_named_entities"] else 0.0
    ids = clamp01(f["id_hits"] / 2.0)
    acc = clamp01(f["accusation_count"] / 3.0)
    attach = clamp01(f["attachment_count"] / 2.0)

    # factual anchors (strong evidence signals)
    anchors = (
        0.24 * clamp01(ev / 4.0) +
        0.18 * dates +
        0.18 * money +
        0.12 * ents +
        0.10 * ids +
        0.06 * url +
        0.12 * attach
    )
    anchors = clamp01(anchors)

    # opinion/hedging exists, but is downweighted if anchors are strong
    hedging = clamp01(op / 3.0)
    # if you have anchors, hedging matters less
    effective_hedging = clamp01(hedging * (1.0 - 0.75 * anchors))

    # accusations penalize only when anchors are weak
    effective_accusation = clamp01(acc * (1.0 - 0.60 * anchors))

    # “story completeness” bonus: longer text tends to include more detail
    length_bonus = 0.0
    if wc >= 60:
        length_bonus = 0.08
    elif wc >= 30:
        length_bonus = 0.04

    evidence_score = clamp01(0.78 * anchors + length_bonus)
    opinion_score = clamp01(0.65 * effective_hedging + 0.35 * effective_accusation + (0.20 * (1.0 - anchors)))

    # decision:
    # Evidence-Based if anchors are reasonably strong.
    # Opinion-Based only if anchors are weak AND hedging/accusations dominate.
    if evidence_score >= 0.42:
        label = "Evidence-Based"
        final = evidence_score
    elif opinion_score >= 0.52 and anchors <= 0.25:
        label = "Opinion-Based"
        final = opinion_score
    else:
        label = "Unclear"
        final = 0.5

    summary = (
        f"{CLASSIFIER_VERSION}: label={label} score={final:.2f} "
        f"(anchors={anchors:.2f} evidence={evidence_score:.2f} opinion={opinion_score:.2f}) "
        f"| ev_hits={ev} op_hits={op} dates={int(dates)} money={int(money)} ents={int(ents)} ids={f['id_hits']} attach={f['attachment_count']}"
    )

    return {
        "label": label,
        "score": final,
        "explanation": {
            "classifier_version": CLASSIFIER_VERSION,
            "label": label,
            "final_score": final,
            "anchors": anchors,
            "evidence_score": evidence_score,
            "opinion_score": opinion_score,
            "summary": summary,
            "features": f,
        }
    }

# -------------------------
# API
# -------------------------
@app.get("/health")
def health():
    return {"ok": True, "version": CLASSIFIER_VERSION}

@app.post("/classify")
async def classify_endpoint(req: Request):
    payload = await req.json()
    text = safe_str(payload.get("text"))
    attachments = payload.get("attachments") or []
    feats = compute_features(text, attachments)
    out = score_and_explain(feats)
    return {
        "classification": out["label"],
        "score": out["score"],
        "explanation": out["explanation"],
    }

@app.post("/webhook/classify-record")
async def webhook(req: Request, authorization: Optional[str] = Header(default=None)):
    if WEBHOOK_SECRET:
        if not authorization or authorization.strip() != f"Bearer {WEBHOOK_SECRET}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await req.json()
    record = payload.get("record") or {}
    record_id = record.get("id") or payload.get("record_id")

    if not record_id:
        raise HTTPException(status_code=400, detail="Missing record.id")

    r = fetch_record(record_id)
    if not r:
        return {"ok": False, "record_id": record_id, "error": "Record not found", "updated_db": False}

    attachments = fetch_attachments(record_id)
    text = safe_str(r.get("description"))

    if not text:
        out = {"label": "Unclear", "score": 0.5, "explanation": {"summary": f"{CLASSIFIER_VERSION}: missing description"}}
        updated = update_record_ai(record_id, "Unclear", 0.0, out["explanation"])
        return {"ok": True, "record_id": record_id, "classification": "Unclear", "score": 0.5, "updated_db": updated}

    feats = compute_features(text, attachments)
    out = score_and_explain(feats)
    updated = update_record_ai(record_id, out["label"], out["score"], out["explanation"])

    return {
        "ok": True,
        "record_id": record_id,
        "classification": out["label"],
        "score": out["score"],
        "updated_db": updated,
        "explanation": out["explanation"],
        "attachment_count": len(attachments or []),
    }
