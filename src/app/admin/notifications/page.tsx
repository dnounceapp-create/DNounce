"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";

const NOTIF_TYPES = ["all", "stage_1_contributor", "stage_2_subject", "stage_2_contributor_ai_complete", "stage_3_subject", "stage_3_contributor", "stage_4_contributor", "stage_5_subject", "stage_5_contributor", "stage_6_subject", "stage_6_contributor", "voting_ended_subject", "voting_ended_contributor", "debate_reply", "voter_reply", "voter_flagged", "voter_convicted", "community_reply", "community_reply_subject", "badge_earned", "tagged", "ticket_response", "seven_day_unlock", "pinned_stage_change", "following_stage_change"];

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<{ notif: any; type: string } | null>(null);
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
    const { data } = await supabase.from("notifications").select("id,user_id,title,body,type,read,record_id,created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = userIds.length ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds) : { data: [] };
    const m: Record<string, any> = {}; (accts ?? []).forEach((a: any) => { m[a.user_id] = a; });
    setNotifs(rows.map(r => ({ ...r, user_name: `${m[r.user_id]?.first_name ?? ""} ${m[r.user_id]?.last_name ?? ""}`.trim() || "User", user_email: m[r.user_id]?.email ?? "" })));
    setLoading(false);
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (type === "edit") {
      const { error } = await supabase.from("notifications").update({ title: updated.title, body: updated.body, type: updated.type, read: updated.read === true || updated.read === "true" }).eq("id", updated.id);
      if (error) throw error;
    }
    if (type === "delete") {
      await supabase.from("notifications").delete().eq("id", updated.id);
      await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "delete_notification", target_type: "notifications", target_id: updated.id, new_value: { note } });
      showToast("success", "Notification deleted"); setSelected(null); await load(); return;
    }
    if (type === "mark_read") {
      await supabase.from("notifications").update({ read: true }).eq("id", updated.id);
    }
    if (type === "mark_unread") {
      await supabase.from("notifications").update({ read: false }).eq("id", updated.id);
    }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_notification", target_type: "notifications", target_id: updated.id, new_value: { ...updated, note } });
    showToast("success", "Notification updated"); setSelected(null); await load();
  }

  function showToast(t: "success" | "error", m: string) { setToast({ type: t, msg: m }); setTimeout(() => setToast(null), 3500); }

  const filtered = notifs.filter(n => {
    const q = search.toLowerCase();
    const m = !search || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q) || n.user_name?.toLowerCase().includes(q) || n.user_email?.toLowerCase().includes(q) || n.type?.includes(q) || n.id?.includes(q);
    return m && (typeFilter === "all" || n.type === typeFilter) && (readFilter === "all" || (readFilter === "read" ? n.read : !n.read));
  });
  const csvData = filtered.map(n => ({ id: n.id, user_id: n.user_id, user_name: n.user_name, user_email: n.user_email, title: n.title, body: n.body, type: n.type, read: n.read, record_id: n.record_id ?? "", created_at: n.created_at }));

  const editFields: SmartField[] = [
    { key: "id", label: "Notification ID", type: "readonly" },
    { key: "user_id", label: "Recipient User ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Editing a notification changes what the user sees in their notification center. The user has likely already seen this." },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "body", label: "Body / Message", type: "textarea", required: true },
    { key: "type", label: "Notification Type", type: "text", required: true, help: "Type identifier used for routing. e.g. badge_earned, stage_5_subject" },
    { key: "read", label: "Mark as Read", type: "boolean", required: true },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Notifications Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {notifs.length} notifications — click to view, edit, or delete</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-notifications" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, body, user name, email, type…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none max-w-[200px]">{NOTIF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
        <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All</option><option value="read">Read</option><option value="unread">Unread</option></select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID", "User", "Email", "Title", "Type", "Read", "Linked Record", "Sent At", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(n => (
                <tr key={n.id} onClick={() => setSelected(n)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === n.id ? "bg-gray-800/70" : ""}`}>
                  <td className="px-4 py-3"><CopyID id={n.id} /></td>
                  <td className="px-4 py-3 text-white font-medium">{n.user_name}</td>
                  <td className="px-4 py-3 text-gray-400">{n.user_email || "—"}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{n.title}</td>
                  <td className="px-4 py-3"><span className="font-mono text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{n.type}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${n.read ? "bg-green-900 text-green-300 border-green-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{n.read ? "Read" : "Unread"}</span></td>
                  <td className="px-4 py-3">{n.record_id ? <CopyID id={n.record_id} /> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(n.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {selected && (
        <SidePanel title={selected.title} subtitle={`To: ${selected.user_name} (${selected.user_email})`} onClose={() => setSelected(null)}
          actions={<div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEditModal({ notif: selected, type: "edit" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Edit Notification</button>
            {!selected.read ? <button onClick={() => saveEdit(selected, "Admin marked read", "mark_read")} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✅ Mark as Read</button> : <button onClick={() => saveEdit(selected, "Admin marked unread", "mark_unread")} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">↩️ Mark as Unread</button>}
            {adminLevel >= 2 && <button onClick={() => setEditModal({ notif: selected, type: "delete" })} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 text-xs font-medium border border-red-800 transition col-span-2">🗑️ Delete Notification</button>}
          </div>}>
          <DetailSection title="Notification Details">
            <DetailRow label="Notification ID" value={selected.id} mono copyable />
            <DetailRow label="Type" value={selected.type} mono />
            <DetailRow label="Read" value={selected.read} highlight={selected.read ? "green" : undefined} />
            <DetailRow label="Sent At" value={fmtDate(selected.created_at)} />
            <DetailRow label="Linked Record ID" value={selected.record_id} mono copyable />
          </DetailSection>
          <DetailSection title="Recipient">
            <DetailRow label="Name" value={selected.user_name} />
            <DetailRow label="Email" value={selected.user_email} copyable />
            <DetailRow label="User ID" value={selected.user_id} mono copyable />
          </DetailSection>
          <DetailSection title="Content">
            <div className="py-2"><div className="text-gray-500 text-xs mb-1">Title</div><div className="text-white text-sm font-medium">{selected.title}</div></div>
            <div className="py-2"><div className="text-gray-500 text-xs mb-1">Body</div><div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</div></div>
          </DetailSection>
        </SidePanel>
      )}
      {editModal && (
        <SmartEditModal
          title={editModal.type === "edit" ? "Edit Notification" : "Delete Notification"}
          subtitle={editModal.notif.title}
          data={editModal.notif}
          fields={editModal.type === "delete" ? [{ key: "id", label: "Notification ID", type: "readonly" as const }, { key: "_warn", type: "warning" as const, label: "", help: "This permanently removes the notification from the user's notification center." }] : editFields}
          confirmText={editModal.type === "delete" ? "DELETE" : undefined}
          danger={editModal.type === "delete"}
          onSave={(u, n) => saveEdit(u, n, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
