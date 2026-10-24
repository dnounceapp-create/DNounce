"use client";

import { summarizeRecords, type OutcomeSummaryRecord } from "@/lib/outcome";

/**
 * "How their records turned out" — replaces the old 0–100 scores.
 * Plain counts only, worked out from the records already on the page:
 * public records, how many were challenged, and where the community landed.
 */
export type { OutcomeSummaryRecord } from "@/lib/outcome";
export { summarizeRecords } from "@/lib/outcome";

export default function RecordOutcomeSummary({
  records,
  title = "How their records turned out",
  themLabel = "Sided with them",
  writerLabel = "Sided with the writer",
  align = "right",
}: {
  records: OutcomeSummaryRecord[];
  title?: string;
  themLabel?: string;
  writerLabel?: string;
  /** Where the small title sits on wide screens. */
  align?: "left" | "right";
}) {
  const s = summarizeRecords(records);
  const items: [string, number][] = [
    ["Public records", s.total],
    ["Challenged", s.challenged],
    [themLabel, s.sidedWithThem],
    [writerLabel, s.sidedWithWriter],
    ["Ties", s.ties],
  ];
  return (
    <div>
      <p className={`text-xs font-medium text-gray-500 mb-2 ${align === "left" ? "text-left" : "text-center lg:text-right"}`}>{title}</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
        {items.map(([label, val]) => (
          <div key={label}>
            <p className="text-xl font-bold text-gray-900">{val}</p>
            <p className="text-xs text-gray-600">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
