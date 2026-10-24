import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

/**
 * The subject challenges a published record (shown to users as "Challenge").
 *
 * Subjects have no database permission to change records, so this used to be
 * silently ignored when done from the browser. It runs here instead, with the
 * service role, after checking that the caller owns the subject profile the
 * record is about and that the record is published and not already disputed.
 *
 * A dispute never removes the record. It opens the debate and community vote;
 * whichever side the community takes, the record stays and is labeled.
 *
 * (The internal status name is still `deletion_request`; 49 places compare
 * stage numbers and status names, so it is kept. Users only ever see "Challenged".)
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recordId } = (await req.json().catch(() => ({}))) as { recordId?: string };
  if (!recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rec } = await admin
    .from("records")
    .select("id, status, is_published, deleted_at, subject_id")
    .eq("id", recordId)
    .maybeSingle();

  if (!rec || rec.deleted_at) return NextResponse.json({ error: "We couldn't find that record." }, { status: 404 });

  const { data: subject } = await admin
    .from("subjects")
    .select("owner_auth_user_id")
    .eq("subject_uuid", rec.subject_id)
    .maybeSingle();

  if (!subject?.owner_auth_user_id || subject.owner_auth_user_id !== caller.id) {
    return NextResponse.json({ error: "Only the person this record is about can challenge it." }, { status: 403 });
  }

  if (rec.status !== "published" || rec.is_published !== true) {
    return NextResponse.json({ error: "You can challenge a record once it's public, and only once." }, { status: 409 });
  }

  const { data: updated, error } = await admin
    .from("records")
    .update({ status: "deletion_request", dispute_started_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("status", "published")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "This record has already been challenged." }, { status: 409 });
  }

  // The database trigger on status change notifies the contributor (stage_4_contributor).
  return NextResponse.json({ ok: true });
}
