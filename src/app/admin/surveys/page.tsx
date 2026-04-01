"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight, Star } from "lucide-react";
import { CSVButton, SidePanel, DetailRow, DetailSection, CopyID, fmtDate } from "../adminUtils";

function StarDisplay({ rating }: { rating: number }) {
  if (!rating) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3 h-3 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
      ))}
      <span className="text-gray-400 text-xs ml-1">{rating}/5</span>
    </span>
  );
}

export default function AdminSurveysPage() {
  const [responses, setResponses] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState<"responses" | "completions">("responses");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);

    const [responsesRes, completionsRes] = await Promise.all([
      supabase.from("survey_responses").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("survey_completions").select("*").order("completed_at", { ascending: false }).limit(1000),
    ]);

    const responseRows = (responsesRes.data as any[]) ?? [];
    const completionRows = (completionsRes.data as any[]) ?? [];

    // Enrich with user details
    const userIds = [...new Set([
      ...responseRows.map(r => r.user_id),
      ...completionRows.map(c => c.user_id),
    ].filter(Boolean))];

    const { data: accts } = userIds.length
      ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds)
      : { data: [] };

    const acctMap: Record<string, any> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });

    setResponses(responseRows.map(r => ({
      ...r,
      user_name: `${acctMap[r.user_id]?.first_name ?? ""} ${acctMap[r.user_id]?.last_name ?? ""}`.trim() || "Anonymous",
      user_email: acctMap[r.user_id]?.email ?? "—",
    })));

    setCompletions(completionRows.map(c => ({
      ...c,
      user_name: `${acctMap[c.user_id]?.first_name ?? ""} ${acctMap[c.user_id]?.last_name ?? ""}`.trim() || "—",
      user_email: acctMap[c.user_id]?.email ?? "—",
    })));

    setLoading(false);
  }

  const filteredResponses = responses.filter(r => {
    const q = search.toLowerCase();
    const m = !search || r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q) || r.id?.includes(q);
    return m && (typeFilter === "all" || r.survey_type === typeFilter);
  });

  const filteredCompletions = completions.filter(c => {
    const q = search.toLowerCase();
    const m = !search || c.user_name?.toLowerCase().includes(q) || c.user_email?.toLowerCase().includes(q) || c.user_id?.includes(q);
    return m && (typeFilter === "all" || c.survey_type === typeFilter);
  });

  // Stats
  const postSubmissionResponses = responses.filter(r => r.survey_type === "post_submission");
  const postLifecycleResponses = responses.filter(r => r.survey_type === "post_lifecycle");
  const emailOptIns = responses.filter(r => r.email_consent && r.email);

  function avgRating(arr: any[], key: string) {
    const vals = arr.map(r => r.responses?.[key]).filter(v => v > 0);
    if (!vals.length) return "—";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  const csvResponses = filteredResponses.map(r => ({
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_email: r.user_email,
    survey_type: r.survey_type,
    record_id: r.record_id ?? "",
    email_consent: r.email_consent,
    email: r.email ?? "",
    responses: JSON.stringify(r.responses),
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Surveys</h1>
          <p className="text-gray-400 text-sm mt-1">{responses.length} responses • {emailOptIns.length} email opt-ins</p>
        </div>
        <div className="flex gap-2">
          <CSVButton data={csvResponses} filename="dnounce-survey-responses" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Post-Submission</div>
          <div className="text-white text-2xl font-bold">{postSubmissionResponses.length}</div>
          <div className="text-gray-500 text-[11px] mt-0.5">Avg Q1: {avgRating(postSubmissionResponses, "q1_rating")} ⭐</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Post-Lifecycle</div>
          <div className="text-white text-2xl font-bold">{postLifecycleResponses.length}</div>
          <div className="text-gray-500 text-[11px] mt-0.5">Avg fairness: {avgRating(postLifecycleResponses, "q1_rating")} ⭐</div>
        </div>
        <div className="bg-gray-900 border border-blue-900 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Email Opt-Ins</div>
          <div className="text-white text-2xl font-bold">{emailOptIns.length}</div>
          <div className="text-gray-500 text-[11px] mt-0.5">Mailing list signups</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Completions Tracked</div>
          <div className="text-white text-2xl font-bold">{completions.length}</div>
          <div className="text-gray-500 text-[11px] mt-0.5">Unique users surveyed</div>
        </div>
      </div>

      {/* Tab + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button onClick={() => setTab("responses")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === "responses" ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"}`}>Responses ({responses.length})</button>
          <button onClick={() => setTab("completions")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === "completions" ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"}`}>Completions ({completions.length})</button>
        </div>
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All types</option>
          <option value="post_submission">Post Submission</option>
          <option value="post_lifecycle">Post Lifecycle</option>
        </select>
      </div>

      {/* Responses table */}
      {tab === "responses" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : filteredResponses.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No responses found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID", "User", "Email", "Type", "Q1 Rating", "Q2 Rating", "Q3 Rating", "Q4 Rating", "Email Opt-In", "Submitted", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredResponses.map(r => (
                    <tr key={r.id} onClick={() => setSelected(r)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === r.id ? "bg-gray-800/70" : ""}`}>
                      <td className="px-4 py-3"><CopyID id={r.id} /></td>
                      <td className="px-4 py-3 text-white font-medium">{r.user_name}</td>
                      <td className="px-4 py-3 text-gray-400">{r.user_email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${r.survey_type === "post_submission" ? "bg-blue-900 text-blue-300 border-blue-700" : "bg-purple-900 text-purple-300 border-purple-700"}`}>
                          {r.survey_type === "post_submission" ? "Post Submission" : "Post Lifecycle"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StarDisplay rating={r.responses?.q1_rating} /></td>
                      <td className="px-4 py-3"><StarDisplay rating={r.responses?.q2_rating} /></td>
                      <td className="px-4 py-3"><StarDisplay rating={r.responses?.q3_rating} /></td>
                      <td className="px-4 py-3"><StarDisplay rating={r.responses?.q4_rating} /></td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${r.email_consent ? "bg-green-900 text-green-300 border-green-700" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                          {r.email_consent ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Completions table */}
      {tab === "completions" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : filteredCompletions.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No completions found.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID", "User", "Email", "Survey Type", "Completed At"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredCompletions.map(c => (
                    <tr key={c.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-4 py-3"><CopyID id={c.id} /></td>
                      <td className="px-4 py-3 text-white font-medium">{c.user_name}</td>
                      <td className="px-4 py-3 text-gray-400">{c.user_email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.survey_type === "post_submission" ? "bg-blue-900 text-blue-300 border-blue-700" : "bg-purple-900 text-purple-300 border-purple-700"}`}>
                          {c.survey_type === "post_submission" ? "Post Submission" : "Post Lifecycle"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(c.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Side panel for response detail */}
      {selected && tab === "responses" && (
        <SidePanel
          title={`Survey — ${selected.survey_type === "post_submission" ? "Post Submission" : "Post Lifecycle"}`}
          subtitle={`From ${selected.user_name} (${selected.user_email})`}
          onClose={() => setSelected(null)}
        >
          <DetailSection title="Respondent">
            <DetailRow label="Response ID" value={selected.id} mono copyable />
            <DetailRow label="User ID" value={selected.user_id} mono copyable />
            <DetailRow label="Name" value={selected.user_name} />
            <DetailRow label="Email" value={selected.user_email} copyable />
            <DetailRow label="Submitted" value={fmtDate(selected.created_at)} />
            {selected.record_id && <DetailRow label="Linked Record" value={selected.record_id} mono copyable />}
          </DetailSection>

          {selected.survey_type === "post_submission" && (
            <DetailSection title="Post-Submission Answers">
              <div className="py-2 space-y-3">
                <div>
                  <div className="text-gray-500 text-xs mb-1">How was the submission experience?</div>
                  <StarDisplay rating={selected.responses?.q1_rating} />
                  {selected.responses?.q1_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q1_text}"</div>}
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">How easy was it to describe your experience?</div>
                  <StarDisplay rating={selected.responses?.q2_rating} />
                  {selected.responses?.q2_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q2_text}"</div>}
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Did the form give you enough room to tell your story?</div>
                  <StarDisplay rating={selected.responses?.q3_rating} />
                  {selected.responses?.q3_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q3_text}"</div>}
                </div>
                {selected.responses?.q4_text && (
                  <div>
                    <div className="text-gray-500 text-xs mb-1">What are we missing?</div>
                    <div className="text-gray-300 text-xs bg-gray-800 rounded-xl p-3 leading-relaxed">{selected.responses.q4_text}</div>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {selected.survey_type === "post_lifecycle" && (
            <DetailSection title="Post-Lifecycle Answers">
              <div className="py-2 space-y-3">
                <div>
                  <div className="text-gray-500 text-xs mb-1">How fair was the process?</div>
                  <StarDisplay rating={selected.responses?.q1_rating} />
                  {selected.responses?.q1_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q1_text}"</div>}
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">How clear were the instructions?</div>
                  <StarDisplay rating={selected.responses?.q2_rating} />
                  {selected.responses?.q2_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q2_text}"</div>}
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Would you recommend DNounce?</div>
                  <StarDisplay rating={selected.responses?.q3_rating} />
                  {selected.responses?.q3_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q3_text}"</div>}
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Do you think DNounce is a good idea?</div>
                  <StarDisplay rating={selected.responses?.q4_rating} />
                  {selected.responses?.q4_text && <div className="text-gray-300 text-xs mt-1 italic">"{selected.responses.q4_text}"</div>}
                </div>
                {selected.responses?.missing_text && (
                  <div>
                    <div className="text-gray-500 text-xs mb-1">What are we missing?</div>
                    <div className="text-gray-300 text-xs bg-gray-800 rounded-xl p-3 leading-relaxed">{selected.responses.missing_text}</div>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          <DetailSection title="Email Opt-In">
            <DetailRow label="Consented" value={selected.email_consent} highlight={selected.email_consent ? "green" : undefined} />
            {selected.email_consent && <DetailRow label="Email Provided" value={selected.email} copyable />}
          </DetailSection>
        </SidePanel>
      )}
    </div>
  );
}
