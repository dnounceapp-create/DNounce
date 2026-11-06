import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";
import { serviceClient, attemptKey, tooManyWrongTries, logTry, isCode } from "../_shared";

/**
 * POST /api/prospects/claim { code }
 * The signed-in person claims the pre-built profile with this code. It becomes a
 * real, live DNounce profile owned by them (database function claim_prospect).
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!isCode(code)) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const db = serviceClient();
  const key = attemptKey(req);
  if (await tooManyWrongTries(db, key)) {
    return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
  }

  const { data, error } = await db.rpc("claim_prospect", { p_user_id: caller.id, p_code: code });
  if (error) return NextResponse.json({ error: "We couldn't claim this profile. Please try again." }, { status: 500 });

  const result = (data as any)?.result as string | undefined;
  await logTry(db, key, result !== "not_found");

  if (result === "claimed" || result === "already_owner") {
    return NextResponse.json({ ok: true, subject_uuid: (data as any).subject_uuid });
  }
  if (result === "needs_review") {
    return NextResponse.json({ ok: true, review: true });
  }
  if (result === "taken") {
    return NextResponse.json({ error: "This profile has already been claimed. If that wasn't you, contact support." }, { status: 409 });
  }
  return NextResponse.json({ error: "That code doesn't match a profile. Check it and try again." }, { status: 404 });
}
