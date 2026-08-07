"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AgreeDisagree from "@/components/reactions/AgreeDisagree";
import { Shield, Loader2, Flag, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';

/* ─── Types ─────────────────────────────────────────── */

type PollOption = { id: string; label: string };

type PollVoteRow = {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  reason: string;
  created_at: string;
  author_alias: string;
  agree_count: number;
  disagree_count: number;
};

type FlagCount = {
  poll_vote_id: string;
  flag_count: number;
  is_low_quality: boolean;
  is_convicted: boolean;
};

/* ─── Helpers ───────────────────────────────────────── */

function formatTimestamp(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "numeric", minute: "2-digit",
  });
}

// First option blue, second indigo, third green, fourth orange (cycle after 4)
const OPTION_COLORS = [
  { text: "text-blue-700", border: "border-blue-200", bg: "bg-blue-50", bar: "bg-blue-500", solid: "bg-blue-600 text-white border-blue-600" },
  { text: "text-indigo-700", border: "border-indigo-200", bg: "bg-indigo-50", bar: "bg-indigo-500", solid: "bg-indigo-600 text-white border-indigo-600" },
  { text: "text-green-700", border: "border-green-200", bg: "bg-green-50", bar: "bg-green-500", solid: "bg-green-600 text-white border-green-600" },
  { text: "text-orange-700", border: "border-orange-200", bg: "bg-orange-50", bar: "bg-orange-500", solid: "bg-orange-600 text-white border-orange-600" },
];

/* ─── Page ──────────────────────────────────────────── */

export default function CommunityPollDetailPage() {
  const params = useParams();
  const pollId = params?.id as string;
  const router = useRouter();

  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<{ option_id: string; reason: string; created_at: string } | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState<PollVoteRow[]>([]);
  const [reactions, setReactions] = useState<Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }>>({});
  const [flagCounts, setFlagCounts] = useState<Record<string, FlagCount>>({});
  const [myFlags, setMyFlags] = useState<Set<string>>(new Set());
  const [replyDraft, setReplyDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [postingReply, setPostingReply] = useState(false);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const maxChars = 4000;
  const minChars = 20;

  // Live countdown timer — ticks every second
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function timeRemaining(expiresAt: string, status: string) {
    if (status !== 'active') return 'Poll closed';
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'Poll closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
    return `${minutes}m ${seconds}s left`;
  }

  const isVotingOpen = poll?.status === 'active' && new Date(poll?.expires_at) > new Date();
  const options: PollOption[] = poll?.options ?? [];
  const totalVotes = votes.length;

  async function loadPoll() {
    const { data } = await supabase.from('polls').select('*').eq('id', pollId).single();
    setPoll(data);
  }

  async function loadMyVote(userId: string) {
    const { data } = await supabase.from('poll_votes')
      .select('option_id, reason, created_at')
      .eq('poll_id', pollId).eq('user_id', userId).maybeSingle();
    if (data) setMyVote(data);
  }

  async function loadVotes() {
    const { data } = await supabase.from('poll_votes')
      .select('id, poll_id, user_id, option_id, reason, created_at, author_alias')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });
    setVotes((data ?? []) as PollVoteRow[]);
    return data ?? [];
  }

  async function loadReactions(votesList: PollVoteRow[], userId: string | null) {
    if (!votesList.length) return;
    const ids = votesList.map(v => v.id);
    const { data } = await supabase.from('poll_vote_reactions')
      .select('poll_vote_id, direction, user_id')
      .in('poll_vote_id', ids);
    const map: Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }> = {};
    (data ?? []).forEach((r: any) => {
      if (!map[r.poll_vote_id]) map[r.poll_vote_id] = { agree: 0, disagree: 0, mine: null };
      if (r.direction === 1) map[r.poll_vote_id].agree++;
      if (r.direction === -1) map[r.poll_vote_id].disagree++;
      if (r.user_id === userId) map[r.poll_vote_id].mine = r.direction;
    });
    setReactions(map);
  }

  async function loadFlagCounts() {
    const { data } = await supabase.from('poll_vote_flag_counts')
      .select('*').eq('poll_id', pollId);
    const map: Record<string, FlagCount> = {};
    (data ?? []).forEach((r: any) => { map[r.poll_vote_id] = r; });
    setFlagCounts(map);
  }

  async function loadMyFlags(userId: string) {
    const { data } = await supabase.from('poll_vote_flags')
      .select('poll_vote_id').eq('user_id', userId);
    setMyFlags(new Set((data ?? []).map((r: any) => r.poll_vote_id)));
  }

  // NOTE: `poll_vote_replies` table does not exist yet — DB call scaffolded but skipped.
  // TODO: enable once the table is created.
  async function loadReplies() {
    const { data } = await supabase.from('poll_vote_replies')
      .select('*').eq('poll_id', pollId).order('created_at', { ascending: true });
    const map: Record<string, any[]> = {};
    (data ?? []).forEach((r: any) => {
      if (!map[r.poll_vote_id]) map[r.poll_vote_id] = [];
      map[r.poll_vote_id].push(r);
    });
    setReplies(map);
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      setSessionUserId(userId);
      await loadPoll();
      const votesList = await loadVotes();
      await Promise.all([
        loadReactions(votesList as PollVoteRow[], userId),
        loadFlagCounts(),
        userId ? loadMyVote(userId) : Promise.resolve(),
        userId ? loadMyFlags(userId) : Promise.resolve(),
      ]);
      setLoading(false);
      // page view tracking — skip admins
      if (userId) {
        const { data: adminCheck } = await supabase.from('admin_roles').select('user_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
        if (!adminCheck) {
          supabase.from('page_views').insert({ page_type: 'community_poll', page_id: pollId, viewer_auth_user_id: userId, is_anonymous: false }).then(() => {});
        }
      } else {
        supabase.from('page_views').insert({ page_type: 'community_poll', page_id: pollId, viewer_auth_user_id: null, is_anonymous: true }).then(() => {});
      }
    }
    if (pollId) init();
  }, [pollId]);

  // Real-time subscription — new poll_votes on this poll
  useEffect(() => {
    if (!pollId) return;
    const channel = supabase.channel(`poll_votes:${pollId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'poll_votes',
        filter: `poll_id=eq.${pollId}`
      }, (payload) => {
        setVotes(prev => [payload.new as PollVoteRow, ...prev.filter(v => v.id !== (payload.new as any).id)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pollId]);

  async function submitVote() {
    if (!isVotingOpen || myVote || !sessionUserId) return;
    if (!choice) { alert("Please choose an option."); return; }
    const trimmed = reason.trim();
    if (!trimmed) { alert("Please write a reason for your vote."); return; }
    if (trimmed.length < minChars) { alert(`Reason must be at least ${minChars} characters.`); return; }
    if (trimmed.length > maxChars) { alert(`Max ${maxChars} characters.`); return; }
    setSubmitting(true);
    try {
      // Alias generation: get_or_create_alias RPC FKs p_record_id to the records
      // table, so pollIds break it. Use a locally-generated anon alias instead.
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const randomStr = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const alias = `${randomStr}@dnounce_${Math.floor(Math.random() * 999) + 1}`;
      const { data, error } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: choice,
        user_id: sessionUserId,
        reason: trimmed,
        author_alias: alias,
      }).select().single();
      if (error) throw error;
      setMyVote({ option_id: choice, reason: trimmed, created_at: data.created_at });
      await Promise.all([loadVotes(), loadFlagCounts()]);
    } catch (e: any) {
      alert(e?.message || "Failed to submit vote.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReaction(voteId: string, dir: 1 | -1) {
    if (!sessionUserId) return;
    const cur = reactions[voteId] ?? { agree: 0, disagree: 0, mine: null };
    if (cur.mine === dir) {
      await supabase.from('poll_vote_reactions').delete()
        .eq('poll_vote_id', voteId).eq('user_id', sessionUserId);
      setReactions(prev => ({
        ...prev, [voteId]: {
          agree: dir === 1 ? cur.agree - 1 : cur.agree,
          disagree: dir === -1 ? cur.disagree - 1 : cur.disagree,
          mine: null
        }
      }));
    } else {
      await supabase.from('poll_vote_reactions').upsert({
        poll_vote_id: voteId, user_id: sessionUserId, direction: dir
      });
      setReactions(prev => ({
        ...prev, [voteId]: {
          agree: dir === 1 ? cur.agree + 1 : cur.mine === 1 ? cur.agree - 1 : cur.agree,
          disagree: dir === -1 ? cur.disagree + 1 : cur.mine === -1 ? cur.disagree - 1 : cur.disagree,
          mine: dir
        }
      }));
    }
  }

  async function toggleFlag(voteId: string) {
    if (!sessionUserId) return;
    if (!isVotingOpen) return;
    const alreadyFlagged = myFlags.has(voteId);
    if (alreadyFlagged) {
      await supabase.from('poll_vote_flags').delete()
        .eq('poll_vote_id', voteId).eq('user_id', sessionUserId);
      setMyFlags(prev => { const next = new Set(prev); next.delete(voteId); return next; });
    } else {
      await supabase.from('poll_vote_flags').insert({
        poll_vote_id: voteId, user_id: sessionUserId
      });
      setMyFlags(prev => new Set([...prev, voteId]));
    }
    await loadFlagCounts();
  }

  async function postReply(voteId: string) {
    const text = replyDraft.trim();
    if (!text || !sessionUserId) return;
    if (text.length > maxChars) { alert(`Max ${maxChars} characters.`); return; }
    setPostingReply(true);
    try {
      // Alias generation: get_or_create_alias RPC FKs p_record_id to the records
      // table, so pollIds break it. Use a locally-generated anon alias instead.
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const randomStr = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const alias = `${randomStr}@dnounce_${Math.floor(Math.random() * 999) + 1}`;
      // ⚠️ FUTURE: poll_vote_replies table does not exist yet.
      // When the table is created, uncomment the insert below:
      // const { error } = await supabase.from('poll_vote_replies').insert({
      //   poll_vote_id: voteId,
      //   poll_id: pollId,
      //   user_id: sessionUserId,
      //   author_alias: alias,
      //   body: text,
      // });
      // if (error) throw error;
      // Optimistically add to local state so the UI stays in sync until the table lands.
      const newReply = {
        id: `temp-${Date.now()}`, poll_vote_id: voteId, poll_id: pollId,
        user_id: sessionUserId, author_alias: alias,
        body: text, created_at: new Date().toISOString(),
      };
      setReplies(prev => ({ ...prev, [voteId]: [...(prev[voteId] ?? []), newReply] }));
      setReplyDraft("");
      setReplyingTo(null);
    } catch (e: any) {
      alert(e?.message || "Failed to post reply.");
    } finally {
      setPostingReply(false);
    }
  }

  // Per-option vote counts
  const optionCounts: Record<string, number> = {};
  options.forEach((o) => { optionCounts[o.id] = 0; });
  votes.forEach((v) => { if (v.option_id in optionCounts) optionCounts[v.option_id]++; });
  const optionMaxCount = Math.max(0, ...Object.values(optionCounts));

  function optionLabel(optionId: string) {
    return options.find((o) => o.id === optionId)?.label ?? optionId;
  }
  function optionIndex(optionId: string) {
    return Math.max(0, options.findIndex((o) => o.id === optionId));
  }
  function optionColor(optionId: string) {
    return OPTION_COLORS[optionIndex(optionId) % OPTION_COLORS.length];
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 space-y-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/community/polls")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          ← Back
        </button>

        {loading ? (
          <div className="rounded-2xl bg-gray-100 h-48 animate-pulse" />
        ) : !poll ? (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center text-sm text-gray-500">
            Poll not found.
          </div>
        ) : (
          <>
            {/* Poll card */}
            <div className="rounded-2xl border border-gray-200 shadow-sm bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                  <span className={`h-2 w-2 rounded-full ${isVotingOpen ? "bg-green-500" : "bg-gray-400"}`} />
                  {isVotingOpen ? "Active" : "Closed"}
                </span>
                <span className="text-[11px] text-gray-500">{timeRemaining(poll.expires_at, poll.status)}</span>
              </div>

              <h1 className="text-xl font-bold text-gray-900 leading-tight">{poll.title}</h1>
              {poll.description && (
                <p className="text-sm text-gray-600 leading-relaxed mt-2 whitespace-pre-wrap">
                  {poll.description}
                </p>
              )}

              {/* Option tally */}
              <div className="mt-4 space-y-2">
                {options.map((o) => {
                  const c = optionCounts[o.id] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                  const isWinner = c === optionMaxCount && c > 0;
                  return (
                    <div key={o.id}>
                      <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                        <span className="font-medium">{o.label}</span>
                        <span className="text-gray-500">{pct}% · {c} {c === 1 ? "vote" : "votes"}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full ${isWinner ? "bg-blue-500" : "bg-gray-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="text-[11px] text-gray-500 pt-1">{totalVotes} total {totalVotes === 1 ? "vote" : "votes"}</div>
              </div>
            </div>

            {/* Voting section */}
            {(() => {
              const canVote = !loading && isVotingOpen && !myVote && !!sessionUserId;
              const showForm = canVote;
              const showReadonly = !!myVote;
              return (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Voting Section</div>
                  <div className="text-[11px] text-gray-500">To choose an option, a reason is required.</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700 shrink-0">
                  <span className={`h-2 w-2 rounded-full ${isVotingOpen ? "bg-blue-500" : "bg-gray-400"}`} />
                  {timeRemaining(poll.expires_at, poll.status)}
                </div>
              </div>

              <div className="mt-4">
                {!sessionUserId ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Sign in to cast your vote</div>
                      <div className="text-xs text-gray-600 mt-0.5">Your vote is anonymous — we show an alias, never your real name.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/loginsignup")}
                      className="rounded-full bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 transition"
                    >
                      Log in
                    </button>
                  </div>
                ) : showReadonly && myVote ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-semibold text-gray-900">Your vote</div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold">
                      <span className={optionColor(myVote.option_id).text}>
                        Chose "{optionLabel(myVote.option_id)}"
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{formatTimestamp(myVote.created_at)}</span>
                    </div>
                    <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {myVote.reason}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">Read-only. Votes cannot be edited after submission.</div>
                  </div>
                ) : showForm ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-900">Cast your vote</div>
                        <div className="text-[11px] text-gray-500">This will be permanent once submitted.</div>
                      </div>
                      <div className="text-[11px] text-gray-500 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 shrink-0">No edits</div>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2 flex-wrap">
                      {options.map((o) => {
                        const active = choice === o.id;
                        const col = optionColor(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setChoice(o.id)}
                            className={[
                              "flex-1 min-w-[140px] rounded-full border px-4 py-3 text-sm font-semibold transition",
                              active ? col.solid : "bg-white text-gray-800 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={5}
                      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
                      placeholder={`Write your reason (required, min ${minChars} characters)…`}
                    />

                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-gray-500">{reason.trim().length}/{maxChars}</div>
                      <button
                        type="button"
                        onClick={submitVote}
                        disabled={submitting || !choice || reason.trim().length < minChars}
                        className="w-full sm:w-auto rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        {submitting ? "Submitting…" : "Submit Vote"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    This poll is closed. Voting is no longer available.
                  </div>
                )}
              </div>
            </section>
              );
            })()}

            {/* Vote statements */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 mt-6">
              <div className="text-sm font-semibold text-gray-900 mb-5">Vote Statements</div>
              {votes.length === 0 ? (
                <div className="text-sm text-gray-500">No votes yet.</div>
              ) : (
                votes.map((v, idx) => {
                  const rx = reactions[v.id] ?? { agree: 0, disagree: 0, mine: null as null | 1 | -1 };
                  const fc = flagCounts[v.id];
                  const isConvicted = !!fc?.is_convicted;
                  const isLowQuality = !!fc?.is_low_quality && !isConvicted;
                  const col = optionColor(v.option_id);
                  const canFlag = !!sessionUserId && isVotingOpen && v.user_id !== sessionUserId;
                  const voteReplies = replies[v.id] ?? [];
                  const isReplying = replyingTo === v.id;
                  const repliesExpanded = !!expandedReplies[v.id];
                  const isLast = idx === votes.length - 1;
                  return (
                    <div key={v.id} className={`py-6 first:pt-0 ${isLast ? "last:pb-0" : "border-b border-gray-200"} ${isConvicted ? "opacity-50" : ""}`}>
                      {/* Header */}
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-900 break-all">
                            {v.author_alias}
                          </span>
                          <div className="text-[11px] text-gray-400 mt-0.5">{formatTimestamp(v.created_at)}</div>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${col.text} ${col.border} ${col.bg}`}>
                          {optionLabel(v.option_id)}
                        </span>
                        {isConvicted && (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 shrink-0">
                            DISQUALIFIED
                          </span>
                        )}
                        {isLowQuality && (
                          <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-700 shrink-0">
                            ⚠ Low-Quality Vote
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{v.reason}</div>

                      {/* Reactions + Flag */}
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        {/* NOTE: The shared AgreeDisagree component is self-managed via
                            targetType/targetId. The `reactions`, `loadReactions`, and
                            `toggleReaction` scaffolding in this file (built to a spec that
                            assumed controlled-prop API) is unused. It's left in place so
                            it's easy to hook up later if the shared component is refactored
                            to accept controlled props, OR if we want to migrate reactions
                            storage to a dedicated `poll_vote_reactions` table. */}
                        <AgreeDisagree
                          targetType="poll_votes"
                          targetId={v.id}
                          disabled={!sessionUserId}
                          size={24}
                        />
                        {canFlag && (
                          <button
                            type="button"
                            onClick={() => toggleFlag(v.id)}
                            className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${myFlags.has(v.id) ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-400 border-gray-200 hover:text-red-500'}`}
                          >
                            <Flag className="h-3 w-3" />
                            {myFlags.has(v.id) ? 'Flagged' : 'Flag'}
                            {fc?.flag_count ? ` (${fc.flag_count})` : ''}
                          </button>
                        )}
                      </div>

                      {/* Reply toggle */}
                      <div className="mt-3">
                        {voteReplies.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedReplies((prev) => ({ ...prev, [v.id]: !repliesExpanded }))}
                            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                          >
                            {repliesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {voteReplies.length} repl{voteReplies.length === 1 ? "y" : "ies"}
                          </button>
                        )}
                        {sessionUserId && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(isReplying ? null : v.id);
                              setReplyDraft("");
                            }}
                            className="ml-3 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                          >
                            {isReplying ? "Cancel" : "Reply"}
                          </button>
                        )}
                      </div>

                      {/* Existing replies */}
                      {repliesExpanded && voteReplies.length > 0 && (
                        <div className="mt-3 space-y-3 pl-3 sm:pl-5 border-l border-gray-200">
                          {voteReplies.map((rp: any) => (
                            <div key={rp.id} className="py-1">
                              <div className="text-xs font-semibold text-gray-900 break-all">{rp.author_alias}</div>
                              <div className="text-[11px] text-gray-400">{formatTimestamp(rp.created_at)}</div>
                              <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{rp.body}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply composer */}
                      {isReplying && sessionUserId && (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <textarea
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
                            placeholder="Write a reply…"
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="text-[11px] text-gray-500">{replyDraft.trim().length}/{maxChars}</div>
                            <button
                              type="button"
                              onClick={() => postReply(v.id)}
                              disabled={postingReply || !replyDraft.trim()}
                              className="rounded-full bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                              {postingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Post Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
