import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DNOUNCE_MOD_CONTRIBUTOR_ID = 'ef0fdd91-38c6-438b-8229-f2efa16bdaa9';
const DNOUNCE_MOD_AUTH_ID = 'b164ea4a-6ced-48dc-9546-cab73967d6b8';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceUrl, notes, cFirstName, cLastName, cJobTitle, cLocation, sFirstName, sLastName, sNickname, sOrganization, sRelationship, sCategory, sLocation, sPhone, sEmail, rating, description } = body;

    if (!sFirstName?.trim()) return NextResponse.json({ error: 'Subject first name is required.' }, { status: 400 });
    if (!sCategory?.trim()) return NextResponse.json({ error: 'Category is required.' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Experience description is required.' }, { status: 400 });
    if (!sourceUrl?.trim()) return NextResponse.json({ error: 'Source URL is required.' }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from('record_claim_codes').select('id').eq('source_url', sourceUrl.trim()).maybeSingle();
    if (existing) return NextResponse.json({ error: 'A record already exists for this source URL.' }, { status: 400 });

    const subjectName = `${sFirstName.trim()} ${sLastName?.trim() ?? ''}`.trim();
    const { data: subject, error: subjectErr } = await supabaseAdmin.from('subjects').insert({ name: subjectName, nickname: sNickname?.trim() || null, organization: sOrganization?.trim() || null, location: sLocation?.trim() || null }).select('subject_uuid').single();
    if (subjectErr || !subject) return NextResponse.json({ error: 'Failed to create subject: ' + subjectErr?.message }, { status: 500 });

    const { data: record, error: recordErr } = await supabaseAdmin.from('records').insert({
      subject_id: subject.subject_uuid,
      contributor_id: DNOUNCE_MOD_CONTRIBUTOR_ID,
      created_by: DNOUNCE_MOD_AUTH_ID,
      record_type: 'evidence',
      is_published: true,
      relationship: sRelationship?.trim() || 'Client',
      location: sLocation?.trim() || null,
      category: sCategory.trim(),
      rating: rating || 0,
      description: description.trim(),
      submitted_at: new Date().toISOString(),
      agree_terms: true,
      status: 'voting',
      anonymity_status: 'Anonymity Granted',
      published_at: new Date().toISOString(),
      contributor_identity_preference: true,
      contributor_display_name: 'DNounce Community',
      voting_started_at: new Date().toISOString(),
      voting_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      dnounce_mod_record: true,
      contributor_claimed: false,
    }).select('id').single();
    if (recordErr || !record) return NextResponse.json({ error: 'Failed to create record: ' + recordErr?.message }, { status: 500 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: codeErr } = await supabaseAdmin.from('record_claim_codes').insert({
      record_id: record.id,
      code,
      source_url: sourceUrl.trim(),
      notes: notes?.trim() || null,
      subject_phone: sPhone?.trim() || null,
      subject_email: sEmail?.trim() || null,
      claimer_first_name: cFirstName?.trim() || null,
      claimer_last_name: cLastName?.trim() || null,
      claimer_job_title: cJobTitle?.trim() || null,
      claimer_location: cLocation?.trim() || null,
    });
    if (codeErr) return NextResponse.json({ error: 'Record created but failed to generate code: ' + codeErr.message }, { status: 500 });

    return NextResponse.json({ success: true, code, recordId: record.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
