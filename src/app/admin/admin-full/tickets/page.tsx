"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, MessageSquare, CheckCircle, X, Pencil } from "lucide-react";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const TICKET_EDIT_FIELDS = [
  { key: "id", label: "Ticket ID", readOnly: true },
  { key: "user_id", label: "User ID", readOnly: true },
  { key: "type", label: "Type", readOnly: true },
  { key: "topic", label: "Topic", type: "text" as const },
  { key: "category", label: "Category", type: "text" as const },
  { key: "priority", label: "Priority", type: "select" as const, options: ["low", "normal", "high", "urgent"] },
  { key: "message", label: "Message", type: "textarea" as const },
  { key: "status", label: "Status", type: "select" as const, options: ["open", "in_progress", "closed"] },
  { key: "admin_note", label: "Internal Note", type: "textarea" as const },
  { key: "created_at", label: "Created At", readOnly: true },
  { key: "resolved_at", label: "Resolved At", readOnly: true },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<any | null>(null);
  const [editTicket, setEditTicket] = useState<any | null>(null);
  const [response, setResponse] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [adminLevel, setAdminLevel] = useState(0);

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
    const { data } = await supabase.from("support_tickets").select("id, user_id, type, topic, category, priority, message, status, created_at, admin_note, resolved_at, assigned_to").eq("type", "support").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setTickets(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function loadDetail(ticket: any) {
    const { data: responses } = await supabase.from("support_ticket_responses").select("id, body, created_at, admin_user_id").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    const adminIds = [...new Set((responses ?? []).map((r: any) => r.admin_user_id))];
    let adminNames: Record<string, string> = {};
    if (adminIds.length) {
      const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", adminIds);
      (accts ?? []).forEach((a: any) => { adminNames[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; });
    }
    setSelected({ ...ticket, responses: (responses ?? []).map((r: any) => ({ ...r, admin_name: adminNames[r.admin_user_id] ?? "Admin" })) });
    setAdminNote(ticket.admin_note ?? "");
  }

  async function saveTicket(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("support_tickets").update({ topic: updated.topic, category: updated.category, priority: updated.priority, message: updated.message, status: updated.status, admin_note: updated.admin_note }).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_ticket", target_type: "support_tickets", target_id: updated.id, new_value: updated });
    showToast("success", "Ticket updated");
    await load();
  }

  async function postResponse() {
    if (!selected || !response.trim()) return;
    setPosting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("support_ticket_responses").insert({ ticket_id: selected.id, admin_user_id: session!.user.id, body: response.trim() });
    if (error) { showToast("error", error.message); setPosting(false); return; }
    await supabase.from("notifications").insert({ user_id: selected.user_id, title: "Response to your support ticket", body: `An admin responded to your ticket: "${selected.topic}"`, type: "ticket_response", record_id: null });
    if (adminNote) await supabase.from("support_tickets").update({ admin_note: adminNote }).eq("id", selected.id);
    setResponse("");
    showToast("success", "Response posted");
    await loadDetail(selected);
    setPosting(false);
  }

  async function closeTicket(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString(), admin_note: adminNote || null }).eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "close_ticket", target_type: "support_tickets", target_id: id });
    showToast("success", "Ticket closed");
    setSelected(null);
    await load();
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || t.topic?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q) || t.user_name?.toLowerCase().includes(q) || t.id?.includes(q) || t.category?.toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || t.status === statusFilter);
  });

  const csvData = filtered.map(t => ({
    id: t.id, user_id: t.user_id, user_name: t.user_name, type: t.type, topic: t.topic,
    category: t.category, priority: t.priority, message: t.message, status: t.status,
    admin_note: t.admin_note ?? "", assigned_to: t.assigned_to ?? "",
    created_at: t.created_at, resolved_at: t.resolved_at ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Support Tickets</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} tickets</p></div>
        <div className="flex gap-2">
          <CSVButton data={csvData} filename="dnounce-tickets" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic, message, user, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          {["all","open","in_progress","closed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
            <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800 bg-gray-950 sticky top-0">
                  {["ID","User","Topic","Category","Priority","Status","Created","Actions"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filtered.map(t => (
                    <tr key={t.id} onClick={() => loadDetail(t)} className={`hover:bg-gray-800/40 transition cursor-pointer ${selected?.id === t.id ? "bg-gray-800/60" : ""}`}>
                      <td className="px-3 py-2.5"><Cell val={t.id} mono /></td>
                      <td className="px-3 py-2.5 text-white whitespace-nowrap">{t.user_name}</td>
                      <td className="px-3 py-2.5"><Cell val={t.topic} /></td>
                      <td className="px-3 py-2.5"><Cell val={t.category} /></td>
                      <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded font-semibold ${t.priority === "urgent" ? "bg-red-900 text-red-400" : t.priority === "high" ? "bg-orange-900 text-orange-400" : "bg-gray-800 text-gray-400"}`}>{t.priority}</span></td>
                      <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded font-semibold ${t.status === "open" ? "bg-yellow-900 text-yellow-400" : t.status === "closed" ? "bg-gray-800 text-gray-400" : "bg-blue-900 text-blue-400"}`}>{t.status}</span></td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                      <td className="px-3 py-2.5"><button onClick={e => { e.stopPropagation(); setEditTicket(t); }} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 max-h-[700px] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div><h3 className="text-white font-semibold text-sm">{selected.topic}</h3><div className="text-gray-500 text-xs mt-0.5">{selected.user_name} • {selected.category} • {selected.priority} • ID: {selected.id?.slice(0,8)}…</div></div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300 whitespace-pre-wrap">{selected.message}</div>
            {(selected.responses ?? []).length > 0 && <div className="space-y-2">{selected.responses.map((r: any) => (<div key={r.id} className="bg-gray-800 rounded-xl p-3 space-y-1"><div className="text-xs font-semibold text-blue-400">{r.admin_name}</div><div className="text-sm text-gray-300 whitespace-pre-wrap">{r.body}</div><div className="text-[11px] text-gray-500">{fmtDate(r.created_at)}</div></div>))}</div>}
            <div><label className="text-gray-400 text-xs mb-1 block">Internal note</label><textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" placeholder="Internal note…" /></div>
            {selected.status !== "closed" && <div><textarea value={response} onChange={e => setResponse(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" placeholder="Response to user…" />
              <div className="mt-2 flex gap-2">
                <button onClick={postResponse} disabled={posting || !response.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"><MessageSquare className="w-4 h-4" />{posting ? "Posting…" : "Respond"}</button>
                <button onClick={() => closeTicket(selected.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-medium"><CheckCircle className="w-4 h-4" /> Close</button>
              </div>
            </div>}
            {selected.status === "closed" && <div className="text-gray-500 text-xs">Closed {fmtDate(selected.resolved_at)}</div>}
          </div>
        ) : <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">Select a ticket</div>}
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
      {editTicket && <EditModal title={`Edit Ticket — ${editTicket.id?.slice(0,8)}…`} data={editTicket} fields={TICKET_EDIT_FIELDS} onSave={saveTicket} onClose={() => setEditTicket(null)} />}
    </div>
  );
}
