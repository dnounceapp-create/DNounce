import { NextResponse } from "next/server";
import { searchSubjects } from "@/lib/searchSubjectsQuery";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      profileId: searchParams.get("profileId") || "",
      nickname: searchParams.get("nickname") || "",
      name: searchParams.get("name") || "",
      organization: searchParams.get("organization") || "",
      category: searchParams.get("category") || "",
      location: searchParams.get("location") || "",
      relationship: searchParams.get("relationship") || "",
      otherRelationship: searchParams.get("otherRelationship") || "",
    };

    const { data, error } = await searchSubjects(filters);

    if (error) {
      console.error("❌ Database error:", error.message);
      return NextResponse.json(
        { error: "Database error", details: error.message, profiles: [] },
        { status: 200 } // 👈 Still return 200, just with empty profiles
      );
    }

    // Always respond with profiles (empty array if nothing found)
    return NextResponse.json({ profiles: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Unexpected server error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message, profiles: [] },
      { status: 200 } // 👈 Also return 200 here
    );
  }
}