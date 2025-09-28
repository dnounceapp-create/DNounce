import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    // Call OpenAI with your prompt
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    // For debugging — dump raw response
    console.log("DEBUG OpenAI response:", JSON.stringify(response, null, 2));

    // Always send back text if possible
    return NextResponse.json({
      output: response.output_text ?? "No text returned",
    });
  } catch (err: any) {
    console.error("Codex API error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}