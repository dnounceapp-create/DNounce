"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Ban, ShieldCheck, ShieldOff } from "lucide-react";

type UserRow = {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_banned: boolean;
  admin: boolean;
  created_at: string;
  admin_level?: number;
  subject_score?: number;
  contributor_score?: number;
};

const ADMIN_LEVEL_LABELS: Record<number, string> = { 0: "User", 1: "Support Agent", 2: "Moderator", 3: "Super Admin" };
const ADMIN_LEVEL_COLORS: Record<number, string> = {
  0: "bg-gray-800 text-gray-400",
  1: "bg-blue-900 text-blue-400",
  2: "bg-purple-900 text-purple-400",
  3: "bg-red-900 text-red-400",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adminLevel, setAdminLevel] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
    const { data: userRows } = await supabase
      .from("users")
      .select("id, auth_user_id, is_banned, admin, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: accts } = await supabase
      .from("user_accountdetails")
      .select("user_id, first_name, last_name");

    const { data: adminRoles } = await supabase
      .from("admin_roles")
      .select("user_id, level")
      .eq("is_active", true);

    const { data: scores } = await supabase
      .from("user_scores")
      .select("user_id, subject_score, contributor_score");

    const { data: authUsers } = await supabase.auth.admin?.listUsers?.() ?? { data: null };

    const acctMap: Record<string, any> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });

    const adminMap: Record<string, number> = {};
    (adminRoles ?? []).forEach((r: any) => { adminMap[r.user_id] = r.level; });

    const scoreMap: Record<string, any> = {};
    (scores ?? []).forEach((s: any) => { scoreMap[s.user_id] = s; });

    const merged: UserRow[] = (userRows ?? []).map((u: any) => {
      const acct = acctMap[u.auth_user_id] ?? {};
      const score = scoreMap[u.auth_user_id] ?? {};
      return {
        id: u.id,
        auth_user_id: u.auth_user_id,
        email: u.email ?? "—",
        first_name: acct.first_name ?? "",
        last_name: acct.last_name ?? "",
        is_banned: u.is_banned,
        admin: u.admin,
        created_at: u.created_at,
        admin_level: adminMap[u.auth_user_id] ?? 0,
        subject_score: score.subject_score,
        contributor_score: score.contributor_score,
      };
    });

    setUsers(merged);
    setLoading(false);
  }

  async function banUser() {
    if (!banModal || !banReason.trim()) return;
    setActionLoading(banModal.userId);
    const { data: { session } } = await supabase.auth.getSession();

    const expiresAt = banPermanent ? null : new Date(Date.now() + Number(banDays) * 86400000).toISOString();

    const { error } = await supabase.from("user_bans").insert({
      user_id: banModal.userId, banned_by: session!.user.id,
      reason: banReason, is_permanent: banPermanent, expires_at: expiresAt,
    });
    if (error) { showToast("error", error.message); setActionLoading(null); return; }

    await supabase.from("users").update({ is_banned: true }).eq("auth_user_id", banModal.userId);
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: banPermanent ? "permanent_ban" : "temporary_ban",
      target_type: "users", target_id: banModal.userId,
      new_value: { reason: banReason, expires_at: expiresAt },
    });

    showToast("success", `${banModal.name} banned`);
    setBanModal(null);
    setBanReason("");
    await load();
    setActionLoading(null);
  }

  async function unbanUser(userId: string, name: string) {
    setActionLoading(userId);
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from("user_bans").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("is_active", true);
    await supabase.from("users").update({ is_banned: false }).eq("auth_user_id", userId);
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: "unban_user", target_type: "users", target_id: userId,
    });

    showToast("success", `${name} unbanned`);
    await load();
    setActionLoading(null);
  }

  async function setAdminRole(userId: string, level: number) {
    if (adminLevel < 3) { showToast("error", "Only Super Admins can manage admin roles."); return; }
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from("admin_roles").update({ is_active: false, revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("is_active", true);

    if (level > 0) {
      await supabase.from("admin_roles").insert({ user_id: userId, level, assigned_by: session!.user.id });
    }

    await supabase.from("users").update({ admin: level > 0 }).eq("auth_user_id", userId);
    await supabase.from("admin_audit_log").insert({
      admin_user_id: session!.user.id, admin_level: adminLevel,
      action: level === 0 ? "revoke_admin" : "assign_admin",
      target_type: "users", target_id: userId,
      new_value: { level },
    });

    showToast("success", level === 0 ? "Admin role revoked" : `Assigned level ${level}`);
    await load();
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.includes(search) || u.auth_user_id.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} users</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or user ID…"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {["User", "Role", "Scores", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(u => {
                  const name = `${u.first_name} ${u.last_name}`.trim() || "—";
                  const isSelf = u.auth_user_id === myUserId;
                  return (
                    <tr key={u.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">{name}</div>
                        <div className="text-gray-500 text-[11px] font-mono">{u.auth_user_id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3">
                        {adminLevel >= 3 && !isSelf ? (
                          <select value={u.admin_level ?? 0} onChange={e => setAdminRole(u.auth_user_id, Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white outline-none">
                            {[0, 1, 2, 3].map(l => <option key={l} value={l}>{ADMIN_LEVEL_LABELS[l]}</option>)}
                          </select>
                        ) : (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ADMIN_LEVEL_COLORS[u.admin_level ?? 0]}`}>
                            {ADMIN_LEVEL_LABELS[u.admin_level ?? 0]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-400 text-xs">S: {u.subject_score ?? "—"}</div>
                        <div className="text-gray-400 text-xs">C: {u.contributor_score ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_banned ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-900 text-red-400">Banned</span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-900 text-green-400">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {adminLevel >= 2 && !isSelf && (
                          u.is_banned ? (
                            <button onClick={() => unbanUser(u.auth_user_id, name)} disabled={actionLoading === u.auth_user_id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/50 text-green-400 hover:bg-green-900 text-xs transition disabled:opacity-50">
                              <ShieldCheck className="w-3.5 h-3.5" /> Unban
                            </button>
                          ) : (
                            <button onClick={() => setBanModal({ userId: u.auth_user_id, name })} disabled={actionLoading === u.auth_user_id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900 text-xs transition disabled:opacity-50">
                              <Ban className="w-3.5 h-3.5" /> Ban
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-bold">Ban {banModal.name}</h2>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3}
              placeholder="Reason for ban…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={banPermanent} onChange={e => setBanPermanent(e.target.checked)} />
                Permanent ban
              </label>
              {!banPermanent && (
                <div className="flex items-center gap-2">
                  <input type="number" value={banDays} onChange={e => setBanDays(e.target.value)} min="1"
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
                  <span className="text-gray-400 text-sm">days</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">Cancel</button>
              <button onClick={banUser} disabled={!banReason.trim() || actionLoading === banModal.userId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-semibold transition disabled:opacity-50">
                {actionLoading === banModal.userId ? "Banning…" : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
