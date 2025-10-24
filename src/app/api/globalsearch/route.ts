import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const userLocation = searchParams.get("location") || "";

  if (query.trim().length < 2) return NextResponse.json({ results: [] });

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const isHashtag = query.startsWith("#");
  const baseQuery = query.replace("#", "").trim();

  // 🧠 If searching hashtags, skip location filters
  if (isHashtag) {
    const { data, error } = await supabase
      .from("hashtags")
      .select("id, tag, usage_count, updated_at")
      .ilike("tag", `%${baseQuery}%`)
      .gte("updated_at", twoWeeksAgo.toISOString())
      .order("usage_count", { ascending: false })
      .limit(10);

    if (error) console.error(error);
    return NextResponse.json({
      results: data?.map((h) => ({ type: "hashtag", ...h })) || [],
    });
  }

  // 🌍 For profiles and records — apply location filters
  const profileQuery = supabase
    .from("profiles")
    .select("id, name, alias, organization, location")
    .ilike("name", `%${baseQuery}%`)
    .limit(5);

  const recordQuery = supabase
    .from("records")
    .select("id, title, status, created_at, location")
    .ilike("title", `%${baseQuery}%`)
    .gte("created_at", twoWeeksAgo.toISOString())
    .limit(5);

  if (userLocation) {
    profileQuery.ilike("location", `%${userLocation}%`);
    recordQuery.ilike("location", `%${userLocation}%`);
  }

  const [profiles, records] = await Promise.all([
    profileQuery,
    recordQuery,
  ]);

  const results = [
    ...(profiles.data?.map((p) => ({ type: "profile", ...p })) || []),
    ...(records.data?.map((r) => ({ type: "record", ...r })) || []),
  ];

  return NextResponse.json({ results });
}
