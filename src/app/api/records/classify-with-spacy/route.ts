import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const recordId = body?.recordId as string | undefined;

    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    // Your spaCy service (Render)
    const SPACY_URL = process.env.SPACY_URL || "https://dnounce.onrender.com";
    const WEBHOOK_SECRET = process.env.SPACY_WEBHOOK_SECRET || "";

    const res = await fetch(`${SPACY_URL}/webhook/classify-record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WEBHOOK_SECRET ? { Authorization: `Bearer ${WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ record: { id: recordId } }),
    });

    const text = await res.text();

    // If spaCy didn’t return OK, bubble the error up
    if (!res.ok) {
      return NextResponse.json(
        { error: "spaCy classify failed", status: res.status, body: text },
        { status: 500 }
      );
    }

    // spaCy returns JSON
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "spaCy returned non-JSON", body: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, spacy: json });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
