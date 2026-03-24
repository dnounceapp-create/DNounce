"use client";
// ─── TICKETS ──────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight, MessageSquare } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<any | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [editModal, setEditModal] = useState<{ ticket: any; type: string } | null>(null);
  const [response, setResponse] = useState("");
  const [posting, setPosting] = useState(false);
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
    const { data } = await supabase.from("support_tickets").select("id,user_id,type,topic,category,priority,message,status,created_at,admin_note,resolved_at,assigned_to").eq("type", "support").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = userIds.length ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds) : { data: [] };
    const m: Record<string, any> = {}; (accts ?? []).forEach((a: any) => { m[a.user_id] = a; });
    setTickets(rows.map(r => ({ ...r, user_name: `${m[r.user_id]?.first_name ?? ""} ${m[r.user_id]?.last_name ?? ""}`.trim() || "User", user_email: m[r.user_id]?.email ?? "" })));
    setLoading(false);
  }

  async function selectTicket(t: any) {
    setSelected(t);
    const { data } = await supabase.from("support_ticket_responses").select("id,body,created_at,admin_user_id").eq("ticket_id", t.id).order("created_at", { ascending: true });
    const adminIds = [...new Set((data ?? []).map((r: any) => r.admin_user_id))];
    let names: Record<string, string> = {};
    if (adminIds.length) { const { data: ac } = await supabase.from("user_accountdetails").select("user_id,first_name,last_name").in("user_id", adminIds); (ac ?? []).forEach((a: any) => { names[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; }); }
    setResponses((data ?? []).map((r: any) => ({ ...r, admin_name: names[r.admin_user_id] ?? "Admin" })));
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (type === "details") {
      const { error } = await supabase.from("support_tickets").update({ topic: updated.topic, category: updated.category, priority: updated.priority, admin_note: updated.admin_note || null }).eq("id", updated.id);
      if (error) throw error;
    }
    if (type === "close") {
      if (!updated.admin_note?.trim()) throw new Error("Resolution note is required when closing a ticket");
      const { error } = await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString(), admin_note: updated.admin_note }).eq("id", updated.id);
      if (error) throw error;
    }
    if (type === "reopen") {
      await supabase.from("support_tickets").update({ status: "open", resolved_at: null }).eq("id", updated.id);
    }
    if (type === "assign") {
      if (!updated.assigned_to?.trim()) throw new Error("Admin user ID is required");
      const { data: adminUser } = await supabase.from("user_accountdetails").select("user_id,first_name").eq("user_id", updated.assigned_to.trim()).maybeSingle();
      if (!adminUser) throw new Error(`No user found with ID: ${updated.assigned_to}. Check the ID and try again.`);
      const { error } = await supabase.from("support_tickets").update({ assigned_to: updated.assigned_to.trim(), status: "in_progress" }).eq("id", updated.id);
      if (error) throw error;
    }
    if (type === "edit_response") {
      const { error } = await supabase.from("support_ticket_responses").update({ body: updated.body }).eq("id", updated.response_id);
      if (error) throw error;
    }
    if (type === "delete_response") {
      await supabase.from("support_ticket_responses").delete().eq("id", updated.response_id);
    }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: `ticket_${type}`, target_type: "support_tickets", target_id: updated.id, new_value: { ...updated, note } });
    showToast("success", "Ticket updated");
    await load();
    setSelected(null);
  }

  async function postResponse() {
    if (!selected || !response.trim()) return;
    setPosting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("support_ticket_responses").insert({ ticket_id: selected.id, admin_user_id: session!.user.id, body: response.trim() });
    if (error) { showToast("error", error.message); setPosting(false); return; }
    await supabase.from("notifications").insert({ user_id: selected.user_id, title: "Response to your support ticket", body: `An admin responded to your ticket: "${selected.topic}"`, type: "ticket_response", record_id: null });
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "ticket_respond", target_type: "support_tickets", target_id: selected.id });
    setResponse("");
    showToast("success", "Response sent and user notified");
    await selectTicket(selected);
    setPosting(false);
  }

  function showToast(t: "success" | "error", m: string) { setToast({ type: t, msg: m }); setTimeout(() => setToast(null), 3500); }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return (!search || t.topic?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q) || t.user_name?.toLowerCase().includes(q) || t.user_email?.toLowerCase().includes(q) || t.id?.includes(q)) && (statusFilter === "all" || t.status === statusFilter);
  });
  const csvData = filtered.map(t => ({ id: t.id, user_id: t.user_id, user_name: t.user_name, user_email: t.user_email, topic: t.topic, category: t.category, priority: t.priority, message: t.message, status: t.status, admin_note: t.admin_note ?? "", assigned_to: t.assigned_to ?? "", created_at: t.created_at, resolved_at: t.resolved_at ?? "" }));

  const detailFields: SmartField[] = [
    { key: "id", label: "Ticket ID", type: "readonly" },
    { key: "topic", label: "Topic / Subject", type: "text", required: true, help: "Short summary of what the user needs help with." },
    { key: "category", label: "Category", type: "text", help: "e.g. Billing, Account, Records, Technical" },
    { key: "priority", label: "Priority Level", type: "select", required: true, options: [{ value: "low", label: "Low — not time-sensitive" }, { value: "normal", label: "Normal — standard response time" }, { value: "high", label: "High — needs attention soon" }, { value: "urgent", label: "🔴 Urgent — respond immediately" }] },
    { key: "admin_note", label: "Internal Admin Note", type: "textarea", help: "Visible only to admins. Not shown to the user." },
  ];
  const closeFields: SmartField[] = [
    { key: "id", label: "Ticket ID", type: "readonly" },
    { key: "admin_note", label: "Resolution Summary", type: "textarea", required: true, help: "Summarize how this was resolved. Logged for future reference." },
  ];
  const assignFields: SmartField[] = [
    { key: "id", label: "Ticket ID", type: "readonly" },
    { key: "assigned_to", label: "Assign To (Auth User ID)", type: "text", required: true, help: "Enter the auth_user_id of the admin to assign. The ticket status will change to 'In Progress'." },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Support Tickets</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} tickets — click to view full detail, respond, edit, or close</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-tickets" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic, message, user name, email, ticket ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">{["all", "open", "in_progress", "closed"].map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-gray-800 bg-gray-950">{["Ticket ID", "User", "Email", "Topic", "Category", "Priority", "Status", "Responses", "Assigned To", "Created", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(t => (
                <tr key={t.id} onClick={() => selectTicket(t)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === t.id ? "bg-gray-800/70" : ""}`}>
                  <td className="px-4 py-3"><CopyID id={t.id} /></td>
                  <td className="px-4 py-3 text-white font-medium">{t.user_name}</td>
                  <td className="px-4 py-3 text-gray-400">{t.user_email || "—"}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-[180px] truncate">{t.topic}</td>
                  <td className="px-4 py-3 text-gray-400">{t.category || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.priority === "urgent" ? "bg-red-900 text-red-300 border-red-700" : t.priority === "high" ? "bg-orange-900 text-orange-300 border-orange-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.status === "open" ? "bg-yellow-900 text-yellow-300 border-yellow-700" : t.status === "in_progress" ? "bg-blue-900 text-blue-300 border-blue-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-center text-gray-400">{t.response_count ?? "—"}</td>
                  <td className="px-4 py-3">{t.assigned_to ? <CopyID id={t.assigned_to} /> : <span className="text-gray-600">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {selected && (
        <SidePanel title={selected.topic} subtitle={`From ${selected.user_name} (${selected.user_email})`} onClose={() => setSelected(null)}
          actions={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditModal({ ticket: selected, type: "details" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Edit Details</button>
                <button onClick={() => setEditModal({ ticket: selected, type: "assign" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">👤 Assign to Admin</button>
                {selected.status !== "closed"
                  ? <button onClick={() => setEditModal({ ticket: selected, type: "close" })} className="px-3 py-2 rounded-xl bg-green-900/30 text-green-400 hover:bg-green-900/60 text-xs font-medium border border-green-800 transition">✅ Close Ticket</button>
                  : <button onClick={() => saveEdit(selected, "Admin reopened ticket", "reopen")} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">↩️ Reopen</button>}
              </div>
              {selected.status !== "closed" && (
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Send Response to User</label>
                  <textarea value={response} onChange={e => setResponse(e.target.value)} rows={3} placeholder="Write a response to the user. They will receive an in-app notification." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none" />
                  <button onClick={postResponse} disabled={posting || !response.trim()} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40 transition">
                    <MessageSquare className="w-4 h-4" />{posting ? "Sending…" : "Send Response & Notify User"}
                  </button>
                </div>
              )}
            </div>
          }>
          <DetailSection title="Ticket Details">
            <DetailRow label="Ticket ID" value={selected.id} mono copyable />
            <DetailRow label="Status" value={selected.status} />
            <DetailRow label="Priority" value={selected.priority} highlight={selected.priority === "urgent" ? "red" : selected.priority === "high" ? "red" : undefined} />
            <DetailRow label="Category" value={selected.category} />
            <DetailRow label="Assigned To" value={selected.assigned_to} mono copyable />
            <DetailRow label="Created" value={fmtDate(selected.created_at)} />
            <DetailRow label="Resolved At" value={fmtDate(selected.resolved_at)} />
          </DetailSection>
          <DetailSection title="Submitter">
            <DetailRow label="Name" value={selected.user_name} />
            <DetailRow label="Email" value={selected.user_email} copyable />
            <DetailRow label="User ID" value={selected.user_id} mono copyable />
          </DetailSection>
          <DetailSection title="Full Message">
            <div className="py-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.message}</div>
          </DetailSection>
          {selected.admin_note && <DetailSection title="Internal Admin Note"><div className="py-3 text-sm text-yellow-300 whitespace-pre-wrap leading-relaxed">{selected.admin_note}</div></DetailSection>}
          {responses.length > 0 && (
            <DetailSection title={`Admin Responses (${responses.length})`}>
              {responses.map((r: any, i: number) => (
                <div key={r.id} className="py-3 border-b border-gray-700/50 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-blue-400 text-xs font-semibold">{r.admin_name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-[11px]">{fmtDate(r.created_at)}</span>
                      <button onClick={() => setEditModal({ ticket: { ...selected, response_id: r.id, body: r.body }, type: "edit_response" })} className="text-gray-600 hover:text-yellow-400 text-[11px] transition">Edit</button>
                      {adminLevel >= 2 && <button onClick={() => { if (confirm("Delete this response? The user has already seen it.")) saveEdit({ ...selected, response_id: r.id }, "Admin deleted response", "delete_response"); }} className="text-gray-600 hover:text-red-400 text-[11px] transition">Delete</button>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{r.body}</div>
                </div>
              ))}
            </DetailSection>
          )}
        </SidePanel>
      )}

      {editModal && (
        <SmartEditModal
          title={editModal.type === "details" ? "Edit Ticket Details" : editModal.type === "close" ? "Close Ticket" : editModal.type === "assign" ? "Assign Ticket" : editModal.type === "edit_response" ? "Edit Admin Response" : "Reopen Ticket"}
          subtitle={editModal.ticket.topic}
          data={editModal.ticket}
          fields={editModal.type === "details" ? detailFields : editModal.type === "close" ? closeFields : editModal.type === "assign" ? assignFields : editModal.type === "edit_response" ? [{ key: "id", label: "Ticket ID", type: "readonly" as const }, { key: "_warn", type: "warning" as const, label: "", help: "The user has already seen this response. Editing it changes the historical record." }, { key: "body", label: "Response Text", type: "textarea" as const, required: true }] : detailFields}
          warning={editModal.type === "edit_response" ? undefined : undefined}
          onSave={(u, n) => saveEdit(u, n, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
