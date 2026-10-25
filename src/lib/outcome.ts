/**
 * Final outcome of a challenged record, after community voting.
 *
 * Whatever the outcome, the record stays on DNounce. The outcome is a label
 * saying which side most voters took. It is a count of votes, not a finding of
 * fact by DNounce.
 *
 * The database stores `keep` (most voters sided with the contributor),
 * `delete` (most voters sided with the subject), `tie` (evenly split), or null
 * when nobody voted (no label is shown). The names are historical: a
 * `delete` outcome does NOT remove the record. Older code also wrote
 * `sided_with_*` / `side_with_*`; every spelling is accepted here.
 */
export type OutcomeSide = "contributor" | "subject";

export const TIE_LABEL = "It's a tie — the community is split right down the middle";
/** Shown under the tie label on the record page, to invite people to read both sides. */
export const TIE_HINT = "Same number of votes for each side. Read both stories and see where you land.";

export function isTie(raw?: string | null): boolean {
  return (raw ?? "").toLowerCase() === "tie";
}

export function outcomeSide(raw?: string | null): OutcomeSide | null {
  const s = (raw ?? "").toLowerCase();
  if (s === "tie") return null;
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
  if (isTie(raw)) return TIE_LABEL;
  const side = outcomeSide(raw);
  if (!side) return null;
  const name = (side === "contributor" ? names?.contributor : names?.subject)?.trim();
  return name ? `Most people sided with ${name}` : OUTCOME_LABEL[side];
}

export function outcomeChipClass(raw?: string | null): string {
  if (isTie(raw)) return "bg-amber-100 text-amber-800";
  const side = outcomeSide(raw);
  return side ? OUTCOME_CHIP[side] : "bg-gray-100 text-gray-600";
}

/** Short public label for where a record is in its life, for share images and lists. */
export function publicStageLabel(status?: string | null, finalOutcome?: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "published": return "Public";
    case "deletion_request": return "Challenged";
    case "debate": return "Debate";
    case "voting": return "Community vote";
    case "decision": return outcomeLabel(finalOutcome) ?? "Results";
    default: return "Public";
  }
}

/** True when a record may be shown to the public (published and not deleted). */
export function isPubliclyVisible(r?: { is_published?: boolean | null; published_at?: string | null; deleted_at?: string | null } | null): boolean {
  return !!r && !r.deleted_at && (r.is_published === true || !!r.published_at);
}

/**
 * Demo pages store a stage as display text ("Voting in Progress", "Settled"...),
 * sometimes using older names. Map it to the internal status so demos use the
 * same labels and counts as real records.
 */
export function demoStageToStatus(text?: string | null): string {
  const t = (text ?? "").toLowerCase();
  if (t.includes("notified") || t.includes("preview")) return "subject_notified";
  if (t.includes("disput") || t.includes("deletion") || t.includes("challeng")) return "deletion_request";
  if (t.includes("debate") || t.includes("both sides")) return "debate";
  if (t.includes("vot")) return "voting";
  if (t.includes("settled") || t.includes("decision") || t.includes("result") || t.includes("kept") || t.includes("sided")) return "decision";
  return "published";
}

/** Current public stage name for a demo stage text. */
export function demoStageLabel(text?: string | null): string {
  const status = demoStageToStatus(text);
  return status === "subject_notified" ? "Private preview" : publicStageLabel(status);
}

/** Counts behind "How their records turned out" (replaces the old 0–100 scores). */
export type OutcomeSummaryRecord = {
  status?: string | null;
  final_outcome?: string | null;
  dispute_started_at?: string | null;
};

const PUBLIC_STATUSES = ["published", "deletion_request", "debate", "voting", "decision"];

export function summarizeRecords(records: OutcomeSummaryRecord[]) {
  const pub = records.filter((r) => PUBLIC_STATUSES.includes((r.status ?? "").toLowerCase()));
  return {
    total: pub.length,
    challenged: pub.filter((r) => !!r.dispute_started_at || ["deletion_request", "debate", "voting", "decision"].includes((r.status ?? "").toLowerCase())).length,
    sidedWithThem: pub.filter((r) => outcomeSide(r.final_outcome) === "subject").length,
    sidedWithWriter: pub.filter((r) => outcomeSide(r.final_outcome) === "contributor").length,
    ties: pub.filter((r) => isTie(r.final_outcome)).length,
  };
}


/**
 * Badge names as people see them. The database keeps the original labels
 * (the badge rules use them); only the displayed name changes here.
 * "Expert" is hidden for now (KJ, 2026-10-24) — nothing is deleted.
 */
const BADGE_DISPLAY: Record<string, string> = {
  "Top Contributor": "Top Writer",
  "Top Subject": "Well Regarded",
  "Top Citizen": "Top Community Member",
  "Convicted": "Lost voting rights",
};
const HIDDEN_BADGES = new Set(["Expert"]);

export function badgeName(label?: string | null): string {
  const l = (label ?? "").trim();
  return BADGE_DISPLAY[l] ?? l;
}

export function visibleBadges<T extends { label?: string | null }>(badges: T[] | null | undefined): T[] {
  return (badges ?? []).filter((b) => !HIDDEN_BADGES.has((b.label ?? "").trim()));
}
