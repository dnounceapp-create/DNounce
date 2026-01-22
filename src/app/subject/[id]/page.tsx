"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { User, Copy, Check, LogIn, PlusCircle, FilePlus } from "lucide-react";

// helper
function normalizeCred(raw: any) {
  const s = (raw || "").toString().toLowerCase();
  if (s.includes("evidence")) return "Evidence-Based";
  if (s.includes("opinion")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending";
}

export default function SubjectProfilePage() {
  const params = useParams<{ id: string }>();
  const subjectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [subject, setSubject] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"records" | "reputations" | "social">("records");
  const [copiedId, setCopiedId] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  useEffect(() => {
    if (!subjectId) return;
  
    (async () => {
      const { data } = await supabase.auth.getSession();
      const authed = !!data.session;
  
      if (authed && action === "submit-record") {
        router.replace(`/dashboard/submit?subject_id=${subjectId}`);
      }      
    })();
  }, [subjectId, action, router]);  

  useEffect(() => {
    if (!subjectId) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Subject (safe fields only)
        const { data: subj, error: subjErr } = await supabase
          .from("subjects")
          .select("subject_uuid,name,nickname,organization,location,avatar_url")
          .eq("subject_uuid", subjectId)
          .maybeSingle();

        if (subjErr) throw subjErr;
        if (!subj) {
          setErr("Subject not found.");
          setSubject(null);
          setRecords([]);
          return;
        }

        // 2) Published records about this subject (public-safe list)
        const { data: recs, error: recErr } = await supabase
          .from("records")
          .select(`
            id,
            created_at,
            description,
            credibility,
            ai_vendor_1_result,
            is_published
          `)          
          .eq("subject_id", subjectId)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(25);

        if (recErr) throw recErr;

        setSubject(subj);
        setRecords(recs || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load subject profile");
        setSubject(null);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId]);

  const breakdown = useMemo(() => {
    const total = records.length;
    const evidence = records.filter(r => normalizeCred(r.credibility) === "Evidence-Based").length;
    const opinion = records.filter(r => normalizeCred(r.credibility) === "Opinion-Based").length;
    return { total, evidence, opinion };
  }, [records]);

  if (loading) return <div className="p-8">Loading…</div>;

  if (err || !subject) {
    return (
      <div className="p-8 text-center">
        <div className="font-semibold">{err || "Not available"}</div>
        <Link className="text-blue-600 hover:underline" href="/">Go Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="border rounded-2xl bg-white p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto md:mx-0 overflow-hidden">
                {subject.avatar_url ? (
                    <img src={subject.avatar_url} alt="Subject avatar" className="w-full h-full object-cover" />
                ) : (
                    <User className="h-8 w-8 text-gray-600" />
                )}
            </div>  

            {/* Header + Scores */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-gray-900">
                {subject.name}{subject.nickname ? ` (${subject.nickname})` : ""}
                </h3>
                <p className="text-sm text-gray-600">{subject.organization || "Independent"}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                <span>📍</span> {subject.location || "Unknown"}
                </p>

                {/* Subject ID + Copy */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Subject ID:</span>
                <span className="font-mono">{subject.subject_uuid}</span>

                <button
                    type="button"
                    onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(subject.subject_uuid);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 1200);
                    } catch (e) {
                        console.error("Copy failed", e);
                    }
                    }}
                    className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                    title="Copy subject ID"
                >
                    {copiedId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>

                {copiedId && (
                    <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Copied!
                    </span>
                )}
                </div>
            </div>

            {/* Scores (placeholder for now; wire to real fields later) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Subject Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Overall User Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Contributor Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Voter Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Citizen Score</p>
                </div>
            </div>
            </div>

            {/* Submit Record CTA */}
            <div className="mt-6 mb-4 rounded-2xl border bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <div className="text-sm font-semibold text-gray-900">
                Want to share an experience about this subject?
                </div>
                <div className="text-xs text-gray-600 mt-1">
                Sign in to submit a record. This subject will be pre-selected.
                </div>
            </div>

            <button
                type="button"
                onClick={async () => {
                    const { data } = await supabase.auth.getSession();
                    const authed = !!data.session;
                  
                    const dashboardSubmitUrl = `/dashboard/submit?subject_id=${subjectId}`;
                  
                    if (!authed) {
                      router.push(
                        `/loginsignup?redirectTo=${encodeURIComponent(dashboardSubmitUrl)}`
                      );
                      return;
                    }
                  
                    router.push(dashboardSubmitUrl);
                  }}                  
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
                <FilePlus className="h-4 w-4" />
                Submit A Record
            </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b mb-6 mt-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab("records")}
                className={`flex-1 text-center px-4 py-2 ${
                  activeTab === "records"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Records About Me
              </button>
              <button
                onClick={() => setActiveTab("reputations")}
                className={`flex-1 text-center px-4 py-2 ${
                  activeTab === "reputations"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Reputations & Badges
              </button>
              <button
                onClick={() => setActiveTab("social")}
                className={`flex-1 text-center px-4 py-2 ${
                    activeTab === "social"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Social Media
                </button>
            </div>

            {activeTab === "records" && (
              <>
                {/* Breakdown */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Record Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.total}</div>
                      <div className="text-sm text-gray-500">Total Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.evidence}</div>
                      <div className="text-sm text-gray-500">Evidence-Based</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.opinion}</div>
                      <div className="text-sm text-gray-500">Opinion-Based</div>
                    </div>
                  </div>
                </div>

                {/* Records list (public → link to public record page) */}
                <div className="space-y-4">
                  {records.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                📅 {new Date(r.created_at).toLocaleDateString()}
                            </div>
                  
                            {/* AI credibility recommendation */}
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] text-gray-500 mb-1">
                                AI Credibility Check recommends:
                                </span>
                        
                                {(() => {
                                const label = normalizeCred(r.ai_vendor_1_result ?? r.credibility);
                        
                                const badgeClass =
                                    label === "Evidence-Based"
                                    ? "bg-green-100 text-green-800"
                                    : label === "Opinion-Based"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : label === "Unclear"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-800";
                        
                                return (
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                                    {label.toUpperCase()}
                                    </span>
                                );
                                })()}
                            </div>
                        </div>
                  
                    <div className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-wrap">
                      {r.description}
                    </div>
                  
                    <Link
                      href={`/record/${r.id}`}
                      className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                    >
                      View Record →
                    </Link>
                  </div>
                  
                  ))}

                  {records.length === 0 && (
                    <div className="text-sm text-gray-500">No published records yet.</div>
                  )}
                </div>
              </>
            )}

            {activeTab === "reputations" && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Reputations</h4>
                <p className="text-gray-500 text-sm">No reputations found.</p>

                <h4 className="font-medium text-gray-900 mb-3 mt-6">Badges</h4>
                <p className="text-gray-500 text-sm">No badges found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
