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
CLASSIFIER_VERSION = "dnounce_spacy_v4_text_only"

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

# ── Evidence phrases ────────────────────────────────────────────────────────
# Must imply a verifiable artifact, not just a word like "email"
EVIDENCE_PHRASES = [
    # Documents & paper trails
    "receipt", "receipts", "invoice", "invoices", "contract", "signed contract",
    "written agreement", "agreement", "lease", "lease agreement",
    "bank statement", "bank statements", "credit card statement",
    "pay stub", "pay stubs", "paycheck", "w2", "tax return",
    "police report", "incident report", "filed a report",
    "court document", "court order", "restraining order", "legal document",
    "official document", "notarized", "affidavit",

    # Communications with specificity
    "email thread", "email chain", "forwarded the email",
    "i have the emails", "i saved the texts", "text message thread",
    "i have screenshots", "i have a screenshot", "i took a screenshot",
    "recorded the call", "i have a recording", "i recorded",
    "voicemail", "i have the voicemail",

    # Transactions
    "wire transfer", "zelle payment", "venmo", "cash app payment",
    "paypal transaction", "bank transfer", "check number",
    "payment confirmation", "transaction id", "transaction number",

    # Reference numbers
    "case number", "report number", "ticket number", "order number",
    "tracking number", "reference number", "confirmation number",
    "claim number", "file number",

    # Witnesses
    "witness", "witnesses", "there were witnesses",
    "my coworker saw", "my colleague saw", "others witnessed",
    "multiple people saw", "people were present",

    # Medical / HR / Official
    "medical record", "doctor's note", "hospital report",
    "hr complaint", "filed a complaint", "hr was notified",
    "i reported it to", "i filed", "submitted a complaint",

    # Physical evidence
    "photo", "photos", "photograph", "photographs",
    "video", "videos", "footage", "security footage", "surveillance",
    "i have proof", "i have evidence", "attached is", "see attached",
    "i am attaching", "i uploaded", "documentation", "documented",
]

# ── Opinion / feeling phrases ────────────────────────────────────────────────
# Captures subjective, emotional, and unverifiable experience language
OPINION_PHRASES = [
    # Hedging
    "i think", "i feel", "i believe", "in my opinion", "i thought",
    "i felt", "it felt", "it seemed", "it seems", "seems like",
    "probably", "maybe", "i guess", "i assume", "i assumed",
    "i suspect", "i suspect", "i imagine", "i suppose",
    "kind of", "sort of", "i could be wrong",

    # Emotional experience
    "made me feel", "made me cry", "made me uncomfortable",
    "i was hurt", "i was upset", "i was devastated",
    "i was shocked", "i was disgusted", "i was embarrassed",
    "i was humiliated", "i felt disrespected", "i felt violated",
    "i felt unsafe", "i felt threatened", "i felt ignored",
    "emotionally", "mentally", "psychologically",

    # Interpersonal judgment
    "he was rude", "she was rude", "they were rude",
    "he was mean", "she was mean", "he is a bad person",
    "she is manipulative", "he is controlling", "she is toxic",
    "he always", "she always", "they always", "he never", "she never",
    "he would always", "she would always",
    "his attitude", "her attitude", "their attitude",
    "his behavior", "her behavior", "their behavior",
    "the way he treated me", "the way she treated me",
    "treated me like", "treated me as",

    # Vague claims
    "everyone knows", "everybody knows", "it is well known",
    "people say", "i heard", "i was told", "someone told me",
    "rumor", "rumors", "word got around",

    # Personal moral judgment
    "a terrible person", "a horrible person", "a bad person",
    "unprofessional", "disrespectful", "disgusting behavior",
    "morally wrong", "ethically wrong", "wrong of him", "wrong of her",
]

# ── Accusation terms ─────────────────────────────────────────────────────────
ACCUSATION_TERMS = {
    "scam", "scammed", "steal", "stole", "stolen", "fraud", "fraudulent",
    "abuse", "abused", "cheat", "cheated", "lie", "lied", "gaslight", "gaslit",
    "harass", "harassed", "threaten", "threatened", "manipulate", "manipulated",
    "exploit", "exploited", "deceive", "deceived", "defraud", "defrauded",
}

# ── Vagueness signals ────────────────────────────────────────────────────────
# These push toward Unable to Verify
VAGUE_PHRASES = [
    "i don't know", "not sure", "i'm not sure", "i cannot say",
    "i can't explain", "hard to explain", "it's complicated",
    "something happened", "things happened", "stuff happened",
    "bad things", "bad stuff", "many things", "a lot happened",
    "at some point", "eventually", "over time", "for a long time",
    "multiple times", "several times", "many times",  # without specifics
]

# ── Verifiable ID patterns ───────────────────────────────────────────────────
ID_PATTERNS = [
    re.compile(r"\b(case|report|ticket|order|invoice|ref|reference|claim|file)\s*#?\s*[A-Z0-9\-]{4,}\b", re.I),
    re.compile(r"\b[A-Z]{2,5}\-[0-9]{3,}\b", re.I),
    re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"),  # dates like 03/15/2024
    re.compile(r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b", re.I),
]

URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

matcher.add("EVIDENCE", [nlp.make_doc(p) for p in EVIDENCE_PHRASES])
matcher.add("OPINION", [nlp.make_doc(p) for p in OPINION_PHRASES])
matcher.add("VAGUE", [nlp.make_doc(p) for p in VAGUE_PHRASES])


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
    record_type = (
        "evidence" if label == "Evidence-Based"
        else "opinion" if label == "Opinion-Based"
        else "unclear"
    )
    payload = {
        "record_type": record_type,
        "credibility": label,
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
# Feature extraction
# -------------------------
def compute_features(text: str, attachments: List[Dict[str, Any]]) -> Dict[str, Any]:
    doc = nlp(text)
    matches = matcher(doc)

    evidence_hits = 0
    opinion_hits = 0
    vague_hits = 0

    for match_id, start, end in matches:
        label = nlp.vocab.strings[match_id]
        if label == "EVIDENCE":
            evidence_hits += 1
        elif label == "OPINION":
            opinion_hits += 1
        elif label == "VAGUE":
            vague_hits += 1

    ents = list(doc.ents)
    has_dates = any(e.label_ in ("DATE", "TIME") for e in ents)
    has_money = any(e.label_ == "MONEY" for e in ents)
    has_org = any(e.label_ == "ORG" for e in ents)
    has_person = any(e.label_ == "PERSON" for e in ents)
    has_url = bool(URL_RE.search(text)) or any(t.like_url for t in doc)
    has_named_entities = len(ents) >= 2

    word_count = len([t for t in doc if t.is_alpha])
    sentence_count = len(list(doc.sents))

    accusation_count = 0
    for t in doc:
        lemma = (t.lemma_ or t.text).lower()
        if lemma in ACCUSATION_TERMS:
            accusation_count += 1

    id_hits = sum(1 for pat in ID_PATTERNS if pat.search(text))
    attachment_count = len(attachments or [])

    # First-person experience sentences — strong opinion signal
    first_person_experience = 0
    first_person_patterns = re.compile(
        r"\b(i was|i felt|i feel|i am|i've been|i had|he made me|she made me|they made me|"
        r"it made me|made me feel|left me feeling|i experienced|i went through)\b",
        re.I
    )
    first_person_experience = len(first_person_patterns.findall(text))

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "evidence_hits": evidence_hits,
        "opinion_hits": opinion_hits,
        "vague_hits": vague_hits,
        "has_dates": has_dates,
        "has_money": has_money,
        "has_org": has_org,
        "has_person": has_person,
        "has_url": has_url,
        "has_named_entities": has_named_entities,
        "entity_count": len(ents),
        "id_hits": id_hits,
        "accusation_count": accusation_count,
        "attachment_count": attachment_count,
        "first_person_experience": first_person_experience,
    }


# -------------------------
# Scoring model
# -------------------------
def score_and_explain(f: Dict[str, Any]) -> Dict[str, Any]:
    wc = f["word_count"]
    ev = f["evidence_hits"]
    op = f["opinion_hits"]
    vague = f["vague_hits"]
    dates = 1.0 if f["has_dates"] else 0.0
    money = 1.0 if f["has_money"] else 0.0
    url = 1.0 if f["has_url"] else 0.0
    ents = 1.0 if f["has_named_entities"] else 0.0
    ids = clamp01(f["id_hits"] / 2.0)
    acc = clamp01(f["accusation_count"] / 3.0)
    attach = clamp01(f["attachment_count"] / 2.0)
    fpe = clamp01(f["first_person_experience"] / 3.0)

    # ── Factual anchors (verifiable signals) ──────────────────────────────
    anchors = (
        0.26 * clamp01(ev / 4.0) +   # evidence phrases
        0.20 * dates +                 # dates/times detected
        0.18 * money +                 # money amounts
        0.10 * ents +                  # named entities
        0.10 * ids +                   # reference numbers
        0.08 * url +                   # links/URLs
        0.08 * attach                  # actual file attachments
    )
    anchors = clamp01(anchors)

    # ── Opinion signals ───────────────────────────────────────────────────
    # First-person experience is a strong opinion signal
    # Hedging phrases add to it
    # Both are downweighted if factual anchors are strong
    raw_opinion = clamp01(
        0.45 * fpe +
        0.35 * clamp01(op / 3.0) +
        0.20 * clamp01(acc * (1.0 - 0.6 * anchors))
    )
    effective_opinion = clamp01(raw_opinion * (1.0 - 0.70 * anchors))

    # ── Vagueness penalty ─────────────────────────────────────────────────
    vague_penalty = clamp01(vague / 3.0)

    # ── Length signal ─────────────────────────────────────────────────────
    # Very short text = unable to verify, regardless of content
    if wc < 20:
        length_penalty = 0.8  # strong push to Unable to Verify
    elif wc < 40:
        length_penalty = 0.4
    else:
        length_penalty = 0.0

    # ── Final scores ──────────────────────────────────────────────────────
    evidence_score = clamp01(anchors - (0.2 * vague_penalty) - (0.1 * length_penalty))
    opinion_score = clamp01(effective_opinion - (0.15 * vague_penalty))
    unable_score = clamp01(
        0.40 * vague_penalty +
        0.35 * length_penalty +
        0.25 * (1.0 - max(anchors, effective_opinion))
    )

    # ── Decision ──────────────────────────────────────────────────────────
    # Evidence-Based: anchors must be strong — raised threshold
    # Opinion-Based: opinion must dominate AND anchors must be weak
    # Unable to Verify: everything else — too vague, too short, mixed signals

    if evidence_score >= 0.55 and evidence_score > opinion_score:
        label = "Evidence-Based"
        final = evidence_score

    elif opinion_score >= 0.40 and anchors <= 0.30 and opinion_score > unable_score:
        label = "Opinion-Based"
        final = opinion_score

    else:
        label = "Unable to Verify"
        final = clamp01(unable_score + 0.1)  # slight boost so score reflects confidence

    summary = (
        f"{CLASSIFIER_VERSION}: label={label} score={final:.2f} "
        f"(anchors={anchors:.2f} evidence_score={evidence_score:.2f} "
        f"opinion_score={opinion_score:.2f} unable_score={unable_score:.2f}) "
        f"| ev={ev} op={op} vague={vague} fpe={f['first_person_experience']} "
        f"dates={int(dates)} money={int(money)} ents={int(ents)} "
        f"ids={f['id_hits']} attach={f['attachment_count']} wc={wc}"
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
            "unable_score": unable_score,
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
        out = {"label": "Unable to Verify", "score": 0.3, "explanation": {"summary": f"{CLASSIFIER_VERSION}: missing description"}}
        updated = update_record_ai(record_id, "Unable to Verify", 0.3, out["explanation"])
        return {"ok": True, "record_id": record_id, "classification": "Unable to Verify", "score": 0.3, "updated_db": updated}

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
