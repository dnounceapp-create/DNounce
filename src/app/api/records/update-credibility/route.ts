import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { recordId, credibility } = body as {
      recordId?: string;
      credibility?: string;
    };

    if (!recordId || !credibility) {
      return NextResponse.json(
        { error: "Missing recordId or credibility" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server env vars missing (SUPABASE url or service role key)" },
        { status: 500 }
      );
    }

    // service role bypasses RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const score =
      credibility === "Evidence-Based"
        ? 0.9
        : credibility === "Opinion-Based"
        ? 0.6
        : 0.3;

    const { data, error } = await admin
      .from("records")
      .update({
        credibility,
        ai_vendor_1_result: credibility,
        ai_vendor_1_score: score,
      })
      .eq("id", recordId)
      .select("id, record_type, credibility, ai_vendor_1_result, ai_vendor_1_score")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, record: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
