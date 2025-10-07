"use client";

import { CheckCircle, AlertTriangle, CircleAlert } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Image from "next/image";

const DEFAULT_SORT = "Newest Submitted" as const;

// Mock stats
const mockStats = { my_total_records: 22, kept: 12, deleted: 10 };

// Type for a record
type RecordItem = {
  id: number;
  contributor_alias: string;
  subject_name: string;
  submitted_at: string; // ISO
  stage: number | null;
  outcome: "kept" | "deleted" | null;
  record_type: "evidence" | "opinion" | "unable to verify";
  credibility: "Evidence-Based" | "Opinion-Based" | "Unable to Verify";
  votes: number;
  views: number;
  last_activity_at: string; // ISO
};

// Mock records
const mockRecords: RecordItem[] = [
  {
    id: 2001,
    contributor_alias: "jetski123",
    subject_name: "John Doe",
    submitted_at: "2025-08-21T14:00:00Z",
    stage: 1,
    outcome: null,
    record_type: "evidence",
    credibility: "Evidence-Based",
    votes: 41,
    views: 938,
    last_activity_at: "2025-08-22T12:00:00Z",
  },
  {
    id: 2002,
    contributor_alias: "jetski123",
    subject_name: "Jane Smith",
    submitted_at: "2025-08-21T15:00:00Z",
    stage: 2,
    outcome: null,
    record_type: "opinion",
    credibility: "Opinion-Based",
    votes: 9,
    views: 210,
    last_activity_at: "2025-08-22T08:00:00Z",
  },
  {
    id: 2003,
    contributor_alias: "jetski123",
    subject_name: "Committee C",
    submitted_at: "2025-08-18T09:00:00Z",
    stage: 3,
    outcome: null,
    record_type: "evidence",
    credibility: "Unable to Verify",
    votes: 5,
    views: 120,
    last_activity_at: "2025-08-19T11:30:00Z",
  },
  // ...etc
];

// Stage & outcome labels/colors
const stageLabels: Record<number, { label: string; color: string }> = {
  1: { label: "AI Verification in Progress", color: "bg-blue-100 text-blue-700" },
  2: { label: "Subject Notified", color: "bg-green-100 text-green-700" },
  3: { label: "Published", color: "bg-yellow-100 text-yellow-700" },
  4: { label: "Deletion Request / Debate", color: "bg-pink-100 text-pink-700" },
  5: { label: "Subject Dispute & Debate", color: "bg-purple-100 text-purple-700" },
  6: { label: "Voting in Progress", color: "bg-indigo-100 text-indigo-700" },
  7: { label: "Anonymity Active", color: "bg-gray-100 text-gray-700" },
};

const outcomeLabels: Record<string, { label: string; color: string }> = {
  kept: { label: "Kept on page", color: "bg-green-200 text-green-800" },
  deleted: { label: "Deleted from page", color: "bg-red-200 text-red-800" },
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
  const steps = [1, 2, 3, 4, 5, 6, 7];
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

export default function MyRecordsPage() {
  const [filters, setFilters] = useState<FiltersState>({});
  const [sort, setSort] = useState<string>(DEFAULT_SORT);

  // ✅ Pagination state inside component
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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
      Kept: (record) => record.outcome === "kept",
      Deleted: (record) => record.outcome === "deleted",
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
        return (a, b) => a.id - b.id;
      case "Subject (A → Z)":
        return (a, b) => a.subject_name.localeCompare(b.subject_name);
      case "Votes":
        return (a, b) => b.votes - a.votes;
      case "Views":
        return (a, b) => b.views - a.views;
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

    const filtered = mockRecords.filter(
      (record) => byStatus(record) && byTime(record) && byType(record)
    );
    const cmp = sortComparator(sort);
    return [...filtered].sort(cmp);
  }, [filters, sort]);

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

  const handleRequestDeletion = (id: number) => {
    alert(`Request deletion for record #${id}`);
  };

  // ---- UI -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">My Total Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {mockStats.my_total_records}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Kept Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {mockStats.kept}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition rounded-2xl p-4 sm:p-6 text-center border border-gray-100">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Deleted Records</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {mockStats.deleted}
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
                <option>Votes</option>
                <option>Views</option>
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
            <div className="flex justify-center">Request Deletion</div>
          </div>

          {displayRecords.length === 0 ? (
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
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {record.contributor_alias} vs {record.subject_name}
                  </p>
                  <p className="text-[11px] sm:text-xs text-gray-500">Record ID: #{record.id}</p>

                  {/* date + stepper with shared width */}
                  <div className="mt-2">
                    <RecordMeta record={record} />
                  </div>
                </div>

                {/* Status */}
                <div className="mt-3 md:mt-0 text-left md:text-center">
                  <span className="inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium">
                    {record.stage && record.stage !== 7 ? (
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${stageLabels[record.stage].color}`}
                      >
                        {stageLabels[record.stage].label}
                      </span>
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
                  </span>
                </div>

                {/* Credibility */}
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

                {/* Action */}
                <div className="mt-3 md:mt-0 flex md:justify-center">
                  {record.stage === 2 ? (
                    <button
                      onClick={() => handleRequestDeletion(record.id)}
                      className="px-3 py-2 bg-orange-500 text-white text-xs sm:text-sm rounded-md hover:bg-orange-600 active:scale-[0.99] transition"
                    >
                      Request Deletion
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
    </div>
  );
}