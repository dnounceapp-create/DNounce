"use client";

import { CheckCircle, AlertTriangle, CircleAlert, Star } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Image from "next/image";
import { stageConfig, STAGE_ORDER } from "@/config/stageConfig";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_SORT = "Newest Submitted" as const;

type RecordItem = {
  id: string;
  contributor_alias: string;
  subject_name: string;
  submitted_at: string;
  stage: number | null;
  outcome: "keep" | "delete" | null;
  credibility: "Evidence-Based" | "Opinion-Based" | "Unable to Verify" | string;
  last_activity_at: string;
};

const outcomeLabels: Record<string, { label: string; color: string }> = {
  keep: { label: "Kept on page", color: "bg-green-200 text-green-800" },
  delete: { label: "Deleted from page", color: "bg-red-200 text-red-800" },
};

// Human labels for chips
const filterLabels: Record<string, string> = {
  status: "Status",
  time: "Time",
  credibilityrecord: "Credibility Record",
};

type FiltersState = { status?: string; time?: string; credibilityrecord?: string };

function RecordMeta({ record }: { record: RecordItem }) {
  const dateRef = useRef<HTMLParagraphElement>(null);

  return (
    <div className="flex flex-col items-start max-w-full">
      <p
        ref={dateRef}
        className="text-[11px] sm:text-xs text-gray-500 flex items-center gap-2"
      >
        Submitted • {timeAgo(record.submitted_at)} •{" "}
        {new Date(record.submitted_at).toLocaleDateString()}
      </p>
      <StageStepper current={record.outcome ? 7 : record.stage ?? 0} widthRef={dateRef} />
    </div>
  );
}

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "About 1 week ago";
  if (weeks < 5) return `About ${weeks} weeks ago`;

  const months = Math.floor(days / 30);
  if (months === 1) return "About 1 month ago";
  if (months < 12) return `About ${months} months ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "About 1 year ago" : `About ${years} years ago`;
}

function StageStepper({
  current,
  widthRef,
}: {
  current: number;
  widthRef: React.RefObject<HTMLParagraphElement | null>;
}) {
  const steps = [...STAGE_ORDER];
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (widthRef?.current) {
      setContainerWidth(widthRef.current.offsetWidth);
    }
  }, [widthRef]);

  // space available for connectors between circles
  const connectorWidth =
    containerWidth > 0 ? (containerWidth - steps.length * 20) / (steps.length - 1) : 24;

  return (
    <div className="mt-1 flex items-center gap-0" style={{ width: containerWidth }}>
      {steps.map((s, idx) => {
        const isDone = current > s;
        const isActive = current === s;

        return (
          <div key={s} className="flex items-center">
            <div
              className={[
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors",
                isActive
                  ? "bg-blue-500 text-white"
                  : isDone
                  ? "bg-blue-300 text-white"
                  : "bg-gray-200 text-gray-500",
              ].join(" ")}
            >
              {s}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-1 rounded-full ${isDone ? "bg-blue-300" : "bg-gray-200"}`}
                style={{ width: connectorWidth }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function statusToStage(status: string): number {
  const map: Record<string, number> = {
    ai_verification: 1,
    subject_notified: 2,
    published: 3,
    disputed: 4,
    debate: 5,
    voting: 6,
    decision: 7,
  };
  return map[status] ?? 1;
}

export default function MyRecordsPage() {
  const [filters, setFilters] = useState<FiltersState>({});
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [stats, setStats] = useState({ my_total_records: 0, kept: 0, deleted: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [disputeConfirmId, setDisputeConfirmId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeToast, setDisputeToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [disputeSuccessId, setDisputeSuccessId] = useState<string | null>(null);

  const [showLifecycleSurvey, setShowLifecycleSurvey] = useState(false);
  const [lifecycleSurveySubmitted, setLifecycleSurveySubmitted] = useState(false);
  const [lifecycleSurveySubmitting, setLifecycleSurveySubmitting] = useState(false);
  const [ls1Rating, setLs1Rating] = useState(0);
  const [ls1Text, setLs1Text] = useState("");
  const [ls2Rating, setLs2Rating] = useState(0);
  const [ls2Text, setLs2Text] = useState("");
  const [ls3Rating, setLs3Rating] = useState(0);
  const [ls3Text, setLs3Text] = useState("");
  const [ls4Rating, setLs4Rating] = useState(0);
  const [ls4Text, setLs4Text] = useState("");
  const [lsMissingText, setLsMissingText] = useState("");
  const [lsEmailConsent, setLsEmailConsent] = useState(false);
  const [lsEmail, setLsEmail] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: subjectData, error: subjectError } = await supabase
          .from("subjects")
          .select("subject_uuid")
          .eq("owner_auth_user_id", session.user.id)
          .maybeSingle();

        if (subjectError) {
          return;
        }
        if (!subjectData?.subject_uuid) {
          console.warn("No subject found for this user");
          return;
        }
        setSubjectId(subjectData.subject_uuid);

        console.log("✅ subjectUUID:", subjectData.subject_uuid);

        const { data: rawRecords, error: recordsError } = await supabase
          .from("records")
          .select(`
            id,
            record_alias,
            submitted_at,
            status,
            final_outcome,
            credibility,
            ai_vendor_1_result,
            contributor_display_name,
            contributor_identity_preference,
            subjects!inner(name)
          `)
          .eq("subject_id", subjectData.subject_uuid)
          .order("submitted_at", { ascending: false });

        if (!rawRecords) return;

        const mapped: RecordItem[] = rawRecords.map((r: any) => ({
          id: r.id,
          contributor_alias: (() => {
            const cred = r.ai_vendor_1_result || r.credibility || "";
            const reveal = (cred === "Opinion-Based" || cred === "opinion_based") || ((cred === "Evidence-Based" || cred === "evidence_based") && r.contributor_identity_preference === true);
            return reveal ? (r.contributor_display_name || "SuperHero123") : "SuperHero123";
          })(),
          subject_name: r.subjects?.name || "Unknown",
          submitted_at: r.submitted_at,
          stage: statusToStage(r.status),
          outcome: r.final_outcome || null,
          credibility: r.ai_vendor_1_result || r.credibility || "Pending",
          last_activity_at: r.submitted_at,
        }));

        setRecords(mapped);
        setStats({
          my_total_records: mapped.length,
          kept: mapped.filter((r) => r.outcome === "keep").length,
          deleted: mapped.filter((r) => r.outcome === "delete").length,
        });
      } catch (err) {
        console.error("Failed to fetch records:", err);
      } finally {
        setLoadingData(false);
      }
    }

    async function checkLifecycleSurvey() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        // Check if already completed
        const { data: existing } = await supabase
          .from("survey_completions")
          .select("id")
          .eq("user_id", userId)
          .eq("survey_type", "post_lifecycle")
          .maybeSingle();

        if (existing) return;

        // Check if user has completed all 4 roles on any record
        const [contributorRes, subjectRes, voterRes, citizenRes] = await Promise.all([
          supabase.from("contributors").select("id").eq("auth_user_id", userId).limit(1),
          supabase.from("subjects").select("subject_uuid").eq("owner_auth_user_id", userId).limit(1),
          supabase.from("record_votes").select("id").eq("user_id", userId).limit(1),
          supabase.from("record_community_statements").select("id").eq("author_user_id", userId).limit(1),
        ]);

        const hasAllRoles =
          (contributorRes.data?.length ?? 0) > 0 &&
          (subjectRes.data?.length ?? 0) > 0 &&
          (voterRes.data?.length ?? 0) > 0 &&
          (citizenRes.data?.length ?? 0) > 0;

        if (hasAllRoles) setShowLifecycleSurvey(true);
      } catch (e) {
        console.error("Lifecycle survey check failed:", e);
      }
    }

    fetchData();
    checkLifecycleSurvey();
  }, []);

  const hasActiveFilters = Object.keys(filters).length > 0;
  const hasNonDefaultSort = sort !== DEFAULT_SORT;
  const hasActive = hasActiveFilters || hasNonDefaultSort;

  const activeCount =
    (hasActiveFilters ? Object.keys(filters).length : 0) + (hasNonDefaultSort ? 1 : 0);

  // ---- Helpers to map filter values ---------------------------------------
  const statusToPredicate = (status?: string) => {
    if (!status) return () => true;

    const map: Record<string, (record: RecordItem) => boolean> = {
      "AI Verification": (record) => record.stage === 1,
      "Subject Notified": (record) => record.stage === 2,
      Published: (record) => record.stage === 3,
      "Deletion Request": (record) => record.stage === 4,
      Debate: (record) => record.stage === 5,
      Voting: (record) => record.stage === 6,
      Anonymity: (record) => record.stage === 7,
      Kept: (record) => record.outcome === "keep",
      Deleted: (record) => record.outcome === "delete",
    };
    return map[status] ?? (() => true);
  };

  const timeToPredicate = (time?: string) => {
    if (!time) return () => true;
    const now = Date.now();
    const days =
      time === "Last 24 hours" ? 1 : time === "Last 7 days" ? 7 : time === "Last 30 days" ? 30 : 0;
    if (!days) return () => true;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return (record: RecordItem) => new Date(record.submitted_at).getTime() >= cutoff;
  };

  const credibilityrecordToPredicate = (credibilityrecord?: string) => {
    if (!credibilityrecord) return () => true;
    return (record: RecordItem) => record.credibility === credibilityrecord;
  };

  // ---- Sorting comparator ---------------------------------------------------
  const sortComparator = (key: string): ((a: RecordItem, b: RecordItem) => number) => {
    switch (key) {
      case "Newest Submitted":
        return (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      case "Oldest Submitted":
        return (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      case "Stage (1 → 7)":
        return (a, b) => {
          if (a.stage == null && b.stage == null) return 0;
          if (a.stage == null) return 1;
          if (b.stage == null) return -1;
          return a.stage - b.stage;
        };
      case "Record ID":
        return (a, b) => a.id.localeCompare(b.id);
      case "Subject (A → Z)":
        return (a, b) => a.subject_name.localeCompare(b.subject_name);
      case "Last Activity":
        return (a, b) =>
          new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      default:
        return () => 0;
    }
  };

  // ---- Apply filters + sort -------------------------------------------------
  const displayRecords = useMemo(() => {
    const byStatus = statusToPredicate(filters.status);
    const byTime = timeToPredicate(filters.time);
    const byType = credibilityrecordToPredicate(filters.credibilityrecord);

    const filtered = records.filter(
      (record) => byStatus(record) && byTime(record) && byType(record)
    );
    const cmp = sortComparator(sort);
    return [...filtered].sort(cmp);
  }, [records, filters, sort]);

  const totalPages = Math.ceil(displayRecords.length / pageSize);
  const paginatedRecords = displayRecords.slice((page - 1) * pageSize, page * pageSize);

  const buildPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page > 3) pages.push(1, "…");
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("…", totalPages);
    }
    return pages;
  };

  const removeFilter = (key: keyof FiltersState) => {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
  };
  const clearFilters = () => setFilters({});
  const clearSort = () => setSort(DEFAULT_SORT);
  const clearAll = () => {
    setFilters({});
    setSort(DEFAULT_SORT);
  };

  const handleDisputeRecord = async (id: string) => {
    setDisputeConfirmId(null);
    setDisputingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not signed in.");

      // Update the record status to deletion_request
      const { error } = await supabase
        .from("records")
        .update({
          dispute_started_at: new Date().toISOString(),
          status: "deletion_request",
        })
        .eq("id", id)
        .eq("subject_id", subjectId ?? "");

      if (error) throw error;

      // Get the record to find contributor for notification
      const { data: rec } = await supabase
        .from("records")
        .select("contributor:contributors!records_contributor_id_fkey(user_id, auth_user_id)")
        .eq("id", id)
        .maybeSingle();

      const contributorAuthId = (rec?.contributor as any)?.auth_user_id;

      // Notify contributor
      if (contributorAuthId) {
        await supabase.from("notifications").insert({
          user_id: contributorAuthId,
          title: "Your record has been disputed",
          body: "The subject has requested deletion of a record you submitted. It has entered the deletion request stage.",
          type: "stage_4_contributor",
          record_id: id,
        });
      }

      // Update local state: move record to stage 4
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, stage: 4 } : r
        )
      );

      // Show success confirmation modal
      setDisputeSuccessId(id);
      setDisputeToast({ type: "success", msg: "Dispute submitted. The contributor has been notified." });
    } catch (err: any) {
      setDisputeToast({ type: "error", msg: err?.message || "Failed to submit dispute." });
    } finally {
      setDisputingId(null);
      setTimeout(() => setDisputeToast(null), 4000);
    }
  };


  async function submitLifecycleSurvey() {
    setLifecycleSurveySubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      await supabase.from("survey_responses").insert({
        user_id: userId,
        survey_type: "post_lifecycle",
        record_id: null,
        responses: {
          q1_rating: ls1Rating, q1_text: ls1Text,
          q2_rating: ls2Rating, q2_text: ls2Text,
          q3_rating: ls3Rating, q3_text: ls3Text,
          q4_rating: ls4Rating, q4_text: ls4Text,
          missing_text: lsMissingText,
        },
        email_consent: lsEmailConsent,
        email: lsEmailConsent ? lsEmail : null,
      });

      if (userId) {
        await supabase.from("survey_completions").insert({
          user_id: userId,
          survey_type: "post_lifecycle",
        });
      }

      setLifecycleSurveySubmitted(true);
    } catch (e) {
      console.error("Lifecycle survey submit failed:", e);
      setLifecycleSurveySubmitted(true);
    } finally {
      setLifecycleSurveySubmitting(false);
    }
  }

  // ---- UI -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">My Records</h1>
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">My Total Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {stats.my_total_records}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Kept Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {stats.kept}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Deleted Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {stats.deleted}
            </p>
          </div>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8 bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-gray-100">
          {/* Left: Filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
            <span className="col-span-2 sm:col-span-1 font-medium text-gray-700 text-sm">
              Filters
            </span>

            <select
              aria-label="Filter by status"
              className="border rounded-md px-3 py-2 text-sm hover:shadow-sm w-full sm:w-auto"
              value={filters.status || ""}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Status</option>
              <option>AI Verification</option>
              <option>Subject Notified</option>
              <option>Published</option>
              <option>Deletion Request</option>
              <option>Debate</option>
              <option>Voting</option>
              <option>Anonymity</option>
              <option>Kept</option>
              <option>Deleted</option>
            </select>

            <select
              aria-label="Filter by time"
              className="border rounded-md px-3 py-2 text-sm hover:shadow-sm w-full sm:w-auto"
              value={filters.time || ""}
              onChange={(e) => setFilters({ ...filters, time: e.target.value })}
            >
              <option value="">Time</option>
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>

            <select
              aria-label="Filter by credibility"
              className="border rounded-md px-3 py-2 text-sm hover:shadow-sm w-full sm:w-auto"
              value={filters.credibilityrecord || ""}
              onChange={(e) =>
                setFilters({ ...filters, credibilityrecord: e.target.value })
              }
            >
              <option value="">Credibility Record</option>
              <option>Evidence-Based</option>
              <option>Opinion-Based</option>
              <option>Unable to Verify</option>
            </select>

            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs sm:text-sm font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition w-full sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Right: Clear All + Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {hasActive && (
              <button
                onClick={clearAll}
                title="Clear all filters and sorting"
                className="px-3 py-2 text-xs sm:text-sm font-medium rounded-full bg-black text-white hover:bg-gray-800 transition w-full sm:w-auto"
              >
                Clear All
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 text-sm">Sort</span>
              <select
                aria-label="Sort records"
                className="border rounded-md px-3 py-2 text-sm hover:shadow-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option>Newest Submitted</option>
                <option>Oldest Submitted</option>
                <option>Stage (1 → 7)</option>
                <option>Record ID</option>
                <option>Subject (A → Z)</option>
                <option>Last Activity</option>
              </select>

              {hasNonDefaultSort && (
                <button
                  onClick={clearSort}
                  className="px-3 py-2 text-xs sm:text-sm font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                >
                  Clear Sort
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {Object.entries(filters).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(filters).map(([key, value]) =>
              value ? (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition"
                >
                  {filterLabels[key]}: {value}
                  <button
                    onClick={() => removeFilter(key as keyof FiltersState)}
                    aria-label={`Remove ${filterLabels[key]} filter`}
                    className="hover:bg-white/20 rounded-full p-0.5 transition"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Record List */}
        <div className="bg-white shadow rounded-xl border border-gray-100">
          {/* Header row — hidden on mobile */}
          <div className="hidden md:grid grid-cols-4 px-6 py-3 font-semibold text-gray-600 text-sm">
            <div>Record Name</div>
            <div className="text-center">Status</div>
            <div className="text-center">Credibility Record</div>
            <div className="flex justify-center">Dispute Record</div>
          </div>

          {loadingData ? (
            <div className="p-6 text-center text-gray-500">Loading records…</div>
          ) : displayRecords.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No records found against you.
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <div
                key={record.id}
                className="md:grid md:grid-cols-4 md:items-center gap-3 px-4 sm:px-6 py-4 md:py-5 border-t first:border-t-0 hover:bg-gray-50/50 transition"
              >
                {/* Mobile: stacked card header */}
                <div className="md:col-span-1">
                  <Link href={`/record/${record.id}`} className="font-medium text-gray-900 text-sm sm:text-base hover:underline">
                    {record.contributor_alias} • {record.subject_name}
                  </Link>
                  <p className="text-[11px] sm:text-xs text-gray-500">Record ID: {String(record.id).slice(0, 8)}…</p>

                  {/* date + stepper with shared width */}
                  <div className="mt-2">
                    <RecordMeta record={record} />
                  </div>
                </div>

                {/* Status */}
                <div className="mt-3 md:mt-0 text-left md:text-center">
                  {record.stage && record.stage !== 7 ? (
                    (() => {
                      const s = stageConfig[record.stage];
                      if (!s) {
                        return (
                          <span className="inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                            —
                          </span>
                        );
                      }
                      return (
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${s.ui.chipClass}`}
                          title={`${s.timeline.summary} — ${s.happens}`}
                        >
                          {s.label}
                        </span>
                      );
                    })()
                  ) : record.outcome ? (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${outcomeLabels[record.outcome].color}`}
                    >
                      {outcomeLabels[record.outcome].label}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                      —
                    </span>
                  )}
                </div>

                {/* Credibility */}
                <div className="mt-3 md:mt-0 text-left md:text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${
                      record.credibility === "Evidence-Based" || record.credibility === "evidence_based"
                        ? "bg-green-100 text-green-700"
                        : record.credibility === "Opinion-Based" || record.credibility === "opinion_based"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {(record.credibility === "Opinion-Based" || record.credibility === "opinion_based") && (
                      <AlertTriangle size={12} className="text-red-700" />
                    )}
                    {(record.credibility === "Unable to Verify" || record.credibility === "unable_to_verify") && (
                      <CircleAlert size={12} className="text-yellow-700" />
                    )}
                    {record.credibility}
                  </span>
                </div>

                {/* Action */}
                <div className="mt-3 md:mt-0 flex md:justify-center">
                  {record.stage === 3 && !stageConfig[3].flags.interactionsLocked ? (
                    <button
                      onClick={() => setDisputeConfirmId(record.id)}
                      disabled={disputingId === record.id}
                      className="px-3 py-2 bg-orange-500 text-white text-xs sm:text-sm rounded-md hover:bg-orange-600 active:scale-[0.99] transition disabled:opacity-50"
                    >
                      {disputingId === record.id ? "Submitting…" : "Dispute Record"}
                    </button>
                  ) : (
                    <span className="text-[11px] sm:text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          <div className="px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-md border-t border-gray-100 rounded-b-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Rows per page */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="whitespace-nowrap">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border rounded px-2 py-1.5 text-sm hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                  className="px-3 py-1.5 rounded-full border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Previous
                </button>

                {buildPagination().map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`${p}-${i}`} className="px-2 text-sm select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setPage(p)}
                      aria-label={`Go to page ${p}`}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${
                        page === p
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                          : "border hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                  className="px-3 py-1.5 rounded-full border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {disputeConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">Dispute this record?</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              This will flag the record for deletion and notify the contributor. The record enters a formal deletion review process — debate, community voting, and a final decision.
            </p>
            <p className="text-orange-400 text-xs font-medium">This action cannot be undone.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDisputeConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisputeRecord(disputeConfirmId)}
                disabled={!!disputingId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-sm font-semibold transition disabled:opacity-50"
              >
                {disputingId ? "Submitting…" : "Yes, Dispute Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {disputeSuccessId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-gray-900 font-semibold text-lg">Dispute Submitted</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your dispute has been recorded. The contributor has been notified and the formal review process has begun.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-orange-700 text-xs font-medium">What happens next?</p>
              <ul className="mt-1.5 space-y-1 text-orange-600 text-xs list-disc list-inside">
                <li>The contributor reviews and may respond</li>
                <li>Both parties can debate the record</li>
                <li>Community votes on Keep or Delete</li>
                <li>A final decision is issued</li>
              </ul>
            </div>
            <button
              onClick={() => setDisputeSuccessId(null)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {disputeToast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
          disputeToast.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {disputeToast.msg}
        </div>
      )}

      {/* Survey #2 Modal */}
      {showLifecycleSurvey && !lifecycleSurveySubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLifecycleSurvey(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold text-gray-900">How was your DNounce experience?</div>
                <div className="text-xs text-gray-500">You've completed the full process — we'd love your feedback</div>
              </div>
              <button type="button" onClick={() => setShowLifecycleSurvey(false)} className="rounded-full border p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Q1 */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">How fair was the process?</div>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setLs1Rating(n)}>
                      <Star className={`w-6 h-6 ${n <= ls1Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={ls1Text} onChange={(e) => setLs1Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>

              {/* Q2 */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">How clear were the instructions?</div>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setLs2Rating(n)}>
                      <Star className={`w-6 h-6 ${n <= ls2Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={ls2Text} onChange={(e) => setLs2Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>

              {/* Q3 */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Would you recommend DNounce?</div>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setLs3Rating(n)}>
                      <Star className={`w-6 h-6 ${n <= ls3Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={ls3Text} onChange={(e) => setLs3Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>

              {/* Q4 */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Do you think DNounce is a good idea?</div>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setLs4Rating(n)}>
                      <Star className={`w-6 h-6 ${n <= ls4Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={ls4Text} onChange={(e) => setLs4Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>

              {/* Q5 */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">How can we improve?</div>
                <textarea value={lsMissingText} onChange={(e) => setLsMissingText(e.target.value)} rows={3} placeholder="Your thoughts…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>

              {/* Email consent */}
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">Can we add you to our mailing list?</div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setLsEmailConsent(true)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${lsEmailConsent ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"}`}>Yes</button>
                  <button type="button" onClick={() => { setLsEmailConsent(false); setLsEmail(""); }} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${!lsEmailConsent ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"}`}>No</button>
                </div>
                {lsEmailConsent && (
                  <input type="email" value={lsEmail} onChange={(e) => setLsEmail(e.target.value)} placeholder="your@email.com" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowLifecycleSurvey(false)} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Skip</button>
              <button type="button" onClick={submitLifecycleSurvey} disabled={lifecycleSurveySubmitting} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {lifecycleSurveySubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Survey #2 Thank you */}
      {showLifecycleSurvey && lifecycleSurveySubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200 mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="font-semibold text-gray-900">Thanks for your feedback!</div>
            <div className="text-sm text-gray-500 mt-1">It helps us make DNounce better.</div>
            <button type="button" onClick={() => { setShowLifecycleSurvey(false); setLifecycleSurveySubmitted(false); }} className="mt-4 rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}