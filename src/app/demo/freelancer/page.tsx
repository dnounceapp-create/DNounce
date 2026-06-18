"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  User,
  MapPin,
  FileText,
  Star,
  AlertTriangle,
  Copy,
  Shield,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Share2,
  Pin,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ─── Static fake data ─────────────────────────────── */

const RECORD = {
  id: "bf72c341-9a1e-4d88-b203-e91fa6c30d44",
  created_at: "2026-05-14T22:11:00.000Z",
  category: "Freelancer",
  location: "Austin, TX",
  relationship: "Client",
  rating: 1,
  anonymity_status: "Anonymity Not Granted",
  description:
    "Do not hire this developer. We paid $3,000 for a restaurant ordering website to launch before our busiest weekend of the year. The site went live, but the checkout button literally didn't work. Customers couldn't place a single order. When we asked them to fix it, they locked us out of our own dashboard and demanded an extra $500 to finish what we already paid for. We lost an estimated $4,200 in orders that weekend. This is extortion. They held our business hostage at the worst possible moment.",
  status: "voting",
};

const SUBJECT = { name: "Alex Rivera", organization: "Rivera Web Studio", location: "Austin, TX" };

const CONTRIBUTOR = { name: "GourmetGo Catering" };

const DEBATE_POSTS = [
  {
    id: "d1",
    role: "subject" as const,
    name: "Alex Rivera",
    body: "The original contract — which the client signed — was for a 5-page informational website with 'e-commerce capabilities via standard PayPal link.' That's in Section 3B, word for word. Two days before launch, they messaged me at 11pm asking me to scrap the PayPal integration and build a custom Stripe checkout instead because they 'didn't want to deal with PayPal fees.' That is a completely different feature. I told them it would cost $500 more and take extra time. They said 'just make it work.' I stayed up all night building it anyway — without a signed change order, without payment, and without the Stripe API keys they were supposed to provide. When they refused to send the keys or pay the invoice, the gateway failed at launch. I paused their dashboard access until the outstanding balance was resolved. That's not extortion. That's a contractor protecting themselves from a client who wanted free work.",
    created_at: "2026-05-16T10:14:00Z",
    parentId: null,
  },
  {
    id: "d2",
    role: "contributor" as const,
    name: "GourmetGo Catering",
    body: "The contract said 'fully functional e-commerce capabilities.' To any normal person running a food business, that means customers can check out and pay. We didn't ask for 'Stripe specifically' — we asked for a checkout that works. PayPal's redirect flow breaks on mobile and we told him that during the kickoff call. He nodded and said he'd handle it. There were no written notes from that call because he never sent a recap. Now he's hiding behind contract language while we lost a $4,200 weekend. And locking us out of the dashboard we paid for? That's not 'protecting himself.' That's holding us hostage.",
    created_at: "2026-05-16T13:45:00Z",
    parentId: "d1",
  },
  {
    id: "d3",
    role: "subject" as const,
    name: "Alex Rivera",
    body: "There are no written notes from that call because the client never responded to the recap email I sent the next morning. I have the email. I have the read receipt. The PayPal mobile issue they're describing is a known limitation they were aware of — it's literally why Section 3B specifies 'standard PayPal link' rather than a full embedded checkout. If they wanted embedded Stripe, that conversation needed to happen in week one, not 48 hours before launch. I didn't lock them out of their content — I suspended API-level access to the payment layer pending resolution of a $500 unpaid invoice. Their homepage, menu, and contact page were fully accessible the entire time.",
    created_at: "2026-05-17T08:30:00Z",
    parentId: null,
  },
  {
    id: "d4",
    role: "contributor" as const,
    name: "GourmetGo Catering",
    body: "He has a read receipt. Great. We opened the email at 7am during our busiest prep day and didn't respond until that evening — that is not consent. You can't send a recap email that rewrites what was verbally agreed on a call, wait 12 hours during a catering service day, and then claim silence means agreement. We were not technically sophisticated enough to understand that 'API-level access' meant our customers couldn't check out. From our side, the site was broken and he had the key. The $500 wasn't the issue — the timing and the leverage were.",
    created_at: "2026-05-17T11:02:00Z",
    parentId: "d3",
  },
];

const SEED_VOTES: VoteRow[] = [
  {
    id: "v1",
    alias: "mwp@dnounce_114",
    jobTitle: "Contracts Attorney",
    choice: "side_with_subject",
    explanation:
      "The written contract controls. 'E-commerce capabilities via standard PayPal link' is specific language — it doesn't mean 'any checkout method the client prefers.' Verbal agreements that contradict signed contracts are nearly impossible to enforce, especially when the developer sent a written recap the following morning. The client had an opportunity to dispute that recap in writing and didn't. From a pure contract standpoint, the developer delivered what was specified.",
    created_at: "2026-05-18T09:00:00Z",
    agreeCount: 21,
    disagreeCount: 8,
  },
  {
    id: "v2",
    alias: "tlr@dnounce_289",
    jobTitle: "Small Business Owner",
    choice: "side_with_contributor",
    explanation:
      "I've hired four developers in the past three years. Not one of them sent me a 'recap email' after a kickoff call and then used my silence as a contract amendment. That's a tactic, not a process. The client trusted a professional to tell them if what they were asking for was out of scope — clearly, in plain language, before doing the work. Staying up all night building something and then invoicing for it without a signed change order is the developer's risk, not the client's debt.",
    created_at: "2026-05-18T11:30:00Z",
    agreeCount: 18,
    disagreeCount: 11,
  },
  {
    id: "v3",
    alias: "kcx@dnounce_502",
    jobTitle: "Senior Full-Stack Developer",
    choice: "side_with_contributor",
    explanation:
      "The developer made three mistakes that are on them regardless of the contract dispute: (1) they built the Stripe integration without a signed change order, (2) they launched knowing the payment gateway would fail because the API keys weren't provided, and (3) they suspended dashboard access as financial leverage. That last one is the thing that kills me. Even if you're 100% right about the scope, you don't hold a live production site hostage. You finish, you invoice, you pursue collections. What he did damaged the client's business and his own reputation simultaneously.",
    created_at: "2026-05-19T14:15:00Z",
    agreeCount: 29,
    disagreeCount: 7,
  },
  {
    id: "v4",
    alias: "nfb@dnounce_77",
    jobTitle: "UX Consultant",
    choice: "side_with_subject",
    explanation:
      "Everyone is ignoring the API keys. The developer couldn't finish a Stripe integration without credentials that only the client could provide. The client refused to send them and refused to pay the invoice — and then acted surprised the checkout didn't work. You can't withhold the technical access required to complete your own feature request and then blame the developer when it fails. The lock-out was heavy-handed, but the root cause of the broken checkout was the client's own inaction.",
    created_at: "2026-05-19T16:45:00Z",
    agreeCount: 14,
    disagreeCount: 16,
  },
  {
    id: "v5",
    alias: "rzq@dnounce_431",
    jobTitle: "Freelance Project Manager",
    choice: "side_with_contributor",
    explanation:
      "Both parties failed at communication, but the developer had the professional obligation to pump the brakes. When a client says 'just make it work' at 11pm two days before launch, a professional says: 'I can't do that without a change order and your API keys — here's the form, let's get this signed in the morning.' Instead he built it, broke it, launched it broken, and then used access control as a collections tool. The client is not blameless, but the developer escalated every single step of this incorrectly.",
    created_at: "2026-05-20T10:00:00Z",
    agreeCount: 24,
    disagreeCount: 9,
  },
];

/* ─── Types ─────────────────────────────────────────── */

type VoteChoice = "side_with_contributor" | "side_with_subject";

type VoteRow = {
  id: string;
  alias: string;
  jobTitle?: string;
  choice: VoteChoice;
  explanation: string;
  created_at: string;
  agreeCount: number;
  disagreeCount: number;
};

const STORAGE_KEY = "dnounce_demo_user_votes_v4";

const DEMO_ATTACHMENTS = [
  { id: "a1", label: "Contract_Section_3B.pdf", type: "image" as const, src: "/og-image.png", agree: 17, disagree: 6 },
];

const SEED_DEBATE_REACTIONS: Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }> = {
  d1: { agree: 12, disagree: 23, mine: null },
  d2: { agree: 27, disagree: 9, mine: null },
  d3: { agree: 15, disagree: 18, mine: null },
  d4: { agree: 22, disagree: 11, mine: null },
};

/* ─── Helpers ───────────────────────────────────────── */

function formatMMDDYYYY(value: string) {
  const d = new Date(value);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatTimestamp(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "numeric", minute: "2-digit",
  });
}

function shortId(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/* ─── AgreeDisagree (static, no Supabase) ───────────── */

function AgreeDisagree({
  agreeCount,
  disagreeCount,
  myDir,
  onToggle,
  disabled,
  size = 28,
}: {
  agreeCount: number;
  disagreeCount: number;
  myDir: 1 | -1 | null;
  onToggle: (d: 1 | -1) => void;
  disabled?: boolean;
  size?: number;
}) {
  const circleBase: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 9999,
    border: "2px solid #555",
    fontSize: Math.max(14, Math.round(size * 0.62)),
    fontWeight: 800,
    background: "transparent",
    color: "#333",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.1s",
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onToggle(1)}
        style={{
          ...circleBase,
          borderColor: myDir === 1 ? "#111" : "#555",
          background: myDir === 1 ? "#eaeaea" : "transparent",
        }}
        aria-label="Agree"
        title="Agree"
      >
        ↑
      </button>
      <span className="text-xs font-semibold text-gray-700 min-w-[18px] text-center">
        {agreeCount}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onToggle(-1)}
        style={{
          ...circleBase,
          borderColor: myDir === -1 ? "#111" : "#555",
          background: myDir === -1 ? "#eaeaea" : "transparent",
        }}
        aria-label="Disagree"
        title="Disagree"
      >
        ↓
      </button>
      <span className="text-xs font-semibold text-gray-700 min-w-[18px] text-center">
        {disagreeCount}
      </span>
    </div>
  );
}

/* ─── LifecycleChips ────────────────────────────────── */

const STAGES = [
  { id: 1, label: "AI Verification" },
  { id: 2, label: "Subject Notified" },
  { id: 3, label: "Record Published" },
  { id: 4, label: "Record in Dispute" },
  { id: 5, label: "Debate Phase" },
  { id: 6, label: "Voting in Progress" },
  { id: 7, label: "Settled" },
];

function LifecycleChips({ current }: { current: number }) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!scrollRef.current || !activeRef.current) return;
    const container = scrollRef.current;
    const active = activeRef.current;
    const targetScrollLeft = Math.max(0, active.offsetLeft - container.clientWidth / 2 + active.offsetWidth / 2);
    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [current]);

  return (
    <div ref={scrollRef} className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 p-2 overflow-x-auto">
      <div className="flex flex-nowrap items-stretch gap-2 min-w-max">
        {STAGES.map((s, idx) => {
          const isActive = s.id === current;
          const isDone = s.id < current;
          return (
            <div key={s.id} ref={isActive ? activeRef : null} className="flex items-stretch min-w-0">
              <div
                className={[
                  "min-w-[88px] sm:min-w-[96px] rounded-2xl border px-2 py-2 text-center flex items-center justify-center h-11",
                  isActive ? "bg-black text-white border-black"
                  : isDone ? "bg-white text-gray-700 border-gray-200"
                  : "bg-white text-gray-500 border-gray-200",
                ].join(" ")}
              >
                <div className="text-[10px] font-medium leading-tight line-clamp-2">{s.label}</div>
              </div>
              {idx < STAGES.length - 1 && (
                <div className="shrink-0 w-4 flex items-center justify-center text-gray-300 select-none text-xs">›</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Debate card ───────────────────────────────────── */

function DebateCard({
  post,
  agree,
  disagree,
  myDir,
  onToggle,
  replies = [],
  replyReactions,
  onReplyToggle,
}: {
  post: typeof DEBATE_POSTS[0];
  agree: number;
  disagree: number;
  myDir: 1 | -1 | null;
  onToggle: (d: 1 | -1) => void;
  replies?: typeof DEBATE_POSTS;
  replyReactions?: Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }>;
  onReplyToggle?: (id: string, d: 1 | -1) => void;
}) {
  const isSubject = post.role === "subject";
  const [expandedReplies, setExpandedReplies] = useState(false);

  return (
    <div className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div className={["absolute left-0 top-0 bottom-0 w-1.5", isSubject ? "bg-gray-300" : "bg-gray-400"].join(" ")} />
      <div className="px-4 py-4 pl-5 sm:px-5 sm:py-5 sm:pl-6">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full overflow-hidden border bg-white flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-gray-700" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">{post.name}</div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {isSubject ? "Subject" : "Poster"} · {formatTimestamp(post.created_at)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.body}</div>

        {/* Reactions — read-only, debate is closed */}
        <div className="mt-2">
          <AgreeDisagree agreeCount={agree} disagreeCount={disagree} myDir={myDir} onToggle={onToggle} disabled size={26} />
        </div>

        {/* Replies toggle */}
        {replies.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpandedReplies(!expandedReplies)}
              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
            >
              {expandedReplies ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {replies.length} repl{replies.length === 1 ? "y" : "ies"}
            </button>

            {expandedReplies && (
              <div className="mt-3 space-y-3 pl-3 sm:pl-5 border-l border-gray-200">
                {replies.map((reply) => {
                  const rx = replyReactions?.[reply.id] ?? { agree: 0, disagree: 0, mine: null as null | 1 | -1 };
                  return (
                    <div key={reply.id} className="py-1">
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-full overflow-hidden border bg-white flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-gray-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900">{reply.name}</div>
                          <div className="text-[11px] text-gray-500">
                            {reply.role === "subject" ? "Subject" : "Poster"} · {formatTimestamp(reply.created_at)}
                          </div>
                          <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{reply.body}</div>
                          <div className="mt-2">
                            <AgreeDisagree
                              agreeCount={rx.agree}
                              disagreeCount={rx.disagree}
                              myDir={rx.mine}
                              onToggle={(d) => onReplyToggle?.(reply.id, d)}
                              disabled
                              size={22}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
            <ChevronRight className="h-4 w-4" />
            No replies
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────── */

export default function DemoPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileRecordOpen, setFileRecordOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // close mobile menu on outside click
  useEffect(() => {
    // 🔍 Track demo page view
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const userId = sessionData?.session?.user?.id ?? null;
      if (userId) {
        const { data: adminCheck } = await supabase.from("admin_roles").select("user_id").eq("user_id", userId).eq("is_active", true).maybeSingle();
        if (adminCheck) return;
      }
      supabase.from("page_views").insert({
        page_type: "demo_freelancer",
        page_id: null,
        viewer_auth_user_id: sessionData?.session?.user?.id ?? null,
        is_anonymous: !sessionData?.session?.user?.id,
      }).then(() => {});
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const menu = document.getElementById("demo-mobile-menu");
      const button = document.getElementById("demo-menu-button");
      if (
        menu && !menu.contains(event.target as Node) &&
        button && !button.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // votes
  const [userVotes, setUserVotes] = useState<VoteRow[]>([]);
  const [myVote, setMyVote] = useState<VoteRow | null>(null);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // reactions on vote cards
  const [reactions, setReactions] = useState<Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }>>({});
  // reactions on debate posts
  const [debateReactions, setDebateReactions] = useState<Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }>>(
    JSON.parse(JSON.stringify(SEED_DEBATE_REACTIONS))
  );
  // attachment modal
  const [attachmentOpen, setAttachmentOpen] = useState<string | null>(null);
  // reactions on attachments
  const [attachmentReactions, setAttachmentReactions] = useState<Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }>>({});
  const [recordReaction, setRecordReaction] = useState<{ agree: number; disagree: number; mine: 1 | -1 | null }>({ agree: 31, disagree: 8, mine: null });

  // community section
  const [communityBody, setCommunityBody] = useState("");
  const [communityPosts, setCommunityPosts] = useState<{ id: string; alias: string; body: string; ts: string; agree: number; disagree: number; mine: 1 | -1 | null }[]>([]);
  const [postingCommunity, setPostingCommunity] = useState(false);

  const recordUrl = typeof window !== "undefined" ? window.location.href : "https://dnounce.com/demo";

  // load persisted votes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserVotes(parsed.votes ?? []);
        setMyVote(parsed.myVote ?? null);
        setReactions(parsed.reactions ?? {});
        setCommunityPosts(parsed.community ?? []);
        if (parsed.debateReactions) setDebateReactions(parsed.debateReactions);
        if (parsed.recordReaction) setRecordReaction(parsed.recordReaction);
        if (parsed.attachmentReactions) setAttachmentReactions(parsed.attachmentReactions);
      }
    } catch {}
  }, []);

  function persist(
    votes: VoteRow[],
    mv: VoteRow | null,
    rx: typeof reactions,
    community: typeof communityPosts,
    dRx: typeof debateReactions,
    rRx: typeof recordReaction,
    aRx: typeof attachmentReactions
  ) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes, myVote: mv, reactions: rx, community, debateReactions: dRx, recordReaction: rRx, attachmentReactions: aRx }));
    } catch {}
  }

  const allVotes = [...SEED_VOTES, ...userVotes];
  const contributorCount = allVotes.filter((v) => v.choice === "side_with_contributor").length;
  const subjectCount = allVotes.filter((v) => v.choice === "side_with_subject").length;
  const total = allVotes.length;
  const contributorPct = total > 0 ? Math.round((contributorCount / total) * 100) : 50;

  async function submitVote() {
    if (!choice || !reason.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    const newVote: VoteRow = {
      id: "u" + Date.now(),
      alias: (()=>{const l=Math.floor(2+Math.random()*6);const b=Array.from({length:l},()=>String.fromCharCode(97+Math.floor(Math.random()*26))).join('');const n=1+Math.floor(Math.random()*999);return `${b}@dnounce_${n}`;})(),
      choice,
      explanation: reason.trim(),
      created_at: new Date().toISOString(),
      agreeCount: 0,
      disagreeCount: 0,
    };
    const newVotes = [...userVotes, newVote];
    setUserVotes(newVotes);
    setMyVote(newVote);
    persist(newVotes, newVote, reactions, communityPosts, debateReactions, recordReaction, attachmentReactions);
    setSubmitting(false);
  }

  function toggleReaction(voteId: string, dir: 1 | -1) {
    const cur = reactions[voteId] ?? { agree: 0, disagree: 0, mine: null };
    const allVotesCombined = [...SEED_VOTES, ...userVotes];
    const base = allVotesCombined.find((v) => v.id === voteId);
    let agree = base?.agreeCount ?? cur.agree;
    let disagree = base?.disagreeCount ?? cur.disagree;

    if (cur.mine === dir) {
      if (dir === 1) agree = Math.max(0, agree - 1);
      else disagree = Math.max(0, disagree - 1);
      const updated = { ...reactions, [voteId]: { agree, disagree, mine: null } };
      setReactions(updated);
      persist(userVotes, myVote, updated, communityPosts, debateReactions, recordReaction, attachmentReactions);
    } else {
      if (cur.mine === 1) agree = Math.max(0, agree - 1);
      if (cur.mine === -1) disagree = Math.max(0, disagree - 1);
      if (dir === 1) agree++;
      else disagree++;
      const updated = { ...reactions, [voteId]: { agree, disagree, mine: dir } };
      setReactions(updated);
      persist(userVotes, myVote, updated, communityPosts, debateReactions, recordReaction, attachmentReactions);
    }
  }

  function getReaction(voteId: string, base: VoteRow) {
    const r = reactions[voteId];
    if (!r) return { agree: base.agreeCount, disagree: base.disagreeCount, mine: null as null | 1 | -1 };
    return r;
  }

  function toggleDebateReaction(postId: string, dir: 1 | -1) {
    const cur = debateReactions[postId] ?? { agree: 0, disagree: 0, mine: null };
    let agree = cur.agree;
    let disagree = cur.disagree;
    if (cur.mine === dir) {
      if (dir === 1) agree = Math.max(0, agree - 1);
      else disagree = Math.max(0, disagree - 1);
      const updated = { ...debateReactions, [postId]: { agree, disagree, mine: null } };
      setDebateReactions(updated);
      persist(userVotes, myVote, reactions, communityPosts, updated, recordReaction, attachmentReactions);
    } else {
      if (cur.mine === 1) agree = Math.max(0, agree - 1);
      if (cur.mine === -1) disagree = Math.max(0, disagree - 1);
      if (dir === 1) agree++;
      else disagree++;
      const updated = { ...debateReactions, [postId]: { agree, disagree, mine: dir } };
      setDebateReactions(updated);
      persist(userVotes, myVote, reactions, communityPosts, updated, recordReaction, attachmentReactions);
    }
  }

  function toggleRecordReaction(dir: 1 | -1) {
    const cur = recordReaction;
    let agree = cur.agree;
    let disagree = cur.disagree;
    if (cur.mine === dir) {
      if (dir === 1) agree = Math.max(0, agree - 1);
      else disagree = Math.max(0, disagree - 1);
      const updated = { agree, disagree, mine: null as null };
      setRecordReaction(updated);
      persist(userVotes, myVote, reactions, communityPosts, debateReactions, updated, attachmentReactions);
    } else {
      if (cur.mine === 1) agree = Math.max(0, agree - 1);
      if (cur.mine === -1) disagree = Math.max(0, disagree - 1);
      if (dir === 1) agree++;
      else disagree++;
      const updated = { agree, disagree, mine: dir as 1 | -1 };
      setRecordReaction(updated);
      persist(userVotes, myVote, reactions, communityPosts, debateReactions, updated, attachmentReactions);
    }
  }

  function toggleAttachmentReaction(attachId: string, dir: 1 | -1) {
    const base = DEMO_ATTACHMENTS.find((a) => a.id === attachId);
    const cur = attachmentReactions[attachId] ?? { agree: base?.agree ?? 0, disagree: base?.disagree ?? 0, mine: null };
    let agree = cur.agree;
    let disagree = cur.disagree;
    if (cur.mine === dir) {
      if (dir === 1) agree = Math.max(0, agree - 1);
      else disagree = Math.max(0, disagree - 1);
      const updated = { ...attachmentReactions, [attachId]: { agree, disagree, mine: null } };
      setAttachmentReactions(updated);
      persist(userVotes, myVote, reactions, communityPosts, debateReactions, recordReaction, updated);
    } else {
      if (cur.mine === 1) agree = Math.max(0, agree - 1);
      if (cur.mine === -1) disagree = Math.max(0, disagree - 1);
      if (dir === 1) agree++;
      else disagree++;
      const updated = { ...attachmentReactions, [attachId]: { agree, disagree, mine: dir } };
      setAttachmentReactions(updated);
      persist(userVotes, myVote, reactions, communityPosts, debateReactions, recordReaction, updated);
    }
  }

  function postCommunity() {
    if (!communityBody.trim()) return;
    setPostingCommunity(true);
    setTimeout(() => {
      const newPost = {
        id: "c" + Date.now(),
        alias: (()=>{const l=Math.floor(2+Math.random()*6);const b=Array.from({length:l},()=>String.fromCharCode(97+Math.floor(Math.random()*26))).join('');const n=1+Math.floor(Math.random()*999);return `${b}@dnounce_${n}`;})(),
        body: communityBody.trim(),
        ts: new Date().toISOString(),
        agree: 0,
        disagree: 0,
        mine: null as null | 1 | -1,
      };
      const updated = [...communityPosts, newPost];
      setCommunityPosts(updated);
      setCommunityBody("");
      persist(userVotes, myVote, reactions, updated, debateReactions, recordReaction, attachmentReactions);
      setPostingCommunity(false);
    }, 400);
  }

  const canVote = !myVote;
  const showVoteForm = canVote;
  const maxChars = 1000;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/logo.png" alt="DNounce Logo" width={52} height={52} priority className="w-[52px] h-[52px] sm:w-[74px] sm:h-[74px]" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">DNounce</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="/?from=demo&section=how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
              <a href="/?from=demo&section=voting-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Community</a>
              <a href="/?from=demo&section=guidelines-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Guidelines</a>
              <a href="/?from=demo&section=legal-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Legal</a>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => router.push("/loginsignup")} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">Log in</button>
              <button onClick={() => router.push("/loginsignup")} className="bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-colors">Get started</button>
              {/* Hamburger — mobile only */}
              <button
                id="demo-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Open menu"
              >
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current" />
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div id="demo-mobile-menu" className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3">
              <a href="/?from=demo&section=how-it-works" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">How it works</a>
              <a href="/?from=demo&section=voting-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Community</a>
              <a href="/?from=demo&section=guidelines-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Guidelines</a>
              <a href="/?from=demo&section=legal-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Legal</a>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 pt-24 pb-4 sm:px-4 space-y-3 sm:space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-1 px-1">
        <FileText className="w-4 h-4 text-gray-400" />
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">Record Detail</h1>
      </div>

      {/* Subject + Contributor */}
      <div className="grid grid-cols-1 gap-3">
        {/* Subject */}
        <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white relative">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Subject</h2>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-gray-600" />
            </div>
            <div className="min-w-0">
              <Link href="/subject/demo/freelancer" className="text-lg font-semibold text-gray-900 break-words leading-tight hover:underline">{SUBJECT.name}</Link>
              <p className="text-sm text-gray-600">{SUBJECT.organization} · {SUBJECT.location}</p>
            </div>
          </div>
        </div>

        {/* Contributor */}
        <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white relative">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">Poster</h2>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 break-words leading-tight">{CONTRIBUTOR.name}</p>
              <p className="text-xs text-gray-400 mt-1">Submitted this record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Record card */}
      <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Submitted Record</h2>
          <div className="flex flex-wrap items-center gap-1.5 self-start text-xs text-gray-500">
            <span className="whitespace-nowrap">Anonymity Status:</span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
              <AlertTriangle size={11} className="text-red-600" />
              Anonymity Not Granted
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Submitted</span>
            <span className="text-gray-900">{formatMMDDYYYY(RECORD.created_at)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-medium text-gray-500 shrink-0">Record ID</span>
            <span className="font-mono text-[12px] text-gray-900">{shortId(RECORD.id)}</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(RECORD.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {copied && <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Copied</span>}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Lifecycle chips */}
        <div className="pt-2">
          <LifecycleChips current={6} />
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1.5 text-yellow-500">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star key={i} size={18} className={RECORD.rating >= i + 1 ? "fill-current text-gray-900" : "text-gray-300"} />
          ))}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Category:</span>
            <span className="text-gray-900">{RECORD.category}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{RECORD.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Relationship:</span>
            <span className="text-gray-900">{RECORD.relationship}</span>
          </div>
        </div>

        {/* Description */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-900 mb-2">Experience Details</div>
          <div className="text-[15px] text-gray-800 whitespace-pre-wrap break-words leading-7">
            {RECORD.description}
          </div>
        </div>

        {/* Agree/Disagree on record */}
        <div className="mt-3">
          <AgreeDisagree agreeCount={recordReaction.agree} disagreeCount={recordReaction.disagree} myDir={recordReaction.mine} onToggle={toggleRecordReaction} size={26} />
        </div>

        {/* Attachments */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-sm font-semibold text-gray-900">Attachments</div>
            <div className="text-xs text-gray-500">2 file(s)</div>
          </div>
          <div className="space-y-2">
            {DEMO_ATTACHMENTS.map((a) => (
              <div key={a.id}>
                <button
                  type="button"
                  onClick={() => setAttachmentOpen(a.id)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                    {a.type === "image" ? (
                      <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{a.label}</span>
                </button>
                <div className="px-1 mt-1">
                  <AgreeDisagree
                    agreeCount={attachmentReactions[a.id]?.agree ?? a.agree}
                    disagreeCount={attachmentReactions[a.id]?.disagree ?? a.disagree}
                    myDir={attachmentReactions[a.id]?.mine ?? null}
                    onToggle={(d) => toggleAttachmentReaction(a.id, d)}
                    size={26}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debate section */}
      <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Debate Section</div>
            <div className="text-[11px] text-gray-500">Anything cannot be modified once posted.</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700 shrink-0">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Debate ended
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
          {DEBATE_POSTS.filter((p) => !p.parentId).map((p) => {
            const rx = debateReactions[p.id] ?? SEED_DEBATE_REACTIONS[p.id] ?? { agree: 0, disagree: 0, mine: null };
            const replies = DEBATE_POSTS.filter((r) => r.parentId === p.id);
            return (
              <DebateCard
                key={p.id}
                post={p}
                agree={rx.agree}
                disagree={rx.disagree}
                myDir={rx.mine}
                onToggle={(d) => toggleDebateReaction(p.id, d)}
                replies={replies}
                replyReactions={debateReactions}
                onReplyToggle={(id, d) => toggleDebateReaction(id, d)}
              />
            );
          })}
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Debate is closed. Discussion is now read-only.
        </div>
      </section>

      {/* Voting courtroom */}
      <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Voting Section</div>
            <div className="text-[11px] text-gray-500">
              To side with a party, a reason is required.
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col items-start gap-2 sm:items-end">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Voting open
            </div>
          </div>
        </div>
        <div className="mt-4">
        </div>



        {/* Vote form or my vote */}
        {myVote ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-900">Your vote</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold">
              <span className={myVote.choice === "side_with_contributor" ? "text-blue-700" : "text-indigo-700"}>
                {myVote.choice === "side_with_contributor" ? `Sided with ${CONTRIBUTOR.name}` : `Sided with ${SUBJECT.name}`}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{formatTimestamp(myVote.created_at)}</span>
            </div>
            <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {myVote.explanation}
            </div>
            <div className="mt-3 text-xs text-gray-500">Read-only. Votes cannot be edited after submission.</div>
          </div>
        ) : showVoteForm ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-900">Cast your vote</div>
                <div className="text-[11px] text-gray-500">This will be permanent once submitted.</div>
              </div>
              <div className="text-[11px] text-gray-500 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 shrink-0">No edits</div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setChoice("side_with_contributor")}
                className={[
                  "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                  choice === "side_with_contributor" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                Side with {CONTRIBUTOR.name}
              </button>
              <button
                type="button"
                onClick={() => setChoice("side_with_subject")}
                className={[
                  "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                  choice === "side_with_subject" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                Side with {SUBJECT.name}
              </button>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
              placeholder="Write your reason (required)…"
            />

            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-[11px] text-gray-500">{reason.trim().length}/{maxChars}</div>
              <button
                type="button"
                onClick={submitVote}
                disabled={submitting || !choice || reason.trim().length === 0}
                className="w-full sm:w-auto rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {submitting ? "Submitting…" : "Submit Vote"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Vote statements */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="text-sm font-semibold text-gray-900 mb-5">Vote Statements</div>
          {allVotes.length === 0 ? (
            <div className="text-sm text-gray-500">No votes yet.</div>
          ) : (
            [...allVotes].reverse().map((v) => {
              const rx = getReaction(v.id, v);
              return (
                <div key={v.id} className="border-b border-gray-200 py-6 first:pt-0 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-gray-900 break-all">
                        {v.alias}
                        {v.jobTitle && <span className="ml-1 font-normal text-gray-400">({v.jobTitle})</span>}
                      </span>
                      <div className="text-[11px] text-gray-400 mt-0.5">{formatTimestamp(v.created_at)}</div>
                    </div>
                    <span className={[
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                      v.choice === "side_with_contributor" ? "text-blue-700 border-blue-200 bg-blue-50" : "text-indigo-700 border-indigo-200 bg-indigo-50",
                    ].join(" ")}>
                      {v.choice === "side_with_contributor" ? `With ${CONTRIBUTOR.name}` : `With ${SUBJECT.name}`}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{v.explanation}</div>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <AgreeDisagree
                      agreeCount={rx.agree}
                      disagreeCount={rx.disagree}
                      myDir={rx.mine}
                      onToggle={(d) => toggleReaction(v.id, d)}
                      size={24}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* CTA banner */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5 text-center">
        <div className="text-sm font-semibold text-indigo-900 mb-1">Take control of your reputation.</div>
        <div className="text-xs text-indigo-700 mb-3">Invite people to share their experience, and respond when you want to add context.</div>
        <button
          onClick={() => router.push("/loginsignup?from=demo")}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Get started
        </button>
      </div>

      {/* Attachment modal */}
      {attachmentOpen && (() => {
        const a = DEMO_ATTACHMENTS.find((x) => x.id === attachmentOpen);
        if (!a) return null;
        return (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setAttachmentOpen(null)}>
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 p-4 border-b bg-white">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{a.label}</div>
                </div>
                <button type="button" onClick={() => setAttachmentOpen(null)} className="shrink-0 inline-flex items-center justify-center rounded-full border bg-white h-9 w-9 hover:bg-gray-50">
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </div>
              <div className="p-4 bg-gray-50">
                {a.type === "image" && a.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.src} alt={a.label} className="w-full max-h-[72vh] object-contain rounded-xl border bg-white" />
                ) : (
                  <div className="rounded-xl border bg-white p-4 text-sm text-gray-700">
                    Preview not supported for this file type in the demo.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Share modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setShareOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-gray-900">Share Record</div>
              <button type="button" onClick={() => setShareOpen(false)} className="rounded-full border p-1.5 text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-600 truncate flex-1">{recordUrl}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(recordUrl);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 1500);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Copy className="w-4 h-4" />
                {shareCopied ? "Copied!" : "Copy link"}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(recordUrl)}&text=${encodeURIComponent("Should this record stand or be removed? You decide 👇")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="text-base">𝕏</span>
                Post
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(recordUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="text-base">💬</span>
                WhatsApp
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(recordUrl)}`}
                className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="text-base">📱</span>
                SMS
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}