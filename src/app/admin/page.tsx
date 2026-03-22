"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FileText, Users, Ticket, Flag, Bell, Award,
  TrendingUp, AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import Link from "next/link";

type Stats = {
  totalRecords: number;
  publishedRecords: number;
  activeDisputes: number;
  votingRecords: number;
  totalUsers: number;
  bannedUsers: number;
  openTickets: number;
  openReports: number;
  notificationsSent: number;
  totalBadges: number;
};

function StatCard({
  label, value, icon: Icon, color, href, sublabel,
}: {
  label: string; value: number | string; icon: any; color: string; href: string; sublabel?: string;
}) {
  return (
    <Link href={href} className="block bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
          {sublabel && <p className="text-gray-500 text-xs mt-1">{sublabel}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Link>
  );
}

type RecentRecord = {
  id: string;
  status: string;
  category: string;
  created_at: string;
  subject: { name: string } | null;
};

type RecentTicket = {
  id: string;
  type: string;
  topic: string;
  status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: totalRecords },
        { count: publishedRecords },
        { count: activeDisputes },
        { count: votingRecords },
        { count: totalUsers },
        { count: bannedUsers },
        { count: openTickets },
        { count: openReports },
        { count: notificationsSent },
        { count: totalBadges },
        { data: records },
        { data: tickets },
      ] = await Promise.all([
        supabase.from("records").select("*", { count: "exact", head: true }),
        supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("records").select("*", { count: "exact", head: true }).in("status", ["deletion_request", "debate"]),
        supabase.from("records").select("*", { count: "exact", head: true }).eq("status", "voting"),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_banned", true),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open").eq("type", "support"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open").eq("type", "report"),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
        supabase.from("badges").select("*", { count: "exact", head: true }),
        supabase.from("records").select("id, status, category, created_at, subject:subjects(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("support_tickets").select("id, type, topic, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        totalRecords: totalRecords ?? 0,
        publishedRecords: publishedRecords ?? 0,
        activeDisputes: activeDisputes ?? 0,
        votingRecords: votingRecords ?? 0,
        totalUsers: totalUsers ?? 0,
        bannedUsers: bannedUsers ?? 0,
        openTickets: openTickets ?? 0,
        openReports: openReports ?? 0,
        notificationsSent: notificationsSent ?? 0,
        totalBadges: totalBadges ?? 0,
      });

      setRecentRecords((records as any[]) ?? []);
      setRecentTickets((tickets as any[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm animate-pulse">Loading dashboard…</div>;

  const s = stats!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Platform overview — live data</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={s.totalRecords} icon={FileText} color="bg-blue-500/20 text-blue-400" href="/admin/records" sublabel={`${s.publishedRecords} published`} />
        <StatCard label="Active Disputes" value={s.activeDisputes} icon={AlertTriangle} color="bg-orange-500/20 text-orange-400" href="/admin/records?status=debate" sublabel={`${s.votingRecords} in voting`} />
        <StatCard label="Total Users" value={s.totalUsers} icon={Users} color="bg-green-500/20 text-green-400" href="/admin/users" sublabel={`${s.bannedUsers} banned`} />
        <StatCard label="Open Tickets" value={s.openTickets} icon={Ticket} color="bg-purple-500/20 text-purple-400" href="/admin/tickets" sublabel={`${s.openReports} reports`} />
        <StatCard label="Open Reports" value={s.openReports} icon={Flag} color="bg-red-500/20 text-red-400" href="/admin/reports" />
        <StatCard label="Notifications Sent" value={s.notificationsSent} icon={Bell} color="bg-yellow-500/20 text-yellow-400" href="/admin/notifications" />
        <StatCard label="Badges Awarded" value={s.totalBadges} icon={Award} color="bg-teal-500/20 text-teal-400" href="/admin/badges" />
        <StatCard label="Voting Active" value={s.votingRecords} icon={TrendingUp} color="bg-indigo-500/20 text-indigo-400" href="/admin/records?status=voting" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent records */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold">Recent Records</h2>
            <Link href="/admin/records" className="text-gray-400 hover:text-white text-xs">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentRecords.length === 0 ? (
              <p className="text-gray-500 text-sm">No records yet.</p>
            ) : recentRecords.map((r) => (
              <Link key={r.id} href={`/admin/records?id=${r.id}`} className="flex items-center justify-between gap-3 hover:bg-gray-800 rounded-xl px-3 py-2 transition">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{(r.subject as any)?.name ?? "Unknown"}</p>
                  <p className="text-gray-500 text-[11px]">{r.category}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  r.status === "published" ? "bg-green-900 text-green-400"
                  : r.status === "debate" ? "bg-orange-900 text-orange-400"
                  : r.status === "voting" ? "bg-blue-900 text-blue-400"
                  : "bg-gray-800 text-gray-400"
                }`}>{r.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent tickets */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-sm font-semibold">Recent Tickets</h2>
            <Link href="/admin/tickets" className="text-gray-400 hover:text-white text-xs">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <p className="text-gray-500 text-sm">No tickets yet.</p>
            ) : recentTickets.map((t) => (
              <Link key={t.id} href={`/admin/tickets?id=${t.id}`} className="flex items-center justify-between gap-3 hover:bg-gray-800 rounded-xl px-3 py-2 transition">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{t.topic}</p>
                  <p className="text-gray-500 text-[11px]">{t.type}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  t.status === "open" ? "bg-yellow-900 text-yellow-400"
                  : t.status === "closed" ? "bg-gray-800 text-gray-400"
                  : "bg-blue-900 text-blue-400"
                }`}>{t.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
