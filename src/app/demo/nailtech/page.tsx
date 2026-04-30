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
  id: "ac3d9478-5143-4313-9730-c470b97fd1bb",
  created_at: "2026-04-02T19:57:12.655Z",
  category: "Nail Technician",
  location: "Brooklyn, NY",
  relationship: "Client",
  rating: 2,
  credibility: "Evidence-Based",
  description:
    "I paid $120 for a full acrylic set and three nails popped off within three days. I followed the aftercare instructions I was given — no soaking, no picking. I reached out about it and was offered a free fix but no refund. That's not acceptable for a $120 service that didn't hold up. I've attached photos taken the day after the appointment and then three days later when they came off.",
  status: "voting",
};

const SUBJECT = { name: "Jasmine T.", organization: "Glamour Nails Studio", location: "Brooklyn, NY" };

const CONTRIBUTOR = { name: "Destiny R." };

const DEBATE_POSTS = [
  {
    id: "d2",
    role: "subject" as const,
    name: "Jasmine T.",
    body: "In my professional opinion, nails lifting that quickly is almost always an aftercare issue. I take photos of every set before the client leaves. I offered a complimentary fix within 48 hours, which is standard in the industry. A refund isn't the norm for a service that was completed and signed off on.",
    created_at: "2026-04-07T14:22:00Z",
    parentId: null,
  },
  {
    id: "d3",
    role: "contributor" as const,
    name: "Destiny R.",
    body: "I followed the care sheet word for word. No dishes, no soaking, no picking. Three nails came off on their own — two while I was sleeping. That's not aftercare, that's application. I have photos from day one and day three. The fix offer doesn't help when I had an event on day four.",
    created_at: "2026-04-08T09:00:00Z",
    parentId: "d2",
  },
  {
    id: "d4",
    role: "subject" as const,
    name: "Jasmine T.",
    body: "I understand you're frustrated. But without being able to inspect the nails in person, I can't confirm what caused the lifting. The offer to fix within 48 hours shows good faith. Without seeing the actual nails, it's hard to blame the application alone.",
    created_at: "2026-04-08T09:41:00Z",
    parentId: null,
  },
];

const SEED_VOTES: VoteRow[] = [
  {
    id: "v1",
    alias: "kxr@dnounce_312",
    jobTitle: "Nail Tech, 6 years",
    choice: "side_with_contributor",
    explanation:
      "Three nails in three days with documented photos is not an aftercare issue — that's an adhesion problem. A care sheet doesn't matter if prep or primer wasn't done right. The photos are the evidence here.",
    created_at: "2026-04-10T11:04:00Z",
    agreeCount: 21,
    disagreeCount: 3,
  },
  {
    id: "v2",
    alias: "mbvp@dnounce_87",
    jobTitle: "Esthetician",
    choice: "side_with_subject",
    explanation:
      "Aftercare really does matter more than most clients realize. Without seeing the actual application or knowing the client's nail health, I can't say this was the tech's fault. Offering a free fix is the right move.",
    created_at: "2026-04-11T08:17:00Z",
    agreeCount: 8,
    disagreeCount: 11,
  },
  {
    id: "v3",
    alias: "tjf@dnounce_541",
    jobTitle: "Beauty Industry Consultant",
    choice: "side_with_contributor",
    explanation:
      "The photos are the deciding factor. Day one vs day three with nails already off — that's not gradual lifting from misuse. A $120 set should last at minimum two weeks with normal use.",
    created_at: "2026-04-12T16:55:00Z",
    agreeCount: 17,
    disagreeCount: 2,
  },
  {
    id: "v4",
    alias: "qlnx@dnounce_29",
    jobTitle: "Salon Owner",
    choice: "side_with_subject",
    explanation:
      "I've seen clients do everything right and still have issues based on their natural nail chemistry. The offer to fix within 48 hours shows good faith. Without seeing the actual nails, it's hard to blame the application alone.",
    created_at: "2026-04-13T10:30:00Z",
    agreeCount: 9,
    disagreeCount: 14,
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
  { id: "a1", label: "Attachment #1", type: "image" as const, src: "/og-image.png", agree: 14, disagree: 1 },
];

const SEED_DEBATE_REACTIONS: Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }> = {
  d2: { agree: 9, disagree: 21, mine: null },
  d3: { agree: 26, disagree: 4, mine: null },
  d4: { agree: 6, disagree: 17, mine: null },
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

export default function DemoNailTechPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileRecordOpen, setFileRecordOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // close mobile menu on outside click
  useEffect(() => {
    // 🔍 Track demo page view
    supabase.auth.getSession().then(({ data: sessionData }) => {
      supabase.from("page_views").insert({
        page_type: "demo",
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
  const [recordReaction, setRecordReaction] = useState<{ agree: number; disagree: number; mine: 1 | -1 | null }>({ agree: 28, disagree: 6, mine: null });

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
              <p className="text-lg font-semibold text-gray-900 break-words leading-tight">{SUBJECT.name}</p>
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
            <span className="whitespace-nowrap">AI Credibility Recommendation:</span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
              Evidence-Based
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