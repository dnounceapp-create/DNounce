import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { recordId } = await req.json();

    if (!recordId || typeof recordId !== "string") {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    // This is your Render FastAPI service.
    // It should do the classification AND update Supabase itself.
    const baseUrl = process.env.DNOUNCE_CLASSIFIER_URL || "https://dnounce.onrender.com";

    const resp = await fetch(`${baseUrl}/webhook/classify-record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // send a few common key names to be safe
      body: JSON.stringify({
        record_id: recordId,
        recordId,
        id: recordId,
      }),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Classifier call failed", status: resp.status, details: text },
        { status: 500 }
      );
    }

    // If your classifier returns JSON, try to parse; otherwise just return text
    try {
      return NextResponse.json({ ok: true, result: JSON.parse(text) });
    } catch {
      return NextResponse.json({ ok: true, result: text });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
