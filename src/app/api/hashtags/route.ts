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

    // Query records table for hashtag
    const { data, error } = await supabase
      .from("records")
      .select("*")
      .ilike("hashtags", `%${cleanHashtag}%`);

    if (error) {
      console.error("❌ Hashtag query error:", error.message);
      // 👇 Always return empty array instead of throwing
      return NextResponse.json({ records: [] });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    console.error("❌ Server error:", err);
    // 👇 Always return empty array instead of crashing
    return NextResponse.json({ records: [] });
  }
}