import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getProximityScore(itemLocation: string, userLocation: string): number {
  if (!userLocation || !itemLocation) return 0;
  const item = itemLocation.toLowerCase();
  const user = userLocation.toLowerCase();
  if (item === user) return 10;
  const userCity = user.split(",")[0].trim();
  if (item.includes(userCity)) return 7;
  const userState = user.split(",").pop()?.trim() || "";
  if (userState && item.includes(userState)) return 3;
  return 0;
}

function scoreResult(item: any, q: string, userLocation: string): number {
  let s = 0;
  const n = (v: any) => (v || "").toString().toLowerCase();
  if (n(item.name).startsWith(q)) s += 10;
  if (n(item.name).includes(q)) s += 5;
  if (n(item.nickname).includes(q)) s += 4;
  if (n(item.organization).includes(q)) s += 3;
  if (n(item.category).includes(q)) s += 2;
  if (n(item.location).includes(q)) s += 1;
  s += getProximityScore(item.location || "", userLocation);
  return s;
}

async function getJobTitles(supabase: any, ownerIds: string[]): Promise<Record<string, string>> {
  if (!ownerIds.length) return {};
  const { data } = await supabase
    .from("user_public_profiles")
    .select("user_id, job_title")
    .in("user_id", ownerIds);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { if (r.job_title) map[r.user_id] = r.job_title; });
  return map;
}

function mapSubjects(subjects: any[], jobTitles: Record<string, string>) {
  return subjects.map((x: any) => ({
    type: "profile",
    id: x.subject_uuid,
    name: x.name,
    nickname: x.nickname,
    organization: x.organization,
    location: x.location,
    avatar_url: x.avatar_url,
    category: x.owner_auth_user_id ? (jobTitles[x.owner_auth_user_id] || null) : null,
  }));
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const query    = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "all").toLowerCase();
  const location = (searchParams.get("location") || "").trim();

  if (!query) return NextResponse.json({ results: [] });
  if (query.startsWith("#")) return NextResponse.json({ results: [] });

  const q = query.toLowerCase();
  const select = "subject_uuid, name, nickname, organization, location, avatar_url, owner_auth_user_id";

  const profileQuery = async () => {
    try {
      const { data: sw } = await supabase
        .from("subjects")
        .select(select)
        .or(`name.ilike.${query}%,nickname.ilike.${query}%,organization.ilike.${query}%`)
        .limit(10);
      if (sw && sw.length > 0) return sw;

      const { data: contains } = await supabase
        .from("subjects")
        .select(select)
        .or(
          [
            `name.ilike.%${query}%`,
            `nickname.ilike.%${query}%`,
            `organization.ilike.%${query}%`,
            `location.ilike.%${query}%`,
            isUUID(query)
              ? `subject_uuid.eq.${query}`
              : `subject_uuid.eq.00000000-0000-0000-0000-000000000000`,
          ].join(",")
        )
        .limit(10);
      return contains || [];
    } catch (err) {
      console.error("profileQuery error:", err);
      return [];
    }
  };

  const recordQuery = async () => {
    try {
      const { data } = await supabase
        .from("records")
        .select("id, record_alias, category, location, created_at")
        .eq("is_published", true)
        .or(
          [
            `record_alias.ilike.%${query}%`,
            `category.ilike.%${query}%`,
            `location.ilike.%${query}%`,
            isUUID(query) ? `id.eq.${query}` : null,
          ].filter(Boolean).join(",")
        )
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []).map((x) => ({
        type: "record", id: x.id,
        name: x.record_alias || x.category || "Record",
        category: x.category, location: x.location,
      }));
    } catch (err) {
      console.error("recordQuery error:", err);
      return [];
    }
  };

  const categoryQuery = async () => {
    try {
      const { data } = await supabase
        .from("categories").select("id, name")
        .ilike("name", `%${query}%`).limit(10);
      return (data || []).map((x: any) => ({ type: "category", id: x.id, name: x.name }));
    } catch (err) { return []; }
  };

  const orgQuery = async () => {
    try {
      const { data } = await supabase
        .from("organizations").select("id, name")
        .ilike("name", `%${query}%`).limit(10);
      return (data || []).map((x: any) => ({ type: "organization", id: x.id, name: x.name }));
    } catch (err) { return []; }
  };

  let rawResults: any[] = [];

  if (category === "profile") {
    const subjects = await profileQuery();
    const jobTitles = await getJobTitles(supabase, subjects.map((s: any) => s.owner_auth_user_id).filter(Boolean));
    rawResults = mapSubjects(subjects, jobTitles);
  } else if (category === "record") {
    rawResults = await recordQuery();
  } else if (category === "category") {
    rawResults = await categoryQuery();
  } else if (category === "organization") {
    rawResults = await orgQuery();
  } else {
    const [subjects, records, categories, orgs] = await Promise.all([
      profileQuery(), recordQuery(), categoryQuery(), orgQuery(),
    ]);
    const jobTitles = await getJobTitles(supabase, subjects.map((s: any) => s.owner_auth_user_id).filter(Boolean));
    rawResults = [
      ...mapSubjects(subjects, jobTitles),
      ...records, ...categories, ...orgs,
    ];
  }

  const scored = rawResults
    .map((r) => ({ ...r, _score: scoreResult(r, q, location) }))
    .sort((a, b) => b._score - a._score);

  return NextResponse.json({ results: scored });
}