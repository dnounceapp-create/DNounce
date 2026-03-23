"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { fmtDate } from "./adminUtils";

type Counts = Record<string, number>;

const STAT_SECTIONS = [
  {
    label: "Records",
    color: "blue",
    stats: [
      { key: "records_total", label: "Total Records", href: "/admin/records" },
      { key: "records_published", label: "Published", href: "/admin/records?status=published" },
      { key: "records_ai_verification", label: "AI Verification", href: "/admin/records?status=ai_verification" },
      { key: "records_subject_notified", label: "Subject Notified", href: "/admin/records?status=subject_notified" },
      { key: "records_deletion_request", label: "Deletion Requests", href: "/admin/records?status=deletion_request" },
      { key: "records_debate", label: "In Debate", href: "/admin/records?status=debate" },
      { key: "records_voting", label: "In Voting", href: "/admin/records?status=voting" },
      { key: "records_decision", label: "Decided", href: "/admin/records?status=decision" },
    ],
  },
  {
    label: "Users",
    color: "green",
    stats: [
      { key: "users_total", label: "Total Users", href: "/admin/users" },
      { key: "users_banned", label: "Banned", href: "/admin/users" },
      { key: "users_admin", label: "Admins", href: "/admin/users" },
      { key: "subjects_total", label: "Subjects", href: "/admin/users" },
      { key: "contributors_total", label: "Contributors", href: "/admin/users" },
    ],
  },
  {
    label: "Engagement",
    color: "orange",
    stats: [
      { key: "votes_total", label: "Total Votes", href: "/admin/records" },
      { key: "votes_keep", label: "Keep Votes", href: "/admin/records" },
      { key: "votes_delete", label: "Delete Votes", href: "/admin/records" },
      { key: "reactions_total", label: "Total Reactions", href: "/admin/records" },
      { key: "debate_messages_total", label: "Debate Messages", href: "/admin/records" },
      { key: "community_statements_total", label: "Community Statements", href: "/admin/records" },
      { key: "vote_replies_total", label: "Vote Replies", href: "/admin/records" },
      { key: "community_replies_total", label: "Community Replies", href: "/admin/records" },
    ],
  },
  {
    label: "Social",
    color: "purple",
    stats: [
      { key: "pinned_total", label: "Pinned Records", href: "/admin/records" },
      { key: "follows_total", label: "Following Records", href: "/admin/records" },
    ],
  },
  {
    label: "Notifications & Badges",
    color: "yellow",
    stats: [
      { key: "notifications_total", label: "Total Notifications", href: "/admin/notifications" },
      { key: "notifications_unread", label: "Unread", href: "/admin/notifications" },
      { key: "notification_queue_total", label: "Queued", href: "/admin/notifications" },
      { key: "badges_total", label: "Total Badges", href: "/admin/badges" },
    ],
  },
  {
    label: "Support",
    color: "red",
    stats: [
      { key: "tickets_total", label: "Total Tickets", href: "/admin/tickets" },
      { key: "tickets_open", label: "Open Tickets", href: "/admin/tickets" },
      { key: "tickets_closed", label: "Closed Tickets", href: "/admin/tickets" },
      { key: "reports_total", label: "Total Reports", href: "/admin/reports" },
      { key: "reports_open", label: "Open Reports", href: "/admin/reports" },
      { key: "bans_active", label: "Active Bans", href: "/admin/users" },
    ],
  },
  {
    label: "Admin",
    color: "gray",
    stats: [
      { key: "audit_log_total", label: "Audit Log Entries", href: "/admin/audit" },
      { key: "admin_roles_total", label: "Admin Roles", href: "/admin/users" },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  blue: "border-blue-800 bg-blue-950/20 text-blue-400",
  green: "border-green-800 bg-green-950/20 text-green-400",
  orange: "border-orange-800 bg-orange-950/20 text-orange-400",
  purple: "border-purple-800 bg-purple-950/20 text-purple-400",
  yellow: "border-yellow-800 bg-yellow-950/20 text-yellow-400",
  red: "border-red-800 bg-red-950/20 text-red-400",
  gray: "border-gray-700 bg-gray-800/20 text-gray-400",
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts>({});
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [
      rTotal, rPub, rAI, rSN, rDR, rDeb, rVot, rDec,
      uTotal, uBanned, uAdmin, subTotal, conTotal,
      vTotal, vKeep, vDel, reacTotal, debMsgs, commStmts, vReplies, cReplies,
      pinned, follows,
      notifTotal, notifUnread, notifQueue, badges,
      tTotal, tOpen, tClosed, repTotal, repOpen, bans,
      auditTotal, adminRoles,
      records, tickets, audit,
    ] = await Promise.all([
      supabase.from("records").select("*", { count: "exact", head: true }),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "ai_verification"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "subject_notified"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "deletion_request"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "debate"),
      supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "voting"),
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
      supabase.from("notification_queue").select("*", { count: "exact", head: true }),
      supabase.from("badges").select("*", { count: "exact", head: true }),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "support"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "support").eq("status", "open"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "support").eq("status", "closed"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "report"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("type", "report").eq("status", "open"),
      supabase.from("user_bans").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("admin_audit_log").select("*", { count: "exact", head: true }),
      supabase.from("admin_roles").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("records").select("id, status, category, created_at, subject:subjects(name)").order("created_at", { ascending: false }).limit(8),
      supabase.from("support_tickets").select("id, type, topic, status, priority, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("admin_audit_log").select("id, action, admin_user_id, target_type, created_at").order("created_at", { ascending: false }).limit(8),
    ]);

    setCounts({
      records_total: rTotal.count ?? 0, records_published: rPub.count ?? 0,
      records_ai_verification: rAI.count ?? 0, records_subject_notified: rSN.count ?? 0,
      records_deletion_request: rDR.count ?? 0, records_debate: rDeb.count ?? 0,
      records_voting: rVot.count ?? 0, records_decision: rDec.count ?? 0,
      users_total: uTotal.count ?? 0, users_banned: uBanned.count ?? 0,
      users_admin: uAdmin.count ?? 0, subjects_total: subTotal.count ?? 0,
      contributors_total: conTotal.count ?? 0,
      votes_total: vTotal.count ?? 0, votes_keep: vKeep.count ?? 0, votes_delete: vDel.count ?? 0,
      reactions_total: reacTotal.count ?? 0, debate_messages_total: debMsgs.count ?? 0,
      community_statements_total: commStmts.count ?? 0, vote_replies_total: vReplies.count ?? 0,
      community_replies_total: cReplies.count ?? 0,
      pinned_total: pinned.count ?? 0, follows_total: follows.count ?? 0,
      notifications_total: notifTotal.count ?? 0, notifications_unread: notifUnread.count ?? 0,
      notification_queue_total: notifQueue.count ?? 0, badges_total: badges.count ?? 0,
      tickets_total: tTotal.count ?? 0, tickets_open: tOpen.count ?? 0, tickets_closed: tClosed.count ?? 0,
      reports_total: repTotal.count ?? 0, reports_open: repOpen.count ?? 0,
      bans_active: bans.count ?? 0,
      audit_log_total: auditTotal.count ?? 0, admin_roles_total: adminRoles.count ?? 0,
    });

    setRecentRecords((records.data as any[]) ?? []);
    setRecentTickets((tickets.data as any[]) ?? []);
    setRecentAudit((audit.data as any[]) ?? []);
    setLoading(false);
  }

  if (loading) return <div className="text-gray-400 text-sm animate-pulse p-8">Loading dashboard…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-2xl font-bold">Dashboard</h1><p className="text-gray-400 text-sm mt-1">Complete platform overview — live counts</p></div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Stats sections */}
      <div className="space-y-4">
        {STAT_SECTIONS.map(section => (
          <div key={section.label} className={`border rounded-2xl p-4 ${COLOR_MAP[section.color]}`}>
            <h2 className="text-sm font-semibold mb-3">{section.label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {section.stats.map(stat => (
                <Link key={stat.key} href={stat.href} className="bg-gray-900/60 hover:bg-gray-900 rounded-xl px-3 py-2.5 transition block">
                  <div className="text-gray-400 text-[11px] mb-1 truncate">{stat.label}</div>
                  <div className="text-white text-xl font-bold">{(counts[stat.key] ?? 0).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent records */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-white text-sm font-semibold">Recent Records</h2><Link href="/admin/records" className="text-gray-400 hover:text-white text-xs">View all →</Link></div>
          <div className="space-y-2">
            {recentRecords.map(r => (
              <Link key={r.id} href={`/admin/records`} className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-3 py-2 transition">
                <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{(r.subject as any)?.name ?? "—"}</div><div className="text-gray-500 text-[11px] font-mono">{r.id?.slice(0,8)}… • {r.category}</div></div>
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.status === "published" ? "bg-green-900 text-green-400" : r.status === "debate" ? "bg-orange-900 text-orange-400" : r.status === "voting" ? "bg-blue-900 text-blue-400" : "bg-gray-800 text-gray-400"}`}>{r.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent tickets */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-white text-sm font-semibold">Recent Tickets</h2><Link href="/admin/tickets" className="text-gray-400 hover:text-white text-xs">View all →</Link></div>
          <div className="space-y-2">
            {recentTickets.map(t => (
              <Link key={t.id} href="/admin/tickets" className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-3 py-2 transition">
                <div className="min-w-0"><div className="text-white text-xs font-medium truncate">{t.topic}</div><div className="text-gray-500 text-[11px]">{t.type} • {t.priority}</div></div>
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.status === "open" ? "bg-yellow-900 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>{t.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent audit */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-white text-sm font-semibold">Recent Admin Actions</h2><Link href="/admin/audit" className="text-gray-400 hover:text-white text-xs">View all →</Link></div>
          <div className="space-y-2">
            {recentAudit.map(a => (
              <Link key={a.id} href="/admin/audit" className="flex items-center justify-between gap-2 hover:bg-gray-800 rounded-xl px-3 py-2 transition">
                <div className="min-w-0"><div className={`text-xs font-mono font-medium truncate ${ACTION_COLORS[a.action] ?? "text-gray-300"}`}>{a.action}</div><div className="text-gray-500 text-[11px]">{a.target_type} • {fmtDate(a.created_at)}</div></div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ACTION_COLORS: Record<string, string> = {
  delete_record: "text-red-400", permanent_ban: "text-red-400", edit_record: "text-yellow-400",
  edit_user: "text-yellow-400", assign_admin: "text-blue-400", award_badge: "text-teal-400",
  close_ticket: "text-green-400", unban_user: "text-green-400",
};
