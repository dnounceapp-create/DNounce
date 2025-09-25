import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Fetch records including related users
  const { data, error } = await supabase
    .from("records")
    .select("id, contributor_alias, record_type, stage, outcome, users(id, personal_category)");

  if (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform records safely
  const records = (data || []).map((r: any) => ({
    id: r.id,
    contributor_alias: r.contributor_alias,
    subject_name: r.users?.[0]?.personal_category || "Unknown", // ✅ FIXED
    record_type: r.record_type,
    stage: r.stage,
    outcome: r.outcome,
  }));

  return NextResponse.json(records);
}