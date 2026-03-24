"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, DetailRow, DetailSection, CopyID, fmtDate } from "../adminUtils";

const ACTION_LABELS: Record<string, string> = { delete_record: "Delete Record", soft_delete_record: "Soft Delete Record", permanent_ban: "Permanent Ban", temporary_ban: "Temporary Ban", unban_user: "Unban User", assign_admin: "Assign Admin Role", revoke_admin: "Revoke Admin Role", close_ticket: "Close Ticket", ticket_close: "Close Ticket", ticket_respond: "Respond to Ticket", ticket_assign: "Assign Ticket", ticket_details: "Edit Ticket", report_close: "Resolve Report", report_edit: "Edit Report", award_badge: "Award Badge", revoke_badge: "Revoke Badge", edit_record_content: "Edit Record Content", edit_record_credibility: "Override Credibility", edit_record_identity: "Change Identity Setting", edit_record_outcome: "Override Outcome", edit_record_publish_toggle: "Toggle Publish", edit_record_extend_debate: "Extend Debate", edit_record_extend_voting: "Extend Voting", edit_record_subject: "Edit Subject Info", edit_record_soft_delete: "Soft Delete Record", edit_record_restore: "Restore Record", edit_user_profile: "Edit User Profile", edit_user_account: "Edit Account Settings", edit_user_scores: "Override Scores", edit_user_preferences: "Edit Preferences", edit_user_ban: "Ban User", edit_user_edit_ban: "Edit Ban", edit_user_unban: "Unban User", edit_user_admin_role: "Change Admin Role", edit_notification: "Edit Notification", delete_notification: "Delete Notification", edit_badge: "Edit Badge", edit_subject: "Edit Subject" };
const ACTION_COLORS: Record<string, string> = { delete_record: "text-red-400", soft_delete_record: "text-red-400", permanent_ban: "text-red-400", temporary_ban: "text-orange-400", unban_user: "text-green-400", assign_admin: "text-blue-400", award_badge: "text-teal-400", close_ticket: "text-green-400", ticket_close: "text-green-400", report_close: "text-green-400", revoke_badge: "text-orange-400", edit_record_credibility: "text-purple-400", edit_record_outcome: "text-pink-400", edit_user_ban: "text-red-400", delete_notification: "text-red-400" };
const LEVEL_LABELS: Record<number, string> = { 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };
const LEVEL_COLORS: Record<number, string> = { 1: "bg-blue-900 text-blue-300 border-blue-700", 2: "bg-purple-900 text-purple-300 border-purple-700", 3: "bg-red-900 text-red-300 border-red-700" };

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
    const { data } = await supabase.from("admin_audit_log").select("id,admin_user_id,admin_level,action,target_type,target_id,old_value,new_value,note,created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const adminIds = [...new Set(rows.map(r => r.admin_user_id).filter(Boolean))];
    const { data: accts } = adminIds.length ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name").in("user_id", adminIds) : { data: [] };
    const m: Record<string, string> = {}; (accts ?? []).forEach((a: any) => { m[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; });
    setLogs(rows.map(r => ({ ...r, admin_name: m[r.admin_user_id] ?? "Admin" })));
    setLoading(false);
  }

  const allActions = ["all", ...Array.from(new Set(logs.map(l => l.action)))];
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const m = !search || l.action?.includes(q) || l.admin_name?.toLowerCase().includes(q) || l.target_id?.includes(q) || l.target_type?.includes(q) || l.note?.toLowerCase().includes(q);
    return m && (actionFilter === "all" || l.action === actionFilter) && (levelFilter === "all" || String(l.admin_level) === levelFilter);
  });

  const csvData = filtered.map(l => ({ id: l.id, admin_user_id: l.admin_user_id, admin_name: l.admin_name, admin_level: l.admin_level, action: l.action, target_type: l.target_type, target_id: l.target_id ?? "", old_value: l.old_value ? JSON.stringify(l.old_value) : "", new_value: l.new_value ? JSON.stringify(l.new_value) : "", note: l.note ?? "", created_at: l.created_at }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Audit Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {logs.length} admin actions — full before/after for every change</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-audit-log" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, admin name, target ID, note…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none max-w-[200px]">{allActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}</select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All levels</option><option value="1">Support Agent</option><option value="2">Moderator</option><option value="3">Super Admin</option></select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-gray-800 bg-gray-950">{["Log ID", "Admin", "Level", "Action", "Target Type", "Target ID", "Reason / Note", "Timestamp", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(l => (
                <tr key={l.id} onClick={() => setSelected(l)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === l.id ? "bg-gray-800/70" : ""}`}>
                  <td className="px-4 py-3"><CopyID id={l.id} /></td>
                  <td className="px-4 py-3 text-white font-medium">{l.admin_name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${LEVEL_COLORS[l.admin_level] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>{LEVEL_LABELS[l.admin_level] ?? `Level ${l.admin_level}`}</span></td>
                  <td className="px-4 py-3"><span className={`font-mono font-medium ${ACTION_COLORS[l.action] ?? "text-gray-300"}`}>{ACTION_LABELS[l.action] ?? l.action}</span></td>
                  <td className="px-4 py-3 text-gray-400">{l.target_type}</td>
                  <td className="px-4 py-3">{l.target_id ? <CopyID id={l.target_id} /> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{l.note || l.new_value?.note || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {selected && (
        <SidePanel title={ACTION_LABELS[selected.action] ?? selected.action} subtitle={`By ${selected.admin_name} at ${fmtDate(selected.created_at)}`} onClose={() => setSelected(null)}>
          <DetailSection title="Action Details">
            <DetailRow label="Log ID" value={selected.id} mono copyable />
            <DetailRow label="Action" value={ACTION_LABELS[selected.action] ?? selected.action} />
            <DetailRow label="Admin Name" value={selected.admin_name} />
            <DetailRow label="Admin Level" value={LEVEL_LABELS[selected.admin_level] ?? `Level ${selected.admin_level}`} />
            <DetailRow label="Admin User ID" value={selected.admin_user_id} mono copyable />
            <DetailRow label="Timestamp" value={fmtDate(selected.created_at)} />
          </DetailSection>
          <DetailSection title="Target">
            <DetailRow label="Target Table" value={selected.target_type} />
            <DetailRow label="Target ID" value={selected.target_id} mono copyable />
          </DetailSection>
          {(selected.note || selected.new_value?.note) && <DetailSection title="Reason / Note"><div className="py-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.note || selected.new_value?.note}</div></DetailSection>}
          {selected.old_value && (
            <DetailSection title="Before — What Was Changed" defaultOpen={false}>
              <pre className="py-3 text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-60 leading-relaxed">{JSON.stringify(selected.old_value, null, 2)}</pre>
            </DetailSection>
          )}
          {selected.new_value && (
            <DetailSection title="After — New Values" defaultOpen={true}>
              <pre className="py-3 text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-60 leading-relaxed">{JSON.stringify(selected.new_value, null, 2)}</pre>
            </DetailSection>
          )}
        </SidePanel>
      )}
    </div>
  );
}
