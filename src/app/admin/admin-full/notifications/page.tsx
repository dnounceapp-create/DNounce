"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const NOTIF_TYPES = ["all","stage_1_contributor","stage_2_subject","stage_2_contributor_ai_complete","stage_3_subject","stage_3_contributor","stage_4_contributor","stage_5_subject","stage_5_contributor","stage_6_subject","stage_6_contributor","voting_ended_subject","voting_ended_contributor","debate_reply","voter_reply","voter_flagged","voter_convicted","community_reply","community_reply_subject","community_reply_contributor","badge_earned","tagged","ticket_response","seven_day_unlock","pinned_stage_change","following_stage_change","pinned_decided","following_decided"];

const NOTIF_EDIT_FIELDS = [
  { key: "id", label: "Notification ID", readOnly: true },
  { key: "user_id", label: "User ID", readOnly: true },
  { key: "title", label: "Title", type: "text" as const },
  { key: "body", label: "Body", type: "textarea" as const },
  { key: "type", label: "Type", type: "text" as const },
  { key: "read", label: "Mark as Read", type: "boolean" as const },
  { key: "record_id", label: "Record ID", readOnly: true },
  { key: "created_at", label: "Created At", readOnly: true },
];

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [editNotif, setEditNotif] = useState<any | null>(null);
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
    const { data } = await supabase.from("notifications").select("id, user_id, title, body, type, read, record_id, created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setNotifs(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function saveNotif(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("notifications").update({ title: updated.title, body: updated.body, type: updated.type, read: updated.read }).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_notification", target_type: "notifications", target_id: updated.id });
    showToast("success", "Notification updated"); await load();
  }

  async function deleteNotif(id: string) {
    if (!confirm("Delete this notification?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("notifications").delete().eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "delete_notification", target_type: "notifications", target_id: id });
    showToast("success", "Deleted"); await load();
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = notifs.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !search || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q) || n.user_name?.toLowerCase().includes(q) || n.type?.includes(q) || n.id?.includes(q);
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const matchRead = readFilter === "all" || (readFilter === "read" ? n.read : !n.read);
    return matchSearch && matchType && matchRead;
  });

  const csvData = filtered.map(n => ({ id: n.id, user_id: n.user_id, user_name: n.user_name, title: n.title, body: n.body, type: n.type, read: n.read, record_id: n.record_id ?? "", created_at: n.created_at }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Notifications Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {notifs.length} notifications</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-notifications" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, body, user, type…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">{NOTIF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
        <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All</option><option value="read">Read</option><option value="unread">Unread</option>
        </select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID","User","Title","Body","Type","Read","Record ID","Sent","Actions"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(n => (
                  <tr key={n.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-3 py-2.5"><Cell val={n.id} mono /></td>
                    <td className="px-3 py-2.5 text-white whitespace-nowrap">{n.user_name}</td>
                    <td className="px-3 py-2.5 text-white font-medium"><Cell val={n.title} /></td>
                    <td className="px-3 py-2.5"><Cell val={n.body} dim /></td>
                    <td className="px-3 py-2.5"><span className="font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">{n.type}</span></td>
                    <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded font-semibold ${n.read ? "bg-green-900 text-green-400" : "bg-gray-800 text-gray-400"}`}>{n.read ? "Read" : "Unread"}</span></td>
                    <td className="px-3 py-2.5"><Cell val={n.record_id} mono dim /></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(n.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditNotif(n)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                        {adminLevel >= 2 && <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>}
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
      {editNotif && <EditModal title={`Edit Notification — ${editNotif.id?.slice(0,8)}…`} data={editNotif} fields={NOTIF_EDIT_FIELDS} onSave={saveNotif} onClose={() => setEditNotif(null)} />}
    </div>
  );
}
