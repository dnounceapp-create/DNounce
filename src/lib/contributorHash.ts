/**
 * Computes the same SHA-256 hash used at submission time for zero-knowledge anonymous records.
 * Used to look up anonymous submissions in the contributor's dashboard without exposing identity.
 */
export async function computeContributorHash(authUserId: string): Promise<string> {
  const pepper = process.env.ANON_HASH_PEPPER ?? "";
  const input = `${authUserId}:${pepper}`;
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
