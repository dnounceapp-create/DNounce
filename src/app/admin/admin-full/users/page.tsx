"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Ban, ShieldCheck, History, Pencil } from "lucide-react";
import UserHistoryPanel from "./UserHistoryPanel";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const ADMIN_LEVEL_LABELS: Record<number, string> = { 0: "User", 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };
const ADMIN_LEVEL_COLORS: Record<number, string> = { 0: "bg-gray-800 text-gray-400", 1: "bg-blue-900 text-blue-400", 2: "bg-purple-900 text-purple-400", 3: "bg-red-900 text-red-400" };

const USER_EDIT_FIELDS = [
  { key: "auth_user_id", label: "Auth User ID", readOnly: true },
  { key: "first_name", label: "First Name", type: "text" as const },
  { key: "last_name", label: "Last Name", type: "text" as const },
  { key: "job_title", label: "Job Title / Category", type: "text" as const },
  { key: "organization", label: "Organization", type: "text" as const },
  { key: "location", label: "Location", type: "text" as const },
  { key: "bio", label: "Bio", type: "textarea" as const },
  { key: "is_banned", label: "Is Banned", type: "boolean" as const },
  { key: "admin", label: "Is Admin", type: "boolean" as const },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adminLevel, setAdminLevel] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [banModal, setBanModal] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banPermanent, setBanPermanent] = useState(false);
  const [banDays, setBanDays] = useState("7");

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
    const [usersRes, acctsRes, adminRolesRes, scoresRes, bansRes] = await Promise.all([
      supabase.from("users").select("id, auth_user_id, is_banned, admin, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_accountdetails").select("user_id, first_name, last_name, job_title, organization, location, bio, avatar_url, created_at"),
      supabase.from("admin_roles").select("user_id, level").eq("is_active", true),
      supabase.from("user_scores").select("user_id, subject_score, contributor_score, voter_score, citizen_score, overall_score, updated_at"),
      supabase.from("user_bans").select("user_id, is_active").eq("is_active", true),
    ]);

    const acctMap: Record<string, any> = {};
    (acctsRes.data ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });
    const adminMap: Record<string, number> = {};
    (adminRolesRes.data ?? []).forEach((r: any) => { adminMap[r.user_id] = r.level; });
    const scoreMap: Record<string, any> = {};
    (scoresRes.data ?? []).forEach((s: any) => { scoreMap[s.user_id] = s; });
    const bannedSet = new Set((bansRes.data ?? []).map((b: any) => b.user_id));

    const merged = (usersRes.data ?? []).map((u: any) => {
      const a = acctMap[u.auth_user_id] ?? {};
      const s = scoreMap[u.auth_user_id] ?? {};
      return { ...u, ...a, admin_level: adminMap[u.auth_user_id] ?? 0, ...s, has_active_ban: bannedSet.has(u.auth_user_id) };
    });
    setUsers(merged);
    setLoading(false);
  }

  async function saveUser(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("user_accountdetails").update({
      first_name: updated.first_name, last_name: updated.last_name,
      job_title: updated.job_title, organization: updated.organization,
      location: updated.location, bio: updated.bio,
    }).eq("user_id", updated.auth_user_id);
    if (error) throw error;
    await supabase.from("users").update({ is_banned: updated.is_banned, admin: updated.admin }).eq("auth_user_id", updated.auth_user_id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_user", target_type: "users", target_id: updated.auth_user_id, new_value: updated });
    showToast("success", "User updated");
    await load();
  }

  async function banUser() {
    if (!banModal || !banReason.trim()) return;
    setActionLoading(banModal.userId);
    const { data: { session } } = await supabase.auth.getSession();
    const expiresAt = banPermanent ? null : new Date(Date.now() + Number(banDays) * 86400000).toISOString();
    await supabase.from("user_bans").insert({ user_id: banModal.userId, banned_by: session!.user.id, reason: banReason, is_permanent: banPermanent, expires_at: expiresAt });
    await supabase.from("users").update({ is_banned: true }).eq("auth_user_id", banModal.userId);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: banPermanent ? "permanent_ban" : "temporary_ban", target_type: "users", target_id: banModal.userId, new_value: { reason: banReason, expires_at: expiresAt } });
    showToast("success", `${banModal.name} banned`);
    setBanModal(null); setBanReason("");
    await load(); setActionLoading(null);
  }

  async function unbanUser(userId: string, name: string) {
    setActionLoading(userId);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("user_bans").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("is_active", true);
    await supabase.from("users").update({ is_banned: false }).eq("auth_user_id", userId);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "unban_user", target_type: "users", target_id: userId });
    showToast("success", `${name} unbanned`);
    await load(); setActionLoading(null);
  }

  async function setAdminRole(userId: string, level: number) {
    if (adminLevel < 3) { showToast("error", "Only Super Admins can manage admin roles."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("admin_roles").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("is_active", true);
    if (level > 0) await supabase.from("admin_roles").insert({ user_id: userId, level, assigned_by: session!.user.id });
    await supabase.from("users").update({ admin: level > 0 }).eq("auth_user_id", userId);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: level === 0 ? "revoke_admin" : "assign_admin", target_type: "users", target_id: userId, new_value: { level } });
    showToast("success", level === 0 ? "Admin role revoked" : `Assigned level ${level}`);
    await load();
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
    return name.includes(q) || u.auth_user_id?.includes(q) || u.job_title?.toLowerCase().includes(q) || u.organization?.toLowerCase().includes(q) || u.location?.toLowerCase().includes(q);
  });

  const csvData = filtered.map(u => ({
    auth_user_id: u.auth_user_id, first_name: u.first_name ?? "", last_name: u.last_name ?? "",
    job_title: u.job_title ?? "", organization: u.organization ?? "", location: u.location ?? "",
    bio: u.bio ?? "", is_banned: u.is_banned, admin: u.admin, admin_level: u.admin_level,
    subject_score: u.subject_score ?? "", contributor_score: u.contributor_score ?? "",
    voter_score: u.voter_score ?? "", citizen_score: u.citizen_score ?? "", overall_score: u.overall_score ?? "",
    scores_updated_at: u.updated_at ?? "", created_at: u.created_at ?? "", account_created_at: u.created_at ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} of {users.length} users</p>
        </div>
        <div className="flex gap-2">
          <CSVButton data={csvData} filename="dnounce-users" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, user ID, job title, organization, location…"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950">
                  {["Auth User ID","Name","Job Title","Organization","Location","Admin Role","Status","Subject Score","Contributor Score","Voter Score","Citizen Score","Overall Score","Scores Updated","Joined","Actions"].map(h => (
                    <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(u => {
                  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
                  const isSelf = u.auth_user_id === myUserId;
                  return (
                    <tr key={u.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-3 py-2.5"><Cell val={u.auth_user_id} mono /></td>
                      <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">{name}</td>
                      <td className="px-3 py-2.5"><Cell val={u.job_title} /></td>
                      <td className="px-3 py-2.5"><Cell val={u.organization} /></td>
                      <td className="px-3 py-2.5"><Cell val={u.location} /></td>
                      <td className="px-3 py-2.5">
                        {adminLevel >= 3 && !isSelf ? (
                          <select value={u.admin_level ?? 0} onChange={e => setAdminRole(u.auth_user_id, Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white outline-none">
                            {[0,1,2,3].map(l => <option key={l} value={l}>{ADMIN_LEVEL_LABELS[l]}</option>)}
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${ADMIN_LEVEL_COLORS[u.admin_level ?? 0]}`}>{ADMIN_LEVEL_LABELS[u.admin_level ?? 0]}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${u.is_banned ? "bg-red-900 text-red-400" : "bg-green-900 text-green-400"}`}>{u.is_banned ? "Banned" : "Active"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-white">{u.subject_score ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-white">{u.contributor_score ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-white">{u.voter_score ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-white">{u.citizen_score ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-white font-semibold">{u.overall_score ?? "—"}</td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(u.updated_at)}</td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditUser(u)} title="Edit" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setSelectedUserId(u.auth_user_id)} title="Full profile" className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-blue-400 transition"><History className="w-3.5 h-3.5" /></button>
                          {adminLevel >= 2 && !isSelf && (u.is_banned
                            ? <button onClick={() => unbanUser(u.auth_user_id, name)} disabled={actionLoading === u.auth_user_id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-900/50 text-green-400 hover:bg-green-900 transition disabled:opacity-50"><ShieldCheck className="w-3 h-3" /> Unban</button>
                            : <button onClick={() => setBanModal({ userId: u.auth_user_id, name })} disabled={actionLoading === u.auth_user_id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900 transition disabled:opacity-50"><Ban className="w-3 h-3" /> Ban</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {banModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-bold">Ban {banModal.name}</h2>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} placeholder="Reason…" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={banPermanent} onChange={e => setBanPermanent(e.target.checked)} /> Permanent</label>
              {!banPermanent && <div className="flex items-center gap-2"><input type="number" value={banDays} onChange={e => setBanDays(e.target.value)} min="1" className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none" /><span className="text-gray-400 text-sm">days</span></div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm">Cancel</button>
              <button onClick={banUser} disabled={!banReason.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">Confirm Ban</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
      {editUser && <EditModal title={`Edit User — ${editUser.auth_user_id?.slice(0,8)}…`} data={editUser} fields={USER_EDIT_FIELDS} onSave={saveUser} onClose={() => setEditUser(null)} />}
      {selectedUserId && <UserHistoryPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
