import { NextResponse } from "next/server";
import { requireSession, requireAdmin, authErrorResponse } from "@/lib/apiAuth";
import { createClient } from "@supabase/supabase-js";

/**
 * Moves a newly submitted record to "Subject Notified".
 *
 * There is no AI or anonymity step any more: this is the hand-off that starts
 * the 24-hour notice window. advance_record_stages() in the database publishes
 * from `subject_notified` once `submitted_at` is 24 hours old.
 *
 * (The path name is historical; the submit page calls it.)
 */
const PRE_LIFECYCLE_STATUSES = [null, "", "pending", "ai_verification"];

export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recordId } = (await req.json().catch(() => ({}))) as { recordId?: string };
    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: rec } = await admin
      .from("records")
      .select("status, created_by, dnounce_mod_record, contributor_claimed, contributor:contributors!records_contributor_id_fkey(auth_user_id)")
      .eq("id", recordId)
      .maybeSingle();

    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only the person who wrote this record (or an admin) may start its clock.
    const ownerIds = [rec.created_by, (rec.contributor as any)?.auth_user_id].filter(Boolean);
    if (!ownerIds.includes(caller.id)) {
      try {
        await requireAdmin(req);
      } catch (err) {
        return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Never move a record that is already in the lifecycle (so it can't be reset),
    // and never start the clock on an unclaimed DNounce Mod record.
    if (!PRE_LIFECYCLE_STATUSES.includes((rec.status ?? "") as any)) {
      return NextResponse.json({ ok: true, unchanged: true });
    }
    if (rec.dnounce_mod_record && !rec.contributor_claimed) {
      return NextResponse.json({ ok: true, unchanged: true, reason: "awaiting_claim" });
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("records")
      .update({
        status: "subject_notified",
        subject_notified_at: now,
        // Still read by the record page's stage fallback; harmless to keep.
        ai_completed_at: now,
      })
      .eq("id", recordId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
