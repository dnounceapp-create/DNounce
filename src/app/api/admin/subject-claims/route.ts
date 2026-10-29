import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, authErrorResponse } from "@/lib/apiAuth";

/**
 * Admin review of profile claim requests (subject_claims).
 * GET  -> pending requests with the profile name and the requester's login email
 * POST { subject_uuid, claimant_auth_user_id, action: "approve" | "reject", reason? }
 * Approving uses claim_subject_for_user, so the person ends up with exactly one profile.
 */
function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = service();
  const { data: claims, error } = await db.from("subject_claims").select("*").eq("status", "pending").limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const subjectIds = Array.from(new Set((claims ?? []).map((c: any) => c.subject_uuid)));
  const { data: subjects } = subjectIds.length
    ? await db.from("subjects").select("subject_uuid, name, location, email, phone, owner_auth_user_id").in("subject_uuid", subjectIds)
    : { data: [] as any[] };
  const byId = new Map((subjects ?? []).map((s: any) => [s.subject_uuid, s]));

  const rows = await Promise.all(
    (claims ?? []).map(async (c: any) => {
      const { data: u } = await db.auth.admin.getUserById(c.claimant_auth_user_id);
      const { data: acct } = await db.from("user_accountdetails").select("first_name, last_name, phone").eq("user_id", c.claimant_auth_user_id).maybeSingle();
      return {
        ...c,
        subject: byId.get(c.subject_uuid) ?? null,
        claimant: {
          email: u?.user?.email ?? null,
          email_confirmed: !!u?.user?.email_confirmed_at,
          name: [acct?.first_name, acct?.last_name].filter(Boolean).join(" ") || null,
          phone: acct?.phone ?? null,
        },
      };
    })
  );
  return NextResponse.json({ claims: rows });
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    subject_uuid?: string; claimant_auth_user_id?: string; action?: string; reason?: string;
  };
  const { subject_uuid, claimant_auth_user_id, action } = body;
  if (!subject_uuid || !claimant_auth_user_id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const db = service();

  if (action === "approve") {
    const { data: result, error } = await db.rpc("claim_subject_for_user", {
      p_user_id: claimant_auth_user_id,
      p_subject_uuid: subject_uuid,
      p_source: `admin approval by ${admin.id}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (result !== "claimed" && result !== "already_owner") {
      const msg =
        result === "taken" ? "Someone else already owns this profile."
        : result === "needs_review" ? "This person already owns another profile that has records. Merge those by hand first."
        : "Profile not found.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  const reason = (body.reason ?? "").trim() || "We couldn't confirm this profile is yours.";
  const { error } = await db
    .from("subject_claims")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_note: reason })
    .eq("subject_uuid", subject_uuid)
    .eq("claimant_auth_user_id", claimant_auth_user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from("notifications").insert({
    user_id: claimant_auth_user_id, title: "We couldn't approve your claim", body: reason, type: "claim_rejected", record_id: null,
  });
  await db.from("admin_audit_log").insert({
    admin_user_id: admin.id, admin_level: 1, action: "reject_profile_claim", target_type: "subject", target_id: subject_uuid, note: reason,
  });
  return NextResponse.json({ ok: true });
}
