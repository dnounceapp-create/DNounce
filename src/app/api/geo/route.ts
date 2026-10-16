import { NextRequest, NextResponse } from "next/server";
import { requireSession, authErrorResponse, rateLimitByIp } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const limited = rateLimitByIp(req);
  if (limited) return limited;
  try {
    await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    if (!ip || ip === "127.0.0.1" || ip === "::1") {
      return NextResponse.json({ city: null, region: null, country: null });
    }

    const res = await fetch(
      `https://ipinfo.io/${ip}/json?token=${process.env.NEXT_PUBLIC_IPINFO_KEY}`
    );

    if (!res.ok) return NextResponse.json({ city: null, region: null, country: null });

    const data = await res.json();

    return NextResponse.json({
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
    });
  } catch {
    return NextResponse.json({ city: null, region: null, country: null });
  }
}