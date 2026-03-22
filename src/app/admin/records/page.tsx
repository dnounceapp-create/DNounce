"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, Trash2, RefreshCw, Eye, History } from "lucide-react";
import Link from "next/link";
import RecordHistoryPanel from "./RecordHistoryPanel";

const STATUSES = ["all", "ai_verification", "subject_notified", "published", "deletion_request", "debate", "voting", "decision"];
const CREDIBILITIES = ["all", "Evidence-Based", "Opinion-Based", "Unclear", "Pending AI Review"];

type Record_ = {
  id: string;
  status: string;
  category: string;
  credibility: string;
  created_at: string;
  subject: { name: string; subject_uuid: string } | null;
  contributor: { user_id: string } | null;
};

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [credFilter, setCredFilter] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
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
      .select("id, status, category, credibility, created_at, subject:subjects(name, subject_uuid), contributor:contributors!records_contributor_id_fkey(user_id)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRecords((data as any[]) ?? []);
    setLoading(false);
  }

  async function changeStatus(id: string, newStatus: string) {
    setActionLoading(id);
    const { data: { session } } = await supabase.auth.getSession();
    const old = records.find(r => r.id === id);
    const { error } = await supabase.from("records").update({ status: newStatus }).eq("id", id);
    if (error) { showToast("error", error.message); setActionLoading(null); return; }
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "change_record_status", target_type: "records", target_id: id,
      old_value: { status: old?.status }, new_value: { status: newStatus },
    });
    showToast("success", `Status changed to ${newStatus}`);
    await load();
    setActionLoading(null);
  }

  async function deleteRecord(id: string) {
    if (!confirm("Permanently delete this record? This cannot be undone.")) return;
    setActionLoading(id);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) { showToast("error", error.message); setActionLoading(null); return; }
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "delete_record", target_type: "records", target_id: id,
    });
    showToast("success", "Record deleted");
    await load();
    setActionLoading(null);
  }

  async function overrideCredibility(id: string, cred: string) {
    setActionLoading(id);
    const { data: { session } } = await supabase.auth.getSession();
    const old = records.find(r => r.id === id);
    const { error } = await supabase.from("records").update({ credibility: cred }).eq("id", id);
    if (error) { showToast("error", error.message); setActionLoading(null); return; }
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "override_credibility", target_type: "records", target_id: id,
      old_value: { credibility: old?.credibility }, new_value: { credibility: cred },
    });
    showToast("success", `Credibility set to ${cred}`);
    await load();
    setActionLoading(null);
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = records.filter(r => {
    const matchSearch = !search || (r.subject as any)?.name?.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search) || r.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchCred = credFilter === "all" || r.credibility === credFilter;
    return matchSearch && matchStatus && matchCred;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Records</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} records</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject, ID, category…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={credFilter} onChange={e => setCredFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          {CREDIBILITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading records…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {["Subject", "Category", "Credibility", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{(r.subject as any)?.name ?? "—"}</div>
                      <div className="text-gray-500 text-[11px] font-mono">{r.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{r.category || "—"}</td>
                    <td className="px-4 py-3">
                      {adminLevel >= 2 ? (
                        <select value={r.credibility || ""} onChange={e => overrideCredibility(r.id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white outline-none">
                          {CREDIBILITIES.filter(c => c !== "all").map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <span className="text-gray-300 text-xs">{r.credibility || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select value={r.status} onChange={e => changeStatus(r.id, e.target.value)}
                        disabled={actionLoading === r.id}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white outline-none disabled:opacity-50">
                        {STATUSES.filter(s => s !== "all").map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedRecordId(r.id)}
                          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-blue-400 transition" title="Full history">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/record/${r.id}`} target="_blank"
                          className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition" title="View record">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {adminLevel >= 1 && (
                          <button onClick={() => deleteRecord(r.id)} disabled={actionLoading === r.id}
                            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition disabled:opacity-50" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>
          {toast.msg}
        </div>
      )}

      {selectedRecordId && (
        <RecordHistoryPanel recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
      )}
    </div>
  );
}
