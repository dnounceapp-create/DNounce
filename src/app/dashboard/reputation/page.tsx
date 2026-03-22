"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Trophy,
  Star,
  TrendingUp,
  Shield,
  Users,
  RefreshCw,
} from "lucide-react";

type Scores = {
  subject_score: number | null;
  contributor_score: number | null;
  voter_score: number | null;
  citizen_score: number | null;
  overall_score: number | null;
};

type Badge = {
  id: string;
  label: string;
  color: string;
  icon: string;
};

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  gold:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  pink:   { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-200" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200" },
  gray:   { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200" },
};

const SCORE_CARDS = [
  {
    key: "subject_score" as keyof Scores,
    label: "Subject Score",
    desc: "Record outcomes, disputes & ratings against you",
    icon: Shield,
    color: "text-blue-500",
  },
  {
    key: "contributor_score" as keyof Scores,
    label: "Contributor Score",
    desc: "How well your submitted records hold up",
    icon: TrendingUp,
    color: "text-green-500",
  },
  {
    key: "voter_score" as keyof Scores,
    label: "Voter Score",
    desc: "Community reactions to your votes",
    icon: Star,
    color: "text-purple-500",
  },
  {
    key: "citizen_score" as keyof Scores,
    label: "Citizen Score",
    desc: "Reactions to your community statements & replies",
    icon: Users,
    color: "text-orange-500",
  },
];

const ALL_BADGES = [
  { label: "Top Contributor", icon: "🏆", desc: "90%+ of your submitted records are kept or never disputed." },
  { label: "Top Voter",       icon: "🗳️", desc: "Your votes consistently earn positive community reactions." },
  { label: "Top Citizen",     icon: "🌟", desc: "Your community statements are highly regarded." },
  { label: "Top Subject",     icon: "👑", desc: "90%+ subject score — your reputation is spotless." },
  { label: "Rising Star",     icon: "⭐", desc: "You generated the most interactions in a single record." },
  { label: "Controversial",   icon: "🌶️", desc: "High engagement but split reactions from the community." },
  { label: "Low-Quality Voter", icon: "⚠️", desc: "One or more of your votes was flagged as low quality." },
  { label: "Convicted",       icon: "🔴", desc: "You lost voting rights on at least one record." },
  { label: "Fan Favorite",    icon: "⭐", desc: "Zero negative reactions across all your engagements." },
  { label: "Expert",          icon: "🎓", desc: "Your profession matches the category of records you submit." },
  { label: "Struggling",      icon: "📉", desc: "More negative than positive reactions across your engagements." },
];

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-gray-200 bg-gray-50">
        <span className="text-lg font-bold text-gray-400">—</span>
      </div>
    );
  }
  const ringColor =
    score >= 80 ? "border-green-400" :
    score >= 60 ? "border-blue-400" :
    score >= 40 ? "border-yellow-400" : "border-red-400";
  const textColor =
    score >= 80 ? "text-green-700" :
    score >= 60 ? "text-blue-700" :
    score >= 40 ? "text-yellow-700" : "text-red-700";
  return (
    <div className={`flex items-center justify-center w-16 h-16 rounded-full border-4 ${ringColor} bg-white`}>
      <span className={`text-base font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  const barColor =
    score === null ? "bg-gray-200" :
    score >= 80 ? "bg-green-400" :
    score >= 60 ? "bg-blue-400" :
    score >= 40 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="w-full h-2 rounded-full bg-gray-100">
      <div
        className={`h-2 rounded-full ${barColor} transition-all duration-700`}
        style={{ width: score !== null ? `${score}%` : "0%" }}
      />
    </div>
  );
}

export default function ReputationPage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get subject_uuid for this user
      const { data: subjectRow } = await supabase
        .from("subjects")
        .select("subject_uuid")
        .eq("owner_auth_user_id", session.user.id)
        .maybeSingle();

      const [userScoresRes, subjectScoreRes, badgesRes] = await Promise.all([
        supabase
          .from("user_scores")
          .select("contributor_score,voter_score,citizen_score,overall_score,updated_at")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        subjectRow?.subject_uuid
          ? supabase
              .from("subject_scores")
              .select("subject_score")
              .eq("subject_uuid", subjectRow.subject_uuid)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("badges")
          .select("id,label,color,icon")
          .eq("user_id", session.user.id),
      ]);

      // Auto-calculate if no scores yet — no recursion
      if (!userScoresRes.data) {
        await supabase.rpc("refresh_user_scores", { p_user_id: session.user.id });
        await supabase.rpc("refresh_user_badges", { p_user_id: session.user.id });
        if (subjectRow?.subject_uuid) {
          await supabase.rpc("refresh_subject_score", { p_subject_uuid: subjectRow.subject_uuid });
        }
      }

      // Re-fetch after calculation if needed
      const finalUserScores = userScoresRes.data ?? (await supabase
        .from("user_scores")
        .select("contributor_score,voter_score,citizen_score,overall_score,updated_at")
        .eq("user_id", session.user.id)
        .maybeSingle()).data;

      const finalSubjectScore = subjectScoreRes.data ?? (subjectRow?.subject_uuid ? (await supabase
        .from("subject_scores")
        .select("subject_score")
        .eq("subject_uuid", subjectRow.subject_uuid)
        .maybeSingle()).data : null);

      setScores({
        subject_score:     finalSubjectScore?.subject_score ?? null,
        contributor_score: finalUserScores?.contributor_score ?? null,
        voter_score:       finalUserScores?.voter_score ?? null,
        citizen_score:     finalUserScores?.citizen_score ?? null,
        overall_score:     finalUserScores?.overall_score ?? null,
      });
      if (finalUserScores?.updated_at) setLastUpdated(finalUserScores.updated_at);
      setBadges(badgesRes.data || []);
    } catch (err) {
      console.error("Failed to load reputation:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: subjectRow } = await supabase
        .from("subjects")
        .select("subject_uuid")
        .eq("owner_auth_user_id", session.user.id)
        .maybeSingle();

      await Promise.all([
        supabase.rpc("refresh_user_scores", { p_user_id: session.user.id }),
        supabase.rpc("refresh_user_badges", { p_user_id: session.user.id }),
        subjectRow?.subject_uuid
          ? supabase.rpc("refresh_subject_score", { p_subject_uuid: subjectRow.subject_uuid })
          : Promise.resolve(),
      ]);
      await loadData();
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading reputation…</div>;

  const earnedLabels = new Set(badges.map((b) => b.label));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reputation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your scores and badges across all roles on DNounce.
              {lastUpdated && (
                <span className="ml-2 text-xs text-gray-400">
                  Last updated {new Date(lastUpdated).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Recalculating…" : "Recalculate"}
          </button>
        </div>

        {/* Overall Score Hero */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={scores?.overall_score ?? null} />
              <div>
                <p className="text-3xl font-extrabold text-gray-900">
                  {scores?.overall_score != null ? `${scores.overall_score}` : "—"}
                  <span className="text-lg font-medium text-gray-400"> / 100</span>
                </p>
                <p className="text-sm font-medium text-gray-700">Overall Score</p>
                <p className="text-xs text-gray-400 mt-0.5">Average of all roles you've participated in</p>
              </div>
            </div>
            <div className="sm:ml-auto text-xs text-gray-500 bg-gray-50 border rounded-xl p-3 max-w-xs leading-relaxed">
              Click <span className="font-semibold text-gray-700">Recalculate</span> to refresh your scores after new activity. Only roles with at least one contribution count toward your overall.
            </div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCORE_CARDS.map((card) => {
            const Icon = card.icon;
            const score = scores?.[card.key] ?? null;
            return (
              <div key={card.key} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${card.color} shrink-0`} />
                    <span className="font-semibold text-gray-900 text-sm">{card.label}</span>
                  </div>
                  <ScoreRing score={score} />
                </div>
                <ScoreBar score={score} />
                <p className="text-xs text-gray-500 mt-2">{card.desc}</p>
                {score === null && (
                  <p className="text-xs text-gray-400 mt-1 italic">No activity yet in this role.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Earned Badges */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Earned Badges</h2>
          <p className="text-xs text-gray-500 mb-4">Badges are awarded based on your activity and community standing.</p>

          {badges.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">No badges yet.</p>
              <p className="text-xs mt-1">Participate across records to earn your first badge.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => {
                const style = BADGE_STYLES[badge.color] ?? BADGE_STYLES.gray;
                return (
                  <div
                    key={badge.id}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${style.bg} ${style.text} ${style.border}`}
                  >
                    <span>{badge.icon}</span>
                    {badge.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Badges Reference */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">All Badges</h2>
          <p className="text-xs text-gray-500 mb-4">Every badge you can earn and how to get it.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_BADGES.map((b) => {
              const earned = earnedLabels.has(b.label);
              return (
                <div
                  key={b.label}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                    earned ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <span className="text-xl shrink-0">{b.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{b.label}</span>
                      {earned && (
                        <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                          Earned ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How Scores Work */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">How Scores Are Calculated</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
            {[
              {
                title: "Subject Score",
                formula: "Records kept (40%) + Records never disputed (30%) + Inverse avg rating (30%)",
                note: "Lower ratings from contributors = higher subject score."
              },
              {
                title: "Contributor Score",
                formula: "Records you submitted that were kept (60%) + Never disputed (40%)",
                note: "Submit accurate, undisputed records to score higher."
              },
              {
                title: "Voter Score",
                formula: "Positive vote reactions (50%) + Never flagged (30%) + Never convicted (20%)",
                note: "Vote with quality reasoning to earn community trust."
              },
              {
                title: "Citizen Score",
                formula: "Positive statement reactions (60%) + Positive reply reactions (40%)",
                note: "Thoughtful community contributions raise your citizen score."
              },
            ].map((s) => (
              <div key={s.title} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="font-semibold text-gray-900 text-sm mb-1">{s.title}</p>
                <p className="text-gray-600">{s.formula}</p>
                <p className="text-gray-400 mt-1 italic">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}