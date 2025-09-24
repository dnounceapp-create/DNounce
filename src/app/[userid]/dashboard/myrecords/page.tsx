"use client";

import { useEffect, useState } from "react";

export default function MyRecordsPage({ params }: { params: { userid: string } }) {
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/records/myrecords"); // ✅ matches API
      const data = await res.json();
      setStats(data.stats);
      setRecords(data.items);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Records</h1>

      {/* Stats */}
      {stats && (
        <div className="flex gap-6 mb-6">
          <div className="bg-gray-100 rounded p-4">Total: {stats.total}</div>
          <div className="bg-gray-100 rounded p-4">Kept: {stats.kept}</div>
          <div className="bg-gray-100 rounded p-4">Deleted: {stats.deleted}</div>
        </div>
      )}

      {/* Records */}
      <div className="space-y-4">
        {records.map((r) => (
          <div key={r.id} className="border rounded p-4">
            <p className="font-semibold">
              {r.contributor_alias} → {r.subject_name}
            </p>
            <p>Type: {r.record_type}</p>
            <p>Status: {r.stage || r.outcome}</p>
            <p>Submitted: {new Date(r.submitted_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}