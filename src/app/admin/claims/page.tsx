"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<{ claim: any; type: string } | null>(null);
  const [adminLevel, setAdminLevel] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: role } = await supabase.from("admin_roles").select("role").eq("user_id", session.user.id).eq("is_active", true).maybeSingle();
      setAdminLevel(role?.role ?? "");
      await load();
    }
    init();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("subject_claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (data as any[]) ?? [];

    // Enrich with subject name and claimant name
    const subjectIds = [...new Set(rows.map(r => r.subject_id).filter(Boolean))];
    const userIds = [...new Set(rows.map(r => r.claimant_user_id).filter(Boolean))];

    const [subjectsRes, acctsRes] = await Promise.all([
      subjectIds.length ? supabase.from("subjects").select("subject_uuid,name").in("subject_uuid", subjectIds) : { data: [] },
      userIds.length ? supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds) : { data: [] },
    ]);

    const subjectMap: Record<string, string> = {};
    (subjectsRes.data ?? []).forEach((s: any) => { subjectMap[s.subject_uuid] = s.name; });

    const acctMap: Record<string, any> = {};
    (acctsRes.data ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });

    setClaims(rows.map(r => ({
      ...r,
      subject_name: subjectMap[r.subject_id] ?? "—",
      claimant_name: `${acctMap[r.claimant_user_id]?.first_name ?? ""} ${acctMap[r.claimant_user_id]?.last_name ?? ""}`.trim() || "—",
      claimant_email: acctMap[r.claimant_user_id]?.email ?? "—",
    })));

    setLoading(false);
  }

  async function handleApprove(claim: any, note: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");

    // Set owner_auth_user_id on the subject
    const { error: subjectError } = await supabase
      .from("subjects")
      .update({ owner_auth_user_id: claim.claimant_user_id })
      .eq("subject_uuid", claim.subject_id);
    if (subjectError) throw subjectError;

    // Update claim status
    const { error: claimError } = await supabase
      .from("subject_claims")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: session.user.id, admin_note: note || null })
      .eq("id", claim.id);
    if (claimError) throw claimError;

    // Notify claimant
    await supabase.from("notifications").insert({
      user_id: claim.claimant_user_id,
      title: "Your profile claim was approved",
      body: `You now own the subject profile for "${claim.subject_name}". You can manage it from your dashboard.`,
      type: "claim_approved",
      record_id: null,
    });

    await supabase.from("admin_audit_log").insert({
      admin_user_id: session.user.id, admin_level: adminLevel,
      action: "claim_approved", target_type: "subject_claims", target_id: claim.id,
      new_value: { subject_id: claim.subject_id, claimant_user_id: claim.claimant_user_id, note },
    });

    showToast("success", "Claim approved — subject ownership transferred");
    await load();
    setSelected(null);
  }

  async function handleReject(claim: any, note: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");

    if (!note?.trim()) throw new Error("Rejection reason is required");

    const { error } = await supabase
      .from("subject_claims")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: session.user.id, admin_note: note })
      .eq("id", claim.id);
    if (error) throw error;

    await supabase.from("notifications").insert({
      user_id: claim.claimant_user_id,
      title: "Your profile claim was not approved",
      body: `Your claim for "${claim.subject_name}" was reviewed and could not be approved at this time. Reason: ${note}`,
      type: "claim_rejected",
      record_id: null,
    });

    await supabase.from("admin_audit_log").insert({
      admin_user_id: session.user.id, admin_level: adminLevel,
      action: "claim_rejected", target_type: "subject_claims", target_id: claim.id,
      new_value: { subject_id: claim.subject_id, claimant_user_id: claim.claimant_user_id, note },
    });

    showToast("success", "Claim rejected — user notified");
    await load();
    setSelected(null);
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); }

  const filtered = claims.filter(c => {
    const q = search.toLowerCase();
    const m = !search || c.subject_name?.toLowerCase().includes(q) || c.claimant_name?.toLowerCase().includes(q) || c.claimant_email?.toLowerCase().includes(q) || c.id?.includes(q) || c.claimant_user_id?.includes(q);
    return m && (statusFilter === "all" || c.status === statusFilter);
  });

  const csvData = filtered.map(c => ({
    id: c.id,
    subject_id: c.subject_id,
    subject_name: c.subject_name,
    claimant_user_id: c.claimant_user_id,
    claimant_name: c.claimant_name,
    claimant_email: c.claimant_email,
    status: c.status,
    admin_note: c.admin_note ?? "",
    reviewed_by: c.reviewed_by ?? "",
    reviewed_at: c.reviewed_at ?? "",
    created_at: c.created_at,
  }));

  const approveFields: SmartField[] = [
    { key: "id", label: "Claim ID", type: "readonly" },
    { key: "subject_name", label: "Subject Profile", type: "readonly" },
    { key: "claimant_name", label: "Claimant", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Approving transfers ownership of this subject profile to the claimant. They will be able to manage their profile and dispute records. This cannot be undone easily." },
    { key: "admin_note", label: "Internal Note (optional)", type: "textarea", help: "Visible only to admins. Not shown to the user." },
  ];

  const rejectFields: SmartField[] = [
    { key: "id", label: "Claim ID", type: "readonly" },
    { key: "subject_name", label: "Subject Profile", type: "readonly" },
    { key: "claimant_name", label: "Claimant", type: "readonly" },
    { key: "admin_note", label: "Rejection Reason", type: "textarea", required: true, help: "This will be sent to the user in their notification. Be clear and professional." },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Profile Claims</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} claims — review requests from users claiming ownership of subject profiles</p>
        </div>
        <div className="flex gap-2">
          <CSVButton data={csvData} filename="dnounce-claims" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject name, claimant name, email, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          {["all", "pending", "approved", "rejected"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading claims…</div> : filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No claims found.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950">{["Claim ID", "Subject Profile", "Claimant", "Email", "Status", "Submitted", "Reviewed At", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === c.id ? "bg-gray-800/70" : ""}`}>
                    <td className="px-4 py-3"><CopyID id={c.id} /></td>
                    <td className="px-4 py-3 text-white font-medium">{c.subject_name}</td>
                    <td className="px-4 py-3 text-gray-300">{c.claimant_name}</td>
                    <td className="px-4 py-3 text-gray-400">{c.claimant_email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        c.status === "pending" ? "bg-orange-900 text-orange-300 border-orange-700" :
                        c.status === "approved" ? "bg-green-900 text-green-300 border-green-700" :
                        "bg-red-900 text-red-300 border-red-700"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{c.reviewed_at ? fmtDate(c.reviewed_at) : "—"}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <SidePanel
          title={`Claim — ${selected.subject_name}`}
          subtitle={`From ${selected.claimant_name} (${selected.claimant_email})`}
          onClose={() => setSelected(null)}
          actions={
            selected.status === "pending" ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditModal({ claim: selected, type: "approve" })} className="px-3 py-2 rounded-xl bg-green-900/30 text-green-400 hover:bg-green-900/60 text-xs font-medium border border-green-800 transition">✅ Approve Claim</button>
                <button onClick={() => setEditModal({ claim: selected, type: "reject" })} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 text-xs font-medium border border-red-800 transition">❌ Reject Claim</button>
              </div>
            ) : (
              <div className="text-gray-500 text-xs text-center py-2">This claim has already been {selected.status}.</div>
            )
          }
        >
          <DetailSection title="Claim Details">
            <DetailRow label="Claim ID" value={selected.id} mono copyable />
            <DetailRow label="Status" value={selected.status} highlight={selected.status === "approved" ? "green" : selected.status === "rejected" ? "red" : undefined} />
            <DetailRow label="Submitted" value={fmtDate(selected.created_at)} />
            <DetailRow label="Reviewed At" value={fmtDate(selected.reviewed_at)} />
            <DetailRow label="Reviewed By" value={selected.reviewed_by} mono copyable />
            {selected.admin_note && <DetailRow label="Admin Note" value={selected.admin_note} />}
          </DetailSection>
          <DetailSection title="Subject Profile">
            <DetailRow label="Subject Name" value={selected.subject_name} />
            <DetailRow label="Subject UUID" value={selected.subject_id} mono copyable />
          </DetailSection>
          <DetailSection title="Claimant">
            <DetailRow label="Name" value={selected.claimant_name} />
            <DetailRow label="Email" value={selected.claimant_email} copyable />
            <DetailRow label="Auth User ID" value={selected.claimant_user_id} mono copyable />
          </DetailSection>
          {selected.verification_data && (
            <DetailSection title="Verification Data Submitted" defaultOpen={false}>
              <pre className="py-3 text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-60">{JSON.stringify(selected.verification_data, null, 2)}</pre>
            </DetailSection>
          )}
        </SidePanel>
      )}

      {editModal && (
        <SmartEditModal
          title={editModal.type === "approve" ? "Approve Profile Claim" : "Reject Profile Claim"}
          subtitle={`${editModal.claim.subject_name} — claimed by ${editModal.claim.claimant_name}`}
          data={editModal.claim}
          fields={editModal.type === "approve" ? approveFields : rejectFields}
          danger={editModal.type === "reject"}
          onSave={async (updated, note) => {
            if (editModal.type === "approve") await handleApprove(editModal.claim, note);
            else await handleReject(editModal.claim, updated.admin_note || note);
          }}
          onClose={() => setEditModal(null)}
        />
      )}

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
