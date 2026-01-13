import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeCredibility(raw: any) {
  const s = (raw || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—−]/g, "-");
  if (s.includes("evidence-based") || s.includes("evidence based")) return "Evidence-Based";
  if (s.includes("opinion-based") || s.includes("opinion based")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending";
}

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
      credibility,
      relationship,
      status,
      is_published,
      ai_completed_at,
      published_at,
      contributor_identity_preference,
      contributor_id,
      subject:subjects (
        subject_uuid,
        name,
        nickname,
        organization,
        location
      ),
      attachments:record_attachments(path),
      contributor:contributors!records_contributor_id_fkey (
        id,
        user_id,
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
      { error: error?.message || "Not found" },
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

  const cred = normalizeCredibility((data as any).credibility);
  const choseName = (data as any).contributor_identity_preference === true;

  const first = profile?.first_name || "";
  const last = profile?.last_name || "";
  const realName = `${first} ${last}`.trim() || "Individual Contributor";

  let contributorDisplayName = "Individual Contributor";
  if (choseName) contributorDisplayName = realName;
  else if (cred === "Evidence-Based") contributorDisplayName = "SuperHero123";
  else if (cred === "Unclear") contributorDisplayName = "BeWary123";
  else if (cred === "Opinion-Based") contributorDisplayName = realName;

  return NextResponse.json({
    ...data,
    contributorDisplayName,
    contributorAvatarUrl: profile?.avatar_url ?? null,
  });
}
