"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Define the type based on the actual Supabase response structure
type Defendant = {
  id: string;
  name: string;
  organizations: Array<{ name: string }>;
  categories: Array<{ name: string }>;
  defendant_relationships: Array<{ relationship_types: { value: string; label: string } }>;
  relationship_type_other: Array<{ custom_value: string }>;
  defendant_states: Array<{ states: { state_abbreviation: string; full_state_name: string } }>;
  defendant_locations: Array<{ locations: { name: string } }>;
};

// This component needs to be wrapped in Suspense
function SearchResultsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Defendant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);

      const filters = {
        name: searchParams.get("name") || undefined,
        organization: searchParams.get("organization") || undefined,
        category: searchParams.get("category") || undefined,
        location: searchParams.get("location") || undefined,
        state: searchParams.get("state") || undefined,
        relationship: searchParams.get("relationship") || undefined,
        otherRelationship: searchParams.get("otherRelationship") || undefined,
      };

      try {
        // Import dynamically to avoid SSR issues
        const { searchDefendantsQuery } = await import("@/lib/searchDefendantsQuery");
        const { data, error } = await searchDefendantsQuery(filters);

        if (error) {
          console.error("Search error:", error);
        } else {
          // Transform the data to match our type
          const defendants = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            organizations: item.organizations || [],
            categories: item.categories || [],
            defendant_relationships: item.defendant_relationships || [],
            relationship_type_other: item.relationship_type_other || [],
            defendant_states: item.defendant_states || [],
            defendant_locations: item.defendant_locations || [],
          }));
          setResults(defendants);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [searchParams]);

  if (loading) return <p className="p-6">Loading search results...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Search Results</h1>
      {results.length === 0 ? (
        <p className="text-gray-500">No defendants found.</p>
      ) : (
        <div className="space-y-4">
          {results.map((def) => (
            <div key={def.id} className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold">{def.name}</h2>
              <p className="text-sm text-gray-600">
                Categories: {def.categories.map((c) => c.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Organizations: {def.organizations.map((o) => o.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                States:{" "}
                {def.defendant_states.map((s) => s.states.state_abbreviation).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Locations: {def.defendant_locations.map((l) => l.locations.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Relationships:{" "}
                {def.defendant_relationships.map((r) => r.relationship_types.label).join(", ") ||
                  "—"}
              </p>
              {def.relationship_type_other && def.relationship_type_other.length > 0 && (
                <p className="text-sm text-gray-600">
                  Other Relationship:{" "}
                  {def.relationship_type_other.map((o) => o.custom_value).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchDefendantsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading search parameters...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}