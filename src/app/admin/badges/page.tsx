"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw, Plus, ChevronRight } from "lucide-react";
import { CSVButton, SidePanel, SmartEditModal, DetailRow, DetailSection, CopyID, fmtDate, type SmartField } from "../adminUtils";

const BADGE_LABELS = ["Top Contributor", "Top Voter", "Top Subject", "Top Citizen", "Rising Star", "Controversial", "Low-Quality Voter", "Convicted", "Fan Favorite", "Expert", "Struggling"];
const BADGE_ICONS: Record<string, string> = { "Top Contributor": "🏆", "Top Voter": "🗳️", "Top Subject": "👑", "Top Citizen": "🌟", "Rising Star": "⭐", "Controversial": "🌶️", "Low-Quality Voter": "⚠️", "Convicted": "❌", "Fan Favorite": "💫", "Expert": "🎓", "Struggling": "📉" };
const BADGE_DESCRIPTIONS: Record<string, string> = { "Top Contributor": "90%+ of submitted records are kept or never disputed (min 5 records).", "Top Voter": "Voter score reaches 80+. Reflects consistently positive community reactions.", "Top Subject": "Subject score reaches 90+. Reflects a clean platform reputation.", "Top Citizen": "Citizen score reaches 80+. Reflects high-quality community participation.", "Rising Star": "Record receives 10+ positive reactions within 12 hours.", "Fan Favorite": "5+ positive reactions with zero negative reactions.", "Controversial": "Reactions are heavily split (neither side exceeds 60%) with 10+ total.", "Struggling": "Negative reactions outweigh positive (min 5 total reactions).", "Expert": "Contributor's job title matches the category of their submitted record.", "Low-Quality Voter": "Community flagged vote explanation as low quality.", "Convicted": "Vote was disqualified by the community — does not count toward tally." };

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<{ badge: any; type: string } | null>(null);
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
    const { data } = await supabase.from("badges").select("id,user_id,label,color,icon,created_at").order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const { data: accts } = userIds.length ? await supabase.from("user_accountdetails").select("user_id,first_name,last_name,email").in("user_id", userIds) : { data: [] };
    const m: Record<string, any> = {}; (accts ?? []).forEach((a: any) => { m[a.user_id] = a; });
    setBadges(rows.map(r => ({ ...r, user_name: `${m[r.user_id]?.first_name ?? ""} ${m[r.user_id]?.last_name ?? ""}`.trim() || "User", user_email: m[r.user_id]?.email ?? "" })));
    setLoading(false);
  }

  async function saveEdit(updated: Record<string, any>, note: string, type: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (type === "edit") {
      const { error } = await supabase.from("badges").update({ label: updated.label, color: updated.color, icon: BADGE_ICONS[updated.label] || updated.icon }).eq("id", updated.id);
      if (error) throw error;
    }
    if (type === "revoke") {
      await supabase.from("badges").delete().eq("id", updated.id);
      await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: "revoke_badge", target_type: "badges", target_id: updated.id, old_value: { label: updated.label, user_id: updated.user_id }, new_value: { note } });
      showToast("success", "Badge revoked"); setSelected(null); await load(); return;
    }
    if (type === "award") {
      // Validate user exists
      const { data: user } = await supabase.from("user_accountdetails").select("user_id,first_name,last_name").eq("user_id", updated.user_id?.trim()).maybeSingle();
      if (!user) throw new Error(`No user found with that ID. Make sure you use the auth_user_id from the Users page (copy it using the copy button next to the ID).`);
      const { error } = await supabase.from("badges").insert({ user_id: updated.user_id.trim(), label: updated.label, color: updated.color || "blue", icon: BADGE_ICONS[updated.label] || "🏆" });
      if (error) throw error;
      // Notify user
      await supabase.from("notifications").insert({ user_id: updated.user_id.trim(), title: `You earned the ${updated.label} badge!`, body: BADGE_DESCRIPTIONS[updated.label] ?? "", type: "badge_earned", record_id: null });
    }
    await supabase.from("admin_audit_log").insert({ admin_user_id: session!.user.id, admin_level: adminLevel, action: type === "award" ? "award_badge" : "edit_badge", target_type: "badges", target_id: updated.id || updated.user_id, new_value: { ...updated, note } });
    showToast("success", type === "award" ? "Badge awarded and user notified" : "Badge updated");
    await load(); setSelected(null);
  }

  function showToast(t: "success" | "error", m: string) { setToast({ type: t, msg: m }); setTimeout(() => setToast(null), 3500); }

  const filtered = badges.filter(b => {
    const q = search.toLowerCase();
    return (!search || b.user_name?.toLowerCase().includes(q) || b.label?.toLowerCase().includes(q) || b.user_email?.toLowerCase().includes(q) || b.user_id?.includes(q)) && (labelFilter === "all" || b.label === labelFilter);
  });
  const csvData = filtered.map(b => ({ id: b.id, user_id: b.user_id, user_name: b.user_name, user_email: b.user_email, label: b.label, color: b.color, icon: b.icon, awarded_at: b.created_at ?? "" }));

  const editFields: SmartField[] = [
    { key: "id", label: "Badge ID", type: "readonly" },
    { key: "user_id", label: "User ID", type: "readonly" },
    { key: "label", label: "Badge Label", type: "select", required: true, options: BADGE_LABELS.map(l => ({ value: l, label: `${BADGE_ICONS[l] ?? ""} ${l}` })), help: "Changing the label also auto-updates the icon." },
    { key: "color", label: "Color Tag", type: "text", help: "e.g. blue, green, red, gold, teal, purple. Used for UI theming." },
  ];
  const awardFields: SmartField[] = [
    { key: "user_id", label: "User ID (auth_user_id)", type: "text", required: true, help: "Go to the Users page, find the user, and click the copy button next to their ID. Do NOT use the internal user ID." },
    { key: "label", label: "Badge to Award", type: "select", required: true, options: BADGE_LABELS.map(l => ({ value: l, label: `${BADGE_ICONS[l] ?? ""} ${l}` })) },
    { key: "color", label: "Color Tag (optional)", type: "text", help: "Leave blank for default (blue)." },
  ];
  const revokeFields: SmartField[] = [
    { key: "id", label: "Badge ID", type: "readonly" },
    { key: "_warn", type: "warning", label: "", help: "Revoking removes this badge permanently. The user will not be notified. This action is logged to the audit log." },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Badges</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} of {badges.length} badges — click to view, edit, or revoke</p></div>
        <div className="flex gap-2 flex-wrap">
          {adminLevel >= 2 && <button onClick={() => setEditModal({ badge: { user_id: "", label: BADGE_LABELS[0], color: "blue" }, type: "award" })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm transition"><Plus className="w-4 h-4" /> Award Badge</button>}
          <CSVButton data={csvData} filename="dnounce-badges" />
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user name, email, user ID, badge label…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" /></div>
        <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none"><option value="all">All badges</option>{BADGE_LABELS.map(l => <option key={l} value={l}>{BADGE_ICONS[l]} {l}</option>)}</select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b border-gray-800 bg-gray-950">{["Badge ID", "User", "Email", "Badge", "Color", "What it means", "Awarded At", ""].map(h => <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(b => (
                <tr key={b.id} onClick={() => setSelected(b)} className={`hover:bg-gray-800/50 transition cursor-pointer ${selected?.id === b.id ? "bg-gray-800/70" : ""}`}>
                  <td className="px-4 py-3"><CopyID id={b.id} /></td>
                  <td className="px-4 py-3 text-white font-medium">{b.user_name}</td>
                  <td className="px-4 py-3 text-gray-400">{b.user_email || "—"}</td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{BADGE_ICONS[b.label] ?? ""} {b.label}</td>
                  <td className="px-4 py-3 text-gray-400">{b.color}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{BADGE_DESCRIPTIONS[b.label] ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {selected && (
        <SidePanel title={`${BADGE_ICONS[selected.label] ?? ""} ${selected.label}`} subtitle={`Awarded to ${selected.user_name}`} onClose={() => setSelected(null)}
          actions={<div className="grid grid-cols-2 gap-2">
            {adminLevel >= 2 && <button onClick={() => setEditModal({ badge: selected, type: "edit" })} className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition">✏️ Edit Badge</button>}
            {adminLevel >= 2 && <button onClick={() => setEditModal({ badge: selected, type: "revoke" })} className="px-3 py-2 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/60 text-xs font-medium border border-red-800 transition">🗑️ Revoke Badge</button>}
          </div>}>
          <DetailSection title="Badge">
            <DetailRow label="Badge ID" value={selected.id} mono copyable />
            <DetailRow label="Label" value={selected.label} />
            <DetailRow label="Icon" value={selected.icon} />
            <DetailRow label="Color" value={selected.color} />
            <DetailRow label="Awarded At" value={fmtDate(selected.created_at)} />
          </DetailSection>
          <DetailSection title="Recipient">
            <DetailRow label="Name" value={selected.user_name} />
            <DetailRow label="Email" value={selected.user_email} copyable />
            <DetailRow label="Auth User ID" value={selected.user_id} mono copyable />
          </DetailSection>
          <DetailSection title="What This Badge Means">
            <div className="py-3 text-sm text-gray-300 leading-relaxed">{BADGE_DESCRIPTIONS[selected.label] ?? "No description available."}</div>
          </DetailSection>
        </SidePanel>
      )}
      {editModal && (
        <SmartEditModal
          title={editModal.type === "award" ? "Award Badge to User" : editModal.type === "edit" ? "Edit Badge" : "Revoke Badge"}
          subtitle={editModal.type === "award" ? "Manually award a badge — user will be notified" : `${editModal.badge.label} — ${editModal.badge.user_name}`}
          data={editModal.badge}
          fields={editModal.type === "award" ? awardFields : editModal.type === "edit" ? editFields : revokeFields}
          warning={editModal.type === "award" ? "The user will receive an in-app notification immediately. Make sure the User ID is correct before awarding." : undefined}
          confirmText={editModal.type === "revoke" ? "REVOKE" : undefined}
          danger={editModal.type === "revoke"}
          onSave={(u, n) => saveEdit(u, n, editModal.type)}
          onClose={() => setEditModal(null)}
        />
      )}
      {toast && <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-[80] border ${toast.type === "success" ? "bg-green-900 text-green-300 border-green-700" : "bg-red-900 text-red-300 border-red-700"}`}>{toast.msg}</div>}
    </div>
  );
}
