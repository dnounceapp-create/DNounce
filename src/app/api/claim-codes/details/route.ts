import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Signed-in only, and only with a valid unused code for this exact record.
// Returns the prefill info for the claim page.
export async function POST(req: Request) {
  try {
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authToken) return NextResponse.json({ valid: false }, { status: 401 });
    const { data: { user } } = await supabaseAdmin.auth.getUser(authToken);
    if (!user) return NextResponse.json({ valid: false }, { status: 401 });

    const { recordId, code } = await req.json();
    const cleanCode = String(code ?? "").replace(/\D/g, "");
    if (!recordId || cleanCode.length !== 6) return NextResponse.json({ valid: false });

    const { data } = await supabaseAdmin
      .from("record_claim_codes")
      .select("id, used, claimer_first_name, claimer_last_name, claimer_job_title, claimer_location, subject_phone, subject_email")
      .eq("record_id", recordId)
      .eq("code", cleanCode)
      .maybeSingle();

    if (!data) return NextResponse.json({ valid: false });
    if (data.used) return NextResponse.json({ valid: true, used: true });

    // The record itself is not public before it is claimed, so the claim page
    // gets its content here, only after the code has been checked.
    const { data: record } = await supabaseAdmin
      .from("records")
      .select("description, contributor_display_name, contributor_claimed, dnounce_mod_record, contributor_override_used, category, relationship, rating, location, subject_id, contributor_identity_preference")
      .eq("id", recordId)
      .maybeSingle();

    return NextResponse.json({
      record: record ?? null,
      valid: true,
      used: false,
      id: data.id,
      claimer_first_name: data.claimer_first_name,
      claimer_last_name: data.claimer_last_name,
      claimer_job_title: data.claimer_job_title,
      claimer_location: data.claimer_location,
      subject_phone: data.subject_phone,
      subject_email: data.subject_email,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
