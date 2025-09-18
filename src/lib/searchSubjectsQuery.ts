"use client";

import { supabase } from "@/lib/supabaseClient";

export async function searchSubjectsQuery(filters: {
  name?: string;
  organization?: string;
  category?: string;
  location?: string;
  state?: string;
  relationship?: string;
  otherRelationship?: string;
}) {
  let query = supabase.from("subjects").select(
    `
    id,
    name,
    organizations ( name ),
    categories ( name ),
    subject_relationships (
      relationship_types ( value, label )
    ),
    relationship_type_other ( custom_value ),
    subject_states (
      states ( state_abbreviation, full_state_name )
    ),
    subject_locations (
      locations ( name )
    ),
    reputations ( id, title, description ),
    badges ( id, label, color, icon )
    `
  );

  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }

  if (filters.organization) {
    query = query.ilike("organizations.name", `%${filters.organization}%`);
  }

  if (filters.category) {
    query = query.ilike("categories.name", `%${filters.category}%`);
  }

  if (filters.location) {
    query = query.ilike("subject_locations.locations.name", `%${filters.location}%`);
  }

  if (filters.state) {
    query = query.eq("subject_states.states.state_abbreviation", filters.state);
  }

  if (filters.relationship && filters.relationship !== "all") {
    query = query.eq("subject_relationships.relationship_types.value", filters.relationship);
  }

  if (filters.otherRelationship) {
    query = query.ilike("relationship_type_other.custom_value", `%${filters.otherRelationship}%`);
  }

  return query;
}