import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

export async function POST(req: Request) {
  try {
    await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Missing 'text' in request body" },
        { status: 400 }
      );
    }

    // Call the Python spaCy classifier
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/python/classify-record`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      spaCy_classification: data.classification,
      spaCy_credibility_score: data.credibility_score,
      spaCy_word_count: data.word_count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
