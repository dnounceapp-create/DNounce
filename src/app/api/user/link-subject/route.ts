import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Who to link, and which phone/email to match on, come from the server only.
    // The request body (userId, phone, email) is not read.
    const userId = caller.id;
    const { data: acct } = await supabaseAdmin
      .from('user_accountdetails')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();

    const cleanPhone = (acct?.phone || '').replace(/\D/g, '');
    const cleanEmail = (caller.email || '').trim().toLowerCase();

    if (!cleanPhone && !cleanEmail) return NextResponse.json({ linked: false });

    // Find matching claim code by subject phone or email
    let claimMatch = null;

    if (cleanPhone) {
      const { data } = await supabaseAdmin
        .from('record_claim_codes')
        .select('record_id, records(subject_id)')
        .eq('subject_phone', cleanPhone)
        .maybeSingle();
      claimMatch = data;
    }

    if (!claimMatch && cleanEmail) {
      const { data } = await supabaseAdmin
        .from('record_claim_codes')
        .select('record_id, records(subject_id)')
        .eq('subject_email', cleanEmail)
        .maybeSingle();
      claimMatch = data;
    }

    if (!claimMatch) return NextResponse.json({ linked: false });

    const subjectId = (claimMatch.records as any)?.subject_id;
    if (!subjectId) return NextResponse.json({ linked: false });

    // Link user to subject only if unclaimed
    const { error } = await supabaseAdmin
      .from('subjects')
      .update({ owner_auth_user_id: userId })
      .eq('subject_uuid', subjectId)
      .is('owner_auth_user_id', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ linked: true, subjectId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
