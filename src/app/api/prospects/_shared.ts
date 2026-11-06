import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

/** Server-only helpers for pre-built profile claim codes. */
export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Hashed IP, so we never store anyone's raw IP address. */
export function attemptKey(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`dnounce-prospect:${ip}`).digest("hex");
}

export const MAX_WRONG_TRIES_PER_HOUR = 10;
/** Across everyone: stops guessing from many different addresses at once. */
export const MAX_WRONG_TRIES_PER_HOUR_ALL = 100;

/** True when this visitor (or everyone together) has made too many wrong guesses in the last hour. */
export async function tooManyWrongTries(db: ReturnType<typeof serviceClient>, key: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from("prospect_code_attempts").select("id", { count: "exact", head: true }).eq("key", key).eq("ok", false).gte("created_at", since),
    db.from("prospect_code_attempts").select("id", { count: "exact", head: true }).eq("ok", false).gte("created_at", since),
  ]);
  return (mine ?? 0) >= MAX_WRONG_TRIES_PER_HOUR || (all ?? 0) >= MAX_WRONG_TRIES_PER_HOUR_ALL;
}

export async function logTry(db: ReturnType<typeof serviceClient>, key: string, ok: boolean) {
  await db.from("prospect_code_attempts").insert({ key, ok });
}

export const isCode = (c: unknown): c is string => typeof c === "string" && /^[0-9]{6}$/.test(c);
