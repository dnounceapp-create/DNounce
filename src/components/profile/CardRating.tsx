/**
 * The star rating on a record card (before Expand), same 10-star scale as the record page.
 */
export default function CardRating({ rating }: { rating: number | null | undefined }) {
  const n = typeof rating === "number" && Number.isFinite(rating) ? Math.max(0, Math.min(10, Math.round(rating))) : null;
  if (n === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-700" aria-label={`Rating ${n} out of 10`}>
      <span className="tracking-tight text-amber-500">
        {"★".repeat(n)}
        <span className="text-gray-300">{"★".repeat(10 - n)}</span>
      </span>
      <span className="font-medium">{n}/10</span>
    </span>
  );
}
