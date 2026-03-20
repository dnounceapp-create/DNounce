import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request): Promise<Response> {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const firstName = searchParams.get("firstName")?.trim() || "";
  const lastName = searchParams.get("lastName")?.trim() || "";
  const nickname = searchParams.get("nickname")?.trim() || "";
  const organization = searchParams.get("organization")?.trim() || "";
  const location = searchParams.get("location")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const subjectId = searchParams.get("subjectId")?.trim() || "";
  const recordId = searchParams.get("recordId")?.trim() || "";

  const hasAnyField = [firstName, lastName, nickname, organization, location, category, subjectId, recordId].some(Boolean);
  if (!hasAnyField) return NextResponse.json({ results: [] });

  const results: any[] = [];

  // ─── Profile search ────────────────────────────────────────────────────
  if (firstName || lastName || nickname || organization || location || subjectId) {
    try {
      let q = supabase
        .from("subjects")
        .select("subject_uuid, name, nickname, organization, location, avatar_url");

      if (subjectId) {
        q = q.eq("subject_uuid", subjectId);
      } else {
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const conditions: string[] = [];
        if (fullName) conditions.push(`name.ilike.%${fullName}%`);
        if (firstName) conditions.push(`name.ilike.${firstName}%`);
        if (lastName) conditions.push(`name.ilike.%${lastName}`);
        if (nickname) conditions.push(`nickname.ilike.%${nickname}%`);
        if (organization) conditions.push(`organization.ilike.%${organization}%`);
        if (location) conditions.push(`location.ilike.%${location}%`);
        if (conditions.length) q = q.or(conditions.join(","));
      }

      const { data } = await q.limit(10);
      (data || []).forEach((x) => {
        results.push({
          type: "profile",
          id: x.subject_uuid,
          name: x.name,
          nickname: x.nickname,
          organization: x.organization,
          location: x.location,
          avatar_url: x.avatar_url,
        });
      });
    } catch (err) {
      console.error("Advanced profile search error:", err);
    }
  }

  // ─── Record search ─────────────────────────────────────────────────────
  if (category || location || recordId) {
    try {
      let q = supabase
        .from("records")
        .select("id, record_alias, category, location")
        .eq("is_published", true);

      if (recordId) {
        q = q.eq("id", recordId);
      } else {
        const conditions: string[] = [];
        if (category) conditions.push(`category.ilike.%${category}%`);
        if (location) conditions.push(`location.ilike.%${location}%`);
        if (conditions.length) q = q.or(conditions.join(","));
      }

      const { data } = await q.limit(10);
      (data || []).forEach((x) => {
        results.push({
          type: "record",
          id: x.id,
          name: x.record_alias || x.category || "Record",
          category: x.category,
          location: x.location,
        });
      });
    } catch (err) {
      console.error("Advanced record search error:", err);
    }
  }

  return NextResponse.json({ results });
}