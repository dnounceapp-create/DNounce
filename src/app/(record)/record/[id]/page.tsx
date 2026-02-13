"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { stageConfig } from "@/config/stageConfig";

const PUBLIC_STAGE_ORDER = [3, 6, 7] as const;
const FULL_STAGE_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;
const POST_PUBLISH_STAGE_ORDER = [3, 4, 5, 6, 7] as const;

function getVisibleStageOrder(args: {
  viewerRole: ViewerRole;
  record: any;
}) {
  const { viewerRole, record } = args;

  // public gets the simplified track only
  if (viewerRole === "public") return PUBLIC_STAGE_ORDER as readonly number[];

  // contributor + subject can see full workflow
  if (viewerRole === "contributor" || viewerRole === "subject")
    return FULL_STAGE_ORDER as readonly number[];

  // voter + citizen: only after publication stages
  // but if the record never reaches 4, don't show 4–7
  const stage = getRecordStage(record);

  if (stage < 4) return ([3] as const) as readonly number[];

  return POST_PUBLISH_STAGE_ORDER as readonly number[];
}


const LIFECYCLE_COPY: Record<
  number,
  {
    what: string;
    subject: string;
    contributor: string;
    voter: string;
    citizen: string;
  }
> = {
  1: {
    what: "The record is submitted; DNounce AI reviews evidence strength, tone, and credibility before publication (up to 72h).",
    subject: "No access yet — record not visible.",
    contributor: "Can view in “Records Submitted”; cannot edit but can delete.",
    voter: "Not applicable yet.",
    citizen: "Not visible.",
  },
  2: {
    what: "After AI completes, the subject is notified. Record remains private while both parties can view with AI credibility label.",
    subject: "Can privately view and prepare evidence before publication.",
    contributor: "Can review privately and refine sources or tone.",
    voter: "Not active yet.",
    citizen: "Not visible.",
  },
  3: {
    what: "Record is published publicly with AI credibility label (after AI window + timing rules).",
    subject: "Can request deletion (dispute) or comment under moderation rules.",
    contributor: "Can delete their own record if desired.",
    voter: "Not active unless escalated.",
    citizen: "Can interact publicly until escalation occurs.",
  },
  4: {
    what: "Subject requests deletion; system locks for dispute setup and notifies contributor.",
    subject: "Triggers escalation.",
    contributor: "Prepares response.",
    voter: "View-only.",
    citizen: "View-only (interactions locked once escalated).",
  },
  5: {
    what: "Both parties argue the case with evidence (72h from dispute notification).",
    subject: "Submit arguments/evidence supporting deletion.",
    contributor: "Defend post with sources/reasoning.",
    voter: "View-only.",
    citizen: "View-only (no comments/reactions during dispute).",
  },
  6: {
    what: "Community voting opens (48h) to decide keep/delete based on debate outcomes.",
    subject: "Can view progress but not interact.",
    contributor: "Can observe voting but cannot intervene.",
    voter: "Can vote (keep/delete) + short reasoning required.",
    citizen: "Can view; may vote if eligible, otherwise view-only.",
  },
  7: {
    what: "Final decision implemented. If deleted, privacy protections reactivate; if kept, record remains under anonymized format.",
    subject: "Can view final outcome immediately; can interact again after 1 week.",
    contributor: "Can view final outcome immediately; can interact again after 1 week.",
    voter: "Can see final result; no more voting; can interact again.",
    citizen: "Can view and interact publicly as final archive.",
  },
};

function isSubjectDisputeFlow(record: any): boolean {
  const status = normalizeStatus(record?.status);

  // These are YOUR dispute statuses (from getRecordStage)
  return [
    "deletion_request",
    "deletion_requested",
    "intake",
    "dispute_intake",
    "debate",
    "subject_dispute",
    "dispute_debate",
    "active_dispute",
    "voting",
    "voting_in_progress",
    "final",
    "resolved",
    "closed",
    "anonymity_active",
  ].includes(status);
}

function DominoStageRow({ stage, record }: { stage: number; record: any }) {
  const visibleStages = isSubjectDisputeFlow(record)
    ? PUBLIC_STAGE_ORDER
    : ([3] as const);

  function getStageForUI(realStage: number) {
    const prev = [...visibleStages].reverse().find((s) => s <= realStage);
    return prev ?? visibleStages[0];
  }

  const stageForUI = getStageForUI(stage);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {visibleStages.map((id) => {
          const isActive = id === stageForUI;

          return (
            <div
              key={id}
              title={stageConfig[id].label}
              className={[
                "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1",
                "text-[10px] sm:text-[11px] font-semibold",
                "transition",
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-300",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-white" : "bg-gray-300",
                ].join(" ")}
              />
              <span className="max-w-[72vw] sm:max-w-[220px] truncate">
                {stageConfig[id].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getVisibleStagesForViewer(args: {
  viewerRole: ViewerRole;
  stage: number;
}) {
  const { viewerRole, stage } = args;
  const current = Math.min(7, Math.max(1, stage || 1));

  // Rule: "if it never reaches step 4, never display stages 4–7"
  // => while current < 4, the max visible is 3.
  const maxStage = current < 4 ? 3 : 7;

  // Role rules
  if (viewerRole === "public") {
    // public only 3,6,7 but obey maxStage cutoff
    return ([3, 6, 7] as const).filter((s) => s <= maxStage);
  }

  if (viewerRole === "contributor" || viewerRole === "subject") {
    // full 1-7 but obey maxStage cutoff
    return FULL_STAGE_ORDER.filter((s) => s <= maxStage);
  }

  // voter & citizen: only 3-7 but obey maxStage cutoff
  return ([3, 4, 5, 6, 7] as const).filter((s) => s <= maxStage);
}

/**
 * ✅ Single clean tracker (NO extra text, NO detail panels, NO clicking)
 * Fits page: wraps on small screens, full stage names shown, truncates only if needed.
 */
function LifecycleChips({
  stage,
  viewerRole,
}: {
  stage: number;
  viewerRole: ViewerRole;
}) {

  const current = Math.min(7, Math.max(1, stage || 1));
  const visibleStages = getVisibleStagesForViewer({ viewerRole, stage: current });

  return (
    <div className="rounded-2xl border bg-white px-2 py-2 sm:px-3 sm:py-2 shadow-sm">
      {/* ✅ single horizontal row, never wraps */}
      <div className="flex flex-nowrap items-stretch gap-1">
        {visibleStages.map((id, idx) => {
          const isActive = id === current;
          const isDone = id < current;

          return (
            <div key={id} className="flex items-stretch min-w-0 flex-1">
              {/* ✅ stage chip: fixed height so every chip is identical */}
              <div
                title={stageConfig[id]?.label ?? `Stage ${id}`}
                className={[
                  "min-w-0 w-full rounded-2xl border",
                  "px-1.5 py-1.5 sm:px-2 sm:py-2",
                  "text-center flex items-center justify-center",
                  "h-12 sm:h-14", // ✅ force equal chip height
                  isActive
                    ? "bg-black text-white border-black"
                    : isDone
                    ? "bg-gray-50 text-gray-700 border-gray-200"
                    : "bg-white text-gray-500 border-gray-200",
                ].join(" ")}
              >
                {/* ✅ 2-line clamp, centered */}
                <div className="text-[9px] sm:text-[10px] font-semibold leading-[1.1] line-clamp-2">
                  {stageConfig[id]?.label ?? `Stage ${id}`}
                </div>
              </div>

              {/* ✅ arrow lives OUTSIDE the flex-1 sizing so chip widths stay identical */}
              {idx < visibleStages.length - 1 && (
                <div className="shrink-0 w-3 sm:w-4 flex items-center justify-center text-gray-300 select-none">
                  <span className="text-[10px] sm:text-xs">›</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactLifecycle({
  stage,
  viewerRole,
}: {
  stage: number;
  viewerRole: ViewerRole;
}) {
  const current = Math.min(7, Math.max(1, stage || 1));
  const [selected, setSelected] = useState<number>(current);

  useEffect(() => {
    setSelected(current);
  }, [current]);

  const copy = lifecycleCopy(selected);

  const myActions = viewerRole === "subject" ? copy.subject : copy.contributor;

  return (
    <div className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {FULL_STAGE_ORDER.map((id) => {
          const isCurrent = id === current;
          const isSelected = id === selected;
          const isDone = id < current;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={[
                "rounded-xl border px-2.5 py-2 text-left transition",
                isSelected
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    isCurrent
                      ? "bg-black text-white"
                      : isDone
                      ? "bg-gray-200 text-gray-800"
                      : "bg-gray-100 text-gray-700",
                  ].join(" ")}
                >
                  {id}
                </span>

                <span className="text-[11px] font-semibold text-gray-900 truncate">
                  {stageConfig[id]?.label ?? `Stage ${id}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border bg-gray-50 p-4">
        <div className="text-sm font-semibold text-gray-900">
          {stageConfig[selected]?.label ?? `Stage ${selected}`}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-white p-3">
            <div className="text-xs font-semibold text-gray-900">Your actions</div>
            <div className="mt-1 text-sm text-gray-700 leading-relaxed">
              {myActions}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3">
            <div className="text-xs font-semibold text-gray-900">Other party</div>
            <div className="mt-1 text-sm text-gray-700 leading-relaxed">
              {viewerRole === "subject" ? copy.contributor : copy.subject}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function shouldRevealContributorIdentity(record: any): boolean {
  const cred = normalizeCredibility(record?.credibility);
  const choseName = record?.contributor_identity_preference === true;

  // ✅ "Choose to display Name" overrides everything
  if (choseName) return true;

  // ✅ Opinion-Based always shows real name (preference ignored)
  if (cred === "Opinion-Based") return true;

  // ✅ Evidence-Based only shows real name if user chose it
  if (cred === "Evidence-Based") return false; // since choseName already handled above

  // ✅ Unclear / Pending / anything else => alias
  return false;
}

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function normalizeStatus(raw: any) {
  return (raw || "").toString().trim().toLowerCase();
}

function getRecordStage(record: any): number {
  const status = normalizeStatus(record?.status);

  // ✅ Use DB status as the source of truth (your enum maps perfectly to stages)
  if (status === "ai_verification") return 1;
  if (status === "subject_notified") return 2;
  if (status === "published") return 3;
  if (status === "deletion_request") return 4;
  if (status === "debate") return 5;
  if (status === "voting") return 6;
  if (status === "decision") return 7;

  // ------------------------------
  // Fallback (your existing logic)
  const aiDone = !!record?.ai_completed_at;
  const isPublished = record?.is_published === true || !!record?.published_at;

  if (!aiDone) return 1;
  if (aiDone && !isPublished) return 2;
  return 3;
}

function normalizeCredibility(raw: any) {
  const s = (raw || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—−]/g, "-"); // normalize weird dashes

  if (s.includes("evidence-based") || s.includes("evidence based"))
    return "Evidence-Based";
  if (s.includes("opinion-based") || s.includes("opinion based"))
    return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending AI Review";
}

function getContributorDisplayName(record: any): string {
  const reveal = shouldRevealContributorIdentity(record);

  const fullName = ""; // public anon view does not fetch real name

  if (reveal) {
    return fullName || "Individual Contributor";
  }

  return "SuperHero123";
}

function getContributorDisplayForViewer(args: {
  record: any;
  viewerRole: ViewerRole;
  viewerProfile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}) {
  const { record, viewerRole, viewerProfile } = args;

  const reveal = shouldRevealContributorIdentity(record);

  if (viewerRole !== "contributor") {
    return {
      name: getContributorDisplayName(record),
      avatarUrl: null,
    };
  }

  const realName =
    `${viewerProfile?.first_name ?? ""} ${viewerProfile?.last_name ?? ""}`.trim() ||
    "Individual Contributor";

  if (reveal) {
    return {
      name: `${realName} (You)`,
      avatarUrl: viewerProfile?.avatar_url ?? null,
    };
  }

  return {
    name: `SuperHero123 (You)`,
    avatarUrl: null,
  };
}

function lifecycleCopy(stage: number) {
  const map: Record<
    number,
    {
      subject: string;
      contributor: string;
    }
  > = {
    1: {
      subject: "No access yet — record isn’t visible.",
      contributor: "View in Records Submitted. You can’t edit, but you can delete.",
    },
    2: {
      subject: "Privately view and prepare a response or evidence.",
      contributor: "Privately review and refine sources/tone if needed.",
    },
    3: {
      subject: "Can request deletion (dispute) or comment under moderation rules.",
      contributor: "Can delete your own record if desired.",
    },
    4: {
      subject: "Deletion requested — dispute intake begins.",
      contributor: "Prepare your response and evidence.",
    },
    5: {
      subject: "Submit arguments/evidence supporting deletion.",
      contributor: "Defend the record with sources and reasoning.",
    },
    6: {
      subject: "View progress only — voting is in progress.",
      contributor: "View progress only — voting is in progress.",
    },
    7: {
      subject: "Finalized outcome applied. Interactions return after cooldown.",
      contributor: "Finalized outcome applied. Interactions return after cooldown.",
    },
  };

  return map[stage] ?? map[1];
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

type ViewerRole = "public" | "contributor" | "subject" | "voter" | "citizen";

function resolveViewerRole(args: {
  sessionUserId: string;
  record: any;
  hasVote: boolean;
}): ViewerRole {
  const { sessionUserId, record, hasVote } = args;

  const contributorUserId =
    record?.contributor?.user_id ?? record?.contributor?.[0]?.user_id ?? null;

  if (contributorUserId && contributorUserId === sessionUserId) return "contributor";

  const subjectUserId = record?.subject?.owner_auth_user_id ?? null;

  if (subjectUserId && subjectUserId === sessionUserId) return "subject";

  if (hasVote) return "voter";

  return "citizen";
}

export default function RecordPage() {
  const params = useParams<{ id: string }>();
  const recordId = params?.id;
  const fetchRecordRef = useRef<null | (() => Promise<void>)>(null);

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewerRole, setViewerRole] = useState<ViewerRole>("public");
  const [viewerProfile, setViewerProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // ✅ Store the exact same fetch logic in a ref so realtime can trigger it without changing logic.

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
            return;
          }

          setViewerRole("public");
          setRecord(json);
          setCurrentStage(getRecordStage(json));
          return;
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
            attachments:record_attachments(id),
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

        const record = data[0];

        const sessionUserId = session.user.id;

        const { data: acct, error: acctErr } = await supabase
          .from("user_accountdetails")
          .select("first_name,last_name,avatar_url")
          .eq("user_id", sessionUserId)
          .maybeSingle();

        if (acctErr) console.warn("accountdetails fetch failed:", acctErr.message);

        setViewerProfile({
          first_name: acct?.first_name ?? null,
          last_name: acct?.last_name ?? null,
          avatar_url: acct?.avatar_url ?? null,
        });

        const { data: voteRow, error: voteError } = await supabase
          .from("record_votes")
          .select("id")
          .eq("record_id", recordId)
          .eq("user_id", sessionUserId)
          .maybeSingle();

        if (voteError) {
          console.warn("vote check failed:", voteError.message);
        }

        const hasVote = !!voteRow?.id;

        const role = resolveViewerRole({
          sessionUserId,
          record,
          hasVote,
        });

        setViewerRole(role);

        setRecord(record);
        setCurrentStage(getRecordStage(record));
      } catch (e: any) {
        setError(e?.message || "Failed to load record");
        setRecord(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRecordRef.current = fetchRecord;
    fetchRecordRef.current = fetchRecord;
    fetchRecord();
  }, [recordId]);

  // ✅ Live DB updates: on any record UPDATE, re-run the same fetch logic
  // (so you keep subject/contributor joins and don’t break the UI).
  useEffect(() => {
    if (!recordId) return;
  
    const channel = supabase
      .channel(`record:${recordId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // ✅ listen to all changes while debugging
          schema: "public",
          table: "records",
          filter: `id=eq.${recordId}`,
        },
        async (payload) => {
          console.log("✅ realtime payload:", payload);
          await fetchRecordRef.current?.();
        }
      )
      .subscribe((status) => {
        console.log("📡 realtime status:", status);
      });
  
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Record Detail</h1>
      </div>

      {/* ================= ROLE SECTIONS ================= */}
      {viewerRole === "subject" && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Subject Actions</div>
          <div className="mt-2 text-sm text-gray-600">
            This record is about you. You can dispute it, submit evidence, or request
            removal.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Start a dispute (future)
            </button>
            <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Upload evidence (future)
            </button>
          </div>
        </div>
      )}

      {viewerRole === "voter" && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Your Vote</div>
          <div className="mt-2 text-sm text-gray-600">
            You already submitted a vote on this record. Your role is locked to voter
            for this record.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              View my vote (future)
            </button>
          </div>
        </div>
      )}

      {viewerRole === "citizen" && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Community Member</div>
          <div className="mt-2 text-sm text-gray-600">
            You’re signed in but not the contributor or subject. If this record enters
            voting, you may vote once.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Follow record (future)
            </button>
          </div>
        </div>
      )}

      {/* Subject + Contributor Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* SUBJECT CARD */}
        <div className="border rounded-2xl p-5 shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Subject</h2>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-gray-600" />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">
                {subject?.name}
                {subject?.nickname && (
                  <span className="text-gray-500 ml-1">({subject.nickname})</span>
                )}
              </p>

              <p className="text-sm text-gray-600">
                {(record?.organization || subject?.organization || "Independent")} •{" "}
                {(record?.location || subject?.location || "Unknown Location")}
              </p>

              <Link
                href={`/subject/${subject?.subject_uuid}`}
                className="text-blue-600 hover:underline text-sm"
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* CONTRIBUTOR CARD */}
        <div className="border rounded-2xl p-5 shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Contributor</h2>
          </div>

          <div className="flex items-start gap-4">
            {(() => {
              const display = getContributorDisplayForViewer({
                record,
                viewerRole,
                viewerProfile,
              });

              return (
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {display.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={display.avatarUrl}
                      alt="Contributor avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-gray-600" />
                  )}
                </div>
              );
            })()}

            <div className="min-w-0">
              {(() => {
                const display = getContributorDisplayForViewer({
                  record,
                  viewerRole,
                  viewerProfile,
                });

                return (
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {display.name}
                  </p>
                );
              })()}

              {(() => {
                const contributorId =
                  record?.contributor?.id ?? record?.contributor?.[0]?.id ?? null;

                return contributorId ? (
                  <Link
                    href={`/contributor/${contributorId}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Profile →
                  </Link>
                ) : null;
              })()}

              {record.also_known_as &&
                (normalizeCredibility(record?.credibility) === "Opinion-Based" ||
                  record?.contributor_identity_preference === true) && (
                  <p className="text-sm text-gray-500 truncate">
                    ({record.also_known_as})
                  </p>
                )}

              {(() => {
                const isOverrideName = record?.contributor_identity_preference === true;
                const cred = normalizeCredibility(record?.credibility);

                if (isOverrideName) return null;

                if (cred !== "Opinion-Based") {
                  return (
                    <p className="mt-1 text-xs text-gray-400">Anonymous contributor</p>
                  );
                }

                return null;
              })()}

              <p className="mt-1 text-xs text-gray-400">Submitted this record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Record Info */}
      <div className="border rounded-2xl p-5 shadow-md bg-white space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Submitted Record</h2>

          {/* Credibility badge (mobile-safe) */}
          {(() => {
            const raw = (record.credibility || "").toString().trim();

            const label = raw.includes("Evidence-Based")
              ? "Evidence-Based"
              : raw.includes("Opinion-Based")
              ? "Opinion-Based"
              : raw.includes("Unclear")
              ? "Unclear"
              : raw
              ? raw
              : "Pending AI Review";

            const badgeStyle =
              label === "Evidence-Based"
                ? "bg-green-50 text-green-800 border-green-200"
                : label === "Opinion-Based"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : label === "Unclear"
                ? "bg-yellow-50 text-yellow-900 border-yellow-200"
                : "bg-gray-50 text-gray-700 border-gray-200";

            const CredibilityIcon =
              label === "Evidence-Based"
                ? CheckCircle
                : label === "Opinion-Based"
                ? AlertTriangle
                : label === "Unclear"
                ? CircleAlert
                : null;

            const iconColor =
              label === "Evidence-Based"
                ? "text-green-600"
                : label === "Opinion-Based"
                ? "text-blue-600"
                : label === "Unclear"
                ? "text-yellow-600"
                : "";

            return (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {CredibilityIcon && (
                  <CredibilityIcon className={`w-4 h-4 ${iconColor}`} />
                )}
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${badgeStyle}`}
                >
                  Credibility Recommendation: {label}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-x-6 text-xs text-gray-600">
          <div>
            <span className="font-semibold text-gray-800">Submitted:</span>{" "}
            {formatMMDDYYYY(record.created_at)}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Record ID:</span>

            <span className="font-mono text-[11px]">{shortId(record.id)}</span>

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
              className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            <div className="min-w-[64px]">
              {copied && (
                <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Copied!
                </span>
              )}
            </div>
          </div>
        </div>

        {(viewerRole === "contributor" || viewerRole === "subject") && (
          <div className="pt-2">
            <LifecycleChips stage={getRecordStage(record)} viewerRole={viewerRole} />
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 text-yellow-500">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              size={22}
              className={
                record.rating >= i + 1 ? "fill-current text-black" : "text-gray-300"
              }
            />
          ))}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Category:</strong> {record.category}
        </div>

        <div className="text-sm text-gray-600 flex gap-2 items-center">
          <MapPin className="w-4 h-4" />
          {record.location}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Relationship:</strong> {record.relationship}
        </div>

        <div className="pt-3 border-t">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Experience Details
          </div>
          <div className="text-sm sm:text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">
            {record.description}
          </div>
        </div>

        {(record.attachments?.length ?? 0) > 0 && (
          <div className="pt-4 border-t text-sm text-gray-700">
            <span className="font-semibold">Attachments:</span>{" "}
            {record.attachments.length} file(s)
            <div className="text-xs text-gray-500 mt-1">Sign in to view attachments.</div>
          </div>
        )}
      </div>

      {viewerRole === "public" && (
        <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-center">
          <div className="text-sm font-semibold text-gray-900">Want the full record?</div>
          <div className="mt-1 text-xs text-gray-600">
            Copy the record ID and sign in to view additional details and participation
            options.
          </div>
        </div>
      )}
    </div>
  );
}
