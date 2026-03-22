"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw } from "lucide-react";

type AuditRow = {
  id: string; admin_user_id: string; admin_level: number;
  action: string; target_type: string; target_id: string;
  old_value: any; new_value: any; note: string | null;
  created_at: string; admin_name?: string;
};

const ACTION_COLORS: Record<string, string> = {
  delete_record: "text-red-400",
  permanent_ban: "text-red-400",
  temporary_ban: "text-orange-400",
  unban_user: "text-green-400",
  assign_admin: "text-blue-400",
  revoke_admin: "text-yellow-400",
  close_ticket: "text-green-400",
  close_report: "text-green-400",
  award_badge: "text-teal-400",
  revoke_badge: "text-orange-400",
  change_record_status: "text-blue-400",
  override_credibility: "text-purple-400",
  respond_ticket: "text-blue-400",
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("admin_audit_log").select("id, admin_user_id, admin_level, action, target_type, target_id, old_value, new_value, note, created_at").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const adminIds = [...new Set(rows.map(r => r.admin_user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", adminIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; });
    setLogs(rows.map(r => ({ ...r, admin_name: acctMap[r.admin_user_id] ?? "Admin" })));
    setLoading(false);
  }

  const actions = ["all", ...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.action.includes(search.toLowerCase()) || l.admin_name?.toLowerCase().includes(search.toLowerCase()) || l.target_id?.includes(search);
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const LEVEL_LABELS: Record<number, string> = { 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-2xl font-bold">Audit Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} entries</p></div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by admin, action, or target ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-[700px] overflow-y-auto">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No audit entries.</div> : (
            <div className="divide-y divide-gray-800">
              {filtered.map(l => (
                <button key={l.id} onClick={() => setSelected(l)} className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${selected?.id === l.id ? "bg-gray-800" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm font-medium font-mono ${ACTION_COLORS[l.action] ?? "text-gray-300"}`}>{l.action}</span>
                    <span className="text-[11px] text-gray-500">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-500 text-xs">{l.admin_name} • {LEVEL_LABELS[l.admin_level] ?? "Admin"} • {l.target_type}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h3 className={`text-lg font-bold font-mono ${ACTION_COLORS[selected.action] ?? "text-white"}`}>{selected.action}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-gray-500 text-xs mb-1">Admin</div><div className="text-white">{selected.admin_name}</div></div>
              <div><div className="text-gray-500 text-xs mb-1">Level</div><div className="text-white">{LEVEL_LABELS[selected.admin_level]}</div></div>
              <div><div className="text-gray-500 text-xs mb-1">Target type</div><div className="text-white">{selected.target_type}</div></div>
              <div><div className="text-gray-500 text-xs mb-1">Target ID</div><div className="text-white font-mono text-xs break-all">{selected.target_id}</div></div>
              <div className="col-span-2"><div className="text-gray-500 text-xs mb-1">Timestamp</div><div className="text-white text-xs">{new Date(selected.created_at).toLocaleString()}</div></div>
            </div>
            {selected.old_value && <div><div className="text-gray-500 text-xs mb-1">Before</div><pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-auto">{JSON.stringify(selected.old_value, null, 2)}</pre></div>}
            {selected.new_value && <div><div className="text-gray-500 text-xs mb-1">After</div><pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-auto">{JSON.stringify(selected.new_value, null, 2)}</pre></div>}
            {selected.note && <div><div className="text-gray-500 text-xs mb-1">Note</div><div className="text-gray-300 text-sm">{selected.note}</div></div>}
          </div>
        ) : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">Select an entry to view details</div>}
      </div>
    </div>
  );
}
