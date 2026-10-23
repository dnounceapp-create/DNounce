/**
 * Final outcome of a challenged record, after community voting.
 *
 * Whatever the outcome, the record stays on DNounce. The outcome is a label
 * saying which side most voters took. It is a count of votes, not a finding of
 * fact by DNounce.
 *
 * The database stores `keep` (most voters sided with the contributor) and
 * `delete` (most voters sided with the subject). The names are historical: a
 * `delete` outcome does NOT remove the record. Older code also wrote
 * `sided_with_*` / `side_with_*`; every spelling is accepted here.
 */
export type OutcomeSide = "contributor" | "subject";

export function outcomeSide(raw?: string | null): OutcomeSide | null {
  const s = (raw ?? "").toLowerCase();
  if (s === "keep" || s.includes("contributor")) return "contributor";
  if (s === "delete" || s.includes("subject")) return "subject";
  return null;
}

export const OUTCOME_LABEL: Record<OutcomeSide, string> = {
  contributor: "Most people sided with the writer",
  subject: "Most people sided with the person it's about",
};

export const OUTCOME_CHIP: Record<OutcomeSide, string> = {
  contributor: "bg-blue-100 text-blue-800",
  subject: "bg-indigo-100 text-indigo-800",
};

/**
 * "Most people sided with Jane D." when names are known, otherwise a plain
 * role ("the writer" / "the person it's about").
 */
export function outcomeLabel(
  raw?: string | null,
  names?: { contributor?: string | null; subject?: string | null }
): string | null {
  const side = outcomeSide(raw);
  if (!side) return null;
  const name = (side === "contributor" ? names?.contributor : names?.subject)?.trim();
  return name ? `Most people sided with ${name}` : OUTCOME_LABEL[side];
}

export function outcomeChipClass(raw?: string | null): string {
  const side = outcomeSide(raw);
  return side ? OUTCOME_CHIP[side] : "bg-gray-100 text-gray-600";
}

/** Short public label for where a record is in its life, for share images and lists. */
export function publicStageLabel(status?: string | null, finalOutcome?: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "published": return "Public";
    case "deletion_request": return "Challenged";
    case "debate": return "Both sides";
    case "voting": return "Community vote";
    case "decision": return outcomeLabel(finalOutcome) ?? "Results";
    default: return "Public";
  }
}

/** True when a record may be shown to the public (published and not deleted). */
export function isPubliclyVisible(r?: { is_published?: boolean | null; published_at?: string | null; deleted_at?: string | null } | null): boolean {
  return !!r && !r.deleted_at && (r.is_published === true || !!r.published_at);
}
