"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function HashtagPage() {
  const { tag } = useParams();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const res = await fetch(`/api/hashtags?hashtag=${encodeURIComponent(tag as string)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch records");
        }
        const data = await res.json();
        setRecords(data.records || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (tag) {
      fetchRecords();
    }
  }, [tag]);

  if (loading) return <p className="p-4 text-gray-500">Loading records...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">#{tag}</h1>
      {records.length === 0 ? (
        <p className="text-gray-600">No records found for #{tag}</p>
      ) : (
        <ul className="space-y-4">
          {records.map((record, idx) => (
            <li
              key={idx}
              className="p-4 border rounded-lg shadow-sm bg-white"
            >
              <p className="font-medium">{record.title || "Untitled Record"}</p>
              <p className="text-sm text-gray-600">
                {record.description || "No description"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}