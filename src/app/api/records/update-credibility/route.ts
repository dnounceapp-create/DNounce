import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({ ok: true, route: "update-credibility" });
}

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
      credibility === "Anonymity Granted"
        ? 0.9
        : credibility === "Anonymity Not Granted"
        ? 0.6
        : 0.3;

    const { data, error } = await admin
      .from("records")
      .update({
        credibility,
        ai_vendor_1_result: credibility,
        ai_vendor_1_score: score,
        ai_completed_at: new Date().toISOString(),
      
        // advance workflow: once AI classification exists, notify subject stage
        status: "subject_notified",
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

    // Zero-knowledge safety net: if AG + anonymous preference, sever contributor link
    if (credibility === "Anonymity Granted") {
      const { data: rec } = await admin
        .from("records")
        .select("contributor_id, contributor_identity_preference, contributor:contributors!records_contributor_id_fkey(auth_user_id)")
        .eq("id", recordId)
        .maybeSingle();

      if (rec?.contributor_identity_preference === false && rec?.contributor_id) {
        const authUserId = (rec.contributor as any)?.auth_user_id;
        if (authUserId) {
          const msgBuffer = new TextEncoder().encode(authUserId);
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

          await admin
            .from("records")
            .update({
              anon_contributor_hash: hashHex,
              contributor_id: null,
            })
            .eq("id", recordId);
        }
      }
    }

    return NextResponse.json({ ok: true, record: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
