"use client";

import { AlertTriangle, CircleAlert, ThumbsUp } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { stageConfig, STAGE_ORDER } from "@/config/stageConfig";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_SORT = "Newest Voted" as const;

type VotedRecord = {
  vote_id: number;
  record_id: string;
  voted_at: string;
  vote_choice: "keep" | "delete";
  vote_explanation: string;
  record_alias: string;
  subject_name: string;
  submitted_at: string;
  stage: number | null;
  outcome: "keep" | "delete" | null;
  credibility: string;
};

const outcomeLabels: Record<string, { label: string; color: string }> = {
  keep: { label: "Kept on page", color: "bg-green-200 text-green-800" },
  delete: { label: "Deleted from page", color: "bg-red-200 text-red-800" },
};

const filterLabels: Record<string, string> = {
  status: "Status",
  credibilityrecord: "Credibility Record",
  votechoice: "My Vote",
};

type FiltersState = { status?: string; credibilityrecord?: string; votechoice?: string };

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
    if (widthRef?.current) setContainerWidth(widthRef.current.offsetWidth);
  }, [widthRef]);
  const connectorWidth =
    containerWidth > 0
      ? (containerWidth - steps.length * 20) / (steps.length - 1)
      : 24;
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

function RecordMeta({ record }: { record: VotedRecord }) {
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
      <StageStepper
        current={record.outcome ? 7 : record.stage ?? 0}
        widthRef={dateRef}
      />
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

export default function VotedRecordsPage() {
  const [filters, setFilters] = useState<FiltersState>({});
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<VotedRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Step 1: fetch votes
        const { data: votes } = await supabase
          .from("record_votes")
          .select("id, choice, explanation, created_at, record_id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!votes?.length) { setLoadingData(false); return; }

        // Step 2: fetch records
        const recordIds = votes.map((v: any) => v.record_id);
        const { data: recs } = await supabase
          .from("records")
          .select("id, record_alias, contributor_display_name, contributor_identity_preference, submitted_at, status, final_outcome, credibility, ai_vendor_1_result, subject_id")
          .in("id", recordIds);

        // Step 3: fetch subjects
        const subjectIds = [...new Set((recs || []).map((r: any) => r.subject_id))];
        const { data: subjects } = await supabase
          .from("subjects")
          .select("subject_uuid, name")
          .in("subject_uuid", subjectIds);

        const recordMap = Object.fromEntries((recs || []).map((r: any) => [r.id, r]));
        const subjectMap = Object.fromEntries((subjects || []).map((s: any) => [s.subject_uuid, s]));

        const mapped: VotedRecord[] = votes.map((v: any) => {
          const rec = recordMap[v.record_id];
          const sub = rec ? subjectMap[rec.subject_id] : null;
          return {
            vote_id: v.id,
            record_id: v.record_id,
            voted_at: v.created_at,
            vote_choice: v.choice,
            vote_explanation: v.explanation || "",
            record_alias: (() => {
              const cred = rec?.ai_vendor_1_result || rec?.credibility || "";
              const reveal = (cred === "Opinion-Based" || cred === "opinion_based") || ((cred === "Evidence-Based" || cred === "evidence_based") && rec?.contributor_identity_preference === true);
              return reveal ? (rec?.contributor_display_name || "Individual Contributor") : "SuperHero123";
            })(),
            subject_name: sub?.name || "Unknown",
            submitted_at: rec?.submitted_at || v.created_at,
            stage: statusToStage(rec?.status || "ai_verification"),
            outcome: rec?.final_outcome || null,
            credibility: rec?.ai_vendor_1_result || rec?.credibility || "Pending",
          };
        });

        setRecords(mapped);
      } catch (err) {
        console.error("Failed to fetch voted records:", err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const hasActiveFilters = Object.keys(filters).some(
    (k) => !!filters[k as keyof FiltersState]
  );
  const hasNonDefaultSort = sort !== DEFAULT_SORT;
  const hasActive = hasActiveFilters || hasNonDefaultSort;

  const statusToPredicate = (status?: string) => {
    if (!status) return () => true;
    const map: Record<string, (r: VotedRecord) => boolean> = {
      "AI Verification": (r) => r.stage === 1,
      "Subject Notified": (r) => r.stage === 2,
      Published: (r) => r.stage === 3,
      "Deletion Request": (r) => r.stage === 4,
      Debate: (r) => r.stage === 5,
      Voting: (r) => r.stage === 6,
      Anonymity: (r) => r.stage === 7,
      Kept: (r) => r.outcome === "keep",
      Deleted: (r) => r.outcome === "delete",
    };
    return map[status] ?? (() => true);
  };

  const credibilityToPredicate = (cred?: string) => {
    if (!cred) return () => true;
    return (r: VotedRecord) => r.credibility === cred;
  };

  const votechoiceToPredicate = (choice?: string) => {
    if (!choice) return () => true;
    return (r: VotedRecord) => r.vote_choice === choice;
  };

  const sortComparator = (
    key: string
  ): ((a: VotedRecord, b: VotedRecord) => number) => {
    switch (key) {
      case "Newest Voted":
        return (a, b) =>
          new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime();
      case "Oldest Voted":
        return (a, b) =>
          new Date(a.voted_at).getTime() - new Date(b.voted_at).getTime();
      case "Newest Submitted":
        return (a, b) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      case "Subject (A → Z)":
        return (a, b) => a.subject_name.localeCompare(b.subject_name);
      default:
        return () => 0;
    }
  };

  const displayRecords = useMemo(() => {
    const filtered = records.filter(
      (r) =>
        statusToPredicate(filters.status)(r) &&
        credibilityToPredicate(filters.credibilityrecord)(r) &&
        votechoiceToPredicate(filters.votechoice)(r)
    );
    return [...filtered].sort(sortComparator(sort));
  }, [records, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(displayRecords.length / pageSize));
  const paginatedRecords = displayRecords.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const buildPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page > 3) pages.push(1, "…");
      for (
        let i = Math.max(1, page - 2);
        i <= Math.min(totalPages, page + 2);
        i++
      )
        pages.push(i);
      if (page < totalPages - 2) pages.push("…", totalPages);
    }
    return pages;
  };

  const removeFilter = (key: keyof FiltersState) => {
    const next = { ...filters };
    delete next[key];
    setFilters(next);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Records I've Voted On</h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{records.length}</span>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8 bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-gray-100">
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

            <select
              aria-label="Filter by my vote"
              className="border rounded-md px-3 py-2 text-sm hover:shadow-sm w-full sm:w-auto"
              value={filters.votechoice || ""}
              onChange={(e) =>
                setFilters({ ...filters, votechoice: e.target.value })
              }
            >
              <option value="">My Vote</option>
              <option value="keep">Voted Keep</option>
              <option value="delete">Voted Delete</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => setFilters({})}
                className="px-3 py-2 text-xs sm:text-sm font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition w-full sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {hasActive && (
              <button
                onClick={() => { setFilters({}); setSort(DEFAULT_SORT); }}
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
                <option>Newest Voted</option>
                <option>Oldest Voted</option>
                <option>Newest Submitted</option>
                <option>Subject (A → Z)</option>
              </select>
              {hasNonDefaultSort && (
                <button
                  onClick={() => setSort(DEFAULT_SORT)}
                  className="px-3 py-2 text-xs sm:text-sm font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                >
                  Clear Sort
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {Object.entries(filters).some(([, v]) => !!v) && (
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
          <div className="hidden md:grid md:grid-cols-5 px-6 py-3 font-semibold text-gray-600 text-sm">
            <div className="col-span-2">Record</div>
            <div className="text-center">Status</div>
            <div className="text-center">Credibility</div>
            <div className="text-center">My Vote</div>
          </div>

          {loadingData ? (
            <div className="p-6 text-center text-gray-500">
              Loading voted records…
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No voted records yet.</p>
              <p className="text-sm mt-1">
                Records you vote on will appear here so you can track their progress.
              </p>
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <div
                key={record.vote_id}
                className="md:grid md:grid-cols-5 md:items-center gap-3 px-4 sm:px-6 py-4 md:py-5 border-t first:border-t-0 hover:bg-gray-50/50 transition"
              >
                {/* Col 1–2: Record info */}
                <div className="md:col-span-2">
                  <Link
                    href={`/record/${record.record_id}`}
                    className="font-medium text-gray-900 text-sm sm:text-base hover:underline"
                  >
                    {record.record_alias}
                  </Link>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    Subject: {record.subject_name}
                  </p>
                  <p className="text-[11px] sm:text-xs text-gray-400">
                    ID: {String(record.record_id).slice(0, 8)}…
                  </p>
                  <div className="mt-2">
                    <RecordMeta record={record} />
                  </div>
                </div>

                {/* Col 3: Status */}
                <div className="mt-3 md:mt-0 text-left md:text-center">
                  {record.stage && record.stage !== 7 ? (
                    (() => {
                      const s = stageConfig[record.stage];
                      if (!s)
                        return (
                          <span className="inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                            —
                          </span>
                        );
                      return (
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${s.ui.chipClass}`}
                        >
                          {s.label}
                        </span>
                      );
                    })()
                  ) : record.outcome ? (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${
                        outcomeLabels[record.outcome]?.color || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {outcomeLabels[record.outcome]?.label || record.outcome}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                      —
                    </span>
                  )}
                </div>

                {/* Col 4: Credibility */}
                <div className="mt-3 md:mt-0 text-left md:text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${
                      record.credibility === "Evidence-Based"
                        ? "bg-green-100 text-green-700"
                        : record.credibility === "Opinion-Based"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {record.credibility === "Opinion-Based" && (
                      <AlertTriangle size={12} className="text-red-700" />
                    )}
                    {record.credibility === "Unable to Verify" && (
                      <CircleAlert size={12} className="text-yellow-700" />
                    )}
                    {record.credibility}
                  </span>
                </div>

                {/* Col 5: My Vote */}
                <div className="mt-3 md:mt-0 flex md:justify-center items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${
                      record.vote_choice === "keep"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-3 w-3 ${record.vote_choice === "delete" ? "rotate-180" : ""}`}
                    />
                    {record.vote_choice === "keep" ? "Keep" : "Delete"}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          <div className="px-4 sm:px-6 py-4 bg-white/70 backdrop-blur-md border-t border-gray-100 rounded-b-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="whitespace-nowrap">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border rounded px-2 py-1.5 text-sm hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
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
                  className="px-3 py-1.5 rounded-full border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}