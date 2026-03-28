import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function GET(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const firstName    = searchParams.get("firstName")?.trim()    || "";
  const lastName     = searchParams.get("lastName")?.trim()     || "";
  const nickname     = searchParams.get("nickname")?.trim()     || "";
  const organization = searchParams.get("organization")?.trim() || "";
  const location     = searchParams.get("location")?.trim()     || "";
  const category     = searchParams.get("category")?.trim()     || "";
  const subjectId    = searchParams.get("subjectId")?.trim()    || "";
  const recordId     = searchParams.get("recordId")?.trim()     || "";
  const userLocation = searchParams.get("userLocation")?.trim() || "";

  const hasAnyField = [firstName, lastName, nickname, organization, location, category, subjectId, recordId].some(Boolean);
  if (!hasAnyField) return NextResponse.json({ results: [] });

  const subjectSelect = "subject_uuid, name, nickname, organization, location, avatar_url, owner_auth_user_id";

  // ─── recordId only ─────────────────────────────────────────────────────
  if (recordId) {
    const { data } = await supabase
      .from("records")
      .select("id, record_alias, category, location")
      .eq("id", recordId)
      .eq("is_published", true)
      .limit(1);
    return NextResponse.json({
      results: (data || []).map((x: any) => ({
        type: "record", id: x.id,
        name: x.record_alias || x.category || "Record",
        category: x.category, location: x.location,
      })),
    });
  }

  // ─── subjectId only ────────────────────────────────────────────────────
  if (subjectId && !category && !firstName && !lastName && !nickname && !organization && !location) {
    const { data } = await supabase
      .from("subjects")
      .select(subjectSelect)
      .eq("subject_uuid", subjectId)
      .limit(1);
    const jobTitles = await getJobTitles(supabase, (data || []).map((s: any) => s.owner_auth_user_id).filter(Boolean));
    return NextResponse.json({
      results: (data || []).map((x: any) => ({
        type: "profile", id: x.subject_uuid, name: x.name,
        nickname: x.nickname, organization: x.organization,
        location: x.location, avatar_url: x.avatar_url,
        category: x.owner_auth_user_id ? (jobTitles[x.owner_auth_user_id] || null) : null,
      })),
    });
  }

  // ─── Smart cross-table AND search ──────────────────────────────────────
  try {
    let subjectQuery = supabase
      .from("subjects")
      .select(subjectSelect);

    if (subjectId) {
      subjectQuery = subjectQuery.eq("subject_uuid", subjectId);
    } else {
      // AND logic — every field chains as a separate filter
      if (firstName && lastName) {
        subjectQuery = subjectQuery
          .ilike("name", `%${firstName}%`)
          .ilike("name", `%${lastName}%`);
      } else if (firstName) {
        subjectQuery = subjectQuery.ilike("name", `${firstName}%`);
      } else if (lastName) {
        subjectQuery = subjectQuery.ilike("name", `%${lastName}`);
      }
      if (nickname)     subjectQuery = subjectQuery.ilike("nickname",     `%${nickname}%`);
      if (organization) subjectQuery = subjectQuery.ilike("organization", `%${organization}%`);
      if (location)     subjectQuery = subjectQuery.ilike("location",     `%${location}%`);
    }

    const { data: subjects, error } = await subjectQuery.limit(50);
    if (error) console.error("Subject query error:", error.message);
    if (!subjects || subjects.length === 0) return NextResponse.json({ results: [] });

    // Fetch job titles for all matched subjects
    const jobTitles = await getJobTitles(
      supabase,
      subjects.map((s: any) => s.owner_auth_user_id).filter(Boolean)
    );

    // ─── Category filter: join to records ──────────────────────────────
    if (category) {
      const subjectUuids = subjects.map((s: any) => s.subject_uuid);
      const { data: matchingRecords } = await supabase
        .from("records")
        .select("subject_id, id, record_alias, category, location")
        .eq("is_published", true)
        .in("subject_id", subjectUuids)
        .ilike("category", `%${category}%`)
        .limit(100);

      if (!matchingRecords || matchingRecords.length === 0) {
        return NextResponse.json({ results: [] });
      }

      const matchedIds = new Set(matchingRecords.map((r: any) => r.subject_id));
      const matchedSubjects = subjects.filter((s: any) => matchedIds.has(s.subject_uuid));

      const seen = new Set<string>();
      const results: any[] = [];

      matchedSubjects.forEach((s: any) => {
        if (seen.has(s.subject_uuid)) return;
        seen.add(s.subject_uuid);
        const recordCategory = matchingRecords.find((r: any) => r.subject_id === s.subject_uuid)?.category;
        results.push({
          type: "profile", id: s.subject_uuid, name: s.name,
          nickname: s.nickname, organization: s.organization,
          location: s.location, avatar_url: s.avatar_url,
          // job_title takes priority, fall back to record category
          category: s.owner_auth_user_id
            ? (jobTitles[s.owner_auth_user_id] || recordCategory || null)
            : (recordCategory || null),
        });
      });

      return NextResponse.json({
        results: results
          .map((r) => ({ ...r, _score: getProximityScore(r.location || "", userLocation) }))
          .sort((a, b) => b._score - a._score),
      });
    }

    // ─── No category — return matched subjects with job titles ──────────
    const results = subjects.map((s: any) => ({
      type: "profile", id: s.subject_uuid, name: s.name,
      nickname: s.nickname, organization: s.organization,
      location: s.location, avatar_url: s.avatar_url,
      category: s.owner_auth_user_id ? (jobTitles[s.owner_auth_user_id] || null) : null,
    }));

    return NextResponse.json({
      results: results
        .map((r: any) => ({ ...r, _score: getProximityScore(r.location || "", userLocation) }))
        .sort((a: any, b: any) => b._score - a._score),
    });

  } catch (err) {
    console.error("Advanced search error:", err);
    return NextResponse.json({ results: [] });
  }
}