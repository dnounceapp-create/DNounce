"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ChevronDown, ChevronUp } from "lucide-react";

export const dynamic = 'force-dynamic';

/* ─── Helpers ───────────────────────────────────────── */

function truncate(s: string | null | undefined, max = 150) {
  if (!s) return "";
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

/* ─── Page ──────────────────────────────────────────── */

export default function CommunityPollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    supabase
      .from("polls")
      .select(`
        id, title, description, poll_type, options, status, expires_at, created_at,
        poll_votes(id, option_id)
      `)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPolls(data ?? []);
        setLoading(false);
      });
  }, []);

  // Page view tracking — skip admins
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const userId = sessionData?.session?.user?.id ?? null;
      if (userId) {
        const { data: adminCheck } = await supabase
          .from("admin_roles")
          .select("user_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();
        if (adminCheck) return;
      }
      supabase
        .from("page_views")
        .insert({
          page_type: "community_polls",
          page_id: null,
          viewer_auth_user_id: userId,
          is_anonymous: !userId,
        })
        .then(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Community Polls</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Help shape DNounce. Vote on platform decisions, share your reasoning, and see what the community thinks.
          </p>
        </div>

        {/* Poll list */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-48" />
            ))
          ) : polls.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 shadow-sm bg-white p-8 text-center text-sm text-gray-500">
              No polls yet. Check back soon.
            </div>
          ) : (
            polls.map((poll) => {
              const isActive = poll.status === "active" && (!poll.expires_at || new Date(poll.expires_at) > new Date());
              const remaining = timeRemaining(poll.expires_at, poll.status);
              const opts: { id: string; label: string }[] = Array.isArray(poll.options) ? poll.options : [];
              const votes: any[] = Array.isArray(poll.poll_votes) ? poll.poll_votes : [];
              const totalVotes = votes.length;
              // Count per option
              const counts: Record<string, number> = {};
              opts.forEach((o) => { counts[o.id] = 0; });
              votes.forEach((v: any) => {
                if (v.option_id in counts) counts[v.option_id]++;
              });
              const maxCount = Math.max(0, ...Object.values(counts));
              const isExpanded = !!expanded[poll.id];
              const desc = poll.description ?? "";
              const showToggle = desc.length > 150;
              const displayDesc = isExpanded || !showToggle ? desc : truncate(desc, 150);
              return (
                <div key={poll.id} className="rounded-2xl border border-gray-200 shadow-sm bg-white p-5">
                  {/* Top row: status + time */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      {isActive ? "Active" : "Closed"}
                    </span>
                    <span className="text-[11px] text-gray-500">{remaining}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-gray-900 leading-snug">{poll.title}</h2>

                  {/* Description */}
                  {desc && (
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {displayDesc}
                      {showToggle && (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [poll.id]: !isExpanded }))}
                          className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {isExpanded ? "Show less" : "Show more"}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tally */}
                  <div className="mt-4 space-y-2">
                    {opts.map((o) => {
                      const c = counts[o.id] ?? 0;
                      const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                      const isWinner = c === maxCount && c > 0;
                      return (
                        <div key={o.id}>
                          <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                            <span className="font-medium">{o.label}</span>
                            <span className="text-gray-500">{pct}% · {c}</span>
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
                    <div className="text-[11px] text-gray-500 pt-1">{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</div>
                  </div>

                  {/* CTA */}
                  <div className="mt-4">
                    <Link
                      href={`/dashboard/community/polls/${poll.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 hover:bg-black text-white px-4 py-2 text-sm font-semibold transition"
                    >
                      {isActive ? "Vote & Weigh In →" : "View Results →"}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center">
          <div className="text-sm font-semibold text-indigo-900 mb-1">
            Have a platform suggestion?
          </div>
          <div className="text-xs text-indigo-700 mb-4">
            Submit it and it might become a community poll.
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings/support?topic=platform_suggestion")}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold transition"
          >
            Submit a suggestion
          </button>
        </div>
      </div>
    </div>
  );
}
