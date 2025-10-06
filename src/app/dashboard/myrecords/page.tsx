"use client";

import { CheckCircle, AlertTriangle, CircleAlert } from "lucide-react"; 
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
  credibility: "Evidence-Based" | "Opinion-Based" | "Unable to Verify";  // 🔹 NEW
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
    credibility: "Evidence-Based",  // 🔹 add this
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
    credibility: "Opinion-Based",  // 🔹 add this
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
    credibility: "Unable to Verify",  // 🔹 add this
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

type FiltersState = { status?: string; time?: string; rcredibilityrecord?: string };

function RecordMeta({ record }: { record: RecordItem }) {
  const dateRef = useRef<HTMLParagraphElement>(null); // hooks must live at top of a component

  return (
    <div className="flex flex-col items-start max-w-max">
      <p ref={dateRef} className="text-xs text-gray-400 flex items-center gap-2">
        Submitted • {timeAgo(record.submitted_at)} • {new Date(record.submitted_at).toLocaleDateString()}
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

function StageStepper({ current, widthRef }: { current: number; widthRef: React.RefObject<HTMLElement> }) {
  const steps = [1, 2, 3, 4, 5, 6, 7];
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (widthRef?.current) {
      setContainerWidth(widthRef.current.offsetWidth);
    }
  }, [widthRef]);

  // space available for connectors between circles
  const connectorWidth = containerWidth > 0 ? (containerWidth - steps.length * 20) / (steps.length - 1) : 24;

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

// Floating legend component
function FloatingLegend({ stageLabels, outcomeLabels }) {
  const [isOpen, setIsOpen] = useState(false); // default minimized
  const [pos, setPos] = useState({ x: 20, y: 200 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    setPos({ x: 20, y: window.innerHeight - 220 }); // move to bottom after mount
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y };
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !dragRef.current) return;
    setPos({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragRef.current = null;
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      className="fixed bg-white shadow-lg border rounded-md w-72 text-xs z-50"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header = draggable bar */}
      <div
        onMouseDown={handleMouseDown}
        className="cursor-move bg-gray-100 px-3 py-2 flex justify-between items-center rounded-t-md"
      >
        <span className="font-medium text-gray-700">Status Legend</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 text-sm space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Verification Process */}
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Verification Process</h4>
            <ul className="space-y-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className={`px-2 py-1 rounded ${stageLabels[n].color}`}>
                  {n}. {stageLabels[n].label}
                </li>
              ))}
            </ul>
          </div>

          {/* Final Outcomes */}
          <div>
            <h4 className="font-medium text-gray-600 mb-1">Final Outcomes</h4>
            <ul className="space-y-1">
              <li className={`px-2 py-1 rounded ${outcomeLabels["kept"].color}`}>
                {outcomeLabels["kept"].label}
              </li>
              <li className={`px-2 py-1 rounded ${outcomeLabels["deleted"].color}`}>
                {outcomeLabels["deleted"].label}
              </li>
            </ul>
          </div>
        </div>
      )}
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
    (hasActiveFilters ? Object.keys(filters).length : 0) +
    (hasNonDefaultSort ? 1 : 0);

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
    const days = time === "Last 24 hours" ? 1 : time === "Last 7 days" ? 7 : time === "Last 30 days" ? 30 : 0;
    if (!days) return () => true;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return (record: RecordItem) => new Date(record.submitted_at).getTime() >= cutoff;
  };

  const credibilityrecordToPredicate = (credibilityrecord?: string) => {
    if (!credibilityrecord) return () => true;
    return (record: RecordItem) => record.credibility === credibilityrecord;
  };

  // ---- Sorting comparator ---------------------------------------------------
  const sortComparator = (key: string) => {
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
        return (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      default:
        return () => 0;
    }
  };

  // ---- Apply filters + sort -------------------------------------------------
  const displayRecords = useMemo(() => {
    const byStatus = statusToPredicate(filters.status);
    const byTime = timeToPredicate(filters.time);
    const byType = credibilityrecordToPredicate(filters.credibilityrecord);

    const filtered = mockRecords.filter((record) => byStatus(record) && byTime(record) && byType(record));
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
      {/* Content */}
      <main className="p-6 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* My Total Records */}
          <div className="bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition rounded-2xl p-6 text-center border border-black-100">
            <p className="text-sm font-medium text-black-500">My Total Records</p>
            <p className="text-3xl font-extrabold text-black-900 tracking-tight">
              {mockStats.my_total_records}
            </p>
          </div>

          {/* Kept Records */}
          <div className="bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition rounded-2xl p-6 text-center border border-gray-200">
            <p className="text-sm font-medium text-gray-600">Kept Records</p>
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {mockStats.kept}
            </p>
          </div>

          {/* Deleted Records */}
          <div className="bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg transition rounded-2xl p-6 text-center border border-gray-200">
            <p className="text-sm font-medium text-gray-600">Deleted Records</p>
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {mockStats.deleted}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 bg-white/80 backdrop-blur-sm shadow-md rounded-2xl px-6 py-4 border border-gray-100">
          {/* Left: Filters */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-600">Filters</span>

            <select
              className="border rounded px-3 py-1 text-sm hover:shadow-sm"
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
              className="border rounded px-3 py-1 text-sm hover:shadow-sm"
              value={filters.time || ""}
              onChange={(e) => setFilters({ ...filters, time: e.target.value })}
            >
              <option value="">Time</option>
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>

            <select
              className="border rounded px-3 py-1 text-sm hover:shadow-sm"
              value={filters.credibilityrecord || ""}
              onChange={(e) => setFilters({ ...filters, credibilityrecord: e.target.value })}
            >
              <option value="">Credibility Record</option>
              <option>Evidence-Based</option>
              <option>Opinion-Based</option>
              <option>Unable to Verify</option>
            </select>

            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Middle/Right: extra spacing + Clear All + Sort */}
          <div className="flex items-center gap-6">
            {hasActive && (
              <button
                onClick={clearAll}
                title="Clear all filters and sorting"
                className="px-3 py-1 text-xs font-medium rounded-full bg-black text-white hover:bg-gray-800 transition"
              >
                Clear All
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">Sort</span>
              <select
                className="border rounded px-3 py-1 text-sm hover:shadow-sm"
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
                  className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
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
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {filterLabels[key]}: {value}
                  <button 
                    onClick={() => removeFilter(key as keyof FiltersState)} 
                    aria-label="Remove filter"
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
        <div className="bg-white shadow rounded-lg divide-y">
          <div className="grid grid-cols-4 px-4 py-2 font-semibold text-gray-600 text-sm">
            <div>Record Name</div>
            <div className="text-center">Status</div>
            <div className="text-center">Credibility Record</div>
            <div className="flex justify-center">Request Deletion</div> {/* flex center */}
          </div>


          {displayRecords.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No records found against you.</div>
          ) : (
            paginatedRecords.map((record) => (
              <div
                key={record.id}
                className="grid grid-cols-4 items-center px-6 py-4 mb-3 bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300"
              >
                {/* Left: Record Info */}
                <div>
                  <p className="font-medium text-gray-900">
                    {record.contributor_alias} vs {record.subject_name}
                  </p>
                  <p className="text-xs text-gray-500">Record ID: #{record.id}</p>
            
                  {/* date + stepper with shared width */}
                  <RecordMeta record={record} />
                </div>
            
                {/* Center: Status */}
                <div className="text-center">
                  {record.stage && record.stage !== 7 ? (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${stageLabels[record.stage].color}`}
                    >
                      {stageLabels[record.stage].label}
                    </span>
                  ) : record.outcome ? (
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${outcomeLabels[record.outcome].color}`}
                    >
                      {outcomeLabels[record.outcome].label}
                    </span>
                  ) : null}
                </div>
            
                {/* Credibility Record */}
                <div className="text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      record.credibility === "Evidence-Based"
                        ? "bg-green-100 text-green-700"
                        : record.credibility === "Opinion-Based"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {record.credibility === "Opinion-Based" && <AlertTriangle size={12} className="text-red-700" />}
                    {record.credibility === "Unable to Verify" && <CircleAlert size={12} className="text-yellow-700" />}
                    {record.credibility}
                  </span>
                </div>

                {/* Right: Request Deletion */}
                <div className="flex justify-center">   {/* force center alignment */}
                  {record.stage === 2 && (
                    <button
                      onClick={() => handleRequestDeletion(record.id)}
                      className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                    >
                      Request Deletion
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          <div
            className="flex items-center justify-between px-6 py-4 mt-4 
                      bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl 
                      shadow-sm"
          >
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border rounded px-2 py-1 text-sm hover:shadow-sm 
                          focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-full border text-sm 
                          disabled:opacity-40 disabled:cursor-not-allowed 
                          hover:bg-gray-100 transition"
              >
                Previous
              </button>

              {buildPagination().map((p, i) =>
                typeof p === "string" ? (
                  <span key={i} className="px-2 text-sm">…</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
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
                className="px-3 py-1.5 rounded-full border text-sm 
                          disabled:opacity-40 disabled:cursor-not-allowed 
                          hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Legend */}
      <FloatingLegend stageLabels={stageLabels} outcomeLabels={outcomeLabels} />
    </div>
  );
}
