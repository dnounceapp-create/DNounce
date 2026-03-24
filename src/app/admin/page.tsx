"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { fmtDate, StatusBadge } from "./adminUtils";

const ACTION_LABELS: Record<string, string> = { delete_record: "Delete Record", soft_delete_record: "Soft Delete Record", permanent_ban: "Permanent Ban", temporary_ban: "Temporary Ban", unban_user: "Unban User", assign_admin: "Assign Admin", award_badge: "Award Badge", close_ticket: "Close Ticket", edit_record_content: "Edit Record Content", edit_record_credibility: "Override Credibility", edit_user_profile: "Edit User Profile", edit_user_scores: "Override Scores", edit_user_ban: "Ban User", stage_change_to_debate: "→ Debate", stage_change_to_voting: "→ Voting", stage_change_to_decision: "→ Decision", stage_change_to_published: "→ Published", ticket_close: "Close Ticket", report_close: "Resolve Report", revoke_badge: "Revoke Badge", edit_subject: "Edit Subject" };
const ACTION_COLORS: Record<string, string> = { delete_record: "text-red-400", soft_delete_record: "text-red-400", permanent_ban: "text-red-400", temporary_ban: "text-orange-400", unban_user: "text-green-400", assign_admin: "text-blue-400", award_badge: "text-teal-400", close_ticket: "text-green-400", stage_change_to_published: "text-green-400" };

function StatCard({ label, value, sub, href, color }: { label: string; value: number; sub?: string; href: string; color?: string }) {
  return (
    <Link href={href} className={`bg-gray-900 border rounded-2xl p-4 hover:border-gray-600 transition block group ${color ?? "border-gray-800"}`}>
      <p className="text-xs font-medium text-gray-400 mb-1 group-hover:text-gray-300 transition">{label}</p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </Link>
  );
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const results = await Promise.all([
      supabase.from("records").select("*", { count: "exact", head: true }),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "debate"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "voting"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "deletion_request"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "ai_verification"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "decision"),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_banned", true),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("admin", true),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("contributors").select("*", { count: "exact", head: true }),
      supabase.from("record_votes").select("*", { count: "exact", head: true }),
      supabase.from("record_votes").select("*", { count: "exact", head: true }).eq("choice", "keep"),
      supabase.from("record_votes").select("*", { count: "exact", head: true }).eq("choice", "delete"),
      supabase.from("reactions").select("*", { count: "exact", head: true }),
      supabase.from("record_debate_messages").select("*", { count: "exact", head: true }),
      supabase.from("record_community_statements").select("*", { count: "exact", head: true }),
      supabase.from("record_vote_replies").select("*", { count: "exact", head: true }),
      supabase.from("record_community_replies").select("*", { count: "exact", head: true }),
      supabase.from("pinned_records").select("*", { count: "exact", head: true }),
      supabase.from("record_follows").select("*", { count: "exact", head: true }),
      supabase.from("notifications").select("*", { count: "exact", head: true }),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false),
      supabase.from("badges").select("*", { count: "exact", head: true }),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "support"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "support").eq("status", "open"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "report"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "report").eq("status", "open"),
      supabase.from("user_bans").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("admin_audit_log").select("*", { count: "exact", head: true }),
      supabase.from("voter_quality_badges").select("*", { count: "exact", head: true }).eq("is_low_quality", true),
      supabase.from("voter_quality_badges").select("*", { count: "exact", head: true }).eq("is_convicted", true),
    ]);

    const keys = ["r_total", "r_published", "r_debate", "r_voting", "r_deletion", "r_ai", "r_decision", "u_total", "u_banned", "u_admin", "subjects", "contributors", "v_total", "v_keep", "v_delete", "reactions", "debate_msgs", "comm_stmts", "vote_replies", "comm_replies", "pinned", "follows", "notif_total", "notif_unread", "badges", "t_total", "t_open", "rep_total", "rep_open", "active_bans", "audit_total", "v_flagged", "v_convicted"];
    const c: Record<string, number> = {};
    keys.forEach((k, i) => { c[k] = results[i].count ?? 0; });
    setCounts(c);

    const [recs, tickets, audit, notifs] = await Promise.all([
      supabase.from("records").select("id,status,category,created_at,subject:subjects(name)").order("created_at", { ascending: false }).limit(6),
      supabase.from("support_tickets").select("id,topic,type,status,priority,created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("admin_audit_log").select("id,action,target_type,created_at,admin_user_id").order("created_at", { ascending: false }).limit(6),
      supabase.from("notifications").select("id,title,type,read,created_at").order("created_at", { ascending: false }).limit(6),
    ]);
    setRecentRecords((recs.data as any[]) ?? []);
    setRecentTickets((tickets.data as any[]) ?? []);
    setRecentAudit((audit.data as any[]) ?? []);
    setRecentNotifs((notifs.data as any[]) ?? []);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm animate-pulse">Loading dashboard…</div>;

  const alerts = [];
  if (counts.t_open > 0) alerts.push({ msg: `${counts.t_open} open support ticket${counts.t_open > 1 ? "s" : ""} need attention`, href: "/admin/tickets", color: "yellow" });
  if (counts.rep_open > 0) alerts.push({ msg: `${counts.rep_open} open report${counts.rep_open > 1 ? "s" : ""} need review`, href: "/admin/reports", color: "red" });
  if (counts.r_debate > 0) alerts.push({ msg: `${counts.r_debate} record${counts.r_debate > 1 ? "s" : ""} in active debate`, href: "/admin/records", color: "orange" });
  if (counts.r_voting > 0) alerts.push({ msg: `${counts.r_voting} record${counts.r_voting > 1 ? "s" : ""} in active voting`, href: "/admin/records", color: "blue" });
  if (counts.v_flagged > 0) alerts.push({ msg: `${counts.v_flagged} flagged vote${counts.v_flagged > 1 ? "s" : ""} flagged as low quality`, href: "/admin/records", color: "yellow" });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-white text-2xl font-bold">Dashboard</h1><p className="text-gray-400 text-sm mt-1">Live platform overview — all counts are real-time</p></div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh All</button>
      </div>

      {alerts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /><span className="text-white text-sm font-semibold">Needs Attention ({alerts.length})</span></div>
          {alerts.map((a, i) => (
            <Link key={i} href={a.href} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-sm ${a.color === "red" ? "bg-red-950/40 border-red-800 text-red-300" : a.color === "orange" ? "bg-orange-950/40 border-orange-800 text-orange-300" : a.color === "blue" ? "bg-blue-950/40 border-blue-800 text-blue-300" : "bg-yellow-950/40 border-yellow-800 text-yellow-300"}`}>
              <span>{a.msg}</span><span className="text-xs opacity-70">View →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Records by Stage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Total Records" value={counts.r_total} href="/admin/records" color="border-gray-700" />
            <StatCard label="AI Verification" value={counts.r_ai} href="/admin/records" color="border-gray-700" />
            <StatCard label="Published" value={counts.r_published} href="/admin/records" color="border-green-900" />
            <StatCard label="Deletion Requests" value={counts.r_deletion} href="/admin/records" color="border-red-900" />
            <StatCard label="In Debate" value={counts.r_debate} sub="Active window" href="/admin/records" color="border-orange-900" />
            <StatCard label="In Voting" value={counts.r_voting} sub="Votes open" href="/admin/records" color="border-blue-900" />
            <StatCard label="Decided" value={counts.r_decision} href="/admin/records" color="border-purple-900" />
          </div>
        </div>
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Users & Accounts</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Users" value={counts.u_total} href="/admin/users" color="border-gray-700" />
            <StatCard label="Active Bans" value={counts.active_bans} href="/admin/users" color="border-red-900" />
            <StatCard label="Admins" value={counts.u_admin} href="/admin/users" color="border-purple-900" />
            <StatCard label="Subjects" value={counts.subjects} href="/admin/users" color="border-gray-700" />
            <StatCard label="Contributors" value={counts.contributors} href="/admin/users" color="border-gray-700" />
          </div>
        </div>
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Community Engagement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label="Total Votes" value={counts.v_total} sub={`${counts.v_keep} keep / ${counts.v_delete} del`} href="/admin/records" />
            <StatCard label="Flagged Votes" value={counts.v_flagged} sub="Low quality" href="/admin/records" color="border-yellow-900" />
            <StatCard label="Convicted Votes" value={counts.v_convicted} sub="Disqualified" href="/admin/records" color="border-red-900" />
            <StatCard label="Reactions" value={counts.reactions} href="/admin/records" />
            <StatCard label="Debate Messages" value={counts.debate_msgs} href="/admin/records" />
            <StatCard label="Community Stmts" value={counts.comm_stmts} href="/admin/records" />
            <StatCard label="Vote Replies" value={counts.vote_replies} href="/admin/records" />
            <StatCard label="Community Replies" value={counts.comm_replies} href="/admin/records" />
          </div>
        </div>
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Notifications, Badges & Social</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Total Notifications" value={counts.notif_total} href="/admin/notifications" />
            <StatCard label="Unread Notifications" value={counts.notif_unread} href="/admin/notifications" color="border-yellow-900" />
            <StatCard label="Total Badges" value={counts.badges} href="/admin/badges" />
            <StatCard label="Pinned Records" value={counts.pinned} href="/admin/records" />
            <StatCard label="Following Records" value={counts.follows} href="/admin/records" />
            <StatCard label="Audit Log Entries" value={counts.audit_total} href="/admin/audit" />
          </div>
        </div>
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Support</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Tickets" value={counts.t_total} href="/admin/tickets" />
            <StatCard label="Open Tickets" value={counts.t_open} href="/admin/tickets" color={counts.t_open > 0 ? "border-yellow-900" : "border-gray-700"} />
            <StatCard label="Total Reports" value={counts.rep_total} href="/admin/reports" />
            <StatCard label="Open Reports" value={counts.rep_open} href="/admin/reports" color={counts.rep_open > 0 ? "border-red-900" : "border-gray-700"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-white text-sm font-semibold">Recent Records</h3><Link href="/admin/records" className="text-gray-500 hover:text-white text-xs transition">All →</Link></div>
          <div className="space-y-1.5">
            {recentRecords.map(r => (
              <Link key={r.id} href="/admin/records" className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-2 py-2 transition">
                <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{(r.subject as any)?.name ?? "—"}</div><div className="text-gray-500 text-[11px]">{r.category ?? "—"} • {fmtDate(r.created_at)}</div></div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-white text-sm font-semibold">Recent Tickets</h3><Link href="/admin/tickets" className="text-gray-500 hover:text-white text-xs transition">All →</Link></div>
          <div className="space-y-1.5">
            {recentTickets.map(t => (
              <Link key={t.id} href="/admin/tickets" className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-2 py-2 transition">
                <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{t.topic}</div><div className="text-gray-500 text-[11px]">{t.priority} priority • {fmtDate(t.created_at)}</div></div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${t.status === "open" ? "bg-yellow-900 text-yellow-300 border-yellow-700" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{t.status}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-white text-sm font-semibold">Recent Admin Actions</h3><Link href="/admin/audit" className="text-gray-500 hover:text-white text-xs transition">All →</Link></div>
          <div className="space-y-1.5">
            {recentAudit.map(a => (
              <Link key={a.id} href="/admin/audit" className="flex flex-col hover:bg-gray-800 rounded-xl px-2 py-2 transition">
                <span className={`text-xs font-mono font-medium truncate ${ACTION_COLORS[a.action] ?? "text-gray-300"}`}>{ACTION_LABELS[a.action] ?? a.action}</span>
                <span className="text-gray-500 text-[11px]">{a.target_type} • {fmtDate(a.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="text-white text-sm font-semibold">Recent Notifications</h3><Link href="/admin/notifications" className="text-gray-500 hover:text-white text-xs transition">All →</Link></div>
          <div className="space-y-1.5">
            {recentNotifs.map(n => (
              <Link key={n.id} href="/admin/notifications" className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-2 py-2 transition">
                <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{n.title}</div><div className="text-gray-500 text-[11px] font-mono">{n.type}</div></div>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${n.read ? "bg-gray-800 text-gray-500 border-gray-700" : "bg-blue-900 text-blue-300 border-blue-700"}`}>{n.read ? "Read" : "New"}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
