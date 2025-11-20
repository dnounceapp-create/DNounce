import json
import spacy
import sys
from http.server import BaseHTTPRequestHandler

# -----------------------------
# Load spaCy model with fallback
# -----------------------------
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


# -----------------------------
# Extract credibility signals
# -----------------------------
def extract_signals(text: str, doc):
    text_lower = text.lower()

    evidence_keywords = [
        "evidence", "proof", "document", "screenshot", "photo", "video",
        "text message", "invoice", "contract", "email", "recording",
        "bank statement", "receipt", "sued", "police report", "report"
    ]

    opinion_phrases = [
        "i think", "i feel", "i believe", "in my opinion",
        "seems like", "looks like", "probably", "maybe", "i guess",
        "i'm pretty sure", "kind of", "sort of"
    ]

    emotional_words = [
        "crazy", "insane", "horrible", "awful", "toxic", "liar",
        "narcissist", "evil", "disgusting", "psycho", "manipulative"
    ]

    accusation_words = [
        "lied", "cheated", "stole", "scammed", "abused",
        "manipulated", "ghosted", "gaslit", "gaslighted"
    ]

    signals = {
        "has_evidence_keywords": any(k in text_lower for k in evidence_keywords),
        "has_opinion_phrases": any(p in text_lower for p in opinion_phrases),
        "has_emotional_words": any(w in text_lower for w in emotional_words),
        "has_accusation_words": any(w in text_lower for w in accusation_words),
        "named_entities_count": len(list(doc.ents)),
        "has_dates": any(ent.label_ in ("DATE", "TIME") for ent in doc.ents),
        "has_names": any(ent.label_ == "PERSON" for ent in doc.ents),
        "has_orgs": any(ent.label_ in ("ORG", "GPE") for ent in doc.ents),
        "has_numbers": any(t.like_num for t in doc),
        "has_money": any(ent.label_ == "MONEY" for ent in doc.ents),
        "has_urls": any(t.like_url for t in doc),
        "word_count": len(doc),
    }

    return signals


# -----------------------------
# Compute credibility score + category
# -----------------------------
def compute_credibility(signals: dict):
    score = 0.5  # neutral baseline

    # positive
    if signals["has_evidence_keywords"]: score += 0.30
    if signals["has_dates"]: score += 0.10
    if signals["has_numbers"]: score += 0.05
    if signals["has_money"]: score += 0.05
    if signals["has_urls"]: score += 0.10
    if signals["named_entities_count"] >= 2: score += 0.05
    if signals["has_names"]: score += 0.05
    if signals["has_orgs"]: score += 0.05

    # negative
    if signals["has_opinion_phrases"]: score -= 0.25
    if signals["has_emotional_words"]: score -= 0.20
    if signals["has_accusation_words"] and not signals["has_evidence_keywords"]:
        score -= 0.25

    if signals["word_count"] < 30:
        score -= 0.10

    score = max(0, min(score, 1))

    if score >= 0.67:
        label = "Evidence-Based"
    elif score <= 0.33:
        label = "Opinion-Based"
    else:
        label = "Unclear"

    return label, score


# -----------------------------
# HTTP Handler for Vercel Python Function
# -----------------------------
class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)

            text = data.get("text", "").strip()
            if not text:
                self._error(400, "Missing 'text' in request body")
                return

            doc = nlp(text)

            signals = extract_signals(text, doc)
            classification, score = compute_credibility(signals)

            response = {
                "classification": classification,
                "credibility_score": score,
                "signals": signals,
                "word_count": signals["word_count"]
            }

            self._send(200, response)

        except Exception as e:
            print(f"[classify-record] ERROR: {str(e)}", file=sys.stderr)
            self._error(500, "Internal server error")

    # utilities
    def _send(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def _error(self, status, msg):
        self._send(status, {"error": msg})
