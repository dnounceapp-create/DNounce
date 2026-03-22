"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Trash2, Plus } from "lucide-react";

type BadgeRow = {
  id: string; user_id: string; label: string; color: string; icon: string;
  created_at: string; user_name?: string;
};

const BADGE_LABELS = ["Top Contributor","Top Voter","Top Subject","Top Citizen","Rising Star","Controversial","Low-Quality Voter","Convicted","Fan Favorite","Expert","Struggling"];

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [awardModal, setAwardModal] = useState(false);
  const [awardUserId, setAwardUserId] = useState("");
  const [awardLabel, setAwardLabel] = useState(BADGE_LABELS[0]);
  const [awarding, setAwarding] = useState(false);

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
    const { data } = await supabase.from("badges").select("id, user_id, label, color, icon, created_at").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setBadges(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function revokeBadge(id: string, label: string, userName: string) {
    if (!confirm(`Revoke "${label}" from ${userName}?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("badges").delete().eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "revoke_badge", target_type: "badges", target_id: id, old_value: { label } });
    showToast("success", "Badge revoked");
    await load();
  }

  async function awardBadge() {
    if (!awardUserId.trim()) { showToast("error", "Enter a user ID"); return; }
    setAwarding(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("badges").insert({ user_id: awardUserId.trim(), label: awardLabel, color: "blue", icon: "🏆" });
    if (error) { showToast("error", error.message); setAwarding(false); return; }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "award_badge", target_type: "badges", target_id: awardUserId, new_value: { label: awardLabel } });
    showToast("success", `${awardLabel} awarded`);
    setAwardModal(false);
    setAwardUserId("");
    setAwarding(false);
    await load();
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = badges.filter(b => {
    const matchSearch = !search || b.user_name?.toLowerCase().includes(search.toLowerCase()) || b.label.toLowerCase().includes(search.toLowerCase());
    const matchLabel = labelFilter === "all" || b.label === labelFilter;
    return matchSearch && matchLabel;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-2xl font-bold">Badges</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} badges awarded</p></div>
        <div className="flex gap-2">
          {adminLevel >= 2 && <button onClick={() => setAwardModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm transition"><Plus className="w-4 h-4" /> Award Badge</button>}
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user or badge…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          <option value="all">All badges</option>
          {BADGE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-800">{["User","Badge","Awarded","Actions"].map(h => <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 text-white text-sm">{b.user_name}</td>
                    <td className="px-4 py-3"><span className="text-sm font-medium text-white">{b.icon} {b.label}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {adminLevel >= 2 && (
                        <button onClick={() => revokeBadge(b.id, b.label, b.user_name ?? "User")} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {awardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-bold">Award Badge</h2>
            <input value={awardUserId} onChange={e => setAwardUserId(e.target.value)} placeholder="Auth user ID…" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none" />
            <select value={awardLabel} onChange={e => setAwardLabel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
              {BADGE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setAwardModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">Cancel</button>
              <button onClick={awardBadge} disabled={awarding} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition disabled:opacity-50">{awarding ? "Awarding…" : "Award"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
