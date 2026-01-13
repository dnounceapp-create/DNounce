import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: server-only
);

function normalizeCredibility(raw: any) {
  const s = (raw || "").toString().trim().toLowerCase().replace(/[‐-‒–—−]/g, "-");
  if (s.includes("evidence-based") || s.includes("evidence based")) return "Evidence-Based";
  if (s.includes("opinion-based") || s.includes("opinion based")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending";
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const recordId = params.id;

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
      contributor:contributors (
        id,
        user_id,
        profile:user_accountdetails (
          first_name,
          last_name,
          avatar_url
        )
      )
    `)
    .eq("id", recordId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
  }

  const cred = normalizeCredibility(data.credibility);
  const choseName = data.contributor_identity_preference === true;

  const first = data?.contributor?.profile?.first_name || "";
  const last = data?.contributor?.profile?.last_name || "";
  const realName = `${first} ${last}`.trim() || "Individual Contributor";

  // ✅ Apply YOUR RULES
  let contributorDisplayName = "Individual Contributor";

  if (choseName) contributorDisplayName = realName;
  else if (cred === "Evidence-Based") contributorDisplayName = "SuperHero123";
  else if (cred === "Unclear") contributorDisplayName = "BeWary123";
  else if (cred === "Opinion-Based") contributorDisplayName = realName;

  return NextResponse.json({
    ...data,
    contributorDisplayName,
    contributorAvatarUrl: data?.contributor?.profile?.avatar_url ?? null,
  });
}
