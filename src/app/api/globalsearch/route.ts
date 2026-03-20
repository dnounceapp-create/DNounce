import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const query = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "all").toLowerCase();
  const location = (searchParams.get("location") || "").trim();

  if (!query) return NextResponse.json({ results: [] });

  const isHashtag = query.startsWith("#");
  const baseQuery = query.replace(/^#/, "").trim();
  const q = baseQuery.toLowerCase();

  // ─── Users / Subjects (Profiles) ──────────────────────────────────────
  // Search by: name, nickname, organization, location, subject_uuid
  const profileQuery = async () => {
    try {
      const select = "subject_uuid, name, nickname, organization, location, avatar_url";

      // Try starts-with first (most relevant)
      const { data: sw } = await supabase
        .from("subjects")
        .select(select)
        .or(`name.ilike.${baseQuery}%,nickname.ilike.${baseQuery}%,organization.ilike.${baseQuery}%`)
        .limit(10);

      if (sw && sw.length > 0) return sw.map(mapProfile);

      // Fallback: contains anywhere + exact UUID match
      const { data: contains } = await supabase
        .from("subjects")
        .select(select)
        .or(
          `name.ilike.%${baseQuery}%,` +
          `nickname.ilike.%${baseQuery}%,` +
          `organization.ilike.%${baseQuery}%,` +
          `location.ilike.%${baseQuery}%,` +
          (isUUID(baseQuery) ? `subject_uuid.eq.${baseQuery}` : "subject_uuid.eq.00000000-0000-0000-0000-000000000000")
        )
        .limit(10);

      return (contains || []).map(mapProfile);
    } catch (err) {
      console.error("profileQuery error:", err);
      return [];
    }
  };

  const mapProfile = (x: any) => ({
    type: "profile",
    id: x.subject_uuid,
    name: x.name,
    nickname: x.nickname,
    organization: x.organization,
    location: x.location,
    avatar_url: x.avatar_url,
  });

  // ─── Records ───────────────────────────────────────────────────────────
  // Search by: record_alias (SuperHero123 • John Doe), category, location, id
  const recordQuery = async () => {
    try {
      const { data, error } = await supabase
        .from("records")
        .select("id, record_alias, category, location, created_at")
        .eq("is_published", true)
        .or(
          `record_alias.ilike.%${baseQuery}%,` +
          `category.ilike.%${baseQuery}%,` +
          `location.ilike.%${baseQuery}%` +
          (isUUID(baseQuery) ? `,id.eq.${baseQuery}` : "")
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) console.error("recordQuery error:", error.message);
  
      return (data || []).map((x) => ({
        type: "record",
        id: x.id,
        name: x.record_alias || x.category || "Record",
        category: x.category,
        location: x.location,
      }));
    } catch (err) {
      console.error("recordQuery error:", err);
      return [];
    }
  };

  // ─── Categories ────────────────────────────────────────────────────────
  const categoryQuery = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", `%${baseQuery}%`)
        .limit(10);
      if (error) console.error("categoryQuery error:", error.message);
      return (data || []).map((x) => ({ type: "category", id: x.id, name: x.name }));
    } catch (err) {
      console.error("categoryQuery error:", err);
      return [];
    }
  };

  // ─── Organizations ─────────────────────────────────────────────────────
  const orgQuery = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .ilike("name", `%${baseQuery}%`)
        .limit(10);
      if (error) console.error("orgQuery error:", error.message);
      return (data || []).map((x) => ({ type: "organization", id: x.id, name: x.name }));
    } catch (err) {
      console.error("orgQuery error:", err);
      return [];
    }
  };

  // ─── Hashtags (future) ─────────────────────────────────────────────────
  const hashtagQuery = async () => [];

  // ─── Route ─────────────────────────────────────────────────────────────
  if (isHashtag) return NextResponse.json({ results: [] });

  let results: any[] = [];

  if (category === "profile") {
    results = await profileQuery();
  } else if (category === "record") {
    results = await recordQuery();
  } else if (category === "category") {
    results = await categoryQuery();
  } else if (category === "organization") {
    results = await orgQuery();
  } else if (category === "hashtag") {
    results = await hashtagQuery();
  } else {
    // All — run everything in parallel
    const [profiles, records, categories, orgs] = await Promise.all([
      profileQuery(),
      recordQuery(),
      categoryQuery(),
      orgQuery(),
    ]);
    results = [...profiles, ...records, ...categories, ...orgs];
  }

  // ─── Location filter ───────────────────────────────────────────────────
  if (location) {
    results = results.filter((r) =>
      r.location?.toLowerCase().includes(location.toLowerCase())
    );
  }

  // ─── Score & sort ──────────────────────────────────────────────────────
  const scored = results
    .map((r) => ({ ...r, _score: score(r, q) }))
    .sort((a, b) => b._score - a._score);

  return NextResponse.json({ results: scored });
}

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function score(item: any, q: string) {
  let s = 0;
  const n = (v: any) => (v || "").toString().toLowerCase();

  if (n(item.name).startsWith(q)) s += 10;
  if (n(item.name).includes(q)) s += 5;
  if (n(item.nickname).includes(q)) s += 4;
  if (n(item.record_alias).includes(q)) s += 4;
  if (n(item.organization).includes(q)) s += 3;
  if (n(item.category).includes(q)) s += 2;
  if (n(item.location).includes(q)) s += 1;

  return s;
}