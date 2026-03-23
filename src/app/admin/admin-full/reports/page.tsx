"use client";
// ── REPORTS PAGE ──────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Flag, CheckCircle, X, Pencil } from "lucide-react";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const REPORT_EDIT_FIELDS = [
  { key: "id", label: "Report ID", readOnly: true },
  { key: "user_id", label: "User ID", readOnly: true },
  { key: "topic", label: "Topic", type: "text" as const },
  { key: "category", label: "Category", type: "text" as const },
  { key: "message", label: "Message", type: "textarea" as const },
  { key: "status", label: "Status", type: "select" as const, options: ["open", "in_progress", "closed"] },
  { key: "admin_note", label: "Internal Note", type: "textarea" as const },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [editReport, setEditReport] = useState<any | null>(null);
  const [adminLevel, setAdminLevel] = useState(0);
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
    const { data } = await supabase.from("support_tickets").select("id, user_id, topic, category, message, status, created_at, admin_note, resolved_at").eq("type", "report").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setReports(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function saveReport(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("support_tickets").update({ topic: updated.topic, category: updated.category, message: updated.message, status: updated.status, admin_note: updated.admin_note }).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_report", target_type: "support_tickets", target_id: updated.id });
    showToast("success", "Report updated"); await load();
  }

  async function closeReport(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "close_report", target_type: "support_tickets", target_id: id });
    showToast("success", "Report closed"); setSelected(null); await load();
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return !search || r.topic?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q) || r.user_name?.toLowerCase().includes(q) || r.id?.includes(q);
  });

  const csvData = filtered.map(r => ({ id: r.id, user_id: r.user_id, user_name: r.user_name, topic: r.topic, category: r.category, message: r.message, status: r.status, admin_note: r.admin_note ?? "", created_at: r.created_at, resolved_at: r.resolved_at ?? "" }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Reports</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} reports</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-reports" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic, message, user, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-[650px] overflow-y-auto">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950 sticky top-0">{["ID","User","Topic","Category","Status","Created","Actions"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelected(r)} className={`hover:bg-gray-800/40 transition cursor-pointer ${selected?.id === r.id ? "bg-gray-800/60" : ""}`}>
                    <td className="px-3 py-2.5"><Cell val={r.id} mono /></td>
                    <td className="px-3 py-2.5 text-white">{r.user_name}</td>
                    <td className="px-3 py-2.5"><Cell val={r.topic} /></td>
                    <td className="px-3 py-2.5"><Cell val={r.category} /></td>
                    <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded font-semibold ${r.status === "open" ? "bg-red-900 text-red-400" : "bg-gray-800 text-gray-400"}`}>{r.status}</span></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2.5"><button onClick={e => { e.stopPropagation(); setEditReport(r); }} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 justify-between"><div className="flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /><h3 className="text-white font-semibold text-sm">{selected.topic}</h3></div><button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="text-gray-400 text-xs">{selected.user_name} • {selected.category} • ID: {selected.id}</div>
            <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300 whitespace-pre-wrap">{selected.message}</div>
            {selected.admin_note && <div className="bg-gray-800 rounded-xl p-3"><div className="text-gray-500 text-xs mb-1">Internal note</div><div className="text-sm text-gray-300">{selected.admin_note}</div></div>}
            {selected.status !== "closed" && <button onClick={() => closeReport(selected.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium"><CheckCircle className="w-4 h-4" /> Mark Resolved</button>}
            {selected.resolved_at && <div className="text-gray-500 text-xs">Resolved {fmtDate(selected.resolved_at)}</div>}
          </div>
        ) : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">Select a report</div>}
      </div>
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
      {editReport && <EditModal title={`Edit Report — ${editReport.id?.slice(0,8)}…`} data={editReport} fields={REPORT_EDIT_FIELDS} onSave={saveReport} onClose={() => setEditReport(null)} />}
    </div>
  );
}
