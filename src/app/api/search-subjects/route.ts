import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // ✅ service key, safer than anon
);

export async function POST(req: Request) {
  try {
    const filters = await req.json();

    let query = supabase.from("profiles").select("*");

    if (filters.profileId) query.eq("id", filters.profileId);
    if (filters.name) query.ilike("name", `%${filters.name}%`);
    if (filters.nickname) query.ilike("nickname", `%${filters.nickname}%`);
    if (filters.organization) query.ilike("organization", `%${filters.organization}%`);
    if (filters.category) query.ilike("category", `%${filters.category}%`);
    if (filters.location) query.ilike("location", `%${filters.location}%`);
    if (filters.relationship) query.eq("relationship", filters.relationship);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database error:", error.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ profiles: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}