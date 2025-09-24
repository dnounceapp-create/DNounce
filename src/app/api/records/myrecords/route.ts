import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch their records
  const { data: records, error } = await supabase
    .from("records")
    .select(
      `
      id,
      contributor_alias,
      subject_id,
      record_type,
      stage,
      outcome,
      submitted_at,
      votes,
      views,
      last_activity_at,
      users!records_subject_id_fkey ( id, personal_category )
    `
    )
    .eq("subject_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching records:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Stats
  const total = records.length;
  const kept = records.filter((r) => r.outcome === "kept").length;
  const deleted = records.filter((r) => r.outcome === "deleted").length;

  // 4. Format response
  return NextResponse.json({
    stats: { total, kept, deleted },
    items: records.map((r) => ({
      id: r.id,
      contributor_alias: r.contributor_alias,
      subject_name: r.users?.personal_category || "Unknown",
      record_type: r.record_type,
      stage: r.stage,
      outcome: r.outcome,
      submitted_at: r.submitted_at,
      votes: r.votes,
      views: r.views,
      last_activity_at: r.last_activity_at,
    })),
  });
}