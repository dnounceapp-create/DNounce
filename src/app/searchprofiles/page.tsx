"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Define the type based on the actual Supabase response structure
type Subject = {
  id: string;
  name: string;
  organizations: Array<{ name: string }>;
  categories: Array<{ name: string }>;
  subject_relationships: Array<{ relationship_types: { value: string; label: string } }>;
  relationship_type_other: Array<{ custom_value: string }>;
  subject_states: Array<{ states: { state_abbreviation: string; full_state_name: string } }>;
  subject_locations: Array<{ locations: { name: string } }>;
};

// This component needs to be wrapped in Suspense
function SearchResultsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Subject[]>([]);
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
        const { searchSubjects } = await import("@/lib/searchSubjectsQuery");
        const { data, error } = await searchSubjects(filters);

        if (error) {
          console.error("Search error:", error);
        } else {
          // Transform the data to match our type
          const subjects = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            organizations: item.organizations || [],
            categories: item.categories || [],
            subject_relationships: item.subject_relationships || [],
            relationship_type_other: item.relationship_type_other || [],
            subject_states: item.subject_states || [],
            subject_locations: item.subject_locations || [],
          }));
          setResults(subjects);
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
        <p className="text-gray-500">No subjects found.</p>
      ) : (
        <div className="space-y-4">
          {results.map((subject) => (
            <div key={subject.id} className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold">{subject.name}</h2>
              <p className="text-sm text-gray-600">
                Categories: {subject.categories.map((c) => c.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Organizations: {subject.organizations.map((o) => o.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                States:{" "}
                {subject.subject_states.map((s) => s.states.state_abbreviation).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Locations: {subject.subject_locations.map((l) => l.locations.name).join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-600">
                Relationships:{" "}
                {subject.subject_relationships.map((r) => r.relationship_types.label).join(", ") ||
                  "—"}
              </p>
              {subject.relationship_type_other && subject.relationship_type_other.length > 0 && (
                <p className="text-sm text-gray-600">
                  Other Relationship:{" "}
                  {subject.relationship_type_other.map((o) => o.custom_value).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchSubjectsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading search parameters...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}