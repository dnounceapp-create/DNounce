import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";
import { serviceClient, attemptKey, tooManyWrongTries, logTry, isCode } from "../_shared";

/**
 * POST /api/prospects/claim
 *   {}            -> claim the pre-built profile that matches the person's verified email (if any)
 *   { code }      -> from the link: the profile for that code, if the verified email matches ours
 * Either way it becomes a real, live DNounce profile owned by them.
 * Claiming always needs a verified email; a code alone is never enough.
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const db = serviceClient();

  let data: any;
  if (code === undefined || code === "") {
    const r = await db.rpc("claim_prospect_by_email", { p_user_id: caller.id });
    if (r.error) return NextResponse.json({ error: "We couldn't claim this profile. Please try again." }, { status: 500 });
    data = r.data;
  } else {
    if (!isCode(code)) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    const key = attemptKey(req);
    if (await tooManyWrongTries(db, key)) {
      return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
    }
    const r = await db.rpc("claim_prospect", { p_user_id: caller.id, p_code: code });
    if (r.error) return NextResponse.json({ error: "We couldn't claim this profile. Please try again." }, { status: 500 });
    data = r.data;
    await logTry(db, key, data?.result !== "not_found");
  }

  const result = data?.result as string | undefined;
  if (result === "claimed" || result === "already_owner") {
    return NextResponse.json({ ok: true, subject_uuid: data.subject_uuid });
  }
  if (result === "none") return NextResponse.json({ ok: true, none: true });
  if (result === "needs_review") return NextResponse.json({ ok: true, review: true });
  if (result === "email_not_verified") {
    return NextResponse.json({ error: "Please verify your email first. Check your inbox for the link we sent." }, { status: 403 });
  }
  if (result === "email_mismatch") {
    return NextResponse.json(
      { error: "This profile is set up for a different email. Sign in with the email we contacted you at, or contact support and we'll sort it out." },
      { status: 403 },
    );
  }
  if (result === "taken") {
    return NextResponse.json({ error: "This profile has already been claimed. If that wasn't you, contact support." }, { status: 409 });
  }
  return NextResponse.json({ error: "That code doesn't match a profile. Check it and try again." }, { status: 404 });
}
