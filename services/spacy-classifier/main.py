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
CLASSIFIER_VERSION = "dnounce_spacy_v2.0"

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

# Strong indicators the user is referencing concrete artifacts
EVIDENCE_PHRASES = [
    "receipt", "receipts", "invoice", "invoices", "contract", "agreement",
    "email thread", "email", "text message", "screenshots", "screenshot",
    "bank statement", "wire transfer", "zelle", "cash app", "paypal",
    "police report", "case number", "report number", "ticket number",
    "order number", "tracking number", "reference number",
    "attached", "attachment", "see attached", "uploaded", "upload",
    "documentation", "proof", "evidence", "recording", "video", "photo", "photos",
]

# Hedging / opinion cues
OPINION_PHRASES = [
    "i think", "i feel", "i believe", "in my opinion", "seems like",
    "probably", "maybe", "kind of", "sort of", "i guess", "i assume",
    "it felt", "it seems", "i suspect",
]

# “Accusation” verbs — used as a penalty *if unsubstantiated*
ACCUSATION_TERMS = {
    "scam", "scammed", "steal", "stole", "stolen", "fraud", "fraudulent",
    "abuse", "abused", "cheat", "cheated", "lie", "lied", "gaslight", "gaslit",
    "harass", "harassed", "threaten", "threatened",
}

# Patterns for verifiable IDs (case #, order #, invoice #, etc.)
ID_PATTERNS = [
    re.compile(r"\b(case|report|ticket|order|invoice|ref|reference)\s*#?\s*[A-Z0-9\-]{4,}\b", re.I),
    re.compile(r"\b[A-Z]{2,5}\-[0-9]{3,}\b", re.I),  # e.g., ABC-1234
]

URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

matcher.add("EVIDENCE", [nlp.make_doc(p) for p in EVIDENCE_PHRASES])
matcher.add("OPINION", [nlp.make_doc(p) for p in OPINION_PHRASES])

# -------------------------
# Helpers
# -------------------------
def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))

def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def safe_str(x: Any) -> str:
    return (x or "").strip()

# -------------------------
# Supabase
# -------------------------
def fetch_record(record_id: str) -> Optional[Dict[str, Any]]:
    # Pull the fields we actually need + fields we write back to
    res = (
        sb.table("records")
        .select("id,description,record_type")
        .eq("id", record_id)
        .single()
        .execute()
    )
    return res.data

def fetch_attachments(record_id: str) -> List[Dict[str, Any]]:
    """
    DNounce schema uses record_attachments.
    We treat attachments as evidence.
    """
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

def attachment_strength(attachments: List[Dict[str, Any]]) -> Tuple[float, Dict[str, Any]]:
    """
    Score attachment evidence 0..1 based on:
    - count
    - file types (pdf/image/video stronger)
    - size (tiny files less convincing)
    """
    if not attachments:
        return 0.0, {"count": 0, "strong_count": 0, "types": []}

    strong_mimes = {
        "application/pdf",
        "image/png", "image/jpeg",
        "video/mp4",
    }

    count = len(attachments)
    strong_count = 0
    types = set()

    size_bonus = 0.0
    for a in attachments:
        mt = safe_str(a.get("mime_type")).lower()
        path = safe_str(a.get("path")).lower()
        if mt:
            types.add(mt)
        elif "." in path:
            types.add(path.rsplit(".", 1)[-1])

        if mt in strong_mimes or any(ext in path for ext in [".pdf", ".png", ".jpg", ".jpeg", ".mp4"]):
            strong_count += 1

        # size heuristic: >50kb adds credibility a bit, huge files don’t keep adding forever
        try:
            size = int(a.get("size_bytes") or 0)
            if size > 50_000:
                size_bonus += 0.02
        except Exception:
            pass

    # base from count
    base = 1 - math.exp(-count / 2.0)  # saturating curve
    strong_bonus = 0.15 * (strong_count / max(1, count))
    score = clamp01(0.10 + 0.65 * base + strong_bonus + clamp01(size_bonus))

    return score, {"count": count, "strong_count": strong_count, "types": sorted(types)}

def update_record_ai(
    record_id: str,
    label: str,
    score: float,
    explanation: Dict[str, Any],
    db_update: bool = True,
) -> bool:
    """
    Writes to existing columns in your schema:
    - record_type: pending/opinion/evidence
    - ai_vendor_1_result: label string
    - ai_vendor_1_score: numeric
    - credibility: text (we'll store a short summary)
    - ai_completed_at: timestamp
    """
    if not db_update:
        return False

    # Map label -> allowed record_type enum-ish
    if label == "Evidence-Based":
        record_type = "evidence"
    elif label == "Opinion-Based":
        record_type = "opinion"
    else:
        record_type = "pending"

    summary = explanation.get("summary", "")
    payload = {
        "record_type": record_type,
        "ai_vendor_1_result": f"{label} ({CLASSIFIER_VERSION})",
        "ai_vendor_1_score": score,
        "credibility": summary,
        "ai_completed_at": now_iso(),
    }

    try:
        sb.table("records").update(payload).eq("id", record_id).execute()
        return True
    except Exception:
        return False

# -------------------------
# Feature extraction
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
    has_org_or_gpe = any(e.label_ in ("ORG", "GPE") for e in ents)
    has_person = any(e.label_ == "PERSON" for e in ents)

    word_count = len([t for t in doc if t.is_alpha])
    has_url = bool(URL_RE.search(text)) or any(t.like_url for t in doc)

    accusation_count = 0
    for t in doc:
        lemma = (t.lemma_ or t.text).lower()
        if lemma in ACCUSATION_TERMS:
            accusation_count += 1

    id_hits = 0
    for pat in ID_PATTERNS:
        if pat.search(text):
            id_hits += 1

    attach_score, attach_meta = attachment_strength(attachments)

    return {
        "word_count": word_count,
        "entity_count": len(ents),
        "has_dates": has_dates,
        "has_money": has_money,
        "has_org_or_gpe": has_org_or_gpe,
        "has_person": has_person,
        "has_url": has_url,
        "evidence_hits": evidence_hits,
        "opinion_hits": opinion_hits,
        "accusation_count": accusation_count,
        "id_hits": id_hits,
        "attachment_score": attach_score,
        "attachment_meta": attach_meta,
    }

# -------------------------
# Scoring model (tech-giant style heuristics)
# -------------------------
def score_and_explain(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Produces:
    - evidence_score 0..1
    - opinion_score 0..1
    - confidence 0..1
    - label
    - explanation (signals)
    """

    wc = features["word_count"]
    ev = features["evidence_hits"]
    op = features["opinion_hits"]
    acc = features["accusation_count"]
    attach = features["attachment_score"]
    ent = features["entity_count"]
    id_hits = features["id_hits"]

    # Verifiability: what a reviewer could check
    verifiability_raw = (
        0.70 * attach
        + 0.10 * clamp01(ev / 4.0)
        + 0.08 * (1.0 if features["has_dates"] else 0.0)
        + 0.06 * (1.0 if features["has_money"] else 0.0)
        + 0.06 * (1.0 if features["has_url"] else 0.0)
        + 0.05 * clamp01(ent / 4.0)
        + 0.05 * clamp01(id_hits / 2.0)
    )
    verifiability = clamp01(verifiability_raw)

    # Subjectivity: feelings/hedging/vagueness
    subjectivity_raw = (
        0.55 * clamp01(op / 3.0)
        + 0.12 * (1.0 if wc < 20 else 0.0)
        + 0.18 * clamp01(acc / 3.0)
    )
    # Penalize accusations less if attachments exist
    if attach > 0.35:
        subjectivity_raw -= 0.10
    subjectivity = clamp01(subjectivity_raw)

    # Substantiation: do they *say* they have evidence (even if not attached)
    substantiation_raw = (
        0.60 * clamp01(ev / 4.0)
        + 0.20 * (1.0 if features["has_url"] else 0.0)
        + 0.20 * clamp01(id_hits / 2.0)
    )
    substantiation = clamp01(substantiation_raw)

    # Combine into evidence vs opinion probability-like scores
    # evidence_score increases with verifiability + substantiation
    # opinion_score increases with subjectivity and lack of verifiability
    evidence_score = clamp01(0.65 * verifiability + 0.35 * substantiation)
    opinion_score = clamp01(0.70 * subjectivity + 0.30 * (1.0 - verifiability))

    # confidence: how separated the scores are + stronger if attachments exist
    separation = abs(evidence_score - opinion_score)
    confidence = clamp01(0.55 * separation + 0.35 * attach + 0.10 * clamp01(ent / 5.0))

    # Decision thresholds: dynamic
    # If there are attachments OR evidence signals (ids / evidence phrases),
    # we should be more willing to label Evidence-Based.
    has_strong_evidence_signals = (attach > 0.25) or (ev >= 1) or (id_hits >= 1)

    # Lower threshold when we have strong evidence signals.
    evidence_threshold = 0.58 if has_strong_evidence_signals else 0.68

    # Opinion threshold stays stricter, especially for very short text.
    opinion_threshold = 0.62 if wc >= 20 else 0.70

    if evidence_score >= evidence_threshold and confidence >= 0.45:
        label = "Evidence-Based"
        final_score = evidence_score
    elif opinion_score >= opinion_threshold and confidence >= 0.45:
        label = "Opinion-Based"
        final_score = opinion_score
    else:
        label = "Unclear"
        final_score = 0.5


    positives = []
    negatives = []

    if attach > 0:
        positives.append(f"attachments_score={attach:.2f} (count={features['attachment_meta']['count']})")
    if ev > 0:
        positives.append(f"evidence_phrase_hits={ev}")
    if id_hits > 0:
        positives.append(f"id_patterns={id_hits}")
    if features["has_dates"]:
        positives.append("has_date_or_time")
    if features["has_money"]:
        positives.append("has_money")
    if features["has_url"]:
        positives.append("has_url")
    if ent >= 2:
        positives.append(f"named_entities={ent}")

    if op > 0:
        negatives.append(f"opinion_phrase_hits={op}")
    if wc < 20:
        negatives.append(f"short_text_words={wc}")
    if acc > 0 and attach < 0.25:
        negatives.append(f"accusation_terms={acc} (without attachments)")

    summary = (
        f"{CLASSIFIER_VERSION}: label={label} score={final_score:.2f} "
        f"(evidence={evidence_score:.2f} opinion={opinion_score:.2f} conf={confidence:.2f}) "
        f"| +{', '.join(positives[:5])} | -{', '.join(negatives[:5])}"
    )

    explanation = {
        "classifier_version": CLASSIFIER_VERSION,
        "label": label,
        "final_score": final_score,
        "evidence_score": evidence_score,
        "opinion_score": opinion_score,
        "confidence": confidence,
        "signals_positive": positives,
        "signals_negative": negatives,
        "summary": summary,
        "features": features,
    }

    return {
        "label": label,
        "score": final_score,
        "explanation": explanation,
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
    features = compute_features(text, attachments)
    out = score_and_explain(features)
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
        updated = update_record_ai(record_id, "Unclear", 0.0, out["explanation"], db_update=True)
        return {"ok": True, "record_id": record_id, "classification": "Unclear", "score": 0.5, "updated_db": updated}

    features = compute_features(text, attachments)
    out = score_and_explain(features)
    updated = update_record_ai(record_id, out["label"], out["score"], out["explanation"], db_update=True)

    return {
        "ok": True,
        "record_id": record_id,
        "classification": out["label"],
        "score": out["score"],
        "updated_db": updated,
        "explanation": out["explanation"],
        "evidence_count": features["attachment_meta"]["count"],
    }
