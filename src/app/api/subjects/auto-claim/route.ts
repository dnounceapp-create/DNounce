import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

/**
 * Claims an unclaimed subject profile for the caller, but only when the
 * profile's email matches the caller's confirmed login email.
 * The claim itself (one profile per person, notice, audit log) happens in the
 * database function claim_subject_for_user.
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
  if (subj.owner_auth_user_id) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const emailMatch =
    !!subj.email &&
    !!caller.email &&
    !!caller.email_confirmed_at &&
    subj.email.trim().toLowerCase() === caller.email.trim().toLowerCase();
  if (!emailMatch) return NextResponse.json({ error: "Email does not match" }, { status: 403 });

  // One profile per person: the database moves them onto this profile and removes
  // their empty sign-up profile (or asks an admin if that one has records).
  const { data: result, error } = await admin.rpc("claim_subject_for_user", {
    p_user_id: caller.id,
    p_subject_uuid: subjectId,
    p_source: "profile page (email match)",
  });
  if (error) return NextResponse.json({ error: "We couldn't claim this profile. Please try again." }, { status: 500 });
  if (result === "taken") return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  if (result === "needs_review") return NextResponse.json({ ok: true, review: true });

  return NextResponse.json({ ok: true });
}
