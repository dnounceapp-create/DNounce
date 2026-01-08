type CredibilityResult =
  | "Evidence-Based"
  | "Opinion-Based"
  | "Unable to Verify";

export function classifyRecord({
  description,
  rating,
  hasAttachments,
}: {
  description: string | null;
  rating: number | null;
  hasAttachments: boolean;
}): CredibilityResult {
  // VERY SIMPLE LOGIC (can evolve later)

  if (hasAttachments && description && description.length > 200) {
    return "Evidence-Based";
  }

  if (!hasAttachments && rating && rating <= 5) {
    return "Opinion-Based";
  }

  return "Unable to Verify";
}
