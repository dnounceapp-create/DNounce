import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSession } from "@/lib/apiAuth";

// Contributors are always shown as "First L." — never a full name.
function toFirstInitial(n?: string | null) {
  if ((n ?? "").trim() === "DNounce Community") return "DNounce Community";
  const parts = (n ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}


export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Next 15 expects params to be a Promise in route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("records")
    .select(`
      id,
      created_at,
      rating,
      description,
      category,
      location,
      anonymity_status,
      relationship,
      status,
      is_published,
      ai_completed_at,
      published_at,
      contributor_identity_preference,
      contributor_display_name,
      contributor_id,
      created_by,
      deleted_at,
      subject:subjects (
        subject_uuid,
        name,
        nickname,
        organization,
        location,
        owner_auth_user_id
      ),
      attachments:record_attachments(path),
      contributor:contributors!records_contributor_id_fkey (
        id,
        user_id,
        auth_user_id,
        profile:user_accountdetails (
          first_name,
          last_name,
          avatar_url
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Record not available publicly. Please sign in." },
      { status: 404 }
    );
  }

  // ✅ relationship typing often comes back as arrays
  const contributor = Array.isArray((data as any).contributor)
    ? (data as any).contributor[0]
    : (data as any).contributor;

  const profile = Array.isArray(contributor?.profile)
    ? contributor.profile[0]
    : contributor?.profile;

  const subject = Array.isArray((data as any).subject) ? (data as any).subject[0] : (data as any).subject;

  // Only published, non-deleted records are public. Anyone else gets the same
  // 404 as a missing record, unless they are the contributor, the subject's
  // owner, or an admin (the "record submitted" page checks this right after
  // submission, before the record is published).
  const isPublic =
    !(data as any).deleted_at &&
    ((data as any).is_published === true || !!(data as any).published_at);

  if (!isPublic) {
    let allowed = false;
    try {
      const caller = await requireSession(request);
      const insiders = [
        (data as any).created_by,
        contributor?.auth_user_id,
        contributor?.user_id,
        subject?.owner_auth_user_id,
      ].filter(Boolean);
      if (insiders.includes(caller.id)) {
        allowed = true;
      } else {
        const { data: role } = await supabaseAdmin
          .from("admin_roles")
          .select("role")
          .eq("user_id", caller.id)
          .maybeSingle();
        allowed = !!role?.role;
      }
    } catch {
      allowed = false;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Record not available publicly. Please sign in." }, { status: 404 });
    }
  }

  // Names always show as "First L.", except old records whose contributor was
  // promised anonymity: those show the alias and nothing that identifies them.
  const hidden = (data as any).contributor_identity_preference === false;
  const first = profile?.first_name || "";
  const last = profile?.last_name || "";
  const profileName = `${first} ${last}`.trim();
  const shortName = hidden
    ? ""
    : toFirstInitial((data as any).contributor_display_name || profileName);
  const publicName = shortName || "SuperHero123";

  let contributorSubjectUuid = null;
  const contributorAuthId = contributor?.auth_user_id ?? contributor?.user_id ?? null;
  if (!hidden && shortName && contributorAuthId) {
    const { data: subjectRow } = await supabaseAdmin
      .from("subjects")
      .select("subject_uuid")
      .eq("owner_auth_user_id", contributorAuthId)
      .maybeSingle();
    contributorSubjectUuid = subjectRow?.subject_uuid ?? null;
  }

  // Never send account ids, full names, or the raw contributor row.
  const {
    contributor: _contributor,
    created_by: _createdBy,
    deleted_at: _deletedAt,
    subject: _subject,
    ...rest
  } = data as any;

  return NextResponse.json({
    ...rest,
    subject: subject
      ? {
          subject_uuid: subject.subject_uuid,
          name: subject.name,
          nickname: subject.nickname,
          organization: subject.organization,
          location: subject.location,
        }
      : null,
    contributorDisplayName: publicName,
    contributor_display_name: publicName,
    contributorAvatarUrl: hidden ? null : profile?.avatar_url ?? null,
    contributorSubjectUuid,
  });
}
