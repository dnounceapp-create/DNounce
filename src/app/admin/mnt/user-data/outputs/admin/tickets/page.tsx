"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, CheckCircle, MessageSquare, X } from "lucide-react";

type Ticket = {
  id: string;
  user_id: string;
  type: string;
  topic: string;
  category: string;
  priority: string;
  message: string;
  status: string;
  created_at: string;
  admin_note: string | null;
  resolved_at: string | null;
  user_name?: string;
  responses?: { id: string; body: string; created_at: string; admin_name: string }[];
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [response, setResponse] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [adminLevel, setAdminLevel] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [myName, setMyName] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setMyUserId(session.user.id);
      const { data: role } = await supabase.from("admin_roles").select("level").eq("user_id", session.user.id).eq("is_active", true).maybeSingle();
      setAdminLevel(role?.level ?? 0);
      const { data: acct } = await supabase.from("user_accountdetails").select("first_name, last_name").eq("user_id", session.user.id).maybeSingle();
      setMyName(`${acct?.first_name ?? ""} ${acct?.last_name ?? ""}`.trim() || "Admin");
      await load();
    }
    init();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("id, user_id, type, topic, category, priority, message, status, created_at, admin_note, resolved_at")
      .eq("type", "support")
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = (data as any[]) ?? [];

    // Load user names
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });

    setTickets(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function loadTicketDetail(ticket: Ticket) {
    const { data: responses } = await supabase
      .from("support_ticket_responses")
      .select("id, body, created_at, admin_user_id")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    const adminIds = [...new Set((responses ?? []).map((r: any) => r.admin_user_id))];
    let adminNames: Record<string, string> = {};
    if (adminIds.length) {
      const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", adminIds);
      (accts ?? []).forEach((a: any) => { adminNames[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin"; });
    }

    const enriched = (responses ?? []).map((r: any) => ({ ...r, admin_name: adminNames[r.admin_user_id] ?? "Admin" }));
    setSelected({ ...ticket, responses: enriched });
    setAdminNote(ticket.admin_note ?? "");
  }

  async function postResponse() {
    if (!selected || !response.trim()) return;
    setPosting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from("support_ticket_responses").insert({
      ticket_id: selected.id, admin_user_id: session!.user.id, body: response.trim(),
    });
    if (error) { showToast("error", error.message); setPosting(false); return; }

    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "respond_ticket", target_type: "support_tickets", target_id: selected.id,
    });

    // Notify user
    await supabase.from("notifications").insert({
      user_id: selected.user_id,
      title: "Response to your support ticket",
      body: `An admin responded to your ticket: "${selected.topic}"`,
      type: "ticket_response",
      record_id: null,
    });

    setResponse("");
    showToast("success", "Response posted");
    await loadTicketDetail(selected);
    setPosting(false);
  }

  async function closeTicket(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString(), admin_note: adminNote || null }).eq("id", id);
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "close_ticket", target_type: "support_tickets", target_id: id,
    });
    showToast("success", "Ticket closed");
    setSelected(null);
    await load();
  }

  async function reopenTicket(id: string) {
    await supabase.from("support_tickets").update({ status: "open", resolved_at: null }).eq("id", id);
    showToast("success", "Ticket reopened");
    setSelected(null);
    await load();
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.topic?.toLowerCase().includes(search.toLowerCase()) || t.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Support Tickets</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} tickets</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          {["all", "open", "in_progress", "closed"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No tickets found.</div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
              {filtered.map(t => (
                <button key={t.id} onClick={() => loadTicketDetail(t)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition ${selected?.id === t.id ? "bg-gray-800" : ""}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate">{t.topic}</span>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.status === "open" ? "bg-yellow-900 text-yellow-400" : t.status === "closed" ? "bg-gray-800 text-gray-400" : "bg-blue-900 text-blue-400"}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <span>{t.user_name}</span>
                    <span>•</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={t.priority === "urgent" ? "text-red-400" : ""}>{t.priority}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 max-h-[700px] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-white font-semibold">{selected.topic}</h3>
                <div className="text-gray-500 text-xs mt-0.5">{selected.user_name} • {selected.category} • {selected.priority}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300 whitespace-pre-wrap">{selected.message}</div>

            {/* Responses */}
            {(selected.responses ?? []).length > 0 && (
              <div className="space-y-3">
                <div className="text-gray-400 text-xs font-medium">Responses</div>
                {selected.responses!.map(r => (
                  <div key={r.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                    <div className="text-xs font-semibold text-blue-400">{r.admin_name}</div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">{r.body}</div>
                    <div className="text-[11px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Admin note */}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Internal note (not visible to user)</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
                placeholder="Internal note…" />
            </div>

            {/* Reply */}
            {selected.status !== "closed" && (
              <div>
                <textarea value={response} onChange={e => setResponse(e.target.value)} rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
                  placeholder="Write a response to the user…" />
                <div className="mt-2 flex gap-2">
                  <button onClick={postResponse} disabled={posting || !response.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition">
                    <MessageSquare className="w-4 h-4" />
                    {posting ? "Posting…" : "Respond"}
                  </button>
                  <button onClick={() => closeTicket(selected.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white hover:bg-green-800 text-sm font-medium transition">
                    <CheckCircle className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>
            )}

            {selected.status === "closed" && (
              <button onClick={() => reopenTicket(selected.id)}
                className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 hover:text-white text-sm transition">
                Reopen Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-center text-gray-500 text-sm">
            Select a ticket to view details
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
