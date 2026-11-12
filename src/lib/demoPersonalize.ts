/**
 * Example (demo) records shown on a pre-built profile's claim page, with the
 * person's own name swapped in so they can see how their profile would look.
 * Used by /claim and by the demo record page (/d/[slug]?as=...).
 */

export type DemoPersona = { name: string; org?: string | null; loc?: string | null; cat?: string | null };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Swap the demo's subject name (full name, then first name) for the person's. */
export function swapName(text: string | null | undefined, demoName: string | null | undefined, newName: string) {
  if (!text || !demoName || !newName) return text ?? "";
  const demoFirst = demoName.trim().split(/\s+/)[0];
  const newFirst = newName.trim().split(/\s+/)[0];
  let out = text.replace(new RegExp(`\\b${escapeRe(demoName.trim())}\\b`, "g"), newName.trim());
  if (demoFirst && demoFirst.length > 1) {
    out = out.replace(new RegExp(`\\b${escapeRe(demoFirst)}\\b`, "g"), newFirst);
  }
  return out;
}

/** Only allow going "back" to a claim page on this site. */
export function safeClaimBack(back: string | null | undefined) {
  if (!back) return null;
  return /^\/claim\?code=[0-9]{6}$/.test(back) ? back : null;
}

export function demoLink(slug: string, persona: DemoPersona, back: string) {
  const q = new URLSearchParams({ as: persona.name, back });
  if (persona.org) q.set("org", persona.org);
  if (persona.loc) q.set("loc", persona.loc);
  if (persona.cat) q.set("cat", persona.cat);
  return `/d/${slug}?${q.toString()}`;
}

type VoteLike = { choice?: string };

/** Which way the example's community vote went (majority of its votes), if it had any. */
export function demoOutcome(votes: VoteLike[] | null | undefined): "subject" | "contributor" | "tie" | null {
  const v = votes ?? [];
  if (v.length === 0) return null;
  const subj = v.filter((x) => x.choice === "side_with_subject").length;
  const contr = v.filter((x) => x.choice === "side_with_contributor").length;
  if (subj === contr) return "tie";
  return subj > contr ? "subject" : "contributor";
}
