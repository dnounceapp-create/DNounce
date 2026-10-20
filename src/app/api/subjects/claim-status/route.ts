import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

/**
 * Tells the logged-in caller what they can do with a subject profile:
 * already-owner | claimed-other | pending | unclaimed-match | unclaimed-no-match
 *
 * The subject's email is compared here, on the server, and is never returned.
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subjectId } = (await req.json().catch(() => ({}))) as { subjectId?: string };
  if (!subjectId) return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: subj } = await admin
    .from("subjects")
    .select("owner_auth_user_id, email")
    .eq("subject_uuid", subjectId)
    .maybeSingle();

  if (!subj) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (subj.owner_auth_user_id === caller.id) return NextResponse.json({ state: "already-owner" });
  if (subj.owner_auth_user_id) return NextResponse.json({ state: "claimed-other" });

  const { data: existingClaim } = await admin
    .from("subject_claims")
    .select("status")
    .eq("subject_uuid", subjectId)
    .eq("claimant_auth_user_id", caller.id)
    .maybeSingle();
  if (existingClaim?.status === "pending") return NextResponse.json({ state: "pending" });

  const emailMatch =
    !!subj.email &&
    !!caller.email &&
    !!caller.email_confirmed_at &&
    subj.email.trim().toLowerCase() === caller.email.trim().toLowerCase();

  return NextResponse.json({ state: emailMatch ? "unclaimed-match" : "unclaimed-no-match" });
}
