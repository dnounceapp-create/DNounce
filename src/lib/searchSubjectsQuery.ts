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
  let query = supabase.from("subjects").select(`
    id,
    name,
    nickname,
    organizations,
    categories,
    subject_relationships,
    relationship_type_other,
    subject_states,
    subject_locations
  `);

  if (filters.profileId) {
    query = query.eq("id", filters.profileId);
  }
  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }
  if (filters.nickname) {
    query = query.ilike("nickname", `%${filters.nickname}%`);
  }
  if (filters.organization) {
    query = query.contains("organizations", [filters.organization]);
  }
  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }
  if (filters.location) {
    query = query.contains("subject_locations", [filters.location]);
  }
  if (filters.relationship) {
    query = query.contains("subject_relationships", [filters.relationship]);
  }
  if (filters.otherRelationship) {
    query = query.ilike("relationship_type_other", `%${filters.otherRelationship}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Database error:", error.message);
    return []; // always return array to avoid type errors
  }

  return data || [];
}