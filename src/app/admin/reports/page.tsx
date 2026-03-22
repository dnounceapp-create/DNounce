// src/app/admin/reports/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Flag, CheckCircle } from "lucide-react";

type Report = {
  id: string; user_id: string; topic: string; category: string;
  message: string; status: string; created_at: string; user_name?: string;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
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
    const { data } = await supabase.from("support_tickets").select("id, user_id, topic, category, message, status, created_at").eq("type", "report").order("created_at", { ascending: false }).limit(200);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setReports(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function closeReport(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "close_report", target_type: "support_tickets", target_id: id });
    setToast({ type: "success", msg: "Report closed" });
    setTimeout(() => setToast(null), 3000);
    setSelected(null);
    await load();
  }

  const filtered = reports.filter(r => !search || r.topic?.toLowerCase().includes(search.toLowerCase()) || r.user_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-2xl font-bold">Reports</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} reports</p></div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No reports.</div> : (
            <div className="divide-y divide-gray-800">
              {filtered.map(r => (
                <button key={r.id} onClick={() => setSelected(r)} className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${selected?.id === r.id ? "bg-gray-800" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate">{r.topic}</span>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-red-900 text-red-400" : "bg-gray-800 text-gray-400"}`}>{r.status}</span>
                  </div>
                  <div className="text-gray-500 text-xs">{r.user_name} • {new Date(r.created_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /><h3 className="text-white font-semibold">{selected.topic}</h3></div>
            <div className="text-gray-400 text-xs">{selected.user_name} • {selected.category} • {new Date(selected.created_at).toLocaleString()}</div>
            <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300 whitespace-pre-wrap">{selected.message}</div>
            {selected.status !== "closed" && (
              <button onClick={() => closeReport(selected.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 text-sm font-medium transition">
                <CheckCircle className="w-4 h-4" /> Mark Resolved
              </button>
            )}
          </div>
        ) : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">Select a report</div>}
      </div>
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
