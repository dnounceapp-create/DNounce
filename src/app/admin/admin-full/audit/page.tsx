"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw } from "lucide-react";
import { CSVButton, fmtDate, Cell } from "../adminUtils";

const ACTION_COLORS: Record<string, string> = {
  delete_record: "text-red-400", permanent_ban: "text-red-400", temporary_ban: "text-orange-400",
  unban_user: "text-green-400", assign_admin: "text-blue-400", revoke_admin: "text-yellow-400",
  close_ticket: "text-green-400", close_report: "text-green-400", award_badge: "text-teal-400",
  revoke_badge: "text-orange-400", change_record_status: "text-blue-400", override_credibility: "text-purple-400",
  respond_ticket: "text-blue-400", edit_record: "text-yellow-400", edit_user: "text-yellow-400",
  edit_ticket: "text-yellow-400", edit_report: "text-yellow-400", edit_notification: "text-yellow-400",
  edit_badge: "text-yellow-400", delete_notification: "text-red-400",
};

const LEVEL_LABELS: Record<number, string> = { 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("admin_audit_log").select("id, admin_user_id, admin_level, action, target_type, target_id, old_value, new_value, note, created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const adminIds = [...new Set(rows.map(r => r.admin_user_id).filter(Boolean))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", adminIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; });
    setLogs(rows.map(r => ({ ...r, admin_name: acctMap[r.admin_user_id] ?? "Admin" })));
    setLoading(false);
  }

  const actions = ["all", ...new Set(logs.map(l => l.action))];
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search || l.action?.includes(q) || l.admin_name?.toLowerCase().includes(q) || l.target_id?.includes(q) || l.target_type?.includes(q);
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchLevel = levelFilter === "all" || String(l.admin_level) === levelFilter;
    return matchSearch && matchAction && matchLevel;
  });

  const csvData = filtered.map(l => ({
    id: l.id, admin_user_id: l.admin_user_id, admin_name: l.admin_name, admin_level: l.admin_level,
    action: l.action, target_type: l.target_type, target_id: l.target_id ?? "",
    old_value: l.old_value ? JSON.stringify(l.old_value) : "",
    new_value: l.new_value ? JSON.stringify(l.new_value) : "",
    note: l.note ?? "", created_at: l.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Audit Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {logs.length} entries</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-audit-log" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, admin, target ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">{actions.map(a => <option key={a} value={a}>{a}</option>)}</select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All levels</option><option value="1">Support Agent</option><option value="2">Moderator</option><option value="3">Super Admin</option></select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-h-[700px] overflow-y-auto">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950 sticky top-0">{["ID","Admin","Level","Action","Target Type","Target ID","Timestamp"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(l => (
                  <tr key={l.id} onClick={() => setSelected(l)} className={`hover:bg-gray-800/40 transition cursor-pointer ${selected?.id === l.id ? "bg-gray-800/60" : ""}`}>
                    <td className="px-3 py-2.5"><Cell val={l.id} mono /></td>
                    <td className="px-3 py-2.5 text-white whitespace-nowrap">{l.admin_name}</td>
                    <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${l.admin_level === 3 ? "bg-red-900 text-red-400" : l.admin_level === 2 ? "bg-purple-900 text-purple-400" : "bg-blue-900 text-blue-400"}`}>{LEVEL_LABELS[l.admin_level]}</span></td>
                    <td className="px-3 py-2.5"><span className={`font-mono ${ACTION_COLORS[l.action] ?? "text-gray-300"}`}>{l.action}</span></td>
                    <td className="px-3 py-2.5 text-gray-400">{l.target_type}</td>
                    <td className="px-3 py-2.5"><Cell val={l.target_id} mono dim /></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h3 className={`text-lg font-bold font-mono ${ACTION_COLORS[selected.action] ?? "text-white"}`}>{selected.action}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["ID", selected.id], ["Admin", selected.admin_name], ["Level", LEVEL_LABELS[selected.admin_level]], ["Target type", selected.target_type], ["Target ID", selected.target_id], ["Timestamp", fmtDate(selected.created_at)]].map(([k, v]) => (
                <div key={k} className="bg-gray-800 rounded-xl p-3"><div className="text-gray-500 text-[11px] mb-0.5">{k}</div><div className="text-white text-xs break-all">{v}</div></div>
              ))}
            </div>
            {selected.old_value && <div><div className="text-gray-500 text-xs mb-1">Before</div><pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-auto max-h-40">{JSON.stringify(selected.old_value, null, 2)}</pre></div>}
            {selected.new_value && <div><div className="text-gray-500 text-xs mb-1">After</div><pre className="bg-gray-800 rounded-xl p-3 text-xs text-gray-300 overflow-auto max-h-40">{JSON.stringify(selected.new_value, null, 2)}</pre></div>}
            {selected.note && <div><div className="text-gray-500 text-xs mb-1">Note</div><div className="text-gray-300 text-sm">{selected.note}</div></div>}
          </div>
        ) : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">Select an entry</div>}
      </div>
    </div>
  );
}
