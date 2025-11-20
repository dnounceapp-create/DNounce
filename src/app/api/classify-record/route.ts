import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/classify-record`,
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
