"use client";

/**
 * The number on a profile (KJ, Nov 11): the subject score. The record count lives in
 * "Record Breakdown" below, so it isn't repeated here.
 * Used on real profiles, demo profiles and the claim page.
 */
export default function SubjectStats({
  score,
  note,
}: {
  /** Subject score 0–100, or null when there isn't one yet. */
  score: number | null | undefined;
  /** Small line under the number, e.g. "Demo numbers". */
  note?: string;
}) {
  const s = typeof score === "number" && Number.isFinite(score) ? Math.round(score) : null;
  return (
    <div className="w-full lg:w-auto">
      <div className="rounded-xl lg:rounded-none bg-gray-50 lg:bg-transparent px-4 py-3 lg:p-0 text-center">
        <div className="text-3xl font-bold text-gray-900">
          {s === null ? "—" : s}
          {s !== null && <span className="text-base font-semibold text-gray-400">/100</span>}
        </div>
        <div className="text-xs text-gray-500">Subject score</div>
      </div>
      {note && <p className="mt-1 text-[11px] text-gray-400 text-center lg:text-right">{note}</p>}
    </div>
  );
}
