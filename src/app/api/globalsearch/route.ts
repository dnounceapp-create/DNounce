import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient(); // ✅ FIXED: Added await
  const { searchParams } = new URL(req.url);

  const query = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "all").toLowerCase();
  const location = (searchParams.get("location") || "").trim();

  if (!query) return NextResponse.json({ results: [] });

  // Freshness window — last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const results: any[] = [];

  // Helper: clean query and detect intent
  const isHashtag = query.startsWith("#");
  const isId = /^[A-Za-z0-9_-]{6,}$/.test(query);
  const baseQuery = query.replace("#", "").trim();

  // Helper: run queries safely
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

  // 🧩 Build sub-queries
  const profileQuery = () =>
    safeQuery("profiles", (q) =>
      q.or(
        `name.ilike.%${baseQuery}%,nickname.ilike.%${baseQuery}%,subject_id.ilike.%${baseQuery}%`
      )
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
    safeQuery("hashtags", (q) => q.ilike("tag", `%${baseQuery}%`));

  const categoryQuery = () =>
    safeQuery("categories", (q) => q.ilike("name", `%${baseQuery}%`));

  // 🧠 Query logic
  if (isHashtag) {
    const hashtags = await hashtagQuery();
    return NextResponse.json({
      results: hashtags.map((x) => ({ type: "hashtag", ...x })),
    });
  }

  let allResults: any[] = [];

  if (category === "profile") {
    allResults = await profileQuery();
  } else if (category === "organization") {
    allResults = await orgQuery();
  } else if (category === "record") {
    allResults = await recordQuery();
  } else if (category === "hashtag") {
    allResults = await hashtagQuery();
  } else if (category === "category") {
    allResults = await categoryQuery();
  } else {
    // 🧩 “All” mode — grouped results
    const [profiles, orgs, records, hashtags] = await Promise.all([
      profileQuery(),
      orgQuery(),
      recordQuery(),
      hashtagQuery(),
    ]);

    allResults = [
      ...profiles.slice(0, 3).map((x) => ({ type: "profile", ...x })),
      ...orgs.slice(0, 3).map((x) => ({ type: "organization", ...x })),
      ...records.slice(0, 3).map((x) => ({ type: "record", ...x })),
      ...hashtags.slice(0, 3).map((x) => ({ type: "hashtag", ...x })),
    ];
  }

  // 🌍 Optional location filter
  if (location) {
    allResults = allResults.filter((r) =>
      r.location?.toLowerCase().includes(location.toLowerCase())
    );
  }

  // 🧠 Fuzzy rank boost — prioritize more relevant ones
  const scoredResults = allResults
    .map((r) => ({
      ...r,
      _score: computeScore(r, baseQuery),
    }))
    .sort((a, b) => b._score - a._score);

  return NextResponse.json({ results: scoredResults });
}

// 🧮 Mini fuzzy scoring engine
function computeScore(item: any, query: string) {
  const str = JSON.stringify(item).toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  if (str.includes(q)) score += 10;
  if (str.startsWith(q)) score += 5;
  if (item.name?.toLowerCase().includes(q)) score += 5;
  if (item.nickname?.toLowerCase().includes(q)) score += 4;
  if (item.company?.toLowerCase().includes(q)) score += 3;
  if (item.organization?.toLowerCase().includes(q)) score += 3;
  if (item.tag?.toLowerCase().includes(q)) score += 2;
  if (item.title?.toLowerCase().includes(q)) score += 2;
  return score;
}
