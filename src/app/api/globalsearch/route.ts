import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "all";
  const location = searchParams.get("location") || "";

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Helper: run search for each type
  const runSearch = async (table: string, field: string) => {
    let q = supabase.from(table).select("*").ilike(field, `%${query}%`);
    if (table === "records") q = q.gte("created_at", twoWeeksAgo.toISOString());
    if (location) q = q.ilike("location", `%${location}%`);
    return q.limit(5);
  };

  const searches: Record<string, any> = {
    profile: () => runSearch("profiles", "name"),
    organization: () => runSearch("profiles", "organization"),
    record: () => runSearch("records", "title"),
    hashtag: () =>
      supabase
        .from("hashtags")
        .select("id, tag, usage_count, updated_at")
        .ilike("tag", `%${query}%`)
        .gte("updated_at", twoWeeksAgo.toISOString())
        .order("usage_count", { ascending: false })
        .limit(10),
  };

  let results: any[] = [];

  if (category === "all") {
    const [profiles, organizations, records, hashtags] = await Promise.all([
      searches.profile(),
      searches.organization(),
      searches.record(),
      searches.hashtag(),
    ]);
    results = [
      ...(profiles.data?.map((x: any) => ({ type: "profile", ...x })) || []),
      ...(organizations.data?.map((x: any) => ({ type: "organization", ...x })) || []),
      ...(records.data?.map((x: any) => ({ type: "record", ...x })) || []),
      ...(hashtags.data?.map((x: any) => ({ type: "hashtag", ...x })) || []),
    ];    
  } else {
    const res = await searches[category]();
    results = res.data?.map((x: any) => ({ type: category, ...x })) || [];
  }

  return NextResponse.json({ results });
}
