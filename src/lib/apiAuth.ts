import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side checks for API routes.
 *
 * There is no middleware in this app, so every route that needs a caller
 * identity must call one of these itself, inside the route.
 *
 * The caller is resolved from:
 *   1. an `Authorization: Bearer <access token>` header (the pattern the
 *      record-requests and claim-codes routes already use), or
 *   2. the Supabase session cookies written by the browser client
 *      (`createBrowserClient` from @supabase/ssr in src/lib/supabaseClient.ts).
 *
 * Either way the token is validated with Supabase Auth (`getUser`), never
 * decoded and trusted locally. Nothing in the request body, query string, or
 * a custom header is ever used to decide who the caller is or what role they hold.
 */

export class ApiAuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

/** Turn an ApiAuthError into a JSON response. Returns null for any other error. */
export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof ApiAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Resolve the caller from the Supabase session. Throws ApiAuthError(401) if there is none. */
export async function requireSession(req: Request): Promise<User> {
  // 1) Bearer token
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";

  if (bearer) {
    const { data, error } = await serviceClient().auth.getUser(bearer);
    if (error || !data?.user) throw new ApiAuthError(401, "Unauthorized");
    return data.user;
  }

  // 2) Session cookies set by the @supabase/ssr browser client
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Route handlers in this patch do not write refreshed cookies back.
        // A refresh still happens in memory, so validation works; the browser
        // client refreshes its own cookies on its next request.
        setAll() {},
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new ApiAuthError(401, "Unauthorized");
  return data.user;
}

/**
 * requireSession, then confirm the caller holds an admin role by reading
 * admin_roles server-side with the service role. Throws ApiAuthError(403) if not.
 * Mirrors the check in src/app/admin/layout.tsx, but on the server.
 */
export async function requireAdmin(req: Request): Promise<User> {
  const user = await requireSession(req);

  const { data, error } = await serviceClient()
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.role) throw new ApiAuthError(403, "Forbidden");
  return user;
}

/**
 * Best-effort per-IP rate limit for the geo proxy routes.
 * In-memory, so on Vercel it is per server instance, not global. It stops a
 * single client hammering one instance; it is not a hard quota.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitByIp(
  req: Request,
  { limit = 30, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }
  b.count += 1;
  if (b.count > limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } }
    );
  }
  return null;
}
