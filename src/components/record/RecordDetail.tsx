"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  User,
  MapPin,
  FileText,
  Star,
  CheckCircle,
  AlertTriangle,
  CircleAlert,
  Copy,
  Paperclip,
  X,
  Pin,
  Eye,
  Share2,
  ShieldAlert,
  FileImage,
  File as FileIcon,
  FileText as FileTextIcon,
  Shield,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { stageConfig } from "@/config/stageConfig";
import AgreeDisagree from "@/components/reactions/AgreeDisagree";
import MentionTextarea, { notifyMentions } from "@/components/MentionTextarea";

const PUBLIC_STAGE_ORDER = [3, 6, 7] as const;
const FULL_STAGE_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;
const POST_PUBLISH_STAGE_ORDER = [3, 4, 5, 6, 7] as const;

type ViewerRole = "public" | "contributor" | "subject" | "voter" | "citizen";

/* =========================
   Helpers
========================= */

function normalizeStatus(raw: any) {
  return (raw || "").toString().trim().toLowerCase();
}

function normalizeCredibility(raw: any) {
  const s = (raw || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—−]/g, "-");

  if (s.includes("evidence-based") || s.includes("evidence based") || s.includes("evidence_based")) return "Evidence-Based";
  if (s.includes("opinion-based") || s.includes("opinion based") || s.includes("opinion_based")) return "Opinion-Based";
  if (s.includes("unable to verify") || s.includes("unable_to_verify")) return "Unable to Verify";
  if (s.includes("unclear")) return "Unclear";
  return "Pending AI Review";
}

function getRecordStage(record: any): number {
  const status = normalizeStatus(record?.status);
  if (status === "ai_verification") return 1;
  if (status === "subject_notified") return 2;
  if (status === "published") return 3;
  if (status === "deletion_request") return 4;
  if (status === "debate") return 5;
  if (status === "voting") return 6;
  if (status === "decision") return 7;

  const aiDone = !!record?.ai_completed_at;
  const isPublished = record?.is_published === true || !!record?.published_at;

  if (!aiDone) return 1;
  if (aiDone && !isPublished) return 2;
  return 3;
}

function formatMMDDYYYY(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function viewerLabel(viewerRole: ViewerRole) {
  switch (viewerRole) {
    case "public":
      return "Public";
    case "subject":
      return "Subject";
    case "contributor":
      return "Contributor";
    case "voter":
      return "Voter";
    case "citizen":
      return "Citizen";
    default:
      return "Viewer";
  }
}

function debateNoPostMessage(args: { viewerRole: ViewerRole; status: string; stage: number }) {
  const { viewerRole, status, stage } = args;
  const s = normalizeStatus(status);

  if (stage >= 6) {
    return "Debate is closed. Discussion is now read-only.";
  }

  if (stage === 5 && s !== "debate") {
    return "Debate is not currently open.";
  }

  if (viewerRole === "public") {
    return "Sign in to participate. Only the subject and contributor can post during debate.";
  }
  if (viewerRole === "citizen" || viewerRole === "voter") {
    return "View-only for you. Only the subject and contributor can post during debate.";
  }
  if (viewerRole === "subject") {
    return "You are the subject. You can post during debate while it’s open.";
  }
  if (viewerRole === "contributor") {
    return "You are the contributor. You can post during debate while it’s open.";
  }

  return "View-only.";
}

function votingNoVoteMessage(args: {
  viewerRole: ViewerRole;
  isCurrentlyVoting: boolean;
  votingEnded: boolean;
  hasVoted: boolean;
  stage: number;
}) {
  const { viewerRole, isCurrentlyVoting, votingEnded, hasVoted, stage } = args;

  if (stage >= 7 || votingEnded) {
    return "Voting is closed. Results will be finalized in the decision stage.";
  }

  if (!isCurrentlyVoting) {
    return "Voting is not currently open.";
  }

  if (viewerRole === "public") {
    return "Sign in to view voting.";
  }

  if (viewerRole === "subject") {
    return "You are the subject. You can’t vote on your own record.";
  }
  if (viewerRole === "contributor") {
    return "You are the contributor. You can’t vote on a record you submitted.";
  }

  if ((viewerRole === "citizen" || viewerRole === "voter") && hasVoted) {
    return "Read-only. Votes can’t be edited after submission.";
  }

  return "View-only right now.";
}

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function shouldRevealContributorIdentity(record: any): boolean {
  const cred = normalizeCredibility(record?.credibility);
  const choseName = record?.contributor_identity_preference === true;

  if (cred === "Opinion-Based") return true;
  if (cred === "Evidence-Based") return choseName;
  return false; // Unable to Verify → always alias
}

function getVisibleStagesForViewer(args: { viewerRole: ViewerRole; stage: number }) {
  const { viewerRole, stage } = args;
  const current = Math.min(7, Math.max(1, stage || 1));

  if (viewerRole === "public") return PUBLIC_STAGE_ORDER;
  if (viewerRole === "contributor" || viewerRole === "subject") return FULL_STAGE_ORDER;
  return POST_PUBLISH_STAGE_ORDER;
}

function formatTimestampNoSeconds(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveViewerRole(args: { sessionUserId: string; record: any; hasVote: boolean }): ViewerRole {
  const { sessionUserId, record, hasVote } = args;

  const contributorUserId = record?.contributor?.user_id ?? record?.contributor?.[0]?.user_id ?? null;
  if (contributorUserId && contributorUserId === sessionUserId) return "contributor";

  const subjectUserId = record?.subject?.owner_auth_user_id ?? null;
  if (subjectUserId && subjectUserId === sessionUserId) return "subject";

  if (hasVote) return "voter";
  return "citizen";
}

function canShowContributorProfileLink(record: any): boolean {
  return shouldRevealContributorIdentity(record) === true;
}

/** Public URL (bucket is PUBLIC). */
function getPublicAttachmentUrl(path: string) {
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return data?.publicUrl ?? "";
}

function isProbablyImage(mime: string, path: string) {
  const m = (mime || "").toLowerCase();
  return m.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(path || "");
}
function isProbablyPdf(mime: string, path: string) {
  const m = (mime || "").toLowerCase();
  return m === "application/pdf" || /\.pdf$/i.test(path || "");
}

function fileTypeIcon(mime: string, path: string) {
  if (isProbablyImage(mime, path)) return FileImage;
  if (isProbablyPdf(mime, path)) return FileTextIcon;
  return FileIcon;
}

type AttachmentRow = {
  id: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  label: string | null;
  created_at: string | null;
};

type DebateAttachmentRow = AttachmentRow & { message_id: string };

function makeAttachmentKey(path: string) {
  return (path || "").trim();
}

/* =========================
   Role-aware view-state (single source of truth for “voice”)
========================= */

type ViewIdentity = { name: string; avatarUrl: string | null; href: string | null };

type ViewState = {
  role: ViewerRole;
  roleLabel: string;

  isPublic: boolean;
  isSignedIn: boolean;

  canViewAttachments: boolean;
  canPostDebate: boolean;
  canViewVoting: boolean;

  subject: ViewIdentity;
  contributor: ViewIdentity;

  contributorLinkAllowedForViewer: boolean;
};

function VotingSectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
      {children}
    </section>
  );
}

function CommunitySectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
      {children}
    </section>
  );
}

function makeViewState(args: {
  viewerRole: ViewerRole;
  record: any;

  subjectName: string;
  subjectProfileHref: string | null;

  contributorPublic: { name: string; avatarUrl: string | null; linkAllowed: boolean };
  contributorSelf: { name: string; avatarUrl: string | null };
  contributorProfileHref: string | null;

  contributorLinkAllowedForViewer: boolean;
}): ViewState {
  const {
    viewerRole,
    record,
    subjectName,
    subjectProfileHref,
    contributorPublic,
    contributorSelf,
    contributorProfileHref,
    contributorLinkAllowedForViewer,
  } = args;

  const isPublic = viewerRole === "public";
  const isSignedIn = !isPublic;

  const canViewAttachments =
    viewerRole === "contributor" ||
    viewerRole === "subject" ||
    viewerRole === "citizen" ||
    viewerRole === "voter";
  const canPostDebate =
    normalizeStatus(record?.status) === "debate" &&
    (viewerRole === "subject" || viewerRole === "contributor");
  const canViewVoting = !isPublic; // (VotingCourtroom still returns null for public)

  const contributorHref =
    contributorProfileHref && contributorLinkAllowedForViewer ? contributorProfileHref : null;

  const contributorIdentity =
    viewerRole === "contributor"
      ? { name: contributorSelf.name, avatarUrl: contributorSelf.avatarUrl, href: contributorHref }
      : {
          name: contributorPublic.name,
          avatarUrl: contributorPublic.avatarUrl,
          href: contributorPublic.linkAllowed ? contributorHref : null,
        };

  return {
    role: viewerRole,
    roleLabel: viewerLabel(viewerRole),

    isPublic,
    isSignedIn,

    canViewAttachments,
    canPostDebate,
    canViewVoting,

    subject: { name: subjectName || "Subject", avatarUrl: null, href: subjectProfileHref },
    contributor: contributorIdentity,

    contributorLinkAllowedForViewer,
  };
}

/* =========================
   UI: Lifecycle Chips
========================= */

function LifecycleChips({ stage, viewerRole }: { stage: number; viewerRole: ViewerRole }) {
  const current = Math.min(7, Math.max(1, stage || 1));
  const visibleStages = getVisibleStagesForViewer({ viewerRole, stage: current });

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current || !activeRef.current) return;

    const container = scrollRef.current;
    const active = activeRef.current;

    const containerWidth = container.clientWidth;
    const activeLeft = active.offsetLeft;
    const activeWidth = active.offsetWidth;

    const targetScrollLeft = Math.max(0, activeLeft - containerWidth / 2 + activeWidth / 2);

    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  }, [current, viewerRole]);

  return (
    <div
      ref={scrollRef}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 p-2 overflow-x-auto"
    >
      <div className="flex flex-nowrap items-stretch gap-2 min-w-max">
        {visibleStages.map((id, idx) => {
          const isActive = id === current;
          const isDone = id < current;

          return (
            <div
              key={id}
              ref={isActive ? activeRef : null}
              className="flex items-stretch min-w-0"
            >
              <div
                title={stageConfig[id]?.label ?? `Stage ${id}`}
                className={[
                  "min-w-[88px] sm:min-w-[96px] rounded-2xl border",
                  "px-2 py-2",
                  "text-center flex items-center justify-center",
                  "h-11",
                  isActive
                    ? "bg-black text-white border-black"
                    : isDone
                    ? "bg-white text-gray-700 border-gray-200"
                    : "bg-white text-gray-500 border-gray-200",
                ].join(" ")}
              >
                <div className="text-[10px] font-medium leading-tight line-clamp-2">
                  {stageConfig[id]?.label ?? `Stage ${id}`}
                </div>
              </div>

              {idx < visibleStages.length - 1 && (
                <div className="shrink-0 w-4 flex items-center justify-center text-gray-300 select-none">
                  <span className="text-xs">›</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   UI: Attachment Modal
========================= */

function AttachmentModal({
  open,
  onClose,
  title,
  subtitle,
  url,
  mime,
  path,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
  mime: string;
  path: string;
}) {
  if (!open) return null;

  const isImg = isProbablyImage(mime, path);
  const isPdf = isProbablyPdf(mime, path);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b bg-white">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 break-words whitespace-normal leading-tight">{title}</div>
            {subtitle ? <div className="text-xs text-gray-500 break-words whitespace-normal leading-tight">{subtitle}</div> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center rounded-full border bg-white h-9 w-9 hover:bg-gray-50 active:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>

        <div className="p-4 bg-gray-50">
          {isImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={title}
              className="w-full max-h-[72vh] object-contain rounded-xl border bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
              title={title}
              className="w-full rounded-xl border bg-white"
              style={{ height: "70vh" }}
            />
          ) : (
            <div className="rounded-xl border bg-white p-4 text-sm text-gray-700">
              Preview not supported for this file type yet.
              <div className="mt-2 text-xs text-gray-500 break-all">{url}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Attachments UI (cute squares)
========================= */

function AttachmentSection({
  title = "Attachments",
  attachments,
  getNumberForPath,
}: {
  title?: string;
  attachments: AttachmentRow[];
  getNumberForPath: (path: string) => number | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const active = useMemo(() => {
    if (!openId) return null;
    const idx = attachments.findIndex((a) => a.id === openId);
    if (idx < 0) return null;
    const a = attachments[idx];
    const url = a?.path ? getPublicAttachmentUrl(a.path) : "";
    const n = getNumberForPath(a.path) ?? idx + 1;
    return { ...a, url, title: `Attachment #${n}`, subtitle: a.label || "" };
  }, [openId, attachments, getNumberForPath]);

  if (!attachments?.length) return null;

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{attachments.length} file(s)</div>
      </div>

      <div className="mt-3 space-y-2">
        {attachments.map((a, idx) => {
          const Icon = fileTypeIcon(a.mime_type || "", a.path || "");
          const n = getNumberForPath(a.path) ?? idx + 1;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpenId(a.id)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 active:bg-gray-100"
              title={a.label || `Attachment #${n}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                <Icon className="h-4 w-4 text-gray-700" />
              </span>
              <span className="text-sm font-semibold text-gray-900">{`Attachment #${n}`}</span>
            </button>
          );
        })}
      </div>

      <AttachmentModal
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.title ?? ""}
        subtitle={active?.subtitle ?? ""}
        url={active?.url ?? ""}
        mime={(active?.mime_type ?? "") as string}
        path={active?.path ?? ""}
      />
    </div>
  );
}

/* =========================
   Debate Thread: Statements + Replies (simple nested thread)
========================= */

type DebateMsgRow = {
  id: string;
  record_id: string;
  author_user_id: string;
  author_role: "subject" | "contributor";
  body: string;
  created_at: string;
  parent_message_id: string | null;
};

type DebateMsgNode = DebateMsgRow & {
  attachments: DebateAttachmentRow[];
  replies: DebateMsgNode[];
};

type CommunityStatementRow = {
  id: number;
  record_id: string;
  author_user_id: string;
  author_alias: string;
  author_role: "citizen" | "voter" | "subject" | "contributor";
  body: string;
  created_at: string;
};

type CommunityReplyRow = {
  id: number;
  record_id: string;
  statement_id: number;
  author_user_id: string;
  author_alias: string;
  body: string;
  created_at: string;
  parent_reply_id: number | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

type CommunityReplyNode = CommunityReplyRow & {
  replies: CommunityReplyNode[];
};

type VoteRow = {
  id: string; // ✅ treat bigint IDs as string
  record_id: string;
  user_id: string;
  choice: "keep" | "delete";
  explanation: string;
  created_at: string;
  author_alias: string | null;
};

type VoteReplyRow = {
  id: string;       // ✅ string
  record_id: string;
  vote_id: string;  // ✅ string
  author_user_id: string;
  author_alias: string;
  body: string;
  created_at: string;
  parent_reply_id: string | null; // ✅ string
  edited_at?: string | null;
  deleted_at?: string | null;
};

type VoteReplyNode = VoteReplyRow & {
  replies: VoteReplyNode[];
};

type VotingMsgRow = {
  id: string;
  record_id: string;
  author_user_id: string;
  author_alias: string | null;
  body: string;
  created_at: string;
  parent_message_id: string | null;
};

type VotingMsgNode = VotingMsgRow & {
  replies: VotingMsgNode[];
};

function UserBadgePills({ userId, participantBadges }: { userId: string; participantBadges: Record<string, { label: string; icon: string }[]> }) {
  const badges = participantBadges[userId] ?? [];
  if (!badges.length) return null;
  return (
    <>
      {badges.map(b => (
        <span key={b.label} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[10px] text-gray-600 font-medium">
          {b.icon} {b.label}
        </span>
      ))}
    </>
  );
}

function buildTree(rows: DebateMsgRow[], attByMsg: Record<string, DebateAttachmentRow[]>) {
  const byId = new Map<string, DebateMsgNode>();
  for (const r of rows) {
    byId.set(r.id, { ...r, attachments: attByMsg[r.id] || [], replies: [] });
  }

  const roots: DebateMsgNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_message_id && byId.has(r.parent_message_id)) {
      byId.get(r.parent_message_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (n: DebateMsgNode) => {
    n.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    n.replies.forEach(sortRecursive);
  };

  roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  roots.forEach(sortRecursive);

  return roots;
}

function buildVotingTree(rows: VotingMsgRow[]) {
  const byId = new Map<string, VotingMsgNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, replies: [] }));

  const roots: VotingMsgNode[] = [];

  rows.forEach((r) => {
    const node = byId.get(r.id)!;
    if (r.parent_message_id && byId.has(r.parent_message_id)) {
      byId.get(r.parent_message_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/* =========================
   ✅ Extracted Debate UI components (stable)
========================= */

function RoleBorder(role: "subject" | "contributor") {
  return "border-gray-200";
}
function RoleBar(role: "subject" | "contributor") {
  return role === "subject" ? "bg-gray-300" : "bg-gray-400";
}

function AvatarCircle({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="h-9 w-9 rounded-full overflow-hidden border bg-white flex items-center justify-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={`${name} avatar`} className="w-full h-full object-cover" />
      ) : (
        <User className="h-4 w-4 text-gray-700" />
      )}
    </div>
  );
}

function NameAndAvatar({
  role,
  getAuthorPresentation,
}: {
  role: "subject" | "contributor";
  getAuthorPresentation: (role: "subject" | "contributor") => {
    name: string;
    avatarUrl: string | null;
    href: string | null;
  };
}) {
  const p = getAuthorPresentation(role);
  const content = (
    <div className="flex items-center gap-3 min-w-0">
      <AvatarCircle name={p.name} avatarUrl={p.avatarUrl} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 break-words leading-tight whitespace-normal">
          {p.name}
        </div>
      </div>
    </div>
  );

  if (p.href) {
    return (
      <Link href={p.href} className="hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}

function EvidenceChips({
  attachments,
  getNumberForPath,
  onOpenPreview,
}: {
  attachments: DebateAttachmentRow[];
  getNumberForPath: (path: string) => number | null;
  onOpenPreview: (args: {
    title: string;
    subtitle?: string;
    url: string;
    mime: string;
    path: string;
  }) => void;
}) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-3">
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((a) => {
          const n = getNumberForPath(a.path) ?? 0;
          const displayLabel = n ? `Attachment #${n}` : "Attachment";
          const Icon = fileTypeIcon(a.mime_type || "", a.path || "");
          const url = a?.path ? getPublicAttachmentUrl(a.path) : "";

          return (
            <button
              key={a.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPreview({
                  title: displayLabel,
                  subtitle: a.label || "",
                  url,
                  mime: a.mime_type || "",
                  path: a.path || "",
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border bg-white px-2.5 py-2 hover:bg-gray-50 active:bg-gray-100"
              title={a.label || displayLabel}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                <Icon className="h-4 w-4 text-gray-700" />
              </span>
              <span className="text-sm font-semibold text-gray-900">{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReplyBubble({
  node,
  canPost,
  sessionUserId,
  replyOpenFor,
  setReplyOpenFor,
  replyBody,
  setReplyBody,
  replyFiles,
  setReplyFiles,
  posting,
  createMessage,
  removeSelectedFile,
  getAuthorPresentation,
  replyingToLabel,
  getNumberForPath,
  onOpenPreview,
  stop,
  stopAll,
}: {
  node: DebateMsgNode;

  canPost: boolean;
  sessionUserId: string | null;

  replyOpenFor: string | null;
  setReplyOpenFor: (v: string | null) => void;

  replyBody: string;
  setReplyBody: (v: string) => void;

  replyFiles: File[];
  setReplyFiles: React.Dispatch<React.SetStateAction<File[]>>;

  posting: boolean;

  createMessage: (opts: {
    text: string;
    parentMessageId: string | null;
    files: File[];
    after: () => void;
    expandParentIfNeeded?: string | null;
  }) => void;

  removeSelectedFile: (i: number, which: "statement" | "reply") => void;

  getAuthorPresentation: (role: "subject" | "contributor") => {
    name: string;
    avatarUrl: string | null;
    href: string | null;
  };
  replyingToLabel: (targetAuthorRole: "subject" | "contributor") => string;

  getNumberForPath: (path: string) => number | null;
  onOpenPreview: (args: {
    title: string;
    subtitle?: string;
    url: string;
    mime: string;
    path: string;
  }) => void;

  stop: (e: any) => void;
  stopAll: (e: any) => void;
}) {
  const author = getAuthorPresentation(node.author_role);
  const [expandedReplies, setExpandedReplies] = useState(false);

  return (
    <div className="py-3">
      <div className="flex gap-3">
        <div className="shrink-0">
          {author.href ? (
            <Link href={author.href} className="hover:opacity-90" onClick={(e) => e.stopPropagation()}>
              <AvatarCircle name={author.name} avatarUrl={author.avatarUrl} />
            </Link>
          ) : (
            <AvatarCircle name={author.name} avatarUrl={author.avatarUrl} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            {author.href ? (
              <Link
                href={author.href}
                className="text-sm font-semibold text-gray-900 hover:underline break-words whitespace-normal leading-tight"
                onClick={(e) => e.stopPropagation()}
              >
                {author.name}
              </Link>
            ) : (
              <div className="text-sm font-semibold text-gray-900 break-words whitespace-normal leading-tight">
                {author.name}
              </div>
            )}
            <span className="text-[11px] text-gray-500">{formatTimestampNoSeconds(node.created_at)}</span>
          </div>

          <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{node.body}</div>

          <EvidenceChips attachments={node.attachments} getNumberForPath={getNumberForPath} onOpenPreview={onOpenPreview} />

          <div className="mt-2">
            <AgreeDisagree
                targetType="record_debate_messages"
                targetId={String(node.id)}
                disabled={!sessionUserId}  // or viewerRole === "public"
                size={26}
            />
          </div>

          {canPost ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyOpenFor(node.id);
                }}
                className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <MessageSquare className="h-4 w-4" />
                Reply
              </button>
            </div>
          ) : null}

          {canPost && replyOpenFor === node.id ? (
            <div className="mt-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-gray-900">
                    Replying to <span className="underline">{replyingToLabel(node.author_role)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyOpenFor(null);
                      setReplyBody("");
                      setReplyFiles([]);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white hover:bg-gray-100 active:bg-gray-200"
                    aria-label="Close reply"
                    title="Close"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>
                </div>

                <MentionTextarea
                  value={replyBody}
                  onChange={setReplyBody}
                  recordId={node.record_id}
                  rows={3}
                  placeholder="Write a reply…"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
                  onClick={stop}
                  onMouseDown={stop}
                  onKeyDown={stop}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <label
                    className="inline-flex items-center gap-2 text-xs font-semibold text-gray-900 cursor-pointer"
                    onClick={stop}
                    onMouseDown={stop}
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        e.stopPropagation();
                        const list = Array.from(e.target.files ?? []);
                        if (!list.length) return;
                        setReplyFiles((prev) => [...prev, ...list]);
                        e.currentTarget.value = "";
                      }}
                      onClick={stop}
                      onMouseDown={stop}
                    />
                  </label>

                  <div className="text-[11px] text-gray-500">{replyBody.trim().length}/4000</div>
                </div>

                {replyFiles.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {replyFiles.map((f, i) => {
                      const Icon = fileTypeIcon(f.type || "", f.name);
                      return (
                        <div key={`${f.name}-${i}`} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                            <Icon className="h-4 w-4 text-gray-700" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-900 max-w-[220px] break-words whitespace-normal leading-tight">{f.name}</div>
                            <div className="text-[11px] text-gray-500">
                              {(f.type || "file")} • {Math.round((f.size / 1024) * 10) / 10} KB
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelectedFile(i, "reply");
                            }}
                            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-gray-100 active:bg-gray-200"
                            title="Remove"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-[11px] text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyFiles([]);
                    }}
                    disabled={!replyFiles.length}
                  >
                    Clear files
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      createMessage({
                        text: replyBody,
                        parentMessageId: node.id,
                        files: replyFiles,
                        expandParentIfNeeded: node.parent_message_id ? null : node.id,
                        after: () => {
                          setReplyBody("");
                          setReplyFiles([]);
                          setReplyOpenFor(null);
                        },
                      });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={posting || replyBody.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {posting ? "Posting…" : "Reply"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {node.replies?.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedReplies(!expandedReplies);
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                {expandedReplies ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {node.replies.length} repl{node.replies.length === 1 ? "y" : "ies"}
              </button>

              {expandedReplies && (
                <div className="mt-3 space-y-3 pl-3 sm:pl-5 border-l border-gray-200">
                  {node.replies.map((r) => (
                    <ReplyBubble
                      key={r.id}
                      node={r}
                      canPost={canPost}
                      sessionUserId={sessionUserId}
                      replyOpenFor={replyOpenFor}
                      setReplyOpenFor={setReplyOpenFor}
                      replyBody={replyBody}
                      setReplyBody={setReplyBody}
                      replyFiles={replyFiles}
                      setReplyFiles={setReplyFiles}
                      posting={posting}
                      createMessage={createMessage}
                      removeSelectedFile={removeSelectedFile}
                      getAuthorPresentation={getAuthorPresentation}
                      replyingToLabel={replyingToLabel}
                      getNumberForPath={getNumberForPath}
                      onOpenPreview={onOpenPreview}
                      stop={stop}
                      stopAll={stopAll}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatementCard({
  node,
  canPost,
  sessionUserId,
  replyOpenFor,
  setReplyOpenFor,
  replyBody,
  setReplyBody,
  replyFiles,
  setReplyFiles,
  posting,
  createMessage,
  removeSelectedFile,
  getAuthorPresentation,
  replyingToLabel,
  getNumberForPath,
  onOpenPreview,
  expanded,
  setExpanded,
  participantBadges,
  stop,
  stopAll,
}: {
  node: DebateMsgNode;

  canPost: boolean;
  sessionUserId: string | null;

  replyOpenFor: string | null;
  setReplyOpenFor: (v: string | null) => void;

  replyBody: string;
  setReplyBody: (v: string) => void;

  replyFiles: File[];
  setReplyFiles: React.Dispatch<React.SetStateAction<File[]>>;

  posting: boolean;

  createMessage: (opts: {
    text: string;
    parentMessageId: string | null;
    files: File[];
    after: () => void;
    expandParentIfNeeded?: string | null;
  }) => void;

  removeSelectedFile: (i: number, which: "statement" | "reply") => void;

  getAuthorPresentation: (role: "subject" | "contributor") => {
    name: string;
    avatarUrl: string | null;
    href: string | null;
  };
  replyingToLabel: (targetAuthorRole: "subject" | "contributor") => string;

  getNumberForPath: (path: string) => number | null;
  onOpenPreview: (args: {
    title: string;
    subtitle?: string;
    url: string;
    mime: string;
    path: string;
  }) => void;

  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  participantBadges: Record<string, { label: string; icon: string }[]>;

  stop: (e: any) => void;
  stopAll: (e: any) => void;
}) {
  return (
    <div className={["relative overflow-hidden border-b bg-white", RoleBorder(node.author_role)].join(" ")}>
      <div className={["absolute left-0 top-0 bottom-0 w-1.5", RoleBar(node.author_role)].join(" ")} />

      <div className="px-4 py-4 pl-5 sm:px-5 sm:py-5 sm:pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="min-w-0">
              <NameAndAvatar role={node.author_role} getAuthorPresentation={getAuthorPresentation} />
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <UserBadgePills userId={node.author_user_id} participantBadges={participantBadges} />
              </div>
              <div className="mt-1 text-[11px] text-gray-500">{formatTimestampNoSeconds(node.created_at)}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{node.body}</div>

        <EvidenceChips attachments={node.attachments} getNumberForPath={getNumberForPath} onOpenPreview={onOpenPreview} />

        <div className="mt-2">
            <AgreeDisagree
                targetType="record_debate_messages"
                targetId={String(node.id)}
                disabled={!sessionUserId}
            />
        </div>

        {canPost ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReplyOpenFor(node.id);
                setExpanded((p) => ({ ...p, [node.id]: true }));
              }}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              <MessageSquare className="h-4 w-4" />
              Reply
            </button>
          </div>
        ) : null}

        {canPost && replyOpenFor === node.id ? (
          <div className="mt-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-gray-900">
                  Replying to <span className="underline">{replyingToLabel(node.author_role)}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyOpenFor(null);
                    setReplyBody("");
                    setReplyFiles([]);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white hover:bg-gray-100 active:bg-gray-200"
                  aria-label="Close reply"
                  title="Close"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </div>

              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
                placeholder="Write a reply…"
                onClick={stop}
                onMouseDown={stop}
                onKeyDown={stop}
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <label
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-900 cursor-pointer"
                  onClick={stop}
                  onMouseDown={stop}
                >
                  <Paperclip className="h-4 w-4" />
                  Attach
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      e.stopPropagation();
                      const list = Array.from(e.target.files ?? []);
                      if (!list.length) return;
                      setReplyFiles((prev) => [...prev, ...list]);
                      e.currentTarget.value = "";
                    }}
                    onClick={stop}
                    onMouseDown={stop}
                  />
                </label>

                <div className="text-[11px] text-gray-500">{replyBody.trim().length}/4000</div>
              </div>

              {replyFiles.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {replyFiles.map((f, i) => {
                    const Icon = fileTypeIcon(f.type || "", f.name);
                    return (
                      <div key={`${f.name}-${i}`} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                          <Icon className="h-4 w-4 text-gray-700" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 max-w-[220px] break-words whitespace-normal leading-tight">{f.name}</div>
                          <div className="text-[11px] text-gray-500">
                            {(f.type || "file")} • {Math.round((f.size / 1024) * 10) / 10} KB
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile(i, "reply");
                          }}
                          className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-gray-100 active:bg-gray-200"
                          title="Remove"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-[11px] text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyFiles([]);
                  }}
                  disabled={!replyFiles.length}
                >
                  Clear files
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    createMessage({
                      text: replyBody,
                      parentMessageId: node.id,
                      files: replyFiles,
                      expandParentIfNeeded: node.id,
                      after: () => {
                        setReplyBody("");
                        setReplyFiles([]);
                        setReplyOpenFor(null);
                      },
                    });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={posting || replyBody.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {posting ? "Posting…" : "Reply"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((p) => ({ ...p, [node.id]: !p[node.id] }));
              }}
              className="inline-flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
            >
              {expanded[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {node.replies?.length ? `${node.replies.length} repl${node.replies.length === 1 ? "y" : "ies"}` : "No replies"}
            </button>
          </div>

          {expanded[node.id] && node.replies?.length > 0 && (
            <div className="mt-3 space-y-3 pl-3 sm:pl-5 border-l border-gray-200">
              {node.replies.map((r) => (
                <ReplyBubble
                  key={r.id}
                  node={r}
                  canPost={canPost}
                  sessionUserId={sessionUserId}
                  replyOpenFor={replyOpenFor}
                  setReplyOpenFor={setReplyOpenFor}
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  replyFiles={replyFiles}
                  setReplyFiles={setReplyFiles}
                  posting={posting}
                  createMessage={createMessage}
                  removeSelectedFile={removeSelectedFile}
                  getAuthorPresentation={getAuthorPresentation}
                  replyingToLabel={replyingToLabel}
                  getNumberForPath={getNumberForPath}
                  onOpenPreview={onOpenPreview}
                  stop={stop}
                  stopAll={stopAll}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (d > 0) return `${d}d ${hh}h ${mm}m ${ss}s`;
  return `${hh}:${mm}:${ss}`;
}

function DebateTimerChip({ debateEndsAt, serverOffsetMs }: { debateEndsAt: string; serverOffsetMs: number }) {
  const [label, setLabel] = useState("—");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const endMs = new Date(debateEndsAt).getTime();
    if (Number.isNaN(endMs)) {
      setLabel("—");
      setEnded(false);
      return;
    }

    const tick = () => {
      const nowMs = Date.now() + (serverOffsetMs || 0);
      const remaining = endMs - nowMs;

      if (remaining <= 0) {
        setEnded(true);
        setLabel("Debate ended");
        return;
      }

      setEnded(false);
      setLabel(formatRemaining(remaining));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [debateEndsAt, serverOffsetMs]);

  return (
    <div className={["inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold shadow-none", "text-gray-700"].join(" ")}>
      <span className={["h-2 w-2 rounded-full", ended ? "bg-gray-400" : "bg-green-500"].join(" ")} />
      {ended ? (
        <span>{label}</span>
      ) : (
        <>
          Debate ends in: <span className="font-mono">{label}</span>
        </>
      )}
    </div>
  );
}

function getEffectiveStage(record: any, serverOffsetMs: number): number {
  const now = Date.now() + (serverOffsetMs || 0);

  const debateStart = record?.debate_started_at ? new Date(record.debate_started_at).getTime() : null;
  const debateEnd = record?.debate_ends_at ? new Date(record.debate_ends_at).getTime() : null;

  const votingStart = record?.voting_started_at ? new Date(record.voting_started_at).getTime() : null;
  const votingEnd = record?.voting_ends_at ? new Date(record.voting_ends_at).getTime() : null;

  // If decision has started, we’re stage 7 no matter what
  if (record?.decision_started_at) return 7;

  // Voting window takes precedence
  if (votingStart && votingEnd && now >= votingStart && now < votingEnd) return 6;

  // After voting ends, treat as decision stage (UI-wise) even if DB status lags
  if (votingEnd && now >= votingEnd) return 7;

  // Debate window
  if (debateStart && debateEnd && now >= debateStart && now < debateEnd) return 5;

  // If debate ended but voting not started yet, keep it stage 5 (read-only debate / waiting)
  if (debateEnd && now >= debateEnd && (!votingStart || now < votingStart)) return 5;

  // Otherwise fall back to your existing status-based stage
  return getRecordStage(record);
}

function VotingTimerChip({ votingEndsAt, serverOffsetMs }: { votingEndsAt: string; serverOffsetMs: number }) {
  const [label, setLabel] = useState("—");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const endMs = new Date(votingEndsAt).getTime();
    if (Number.isNaN(endMs)) {
      setLabel("—");
      setEnded(false);
      return;
    }

    const tick = () => {
      const nowMs = Date.now() + (serverOffsetMs || 0);
      const remaining = endMs - nowMs;

      if (remaining <= 0) {
        setEnded(true);
        setLabel("Voting ended");
        return;
      }

      setEnded(false);
      setLabel(formatRemaining(remaining));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [votingEndsAt, serverOffsetMs]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-none">
      <span className={["h-2 w-2 rounded-full", ended ? "bg-gray-400" : "bg-blue-500"].join(" ")} />
      {ended ? (
        <span>{label}</span>
      ) : (
        <>
          Voting ends in: <span className="font-mono">{label}</span>
        </>
      )}
    </div>
  );
}

function TallyChip({ keepCount, deleteCount, totalCount }: { keepCount: number; deleteCount: number; totalCount: number }) {
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-none">
      <span className="whitespace-nowrap">
        <span className="font-semibold">Keep:</span> {keepCount}
      </span>
      <span className="text-gray-300 hidden sm:inline">•</span>
      <span className="whitespace-nowrap">
        <span className="font-semibold">Delete:</span> {deleteCount}
      </span>
      <span className="text-gray-300 hidden sm:inline">•</span>
      <span className="whitespace-nowrap">
        <span className="font-semibold">Total:</span> {totalCount}
      </span>
    </div>
  );
}

/* =========================
   DebateCourtroom
========================= */

function DebateCourtroom({
  record,
  viewerRole,
  serverOffsetMs,
  isImpersonating,
  actingAuthUserId,
  subjectName,
  subjectProfileHref,
  contributorPublic,
  contributorSelf,
  contributorProfileHref,
  getNumberForPath,
  onDebateAttachmentsFlat,
  participantBadges,
}: {
    record: any;
    viewerRole: ViewerRole;
    serverOffsetMs: number;
  
    subjectName: string;
    subjectProfileHref: string | null;
  
    isImpersonating: boolean;
    actingAuthUserId: string | null;
  
    contributorPublic: { name: string; avatarUrl: string | null; linkAllowed: boolean };
    contributorSelf: { name: string; avatarUrl: string | null };
    contributorProfileHref: string | null;
  
    getNumberForPath: (path: string) => number | null;
    onDebateAttachmentsFlat: (rows: DebateAttachmentRow[]) => void;
    participantBadges: Record<string, { label: string; icon: string }[]>;

}) {
  const stage = getEffectiveStage(record, serverOffsetMs);
  const shouldRender = stage >= 5;

  const nowMs = Date.now() + (serverOffsetMs || 0);
  const debateStartMs = record?.debate_started_at ? new Date(record.debate_started_at).getTime() : null;
  const debateEndMs = record?.debate_ends_at ? new Date(record.debate_ends_at).getTime() : null;
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  

  const isCurrentlyDebating =
    !!debateStartMs && !!debateEndMs && nowMs >= debateStartMs && nowMs < debateEndMs;

    const canPost =
    isCurrentlyDebating && (viewerRole === "subject" || viewerRole === "contributor");

  // ✅ the signed-in author's role for DB writes
  const authorRole: "subject" | "contributor" | null =
    viewerRole === "subject" ? "subject" : viewerRole === "contributor" ? "contributor" : null;

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [tree, setTree] = useState<DebateMsgNode[]>([]);

  const [statementBody, setStatementBody] = useState("");
  const [statementFiles, setStatementFiles] = useState<File[]>([]);

  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [openPreview, setOpenPreview] = useState<{
    title: string;
    subtitle?: string;
    url: string;
    mime: string;
    path: string;
  } | null>(null);

  const maxChars = 4000;

  const stop = (e: any) => e.stopPropagation();
  const stopAll = (e: any) => {
    e.stopPropagation();
  };

  function removeSelectedFile(i: number, which: "statement" | "reply") {
    if (which === "statement") setStatementFiles((prev) => prev.filter((_, idx) => idx !== i));
    else setReplyFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function getAuthorPresentation(role: "subject" | "contributor") {
    if (role === "subject") {
      return { name: subjectName || "Subject", avatarUrl: null as string | null, href: subjectProfileHref };
    }

    if (viewerRole === "contributor") {
      return { name: contributorSelf.name, avatarUrl: contributorSelf.avatarUrl, href: contributorProfileHref };
    }

    return {
      name: contributorPublic.name,
      avatarUrl: contributorPublic.avatarUrl,
      href: contributorPublic.linkAllowed ? contributorProfileHref : null,
    };
  }

  function replyingToLabel(targetAuthorRole: "subject" | "contributor") {
    if (!authorRole) return getAuthorPresentation(targetAuthorRole).name;
    if (targetAuthorRole === authorRole) return "yourself";
    return getAuthorPresentation(targetAuthorRole).name;
  }

  async function load() {
    setLoading(true);

    const { data: msgs, error } = await supabase
      .from("record_debate_messages")
      .select("id, record_id, author_role, body, created_at, parent_message_id")
      .eq("record_id", record.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("load debate messages error:", error.message);
      setTree([]);
      onDebateAttachmentsFlat([]);
      setLoading(false);
      return;
    }

    const rows = (msgs as DebateMsgRow[]) || [];
    if (!rows.length) {
      setTree([]);
      onDebateAttachmentsFlat([]);
      setLoading(false);
      return;
    }

    const messageIds = rows.map((m) => m.id);

    const { data: attachments, error: aErr } = await supabase
      .from("record_debate_attachments")
      .select("id, message_id, path, mime_type, size_bytes, label, created_at")
      .in("message_id", messageIds);

    if (aErr) console.warn("load debate attachments error:", aErr.message);

    const flat: DebateAttachmentRow[] = (attachments || []).map((a: any) => ({
      id: a.id,
      message_id: a.message_id,
      path: a.path,
      mime_type: a.mime_type ?? null,
      size_bytes: a.size_bytes ?? null,
      label: a.label ?? null,
      created_at: a.created_at ?? null,
    }));

    onDebateAttachmentsFlat(flat);

    const grouped: Record<string, DebateAttachmentRow[]> = {};
    flat.forEach((a) => {
      if (!grouped[a.message_id]) grouped[a.message_id] = [];
      grouped[a.message_id].push(a);
    });

    Object.values(grouped).forEach((arr) =>
      arr.sort((x, y) => new Date(x.created_at || 0).getTime() - new Date(y.created_at || 0).getTime())
    );

    const built = buildTree(rows, grouped);

    const nextExpanded: Record<string, boolean> = { ...expanded };
    built.forEach((root) => {
      if (nextExpanded[root.id] === undefined) nextExpanded[root.id] = false;
    });
    setExpanded(nextExpanded);

    setTree(built);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  async function uploadDebateAttachments(opts: {
    recordId: string;
    messageId: string;
    files: File[];
    authorRole: "subject" | "contributor";
    uploaderUserId: string;
  }) {
    const { recordId, messageId, files, authorRole, uploaderUserId } = opts;
    if (!files.length) return;

    for (const f of files) {
      const safeName = f.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `records/${recordId}/debate/${messageId}/${authorRole}/${Date.now()}-${safeName}`;

      const up = await supabase.storage.from("attachments").upload(path, f, {
        upsert: false,
        contentType: f.type || undefined,
      });
      if (up.error) throw up.error;

      const { error } = await supabase.from("record_debate_attachments").insert({
        record_id: recordId,
        message_id: messageId,
        uploader_user_id: uploaderUserId,
        path,
        mime_type: f.type || null,
        size_bytes: f.size ?? null,
        label: f.name,
      });

      if (error) throw error;
    }
  }

  async function createMessage(opts: {
    text: string;
    parentMessageId: string | null;
    files: File[];
    after: () => void;
    expandParentIfNeeded?: string | null;
  }) {
    if (!canPost || !authorRole) return;

    const text = opts.text.trim();
    if (!text) return;

    if (text.length > maxChars) {
      alert(`Max ${maxChars} characters.`);
      return;
    }

    setPosting(true);
    try {
      const real = (await supabase.auth.getUser()).data.user;
      if (!real?.id) throw new Error("Not signed in.");
        
      const actorId =
          isImpersonating && actingAuthUserId
            ? actingAuthUserId
            : real.id;

      const { data: msg, error: msgErr } = await supabase
        .from("record_debate_messages")
        .insert({
          record_id: record.id,
          author_user_id: actorId,
          author_role: authorRole,
          body: text,
          parent_message_id: opts.parentMessageId,
        })
        .select("id")
        .maybeSingle();

      if (msgErr) throw msgErr;
      if (!msg?.id) throw new Error("Message insert failed.");

      if (opts.files.length) {
        await uploadDebateAttachments({
          recordId: record.id,
          messageId: msg.id,
          files: opts.files,
          authorRole,
          uploaderUserId: actorId,
        });
      }

      if (opts.expandParentIfNeeded) {
        setExpanded((prev) => ({ ...prev, [opts.expandParentIfNeeded as string]: true }));
      }

      if (text.includes("@")) {
        await notifyMentions(record.id, text, actorId, authorRole === "subject" ? subjectName : contributorSelf.name);
      }
      opts.after();
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to post.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Debate Section</div>
          <div className="text-[11px] text-gray-500">Anything cannot be modified once posted.</div>
        </div>

        {viewerRole !== "public" && record?.debate_ends_at ? (
          <DebateTimerChip debateEndsAt={record.debate_ends_at as string} serverOffsetMs={serverOffsetMs} />
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-600">Loading debate…</div>
        ) : tree.length === 0 ? (
          <div className="text-sm text-gray-600">No statements yet. {canPost ? "Post the first statement below." : ""}</div>
        ) : (
          <div className="space-y-4">
            {tree.map((root) => (
              <StatementCard
                key={root.id}
                node={root}
                canPost={canPost}
                sessionUserId={sessionUserId}
                replyOpenFor={replyOpenFor}
                setReplyOpenFor={setReplyOpenFor}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                replyFiles={replyFiles}
                setReplyFiles={setReplyFiles}
                posting={posting}
                createMessage={createMessage}
                removeSelectedFile={removeSelectedFile}
                getAuthorPresentation={getAuthorPresentation}
                replyingToLabel={replyingToLabel}
                getNumberForPath={getNumberForPath}
                onOpenPreview={(args) => setOpenPreview(args)}
                expanded={expanded}
                setExpanded={setExpanded}
                participantBadges={participantBadges}
                stop={stop}
                stopAll={stopAll}
              />
            ))}
          </div>
        )}
      </div>

      {!canPost ? (
        <div className="mt-3 text-xs text-gray-500">
          {debateNoPostMessage({ viewerRole, status: record?.status, stage })}
        </div>
      ) : (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-900">New statement</div>
              <div className="text-[11px] text-gray-500">This will be permanent once posted.</div>
            </div>
            <div className="text-[11px] text-gray-500 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">No edits</div>
          </div>

          <MentionTextarea
            value={statementBody}
            onChange={setStatementBody}
            recordId={record.id}
            rows={5}
            placeholder="Make your point clearly. Others will reply inside the thread."
            className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
            onClick={stop}
            onMouseDown={stop}
            onKeyDown={stop}
          />

          <div className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-900 cursor-pointer" onClick={stop} onMouseDown={stop}>
                <Paperclip className="h-4 w-4" />
                Attach
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    e.stopPropagation();
                    const list = Array.from(e.target.files ?? []);
                    if (!list.length) return;
                    setStatementFiles((prev) => [...prev, ...list]);
                    e.currentTarget.value = "";
                  }}
                  onClick={stop}
                  onMouseDown={stop}
                />
              </label>

              <div className="text-[11px] text-gray-500">{statementBody.trim().length}/4000</div>
            </div>

            {statementFiles.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {statementFiles.map((f, i) => {
                  const Icon = fileTypeIcon(f.type || "", f.name);
                  return (
                    <div key={`${f.name}-${i}`} className="inline-flex items-center gap-2 rounded-2xl border bg-gray-50 px-3 py-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white">
                        <Icon className="h-4 w-4 text-gray-700" />
                      </span>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 max-w-[220px] break-words whitespace-normal leading-tight">{f.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {(f.type || "file")} • {Math.round((f.size / 1024) * 10) / 10} KB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSelectedFile(i, "statement")}
                        className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-gray-100 active:bg-gray-200"
                        title="Remove"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {statementFiles.length > 0 ? (
              <button
                type="button"
                className="mt-2 text-[11px] text-gray-500 hover:text-gray-700 underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatementFiles([]);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                Clear files
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-[11px] text-gray-500">
              By posting, you confirm this statement is accurate to the best of your knowledge.
            </div>

            <button
              type="button"
              onClick={() =>
                createMessage({
                  text: statementBody,
                  parentMessageId: null,
                  files: statementFiles,
                  after: () => {
                    setStatementBody("");
                    setStatementFiles([]);
                  },
                })
              }
              onMouseDown={(e) => e.stopPropagation()}
              disabled={posting || statementBody.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {posting ? "Posting…" : "Submit Statement"}
            </button>
          </div>
        </div>
      )}

      <AttachmentModal
        open={!!openPreview}
        onClose={() => setOpenPreview(null)}
        title={openPreview?.title ?? ""}
        subtitle={openPreview?.subtitle ?? ""}
        url={openPreview?.url ?? ""}
        mime={openPreview?.mime ?? ""}
        path={openPreview?.path ?? ""}
      />
    </section>
  );
}

function buildVoteReplyTree(rows: VoteReplyRow[]) {
  const byId = new Map<string, VoteReplyNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, replies: [] }));

  const roots: VoteReplyNode[] = [];
  rows.forEach((r) => {
    const node = byId.get(r.id)!;
    if (r.parent_reply_id && byId.has(r.parent_reply_id)) {
      byId.get(r.parent_reply_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (n: VoteReplyNode) => {
    n.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    n.replies.forEach(sortRec);
  };
  roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  roots.forEach(sortRec);

  return roots;
}

function buildCommunityReplyTree(rows: CommunityReplyRow[]) {
  const byId = new Map<number, CommunityReplyNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, replies: [] }));

  const roots: CommunityReplyNode[] = [];
  rows.forEach((r) => {
    const node = byId.get(r.id)!;
    if (r.parent_reply_id && byId.has(r.parent_reply_id)) {
      byId.get(r.parent_reply_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (n: CommunityReplyNode) => {
    n.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    n.replies.forEach(sortRec);
  };

  roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  roots.forEach(sortRec);

  return roots;
}

function VoteReplyNodeComponent({
  node,
  voteId,
  canReplyToVotes,
  canReactToVotes,
  setReplyingTo,
  sessionUserId,
  onEdit,
  onDelete,
  categoryByUser,
  onReport,
  locked,
}: {
  node: VoteReplyNode;
  voteId: string;
  canReplyToVotes: boolean;
  canReactToVotes: boolean;
  setReplyingTo: (v: { voteId: string; parentReplyId: string | null }) => void;
  sessionUserId: string | null;
  onEdit: (replyId: string, newBody: string) => void;
  onDelete: (replyId: string) => void;
  categoryByUser: Record<string, string>;
  onReport: (target: "record" | "contributor" | "subject" | "comment", id: string, label: string) => void;
  locked: ViewerRole;
}) {
  const isDeleted = !!node.deleted_at;
  const isEdited = !!node.edited_at;

  const canModify =
    canReplyToVotes &&
    !!sessionUserId &&
    node.author_user_id === sessionUserId &&
    !isDeleted;

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(node.body);

  useEffect(() => {
    setEditDraft(node.body);
  }, [node.body]);

  return (
    <div>
      <div className="text-xs font-semibold text-gray-900">
        {node.author_alias}
        {categoryByUser[node.author_user_id] && (
          <span className="ml-1 font-normal text-gray-400">({categoryByUser[node.author_user_id]})</span>
        )}
      </div>

      <div className="text-[11px] text-gray-500">
        {formatTimestampNoSeconds(node.created_at)}
        {isEdited && !isDeleted ? ` • Edited ${formatTimestampNoSeconds(node.edited_at as string)}` : ""}
        {isDeleted ? ` • Deleted ${formatTimestampNoSeconds(node.deleted_at as string)}` : ""}
      </div>

      <div className="mt-1 text-sm whitespace-pre-wrap">
        {isDeleted ? (
          <span className="italic text-gray-500">This reply was deleted.</span>
        ) : isEditing ? (
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
          />
        ) : (
          node.body
        )}
      </div>

      <div className="mt-2">
        <AgreeDisagree
            targetType="record_vote_replies"
            targetId={String(node.id)}
            disabled={!sessionUserId || !canReactToVotes}
            size={26}
        />
      </div>

      <div className="mt-2 flex items-center gap-3">
        {canReplyToVotes && !isDeleted && (
          <button
            type="button"
            onClick={() => setReplyingTo({ voteId, parentReplyId: node.id })}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Reply
          </button>
        )}

        {canModify && !isEditing && (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </>
        )}

        {canModify && isEditing && (
          <>
            <button
              type="button"
              onClick={() => {
                onEdit(node.id, editDraft);
                setIsEditing(false);
              }}
              className="text-xs font-medium text-gray-900 hover:text-black"
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditDraft(node.body);
              }}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {node.replies.length > 0 && (
        <div className="mt-3 pl-3 sm:pl-4 border-l border-gray-200 space-y-3">
          {node.replies.map((r) => (
            <VoteReplyNodeComponent
              key={r.id}
              node={r}
              voteId={voteId}
              canReplyToVotes={canReplyToVotes}
              canReactToVotes={canReactToVotes}
              setReplyingTo={setReplyingTo}
              sessionUserId={sessionUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              categoryByUser={categoryByUser}
              onReport={onReport}
              locked={locked}
            />
          ))}
        </div>
      )}

      {sessionUserId && sessionUserId !== node.author_user_id && !isDeleted && locked === "voter" && (
        <button
          type="button"
          onClick={() => onReport("comment", String(node.id), `Vote reply by ${node.author_alias}`)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
          title="Report for safety"
        >
          <ShieldAlert className="h-3 w-3" />
          Report
        </button>
      )}
    </div>
  );
}

function CommunityReplyNodeComponent({
  node,
  statementId,
  canReplyToCommunity,
  canReactToCommunity,
  setReplyingTo,
  sessionUserId,
  onEdit,
  onDelete,
  categoryByUser,
  onReport,
}: {
    node: CommunityReplyNode;
    statementId: number;
    canReplyToCommunity: boolean;
    canReactToCommunity: boolean;
    setReplyingTo: (v: { statementId: number; parentReplyId: number | null }) => void;
    sessionUserId: string | null;
    onEdit: (replyId: number, newBody: string) => void;
    onDelete: (replyId: number) => void;
    categoryByUser: Record<string, string>;
    onReport: (target: "record" | "contributor" | "subject" | "comment", id: string, label: string) => void;
  }) {
    const isDeleted = !!node.deleted_at;
    const isEdited = !!node.edited_at;
  
    const canModify =
      canReplyToCommunity &&
      !!sessionUserId &&
      node.author_user_id === sessionUserId &&
      !isDeleted;
  
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState(node.body);
  
    useEffect(() => {
      setEditDraft(node.body);
    }, [node.body]);
  
    return (
      <div>
        <div className="text-xs font-semibold text-gray-900">
          {node.author_alias}
          {categoryByUser[node.author_user_id] && (
            <span className="ml-1 font-normal text-gray-400">({categoryByUser[node.author_user_id]})</span>
          )}
        </div>
  
        <div className="text-[11px] text-gray-500">
          {formatTimestampNoSeconds(node.created_at)}
          {isEdited && !isDeleted ? ` • Edited ${formatTimestampNoSeconds(node.edited_at as string)}` : ""}
          {isDeleted ? ` • Deleted ${formatTimestampNoSeconds(node.deleted_at as string)}` : ""}
        </div>
  
        <div className="mt-1 text-sm whitespace-pre-wrap">
          {isDeleted ? (
            <span className="italic text-gray-500">This reply was deleted.</span>
          ) : isEditing ? (
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
            />
          ) : (
            node.body
          )}
        </div>
  
        <div className="mt-2">
          <AgreeDisagree
            targetType="record_community_replies"
            targetId={String(node.id)}
            disabled={!sessionUserId || !canReactToCommunity}
            size={26}
          />
        </div>
  
        <div className="mt-2 flex items-center gap-3">
          {canReplyToCommunity && !isDeleted && (
            <button
              type="button"
              onClick={() => setReplyingTo({ statementId, parentReplyId: node.id })}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Reply
            </button>
          )}
  
          {canModify && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Edit
              </button>
  
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </>
          )}
  
          {canModify && isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  onEdit(node.id, editDraft);
                  setIsEditing(false);
                }}
                className="text-xs font-medium text-gray-900 hover:text-black"
              >
                Save
              </button>
  
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditDraft(node.body);
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </>
          )}
        </div>
  
        {node.replies.length > 0 && (
          <div className="mt-3 pl-3 sm:pl-4 border-l border-gray-200 space-y-3">
            {node.replies.map((r) => (
              <CommunityReplyNodeComponent
                key={r.id}
                node={r}
                statementId={statementId}
                canReplyToCommunity={canReplyToCommunity}
                canReactToCommunity={canReactToCommunity}
                setReplyingTo={setReplyingTo}
                sessionUserId={sessionUserId}
                onEdit={onEdit}
                onDelete={onDelete}
                categoryByUser={categoryByUser}
                onReport={onReport}
              />
            ))}
          </div>
        )}

        {sessionUserId && sessionUserId !== node.author_user_id && !isDeleted && (
          <button
            type="button"
            onClick={() => onReport("comment", String(node.id), `Reply by ${node.author_alias}`)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
            title="Report for safety"
          >
            <ShieldAlert className="h-3 w-3" />
            Report
          </button>
        )}
      </div>
    );
}

function VotingCourtroom({
  record,
  viewerRoleUI,
  viewerRoleLocked,
  serverOffsetMs,
  isImpersonating,
  actingAuthUserId,
  participantBadges,
  onReport,
}: {
    record: any;
    viewerRoleUI: ViewerRole;
    viewerRoleLocked: ViewerRole;
    serverOffsetMs: number;
    isImpersonating: boolean;
    actingAuthUserId: string | null;
    participantBadges: Record<string, { label: string; icon: string }[]>;
    onReport: (target: "record" | "contributor" | "subject" | "comment", id: string, label: string) => void;
}) {
  const stage = getEffectiveStage(record, serverOffsetMs);
  const nowMs = Date.now() + (serverOffsetMs || 0);

  // Debate gating — computed here but early return happens AFTER all hooks
  const debateEndMs = record?.debate_ends_at ? new Date(record.debate_ends_at).getTime() : null;
  const recordStatus = normalizeStatus(record?.status);
  // Treat debate as ended if: debate_ends_at passed, OR record is already at voting/decision stage,
  // OR voting timestamps exist. This handles cases where record is reset straight to voting
  // without a debate_ends_at being set.
  const debateEnded =
    (!!debateEndMs && nowMs >= debateEndMs) ||
    stage >= 6 ||
    recordStatus === "voting" ||
    recordStatus === "decision" ||
    !!record?.voting_started_at;

  // Voting window (timestamp-driven)
  const votingStartMs = record?.voting_started_at ? new Date(record.voting_started_at).getTime() : null;
  const votingEndMs = record?.voting_ends_at ? new Date(record.voting_ends_at).getTime() : null;

  const isVotingWindow =
  !!votingStartMs && !!votingEndMs && nowMs >= votingStartMs && nowMs < votingEndMs;

  const isCurrentlyVoting = isVotingWindow; // alias used by votingNoVoteMessage

  const isPostVoting =
    !!votingEndMs && nowMs >= votingEndMs;

  const votingEnded = isPostVoting;

  const [executionByVote, setExecutionByVote] = useState<
    Record<
      string,
      {
        execute_yes_count: number;
        execute_no_count: number;
        eligible_citizen_count: number;
        required_execute_count: number;
        my_direction: 1 | -1 | null;
        is_convicted: boolean;
      }
    >
  >({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [myVote, setMyVote] = useState<null | { choice: "keep" | "delete"; explanation: string; created_at: string }>(null)
  const [voteBadges, setVoteBadges] = useState<Record<string, { is_low_quality: boolean; is_convicted: boolean }>>({});
  const [myFlags, setMyFlags] = useState<Set<string>>(new Set());

  const [choice, setChoice] = useState<"keep" | "delete" | "">("");
  const [reason, setReason] = useState("");

  const [keepCount, setKeepCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Build reply tree grouped by vote_id
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [categoryByUser, setCategoryByUser] = useState<Record<string, string>>({});
  const [repliesByVote, setRepliesByVote] = useState<Record<string, VoteReplyNode[]>>({});
  const [replyDraft, setReplyDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<null | { voteId: string; parentReplyId: string | null }>(null);
  const [postingReply, setPostingReply] = useState(false);
  const [communityStatements, setCommunityStatements] = useState<CommunityStatementRow[]>([]);
  const [communityRepliesByStatement, setCommunityRepliesByStatement] = useState<Record<number, CommunityReplyNode[]>>({});
  const [myCommunityStatement, setMyCommunityStatement] = useState<CommunityStatementRow | null>(null);

  const [communityStatementDraft, setCommunityStatementDraft] = useState("");
  const [communityReplyDraft, setCommunityReplyDraft] = useState("");
  const [replyingToCommunity, setReplyingToCommunity] =
    useState<null | { statementId: number; parentReplyId: number | null }>(null);

  const maxChars = 4000;

  const decisionStartedMs =
  record?.decision_started_at
    ? new Date(record.decision_started_at).getTime()
    : null;

  const sevenDayUnlockMs =
    decisionStartedMs !== null ? decisionStartedMs + 7 * 24 * 60 * 60 * 1000 : null;

  const isAfterSevenDayUnlock =
    sevenDayUnlockMs !== null && nowMs >= sevenDayUnlockMs;

  // During voting: only voters can reply to votes
  // After voting ends: voters + citizens can reply
  const locked = viewerRoleLocked;

  const executionWindowEndMs =
  votingEndMs ? votingEndMs + 3 * 24 * 60 * 60 * 1000 : null;

  const isExecutionWindowOpen =
    !!votingEndMs &&
    !!executionWindowEndMs &&
    nowMs >= votingEndMs &&
    nowMs < executionWindowEndMs;

  const myCitizenStatementEligible =
    !!myCommunityStatement &&
    myCommunityStatement.author_role === "citizen" &&
    !!votingStartMs &&
    !!executionWindowEndMs &&
    new Date(myCommunityStatement.created_at).getTime() >= votingStartMs &&
    new Date(myCommunityStatement.created_at).getTime() < executionWindowEndMs;

  const canCastExecutionVote =
    locked === "citizen" && isExecutionWindowOpen && myCitizenStatementEligible;

  async function getActorId(): Promise<string> {
    const real = (await supabase.auth.getUser()).data.user;
    if (!real?.id) throw new Error("Not signed in.");
  
    return isImpersonating && actingAuthUserId ? actingAuthUserId : real.id;
  }

  const canInteractVotingSection =
    locked === "voter"
      ? (isVotingWindow || isPostVoting)
      : locked === "citizen"
      ? isPostVoting
      : (locked === "subject" || locked === "contributor")
      ? isAfterSevenDayUnlock
      : false;

  // canReplyToVotes mirrors canInteractVotingSection exactly
  const canReplyToVotes = canInteractVotingSection;
  // canReactToVotes mirrors canReplyToVotes exactly (reactions = reply permissions)
  const canReactToVotes = canReplyToVotes;

  // Quality review (upvote/downvote on vote statements) is VOTER-ONLY at all times
  const canQualityReviewVotes = locked === "voter" && (isVotingWindow || isPostVoting);

  const canPostCommunityStatement =
    !myCommunityStatement &&
    (
      ((locked === "voter" || locked === "citizen") && (isVotingWindow || isPostVoting)) ||
      ((locked === "subject" || locked === "contributor") && isAfterSevenDayUnlock)
    );
    
  const canInteractCommunitySection =
    ((locked === "voter" || locked === "citizen") && (isVotingWindow || isPostVoting)) ||
    ((locked === "subject" || locked === "contributor") && isAfterSevenDayUnlock);

  async function loadMyFlags(recordId: string, userId: string) {
    const { data } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("target_type", "record_vote_quality")
      .eq("user_id", userId);
      
    const flagged = new Set<string>((data ?? []).map((r: any) => String(r.target_id)));
    setMyFlags(flagged);
  }

  async function loadVoteBadges(recordId: string) {
        try {
          const { data, error } = await supabase
            .from("voter_quality_badges_public")
            .select("vote_id, is_low_quality, is_convicted")
            .eq("record_id", recordId);
    
          if (error) {
            console.warn("Failed to load vote badges:", error.message);
            return {};
          }
    
          const badgesMap: Record<string, { is_low_quality: boolean; is_convicted: boolean }> = {};
          data?.forEach((item: any) => {
            const key = String(item.vote_id);
            badgesMap[key] = {
              is_low_quality: !!item.is_low_quality,
              is_convicted: !!item.is_convicted,
            };
          });
          
          return badgesMap;
        } catch (e) {
          console.warn("Error loading vote badges:", e);
          return {};
        }
  }

  async function loadExecutionByVote(recordId: string, userId: string | null) {
    try {
      const { data: rows, error } = await supabase
        .from("voter_quality_badges_public")
        .select(
          "vote_id, execute_yes_count, execute_no_count, eligible_citizen_count, required_execute_count, is_convicted"
        )
        .eq("record_id", recordId);

      if (error) {
        console.warn("Failed to load execution state:", error.message);
        return;
      }

      let myDirections: Record<string, 1 | -1 | null> = {};

      if (userId) {
        const { data: mine, error: mineErr } = await supabase
          .from("record_vote_execution_votes")
          .select("vote_id, direction")
          .eq("record_id", recordId)
          .eq("user_id", userId);

        if (mineErr) {
          console.warn("Failed to load my execution votes:", mineErr.message);
        } else {
          (mine || []).forEach((row: any) => {
            myDirections[String(row.vote_id)] =
              row.direction === 1 ? 1 : row.direction === -1 ? -1 : null;
          });
        }
      }

      const next: Record<
        string,
        {
          execute_yes_count: number;
          execute_no_count: number;
          eligible_citizen_count: number;
          required_execute_count: number;
          my_direction: 1 | -1 | null;
          is_convicted: boolean;
        }
      > = {};

      (rows || []).forEach((row: any) => {
        const voteId = String(row.vote_id);
        next[voteId] = {
          execute_yes_count: Number(row.execute_yes_count ?? 0),
          execute_no_count: Number(row.execute_no_count ?? 0),
          eligible_citizen_count: Number(row.eligible_citizen_count ?? 0),
          required_execute_count: Number(row.required_execute_count ?? 0),
          my_direction: myDirections[voteId] ?? null,
          is_convicted: !!row.is_convicted,
        };
      });

      setExecutionByVote(next);
    } catch (e) {
      console.warn("Error loading execution state:", e);
    }
  }

  async function loadTally(recordId: string) {
    const { data: tally } = await supabase.rpc("vote_tally", { p_record_id: recordId });
    const t = Array.isArray(tally) ? tally[0] : tally;
  
    setKeepCount(Number(t?.keep_count ?? 0));
    setDeleteCount(Number(t?.delete_count ?? 0));
    setTotalCount(Number(t?.total_count ?? 0));
  }
  
  async function loadMyVote(recordId: string, userId: string | null) {
    if (!userId) {
      setMyVote(null);
      return;
    }
    const { data } = await supabase
      .from("record_votes")
      .select("choice, explanation, created_at")
      .eq("record_id", recordId)
      .eq("user_id", userId)
      .maybeSingle();
  
    if (data?.choice) setMyVote({ choice: data.choice, explanation: data.explanation, created_at: data.created_at });
    else setMyVote(null);
  }
  
  async function loadVotes(recordId: string) {
    const { data: voteRows } = await supabase
      .from("record_votes")
      .select("id, record_id, user_id, choice, explanation, created_at, author_alias")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
  
    const votesData = ((voteRows ?? []) as any[]).map((v) => ({ ...v, id: String(v.id) }));
    setVotes(votesData as VoteRow[]);
  }
  
  async function loadVoteReplies(recordId: string) {
    const { data: replyRows } = await supabase
      .from("record_vote_replies")
      .select("id, record_id, vote_id, author_user_id, author_alias, body, created_at, parent_reply_id, edited_at, deleted_at")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
  
    // ✅ normalize BIGINTs to strings (fixes your #7 issue)
    const rows = ((replyRows ?? []) as any[]).map((r) => ({
      ...r,
      id: String(r.id),
      vote_id: String(r.vote_id),
      parent_reply_id: r.parent_reply_id === null ? null : String(r.parent_reply_id),
    })) as VoteReplyRow[];
  
    const grouped: Record<string, VoteReplyRow[]> = {};
    rows.forEach((r) => {
      const k = String(r.vote_id);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    });
  
    const next: Record<string, VoteReplyNode[]> = {};
    Object.entries(grouped).forEach(([voteId, arr]) => {
      next[voteId] = buildVoteReplyTree(arr);
    });
  
    setRepliesByVote(next);
  }
  
  async function loadCategories(recordId: string) {
    try {
      const { data: voteUsers } = await supabase
        .from("record_votes")
        .select("user_id")
        .eq("record_id", recordId);

      const { data: stmtUsers } = await supabase
        .from("record_community_statements")
        .select("author_user_id")
        .eq("record_id", recordId);

      const allUserIds = [
        ...new Set([
          ...(voteUsers || []).map((r: any) => r.user_id),
          ...(stmtUsers || []).map((r: any) => r.author_user_id),
        ]),
      ].filter(Boolean);

      if (!allUserIds.length) return;

      const { data: accounts } = await supabase
        .from("user_accountdetails")
        .select("user_id, job_title")
        .in("user_id", allUserIds);

      const map: Record<string, string> = {};
      (accounts || []).forEach((a: any) => {
        if (a.job_title) map[a.user_id] = a.job_title;
      });
      setCategoryByUser(map);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async function loadCommunity(recordId: string, userId: string | null) {
    const { data: stmtRows } = await supabase
      .from("record_community_statements")
      .select("id, record_id, author_user_id, author_alias, author_role, body, created_at")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
  
    const stmts = (stmtRows as any as CommunityStatementRow[]) ?? [];
    setCommunityStatements(stmts);
  
    if (userId) setMyCommunityStatement(stmts.find((s) => s.author_user_id === userId) ?? null);
    else setMyCommunityStatement(null);
  
    const { data: commReplyRows } = await supabase
      .from("record_community_replies")
      .select("id, record_id, statement_id, author_user_id, author_alias, body, created_at, parent_reply_id, edited_at, deleted_at")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
  
    const commRows = (commReplyRows as any as CommunityReplyRow[]) ?? [];
  
    const commGrouped: Record<number, CommunityReplyRow[]> = {};
    commRows.forEach((r) => {
      if (!commGrouped[r.statement_id]) commGrouped[r.statement_id] = [];
      commGrouped[r.statement_id].push(r);
    });
  
    const commNext: Record<number, CommunityReplyNode[]> = {};
    Object.entries(commGrouped).forEach(([statementId, arr]) => {
      commNext[Number(statementId)] = buildCommunityReplyTree(arr);
    });
  
    setCommunityRepliesByStatement(commNext);
  }

  async function loadVotingBoot() {
    setLoading(true);
    try {
        const real = (await supabase.auth.getUser()).data.user;
        const realId = real?.id ?? null;
        setSessionUserId(realId);

        // If admin test view is impersonating, treat “me” as actorId for “my vote/my statement”
        const actorId = realId ? await getActorId() : null;

        await Promise.all([
          loadTally(record.id),
          loadVotes(record.id),
          loadVoteReplies(record.id),
          loadCommunity(record.id, actorId),
          loadMyVote(record.id, actorId),
          loadExecutionByVote(record.id, actorId),
          loadCategories(record.id),
        ])
  
      // Badges can come in after votes render (non-blocking)
      loadVoteBadges(record.id).then(setVoteBadges);
      if (actorId) loadMyFlags(record.id, actorId);
    } finally {
      setLoading(false);
    }
  }

  async function postCommunityStatement() {
    if (!canPostCommunityStatement) return;

    const text = communityStatementDraft.trim();
    if (!text) return;
    if (text.length > maxChars) {
      alert(`Max ${maxChars} characters.`);
      return;
    }

    setPostingReply(true);
    try {
        const actorId = await getActorId();

        const roleForStatement =
        locked === "voter"
          ? "voter"
          : locked === "citizen"
          ? "citizen"
          : locked === "subject"
          ? "subject"
          : locked === "contributor"
          ? "contributor"
          : "citizen";

      const { data: alias, error: aErr } = await supabase.rpc("get_or_create_alias", {
        p_record_id: record.id,
        p_auth_user_id: actorId,
        p_role: roleForStatement,
      });
        if (aErr) throw aErr;
        
        const { error } = await supabase.from("record_community_statements").insert({
          record_id: record.id,
          author_user_id: actorId,
          author_alias: alias,
          author_role: roleForStatement,
          body: text,
        });
        if (error) throw error;

        if (text.includes("@")) {
          await notifyMentions(record.id, text, actorId, alias);
        }
        setCommunityStatementDraft("");
        await Promise.all([
          loadCommunity(record.id, actorId),
          loadExecutionByVote(record.id, actorId),
        ]);
      } catch (e: any) {
      alert(e?.message || "Failed to post statement.");
    } finally {
      setPostingReply(false);
    }
  }

  async function postCommunityReply() {
    if (!canInteractCommunitySection) return;
    if (!replyingToCommunity) return;

    const text = communityReplyDraft.trim();
    if (!text) return;
    if (text.length > maxChars) {
      alert(`Max ${maxChars} characters.`);
      return;
    }

    setPostingReply(true);
    try {

      const roleForAlias =
        locked === "voter"
          ? "voter"
          : locked === "citizen"
          ? "citizen"
          : locked === "subject"
          ? "subject"
          : locked === "contributor"
          ? "contributor"
          : "citizen";

      const actorId = await getActorId();

      const { data: alias, error: aErr } = await supabase.rpc("get_or_create_alias", {
        p_record_id: record.id,
        p_auth_user_id: actorId,
        p_role: roleForAlias,
      });
      if (aErr) throw aErr;

      const { error } = await supabase.from("record_community_replies").insert({
        record_id: record.id,
        statement_id: replyingToCommunity.statementId,
        parent_reply_id: replyingToCommunity.parentReplyId,
        author_user_id: actorId,
        author_alias: alias,
        body: text,
      });

      if (error) throw error;

      if (text.includes("@")) {
        await notifyMentions(record.id, text, actorId, alias);
      }
      setCommunityReplyDraft("");
      setReplyingToCommunity(null);
      await loadCommunity(record.id, actorId);
    } catch (e: any) {
      alert(e?.message || "Failed to post reply.");
    } finally {
      setPostingReply(false);
    }
  }

  async function editCommunityReply(replyId: number, newBody: string) {
    const text = newBody.trim();
    if (!text) return;

    setPostingReply(true);
    try {
      await supabase.rpc("edit_community_reply", { p_reply_id: replyId, p_new_body: text });
      const actorId = await getActorId();
      await loadCommunity(record.id, actorId);
    } catch (e: any) {
      alert(e?.message || "Failed to edit reply.");
    } finally {
      setPostingReply(false);
    }
  }

  async function deleteCommunityReply(replyId: number) {
    if (!confirm("Delete this reply?")) return;

    setPostingReply(true);
    try {
      await supabase.rpc("delete_community_reply", { p_reply_id: replyId });
      const actorId = await getActorId();
      await loadCommunity(record.id, actorId);
    } catch (e: any) {
      alert(e?.message || "Failed to delete reply.");
    } finally {
      setPostingReply(false);
    }
  }

  useEffect(() => {
    if (!record?.id) return;
    loadVotingBoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  useEffect(() => {
    if (!record?.id) return;
  
    const recordId = record.id;
    const actorId = isImpersonating && actingAuthUserId ? actingAuthUserId : sessionUserId;
  
    const votesChannel = supabase
      .channel(`record_votes:${recordId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "record_votes",
          filter: `record_id=eq.${recordId}`,
        },
        async () => {
          await Promise.all([
            loadTally(recordId),
            loadVotes(recordId),
            loadExecutionByVote(recordId, actorId),
          ]);
          loadVoteBadges(recordId).then(setVoteBadges);
        }
      )
      .subscribe();
  
    const communityChannel = supabase
      .channel(`record_community_statements:${recordId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "record_community_statements",
          filter: `record_id=eq.${recordId}`,
        },
        async () => {
          await Promise.all([
            loadCommunity(recordId, actorId),
            loadExecutionByVote(recordId, actorId),
          ]);
          loadVoteBadges(recordId).then(setVoteBadges);
        }
      )
      .subscribe();
  
    const executionChannel = supabase
      .channel(`record_vote_execution_votes:${recordId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "record_vote_execution_votes",
          filter: `record_id=eq.${recordId}`,
        },
        async () => {
          await Promise.all([
            loadTally(recordId),
            loadExecutionByVote(recordId, actorId),
          ]);
          loadVoteBadges(recordId).then(setVoteBadges);
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(communityChannel);
      supabase.removeChannel(executionChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, sessionUserId]);

  // Early return AFTER all hooks — safe per React Rules of Hooks
  if (!debateEnded) return null;

  const canVote =
  isVotingWindow &&
  locked === "voter" &&
  !myVote;

  async function submitVote() {
    if (!canVote) return;

    if (!choice) {
      alert("Please choose Keep or Delete.");
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      alert("Please write a reason for your vote.");
      return;
    }
    if (trimmed.length > maxChars) {
      alert(`Max ${maxChars} characters.`);
      return;
    }

    setSubmitting(true);
    try {
        const actorId = await getActorId();

        const { data: alias, error: aErr } = await supabase.rpc("get_or_create_alias", {
        p_record_id: record.id,
        p_auth_user_id: actorId,
        p_role: "voter",
        });
        if (aErr) throw aErr;

        const { error } = await supabase.from("record_votes").insert({
        record_id: record.id,
        user_id: actorId,
        choice,
        explanation: trimmed,
        author_alias: alias,
        });
        if (error) throw error;

        await Promise.all([
          loadTally(record.id),
          loadVotes(record.id),
          loadMyVote(record.id, actorId),
          loadExecutionByVote(record.id, actorId),
        ]);
        loadVoteBadges(record.id).then(setVoteBadges);
    } catch (e: any) {
      alert(e?.message || "Failed to submit vote.");
    } finally {
      setSubmitting(false);
    }
  }

  function insertVoteReplyIntoTree(
    roots: VoteReplyNode[],
    parentId: string,
    nodeToInsert: VoteReplyNode
  ): VoteReplyNode[] {
    return roots.map((n) => {
      if (String(n.id) === String(parentId)) {
        return { ...n, replies: [...(n.replies ?? []), nodeToInsert] };
      }
      if (n.replies?.length) {
        return { ...n, replies: insertVoteReplyIntoTree(n.replies, parentId, nodeToInsert) };
      }
      return n;
    });
  }
  
  function removeVoteReplyFromTree(roots: VoteReplyNode[], idToRemove: string): VoteReplyNode[] {
    const filtered = roots
      .filter((n) => String(n.id) !== String(idToRemove))
      .map((n) => ({
        ...n,
        replies: n.replies?.length ? removeVoteReplyFromTree(n.replies, idToRemove) : [],
      }));
    return filtered;
  }

  async function postVoteReply() {
    if (!canInteractVotingSection) return;
    if (!replyingTo) return;
  
    const text = replyDraft.trim();
    if (!text) return;
    if (text.length > maxChars) {
      alert(`Max ${maxChars} characters.`);
      return;
    }
  
    setPostingReply(true);
  
    // We'll track the temp id so we can rollback on error (or replace later)
    const voteId = String(replyingTo.voteId);
    const parentId = replyingTo.parentReplyId ? String(replyingTo.parentReplyId) : null;
    const tempId = `temp-${Date.now()}`;
  
    try {
      const actorId = await getActorId();
  
      const { data: alias, error: aErr } = await supabase.rpc("get_or_create_alias", {
        p_record_id: record.id,
        p_auth_user_id: actorId,
        p_role:
          viewerRoleLocked === "voter"
            ? "voter"
            : viewerRoleLocked === "citizen"
            ? "citizen"
            : viewerRoleLocked === "subject"
            ? "subject"
            : viewerRoleLocked === "contributor"
            ? "contributor"
            : "citizen",
      });
      if (aErr) throw aErr;
  
      // ✅ OPTIMISTIC INSERT (immediate UI)
      const optimistic: VoteReplyNode = {
        id: tempId,
        record_id: record.id,
        vote_id: voteId,
        author_user_id: actorId,
        author_alias: alias,
        body: text,
        created_at: new Date().toISOString(),
        parent_reply_id: parentId,
        replies: [],
      };
  
      setRepliesByVote((prev) => {
        const currentRoots = prev[voteId] ?? [];
  
        // simplest: if root reply
        if (!parentId) {
          return { ...prev, [voteId]: [...currentRoots, optimistic] };
        }
  
        // nested reply: insert into tree
        const nextRoots = insertVoteReplyIntoTree(currentRoots, parentId, optimistic);
        return { ...prev, [voteId]: nextRoots };
      });
  
      // (Optional) clear composer immediately so it feels snappy
      setReplyDraft("");
      setReplyingTo(null);
  
      // ✅ DB INSERT (ask for id back so we can replace temp id if you want)
      const { data: inserted, error } = await supabase
        .from("record_vote_replies")
        .insert({
          record_id: record.id,
          vote_id: voteId,
          author_user_id: actorId,
          author_alias: alias,
          body: text,
          parent_reply_id: parentId,
        })
        .select("id, created_at")
        .maybeSingle();
  
      if (error) throw error;
  
      // ✅ Replace temp id with real id (optional but nice)
      if (inserted?.id) {
        const realId = String(inserted.id);
        const realCreatedAt = inserted.created_at ? String(inserted.created_at) : optimistic.created_at;
  
        setRepliesByVote((prev) => {
          const roots = prev[voteId] ?? [];
  
          const replaceInTree = (nodes: VoteReplyNode[]): VoteReplyNode[] =>
            nodes.map((n) => {
              if (String(n.id) === String(tempId)) {
                return { ...n, id: realId, created_at: realCreatedAt };
              }
              return n.replies?.length
                ? { ...n, replies: replaceInTree(n.replies) }
                : n;
            });
  
          return { ...prev, [voteId]: replaceInTree(roots) };
        });
      }
  
      // ✅ Finally refresh from server (authoritative)
      await Promise.all([
        loadVoteReplies(record.id),
        loadExecutionByVote(record.id, actorId),
      ]);
    } catch (e: any) {
      // rollback optimistic node on failure
      setRepliesByVote((prev) => {
        const roots = prev[voteId] ?? [];
        const nextRoots = removeVoteReplyFromTree(roots, tempId);
        return { ...prev, [voteId]: nextRoots };
      });
  
      alert(e?.message || "Failed to post reply.");
    } finally {
      setPostingReply(false);
    }
  }
  
  async function editVoteReply(replyId: string, newBody: string) {
    const text = newBody.trim();
    if (!text) return;
  
    setPostingReply(true);
    try {
      await supabase.rpc("edit_vote_reply", {
        p_reply_id: replyId,      // send string numeric -> postgres can cast if rpc arg is bigint
        p_new_body: text,
      });
      const actorId = await getActorId();
      await Promise.all([
        loadVoteReplies(record.id),
        loadExecutionByVote(record.id, actorId),
      ]);
    } catch (e: any) {
      alert(e?.message || "Failed to edit reply.");
    } finally {
      setPostingReply(false);
    }
  }
  
  async function deleteVoteReply(replyId: string) {
    if (!confirm("Delete this reply?")) return;
  
    setPostingReply(true);
    try {
      await supabase.rpc("delete_vote_reply", { p_reply_id: replyId });
      const actorId = await getActorId();
      await Promise.all([
        loadVoteReplies(record.id),
        loadExecutionByVote(record.id, actorId),
      ]);
    } catch (e: any) {
      alert(e?.message || "Failed to delete reply.");
    } finally {
      setPostingReply(false);
    }
  }

  async function toggleExecutionVote(voteId: string, direction: 1 | -1) {
    if (!canCastExecutionVote) return;

    try {
      const { error } = await supabase.rpc("toggle_vote_execution", {
        p_record_id: record.id,
        p_vote_id: Number(voteId),
        p_direction: direction,
      });

      if (error) throw error;

      const actorId = await getActorId();

      await Promise.all([
        loadExecutionByVote(record.id, actorId),
        loadTally(record.id),
      ]);

      loadVoteBadges(record.id).then(setVoteBadges);
    } catch (e: any) {
      alert(e?.message || "Failed to submit execution vote.");
    }
  }

  const showForm = canVote;
  const showReadonly = !!myVote;

  // Helper component to render vote quality badges
  const VoteBadge = ({ voteId }: { voteId: string }) => {
        const badge = voteBadges[voteId];
        if (!badge) return null;
        
        if (badge.is_convicted) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 ml-2 border border-red-300" title="This vote does NOT count toward the final tally">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
              DISQUALIFIED • Lost Voting Right
            </span>
          );
        }
        
        if (badge.is_low_quality) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 ml-2 border border-yellow-300" title="This explanation has been flagged as low quality by the community">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
              ⚠ Low-Quality Voter
            </span>
          );
        }
        
        return null;
  };

  return (
    <>
      {/* =========================
          Card #2: Voting Section
      ========================== */}
      <VotingSectionCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Voting Section</div>
            <div className="text-[11px] text-gray-500">
              Vote to keep or delete this record. A reason is required.
            </div>
          </div>

          <div className="flex w-full sm:w-auto flex-col items-start gap-2 sm:items-end">
            <div className="relative group max-w-full">
              <TallyChip keepCount={keepCount} deleteCount={deleteCount} totalCount={totalCount} />
              {Object.values(voteBadges).filter(b => b.is_convicted).length > 0 && (
                <div className="absolute top-full right-0 mt-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg p-2 whitespace-nowrap z-10">
                  {Object.values(voteBadges).filter(b => b.is_convicted).length} convicted vote(s) excluded from tally
                </div>
              )}
            </div>
            {record?.voting_ends_at ? (
              <VotingTimerChip votingEndsAt={record.voting_ends_at as string} serverOffsetMs={serverOffsetMs} />
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-gray-600">Loading votes…</div>
          ) : showReadonly ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-900">Your vote</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold">
                <span className={myVote!.choice === "keep" ? "text-green-700" : "text-red-700"}>
                  {myVote!.choice.toUpperCase()}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{formatTimestampNoSeconds(myVote!.created_at)}</span>
              </div>

              <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {myVote!.explanation}
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
                <div className="text-[11px] text-gray-500 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">No edits</div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setChoice("keep")}
                  className={[
                    "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                    choice === "keep"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-800 hover:bg-gray-50",
                  ].join(" ")}
                >
                  KEEP
                </button>

                <button
                  type="button"
                  onClick={() => setChoice("delete")}
                  className={[
                    "flex-1 rounded-full border px-4 py-3 text-sm font-semibold",
                    choice === "delete"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-800 hover:bg-gray-50",
                  ].join(" ")}
                >
                  DELETE
                </button>
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
                placeholder="Write your reason (required)…"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-[11px] text-gray-500">
                  {reason.trim().length}/{maxChars}
                </div>

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
          ) : (
            <div className="text-sm text-gray-600">
              {votingNoVoteMessage({
                viewerRole: viewerRoleLocked,
                isCurrentlyVoting,
                votingEnded,
                hasVoted: !!myVote,
                stage,
              })}
            </div>
          )}
        </div>

        {/* ================= Vote Statements ================= */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-900 mb-4">Vote Statements</div>

          {votes.length === 0 ? (
            <div className="text-sm text-gray-500">No votes yet.</div>
          ) : (
            votes.map((v) => {
              const replies = repliesByVote[String(v.id)] || [];

              return (
                <div key={v.id} className="border-b border-gray-200 pb-5 last:border-b-0 last:pb-0">

                  {/* Header: alias + badge + timestamp inline, choice pill on right */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">
                      {v.author_alias || "Anonymous"}
                      {categoryByUser[v.user_id] && (
                        <span className="ml-1 font-normal text-gray-400">({categoryByUser[v.user_id]})</span>
                      )}
                    </span>
                    <UserBadgePills userId={v.user_id} participantBadges={participantBadges} />
                    <VoteBadge voteId={v.id} />
                    <span className="text-[11px] text-gray-400">{formatTimestampNoSeconds(v.created_at)}</span>
                    <span className={[
                      "ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      v.choice === "keep"
                        ? "text-green-700 border-green-200 bg-green-50"
                        : "text-red-700 border-red-200 bg-red-50",
                    ].join(" ")}>
                      {v.choice.toUpperCase()}
                    </span>
                  </div>

                  {/* Voter Disqualification Review — above explanation */}
                  {(() => {
                    const execState = executionByVote[String(v.id)];
                    const badge = voteBadges[String(v.id)];
                    const isLowQuality = badge?.is_low_quality || badge?.is_convicted;
                    if (!isLowQuality) return null;
                    const executionActive = isExecutionWindowOpen;
                    return (
                      <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="text-[11px] font-semibold text-gray-700">Voter Disqualification Review</div>
                        {(() => {
                          const eligible = execState?.eligible_citizen_count ?? 0;
                          const yes = execState?.execute_yes_count ?? 0;
                          const needed = execState?.required_execute_count ?? 0;
                          const pct = eligible > 0 ? Math.round((yes / eligible) * 100) : 0;
                          const neededPct = eligible > 0 ? Math.round((needed / eligible) * 100) : 50;
                          return (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-gray-500">{pct}% of citizens approved disqualification — {neededPct}% needed</span>                                
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div className={["h-full rounded-full transition-all", pct >= neededPct ? "bg-red-500" : "bg-yellow-400"].join(" ")} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                        {executionActive && canCastExecutionVote ? (
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <button type="button" onClick={() => toggleExecutionVote(v.id, 1)} className={["flex-1 rounded-xl border px-4 py-2 text-sm font-semibold", execState?.my_direction === 1 ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-800 hover:bg-gray-50"].join(" ")}>Approve Disqualification</button>
                            <button type="button" onClick={() => toggleExecutionVote(v.id, -1)} className={["flex-1 rounded-xl border px-4 py-2 text-sm font-semibold", execState?.my_direction === -1 ? "bg-black text-white border-black" : "bg-white text-gray-800 hover:bg-gray-50"].join(" ")}>Oppose Disqualification</button>
                          </div>
                        ) : executionActive ? (
                          <div className="mt-2 text-xs text-gray-500">Only eligible citizens can approve disqualification.</div>
                        ) : (
                          <div className="mt-2 text-xs text-gray-500">Community review opens after voting ends.</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Explanation */}
                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{v.explanation}</div>

                  {/* Action bar */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">

                    {/* General reaction — only after voting ends, not during active voting session */}
                    <AgreeDisagree
                      targetType="record_votes"
                      targetId={String(v.id)}
                      disabled={!sessionUserId || isVotingWindow}
                      size={24}
                    />

                    <div className="h-4 w-px bg-gray-200" />

                    {/* Quality flag — voter only, permanent, anonymous */}
                    {canQualityReviewVotes && (
                      <button
                        type="button"
                        disabled={myFlags.has(String(v.id))}
                        title={myFlags.has(String(v.id)) ? "You already flagged this vote" : "Flag as low-quality reasoning"}
                        onClick={async () => {
                          if (myFlags.has(String(v.id))) return;
                          const confirmed = confirm(
                            "Flag this vote as low quality?\n\nThis is permanent and cannot be undone."
                          );
                          if (!confirmed) return;
                          try {
                            const actorId = await getActorId();
                            const { error } = await supabase.from("reactions").insert({
                              target_type: "record_vote_quality",
                              target_id: String(v.id),
                              user_id: actorId,
                              direction: -1,
                            });
                            if (error) throw error;
                            setMyFlags((prev) => new Set([...prev, String(v.id)]));
                            loadVoteBadges(record.id).then(setVoteBadges);
                          } catch (e: any) {
                            alert(e?.message || "Failed to flag.");
                          }
                        }}
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          myFlags.has(String(v.id))
                            ? "bg-yellow-50 border-yellow-300 text-yellow-700 cursor-not-allowed"
                            : "bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600 hover:bg-yellow-50",
                        ].join(" ")}
                      >
                        <Flag className="h-3 w-3" />
                        {myFlags.has(String(v.id)) ? "Flagged" : "Flag"}
                      </button>
                    )}

                    {canInteractVotingSection && (
                      <>
                        <div className="h-4 w-px bg-gray-200" />
                        <button
                          type="button"
                          onClick={() => setReplyingTo({ voteId: v.id, parentReplyId: null })}
                          className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Reply
                        </button>
                      </>
                    )}

                    {/* Safety report — voters only, not your own vote */}
                    {sessionUserId && sessionUserId !== v.user_id && locked === "voter" && (
                      <button
                        type="button"
                        onClick={() => onReport("comment", String(v.id), `Vote by ${v.author_alias || "Anonymous"}`)}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                        title="Report for safety"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Report
                      </button>
                    )}
                  </div>

                  {(executionByVote[String(v.id)]?.is_convicted || voteBadges[String(v.id)]?.is_convicted) && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>This vote does NOT count toward the final tally — this voter has been disqualified.</span>
                    </div>
                  )}

                  {replies.length > 0 && (
                    <div className="mt-4 pl-3 sm:pl-4 border-l space-y-3">
                      {replies.map((r) => (
                        <VoteReplyNodeComponent
                        key={r.id}
                        node={r}
                        voteId={v.id}
                        canReplyToVotes={canReplyToVotes}
                        canReactToVotes={canReactToVotes}
                        setReplyingTo={setReplyingTo}
                        sessionUserId={sessionUserId}
                        onEdit={editVoteReply}
                        onDelete={deleteVoteReply}
                        categoryByUser={categoryByUser}
                        onReport={onReport}
                        locked={locked}
                      />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {replyingTo && canInteractVotingSection && (
          <div className="mt-4 rounded-2xl border bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-900">Replying…</div>

            <MentionTextarea
              value={replyDraft}
              onChange={setReplyDraft}
              recordId={record.id}
              rows={3}
              placeholder="Write your reply…"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
            />

            <div className="mt-3 flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyDraft("");
                }}
                className="text-xs text-gray-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={postVoteReply}
                disabled={postingReply || replyDraft.trim().length === 0}
                className="w-full sm:w-auto rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {postingReply ? "Posting…" : "Post Reply"}
              </button>
            </div>
          </div>
        )}
      </VotingSectionCard>

      {/* =========================
          Card #3: Community Section
      ========================== */}
      <CommunitySectionCard>
        <div className="text-sm font-semibold text-gray-900">Community Section</div>
        <div className="text-xs text-gray-500 mt-1">Please note that you are allowed only one statement.</div>

        {(canPostCommunityStatement || !!myCommunityStatement) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            {myCommunityStatement ? (
              <div className="text-sm text-gray-700">
                You already posted your community statement (One per record).
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-gray-900">Your community statement</div>
                <MentionTextarea
                  value={communityStatementDraft}
                  onChange={setCommunityStatementDraft}
                  recordId={record.id}
                  rows={4}
                  placeholder="Write your statement…"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={postCommunityStatement}
                    disabled={postingReply || communityStatementDraft.trim().length === 0}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {postingReply ? "Posting…" : "Post Statement"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {(locked === "subject" || locked === "contributor") && !canInteractCommunitySection && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            You can reply here 7 days after the decision has been made.
          </div>
        )}

        <div className="mt-4">
          {communityStatements.length === 0 ? (
            <div className="text-sm text-gray-500">No community statements yet.</div>
          ) : (
            communityStatements.map((s) => {
              const replies = communityRepliesByStatement[s.id] || [];

              return (
                <div key={s.id} className="border-b border-gray-200 py-4 last:border-b-0 last:pb-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-900">
                        {s.author_alias}
                        {categoryByUser[s.author_user_id] && (
                          <span className="ml-1 font-normal text-gray-400">({categoryByUser[s.author_user_id]})</span>
                        )}
                      </span>
                      <UserBadgePills userId={s.author_user_id} participantBadges={participantBadges} />
                    </div>
                    <div className="text-[11px] text-gray-500">{formatTimestampNoSeconds(s.created_at)}</div>
                  </div>

                  <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{s.body}</div>

                  <div className="mt-2">
                  <AgreeDisagree
                    targetType="record_community_statements"
                    targetId={String(s.id)}
                    disabled={!sessionUserId || !canInteractCommunitySection}
                    size={26}
                  />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {canInteractCommunitySection ? (
                      <button
                        type="button"
                        onClick={() => setReplyingToCommunity({ statementId: s.id, parentReplyId: null })}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        Reply
                      </button>
                    ) : <span />}

                    {sessionUserId && sessionUserId !== s.author_user_id && (
                      <button
                        type="button"
                        onClick={() => onReport("comment", String(s.id), `Comment by ${s.author_alias}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                        title="Report for safety"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Report
                      </button>
                    )}
                  </div>

                  {replies.length > 0 && (
                    <div className="mt-4 pl-3 sm:pl-4 border-l space-y-3">
                      {replies.map((r) => (
                        <CommunityReplyNodeComponent
                          key={r.id}
                          node={r}
                          statementId={s.id}
                          canReplyToCommunity={canInteractCommunitySection}
                          canReactToCommunity={canInteractCommunitySection}
                          setReplyingTo={setReplyingToCommunity}
                          sessionUserId={sessionUserId}
                          onEdit={editCommunityReply}
                          onDelete={deleteCommunityReply}
                          categoryByUser={categoryByUser}
                          onReport={onReport}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {replyingToCommunity && canInteractCommunitySection && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-900">Replying…</div>

            <MentionTextarea
              value={communityReplyDraft}
              onChange={setCommunityReplyDraft}
              recordId={record.id}
              rows={3}
              placeholder="Write your reply…"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
            />

            <div className="mt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setReplyingToCommunity(null);
                  setCommunityReplyDraft("");
                }}
                className="text-xs text-gray-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={postCommunityReply}
                disabled={postingReply || communityReplyDraft.trim().length === 0}
                className="w-full sm:w-auto rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {postingReply ? "Posting…" : "Post Reply"}
              </button>
            </div>
          </div>
        )}
      </CommunitySectionCard>
    </>
  );
}       







/* =========================
   Record Page
========================= */

export default function RecordDetail({
    recordId: recordIdProp,
    embedded = false,
}: {
    recordId?: string;
    embedded?: boolean;
  }) {
  const params = useParams<{ id: string }>();
  const recordId = recordIdProp ?? params?.id;

  const fetchRecordRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    async function checkPinned() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !recordId) return;
      const { data } = await supabase
        .from("pinned_records")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("record_id", recordId)
        .maybeSingle();
      setPinned(!!data);
    }
    checkPinned();
  }, [recordId]);

  async function togglePin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !recordId) return;
    setPinLoading(true);
    try {
      if (pinned) {
        await supabase
          .from("pinned_records")
          .delete()
          .eq("user_id", session.user.id)
          .eq("record_id", recordId);
        setPinned(false);
      } else {
        await supabase
          .from("pinned_records")
          .insert({ user_id: session.user.id, record_id: recordId });
        setPinned(true);
      }
    } catch (err) {
      console.error("Pin toggle failed:", err);
    } finally {
      setPinLoading(false);
    }
  }

  useEffect(() => {
    async function checkFollowing() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !recordId) return;
      const { data } = await supabase
        .from("record_follows")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("record_id", recordId)
        .maybeSingle();
      setFollowing(!!data);
    }
    checkFollowing();
  }, [recordId]);

  async function toggleFollow() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !recordId) return;
    setFollowLoading(true);
    try {
      if (following) {
        await supabase
          .from("record_follows")
          .delete()
          .eq("user_id", session.user.id)
          .eq("record_id", recordId);
        setFollowing(false);
      } else {
        await supabase
          .from("record_follows")
          .insert({ user_id: session.user.id, record_id: recordId });
        setFollowing(true);
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setFollowLoading(false);
    }
  }

  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [currentStage, setCurrentStage] = useState<number>(1);

  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [recordUrl, setRecordUrl] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<"record" | "contributor" | "subject" | "comment">("record");
  const [reportTargetId, setReportTargetId] = useState<string>("");
  const [reportTargetLabel, setReportTargetLabel] = useState<string>("");
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && recordId) {
      setRecordUrl(`${window.location.origin}/record/${recordId}`);
    }
  }, [recordId]);

  function openReport(target: "record" | "contributor" | "subject" | "comment", id: string, label: string) {
    setReportTarget(target);
    setReportTargetId(id);
    setReportTargetLabel(label);
    setReportReason("");
    setReportDone(false);
    setReportOpen(true);
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("support_tickets").insert({
        user_id: session?.user?.id ?? null,
        type: "report",
        category: reportTarget,
        topic: reportTargetId,
        message: `Target: ${reportTargetLabel}\nRecord: ${recordId}\n\n${reportReason.trim()}`,
        priority: "normal",
      });
      if (error) throw error;
      setReportDone(true);
    } catch (e: any) {
      alert(e?.message || "Failed to submit report.");
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleShare() {
    const url = recordUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DNounce Record", url });
      } catch {}
    } else {
      setShareOpen(true);
    }
  }
  const [viewerRole, setViewerRole] = useState<ViewerRole>("public");

  const [viewerProfile, setViewerProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(
    null
  );

  const [contributorProfile, setContributorProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const [contributorSubjectId, setContributorSubjectId] = useState<string | null>(null);
  const [contributorBadges, setContributorBadges] = useState<{ label: string; icon: string }[]>([]);

  const [participantBadges, setParticipantBadges] = useState<Record<string, { label: string; icon: string }[]>>({});

  const [debateAttachmentsFlat, setDebateAttachmentsFlat] = useState<DebateAttachmentRow[]>([]);

  // ✅ Admin test view state
  const [isAdmin, setIsAdmin] = useState(false);
  const [testViewEnabled, setTestViewEnabled] = useState(false);
  const [forcedViewerRole, setForcedViewerRole] = useState<ViewerRole>("citizen");
  const [actingAuthUserId, setActingAuthUserId] = useState<string | null>(null);
  const isImpersonating = testViewEnabled && !!actingAuthUserId;
  const [testActors, setTestActors] = useState<{ id: number; label: string; role: ViewerRole; auth_user_id: string }[]>([]);

  useEffect(() => {
    if (!isAdmin || !testViewEnabled) return;
  
    supabase
      .from("admin_test_actors")
      .select("id,label,role,auth_user_id")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to load admin_test_actors:", error.message);
          setTestActors([]);
          return;
        }
        setTestActors((data ?? []).map((r: any) => ({
          id: r.id,
          label: r.label,
          role: r.role,
          auth_user_id: r.auth_user_id,
        })));
      });
  }, [isAdmin, testViewEnabled]);

  useEffect(() => {
    if (!testViewEnabled) {
      setActingAuthUserId(null);
      return;
    }
  
    // if viewing as public, there is no acting user
    if (forcedViewerRole === "public") {
      setActingAuthUserId(null);
      return;
    }
  
    // pick first actor matching the role
    const match = testActors.find((a) => a.role === forcedViewerRole);
    setActingAuthUserId(match?.auth_user_id ?? null);
  }, [testViewEnabled, forcedViewerRole, testActors]);

  // Keep forced role synced to actual role whenever test view is OFF
  useEffect(() => {
    if (!testViewEnabled) setForcedViewerRole(viewerRole);
  }, [viewerRole, testViewEnabled]);

  const effectiveViewerRole = testViewEnabled ? forcedViewerRole : viewerRole;

  const unifiedAttachments: AttachmentRow[] = useMemo(() => {
    const recordAtt: AttachmentRow[] = ((record?.attachments || []) as any[]).map((a: any) => ({
      id: a.id,
      path: a.path,
      mime_type: a.mime_type ?? null,
      size_bytes: a.size_bytes ?? null,
      label: a.label ?? null,
      created_at: a.created_at ?? null,
    }));

    const debateAtt: AttachmentRow[] = (debateAttachmentsFlat || []).map((a) => ({
      id: a.id,
      path: a.path,
      mime_type: a.mime_type ?? null,
      size_bytes: a.size_bytes ?? null,
      label: a.label ?? null,
      created_at: a.created_at ?? null,
    }));

    const merged = [...recordAtt, ...debateAtt];

    merged.sort((x, y) => new Date(x.created_at || 0).getTime() - new Date(y.created_at || 0).getTime());

    const seen = new Set<string>();
    const out: AttachmentRow[] = [];
    for (const a of merged) {
      const k = makeAttachmentKey(a.path);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(a);
    }
    return out;
  }, [record?.attachments, debateAttachmentsFlat]);

  const numberByPath = useMemo(() => {
    const m = new Map<string, number>();
    unifiedAttachments.forEach((a, i) => {
      const k = makeAttachmentKey(a.path);
      if (k) m.set(k, i + 1);
    });
    return m;
  }, [unifiedAttachments]);

  const getNumberForPath = (path: string) => {
    const k = makeAttachmentKey(path);
    return numberByPath.get(k) ?? null;
  };

  useEffect(() => {
    if (!recordId) return;

    async function fetchRecord() {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const res = await fetch(`/api/public/record/${recordId}`);
          const json = await res.json();

          if (!res.ok || !json?.id) {
            setError(json?.error || "Record not available publicly. Please sign in.");
            setRecord(null);
            setIsAdmin(false);
            setTestViewEnabled(false);
            return;
          }

          setViewerRole("public");
          setRecord(json);
          setCurrentStage(getRecordStage(json));
          setIsAdmin(false);
          setTestViewEnabled(false);
          return;
        }

        let offsetMs = 0;

        const { data: serverNow, error: tErr } = await supabase.rpc("server_time");
        if (!tErr && serverNow) {
          const serverMs = new Date(serverNow as any).getTime();
          offsetMs = serverMs - Date.now();
          setServerOffsetMs(offsetMs);
        }

        const { data, error } = await supabase
          .from("records")
          .select(
            `
            id,
            created_at,
            rating,
            description,
            category,
            location,
            organization,
            credibility,
            relationship,
            status,
            is_published,
            ai_completed_at,
            published_at,
            debate_started_at,
            debate_ends_at,
            voting_started_at,
            voting_ends_at,
            decision_started_at,
            contributor_id,
            contributor_identity_preference,
            subject:subjects (
              subject_uuid,
              owner_auth_user_id,
              name,
              nickname,
              organization,
              location
            ),
            attachments:record_attachments(
              id,
              path,
              mime_type,
              size_bytes,
              label,
              created_at
            ),
            contributor:contributors!records_contributor_id_fkey (
              id,
              user_id
            )
          `
          )
          .eq("id", recordId)
          .limit(1);

        if (error) {
          setError(error.message);
          setRecord(null);
          return;
        }

        if (!data || data.length === 0) {
          setError("Record not available publicly. Please sign in.");
          setRecord(null);
          return;
        }

        const rec = data[0];
        const sessionUserId = session.user.id;
        setSessionUserId(sessionUserId);

        // ✅ Admin check (public.users.admin = true)
        // Assumes users table has auth_user_id and admin boolean.
        try {
          const { data: adminRow } = await supabase
            .from("users")
            .select("admin")
            .eq("auth_user_id", sessionUserId)
            .maybeSingle();

          setIsAdmin(!!adminRow?.admin);
        } catch {
          setIsAdmin(false);
        }

        const { data: acct } = await supabase
          .from("user_accountdetails")
          .select("first_name,last_name,avatar_url")
          .eq("user_id", sessionUserId)
          .maybeSingle();

        setViewerProfile({
          first_name: acct?.first_name ?? null,
          last_name: acct?.last_name ?? null,
          avatar_url: acct?.avatar_url ?? null,
        });

        const { data: voteRow } = await supabase
          .from("record_votes")
          .select("id")
          .eq("record_id", recordId)
          .eq("user_id", sessionUserId)
          .maybeSingle();

        const hasVote = !!voteRow?.id;

        const role = resolveViewerRole({ sessionUserId, record: rec, hasVote });

        setViewerRole(role);
        setRecord(rec);
        setCurrentStage(getEffectiveStage(rec, offsetMs));

        const contributorUserId =
            (rec as any)?.contributor?.user_id ?? (rec as any)?.contributor?.[0]?.user_id ?? null;

        const reveal = shouldRevealContributorIdentity(rec);
        const shouldFetchContributorProfile = !!contributorUserId && (role === "contributor" || reveal);
        const shouldFetchContributorBadges = !!contributorUserId;
        
        if (shouldFetchContributorProfile && contributorUserId) {
          const { data: cAcct } = await supabase
            .from("user_accountdetails")
            .select("first_name,last_name,avatar_url")
            .eq("user_id", contributorUserId)
            .maybeSingle();
        
          setContributorProfile({
            first_name: cAcct?.first_name ?? null,
            last_name: cAcct?.last_name ?? null,
            avatar_url: cAcct?.avatar_url ?? null,
          });

          // Fetch contributor's subject UUID for profile link
          const { data: cSubject } = await supabase
            .from("subjects")
            .select("subject_uuid")
            .eq("owner_auth_user_id", contributorUserId)
            .maybeSingle();
          setContributorSubjectId(cSubject?.subject_uuid ?? null);
        } else {
          setContributorProfile(null);
          setContributorSubjectId(null);
        }
        
        // Always fetch badges regardless of identity reveal
        if (contributorUserId) {
          const { data: cBadges } = await supabase
            .from("badges")
            .select("label, icon")
            .eq("user_id", contributorUserId);
          setContributorBadges((cBadges ?? []).map((b: any) => ({ label: b.label, icon: b.icon })));
        } else {
          setContributorBadges([]);
        }

        // Load badges for all record participants
        try {
          const [stmtUsers, voteUsers, debateUsers] = await Promise.all([
            supabase.from("record_community_statements").select("author_user_id").eq("record_id", recordId),
            supabase.from("record_votes").select("user_id").eq("record_id", recordId),
            supabase.from("record_debate_messages").select("author_user_id").eq("record_id", recordId),
          ]);
          const allIds = [...new Set([
            ...(stmtUsers.data ?? []).map((r: any) => r.author_user_id),
            ...(voteUsers.data ?? []).map((r: any) => r.user_id),
            ...(debateUsers.data ?? []).map((r: any) => r.author_user_id),
          ].filter(Boolean))];
          if (allIds.length) {
            const { data: allBadges } = await supabase.from("badges").select("user_id, label, icon").in("user_id", allIds);
            const map: Record<string, { label: string; icon: string }[]> = {};
            (allBadges ?? []).forEach((b: any) => {
              if (!map[b.user_id]) map[b.user_id] = [];
              // dedupe by label per user
              if (!map[b.user_id].find((x: any) => x.label === b.label)) {
                map[b.user_id].push({ label: b.label, icon: b.icon });
              }
            });
            setParticipantBadges(map);
          }
        } catch (e) {
          console.error("Failed to load participant badges:", e);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load record");
        setRecord(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRecordRef.current = fetchRecord;
    fetchRecord();
  }, [recordId]);

  useEffect(() => {
    if (!recordId) return;

    const channel = supabase
      .channel(`record:${recordId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "records", filter: `id=eq.${recordId}` }, async () => {
        await fetchRecordRef.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h1 className="text-xl font-semibold mb-3">{error}</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const subject = record.subject;

  const contributorId =
    (record as any)?.contributor?.id ?? (record as any)?.contributor?.[0]?.id ?? null;
  const reveal = shouldRevealContributorIdentity(record);

  const contributorProfileHref = reveal && contributorSubjectId
      ? `/subject/${contributorSubjectId}`
      : null;

  const contributorRealName = `${contributorProfile?.first_name ?? ""} ${contributorProfile?.last_name ?? ""}`.trim();
  const contributorPublicName = reveal ? contributorRealName || "Individual Contributor" : "SuperHero123";

  const contributorSelfName =
    `${viewerProfile?.first_name ?? ""} ${viewerProfile?.last_name ?? ""}`.trim() || "Individual Contributor";

  const contributorSelf = {
    name: reveal ? `${contributorSelfName} (You)` : "SuperHero123 (You)",
    avatarUrl: reveal ? viewerProfile?.avatar_url ?? null : null,
  };

  const contributorPublic = {
    name: contributorPublicName,
    avatarUrl: reveal ? contributorProfile?.avatar_url ?? null : null,
    linkAllowed: reveal,
  };

  const subjectName = (subject?.name as string) || "Subject";
  const subjectProfileHref = subject?.subject_uuid ? `/subject/${subject.subject_uuid}` : null;

  const contributorLinkAllowedForViewer = canShowContributorProfileLink(record);

  const view = makeViewState({
    viewerRole: effectiveViewerRole,
    record,

    subjectName,
    subjectProfileHref,

    contributorPublic,
    contributorSelf,
    contributorProfileHref,

    contributorLinkAllowedForViewer,
  });

  return (
    <div
      className={
        embedded
          ? "w-full overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 space-y-3 sm:space-y-4"
          : "mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-2 sm:px-4 sm:py-4 space-y-3 sm:space-y-4"
      }
    >
      {!embedded && (
        <div className="flex items-center gap-2 mb-1 px-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">Record Detail</h1>
        </div>
      )}

      {/* ✅ Admin-only Test View Panel */}
      {isAdmin && !embedded ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Admin Test View</div>
              <div className="text-xs text-gray-500">
                Override how this page renders (UI-only). This does not change DB permissions.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTestViewEnabled((v) => !v)}
              className={[
                "inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold",
                testViewEnabled ? "bg-black text-white border-black" : "bg-white text-gray-800 hover:bg-gray-50",
              ].join(" ")}
            >
              Test view: {testViewEnabled ? "On" : "Off"}
            </button>
          </div>

          {testViewEnabled ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700">View as</span>
                <select
                  value={forcedViewerRole}
                  onChange={(e) => setForcedViewerRole(e.target.value as ViewerRole)}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="public">Public</option>
                  <option value="citizen">Citizen</option>
                  <option value="voter">Voter</option>
                  <option value="subject">Subject</option>
                  <option value="contributor">Contributor</option>
                </select>

                {forcedViewerRole !== "public" ? (
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-700">Act as</span>
                        <select
                        value={actingAuthUserId ?? ""}
                        onChange={(e) => setActingAuthUserId(e.target.value || null)}
                        className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-gray-900"
                        >
                        {testActors
                            .filter((a) => a.role === forcedViewerRole)
                            .map((a) => (
                            <option key={a.id} value={a.auth_user_id}>
                                {a.label}
                            </option>
                            ))}
                        </select>
                    </div>
                ) : null}
              </div>

              <div className="text-xs text-gray-500">
                Actual role: <span className="font-semibold text-gray-800">{viewerLabel(viewerRole)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
      <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white relative">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Subject</h2>
          </div>

          <button
            type="button"
            onClick={() => openReport("subject", subject?.subject_uuid ?? "", subject?.name ?? "Subject")}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
            title="Report subject"
          >
            <ShieldAlert className="h-3 w-3" />
            Report
          </button>

          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-gray-600" />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 break-words leading-tight">
                {subject?.name}
                {subject?.nickname && <span className="text-gray-500 ml-1">({subject.nickname})</span>}
              </p>

              <p className="text-sm text-gray-600">
                {(record?.organization || subject?.organization || "Independent")} •{" "}
                {(record?.location || subject?.location || "Unknown Location")}
              </p>

              {view.subject.href ? (
                <Link href={view.subject.href} className="text-blue-600 hover:underline text-sm mt-1 block">
                  View Profile →
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white relative">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">Contributor</h2>
          </div>

          <button
            type="button"
            onClick={() => openReport("contributor", contributorId ?? "", view.contributor.name)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
            title="Report contributor"
          >
            <ShieldAlert className="h-3 w-3" />
            Report
          </button>

          <div className="flex items-start gap-4">
            {(() => {
              const avatarUrl = view.contributor.avatarUrl;
              const name = view.contributor.name;
              const href = view.contributor.href;

              const avatar = (
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Contributor avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-gray-600" />
                  )}
                </div>
              );

              return (
                <>
                  {href ? (
                    <Link href={href} className="hover:opacity-90">
                      {avatar}
                    </Link>
                  ) : (
                    avatar
                  )}

                  <div className="min-w-0">
                    {href ? (
                      <Link href={href} className="block text-lg font-semibold text-gray-900 break-words leading-tight hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold text-gray-900 break-words leading-tight">{name}</p>
                    )}

                    {contributorBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(() => {
                          const counts: Record<string, { icon: string; label: string; count: number }> = {};
                          contributorBadges.forEach((b) => {
                            if (!counts[b.label]) counts[b.label] = { icon: b.icon, label: b.label, count: 0 };
                            counts[b.label].count++;
                          });
                          return Object.values(counts).map((b) => (
                            <span key={b.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-700 font-medium">
                              {b.icon} {b.label}
                            </span>
                          ));
                        })()}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Submitted this record</p>
                    {reveal && contributorSubjectId && (
                      <Link href={`/subject/${contributorSubjectId}`} className="text-blue-600 hover:underline text-sm mt-1 block">
                        View Profile →
                      </Link>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Submitted Record</h2>

          {(() => {
            const raw = (record.credibility || "").toString().trim();

            const label = raw.includes("Evidence-Based")
              ? "Evidence-Based"
              : raw.includes("Opinion-Based")
              ? "Opinion-Based"
              : raw.includes("Unable to Verify") || raw.includes("unable")
              ? "Unable to Verify"
              : raw.includes("Unclear")
              ? "Unclear"
              : raw
              ? raw
              : "Pending AI Review";

            const badgeStyle =
              label === "Evidence-Based"
                ? "bg-green-50 text-green-700 border-green-200"
                : label === "Opinion-Based"
                ? "bg-red-50 text-red-700 border-red-200"
                : label === "Unable to Verify" || label === "Unclear"
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-gray-50 text-gray-600 border-gray-200";

            const CredibilityIcon =
              label === "Evidence-Based" ? CheckCircle
              : label === "Opinion-Based" ? AlertTriangle
              : label === "Unable to Verify" || label === "Unclear" ? AlertTriangle
              : null;

            const iconColor =
              label === "Evidence-Based" ? "text-green-600"
              : label === "Opinion-Based" ? "text-red-600"
              : label === "Unable to Verify" || label === "Unclear" ? "text-yellow-600"
              : "";

            return (
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs text-gray-500">
                <span>AI Credibility Recommendation:</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${badgeStyle}`}>
                  {CredibilityIcon && <CredibilityIcon size={11} className={iconColor} />}
                  {label}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Submitted</span>
            <span className="text-gray-900">{formatMMDDYYYY(record.created_at)}</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-gray-500 shrink-0">Record ID</span>
            <span className="font-mono text-[12px] text-gray-900 break-words whitespace-normal leading-tight">{shortId(record.id)}</span>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(record.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch (e) {
                  console.error("Copy failed", e);
                }
              }}
              title="Copy record ID"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 active:bg-gray-100 shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {copied && (
              <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                Copied
              </span>
            )}

            <button
              type="button"
              onClick={togglePin}
              disabled={pinLoading}
              title={pinned ? "Unpin record" : "Pin record"}
              className={`inline-flex items-center justify-center rounded-full border p-1.5 shrink-0 transition ${
                pinned
                  ? "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              <Pin className="h-3.5 w-3.5" fill={pinned ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={toggleFollow}
              disabled={followLoading}
              title={following ? "Unfollow record" : "Follow record for updates"}
              className={`inline-flex items-center justify-center rounded-full border p-1.5 shrink-0 transition ${
                following
                  ? "bg-green-50 border-green-300 text-green-600 hover:bg-green-100"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              <Eye className="h-3.5 w-3.5" fill={following ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              title="Share record"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1.5 shrink-0 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="pt-2">
          <LifecycleChips stage={getEffectiveStage(record, serverOffsetMs)} viewerRole={effectiveViewerRole} />
        </div>

        <div className="flex items-center gap-1.5 text-yellow-500">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star key={i} size={18} className={record.rating >= i + 1 ? "fill-current text-gray-900" : "text-gray-300"} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Category:</span>
            <span className="text-gray-900">{record.category}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{record.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">Relationship:</span>
            <span className="text-gray-900">{record.relationship}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-900 mb-2">Experience Details</div>
          <div className="text-[15px] text-gray-800 whitespace-pre-wrap break-words leading-7">
           {record.description}
          </div>
        </div>

        <div className="mt-3">
            <AgreeDisagree
                targetType="records"
                targetId={String(record.id)}
                disabled={!sessionUserId}
                size={26}
            />
        </div>

        {unifiedAttachments.length > 0 ? (
          view.canViewAttachments ? (
            <AttachmentSection title="Attachments" attachments={unifiedAttachments} getNumberForPath={getNumberForPath} />
          ) : (
            <div className="pt-4 border-t text-sm text-gray-700">
              <span className="font-semibold">Attachments:</span> {unifiedAttachments.length} file(s)
              <div className="text-xs text-gray-500 mt-1">Sign in as the subject or contributor to view attachments.</div>
            </div>
          )
        ) : null}

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => openReport("record", record.id, `Record ${shortId(record.id)}`)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
            title="Report this record for safety"
          >
            <ShieldAlert className="h-3 w-3" />
            Report this record
          </button>
        </div>
      </div>

      <DebateCourtroom
        record={record}
        viewerRole={effectiveViewerRole}
        serverOffsetMs={serverOffsetMs}
        subjectName={subjectName}
        subjectProfileHref={subjectProfileHref}
        contributorPublic={contributorPublic}
        contributorSelf={contributorSelf}
        contributorProfileHref={
            contributorProfileHref &&
            (effectiveViewerRole === "contributor" || contributorPublic.linkAllowed)
            ? contributorProfileHref
            : null
        }
        getNumberForPath={getNumberForPath}
        onDebateAttachmentsFlat={(rows) => setDebateAttachmentsFlat(rows)}
        isImpersonating={isImpersonating}
        actingAuthUserId={actingAuthUserId}
        participantBadges={participantBadges}
      />

      <VotingCourtroom
                record={record}
                viewerRoleUI={effectiveViewerRole}
                viewerRoleLocked={testViewEnabled ? effectiveViewerRole : viewerRole}
                serverOffsetMs={serverOffsetMs}
                isImpersonating={isImpersonating}
                actingAuthUserId={actingAuthUserId}
                participantBadges={participantBadges}
                onReport={openReport}
                />

{reportOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
                  onClick={() => setReportOpen(false)}
                >
                  <div
                    className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-gray-900">Report for Safety</span>
                      </div>
                      <button type="button" onClick={() => setReportOpen(false)}
                        className="rounded-full border p-1.5 text-gray-600 hover:bg-gray-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {reportDone ? (
                      <div className="text-center py-6">
                        <ShieldAlert className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="font-semibold text-gray-900">Report submitted</div>
                        <div className="text-xs text-gray-500 mt-1">Our team will review this shortly.</div>
                        <button
                          type="button"
                          onClick={() => setReportOpen(false)}
                          className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-gray-500 mb-4">
                          Reporting: <span className="font-semibold text-gray-800">{reportTargetLabel}</span>
                        </div>

                        <div className="text-xs font-semibold text-gray-900 mb-2">Why are you reporting this?</div>
                        <div className="space-y-2 mb-4">
                          {[
                            "Harassment or bullying",
                            "Hate speech or discrimination",
                            "Threats or violence",
                            "False or misleading information",
                            "Spam or irrelevant content",
                            "Privacy violation",
                            "Inappropriate or explicit content",
                            "Other safety concern",
                          ].map((reason) => (
                            <label key={reason} className="flex items-center gap-2.5 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={reportReason.includes(reason)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setReportReason((prev) =>
                                      prev ? `${prev}\n${reason}` : reason
                                    );
                                  } else {
                                    setReportReason((prev) =>
                                      prev
                                        .split("\n")
                                        .filter((r) => r !== reason)
                                        .join("\n")
                                    );
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-red-600 accent-red-600"
                              />
                              <span className="text-sm text-gray-700 group-hover:text-gray-900">{reason}</span>
                            </label>
                          ))}
                        </div>

                        <div className="text-xs font-semibold text-gray-900 mb-1">Additional details <span className="font-normal text-gray-400">(optional)</span></div>
                        <textarea
                          value={reportReason.split("\n").filter((r) => ![
                            "Harassment or bullying",
                            "Hate speech or discrimination",
                            "Threats or violence",
                            "False or misleading information",
                            "Spam or irrelevant content",
                            "Privacy violation",
                            "Inappropriate or explicit content",
                            "Other safety concern",
                          ].includes(r)).join("\n")}
                          onChange={(e) => {
                            const checked = reportReason
                              .split("\n")
                              .filter((r) => [
                                "Harassment or bullying",
                                "Hate speech or discrimination",
                                "Threats or violence",
                                "False or misleading information",
                                "Spam or irrelevant content",
                                "Privacy violation",
                                "Inappropriate or explicit content",
                                "Other safety concern",
                              ].includes(r));
                            const newText = e.target.value;
                            setReportReason(newText ? [...checked, newText].join("\n") : checked.join("\n"));
                          }}
                          rows={3}
                          placeholder="Describe any additional context…"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-red-300 resize-none"
                        />

                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReportOpen(false)}
                            className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={submitReport}
                            disabled={reportSubmitting || !reportReason.trim()}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-2"
                          >
                            {reportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                            {reportSubmitting ? "Submitting…" : "Submit Report"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}  

              {shareOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
                  onClick={() => setShareOpen(false)}
                >
                  <div
                    className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-gray-900">Share Record</div>
                      <button type="button" onClick={() => setShareOpen(false)}
                        className="rounded-full border p-1.5 text-gray-600 hover:bg-gray-100">
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
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(recordUrl)}`}
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