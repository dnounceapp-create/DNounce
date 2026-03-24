"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";
import UserHistoryPanel from "./UserHistoryPanel";

const LEVEL_LABELS: Record<number, string> = { 0: "Regular User", 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };
const LEVEL_COLORS: Record<number, string> = { 0: "bg-gray-800 text-gray-400 border-gray-700", 1: "bg-blue-900 text-blue-300 border-blue-700", 2: "bg-purple-900 text-purple-300 border-purple-700", 3: "bg-red-900 text-red-300 border-red-700" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBanned, setFilterBanned] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editModal, setEditModal] = useState<{ user: any; type: string } | null>(null);
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
    const [usersRes, acctsRes, adminRolesRes, scoresRes, bansRes, socialRes, prefsRes] = await Promise.all([
      supabase.from("users").select("id,auth_user_id,is_banned,admin,created_at,onboarding_complete,personal_category,subject_id,contributor_id,updated_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_accountdetails").select("user_id,first_name,last_name,job_title,organization,location,nickname,phone,email,avatar_url,created_at,updated_at"),
      supabase.from("admin_roles").select("user_id,level,created_at,assigned_by").eq("is_active", true),
      supabase.from("user_scores").select("user_id,subject_score,contributor_score,voter_score,citizen_score,overall_score,updated_at"),
      supabase.from("user_bans").select("user_id,id,reason,is_permanent,expires_at,created_at,is_active,revoked_at,banned_by").eq("is_active", true),
      supabase.from("user_social_links").select("user_id,platform,label,url,id"),
      supabase.from("user_preferences").select("user_id,language,theme,font_size,reduce_motion,notif_email,notif_push,updated_at"),
    ]);
    const acctMap: Record<string, any> = {}; (acctsRes.data ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });
    const adminMap: Record<string, number> = {}; (adminRolesRes.data ?? []).forEach((r: any) => { adminMap[r.user_id] = r.level; });
    const scoreMap: Record<string, any> = {}; (scoresRes.data ?? []).forEach((s: any) => { scoreMap[s.user_id] = s; });
    const banMap: Record<string, any> = {}; (bansRes.data ?? []).forEach((b: any) => { banMap[b.user_id] = b; });
    const socialMap: Record<string, any[]> = {}; (socialRes.data ?? []).forEach((s: any) => { if (!socialMap[s.user_id]) socialMap[s.user_id] = []; socialMap[s.user_id].push(s); });
    const prefsMap: Record<string, any> = {}; (prefsRes.data ?? []).forEach((p: any) => { prefsMap[p.user_id] = p; });
    const merged = (usersRes.data ?? []).map((u: any) => {
      const a = acctMap[u.auth_user_id] ?? {}; const s = scoreMap[u.auth_user_id] ?? {};
      return { ...u, ...a, admin_level: adminMap[u.auth_user_id] ?? 0, ...s, active_ban: banMap[u.auth_user_id] ?? null, social_links: socialMap[u.auth_user_id] ?? [], prefs: prefsMap[u.auth_user_id] ?? null };
    });
    setUsers(merged); setLoading(false);
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();

    if (type === "profile") {
      const { error } = await supabase.from("user_accountdetails").update({
        first_name: updated.first_name, last_name: updated.last_name,
        nickname: updated.nickname || null, job_title: updated.job_title,
        organization: updated.organization || null, location: updated.location || null,
        phone: updated.phone || null,
      }).eq("user_id", updated.auth_user_id);
      if (error) throw error;
    }

    if (type === "account") {
      await supabase.from("users").update({
        personal_category: updated.personal_category || null,
        onboarding_complete: updated.onboarding_complete === true || updated.onboarding_complete === "true",
      }).eq("auth_user_id", updated.auth_user_id);
    }

    if (type === "scores") {
      const { error } = await supabase.from("user_scores").upsert({
        user_id: updated.auth_user_id,
        subject_score: updated.subject_score !== "" ? Number(updated.subject_score) : null,
        contributor_score: updated.contributor_score !== "" ? Number(updated.contributor_score) : null,
        voter_score: updated.voter_score !== "" ? Number(updated.voter_score) : null,
        citizen_score: updated.citizen_score !== "" ? Number(updated.citizen_score) : null,
        overall_score: updated.overall_score !== "" ? Number(updated.overall_score) : null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    if (type === "preferences") {
      await supabase.from("user_preferences").upsert({
        user_id: updated.auth_user_id,
        language: updated.language, theme: updated.theme, font_size: updated.font_size,
        reduce_motion: updated.reduce_motion === true || updated.reduce_motion === "true",
        notif_email: updated.notif_email === true || updated.notif_email === "true",
        notif_push: updated.notif_push === true || updated.notif_push === "true",
        updated_at: new Date().toISOString(),
      });
    }

    if (type === "ban") {
      const expiresAt = (updated.is_permanent === true || updated.is_permanent === "true") ? null : updated.expires_at ? new Date(updated.expires_at).toISOString() : null;
      if (!updated.reason?.trim()) throw new Error("Ban reason is required");
      // Revoke any existing ban
      if (selected?.active_ban) await supabase.from("user_bans").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", updated.auth_user_id).eq("is_active", true);
      const { error } = await supabase.from("user_bans").insert({ user_id: updated.auth_user_id, banned_by: session!.user.id, reason: updated.reason, is_permanent: updated.is_permanent === true || updated.is_permanent === "true", expires_at: expiresAt });
      if (error) throw error;
      await supabase.from("users").update({ is_banned: true }).eq("auth_user_id", updated.auth_user_id);
    }

    if (type === "edit_ban") {
      if (!updated.active_ban_id) throw new Error("No active ban found");
      const { error } = await supabase.from("user_bans").update({
        reason: updated.reason,
        is_permanent: updated.is_permanent === true || updated.is_permanent === "true",
        expires_at: (updated.is_permanent === true || updated.is_permanent === "true") ? null : updated.expires_at ? new Date(updated.expires_at).toISOString() : null,
      }).eq("id", updated.active_ban_id);
      if (error) throw error;
    }

    if (type === "unban") {
      await supabase.from("user_bans").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", updated.auth_user_id).eq("is_active", true);
      await supabase.from("users").update({ is_banned: false }).eq("auth_user_id", updated.auth_user_id);
    }

    if (type === "admin_role") {
      if (adminLevel < 3) throw new Error("Only Super Admins can change admin roles");
      if (updated.auth_user_id === myUserId) throw new Error("You cannot change your own admin role");
      const newLevel = Number(updated.new_admin_level);
      await supabase.from("admin_roles").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", updated.auth_user_id).eq("is_active", true);
      if (newLevel > 0) await supabase.from("admin_roles").insert({ user_id: updated.auth_user_id, level: newLevel, assigned_by: session!.user.id });
      await supabase.from("users").update({ admin: newLevel > 0 }).eq("auth_user_id", updated.auth_user_id);
    }

    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: `edit_user_${type}`, target_type: "users", target_id: updated.auth_user_id, new_value: { ...updated, note } });
    showToast("success", "User updated");
    await load();
    setSelected(null);
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
    const m = !search || name.includes(q) || u.auth_user_id?.includes(q) || u.email?.toLowerCase().includes(q) || u.job_title?.toLowerCase().includes(q) || u.organization?.toLowerCase().includes(q) || u.location?.toLowerCase().includes(q);
    const bMatch = filterBanned === "all" || (filterBanned === "banned" ? u.is_banned : !u.is_banned);
    const lMatch = filterLevel === "all" || String(u.admin_level) === filterLevel;
    return m && bMatch && lMatch;
  });

  const csvData = filtered.map(u => ({ auth_user_id: u.auth_user_id, first_name: u.first_name ?? "", last_name: u.last_name ?? "", nickname: u.nickname ?? "", email: u.email ?? "", phone: u.phone ?? "", job_title: u.job_title ?? "", organization: u.organization ?? "", location: u.location ?? "", personal_category: u.personal_category ?? "", is_banned: u.is_banned, admin: u.admin, admin_level: u.admin_level, onboarding_complete: u.onboarding_complete, subject_score: u.subject_score ?? "", contributor_score: u.contributor_score ?? "", voter_score: u.voter_score ?? "", citizen_score: u.citizen_score ?? "", overall_score: u.overall_score ?? "", scores_updated: u.updated_at ?? "", joined: u.created_at ?? "" }));

  // Field configs
  const profileFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "first_name", label: "First Name", type: "text", required: true, section: "Name" },
    { key: "last_name", label: "Last Name", type: "text", required: true, section: "Name" },
    { key: "nickname", label: "Nickname / Display Name", type: "text", section: "Name" },
    { key: "job_title", label: "Job Title / Category", type: "text", required: true, section: "Professional" },
    { key: "organization", label: "Organization / Company", type: "text", section: "Professional" },
    { key: "location", label: "Location", type: "text", section: "Professional" },
    { key: "phone", label: "Phone Number", type: "text", section: "Contact" },
  ];
  const accountFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "personal_category", label: "Personal Category", type: "text", help: "The user's selected personal category during onboarding." },
    { key: "onboarding_complete", label: "Onboarding Complete", type: "boolean", required: true, help: "If No, the user will see the onboarding flow on next login." },
  ];
  const scoreFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Manually overriding scores bypasses the automatic scoring engine. Only do this to correct an error. Document your reason carefully." },
    { key: "subject_score", label: "Subject Score (0–100)", type: "number", section: "Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 100) ? "Must be 0–100" : null },
    { key: "contributor_score", label: "Contributor Score (0–100)", type: "number", section: "Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 100) ? "Must be 0–100" : null },
    { key: "voter_score", label: "Voter Score (0–100)", type: "number", section: "Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 100) ? "Must be 0–100" : null },
    { key: "citizen_score", label: "Citizen Score (0–100)", type: "number", section: "Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 100) ? "Must be 0–100" : null },
    { key: "overall_score", label: "Overall Score (0–100)", type: "number", section: "Scores", validate: v => v !== "" && v !== null && (Number(v) < 0 || Number(v) > 100) ? "Must be 0–100" : null },
  ];
  const prefsFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "language", label: "Language", type: "select", options: [{ value: "en", label: "English" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }], section: "Display" },
    { key: "theme", label: "Theme", type: "select", options: [{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }], section: "Display" },
    { key: "font_size", label: "Font Size", type: "select", options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], section: "Display" },
    { key: "reduce_motion", label: "Reduce Motion", type: "boolean", section: "Display" },
    { key: "notif_email", label: "Email Notifications", type: "boolean", section: "Notifications" },
    { key: "notif_push", label: "Push Notifications", type: "boolean", section: "Notifications" },
  ];
  const banFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Banning this user prevents them from logging in and using DNounce. They will be notified." },
    { key: "reason", label: "Reason for Ban", type: "textarea", required: true, help: "Be specific. This is logged and visible to all admins and may be referenced if the user appeals." },
    { key: "is_permanent", label: "Permanent Ban?", type: "boolean", required: true, help: "Permanent bans do not expire. Only Super Admins should issue permanent bans." },
    { key: "expires_at", label: "Expires At (if temporary)", type: "datetime-local", showIf: f => f.is_permanent === false || f.is_permanent === "false", validate: (v, f) => !v && (f.is_permanent === false || f.is_permanent === "false") ? "Required for temporary bans" : null },
  ];
  const editBanFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "active_ban_id", label: "Ban Record ID", type: "readonly" },
    { key: "reason", label: "Reason", type: "textarea", required: true },
    { key: "is_permanent", label: "Permanent?", type: "boolean", required: true },
    { key: "expires_at", label: "New Expiry Date", type: "datetime-local", showIf: f => f.is_permanent === false || f.is_permanent === "false" },
  ];
  const adminRoleFields: SmartField[] = [
    { key: "auth_user_id", label: "User ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Admin role changes take effect immediately. The user will have new permissions on their next page load. Only Super Admins (Level 3) can perform this action." },
    { key: "new_admin_level", label: "New Admin Level", type: "select", required: true, options: [{ value: "0", label: "0 — Regular User (remove all admin access)" }, { value: "1", label: "1 — Support Agent (manage tickets, records)" }, { value: "2", label: "2 — Moderator (+ ban users, manage badges)" }, { value: "3", label: "3 — Super Admin (full access, manage other admins)" }] },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Users</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {users.length} users — click any row to view full profile and make changes</p></div>
        <div className="flex gap-2"><CSVButton data={csvData} filename="dnounce-users" /><button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, user ID, job title, organization…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={filterBanned} onChange={e => setFilterBanned(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All statuses</option><option value="active">Active only</option><option value="banned">Banned only</option></select>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All roles</option><option value="0">Regular Users</option><option value="1">Support Agents</option><option value="2">Moderators</option><option value="3">Super Admins</option></select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading users…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950">{["Name", "User ID", "Email", "Job Title", "Organization", "Admin Role", "Status", "Subject Score", "Overall Score", "Joined", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(u => {
                  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
                  return (
                    <tr key={u.id} onClick={() => { setSelected(u); setShowHistory(false); }} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.auth_user_id === u.auth_user_id ? "bg-gray-800/70" : ""}`}>
                      <td className="px-4 py-3"><div className="text-white font-medium text-sm">{name}</div>{u.nickname && <div className="text-gray-500 text-[11px]">@{u.nickname}</div>}</td>
                      <td className="px-4 py-3"><CopyID id={u.auth_user_id} /></td>
                      <td className="px-4 py-3 text-gray-400">{u.email || "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{u.job_title || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{u.organization || "—"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${LEVEL_COLORS[u.admin_level ?? 0]}`}>{LEVEL_LABELS[u.admin_level ?? 0]}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${u.is_banned ? "bg-red-900 text-red-300 border-red-700" : "bg-green-900 text-green-300 border-green-700"}`}>{u.is_banned ? "Banned" : "Active"}</span></td>
                      <td className="px-4 py-3 text-center text-white font-medium">{u.subject_score ?? "—"}</td>
                      <td className="px-4 py-3 text-center text-white font-bold">{u.overall_score ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && !showHistory && (
        <SidePanel title={`${selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim() || "User Profile"} subtitle={selected.auth_user_id} onClose={() => setSelected(null)}
          actions={
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Edit User Data</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditModal({ user: selected, type: "profile" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Edit Profile</button>
                  <button onClick={() => setEditModal({ user: selected, type: "account" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">⚙️ Account Settings</button>
                  <button onClick={() => setEditModal({ user: selected, type: "scores" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">📊 Override Scores</button>
                  <button onClick={() => setEditModal({ user: { ...selected, language: selected.prefs?.language ?? "en", theme: selected.prefs?.theme ?? "system", font_size: selected.prefs?.font_size ?? "medium", reduce_motion: selected.prefs?.reduce_motion ?? false, notif_email: selected.prefs?.notif_email ?? true, notif_push: selected.prefs?.notif_push ?? false }, type: "preferences" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">🔔 Notification Prefs</button>
                  {adminLevel >= 3 && selected.auth_user_id !== myUserId && <button onClick={() => setEditModal({ user: { ...selected, new_admin_level: String(selected.admin_level ?? 0) }, type: "admin_role" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition col-span-2">🛡️ Change Admin Role</button>}
                </div>
              </div>
              {adminLevel >= 2 && selected.auth_user_id !== myUserId && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Ban Management</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.is_banned ? (
                      <>
                        <button onClick={() => setEditModal({ user: { ...selected, active_ban_id: selected.active_ban?.id, reason: selected.active_ban?.reason, is_permanent: selected.active_ban?.is_permanent, expires_at: selected.active_ban?.expires_at?.slice(0, 16) ?? "" }, type: "edit_ban" })} className="px-3 py-2 rounded-xl bg-orange-900/30 text-orange-400 hover:bg-orange-900/60 text-xs font-medium border border-orange-800 transition">✏️ Edit Ban</button>
                        <button onClick={() => setEditModal({ user: selected, type: "unban" })} className="px-3 py-2 rounded-xl bg-green-900/30 text-green-400 hover:bg-green-900/60 text-xs font-medium border border-green-800 transition">✅ Unban User</button>
                      </>
                    ) : (
                      <button onClick={() => setEditModal({ user: { ...selected, is_permanent: false, expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) }, type: "ban" })} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 text-xs font-medium border border-red-800 transition col-span-2">🚫 Ban User</button>
                    )}
                  </div>
                </div>
              )}
              <button onClick={() => setShowHistory(true)} className="w-full px-3 py-2 rounded-xl bg-blue-900/30 text-blue-400 hover:bg-blue-900/60 text-xs font-medium border border-blue-800 transition">📋 View Full Activity History</button>
            </div>
          }>
          <DetailSection title="Identity">
            <DetailRow label="Auth User ID" value={selected.auth_user_id} mono copyable />
            <DetailRow label="First Name" value={selected.first_name} />
            <DetailRow label="Last Name" value={selected.last_name} />
            <DetailRow label="Nickname" value={selected.nickname} />
            <DetailRow label="Email" value={selected.email} copyable />
            <DetailRow label="Phone" value={selected.phone} copyable />
          </DetailSection>
          <DetailSection title="Professional">
            <DetailRow label="Job Title / Category" value={selected.job_title} />
            <DetailRow label="Organization" value={selected.organization} />
            <DetailRow label="Location" value={selected.location} />
            <DetailRow label="Personal Category" value={selected.personal_category} />
          </DetailSection>
          <DetailSection title="Account Status">
            <DetailRow label="Admin Role" value={LEVEL_LABELS[selected.admin_level ?? 0]} />
            <DetailRow label="Is Banned" value={selected.is_banned} highlight={selected.is_banned ? "red" : "green"} />
            <DetailRow label="Onboarding Complete" value={selected.onboarding_complete} />
            {selected.active_ban && <>
              <DetailRow label="Ban Reason" value={selected.active_ban.reason} />
              <DetailRow label="Ban Type" value={selected.active_ban.is_permanent ? "Permanent" : "Temporary"} highlight="red" />
              <DetailRow label="Ban Expires" value={fmtDate(selected.active_ban.expires_at)} />
              <DetailRow label="Banned At" value={fmtDate(selected.active_ban.created_at)} />
            </>}
          </DetailSection>
          <DetailSection title="Scores">
            <DetailRow label="Subject Score" value={selected.subject_score} />
            <DetailRow label="Contributor Score" value={selected.contributor_score} />
            <DetailRow label="Voter Score" value={selected.voter_score} />
            <DetailRow label="Citizen Score" value={selected.citizen_score} />
            <DetailRow label="Overall Score" value={selected.overall_score} />
            <DetailRow label="Scores Last Updated" value={fmtDate(selected.updated_at)} />
          </DetailSection>
          <DetailSection title="Preferences" defaultOpen={false}>
            <DetailRow label="Language" value={selected.prefs?.language} />
            <DetailRow label="Theme" value={selected.prefs?.theme} />
            <DetailRow label="Font Size" value={selected.prefs?.font_size} />
            <DetailRow label="Reduce Motion" value={selected.prefs?.reduce_motion} />
            <DetailRow label="Email Notifications" value={selected.prefs?.notif_email} />
            <DetailRow label="Push Notifications" value={selected.prefs?.notif_push} />
            <DetailRow label="Prefs Updated" value={fmtDate(selected.prefs?.updated_at)} />
          </DetailSection>
          {selected.social_links?.length > 0 && <DetailSection title="Social Links" defaultOpen={false}>
            {selected.social_links.map((s: any, i: number) => <DetailRow key={i} label={s.platform} value={s.url} copyable />)}
          </DetailSection>}
          <DetailSection title="Platform IDs" defaultOpen={false}>
            <DetailRow label="Internal User ID" value={selected.id} mono copyable />
            <DetailRow label="Auth User ID" value={selected.auth_user_id} mono copyable />
            <DetailRow label="Subject ID" value={selected.subject_id} mono copyable />
            <DetailRow label="Contributor ID" value={selected.contributor_id} mono copyable />
          </DetailSection>
          <DetailSection title="Timestamps" defaultOpen={false}>
            <DetailRow label="Joined" value={fmtDate(selected.created_at)} />
            <DetailRow label="Last Updated" value={fmtDate(selected.updated_at)} />
          </DetailSection>
        </SidePanel>
      )}

      {showHistory && selected && <UserHistoryPanel userId={selected.auth_user_id} onClose={() => setShowHistory(false)} />}

      {editModal && (
        <SmartEditModal
          title={
            editModal.type === "profile" ? "Edit Profile" :
            editModal.type === "account" ? "Account Settings" :
            editModal.type === "scores" ? "Override Scores" :
            editModal.type === "preferences" ? "Notification Preferences" :
            editModal.type === "ban" ? "Ban User" :
            editModal.type === "edit_ban" ? "Edit Existing Ban" :
            editModal.type === "unban" ? "Confirm Unban" :
            editModal.type === "admin_role" ? "Change Admin Role" : "Edit User"
          }
          subtitle={`${editModal.user.first_name ?? ""} ${editModal.user.last_name ?? ""}`.trim() || editModal.user.auth_user_id?.slice(0, 8) + "…"}
          data={editModal.user}
          fields={
            editModal.type === "profile" ? profileFields :
            editModal.type === "account" ? accountFields :
            editModal.type === "scores" ? scoreFields :
            editModal.type === "preferences" ? prefsFields :
            editModal.type === "ban" ? banFields :
            editModal.type === "edit_ban" ? editBanFields :
            editModal.type === "unban" ? [{ key: "auth_user_id", label: "User ID", type: "readonly" as const }, { key: "_warn", type: "warning" as const, label: "", help: "This will immediately restore the user's access to DNounce and revoke their active ban." }] :
            editModal.type === "admin_role" ? adminRoleFields :
            profileFields
          }
          warning={editModal.type === "unban" ? undefined : undefined}
          danger={editModal.type === "ban" || editModal.type === "admin_role"}
          onSave={(updated, note) => saveEdit(updated, note, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
