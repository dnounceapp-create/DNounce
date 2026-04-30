"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight, ArrowRightLeft, Eye } from "lucide-react";
import Link from "next/link";
import RecordHistoryPanel from "./RecordHistoryPanel";
import {
  CSVButton, SidePanel, StatusBadge, CredBadge, CopyID,
  DetailRow, DetailSection, StageChangeModal, SmartEditModal,
  fmtDate, STATUS_LABELS, type SmartField
} from "../adminUtils";

const ALL_STATUSES = ["ai_verification", "subject_notified", "published", "deletion_request", "debate", "voting", "decision"];
const CREDS = ["Evidence-Based", "Opinion-Based", "Unclear", "Pending AI Review"];
const RECORD_TYPES = ["pending", "opinion", "evidence"];

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [credFilter, setCredFilter] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [stageModal, setStageModal] = useState<{ record: any; target: string } | null>(null);
  const [editModal, setEditModal] = useState<{ record: any; type: string } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setMyUserId(session.user.id);
      const { data: role } = await supabase.from("admin_roles").select("level").eq("user_id", session.user.id).eq("is_active", true).maybeSingle();
      setAdminLevel(role?.level ?? 0);
      await load();
    }
    init();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("records").select(`
      id, uid, status, credibility, category, rating, description, location,
      organization, relationship, contributor_identity_preference, is_published,
      final_outcome, record_type, agree_terms,
      created_at, published_at, ai_completed_at, debate_started_at, debate_ends_at,
      voting_started_at, voting_ends_at, decision_started_at, decision_made_at,
      dispute_started_at, finalized_at, deleted_at, execution_ends_at,
      ai_vendor_1_result, ai_vendor_2_result, ai_vendor_3_result, ai_vendor_1_score,
      contributor_identity_preference, contributor_display_name,
      contributor_id, subject_id, created_by, contributor_alias_id,
      subject:subjects(subject_uuid, name, nickname, organization, location, email, phone, owner_auth_user_id, avatar_url),
      contributor:contributors!records_contributor_id_fkey(id, user_id, alias, auth_user_id)
    `).order("created_at", { ascending: false }).limit(500);
    setRecords((data as any[]) ?? []);
    setLoading(false);
  }

  async function applyStageChange(record: any, targetStatus: string, formData: Record<string, any>, note: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const updates: Record<string, any> = { status: targetStatus };
    // Map form fields to DB columns with proper ISO conversion
    const dateFields = ["debate_started_at", "debate_ends_at", "voting_started_at", "voting_ends_at", "decision_started_at", "finalized_at", "published_at", "ai_completed_at", "dispute_started_at", "decision_made_at"];
    dateFields.forEach(f => { if (formData[f]) updates[f] = new Date(formData[f]).toISOString(); });
    if (formData.credibility) updates.credibility = formData.credibility;
    if (formData.final_outcome) updates.final_outcome = formData.final_outcome;
    if (targetStatus === "published") { updates.is_published = true; }
    if (targetStatus === "ai_verification") { updates.credibility = null; updates.is_published = false; }

    const { error } = await supabase.from("records").update(updates).eq("id", record.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: `stage_change_to_${targetStatus}`, target_type: "records", target_id: record.id,
      old_value: { status: record.status }, new_value: { ...updates, note },
    });
    showToast("success", `Stage changed to "${STATUS_LABELS[targetStatus] ?? targetStatus}"`);
    await load();
    if (selected?.id === record.id) setSelected((p: any) => ({ ...p, ...updates, status: targetStatus }));
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();
    let updateData: Record<string, any> = {};

    if (type === "content") {
      updateData = {
        description: updated.description || null,
        category: updated.category || null,
        location: updated.location || null,
        organization: updated.organization || null,
        relationship: updated.relationship || null,
        rating: updated.rating !== "" && updated.rating !== null ? Number(updated.rating) : null,
        record_type: updated.record_type || null,
      };
    }
    if (type === "credibility") {
      updateData = {
        credibility: updated.credibility || null,
        ai_vendor_1_result: updated.ai_vendor_1_result || null,
        ai_vendor_2_result: updated.ai_vendor_2_result || null,
        ai_vendor_3_result: updated.ai_vendor_3_result || null,
        ai_vendor_1_score: updated.ai_vendor_1_score !== "" ? Number(updated.ai_vendor_1_score) : null,
        ai_completed_at: updated.ai_completed_at ? new Date(updated.ai_completed_at).toISOString() : null,
      };
    }
    if (type === "identity") {
      updateData = {
        contributor_identity_preference: updated.contributor_identity_preference === true || updated.contributor_identity_preference === "true",
        contributor_display_name: updated.contributor_display_name || null,
      };
    }
    if (type === "outcome") {
      updateData = {
        final_outcome: updated.final_outcome || null,
        finalized_at: updated.finalized_at ? new Date(updated.finalized_at).toISOString() : new Date().toISOString(),
      };
    }
    if (type === "publish_toggle") {
      updateData = {
        is_published: updated.is_published === true || updated.is_published === "true",
      };
    }
    if (type === "extend_debate") {
      updateData = { debate_ends_at: updated.debate_ends_at ? new Date(updated.debate_ends_at).toISOString() : null };
    }
    if (type === "extend_voting") {
      updateData = { voting_ends_at: updated.voting_ends_at ? new Date(updated.voting_ends_at).toISOString() : null };
    }
    if (type === "execution") {
      updateData = { execution_ends_at: updated.execution_ends_at ? new Date(updated.execution_ends_at).toISOString() : null };
    }
    if (type === "soft_delete") {
      updateData = { deleted_at: new Date().toISOString(), is_published: false, status: "ai_verification" };
    }
    if (type === "restore") {
      updateData = { deleted_at: null };
    }
    if (type === "subject") {
      const { error } = await supabase.from("subjects").update({
        name: updated.subject_name, nickname: updated.subject_nickname || null,
        organization: updated.subject_organization || null, location: updated.subject_location || null,
        email: updated.subject_email || null, phone: updated.subject_phone || null,
      }).eq("subject_uuid", updated.subject_uuid);
      if (error) throw error;
      await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_subject", target_type: "subjects", target_id: updated.subject_uuid, old_value: selected?.subject, new_value: { ...updated, note } });
      showToast("success", "Subject updated"); await load();
      if (selected) setSelected((p: any) => ({ ...p, subject: { ...p.subject, name: updated.subject_name, nickname: updated.subject_nickname, organization: updated.subject_organization, location: updated.subject_location, email: updated.subject_email, phone: updated.subject_phone } }));
      return;
    }

    const { error } = await supabase.from("records").update(updateData).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: `edit_record_${type}`, target_type: "records", target_id: updated.id, old_value: selected, new_value: { ...updateData, note } });
    showToast("success", "Record updated");
    await load();
    if (selected?.id === updated.id) setSelected((p: any) => ({ ...p, ...updateData }));
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const m = !search || r.id?.toLowerCase().includes(q) || (r.subject as any)?.name?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) || r.organization?.toLowerCase().includes(q) || (r.subject as any)?.email?.toLowerCase().includes(q) || r.record_type?.toLowerCase().includes(q);
    return m && (statusFilter === "all" || r.status === statusFilter) && (credFilter === "all" || r.credibility === credFilter);
  });

  const csvData = filtered.map(r => ({
    id: r.id, uid: r.uid, subject_name: (r.subject as any)?.name ?? "", subject_uuid: (r.subject as any)?.subject_uuid ?? "",
    subject_email: (r.subject as any)?.email ?? "", subject_phone: (r.subject as any)?.phone ?? "",
    contributor_id: r.contributor_id ?? "", contributor_auth_user_id: (r.contributor as any)?.auth_user_id ?? "",
    status: r.status, record_type: r.record_type, credibility: r.credibility ?? "",
    ai_vendor_1_result: r.ai_vendor_1_result ?? "", ai_vendor_1_score: r.ai_vendor_1_score ?? "",
    ai_vendor_2_result: r.ai_vendor_2_result ?? "", ai_vendor_3_result: r.ai_vendor_3_result ?? "",
    category: r.category ?? "", rating: r.rating ?? "", description: r.description ?? "",
    location: r.location ?? "", organization: r.organization ?? "", relationship: r.relationship ?? "",
    contributor_identity_preference: r.contributor_identity_preference, is_published: r.is_published,
    final_outcome: r.final_outcome ?? "", agree_terms: r.agree_terms,
    created_at: r.created_at ?? "", published_at: r.published_at ?? "", ai_completed_at: r.ai_completed_at ?? "",
    debate_started_at: r.debate_started_at ?? "", debate_ends_at: r.debate_ends_at ?? "",
    voting_started_at: r.voting_started_at ?? "", voting_ends_at: r.voting_ends_at ?? "",
    decision_started_at: r.decision_started_at ?? "", dispute_started_at: r.dispute_started_at ?? "",
    finalized_at: r.finalized_at ?? "", deleted_at: r.deleted_at ?? "",
    execution_ends_at: r.execution_ends_at ?? "",
  }));

  // Field definitions for each edit type
  const contentFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "record_type", label: "Record Type", type: "select", required: true, section: "Classification", options: RECORD_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })) },
    { key: "category", label: "Category", type: "text", required: true, section: "Classification" },
    { key: "rating", label: "Rating (0–10)", type: "number", section: "Classification", validate: (v) => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 10) ? "Rating must be between 0 and 10" : null },
    { key: "description", label: "Description", type: "textarea", required: true, section: "Content", help: "Main body of the record. What is being reported?" },
    { key: "location", label: "Location", type: "text", section: "Content" },
    { key: "organization", label: "Organization / Company", type: "text", section: "Content" },
    { key: "relationship", label: "Contributor's Relationship to Subject", type: "text", section: "Content", help: "e.g. Former employer, coworker, client" },
  ];

  const credFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Changing credibility affects how this record is displayed and sorted for all users. This is immediately visible." },
    { key: "credibility", label: "Credibility Label", type: "select", required: true, section: "AI Analysis", options: CREDS.map(c => ({ value: c, label: c })) },
    { key: "ai_completed_at", label: "AI Review Completed At", type: "datetime-local", section: "AI Analysis" },
    { key: "ai_vendor_1_result", label: "AI Vendor 1 — Result", type: "text", section: "AI Vendor Scores" },
    { key: "ai_vendor_1_score", label: "AI Vendor 1 — Score (0–1)", type: "number", section: "AI Vendor Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 1) ? "Score must be 0–1" : null },
    { key: "ai_vendor_2_result", label: "AI Vendor 2 — Result", type: "text", section: "AI Vendor Scores" },
    { key: "ai_vendor_3_result", label: "AI Vendor 3 — Result", type: "text", section: "AI Vendor Scores" },
  ];

  const identityFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "This controls whether the contributor's real name is shown. For Evidence-Based records: 'Yes' shows their real name, 'No' shows 'Somebody'. Opinion-Based always shows real name." },
    { key: "contributor_identity_preference", label: "Show contributor's real name", type: "boolean", required: true, help: "Yes = show real name publicly. No = show as 'Somebody'." },
    { key: "contributor_display_name", label: "Override Display Name", type: "text", help: "Optional. Leave blank to use the contributor's actual name." },
  ];

  const outcomeFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Overriding the final outcome changes what users see and may affect the subject's score. This is a significant action." },
    { key: "final_outcome", label: "Final Outcome", type: "select", required: true, options: [{ value: "sided_with_contributor", label: "✅ Sided with Contributor" }, { value: "sided_with_subject", label: "🔵 Sided with Subject" }] },
    { key: "finalized_at", label: "Finalized At", type: "datetime-local", required: true },
  ];

  const publishToggleFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: selected?.is_published ? "Unpublishing will hide this record from all public views immediately. The record will still exist in the database." : "Publishing will make this record visible to all users. Make sure AI review is complete." },
    { key: "is_published", label: selected?.is_published ? "Set to Unpublished" : "Set to Published", type: "boolean", required: true },
  ];

  const extendDebateFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "debate_ends_at", label: "New Debate End Date/Time", type: "datetime-local", required: true, help: `Current end: ${fmtDate(selected?.debate_ends_at)}. Must be in the future.`, validate: v => v && new Date(v) <= new Date() ? "Must be a future date" : null },
  ];

  const extendVotingFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "voting_ends_at", label: "New Voting End Date/Time", type: "datetime-local", required: true, help: `Current end: ${fmtDate(selected?.voting_ends_at)}. Must be in the future.`, validate: v => v && new Date(v) <= new Date() ? "Must be a future date" : null },
  ];

  const subjectFields: SmartField[] = [
    { key: "subject_uuid", label: "Subject UUID", type: "readonly" },
    { key: "subject_name", label: "Full Name", type: "text", required: true, section: "Identity" },
    { key: "subject_nickname", label: "Nickname / Also Known As", type: "text", section: "Identity" },
    { key: "subject_organization", label: "Organization", type: "text", section: "Details" },
    { key: "subject_location", label: "Location", type: "text", section: "Details" },
    { key: "subject_email", label: "Email Address", type: "email", section: "Contact", help: "The subject's contact email (not public).", validate: v => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Invalid email format" : null },
    { key: "subject_phone", label: "Phone Number", type: "text", section: "Contact" },
  ];

  const softDeleteFields: SmartField[] = [
    { key: "id", label: "Record ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Soft delete hides the record from all public views but keeps it in the database. The status will be reset to AI Verification and is_published set to false." },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Records</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} of {records.length} records — click any row to view all data and make changes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <CSVButton data={csvData} filename="dnounce-records" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject name, record ID, category, description, email…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All stages</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
        </select>
        <select value={credFilter} onChange={e => setCredFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All credibilities</option>
          {CREDS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading records…</div>
          : filtered.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No records found.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950">
                    {["Subject", "Record ID", "Stage", "Credibility", "Category", "Rating", "Location", "Deleted?", "Created", "Outcome", ""].map(h => (
                      <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => { setSelected(r); setShowHistory(false); }}
                      className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === r.id ? "bg-gray-800/70" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium text-sm leading-snug">{(r.subject as any)?.name ?? "—"}</div>
                        {(r.subject as any)?.organization && <div className="text-gray-500 text-[11px]">{(r.subject as any).organization}</div>}
                      </td>
                      <td className="px-4 py-3"><CopyID id={r.id} /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3"><CredBadge cred={r.credibility} /></td>
                      <td className="px-4 py-3 text-gray-300">{r.category || "—"}</td>
                      <td className="px-4 py-3 text-center text-white font-medium">{r.rating ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{r.location || "—"}</td>
                      <td className="px-4 py-3">{r.deleted_at ? <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-900 text-red-300 border-red-700">Deleted</span> : <span className="text-gray-600 text-[11px]">—</span>}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        {r.final_outcome
                          ? <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] border ${r.final_outcome === "sided_with_contributor" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{r.final_outcome === "sided_with_contributor" ? "✅ With Contributor" : "🔵 With Subject"}</span>
                          : <span className="text-gray-600 text-[11px]">Pending</span>}
                      </td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── Side Panel ─────────────────────────────────────────────────── */}
      {selected && !showHistory && (
        <SidePanel
          title={(selected.subject as any)?.name ?? "Record Detail"}
          subtitle={`Record ID: ${selected.id}`}
          onClose={() => setSelected(null)}
          actions={
            <div className="space-y-3">
              {/* Content edits */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Edit Record Data</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditModal({ record: selected, type: "content" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Content & Category</button>
                  <button onClick={() => setEditModal({ record: selected, type: "credibility" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">🏷️ Credibility & AI Scores</button>
                  <button onClick={() => setEditModal({ record: selected, type: "identity" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">👤 Identity Setting</button>
                  <button onClick={() => setEditModal({ record: { ...selected, subject_uuid: (selected.subject as any)?.subject_uuid, subject_name: (selected.subject as any)?.name, subject_nickname: (selected.subject as any)?.nickname, subject_organization: (selected.subject as any)?.organization, subject_location: (selected.subject as any)?.location, subject_email: (selected.subject as any)?.email, subject_phone: (selected.subject as any)?.phone }, type: "subject" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">🧑 Edit Subject Info</button>
                  <button onClick={() => setEditModal({ record: selected, type: "publish_toggle" })} className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${selected.is_published ? "bg-yellow-900/30 text-yellow-400 border-yellow-800 hover:bg-yellow-900/60" : "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/60"}`}>{selected.is_published ? "🔒 Unpublish" : "🌐 Publish"}</button>
                  {selected.status === "decision" && <button onClick={() => setEditModal({ record: selected, type: "outcome" })} className="px-3 py-2 rounded-xl bg-purple-900/30 text-purple-400 hover:bg-purple-900/60 text-xs font-medium border border-purple-800 transition">⚖️ Override Outcome</button>}
                  {selected.status === "debate" && <button onClick={() => setEditModal({ record: { ...selected, debate_ends_at: selected.debate_ends_at?.slice(0, 16) ?? "" }, type: "extend_debate" })} className="px-3 py-2 rounded-xl bg-orange-900/30 text-orange-400 hover:bg-orange-900/60 text-xs font-medium border border-orange-800 transition">⏱️ Extend Debate Window</button>}
                  {selected.status === "voting" && <button onClick={() => setEditModal({ record: { ...selected, voting_ends_at: selected.voting_ends_at?.slice(0, 16) ?? "" }, type: "extend_voting" })} className="px-3 py-2 rounded-xl bg-blue-900/30 text-blue-400 hover:bg-blue-900/60 text-xs font-medium border border-blue-800 transition">⏱️ Extend Voting Window</button>}
                </div>
              </div>
              {/* Stage change */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Change Stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.filter(s => s !== selected.status).map(s => (
                    <button key={s} onClick={() => setStageModal({ record: selected, target: s })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white text-[11px] font-medium border border-gray-700 transition">
                      <ArrowRightLeft className="w-3 h-3" />{STATUS_LABELS[s] ?? s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Danger zone */}
              <div>
                <div className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-2">Danger Zone</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setShowHistory(true)} className="px-3 py-2 rounded-xl bg-blue-900/30 text-blue-400 hover:bg-blue-900/60 text-xs font-medium border border-blue-800 transition">📋 Full Activity History</button>
                  <Link href={`/record/${selected.id}`} target="_blank" className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition text-center">👁️ View Live</Link>
                  {!selected.deleted_at
                    ? adminLevel >= 1 && <button onClick={() => setEditModal({ record: selected, type: "soft_delete" })} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 text-xs font-medium border border-red-800 transition col-span-2">🗑️ Soft Delete Record</button>
                    : adminLevel >= 2 && <button onClick={() => saveEdit({ id: selected.id }, "Admin restored deleted record", "restore")} className="px-3 py-2 rounded-xl bg-green-900/30 text-green-400 hover:bg-green-900/60 text-xs font-medium border border-green-800 transition col-span-2">♻️ Restore Deleted Record</button>
                  }
                </div>
              </div>
            </div>
          }>
          <DetailSection title="Subject Information">
            <DetailRow label="Full Name" value={(selected.subject as any)?.name} />
            <DetailRow label="Nickname" value={(selected.subject as any)?.nickname} />
            <DetailRow label="Organization" value={(selected.subject as any)?.organization} />
            <DetailRow label="Location" value={(selected.subject as any)?.location} />
            <DetailRow label="Email" value={(selected.subject as any)?.email} copyable />
            <DetailRow label="Phone" value={(selected.subject as any)?.phone} copyable />
            <DetailRow label="Subject UUID" value={(selected.subject as any)?.subject_uuid} mono copyable />
            <DetailRow label="Subject Owner ID" value={(selected.subject as any)?.owner_auth_user_id} mono copyable />
          </DetailSection>

          <DetailSection title="Contributor">
            <DetailRow label="Contributor ID" value={selected.contributor_id} mono copyable />
            <DetailRow label="Auth User ID" value={(selected.contributor as any)?.auth_user_id} mono copyable />
            <DetailRow label="Alias" value={(selected.contributor as any)?.alias} />
            <DetailRow label="Display Name" value={selected.contributor_display_name} />
            <DetailRow label="Identity Preference" value={selected.contributor_identity_preference ? "Show real name publicly" : "Anonymous (shown as 'Somebody')"} />
          </DetailSection>

          <DetailSection title="Record Details">
            <DetailRow label="Record ID" value={selected.id} mono copyable />
            <DetailRow label="UID" value={selected.uid} mono copyable />
            <DetailRow label="Record Type" value={selected.record_type} />
            <DetailRow label="Current Stage" value={STATUS_LABELS[selected.status] ?? selected.status} />
            <DetailRow label="Credibility" value={selected.credibility} />
            <DetailRow label="Category" value={selected.category} />
            <DetailRow label="Rating (0–10)" value={selected.rating} />
            <DetailRow label="Relationship to Subject" value={selected.relationship} />
            <DetailRow label="Location" value={selected.location} />
            <DetailRow label="Organization" value={selected.organization} />
            <DetailRow label="Description" value={selected.description} />
            <DetailRow label="Is Published" value={selected.is_published} highlight={selected.is_published ? "green" : "red"} />
            <DetailRow label="Agreed to Terms" value={selected.agree_terms} />
            <DetailRow label="Final Outcome" value={selected.final_outcome} highlight={selected.final_outcome === "sided_with_contributor" ? "green" : selected.final_outcome === "sided_with_subject" ? "blue" : undefined} />
            <DetailRow label="Deleted At" value={fmtDate(selected.deleted_at)} highlight={selected.deleted_at ? "red" : undefined} />
          </DetailSection>

          <DetailSection title="AI Analysis" defaultOpen={false}>
            <DetailRow label="Credibility Label" value={selected.credibility} />
            <DetailRow label="AI Vendor 1 — Result" value={selected.ai_vendor_1_result} />
            <DetailRow label="AI Vendor 1 — Score" value={selected.ai_vendor_1_score} />
            <DetailRow label="AI Vendor 2 — Result" value={selected.ai_vendor_2_result} />
            <DetailRow label="AI Vendor 3 — Result" value={selected.ai_vendor_3_result} />
            <DetailRow label="AI Completed At" value={fmtDate(selected.ai_completed_at)} />
          </DetailSection>

          <DetailSection title="Timeline — All Timestamps" defaultOpen={false}>
            <DetailRow label="Created At" value={fmtDate(selected.created_at)} />
            <DetailRow label="Published At" value={fmtDate(selected.published_at)} />
            <DetailRow label="Dispute Started" value={fmtDate(selected.dispute_started_at)} />
            <DetailRow label="Debate Started" value={fmtDate(selected.debate_started_at)} />
            <DetailRow label="Debate Ends" value={fmtDate(selected.debate_ends_at)} />
            <DetailRow label="Voting Started" value={fmtDate(selected.voting_started_at)} />
            <DetailRow label="Voting Ends" value={fmtDate(selected.voting_ends_at)} />
            <DetailRow label="Decision Made" value={fmtDate(selected.decision_made_at)} />
            <DetailRow label="Decision Started" value={fmtDate(selected.decision_started_at)} />
            <DetailRow label="Finalized At" value={fmtDate(selected.finalized_at)} />
            <DetailRow label="Execution Ends" value={fmtDate(selected.execution_ends_at)} />
            <DetailRow label="Deleted At" value={fmtDate(selected.deleted_at)} />
          </DetailSection>

          <DetailSection title="Internal / System IDs" defaultOpen={false}>
            <DetailRow label="Record ID" value={selected.id} mono copyable />
            <DetailRow label="UID" value={selected.uid} mono copyable />
            <DetailRow label="Subject ID" value={selected.subject_id} mono copyable />
            <DetailRow label="Contributor ID" value={selected.contributor_id} mono copyable />
            <DetailRow label="Created By (Auth)" value={selected.created_by} mono copyable />
            <DetailRow label="Contributor Alias ID" value={selected.contributor_alias_id} mono copyable />
          </DetailSection>
        </SidePanel>
      )}

      {showHistory && selected && <RecordHistoryPanel recordId={selected.id} onClose={() => setShowHistory(false)} />}

      {stageModal && (
        <StageChangeModal
          currentStatus={stageModal.record.status}
          targetStatus={stageModal.target}
          onSave={(data, note) => applyStageChange(stageModal.record, stageModal.target, data, note)}
          onClose={() => setStageModal(null)}
        />
      )}

      {editModal && (
        <SmartEditModal
          title={
            editModal.type === "content" ? "Edit Record Content" :
            editModal.type === "credibility" ? "Override Credibility & AI Scores" :
            editModal.type === "identity" ? "Contributor Identity Setting" :
            editModal.type === "outcome" ? "Override Final Outcome" :
            editModal.type === "publish_toggle" ? (selected?.is_published ? "Unpublish Record" : "Publish Record") :
            editModal.type === "extend_debate" ? "Extend Debate Window" :
            editModal.type === "extend_voting" ? "Extend Voting Window" :
            editModal.type === "soft_delete" ? "Soft Delete Record" :
            editModal.type === "subject" ? "Edit Subject Information" : "Edit Record"
          }
          subtitle={`Record ID: ${editModal.record.id?.slice(0, 8)}…`}
          data={editModal.record}
          fields={
            editModal.type === "content" ? contentFields :
            editModal.type === "credibility" ? credFields :
            editModal.type === "identity" ? identityFields :
            editModal.type === "outcome" ? outcomeFields :
            editModal.type === "publish_toggle" ? publishToggleFields :
            editModal.type === "extend_debate" ? extendDebateFields :
            editModal.type === "extend_voting" ? extendVotingFields :
            editModal.type === "soft_delete" ? softDeleteFields :
            editModal.type === "subject" ? subjectFields : contentFields
          }
          confirmText={editModal.type === "soft_delete" ? "DELETE" : undefined}
          danger={editModal.type === "soft_delete"}
          onSave={(updated, note) => saveEdit(updated, note, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
