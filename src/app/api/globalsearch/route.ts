import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 🚀 Unified Intelligent Global Search Endpoint
export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);

  const query = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "all").toLowerCase();
  const location = (searchParams.get("location") || "").trim();

  if (!query) return NextResponse.json({ results: [] });

  // Freshness: last 14 days for records
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Detect query type
  const isHashtag = query.startsWith("#");
  const isId = /^[A-Za-z0-9_-]{5,}$/.test(query);
  const baseQuery = query.replace(/^#/, "").trim();

  // Utility: safely run supabase queries
  const safeQuery = async (table: string, builder: (q: any) => any) => {
    try {
      let q = supabase.from(table).select("*");
      q = builder(q);
      const { data, error } = await q.limit(10);
      if (error) console.error(`❌ ${table} error:`, error.message);
      return data || [];
    } catch (err) {
      console.error(`❌ ${table} exception:`, err);
      return [];
    }
  };

  // 🧠 Subqueries for each data type
  const profileQuery = () =>
    safeQuery("profiles", (q) =>
      q.or(
        `name.ilike.%${baseQuery}%,nickname.ilike.%${baseQuery}%,subject_id.ilike.%${baseQuery}%`
      )
    );

  const categoryQuery = () =>
    safeQuery("categories", (q) =>
      q.ilike("name", `%${baseQuery}%`)
    );

  const orgQuery = () =>
    safeQuery("organizations", (q) =>
      q.or(
        `company.ilike.%${baseQuery}%,organization.ilike.%${baseQuery}%,category.ilike.%${baseQuery}%`
      )
    );

  const recordQuery = () =>
    safeQuery("records", (q) =>
      q
        .or(`title.ilike.%${baseQuery}%,record_id.ilike.%${baseQuery}%`)
        .gte("created_at", twoWeeksAgo.toISOString())
        .order("created_at", { ascending: false })
    );

  const hashtagQuery = () =>
    safeQuery("hashtags", (q) =>
      q.ilike("tag", `%${baseQuery}%`)
    );

  // 🧩 Determine which to run
  let results: any[] = [];
  if (isHashtag) {
    results = await hashtagQuery();
    return NextResponse.json({
      results: results.map((x) => ({ type: "hashtag", ...x })),
    });
  }

  if (category === "profile") results = await profileQuery();
  else if (category === "category") results = await categoryQuery();
  else if (category === "organization") results = await orgQuery();
  else if (category === "record") results = await recordQuery();
  else if (category === "hashtag") results = await hashtagQuery();
  else {
    // “All” → gather everything
    const [profiles, categories, orgs, records, hashtags] = await Promise.all([
      profileQuery(),
      categoryQuery(),
      orgQuery(),
      recordQuery(),
      hashtagQuery(),
    ]);

    results = [
      ...profiles.map((x) => ({ type: "profile", ...x })),
      ...categories.map((x) => ({ type: "category", ...x })),
      ...orgs.map((x) => ({ type: "organization", ...x })),
      ...records.map((x) => ({ type: "record", ...x })),
      ...hashtags.map((x) => ({ type: "hashtag", ...x })),
    ];
  }

  // 🌍 Optional location filter
  if (location) {
    results = results.filter((r) =>
      r.location?.toLowerCase().includes(location.toLowerCase())
    );
  }

  // 🧮 Scoring & ranking
  const scored = results
    .map((r) => ({
      ...r,
      _score: computeScore(r, baseQuery),
    }))
    .sort((a, b) => b._score - a._score);

  return NextResponse.json({ results: scored });
}

// 🎯 Simple fuzzy scoring
function computeScore(item: any, query: string) {
  const str = JSON.stringify(item).toLowerCase();
  const q = query.toLowerCase();
  let score = 0;

  if (str.includes(q)) score += 10;
  if (str.startsWith(q)) score += 5;
  if (item.name?.toLowerCase().includes(q)) score += 5;
  if (item.nickname?.toLowerCase().includes(q)) score += 4;
  if (item.subject_id?.toLowerCase().includes(q)) score += 4;
  if (item.organization?.toLowerCase().includes(q)) score += 3;
  if (item.company?.toLowerCase().includes(q)) score += 3;
  if (item.category?.toLowerCase().includes(q)) score += 2;
  if (item.record_id?.toLowerCase().includes(q)) score += 2;
  if (item.tag?.toLowerCase().includes(q)) score += 2;
  if (item.title?.toLowerCase().includes(q)) score += 2;

  return score;
}
