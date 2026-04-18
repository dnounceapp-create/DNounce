"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw, Database, TrendingUp, Users, DollarSign, ShieldCheck, BarChart2, Activity } from "lucide-react";
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
  { label: "Users & Identity", color: "green", tables: ["users", "user_accountdetails", "subjects", "contributors", "user_scores", "user_preferences", "reputations", "deleted_accounts"] },
  { label: "Social", color: "orange", tables: ["reactions", "pinned_records", "record_follows", "record_participant_aliases"] },
  { label: "Notifications", color: "yellow", tables: ["notifications", "notification_queue"] },
  { label: "Badges & Scores", color: "teal", tables: ["badges", "voter_quality_badges", "subject_scores"] },
  { label: "Support", color: "red", tables: ["support_tickets", "support_ticket_responses", "user_bans"] },
  { label: "Admin", color: "gray", tables: ["admin_audit_log", "admin_roles", "admin_test_actors"] },
  { label: "Claims & Surveys", color: "pink", tables: ["subject_claims", "survey_responses", "survey_completions"] },
  { label: "Lookup & Config", color: "indigo", tables: ["categories", "organizations", "relationship_types", "relationship_types_other", "record_roles", "record_roles_lookup"] },
  { label: "Analytics Tracking", color: "teal", tables: ["profile_views", "submit_clicks", "social_link_clicks", "record_views", "score_snapshots", "subscriptions"] },
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
  pink: "border-pink-800 bg-pink-950/30",
  indigo: "border-indigo-800 bg-indigo-950/30",
};

const GROUP_TEXT: Record<string, string> = {
  blue: "text-blue-400", purple: "text-purple-400", green: "text-green-400",
  orange: "text-orange-400", yellow: "text-yellow-400", teal: "text-teal-400",
  red: "text-red-400", gray: "text-gray-400", pink: "text-pink-400", indigo: "text-indigo-400",
};

function StatBox({ label, value, sub, color = "blue" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400",
    orange: "text-orange-400", red: "text-red-400", teal: "text-teal-400", yellow: "text-yellow-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] || "text-white"}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-gray-400" />
      <h2 className="text-white text-sm font-semibold">{title}</h2>
    </div>
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
  const [dailySubmitClicks, setDailySubmitClicks] = useState<DailyCount[]>([]);
  const [dailySocialClicks, setDailySocialClicks] = useState<DailyCount[]>([]);
  const [stageDistribution, setStageDistribution] = useState<{ name: string; value: number }[]>([]);
  const [credDistribution, setCredDistribution] = useState<{ name: string; value: number }[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Investor metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersThisMonth, setNewUsersThisMonth] = useState(0);
  const [newUsersLastMonth, setNewUsersLastMonth] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeDisputes, setActiveDisputes] = useState(0);
  const [totalVerdicts, setTotalVerdicts] = useState(0);
  const [keepCount, setKeepCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [disputeRate, setDisputeRate] = useState<number | null>(null);
  const [avgTimeToVerdict, setAvgTimeToVerdict] = useState<number | null>(null);
  const [totalProfileViews, setTotalProfileViews] = useState(0);
  const [totalSubmitClicks, setTotalSubmitClicks] = useState(0);
  const [totalSocialClicks, setTotalSocialClicks] = useState(0);
  const [totalRecordViews, setTotalRecordViews] = useState(0);
  const [subscriberCounts, setSubscriberCounts] = useState({ standard: 0, insights: 0, pro: 0 });
  const [mrr, setMrr] = useState(0);
  const [pendingVerdicts, setPendingVerdicts] = useState(0);
  const [lowQualityVoterPct, setLowQualityVoterPct] = useState<number | null>(null);

  useEffect(() => { load(); }, [days]);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        counts,
        records, votes, users, reactions, notifications, statements,
        submitClicks, socialClicks,
        stages, creds,
        allRecords, allUsers, subscriptions, voteQuality,
        profileViewsRes, recordViewsRes, submitClicksRes, socialClicksRes,
      ] = await Promise.all([
        supabase.rpc("get_all_table_counts"),
        supabase.rpc("get_daily_counts", { p_table: "records", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "record_votes", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "users", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "reactions", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "notifications", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "record_community_statements", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "submit_clicks", p_days: days }),
        supabase.rpc("get_daily_counts", { p_table: "social_link_clicks", p_days: days }),
        supabase.from("records").select("status").limit(2000),
        supabase.from("records").select("credibility").limit(2000),
        supabase.from("records").select("id, status, final_outcome, dispute_started_at, voting_ends_at, decision_made_at, created_at").limit(2000),
        supabase.from("users").select("created_at").limit(5000),
        supabase.from("subscriptions").select("plan_id, status").limit(5000),
        supabase.from("voter_quality_badges").select("is_low_quality, is_convicted").limit(5000),
        supabase.from("profile_views").select("id", { count: "exact", head: true }),
        supabase.from("record_views").select("id", { count: "exact", head: true }),
        supabase.from("submit_clicks").select("id", { count: "exact", head: true }),
        supabase.from("social_link_clicks").select("id", { count: "exact", head: true }),
      ]);

      if (counts.data) setTableCounts(counts.data as TableCounts);

      const fmt = (d: any[]) => (d || []).map((r: any) => ({ date: r.date?.slice(5) ?? "", count: Number(r.count) }));
      setDailyRecords(fmt(records.data ?? []));
      setDailyVotes(fmt(votes.data ?? []));
      setDailyUsers(fmt(users.data ?? []));
      setDailyReactions(fmt(reactions.data ?? []));
      setDailyNotifications(fmt(notifications.data ?? []));
      setDailyStatements(fmt(statements.data ?? []));
      setDailySubmitClicks(fmt(submitClicks.data ?? []));
      setDailySocialClicks(fmt(socialClicks.data ?? []));

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

      // ── Investor metrics ──────────────────────────────────────────────────

      // Users
      const allUsersData = allUsers.data ?? [];
      setTotalUsers(allUsersData.length);
      setNewUsersThisMonth(allUsersData.filter((u: any) => u.created_at >= thisMonthStart).length);
      setNewUsersLastMonth(allUsersData.filter((u: any) => u.created_at >= lastMonthStart && u.created_at < lastMonthEnd).length);

      // Records
      const allRecordsData = allRecords.data ?? [];
      setTotalRecords(allRecordsData.length);

      const published = allRecordsData.filter((r: any) => r.status !== "ai_verification" && r.status !== "subject_notified");
      const disputed = allRecordsData.filter((r: any) => ["deletion_request", "debate", "voting", "decision"].includes(r.status));
      setActiveDisputes(disputed.filter((r: any) => !r.decision_made_at).length);

      const verdicts = allRecordsData.filter((r: any) => r.final_outcome);
      setTotalVerdicts(verdicts.length);
      setKeepCount(verdicts.filter((r: any) => r.final_outcome === "keep").length);
      setDeleteCount(verdicts.filter((r: any) => r.final_outcome === "delete").length);

      // Dispute rate
      if (published.length > 0) {
        setDisputeRate(Math.round((disputed.length / published.length) * 100));
      }

      // Avg time to verdict (days)
      const completedWithDates = verdicts.filter((r: any) => r.created_at && r.decision_made_at);
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((acc: number, r: any) => {
          return acc + (new Date(r.decision_made_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        setAvgTimeToVerdict(Math.round(totalDays / completedWithDates.length));
      }

      // Pending verdicts (decision stage, verdict not yet announced)
      setPendingVerdicts(allRecordsData.filter((r: any) =>
        r.status === "decision" && !r.decision_made_at
      ).length);

      // Subscriptions
      const subsData = subscriptions.data ?? [];
      const active = subsData.filter((s: any) => s.status === "active");
      const planCounts = { standard: 0, insights: 0, pro: 0 };
      active.forEach((s: any) => {
        if (s.plan_id === "pro") planCounts.pro++;
        else if (s.plan_id === "insights") planCounts.insights++;
        else planCounts.standard++;
      });
      setSubscriberCounts(planCounts);
      setPlanDistribution([
        { name: "Standard", value: planCounts.standard },
        { name: "Insights", value: planCounts.insights },
        { name: "Pro", value: planCounts.pro },
      ]);
      // MRR: Insights = $9.99, Pro = $24.99
      setMrr(Math.round(planCounts.insights * 9.99 + planCounts.pro * 24.99));

      // Voter quality
      const vqData = voteQuality.data ?? [];
      if (vqData.length > 0) {
        const lowQuality = vqData.filter((v: any) => v.is_low_quality || v.is_convicted).length;
        setLowQualityVoterPct(Math.round((lowQuality / vqData.length) * 100));
      }

      // Tracking counts
      setTotalProfileViews(profileViewsRes.count ?? 0);
      setTotalRecordViews(recordViewsRes.count ?? 0);
      setTotalSubmitClicks(submitClicksRes.count ?? 0);
      setTotalSocialClicks(socialClicksRes.count ?? 0);

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

  const trackingChartData = dailySubmitClicks.map((r, i) => ({
    date: r.date,
    submitClicks: r.count,
    socialClicks: dailySocialClicks[i]?.count ?? 0,
  }));

  const momGrowth = newUsersLastMonth > 0
    ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
    : newUsersThisMonth > 0 ? 100 : 0;

  const keepDeleteRatio = keepCount + deleteCount > 0
    ? `${Math.round((keepCount / (keepCount + deleteCount)) * 100)}% kept`
    : "—";

  const paidSubscribers = subscriberCounts.insights + subscriberCounts.pro;
  const conversionRate = totalUsers > 0 ? ((paidSubscribers / totalUsers) * 100).toFixed(1) : "0";

  if (loading) return <div className="text-gray-400 text-sm animate-pulse p-8">Loading analytics…</div>;

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Platform-wide data — investor metrics, Pro tracking, and every table</p>
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

      {/* ── INVESTOR METRICS ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={TrendingUp} title="Investor Metrics" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatBox label="Total Users" value={totalUsers.toLocaleString()} color="blue" />
          <StatBox label="New Users This Month" value={newUsersThisMonth} sub={`${momGrowth > 0 ? "+" : ""}${momGrowth}% vs last month`} color={momGrowth >= 0 ? "green" : "red"} />
          <StatBox label="MoM User Growth" value={`${momGrowth > 0 ? "+" : ""}${momGrowth}%`} sub={`${newUsersLastMonth} last month`} color={momGrowth >= 0 ? "green" : "red"} />
          <StatBox label="Total Records" value={totalRecords.toLocaleString()} color="blue" />
          <StatBox label="Active Disputes" value={activeDisputes} sub="Records in stages 4-6" color="orange" />
          <StatBox label="Total Verdicts" value={totalVerdicts} sub={keepDeleteRatio} color="purple" />
          <StatBox label="Dispute Rate" value={disputeRate !== null ? `${disputeRate}%` : "—"} sub="Of published records disputed" color="orange" />
          <StatBox label="Avg. Time to Verdict" value={avgTimeToVerdict !== null ? `${avgTimeToVerdict}d` : "—"} sub="From submission to decision" color="teal" />
          <StatBox label="Pending Verdicts" value={pendingVerdicts} sub="Awaiting announcement" color="yellow" />
          <StatBox label="Keep / Delete Ratio" value={keepDeleteRatio} sub={`${keepCount} kept · ${deleteCount} deleted`} color="green" />
          <StatBox label="Low Quality Voter %" value={lowQualityVoterPct !== null ? `${lowQualityVoterPct}%` : "—"} sub="Of all cast votes" color={lowQualityVoterPct !== null && lowQualityVoterPct > 20 ? "red" : "green"} />
        </div>
      </section>

      {/* ── REVENUE ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={DollarSign} title="Revenue & Subscriptions" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatBox label="MRR" value={`$${mrr.toLocaleString()}`} sub="Monthly recurring revenue" color="green" />
          <StatBox label="ARR" value={`$${(mrr * 12).toLocaleString()}`} sub="Annualized" color="green" />
          <StatBox label="Paid Subscribers" value={paidSubscribers} sub="Insights + Pro" color="blue" />
          <StatBox label="Free → Paid Conversion" value={`${conversionRate}%`} sub="Of total users" color="purple" />
          <StatBox label="Standard Users" value={subscriberCounts.standard} sub="Free tier" color="gray" />
          <StatBox label="Insights Subscribers" value={subscriberCounts.insights} sub="$9.99/mo" color="blue" />
          <StatBox label="Pro Subscribers" value={subscriberCounts.pro} sub="$24.99/mo" color="purple" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white text-xs font-semibold mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {planDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── SITE & PROFILE TRACKING ──────────────────────────────────────── */}
      <section>
        <SectionTitle icon={Activity} title="Site & Profile Tracking" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatBox label="Total Profile Views" value={totalProfileViews.toLocaleString()} sub="All subject profile visits" color="blue" />
          <StatBox label="Total Record Views" value={totalRecordViews.toLocaleString()} sub="Unique views per day per record" color="indigo" />
          <StatBox label="Submit Button Clicks" value={totalSubmitClicks.toLocaleString()} sub="Clicks on Submit A Record" color="orange" />
          <StatBox label="Social Link Clicks" value={totalSocialClicks.toLocaleString()} sub="Outbound social clicks" color="teal" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white text-xs font-semibold mb-4">Submit & Social Clicks — Last {days} days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trackingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Line type="monotone" dataKey="submitClicks" stroke="#f97316" strokeWidth={2} dot={false} name="Submit Clicks" />
              <Line type="monotone" dataKey="socialClicks" stroke="#06b6d4" strokeWidth={2} dot={false} name="Social Clicks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── PLATFORM ACTIVITY ────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={BarChart2} title="Platform Activity" />
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white text-sm font-semibold mb-4">Activity — Last {days} days</h2>
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
      </section>

      {/* ── DISTRIBUTIONS ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={ShieldCheck} title="Record & Platform Health" />
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
                <Pie data={credDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {credDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── TABLE COUNTS ─────────────────────────────────────────────────── */}
      <section>
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
      </section>

    </div>
  );
}