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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

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

type RecordRef = {
  id: string;
  subject_name: string;
  contributor_alias: string | null;
  category: string | null;
  status: string;
  final_outcome: string | null;
  credibility: string | null;
  created_at: string;
  comment_count: number;
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
  { key: "subject_score" as keyof Scores, label: "Subject Score", desc: "Record outcomes, disputes & ratings against you", icon: Shield, color: "text-blue-500" },
  { key: "contributor_score" as keyof Scores, label: "Contributor Score", desc: "How well your submitted records hold up", icon: TrendingUp, color: "text-green-500" },
  { key: "voter_score" as keyof Scores, label: "Voter Score", desc: "Community reactions to your votes", icon: Star, color: "text-purple-500" },
  { key: "citizen_score" as keyof Scores, label: "Citizen Score", desc: "Reactions to your community statements & replies", icon: Users, color: "text-orange-500" },
];

const ALL_BADGES: { label: string; icon: string }[] = [
  { label: "Top Contributor", icon: "🏆" },
  { label: "Top Voter",       icon: "🗳️" },
  { label: "Top Citizen",     icon: "🌟" },
  { label: "Top Subject",     icon: "👑" },
  { label: "Rising Star",     icon: "⭐" },
  { label: "Controversial",   icon: "🌶️" },
  { label: "Low-Quality Voter", icon: "⚠️" },
  { label: "Convicted",       icon: "🔴" },
  { label: "Fan Favorite",    icon: "⭐" },
  { label: "Expert",          icon: "🎓" },
  { label: "Struggling",      icon: "📉" },
];

const STATUS_LABELS: Record<string, string> = {
  ai_verification: "AI Verification", subject_notified: "Subject Notified",
  published: "Published", deletion_request: "Deletion Request",
  debate: "Debate", voting: "Voting", decision: "Decision",
};

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return (
    <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-gray-200 bg-gray-50">
      <span className="text-lg font-bold text-gray-400">—</span>
    </div>
  );
  const ringColor = score >= 80 ? "border-green-400" : score >= 60 ? "border-blue-400" : score >= 40 ? "border-yellow-400" : "border-red-400";
  const textColor = score >= 80 ? "text-green-700" : score >= 60 ? "text-blue-700" : score >= 40 ? "text-yellow-700" : "text-red-700";
  return (
    <div className={`flex items-center justify-center w-16 h-16 rounded-full border-4 ${ringColor} bg-white`}>
      <span className={`text-base font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  const barColor = score === null ? "bg-gray-200" : score >= 80 ? "bg-green-400" : score >= 60 ? "bg-blue-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="w-full h-2 rounded-full bg-gray-100">
      <div className={`h-2 rounded-full ${barColor} transition-all duration-700`} style={{ width: score !== null ? `${score}%` : "0%" }} />
    </div>
  );
}

function RecordRow({ record }: { record: RecordRef }) {
  const title = record.contributor_alias
    ? `${record.contributor_alias} • ${record.subject_name}`
    : record.subject_name;

  const displayTitle = record.contributor_alias?.includes(record.subject_name)
    ? record.contributor_alias
    : title;

  const credBadge = () => {
    const c = record.credibility;
    if (!c) return null;
    const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium";
    if (c === "Evidence-Based") return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle size={11} className="text-green-700" /> {c}</span>;
    if (c === "Opinion-Based") return <span className={`${base} bg-red-100 text-red-700`}><AlertTriangle size={11} className="text-red-700" /> {c}</span>;
    return <span className={`${base} bg-yellow-100 text-yellow-700`}><AlertTriangle size={11} className="text-yellow-700" /> {c}</span>;
  };

  return (
    <Link href={`/record/${record.id}`}
      className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-900">{displayTitle}</span>
        {credBadge() && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>AI Credibility Recommendation:</span>
            {credBadge()}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
        {record.category && <span>{record.category}</span>}
        <span>📅 {new Date(record.created_at).toLocaleDateString()}</span>
        <span>💬 {record.comment_count} {record.comment_count === 1 ? "comment" : "comments"}</span>
      </div>
    </Link>
  );
}

function BadgeCard({ badge, count, records, loadRecords }: {
  badge: { label: string; icon: string }; count: number;
  records: RecordRef[] | null; loadRecords: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function handleExpand() {
    if (!expanded && records === null) loadRecords();
    setExpanded(e => !e);
  }

  return (
    <div className="rounded-xl border bg-white border-gray-200">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="text-lg shrink-0">{badge.icon}</span>
        <span className="text-sm font-medium text-gray-900 flex-1">{badge.label}</span>
        <span className="text-sm font-semibold text-gray-500 shrink-0">— {count}</span>
        <button onClick={handleExpand} className="shrink-0 text-gray-400 hover:text-gray-700 transition ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2.5">          {records === null ? (
            <div className="text-xs text-gray-400 animate-pulse py-1">Loading…</div>
          ) : records.length === 0 ? (
            <div className="text-xs text-gray-400 py-1">No records found.</div>
          ) : (
            records.map(r => <RecordRow key={r.id} record={r} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function ReputationPage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [contributorId, setContributorId] = useState<string | null>(null);
  const [badgeRecords, setBadgeRecords] = useState<Record<string, RecordRef[] | null>>({});

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);

      const { data: subjectRow } = await supabase.from("subjects").select("subject_uuid").eq("owner_auth_user_id", session.user.id).maybeSingle();
      const { data: contribRow } = await supabase.from("contributors").select("id").eq("auth_user_id", session.user.id).maybeSingle();
      if (contribRow?.id) setContributorId(contribRow.id);

      const [userScoresRes, subjectScoreRes, badgesRes] = await Promise.all([
        supabase.from("user_scores").select("contributor_score,voter_score,citizen_score,overall_score,updated_at").eq("user_id", session.user.id).maybeSingle(),
        subjectRow?.subject_uuid
          ? supabase.from("subject_scores").select("subject_score").eq("subject_uuid", subjectRow.subject_uuid).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("badges").select("id,label,color,icon").eq("user_id", session.user.id),
      ]);

      if (!userScoresRes.data) {
        await supabase.rpc("refresh_user_scores", { p_user_id: session.user.id });
        await supabase.rpc("refresh_user_badges", { p_user_id: session.user.id });
        if (subjectRow?.subject_uuid) await supabase.rpc("refresh_subject_score", { p_subject_uuid: subjectRow.subject_uuid });
      }

      const finalUserScores = userScoresRes.data ?? (await supabase.from("user_scores").select("contributor_score,voter_score,citizen_score,overall_score,updated_at").eq("user_id", session.user.id).maybeSingle()).data;
      const finalSubjectScore = subjectScoreRes.data ?? (subjectRow?.subject_uuid ? (await supabase.from("subject_scores").select("subject_score").eq("subject_uuid", subjectRow.subject_uuid).maybeSingle()).data : null);

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
      const { data: subjectRow } = await supabase.from("subjects").select("subject_uuid").eq("owner_auth_user_id", session.user.id).maybeSingle();
      await Promise.all([
        supabase.rpc("refresh_user_scores", { p_user_id: session.user.id }),
        supabase.rpc("refresh_user_badges", { p_user_id: session.user.id }),
        subjectRow?.subject_uuid ? supabase.rpc("refresh_subject_score", { p_subject_uuid: subjectRow.subject_uuid }) : Promise.resolve(),
      ]);
      await loadData();
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadBadgeRecords(label: string) {
    if (!userId) return;
    let records: RecordRef[] = [];
    try {
      if (["Top Contributor", "Rising Star", "Expert"].includes(label)) {
        if (!contributorId) { setBadgeRecords(p => ({ ...p, [label]: [] })); return; }
        const { data } = await supabase.from("records").select("id,status,category,final_outcome,credibility,created_at,record_alias,contributor_display_name,subject:subjects(name)").eq("contributor_id", contributorId).order("created_at", { ascending: false }).limit(20);
        const mapped = (data ?? []).map((r: any) => ({ id: r.id, subject_name: r.subject?.name ?? "Unknown", contributor_alias: r.record_alias ?? r.contributor_display_name ?? null, category: r.category, status: r.status, final_outcome: r.final_outcome, credibility: r.credibility ?? null, created_at: r.created_at, comment_count: 0 }));
        const counts = await Promise.all(mapped.map(async (r) => {
          const tables = ["record_comments","record_community_messages","record_community_replies","record_voting_messages","record_vote_replies","record_debate_messages"];
          const results = await Promise.all(tables.map(t => supabase.from(t as any).select("id", { count: "exact", head: true }).eq("record_id", r.id)));
          return results.reduce((sum, res) => sum + (res.count ?? 0), 0);
        }));
records = mapped.map((r, i) => ({ ...r, comment_count: counts[i] }));
      } else if (["Top Voter", "Low-Quality Voter", "Convicted"].includes(label)) {
        const { data: votes } = await supabase.from("record_votes").select("record_id").eq("user_id", userId).limit(20);
        const ids = (votes ?? []).map((v: any) => v.record_id).filter(Boolean);
        if (ids.length) {
          const { data } = await supabase.from("records").select("id,status,category,final_outcome,credibility,created_at,record_alias,contributor_display_name,subject:subjects(name)").in("id", ids);
          const mapped = (data ?? []).map((r: any) => ({ id: r.id, subject_name: r.subject?.name ?? "Unknown", contributor_alias: r.record_alias ?? r.contributor_display_name ?? null, category: r.category, status: r.status, final_outcome: r.final_outcome, credibility: r.credibility ?? null, created_at: r.created_at, comment_count: 0 }));
          const counts = await Promise.all(mapped.map(async (r) => {
            const tables = ["record_comments","record_community_messages","record_community_replies","record_voting_messages","record_vote_replies","record_debate_messages"];
            const results = await Promise.all(tables.map(t => supabase.from(t as any).select("id", { count: "exact", head: true }).eq("record_id", r.id)));
            return results.reduce((sum, res) => sum + (res.count ?? 0), 0);
          }));
records = mapped.map((r, i) => ({ ...r, comment_count: counts[i] }));
        }
      } else if (["Top Citizen", "Fan Favorite", "Controversial", "Struggling"].includes(label)) {
        const { data: stmts } = await supabase.from("record_community_statements").select("record_id").eq("author_user_id", userId).limit(20);
        const ids = [...new Set((stmts ?? []).map((s: any) => s.record_id).filter(Boolean))];
        if (ids.length) {
          const { data } = await supabase.from("records").select("id,status,category,final_outcome,credibility,created_at,record_alias,contributor_display_name,subject:subjects(name)").in("id", ids);
          const mapped = (data ?? []).map((r: any) => ({ id: r.id, subject_name: r.subject?.name ?? "Unknown", contributor_alias: r.record_alias ?? r.contributor_display_name ?? null, category: r.category, status: r.status, final_outcome: r.final_outcome, credibility: r.credibility ?? null, created_at: r.created_at, comment_count: 0 }));
          const counts = await Promise.all(mapped.map(async (r) => {
            const tables = ["record_comments","record_community_messages","record_community_replies","record_voting_messages","record_vote_replies","record_debate_messages"];
            const results = await Promise.all(tables.map(t => supabase.from(t as any).select("id", { count: "exact", head: true }).eq("record_id", r.id)));
            return results.reduce((sum, res) => sum + (res.count ?? 0), 0);
          }));
records = mapped.map((r, i) => ({ ...r, comment_count: counts[i] }));
        }
      } else if (label === "Top Subject") {
        const { data: subjectRow } = await supabase.from("subjects").select("subject_uuid").eq("owner_auth_user_id", userId).maybeSingle();
        if (subjectRow?.subject_uuid) {
          const { data } = await supabase.from("records").select("id,status,category,final_outcome,credibility,created_at,record_alias,contributor_display_name,subject:subjects(name)").eq("subject_id", subjectRow.subject_uuid).order("created_at", { ascending: false }).limit(20);
          const mapped = (data ?? []).map((r: any) => ({ id: r.id, subject_name: r.subject?.name ?? "Unknown", contributor_alias: r.record_alias ?? r.contributor_display_name ?? null, category: r.category, status: r.status, final_outcome: r.final_outcome, credibility: r.credibility ?? null, created_at: r.created_at, comment_count: 0 }));
          const counts = await Promise.all(mapped.map(async (r) => {
            const tables = ["record_comments","record_community_messages","record_community_replies","record_voting_messages","record_vote_replies","record_debate_messages"];
            const results = await Promise.all(tables.map(t => supabase.from(t as any).select("id", { count: "exact", head: true }).eq("record_id", r.id)));
            return results.reduce((sum, res) => sum + (res.count ?? 0), 0);
          }));
records = mapped.map((r, i) => ({ ...r, comment_count: counts[i] }));
        }
      }
    } catch (err) {
      console.error("Failed to load badge records:", err);
    }
    setBadgeRecords(p => ({ ...p, [label]: records }));
  }

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading reputation…</div>;

  const earnedLabels = new Set(badges.map(b => b.label));
  const badgeCounts: Record<string, number> = {};
  badges.forEach(b => { badgeCounts[b.label] = (badgeCounts[b.label] ?? 0) + 1; });
  const earnedBadges = ALL_BADGES.filter(b => earnedLabels.has(b.label));
  const unearnedBadges = ALL_BADGES.filter(b => !earnedLabels.has(b.label));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reputation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your scores and badges across all roles on DNounce.
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Recalculating…" : "Recalculate"}
          </button>
        </div>

        {/* Overall Score */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={scores?.overall_score ?? null} />
              <div>
                <p className="text-3xl font-extrabold text-gray-900">
                  {scores?.overall_score != null ? scores.overall_score : "—"}
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
          {SCORE_CARDS.map(card => {
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
                {score === null && <p className="text-xs text-gray-400 mt-1 italic">No activity yet in this role.</p>}
              </div>
            );
          })}
        </div>

        {/* Badges */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Badges</h2>
          </div>

          {earnedBadges.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium">No badges yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {earnedBadges.map(badge => (
                <BadgeCard key={badge.label} badge={badge}
                  count={badgeCounts[badge.label] ?? 0}
                  records={badgeRecords[badge.label] ?? null}
                  loadRecords={() => loadBadgeRecords(badge.label)} />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}