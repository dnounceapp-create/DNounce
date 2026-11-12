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

/* ── Example community comments + likes for the two claim-page examples ── */

export type SeedComment = { id: string; alias: string; body: string; ts: string; agree: number; disagree: number };

/** Written with "Alex" (the examples' stand-in name); swapName() puts the person's name in. */
export const CLAIM_EXAMPLE_COMMENTS: Record<string, SeedComment[]> = {
  "claim-example-great": [
    { id: "cg1", alias: "mkt@dnounce_412", body: "Hired Alex last spring too. Same experience: on time and a fair price.", ts: "2026-10-03T14:12:00Z", agree: 8, disagree: 0 },
    { id: "cg2", alias: "rj@dnounce_77", body: "Coming back to fix something for free a week later is rare. Good to know.", ts: "2026-10-04T09:40:00Z", agree: 5, disagree: 1 },
    { id: "cg3", alias: "lena@dnounce_903", body: "Would love to see photos of the finished work next time!", ts: "2026-10-06T18:05:00Z", agree: 2, disagree: 0 },
  ],
  "claim-example-bad": [
    { id: "cb1", alias: "tq@dnounce_218", body: "Price changes should always be in writing. Glad the text was shared in the debate.", ts: "2026-09-25T11:20:00Z", agree: 11, disagree: 2 },
    { id: "cb2", alias: "bo@dnounce_655", body: "Three weeks late is rough, but supplier delays happen a lot lately.", ts: "2026-09-25T16:48:00Z", agree: 6, disagree: 3 },
    { id: "cb3", alias: "nyc_d@dnounce_31", body: "Respect to Alex for owning the communication part in the reply.", ts: "2026-09-26T08:15:00Z", agree: 9, disagree: 1 },
    { id: "cb4", alias: "pk@dnounce_480", body: "This is why I like that both sides get to talk here.", ts: "2026-09-27T20:31:00Z", agree: 7, disagree: 0 },
  ],
};

/** Example likes on each record card. */
export const CLAIM_EXAMPLE_LIKES: Record<string, { agree: number; disagree: number }> = {
  "claim-example-great": { agree: 31, disagree: 2 },
  "claim-example-bad": { agree: 18, disagree: 14 },
};

/** A random community name like the ones on DNounce (e.g. kq@dnounce_314). */
export function randomAlias() {
  const l = 2 + Math.floor(Math.random() * 4);
  const b = Array.from({ length: l }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `${b}@dnounce_${1 + Math.floor(Math.random() * 999)}`;
}
