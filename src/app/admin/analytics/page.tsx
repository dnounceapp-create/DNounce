"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw, TrendingUp, Database } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type DailyCount = { date: string; count: number };
type TableCounts = Record<string, number>;

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

const TABLE_GROUPS = [
  { label: "Records & Content", color: "blue", tables: ["records", "record_debate_messages", "record_community_statements", "record_vote_replies", "record_community_replies", "record_attachments", "record_debate_attachments"] },
  { label: "Voting", color: "purple", tables: ["record_votes", "record_vote_execution_votes", "voter_quality_badges"] },
  { label: "Users & Identity", color: "green", tables: ["users", "user_accountdetails", "subjects", "contributors", "user_scores", "user_preferences", "reputations"] },
  { label: "Social", color: "orange", tables: ["reactions", "pinned_records", "record_follows", "record_participant_aliases"] },
  { label: "Notifications", color: "yellow", tables: ["notifications", "notification_queue"] },
  { label: "Badges & Scores", color: "teal", tables: ["badges", "voter_quality_badges", "subject_scores"] },
  { label: "Support", color: "red", tables: ["support_tickets", "support_ticket_responses", "user_bans"] },
  { label: "Admin", color: "gray", tables: ["admin_audit_log", "admin_roles", "admin_test_actors"] },
  { label: "Lookup & Config", color: "indigo", tables: ["categories", "organizations", "relationship_types", "relationship_types_other", "record_roles", "record_roles_lookup"] },
];

const GROUP_COLORS: Record<string, string> = {
  blue: "border-blue-800 bg-blue-950/30",
  purple: "border-purple-800 bg-purple-950/30",
  green: "border-green-800 bg-green-950/30",
  orange: "border-orange-800 bg-orange-950/30",
  yellow: "border-yellow-800 bg-yellow-950/30",
  teal: "border-teal-800 bg-teal-950/30",
  red: "border-red-800 bg-red-950/30",
  gray: "border-gray-700 bg-gray-800/30",
  indigo: "border-indigo-800 bg-indigo-950/30",
};

const GROUP_TEXT: Record<string, string> = {
  blue: "text-blue-400", purple: "text-purple-400", green: "text-green-400",
  orange: "text-orange-400", yellow: "text-yellow-400", teal: "text-teal-400",
  red: "text-red-400", gray: "text-gray-400", indigo: "text-indigo-400",
};

function MiniChart({ data, color }: { data: DailyCount[]; color: string }) {
  if (!data.length) return <div className="h-10 flex items-center text-gray-600 text-xs">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="count" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function AdminAnalyticsPage() {
  const [tableCounts, setTableCounts] = useState<TableCounts>({});
  const [dailyRecords, setDailyRecords] = useState<DailyCount[]>([]);
  const [dailyVotes, setDailyVotes] = useState<DailyCount[]>([]);
  const [dailyUsers, setDailyUsers] = useState<DailyCount[]>([]);
  const [dailyReactions, setDailyReactions] = useState<DailyCount[]>([]);
  const [dailyNotifications, setDailyNotifications] = useState<DailyCount[]>([]);
  const [dailyStatements, setDailyStatements] = useState<DailyCount[]>([]);
  const [stageDistribution, setStageDistribution] = useState<{ name: string; value: number }[]>([]);
  const [credDistribution, setCredDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => { load(); }, [days]);

  async function load() {
    setLoading(true);
    try {
      const [
        counts,
        records, votes, users, reactions, notifications, statements,
        stages, creds,
      ] = await Promise.all([
        supabase.rpc("get_all_table_counts"),
        supabase.rpc("get_daily_counts", { p_table: "records", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "record_votes", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "users", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "reactions", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "notifications", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "record_community_statements", p_days: days }),
        supabase.from("records").select("status").limit(1000),
        supabase.from("records").select("credibility").limit(1000),
      ]);

      if (counts.data) setTableCounts(counts.data as TableCounts);

      const fmt = (d: any[]) => (d || []).map((r: any) => ({ date: r.date?.slice(5) ?? "", count: Number(r.count) }));
      setDailyRecords(fmt(records.data ?? []));
      setDailyVotes(fmt(votes.data ?? []));
      setDailyUsers(fmt(users.data ?? []));
      setDailyReactions(fmt(reactions.data ?? []));
      setDailyNotifications(fmt(notifications.data ?? []));
      setDailyStatements(fmt(statements.data ?? []));

      // Stage distribution
      const stageCounts: Record<string, number> = {};
      (stages.data ?? []).forEach((r: any) => { stageCounts[r.status] = (stageCounts[r.status] || 0) + 1; });
      setStageDistribution(Object.entries(stageCounts).map(([name, value]) => ({ name, value })));

      // Credibility distribution
      const credCounts: Record<string, number> = {};
      (creds.data ?? []).forEach((r: any) => {
        const c = r.credibility || "Pending";
        credCounts[c] = (credCounts[c] || 0) + 1;
      });
      setCredDistribution(Object.entries(credCounts).map(([name, value]) => ({ name, value })));
    } finally {
      setLoading(false);
    }
  }

  const chartData = dailyRecords.map((r, i) => ({
    date: r.date,
    records: r.count,
    votes: dailyVotes[i]?.count ?? 0,
    users: dailyUsers[i]?.count ?? 0,
    reactions: dailyReactions[i]?.count ?? 0,
    notifications: dailyNotifications[i]?.count ?? 0,
    statements: dailyStatements[i]?.count ?? 0,
  }));

  if (loading) return <div className="text-gray-400 text-sm animate-pulse p-8">Loading analytics…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Platform-wide data — every table tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Platform activity chart ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white text-sm font-semibold mb-4">Platform Activity — Last {days} days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
            <Line type="monotone" dataKey="records" stroke="#3b82f6" strokeWidth={2} dot={false} name="Records" />
            <Line type="monotone" dataKey="votes" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Votes" />
            <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={false} name="New Users" />
            <Line type="monotone" dataKey="reactions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Reactions" />
            <Line type="monotone" dataKey="notifications" stroke="#06b6d4" strokeWidth={2} dot={false} name="Notifications" />
            <Line type="monotone" dataKey="statements" stroke="#f97316" strokeWidth={2} dot={false} name="Statements" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Distribution charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Record Stage Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Credibility Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={credDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {credDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── All table counts ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-gray-400" />
          <h2 className="text-white text-sm font-semibold">All Tables — Live Row Counts</h2>
        </div>
        <div className="space-y-4">
          {TABLE_GROUPS.map(group => (
            <div key={group.label} className={`border rounded-2xl p-4 ${GROUP_COLORS[group.color]}`}>
              <h3 className={`text-xs font-semibold mb-3 ${GROUP_TEXT[group.color]}`}>{group.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.tables.map(table => (
                  <div key={table} className="bg-gray-900/60 rounded-xl px-3 py-2.5">
                    <div className="text-gray-400 text-[11px] font-mono truncate mb-1">{table}</div>
                    <div className="text-white text-lg font-bold">
                      {tableCounts[table] !== undefined ? tableCounts[table].toLocaleString() : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
