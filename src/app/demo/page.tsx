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

/* ─── Static fake data ─────────────────────────────── */

const RECORD = {
  id: "ac3d9478-5143-4313-9730-c470b97fd1bb",
  created_at: "2026-04-02T19:57:12.655Z",
  category: "Graphic Designer",
  location: "New York, NY",
  relationship: "Client",
  rating: 1.5,
  credibility: "Opinion-Based",
  description:
    "Hired this freelance graphic designer for a full logo package. Paid $650 and was promised vector files, proper color codes, and a commercially licensed font. What I received was pixelated JPEGs, wrong hex codes from the brief, and a font that wasn't licensed for commercial use. When I flagged the issues, they said \"you approved the mockup so the work is complete\" and went completely unresponsive. No revisions, no refund, no communication. Had to dispute the charge with my bank.",
  status: "voting",
};

const SUBJECT = { name: "Marcus Reid", organization: "Independent", location: "New York, NY" };

const CONTRIBUTOR = { name: "Taylor V." };

const DEBATE_POSTS = [
  {
    id: "d1",
    role: "contributor" as const,
    name: "Taylor V.",
    body: "I have email receipts (Attachment #1) showing the agreed deliverables: vector files, brand hex codes, and a licensed font. None of these were delivered. The mockup approval was for concept direction — not final file format or licensing.",
    created_at: "2026-04-07T14:22:00Z",
  },
  {
    id: "d2",
    role: "subject" as const,
    name: "Marcus Reid",
    body: "The client approved the final mockup without raising any format concerns at the time. Revisions were not included in the quoted price. The bank dispute was fraudulent — I delivered exactly what was presented and agreed upon.",
    created_at: "2026-04-08T09:41:00Z",
  },
];

const SEED_VOTES: VoteRow[] = [
    {
      id: "v1",
      alias: "kxr@dnounce_312",
      jobTitle: "Freelance Designer",
      choice: "keep",
    explanation:
      "Deliverables were explicitly listed in the contract. \"You approved the mockup\" doesn't override a written spec sheet. The poster has receipts. Record should stand.",
    created_at: "2026-04-10T11:04:00Z",
    agreeCount: 14,
    disagreeCount: 2,
  },
  {
    id: "v2",
    alias: "mbvp@dnounce_87",
    jobTitle: "Creative Director",
    choice: "delete",
    explanation:
      "I'm a designer and scope disputes happen all the time — clients often interpret approvals differently. Without seeing the actual contract language I can't fully side with the poster. Too much ambiguity to let this stand.",
    created_at: "2026-04-11T08:17:00Z",
    agreeCount: 6,
    disagreeCount: 9,
  },
  {
    id: "v3",
    alias: "tjf@dnounce_541",
    jobTitle: "IP Attorney",
    choice: "keep",
    explanation:
      "An unlicensed commercial font is a legal liability regardless of anything else in this dispute. That single deliverable failure alone makes this record valid.",
    created_at: "2026-04-12T16:55:00Z",
    agreeCount: 21,
    disagreeCount: 1,
  },
  {
    alias: "qlnx@dnounce_29",
    jobTitle: "Brand Strategist",
    choice: "keep",
    explanation:
      "The designer ghosting after being confronted is the biggest red flag here. Even if there was ambiguity on the mockup, a professional handles it with communication, not silence.",
    created_at: "2026-04-13T10:30:00Z",
    agreeCount: 18,
    disagreeCount: 3,
  },
];

/* ─── Types ─────────────────────────────────────────── */

type VoteChoice = "keep" | "delete";

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
  { id: "a1", label: "Attachment #1", type: "image" as const, src: "/og-image.png", agree: 11, disagree: 1 },
];

const SEED_DEBATE_REACTIONS: Record<string, { agree: number; disagree: number; mine: 1 | -1 | null }> = {
  d1: { agree: 22, disagree: 5, mine: null },
  d2: { agree: 9, disagree: 17, mine: null },
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
  { id: 3, label: "Record Published" },
  { id: 4, label: "Record in Dispute" },
  { id: 5, label: "Debate Phase" },
  { id: 6, label: "Voting in Progress" },
  { id: 7, label: "Settled" },
];

function LifecycleChips({ current }: { current: number }) {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 p-2 overflow-x-auto">
      <div className="flex flex-nowrap items-stretch gap-2 min-w-max">
        {STAGES.map((s, idx) => {
          const isActive = s.id === current;
          const isDone = s.id < current;
          return (
            <div key={s.id} className="flex items-stretch min-w-0">
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
}: {
  post: typeof DEBATE_POSTS[0];
  agree: number;
  disagree: number;
  myDir: 1 | -1 | null;
  onToggle: (d: 1 | -1) => void;
}) {
  const isSubject = post.role === "subject";
  return (
    <div className={["relative overflow-hidden border-b bg-white", "border-gray-200"].join(" ")}>
      <div className={["absolute left-0 top-0 bottom-0 w-1.5", isSubject ? "bg-gray-300" : "bg-gray-400"].join(" ")} />
      <div className="px-4 py-4 pl-5 sm:px-5 sm:py-5 sm:pl-6">
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
        <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.body}</div>
        <div className="mt-2">
          <AgreeDisagree agreeCount={agree} disagreeCount={disagree} myDir={myDir} onToggle={onToggle} size={26} />
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
          <ChevronRight className="h-4 w-4" />
          No replies
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────── */

export default function DemoPage() {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

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
  const keepCount = allVotes.filter((v) => v.choice === "keep").length;
  const deleteCount = allVotes.filter((v) => v.choice === "delete").length;
  const total = allVotes.length;
  const keepPct = total > 0 ? Math.round((keepCount / total) * 100) : 50;

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
    <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-2 sm:px-4 sm:py-4 space-y-3 sm:space-y-4">

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
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
              <AlertTriangle size={11} className="text-red-600" />
              Opinion-Based
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
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Debate ended
          </div>
        </div>

        <div className="mt-4 space-y-0 rounded-2xl border border-gray-200 overflow-hidden">
          {DEBATE_POSTS.map((p) => {
            const rx = debateReactions[p.id] ?? SEED_DEBATE_REACTIONS[p.id] ?? { agree: 0, disagree: 0, mine: null };
            return (
              <DebateCard
                key={p.id}
                post={p}
                agree={rx.agree}
                disagree={rx.disagree}
                myDir={rx.mine}
                onToggle={(d) => toggleDebateReaction(p.id, d)}
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
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold text-gray-900">Voting</div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Voting open
          </div>
        </div>

        {/* Tally */}
        <div className="mb-4">
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-none mb-2">
            <span><span className="font-semibold">Keep:</span> {keepCount}</span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span><span className="font-semibold">Delete:</span> {deleteCount}</span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span><span className="font-semibold">Total:</span> {total}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${keepPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[11px] text-gray-500">
            <span>Keep {keepPct}%</span>
            <span>Delete {100 - keepPct}%</span>
          </div>
        </div>

        {/* Vote form or my vote */}
        {myVote ? (
          <div className={`rounded-xl border p-4 mb-4 ${myVote.choice === "keep" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-900">Your vote</span>
              <span className={[
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                myVote.choice === "keep" ? "text-green-700 border-green-200 bg-green-50" : "text-red-700 border-red-200 bg-red-50",
              ].join(" ")}>
                {myVote.choice.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed">{myVote.explanation}</div>
            <div className="mt-3 text-xs text-gray-500">Read-only. Votes cannot be edited after submission.</div>
          </div>
        ) : showVoteForm ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-900">Cast your vote</div>
                <div className="text-[11px] text-gray-500">This will be permanent once submitted.</div>
              </div>
              <div className="text-[11px] text-gray-500 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">No edits</div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setChoice("keep")}
                className={[
                  "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                  choice === "keep" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                KEEP
              </button>
              <button
                type="button"
                onClick={() => setChoice("delete")}
                className={[
                  "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                  choice === "delete" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                DELETE
              </button>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
              placeholder="Write your reason (required)…"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
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
        <div className="mt-2">
          <div className="text-sm font-semibold text-gray-900 mb-4">Vote Statements</div>
          {allVotes.length === 0 ? (
            <div className="text-sm text-gray-500">No votes yet.</div>
          ) : (
            [...allVotes].reverse().map((v) => {
              const rx = getReaction(v.id, v);
              return (
                <div key={v.id} className="border-b border-gray-200 pb-5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">
                      {v.alias}
                      {v.jobTitle && <span className="ml-1 font-normal text-gray-400">({v.jobTitle})</span>}
                    </span>
                    <span className="text-[11px] text-gray-400">{formatTimestamp(v.created_at)}</span>
                    <span className={[
                      "ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      v.choice === "keep" ? "text-green-700 border-green-200 bg-green-50" : "text-red-700 border-red-200 bg-red-50",
                    ].join(" ")}>
                      {v.choice.toUpperCase()}
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

      {/* Community section */}
      <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
        <div className="text-sm font-semibold text-gray-900 mb-1">Community</div>
        <div className="text-[11px] text-gray-500 mb-4">Public discussion. Be respectful and accurate.</div>

        <div className="mt-2">
          <textarea
            value={communityBody}
            onChange={(e) => setCommunityBody(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
            placeholder="Share your perspective on this record…"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={postCommunity}
              disabled={postingCommunity || !communityBody.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {postingCommunity ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {postingCommunity ? "Posting…" : "Post Statement"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          {communityPosts.length === 0 ? (
            <div className="text-sm text-gray-500">No community statements yet.</div>
          ) : (
            communityPosts.map((s) => (
              <div key={s.id} className="border-b border-gray-200 py-4 last:border-b-0 last:pb-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-gray-900">{s.alias}</span>
                  <div className="text-[11px] text-gray-500">{formatTimestamp(s.ts)}</div>
                </div>
                <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{s.body}</div>
                <div className="mt-2">
                  <AgreeDisagree agreeCount={s.agree} disagreeCount={s.disagree} myDir={s.mine} onToggle={() => {}} size={26} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA banner */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5 text-center">
        <div className="text-sm font-semibold text-indigo-900 mb-1">Think someone deserves a record?</div>
        <div className="text-xs text-indigo-700 mb-3">DNounce gives every professional a fair, structured dispute process — community moderated.</div>
        <a
          href="https://dnounce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          File a record at dnounce.com
        </a>
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
  );
}