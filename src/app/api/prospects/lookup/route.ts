import { NextResponse } from "next/server";
import { serviceClient, attemptKey, tooManyWrongTries, logTry, isCode } from "../_shared";

/**
 * GET /api/prospects/lookup?code=123456
 * Shows a pre-built profile's preview to whoever has its code. Only the details
 * that would appear on the profile anyway; never phone or email.
 * Wrong codes are counted, and too many in an hour get blocked.
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!isCode(code)) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const db = serviceClient();
  const key = attemptKey(req);
  if (await tooManyWrongTries(db, key)) {
    return NextResponse.json({ error: "Too many tries. Please wait an hour and try again." }, { status: 429 });
  }

  const { data: p } = await db
    .from("prospect_profiles")
    .select("first_name, last_name, company_name, nickname, neighborhood, trade, status")
    .eq("claim_code", code)
    .maybeSingle();

  await logTry(db, key, !!p);
  if (!p) return NextResponse.json({ error: "That code doesn't match a profile. Check it and try again." }, { status: 404 });

  return NextResponse.json({
    profile: {
      first_name: p.first_name,
      last_name: p.last_name,
      company_name: p.company_name,
      nickname: p.nickname,
      neighborhood: p.neighborhood,
      trade: p.trade,
      claimed: p.status === "claimed",
    },
  });
}
