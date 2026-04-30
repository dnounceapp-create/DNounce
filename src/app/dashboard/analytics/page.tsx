"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Lock, TrendingUp, Eye, BarChart2, Users, MapPin, Star,
  FileText, ShieldCheck, ArrowRight, Search,
  Clock, Award, Target, Zap, Flame, AlertTriangle, MessageSquare,
  Activity, Heart, BookmarkCheck, Bell, Download,
} from "lucide-react";
import Link from "next/link";

type PlanId = "standard" | "insights" | "pro";

interface AnalyticsData {
  planId: string;
  totalVotesCast: number;
  totalCitizenStatements: number;
  totalDebateStatements: number;
  totalSubmitted: number;
  totalRecordsAboutMe: number;
  subjectScore: number | null;
  totalProfileViews: number;
  uniqueViewers: number;
  newViewerCount: number;
  returningCount: number;
  timeOfDay: { morning: number; afternoon: number; evening: number; night: number };
  peakDay: string | null;
  peakDayData: { day: string; count: number }[];
  topLocations: { location: string; count: number }[];
  totalImpressions: number;
  topKeywords: { keyword: string; count: number }[];
  sided_contributor: number;
  sided_subject: number;
  pending: number;
  pctSidedContributor: number;
  pctSidedSubject: number;
  pctPending: number;
  credibilityBreakdown: { label: string; count: number }[];
  categoryBreakdown: { label: string; count: number }[];
  mostActiveRecord: { id: string; category: string; votes: number; statements: number; totalActivity: number } | null;
  mostControversialRecord: { id: string; category: string; contributor: number; subject: number } | null;
  longestDebateRecord: { id: string; category: string; messageCount: number } | null;
  disputeResolutionRate: number | null;
  avgVotingDays: number | null;
  contributorSuccessRate: number | null;
  mostActiveRole: string | null;
  roleActivity: Record<string, number>;
  comparisonData: { category: string; myScore: string; avgScore: string; sampleSize: number; percentile: number } | null;
  pro: {
    monthlyGrowthRate: number;
    thisMonthViews: number;
    lastMonthViews: number;
    trafficSources: { source: string; count: number; pct: number }[];
    viewerRoleDistribution: { role: string; count: number }[];
    repeatVisitorRate: number;
    peakGrowthWeek: { week: string; count: number } | null;
    weeklyNewViewers: { week: string; count: number }[];
    totalSubmitClicks: number;
    totalSocialClicks: number;
    profileToSubmitRate: number;
    profileToSocialRate: number;
    searchToProfileRate: number;
    socialClicksByPlatform: { platform: string; count: number }[];
    topRecordsByViews: { id: string; category: string; views: number }[];
    totalRecordViews: number;
    avgHoursToFirstVote: number | null;
    voterQualityScore: number | null;
    streakWeeks: number;
    reputationHealthScore: number;
    scoreSnapshots: { subject_score: number; credibility_score: number; overall_score: number; week_start: string }[];
    marketPosition: { rank: number; total: number; topPct: number; category: string; medianScore: string; myScore: string } | null;
    totalFollowers: number;
    totalPins: number;
    notifOptIns: number;
  } | null;
}

function StatCard({ icon, label, value, sub, color = "blue" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color?: "blue" | "indigo" | "green" | "purple" | "orange" | "red" | "pink";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600", red: "bg-red-50 text-red-600",
    pink: "bg-pink-50 text-pink-600",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{value}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</h2>;
}

function LockedCard({ label }: { label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3 relative overflow-hidden">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-gray-300 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-100 select-none">███</p>
      </div>
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40 flex items-center justify-center">
        <Lock className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  );
}

function StandardLockedOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 gap-4 p-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <Lock className="w-7 h-7 text-indigo-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics Locked</h3>
        <p className="text-sm text-gray-500 max-w-xs">Upgrade to Insights or Pro to unlock your reputation analytics dashboard.</p>
      </div>
      <Link href="/dashboard/settings/billing" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:brightness-110 transition">
        Upgrade Plan <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function InsightsContent({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="Profile Views" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Eye className="w-5 h-5" />} label="Total Profile Views" value={data.totalProfileViews} color="blue" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Unique Viewers" value={data.uniqueViewers} color="indigo" />
          <StatCard icon={<Zap className="w-5 h-5" />} label="New Viewers" value={data.newViewerCount} sub="First-time visitors" color="green" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Returning Viewers" value={data.returningCount} sub="Visited more than once" color="purple" />
        </div>
      </div>

      {data.peakDay && (
        <div>
          <SectionHeader title="Peak Activity Day" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">Most views on <span className="font-semibold text-gray-800">{data.peakDay}</span></p>
            <div className="space-y-2">
              {data.peakDayData.map((d) => (
                <BarRow key={d.day} label={d.day} value={d.count} max={Math.max(...data.peakDayData.map(x => x.count))} color="bg-blue-400" />
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="When People View Your Profile" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="space-y-3">
            <BarRow label="Morning" value={data.timeOfDay.morning} max={Math.max(...Object.values(data.timeOfDay))} color="bg-yellow-400" />
            <BarRow label="Afternoon" value={data.timeOfDay.afternoon} max={Math.max(...Object.values(data.timeOfDay))} color="bg-orange-400" />
            <BarRow label="Evening" value={data.timeOfDay.evening} max={Math.max(...Object.values(data.timeOfDay))} color="bg-blue-400" />
            <BarRow label="Night" value={data.timeOfDay.night} max={Math.max(...Object.values(data.timeOfDay))} color="bg-indigo-400" />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Geographic Viewer Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          {data.topLocations.length > 0 ? (
            <div className="space-y-3">
              {data.topLocations.map((l) => (
                <BarRow key={l.location} label={l.location} value={l.count} max={data.topLocations[0].count} color="bg-blue-400" />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Geographic data will appear as more people view your profile.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Search Appearance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Search className="w-5 h-5" />} label="Times Appeared in Search" value={data.totalImpressions} color="purple" />
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3">Top Search Keywords</p>
            {data.topKeywords.length > 0 ? (
              <div className="space-y-2">
                {data.topKeywords.map((k) => (
                  <BarRow key={k.keyword} label={k.keyword} value={k.count} max={data.topKeywords[0].count} color="bg-purple-400" />
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">No keyword data yet.</p>}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Your Contributor Credibility Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">Credibility classification of the records you submitted</p>
          {data.credibilityBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.credibilityBreakdown.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-gray-400">—</span>
                  <span className="font-bold text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No credibility data yet.</p>}
        </div>
      </div>

      <div>
        <SectionHeader title="Category Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">What labels users most associate you with</p>
          {data.categoryBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.categoryBreakdown.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-gray-400">—</span>
                  <span className="font-bold text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No category data yet.</p>}
        </div>
      </div>

      <div>
        <SectionHeader title="Notable Records" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.mostActiveRecord ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Flame className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Most Active Record</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{data.mostActiveRecord.category}</p>
              <p className="text-xs text-gray-400 mt-1">{data.mostActiveRecord.votes} votes · {data.mostActiveRecord.statements} citizen statements</p>
              <Link href={`/record/${data.mostActiveRecord.id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">View record <ArrowRight className="w-3 h-3" /></Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Flame className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Most Active Record</p>
              </div>
              <p className="text-xs text-gray-400">No records with activity yet.</p>
            </div>
          )}

          {data.mostControversialRecord ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Most Controversial Record</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{data.mostControversialRecord.category}</p>
              <p className="text-xs text-gray-400 mt-1">{data.mostControversialRecord.contributor} with contributor · {data.mostControversialRecord.subject} delete</p>
              <Link href={`/record/${data.mostControversialRecord.id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">View record <ArrowRight className="w-3 h-3" /></Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0"><AlertTriangle className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Most Controversial Record</p>
              </div>
              <p className="text-xs text-gray-400">No contested records yet.</p>
            </div>
          )}

          {data.longestDebateRecord ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><MessageSquare className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Longest Debate</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{data.longestDebateRecord.category}</p>
              <p className="text-xs text-gray-400 mt-1">{data.longestDebateRecord.messageCount} debate statements</p>
              <Link href={`/record/${data.longestDebateRecord.id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">View record <ArrowRight className="w-3 h-3" /></Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><MessageSquare className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-gray-700">Longest Debate</p>
              </div>
              <p className="text-xs text-gray-400">No debate activity yet.</p>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Star className="w-4 h-4" /></div>
              <p className="text-xs font-semibold text-gray-700">Your Most Active Role</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{data.mostActiveRole ?? "—"}</p>
            <div className="mt-2 space-y-1">
              {Object.entries(data.roleActivity).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{role}</span>
                  <span className="text-xs font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Dispute Resolution" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Dispute Resolution Rate" value={data.disputeResolutionRate !== null ? `${data.disputeResolutionRate}%` : "—"} sub="Disputes resolved in your favor" color="green" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Avg. Voting Duration" value={data.avgVotingDays !== null ? `${data.avgVotingDays}d` : "—"} sub="Days from voting open to decision" color="orange" />
        </div>
      </div>

      <div>
        <SectionHeader title="Contributor & Subject Success" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Target className="w-5 h-5" />} label="Contributor Success Rate" value={data.contributorSuccessRate !== null ? `${data.contributorSuccessRate}%` : "—"} sub={`${data.sided_contributor} with contributor · ${data.sided_subject} with subject`} color="green" />
          <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Subject Success Rate" value={data.disputeResolutionRate !== null ? `${data.disputeResolutionRate}%` : "—"} sub="Disputes about you resolved in your favor" color="blue" />
        </div>
      </div>

      <div>
        <SectionHeader title="Comparison vs Similar Profiles" />
        {data.comparisonData ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">Compared to <span className="font-semibold text-gray-700">{data.comparisonData.sampleSize}</span> other <span className="font-semibold text-gray-700">{data.comparisonData.category}</span> profiles on DNounce</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-blue-600">{data.comparisonData.myScore}</p><p className="text-xs text-gray-400 mt-0.5">Your Score</p></div>
              <div><p className="text-2xl font-bold text-gray-400">{data.comparisonData.avgScore}</p><p className="text-xs text-gray-400 mt-0.5">Category Avg</p></div>
              <div><p className="text-2xl font-bold text-indigo-600">{data.comparisonData.percentile}%</p><p className="text-xs text-gray-400 mt-0.5">Percentile</p></div>
            </div>
            <div className="mt-4 bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${data.comparisonData.percentile}%` }} />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <Award className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Not enough similar profiles yet to compare. Check back as more users join.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProContent({ data }: { data: AnalyticsData }) {
  const pro = data.pro!;

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Profile Views", data.totalProfileViews],
      ["Unique Viewers", data.uniqueViewers],
      ["New Viewers", data.newViewerCount],
      ["Returning Viewers", data.returningCount],
      ["Monthly Growth Rate", `${pro.monthlyGrowthRate}%`],
      ["This Month Views", pro.thisMonthViews],
      ["Last Month Views", pro.lastMonthViews],
      ["Repeat Visitor Rate", `${pro.repeatVisitorRate}%`],
      ["Search Impressions", data.totalImpressions],
      ["Search to Profile Rate", `${pro.searchToProfileRate}%`],
      ["Submit Clicks", pro.totalSubmitClicks],
      ["Profile to Submit Rate", `${pro.profileToSubmitRate}%`],
      ["Social Link Clicks", pro.totalSocialClicks],
      ["Dispute Resolution Rate", data.disputeResolutionRate !== null ? `${data.disputeResolutionRate}%` : "—"],
      ["Contributor Success Rate", data.contributorSuccessRate !== null ? `${data.contributorSuccessRate}%` : "—"],
      ["Streak Weeks", pro.streakWeeks],
      ["Voter Quality Score", pro.voterQualityScore !== null ? `${pro.voterQualityScore}%` : "—"],
      ["Total Followers", pro.totalFollowers],
      ["Total Pins", pro.totalPins],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dnounce-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">

      {/* Market Position */}
      {pro.marketPosition && (
        <div>
          <SectionHeader title="Market Position" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">
              {pro.marketPosition.total <= 1
                ? <>You are the first <span className="font-semibold text-gray-700">{pro.marketPosition.category}</span> on DNounce.</>
                : <>Your standing among <span className="font-semibold text-gray-700">{pro.marketPosition.total}</span> other <span className="font-semibold text-gray-700">{pro.marketPosition.category}</span> profiles on DNounce</>
              }
            </p>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div><p className="text-2xl font-bold text-indigo-600">#{pro.marketPosition.rank}</p><p className="text-xs text-gray-400 mt-0.5">Your Rank</p></div>
              <div><p className="text-2xl font-bold text-blue-600">Top {pro.marketPosition.topPct}%</p><p className="text-xs text-gray-400 mt-0.5">Percentile</p></div>
              <div><p className="text-2xl font-bold text-gray-400">{pro.marketPosition.medianScore}</p><p className="text-xs text-gray-400 mt-0.5">Category Median</p></div>
            </div>
            <div className="bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${100 - pro.marketPosition.topPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Score Trajectory */}
      {pro.scoreSnapshots.length > 0 && (
        <div>
          <SectionHeader title="Score Trajectory (Last 13 Weeks)" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-x-auto">
            <div className="flex items-end gap-2 h-24 min-w-max">
              {pro.scoreSnapshots.map((snap, i) => {
                const score = Number(snap.subject_score ?? 0);
                const maxScore = Math.max(...pro.scoreSnapshots.map(s => Number(s.subject_score ?? 0)));
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 w-8">
                    <span className="text-[9px] text-gray-400">{score.toFixed(0)}</span>
                    <div className="w-6 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t" style={{ height: `${Math.max(4, pct * 0.72)}px` }} />
                    <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">{snap.week_start.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Awareness / Growth */}
      <div>
        <SectionHeader title="Audience Growth" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Monthly Growth Rate" value={`${pro.monthlyGrowthRate > 0 ? "+" : ""}${pro.monthlyGrowthRate}%`} sub={`${pro.thisMonthViews} this month vs ${pro.lastMonthViews} last month`} color={pro.monthlyGrowthRate >= 0 ? "green" : "red"} />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Repeat Visitor Rate" value={`${pro.repeatVisitorRate}%`} sub="Viewers who came back more than once" color="purple" />
        </div>

        {pro.peakGrowthWeek && (
          <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">Peak Growth Week</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{pro.peakGrowthWeek.week}</p>
            <p className="text-xs text-gray-400">{pro.peakGrowthWeek.count} views in that week</p>
          </div>
        )}
      </div>

      {/* Traffic Sources */}
      <div>
        <SectionHeader title="Traffic Source Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">How people are finding your profile</p>
          <div className="space-y-3">
            {pro.trafficSources.map((s) => (
              <div key={s.source} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 shrink-0 capitalize">{s.source.replace("_", " ")}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-400" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-12 text-right">{s.pct}% ({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Viewer Role Distribution */}
      {pro.viewerRoleDistribution.length > 0 && (
        <div>
          <SectionHeader title="Viewer Role Distribution" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">Who is visiting your profile — aggregated, no individual exposure</p>
            <div className="space-y-3">
              {pro.viewerRoleDistribution.map((r) => (
                <BarRow key={r.role} label={r.role} value={r.count} max={Math.max(...pro.viewerRoleDistribution.map(x => x.count))} color="bg-indigo-400" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      <div>
        <SectionHeader title="Conversion Funnel" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Search className="w-5 h-5" />} label="Search → Profile Rate" value={`${pro.searchToProfileRate}%`} sub={`${data.totalImpressions} impressions → ${data.totalProfileViews} views`} color="purple" />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Profile → Submit Rate" value={`${pro.profileToSubmitRate}%`} sub={`${pro.totalSubmitClicks} submit clicks`} color="orange" />
          <StatCard icon={<Zap className="w-5 h-5" />} label="Profile → Social Click Rate" value={`${pro.profileToSocialRate}%`} sub={`${pro.totalSocialClicks} social link clicks`} color="pink" />
          {pro.socialClicksByPlatform.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium mb-3">Social Clicks by Platform</p>
              <div className="space-y-2">
                {pro.socialClicksByPlatform.map((p) => (
                  <BarRow key={p.platform} label={p.platform} value={p.count} max={pro.socialClicksByPlatform[0].count} color="bg-pink-400" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Performance */}
      {pro.topRecordsByViews.length > 0 && (
        <div>
          <SectionHeader title="Record Performance" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">Records about you ranked by total views — {pro.totalRecordViews} total record views</p>
            <div className="space-y-3">
              {pro.topRecordsByViews.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <Link href={`/record/${r.id}`} className="text-sm font-medium text-blue-600 hover:underline truncate max-w-[60%]">{r.category}</Link>
                  <span className="text-xs font-semibold text-gray-700">{r.views} views</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Velocity */}
      <div>
        <SectionHeader title="Engagement Velocity" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Clock className="w-5 h-5" />} label="Avg. Hours to First Vote" value={pro.avgHoursToFirstVote !== null ? `${pro.avgHoursToFirstVote}h` : "—"} sub="After a record is published about you" color="orange" />
          <StatCard icon={<BarChart2 className="w-5 h-5" />} label="Voter Quality Score" value={pro.voterQualityScore !== null ? `${pro.voterQualityScore}%` : "—"} sub="% of high-quality voters on your records" color="green" />
        </div>
      </div>

      {/* Streak */}
      <div>
        <SectionHeader title="Reputation Streak" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{pro.streakWeeks} <span className="text-base font-normal text-gray-400">weeks</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Consecutive weeks without a deletion request on your profile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Signals */}
      <div>
        <SectionHeader title="Retention & Loyalty Signals" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Heart className="w-5 h-5" />} label="Record Followers" value={pro.totalFollowers} sub="People following your records" color="pink" />
          <StatCard icon={<BookmarkCheck className="w-5 h-5" />} label="Record Pins" value={pro.totalPins} sub="People who pinned your records" color="indigo" />
          <StatCard icon={<Bell className="w-5 h-5" />} label="Notification Opt-ins" value={pro.notifOptIns} sub="People receiving updates about your records" color="blue" />
        </div>
      </div>

      {/* Insights sections also shown in Pro */}
      <div>
        <SectionHeader title="Profile Views Detail" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Eye className="w-5 h-5" />} label="Total Profile Views" value={data.totalProfileViews} color="blue" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Unique Viewers" value={data.uniqueViewers} color="indigo" />
        </div>
      </div>

      {data.peakDay && (
        <div>
          <SectionHeader title="Peak Activity Day" />
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-4">Most views on <span className="font-semibold text-gray-800">{data.peakDay}</span></p>
            <div className="space-y-2">
              {data.peakDayData.map((d) => (
                <BarRow key={d.day} label={d.day} value={d.count} max={Math.max(...data.peakDayData.map(x => x.count))} color="bg-blue-400" />
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="When People View Your Profile" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="space-y-3">
            <BarRow label="Morning" value={data.timeOfDay.morning} max={Math.max(...Object.values(data.timeOfDay))} color="bg-yellow-400" />
            <BarRow label="Afternoon" value={data.timeOfDay.afternoon} max={Math.max(...Object.values(data.timeOfDay))} color="bg-orange-400" />
            <BarRow label="Evening" value={data.timeOfDay.evening} max={Math.max(...Object.values(data.timeOfDay))} color="bg-blue-400" />
            <BarRow label="Night" value={data.timeOfDay.night} max={Math.max(...Object.values(data.timeOfDay))} color="bg-indigo-400" />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Geographic Viewer Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          {data.topLocations.length > 0 ? (
            <div className="space-y-3">
              {data.topLocations.map((l) => (
                <BarRow key={l.location} label={l.location} value={l.count} max={data.topLocations[0].count} color="bg-blue-400" />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Geographic data will appear as more people view your profile.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Search Appearance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Search className="w-5 h-5" />} label="Times Appeared in Search" value={data.totalImpressions} color="purple" />
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-3">Top Search Keywords</p>
            {data.topKeywords.length > 0 ? (
              <div className="space-y-2">
                {data.topKeywords.map((k) => (
                  <BarRow key={k.keyword} label={k.keyword} value={k.count} max={data.topKeywords[0].count} color="bg-purple-400" />
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">No keyword data yet.</p>}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Contributor & Subject Success" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<Target className="w-5 h-5" />} label="Contributor Success Rate" value={data.contributorSuccessRate !== null ? `${data.contributorSuccessRate}%` : "—"} sub={`${data.sided_contributor} with contributor · ${data.sided_subject} with subject`} color="green" />
          <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Subject Success Rate" value={data.disputeResolutionRate !== null ? `${data.disputeResolutionRate}%` : "—"} sub="Disputes about you resolved in your favor" color="blue" />
        </div>
      </div>

      <div>
        <SectionHeader title="Your Contributor Credibility Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">Credibility classification of the records you submitted</p>
          {data.credibilityBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.credibilityBreakdown.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-gray-400">—</span>
                  <span className="font-bold text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No credibility data yet.</p>}
        </div>
      </div>

      <div>
        <SectionHeader title="Category Breakdown" />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">What labels users most associate you with</p>
          {data.categoryBreakdown.length > 0 ? (
            <div className="space-y-2">
              {data.categoryBreakdown.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-gray-400">—</span>
                  <span className="font-bold text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">No category data yet.</p>}
        </div>
      </div>

      {/* Export CSV */}
      <div>
        <SectionHeader title="Export" />
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-gray-700 to-gray-900 hover:brightness-110 transition shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Analytics as CSV
        </button>
      </div>

    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [planId, setPlanId] = useState<PlanId>("standard");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) { router.replace(`/loginsignup?redirectTo=/dashboard/analytics`); return; }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .single();

      const plan = (sub?.plan_id ?? "standard") as PlanId;
      setPlanId(plan);

      if (plan === "standard") { setLoading(false); return; }

      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      }

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return null;

  const planBadge = (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      planId === "pro" ? "bg-indigo-50 border-indigo-200 text-indigo-700"
      : planId === "insights" ? "bg-blue-50 border-blue-200 text-blue-700"
      : "bg-gray-100 border-gray-200 text-gray-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${planId === "pro" ? "bg-indigo-500" : planId === "insights" ? "bg-blue-500" : "bg-gray-400"}`} />
      {planId === "pro" ? "Pro" : planId === "insights" ? "Insights" : "Standard"}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6 sm:p-6 lg:p-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Analytics</h1>
            <p className="text-gray-500 text-sm">Your reputation activity at a glance.</p>
          </div>
          {planBadge}
        </div>

        {planId === "standard" && (
          <div className="relative mt-2 min-h-[200px] sm:min-h-[320px]">
            <StandardLockedOverlay />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 blur-sm pointer-events-none select-none">
              {["Profile Views", "Search Impressions", "Credibility Breakdown", "Category Breakdown",
                "Most Active Record", "Dispute Resolution", "Contributor Success Rate", "Comparison"]
                .slice(0, typeof window !== "undefined" && window.innerWidth < 640 ? 3 : 8)
                .map((label) => (
                <LockedCard key={label} label={label} />
              ))}
            </div>
          </div>
        )}

        {planId === "insights" && data && <InsightsContent data={data} />}
        {planId === "pro" && data && data.pro && <ProContent data={data} />}

        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
            Failed to load analytics: {error}
          </div>
        )}
      </div>
    </div>
  );
}