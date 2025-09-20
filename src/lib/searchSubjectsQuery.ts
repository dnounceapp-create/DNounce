import { supabase } from "./supabaseClient";

type Filters = {
  profileId?: string;
  nickname?: string;
  name?: string;
  organization?: string;
  category?: string;
  location?: string;
  relationship?: string;
  otherRelationship?: string;
};

export async function searchSubjects(filters: Filters) {
  try {
    let query = supabase.from("subjects").select("*");

    // Apply filters only if provided
    if (filters.profileId) {
      query = query.eq("id", filters.profileId);
    }

    if (filters.nickname) {
      query = query.ilike("nickname", `%${filters.nickname}%`);
    } else if (filters.name) {
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
      query = query.ilike("relationship", `%${filters.relationship}%`);
    }

    if (filters.otherRelationship && filters.relationship === "other") {
      query = query.ilike("relationship", `%${filters.otherRelationship}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase query error:", error.message);
      return []; // Fallback to empty results
    }

    return data || [];
  } catch (err) {
    console.error("❌ searchSubjects crashed:", err);
    return []; // Always return an array, never throw
  }
}