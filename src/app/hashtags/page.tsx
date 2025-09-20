import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hashtag = searchParams.get("hashtag");

    if (!hashtag || hashtag.trim() === "") {
      return NextResponse.json({ records: [] });
    }

    // Normalize hashtag (remove # if included)
    const cleanHashtag = hashtag.startsWith("#")
      ? hashtag.slice(1)
      : hashtag;

    // Example: assuming you have a `records` table with `hashtags` array/text column
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .ilike("hashtags", `%${cleanHashtag}%`);

    if (error) {
      console.error("❌ Hashtag query error:", error.message);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    console.error("❌ Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
