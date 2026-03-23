"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Plus, Trash2, Pencil } from "lucide-react";
import { CSVButton, EditModal, fmtDate, Cell } from "../adminUtils";

const BADGE_LABELS = ["Top Contributor","Top Voter","Top Subject","Top Citizen","Rising Star","Controversial","Low-Quality Voter","Convicted","Fan Favorite","Expert","Struggling"];

const BADGE_EDIT_FIELDS = [
  { key: "id", label: "Badge ID", readOnly: true },
  { key: "user_id", label: "User ID", readOnly: true },
  { key: "label", label: "Badge Label", type: "select" as const, options: BADGE_LABELS },
  { key: "color", label: "Color", type: "text" as const },
  { key: "icon", label: "Icon", type: "text" as const },
  { key: "created_at", label: "Awarded At", readOnly: true },
];

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");
  const [adminLevel, setAdminLevel] = useState(0);
  const [editBadge, setEditBadge] = useState<any | null>(null);
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
    const { data } = await supabase.from("badges").select("id, user_id, label, color, icon, created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setBadges(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  async function saveBadge(updated: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("badges").update({ label: updated.label, color: updated.color, icon: updated.icon }).eq("id", updated.id);
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "edit_badge", target_type: "badges", target_id: updated.id });
    showToast("success", "Badge updated"); await load();
  }

  async function revokeBadge(id: string, label: string, userName: string) {
    if (!confirm(`Revoke "${label}" from ${userName}?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("badges").delete().eq("id", id);
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "revoke_badge", target_type: "badges", target_id: id, old_value: { label } });
    showToast("success", "Badge revoked"); await load();
  }

  async function awardBadge() {
    if (!awardUserId.trim()) { showToast("error", "Enter a user ID"); return; }
    setAwarding(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("badges").insert({ user_id: awardUserId.trim(), label: awardLabel, color: "blue", icon: "🏆" });
    if (error) { showToast("error", error.message); setAwarding(false); return; }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "award_badge", target_type: "badges", target_id: awardUserId, new_value: { label: awardLabel } });
    showToast("success", `${awardLabel} awarded`);
    setAwardModal(false); setAwardUserId(""); setAwarding(false); await load();
  }

  function showToast(type: "success" | "error", msg: string) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const filtered = badges.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !search || b.user_name?.toLowerCase().includes(q) || b.label?.toLowerCase().includes(q) || b.user_id?.includes(q) || b.id?.includes(q);
    return matchSearch && (labelFilter === "all" || b.label === labelFilter);
  });

  const csvData = filtered.map(b => ({ id: b.id, user_id: b.user_id, user_name: b.user_name, label: b.label, color: b.color, icon: b.icon, created_at: b.created_at ?? "" }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Badges</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {badges.length} badges</p></div>
        <div className="flex gap-2">
          {adminLevel >= 2 && <button onClick={() => setAwardModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm transition"><Plus className="w-4 h-4" /> Award Badge</button>}
          <CSVButton data={csvData} filename="dnounce-badges" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, badge label, ID…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All badges</option>{BADGE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800 bg-gray-950">{["ID","User ID","User Name","Badge","Color","Icon","Awarded At","Actions"].map(h => <th key={h} className="text-left text-gray-500 font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-3 py-2.5"><Cell val={b.id} mono /></td>
                    <td className="px-3 py-2.5"><Cell val={b.user_id} mono dim /></td>
                    <td className="px-3 py-2.5 text-white">{b.user_name}</td>
                    <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">{b.icon} {b.label}</td>
                    <td className="px-3 py-2.5"><Cell val={b.color} /></td>
                    <td className="px-3 py-2.5 text-lg">{b.icon}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditBadge(b)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                        {adminLevel >= 2 && <button onClick={() => revokeBadge(b.id, b.label, b.user_name)} className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
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
            <select value={awardLabel} onChange={e => setAwardLabel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">{BADGE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
            <div className="flex gap-3">
              <button onClick={() => setAwardModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm">Cancel</button>
              <button onClick={awardBadge} disabled={awarding} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{awarding ? "Awarding…" : "Award"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 ${toast.type === "success" ? "bg-green-900 text-green-300 border border-green-700" : "bg-red-900 text-red-300 border border-red-700"}`}>{toast.msg}</div>}
      {editBadge && <EditModal title={`Edit Badge — ${editBadge.label}`} data={editBadge} fields={BADGE_EDIT_FIELDS} onSave={saveBadge} onClose={() => setEditBadge(null)} />}
    </div>
  );
}
