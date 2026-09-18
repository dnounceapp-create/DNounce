import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { codeId, recordId } = await req.json();
    if (!codeId || !recordId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await supabaseAdmin.from('record_claim_codes').delete().eq('id', codeId);
    await supabaseAdmin.from('records').delete().eq('id', recordId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
