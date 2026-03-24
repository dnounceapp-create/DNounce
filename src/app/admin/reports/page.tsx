"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selected, setSelected] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<{ report: any; type: string } | null>(null);
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
    const { data } = await supabase.from("support_tickets").select("id,user_id,topic,category,message,status,created_at,admin_note,resolved_at,priority").eq("type", "report").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = userIds.length ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds) : { data: [] };
    const m: Record<string, any> = {}; (accts ?? []).forEach((a: any) => { m[a.user_id] = a; });
    setReports(rows.map(r => ({ ...r, user_name: `${m[r.user_id]?.first_name ?? ""} ${m[r.user_id]?.last_name ?? ""}`.trim() || "User", user_email: m[r.user_id]?.email ?? "" })));
    setLoading(false);
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (type === "close") {
      if (!updated.admin_note?.trim()) throw new Error("A resolution note is required when closing a report");
      await supabase.from("support_tickets").update({ status: "closed", resolved_at: new Date().toISOString(), admin_note: updated.admin_note }).eq("id", updated.id);
    }
    if (type === "edit") {
      await supabase.from("support_tickets").update({ topic: updated.topic, category: updated.category, admin_note: updated.admin_note || null }).eq("id", updated.id);
    }
    if (type === "reopen") {
      await supabase.from("support_tickets").update({ status: "open", resolved_at: null }).eq("id", updated.id);
    }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: `report_${type}`, target_type: "support_tickets", target_id: updated.id, new_value: { ...updated, note } });
    showToast("success", "Report updated"); setSelected(null); await load();
  }

  function showToast(t: "success" | "error", m: string) { setToast({ type: t, msg: m }); setTimeout(() => setToast(null), 3500); }

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return (!search || r.topic?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q) || r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q) || r.id?.includes(q)) && (statusFilter === "all" || r.status === statusFilter);
  });
  const csvData = filtered.map(r => ({ id: r.id, user_id: r.user_id, user_name: r.user_name, user_email: r.user_email, topic: r.topic, category: r.category, message: r.message, status: r.status, admin_note: r.admin_note ?? "", created_at: r.created_at, resolved_at: r.resolved_at ?? "" }));

  const editFields: SmartField[] = [
    { key: "id", label: "Report ID", type: "readonly" },
    { key: "topic", label: "Topic / Subject", type: "text", required: true },
    { key: "category", label: "Category", type: "text", help: "e.g. Spam, Harassment, Misinformation, Fake Identity" },
    { key: "admin_note", label: "Internal Note", type: "textarea", help: "Visible only to admins." },
  ];
  const closeFields: SmartField[] = [
    { key: "id", label: "Report ID", type: "readonly" },
    { key: "admin_note", label: "Resolution Summary", type: "textarea", required: true, help: "How was this report resolved? Was action taken? This is logged for future reference." },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Reports</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} reports — click to view full content and take action</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-reports" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic, message, user name, email, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">{["all", "open", "closed"].map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID", "Reporter", "Email", "Topic", "Category", "Status", "Submitted", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === r.id ? "bg-gray-800/70" : ""}`}>
                  <td className="px-4 py-3"><CopyID id={r.id} /></td>
                  <td className="px-4 py-3 text-white font-medium">{r.user_name}</td>
                  <td className="px-4 py-3 text-gray-400">{r.user_email || "—"}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{r.topic}</td>
                  <td className="px-4 py-3 text-gray-400">{r.category || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${r.status === "open" ? "bg-red-900 text-red-300 border-red-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {selected && (
        <SidePanel title={selected.topic} subtitle={`From ${selected.user_name} (${selected.user_email})`} onClose={() => setSelected(null)}
          actions={<div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEditModal({ report: selected, type: "edit" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Edit Details</button>
            {selected.status === "open" ? <button onClick={() => setEditModal({ report: selected, type: "close" })} className="px-3 py-2 rounded-xl bg-green-900/30 text-green-400 hover:bg-green-900/60 text-xs font-medium border border-green-800 transition">✅ Mark Resolved</button> : <button onClick={() => saveEdit(selected, "Admin reopened report", "reopen")} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">↩️ Reopen</button>}
          </div>}>
          <DetailSection title="Report Details">
            <DetailRow label="Report ID" value={selected.id} mono copyable />
            <DetailRow label="Status" value={selected.status} highlight={selected.status === "open" ? "red" : undefined} />
            <DetailRow label="Category" value={selected.category} />
            <DetailRow label="Submitted" value={fmtDate(selected.created_at)} />
            <DetailRow label="Resolved At" value={fmtDate(selected.resolved_at)} />
          </DetailSection>
          <DetailSection title="Reporter">
            <DetailRow label="Name" value={selected.user_name} />
            <DetailRow label="Email" value={selected.user_email} copyable />
            <DetailRow label="User ID" value={selected.user_id} mono copyable />
          </DetailSection>
          <DetailSection title="Report Content">
            <div className="py-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.message}</div>
          </DetailSection>
          {selected.admin_note && <DetailSection title="Resolution Note"><div className="py-3 text-sm text-yellow-300 whitespace-pre-wrap leading-relaxed">{selected.admin_note}</div></DetailSection>}
        </SidePanel>
      )}
      {editModal && (
        <SmartEditModal
          title={editModal.type === "close" ? "Resolve Report" : "Edit Report"}
          subtitle={editModal.report.topic}
          data={editModal.report}
          fields={editModal.type === "close" ? closeFields : editFields}
          onSave={(u, n) => saveEdit(u, n, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
