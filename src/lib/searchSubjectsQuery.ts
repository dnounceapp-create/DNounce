import { supabase } from "@/lib/supabaseClient";

export async function searchSubjects(filters: {
  profileId?: string;
  nickname?: string;
  name?: string;
  organization?: string;
  category?: string;
  location?: string;
  relationship?: string;
  otherRelationship?: string;
}) {
  let query = supabase.from("profiles").select("*");

  if (filters.profileId) {
    query = query.eq("id", filters.profileId);
  }
  if (filters.nickname) {
    query = query.ilike("nickname", `%${filters.nickname}%`);
  }
  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }
  if (filters.organization) {
    query = query.ilike("organization", `%${filters.organization}%`);
  }
  if (filters.category) {
    query = query.ilike("category", `%${filters.category}%`);
  }
  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }
  if (filters.relationship && filters.relationship !== "other") {
    query = query.eq("relationship", filters.relationship);
  }
  if (filters.relationship === "other" && filters.otherRelationship) {
    query = query.ilike("otherRelationship", `%${filters.otherRelationship}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
    return { profiles: [], error };
  }

  return { profiles: data || [], error: null };
}