import { supabase } from "@/lib/supabaseClient";

export async function searchSubjects(filters: {
  profileId?: string;
  name?: string;
  nickname?: string;
  organization?: string;
  category?: string;
  location?: string;
  relationship?: string;
  otherRelationship?: string;
}) {
  let query = supabase
    .from("subjects")
    .select("subject_uuid, name, nickname, organization, location, avatar_url, public_code");

  if (filters.profileId) {
    query = query.eq("subject_uuid", filters.profileId);
  }
  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }
  if (filters.nickname) {
    query = query.ilike("nickname", `%${filters.nickname}%`);
  }
  if (filters.organization) {
    query = query.ilike("organization", `%${filters.organization}%`);
  }
  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Database error:", error.message);
    return [];
  }

  return data || [];
}