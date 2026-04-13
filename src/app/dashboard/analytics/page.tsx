"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, TrendingUp, Eye, BarChart2, Users, MapPin, Star, Zap, FileText, ShieldCheck, ThumbsUp, ArrowRight } from "lucide-react";
import Link from "next/link";

type PlanId = "standard" | "insights" | "pro";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function LockedCard({ label }: { label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3 relative overflow-hidden">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-gray-300 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-100 select-none">███</p>
        <p className="text-xs text-gray-100 mt-0.5 select-none">████████</p>
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
        <p className="text-sm text-gray-500 max-w-xs">
          Upgrade to Insights or Pro to unlock your reputation analytics dashboard.
        </p>
      </div>
      <Link
        href="/dashboard/settings/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:brightness-110 transition"
      >
        Upgrade Plan <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [planId, setPlanId] = useState<PlanId>("insights");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    profileViews: 0,
    recordImpressions: 0,
    recordsSubmitted: 0,
    recordsReceived: 0,
    votescast: 0,
    upvotes: 0,
    comments: 0,
    credibilityScore: 0,
    subjectScore: 0,
  });

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) { router.replace("/loginsignup"); return; }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .single();

      if (sub?.plan_id) setPlanId(sub.plan_id as PlanId);

      const [
        { count: recordsSubmitted },
        { count: votescast },
        { count: comments },
        { data: userScore },
        { data: subjectData },
      ] = await Promise.all([
        supabase.from("records").select("*", { count: "exact", head: true }).eq("contributor_id", user.id),
        supabase.from("record_votes").select("*", { count: "exact", head: true }).eq("voter_id", user.id),
        supabase.from("record_community_statements").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_scores").select("credibility_score").eq("user_id", user.id).single(),
        supabase.from("users").select("subject_id").eq("auth_user_id", user.id).single(),
      ]);

      let subjectScore = 0;
      let recordsReceived = 0;
      if (subjectData?.subject_id) {
        const [{ data: score }, { count: received }] = await Promise.all([
          supabase.from("subject_scores").select("overall_score").eq("subject_id", subjectData.subject_id).single(),
          supabase.from("records").select("*", { count: "exact", head: true }).eq("subject_id", subjectData.subject_id),
        ]);
        subjectScore = score?.overall_score ?? 0;
        recordsReceived = received ?? 0;
      }

      setStats({
        profileViews: 0,
        recordImpressions: 0,
        recordsSubmitted: recordsSubmitted ?? 0,
        recordsReceived,
        votescast: votescast ?? 0,
        upvotes: 0,
        comments: comments ?? 0,
        credibilityScore: userScore?.credibility_score ?? 0,
        subjectScore,
      });

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6 sm:p-6 lg:p-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-1">Analytics</h1>
            <p className="text-gray-500 text-sm">Your reputation activity at a glance.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            planId === "pro"
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : planId === "insights"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-100 border-gray-200 text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${planId === "pro" ? "bg-indigo-500" : planId === "insights" ? "bg-blue-500" : "bg-gray-400"}`} />
            {planId === "pro" ? "Pro" : planId === "insights" ? "Insights" : "Standard"}
          </span>
        </div>

        {planId === "standard" && (
          <div className="relative mt-8">
            <StandardLockedOverlay />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 blur-sm pointer-events-none select-none">
              {["Profile Views", "Record Impressions", "Records Submitted", "Votes Cast", "Comments", "Credibility Score", "Subject Score", "Records Received"].map((label) => (
                <LockedCard key={label} label={label} />
              ))}
            </div>
          </div>
        )}

        {planId === "insights" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Activity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<FileText className="w-5 h-5" />} label="Records Submitted" value={stats.recordsSubmitted} />
                <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Records Received" value={stats.recordsReceived} />
                <StatCard icon={<BarChart2 className="w-5 h-5" />} label="Votes Cast" value={stats.votescast} />
                <StatCard icon={<ThumbsUp className="w-5 h-5" />} label="Comments Made" value={stats.comments} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reputation Scores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<Star className="w-5 h-5" />} label="Credibility Score" value={stats.credibilityScore.toFixed(1)} sub="Your contributor rating" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Subject Score" value={stats.subjectScore.toFixed(1)} sub="Your public reputation score" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900 mb-1">Unlock Pro Analytics</p>
                <p className="text-xs text-indigo-600">Get geographic breakdowns, viewer insights, contributor patterns, and weekly digests.</p>
              </div>
              <Link href="/dashboard/settings/billing" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 transition whitespace-nowrap shrink-0">
                Upgrade to Pro <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {planId === "pro" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Activity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<FileText className="w-5 h-5" />} label="Records Submitted" value={stats.recordsSubmitted} />
                <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Records Received" value={stats.recordsReceived} />
                <StatCard icon={<BarChart2 className="w-5 h-5" />} label="Votes Cast" value={stats.votescast} />
                <StatCard icon={<ThumbsUp className="w-5 h-5" />} label="Comments Made" value={stats.comments} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reputation Scores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<Star className="w-5 h-5" />} label="Credibility Score" value={stats.credibilityScore.toFixed(1)} sub="Your contributor rating" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Subject Score" value={stats.subjectScore.toFixed(1)} sub="Your public reputation score" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pro Insights</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={<Eye className="w-5 h-5" />} label="Profile Views" value={stats.profileViews} sub="Coming soon — tracking being added" />
                <StatCard icon={<BarChart2 className="w-5 h-5" />} label="Record Impressions" value={stats.recordImpressions} sub="Coming soon — tracking being added" />
                <StatCard icon={<MapPin className="w-5 h-5" />} label="Geographic Breakdown" value="Coming soon" sub="Viewer location data" />
                <StatCard icon={<Users className="w-5 h-5" />} label="Contributor Patterns" value="Coming soon" sub="Who's submitting about you" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}