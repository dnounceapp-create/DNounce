type AnonymityStatusResult = "Anonymity Granted" | "Anonymity Not Granted";

export function classifyRecord({
  description,
  rating,
  hasAttachments,
}: {
  description: string | null;
  rating: number | null;
  hasAttachments: boolean;
}): AnonymityStatusResult {
  // Anonymity Not Granted submissions → Anonymity Not Granted
  if (!hasAttachments && rating && rating <= 5) {
    return "Anonymity Not Granted";
  }

  // Anonymity Granted or Anonymity Granted → Anonymity Granted
  return "Anonymity Granted";
}