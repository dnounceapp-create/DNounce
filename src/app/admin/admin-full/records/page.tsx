"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Eye, History, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import RecordHistoryPanel from "./RecordHistoryPanel";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const STATUSES = ["ai_verification", "subject_notified", "published", "deletion_request", "debate", "voting", "decision"];
const CREDIBILITIES = ["Evidence-Based", "Opinion-Based", "Unclear", "Pending AI Review"];

const RECORD_EDIT_FIELDS = [
  { key: "id", label: "Record ID", readOnly: true },
  { key: "status", label: "Status", type: "select" as const, options: STATUSES },
  { key: "credibility", label: "Credibility", type: "select" as const, options: CREDIBILITIES },
  { key: "category", label: "Category", type: "text" as const },
  { key: "rating", label: "Rating (1-10)", type: "number" as const },
  { key: "description", label: "Description", type: "textarea" as const },
  { key: "location", label: "Location", type: "text" as const },
  { key: "organization", label: "Organization", type: "text" as const },
  { key: "relationship", label: "Relationship", type: "text" as const },
  { key: "contributor_identity_preference", label: "Show Contributor Identity", type: "boolean" as const },
  { key: "is_published", label: "Is Published", type: "boolean" as const },
  { key: "final_outcome", label: "Final Outcome", type: "select" as const, options: ["", "keep", "delete"] },
  { key: "created_at", label: "Created At", readOnly: true },
  { key: "published_at", label: "Published At", readOnly: true },
  { key: "ai_completed_at", label: "AI Completed At", readOnly: true },
  { key: "debate_started_at", label: "Debate Started At", readOnly: true },
  { key: "debate_ends_at", label: "Debate Ends At", readOnly: true },
  { key: "voting_started_at", label: "Voting Started At", readOnly: true },
  { key: "voting_ends_at", label: "Voting Ends At", readOnly: true },
  { key: "decision_started_at", label: "Decision Started At", readOnly: true },
  { key: "dispute_started_at", label: "Dispute Started At", readOnly: true },
];

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [credFilter, setCredFilter] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: role } = await supabase.from("admin_roles").select("level").eq("user_id", session.user.id).eq("is_active", true).maybeSingle();
      setAdminLevel(role?.level ?? 0);
      await load();
    }
    init();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("records")
      .select(`id, status, category, credibility, rating, description, location, organization, relationship, contributor_identity_preference, is_published, final_outcome, created_at, published_at, ai_completed_at, debate_started_at, debate_ends_at, voting_started_at, voting_ends_at, decision_started_at, dispute_started_at, contributor_id, subject:subjects(name, subject_uuid, owner_auth_user_id), contributor:contributors!records_contributor_id_fkey(id, user_id)`)
      .order("created_at", { ascending: false })
      .limit(500);
    setRecords((data as any[]) ?? []);
    setLoading(false);
  }

  async function saveRecord(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("records").update({
      status: updated.status, credibility: updated.credibility, category: updated.category,
      rating: updated.rating, description: updated.description, location: updated.location,
      organization: updated.organization, relationship: updated.relationship,
      contributor_identity_preference: updated.contributor_identity_preference,
      is_published: updated.is_published, final_outcome: updated.final_outcome || null,
    }).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "edit_record", target_type: "records", target_id: updated.id, new_value: updated,
    });
    showToast("success", "Record updated");
    await load();
  }

  async function deleteRecord(id: string) {
    if (!confirm("Permanently delete this record?")) return;
    setActionLoading(id);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) { showToast("error", error.message); setActionLoading(null); return; }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "delete_record", target_type: "records", target_id: id });
    showToast("success", "Record deleted");
    await load();
    setActionLoading(null);
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.id?.toLowerCase().includes(q) || (r.subject as any)?.name?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) || r.organization?.toLowerCase().includes(q) || r.relationship?.toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || r.status === statusFilter) && (credFilter === "all" || r.credibility === credFilter);
  });

  const csvData = filtered.map(r => ({
    id: r.id, subject_name: (r.subject as any)?.name ?? "", subject_uuid: (r.subject as any)?.subject_uuid ?? "",
    contributor_id: r.contributor_id ?? "", status: r.status, category: r.category ?? "",
    credibility: r.credibility ?? "", rating: r.rating ?? "", description: r.description ?? "",
    location: r.location ?? "", organization: r.organization ?? "", relationship: r.relationship ?? "",
    contributor_identity_preference: r.contributor_identity_preference ?? "", is_published: r.is_published ?? "",
    final_outcome: r.final_outcome ?? "", created_at: r.created_at ?? "", published_at: r.published_at ?? "",
    ai_completed_at: r.ai_completed_at ?? "", debate_started_at: r.debate_started_at ?? "",
    debate_ends_at: r.debate_ends_at ?? "", voting_started_at: r.voting_started_at ?? "",
    voting_ends_at: r.voting_ends_at ?? "", decision_started_at: r.decision_started_at ?? "",
    dispute_started_at: r.dispute_started_at ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Records</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} of {records.length} records</p>
        </div>
        <div className="flex gap-2">
          <CSVButton data={csvData} filename="dnounce-records" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, subject, category, description, location…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={credFilter} onChange={e => setCredFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All credibilities</option>
          {CREDIBILITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No records found.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950">
                  {["ID","Subject","Subject UUID","Contributor ID","Status","Credibility","Category","Rating","Location","Organization","Relationship","Show Identity","Published","Final Outcome","Created","Published At","AI Done","Debate Start","Debate End","Vote Start","Vote End","Decision Start","Dispute Start","Actions"].map(h => (
                    <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-3 py-2.5"><Cell val={r.id} mono /></td>
                    <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">{(r.subject as any)?.name ?? "—"}</td>
                    <td className="px-3 py-2.5"><Cell val={(r.subject as any)?.subject_uuid} mono dim /></td>
                    <td className="px-3 py-2.5"><Cell val={r.contributor_id} mono dim /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${r.status === "published" ? "bg-green-900 text-green-400" : r.status === "debate" ? "bg-orange-900 text-orange-400" : r.status === "voting" ? "bg-blue-900 text-blue-400" : r.status === "deletion_request" ? "bg-red-900 text-red-400" : r.status === "decision" ? "bg-purple-900 text-purple-400" : "bg-gray-800 text-gray-400"}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${r.credibility === "Evidence-Based" ? "bg-green-900 text-green-400" : r.credibility === "Opinion-Based" ? "bg-blue-900 text-blue-400" : r.credibility === "Unclear" ? "bg-yellow-900 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>{r.credibility || "Pending"}</span>
                    </td>
                    <td className="px-3 py-2.5"><Cell val={r.category} /></td>
                    <td className="px-3 py-2.5 text-center text-white">{r.rating ?? "—"}</td>
                    <td className="px-3 py-2.5"><Cell val={r.location} /></td>
                    <td className="px-3 py-2.5"><Cell val={r.organization} /></td>
                    <td className="px-3 py-2.5"><Cell val={r.relationship} /></td>
                    <td className="px-3 py-2.5 text-center"><span className={r.contributor_identity_preference ? "text-green-400" : "text-gray-500"}>{r.contributor_identity_preference ? "Yes" : "No"}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className={r.is_published ? "text-green-400" : "text-gray-500"}>{r.is_published ? "Yes" : "No"}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${r.final_outcome === "keep" ? "bg-green-900 text-green-400" : r.final_outcome === "delete" ? "bg-red-900 text-red-400" : "text-gray-500"}`}>{r.final_outcome || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.published_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.ai_completed_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.debate_started_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.debate_ends_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.voting_started_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.voting_ends_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.decision_started_at)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{fmtDate(r.dispute_started_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditRecord(r)} title="Edit" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setSelectedRecordId(r.id)} title="Full history" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-blue-400 transition"><History className="w-3.5 h-3.5" /></button>
                        <Link href={`/record/${r.id}`} target="_blank" title="View live" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition"><Eye className="w-3.5 h-3.5" /></Link>
                        {adminLevel >= 1 && <button onClick={() => deleteRecord(r.id)} disabled={actionLoading === r.id} title="Delete" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
      {editRecord && <EditModal title={`Edit Record — ${editRecord.id?.slice(0, 8)}…`} data={editRecord} fields={RECORD_EDIT_FIELDS} onSave={saveRecord} onClose={() => setEditRecord(null)} />}
      {selectedRecordId && <RecordHistoryPanel recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />}
    </div>
  );
}
