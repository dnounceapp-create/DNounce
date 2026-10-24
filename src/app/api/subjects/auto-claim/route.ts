import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

/**
 * Claims an unclaimed subject profile for the caller, but only when the
 * profile's email matches the caller's confirmed login email. The check used to
 * run in the browser, which let anyone claim any unclaimed profile.
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

  const { data: updated, error } = await admin
    .from("subjects")
    .update({ owner_auth_user_id: caller.id })
    .eq("subject_uuid", subjectId)
    .is("owner_auth_user_id", null)
    .select("subject_uuid");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  await admin.from("admin_audit_log").insert({
    admin_user_id: caller.id,
    admin_level: 0,
    action: "auto_claim",
    target_type: "subject",
    target_id: subjectId,
    note: "Auto-claimed via email match",
  });

  await admin.from("notifications").insert({
    user_id: caller.id,
    title: "Your profile claim was approved",
    body: "Your profile on DNounce is now yours. You can manage it from your dashboard.",
    type: "claim_approved",
    record_id: null,
  });

  return NextResponse.json({ ok: true });
}
