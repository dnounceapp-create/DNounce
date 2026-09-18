import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      recordId, code, userId, contributorId,
      description, displayName, identityPreference,
      category, relationship, rating, location,
      firstName, lastName, nickname, organization, subjectId,
    } = await req.json();

    if (!recordId || !code || !userId || !contributorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify code one more time server-side
    const { data: claimCode } = await supabaseAdmin
      .from('record_claim_codes')
      .select('id, used')
      .eq('record_id', recordId)
      .eq('code', code)
      .maybeSingle();

    if (!claimCode || claimCode.used) {
      return NextResponse.json({ error: 'Invalid or already used claim code' }, { status: 400 });
    }

    // Verify record is claimable
    const { data: record } = await supabaseAdmin
      .from('records')
      .select('dnounce_mod_record, contributor_claimed, contributor_override_used')
      .eq('id', recordId)
      .maybeSingle();

    if (!record?.dnounce_mod_record || record.contributor_claimed || record.contributor_override_used) {
      return NextResponse.json({ error: 'Record is not claimable' }, { status: 400 });
    }

    // Transfer record ownership + apply overrides + reset lifecycle
    const { error: updateErr } = await supabaseAdmin
      .from('records')
      .update({
        contributor_id: contributorId,
        created_by: userId,
        description: description?.trim(),
        contributor_display_name: identityPreference === 'hide' ? 'SuperHero123' : displayName?.trim(),
        contributor_identity_preference: identityPreference !== 'hide',
        category: category?.trim(),
        relationship: relationship?.trim(),
        rating,
        location: location?.trim(),
        contributor_claimed: true,
        contributor_override_used: true,
        status: 'subject_notified',
        anonymity_status: (() => {
          const hasAttachments = false; // attachments handled separately
          if (!hasAttachments && rating && rating <= 5) return 'Anonymity Not Granted';
          return 'Anonymity Granted';
        })(),
        ai_completed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        published_at: null,
        is_published: false,
        debate_started_at: null,
        debate_ends_at: null,
        voting_started_at: null,
        voting_ends_at: null,
        verdict_announced_at: null,
        decision_started_at: null,
      })
      .eq('id', recordId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Update subject info
    if (subjectId) {
      await supabaseAdmin
        .from('subjects')
        .update({
          name: `${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}`.trim(),
          nickname: nickname?.trim() || null,
          organization: organization?.trim() || null,
          location: location?.trim() || null,
        })
        .eq('subject_uuid', subjectId);
    }

    // Mark claim code used
    await supabaseAdmin
      .from('record_claim_codes')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('record_id', recordId)
      .eq('code', code);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
