import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public: answers only "is this code valid for this record, and is it used?"
// Never returns the code list, subject contact info, or claimer info.
export async function POST(req: Request) {
  try {
    const { recordId, code } = await req.json();
    const cleanCode = String(code ?? "").replace(/\D/g, "");
    if (!recordId || cleanCode.length !== 6) return NextResponse.json({ valid: false, used: false });

    const { data } = await supabaseAdmin
      .from("record_claim_codes")
      .select("used")
      .eq("record_id", recordId)
      .eq("code", cleanCode)
      .maybeSingle();

    if (!data) return NextResponse.json({ valid: false, used: false });
    return NextResponse.json({ valid: true, used: !!data.used });
  } catch {
    return NextResponse.json({ valid: false, used: false }, { status: 500 });
  }
}
