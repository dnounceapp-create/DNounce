import { NextResponse } from "next/server";
import { searchSubjects } from "@/lib/searchSubjectsQuery";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Collect filters safely
    const filters = {
      profileId: searchParams.get("profileId") || undefined,
      nickname: searchParams.get("nickname") || undefined,
      name: searchParams.get("name") || undefined,
      organization: searchParams.get("organization") || undefined,
      category: searchParams.get("category") || undefined,
      location: searchParams.get("location") || undefined,
      relationship: searchParams.get("relationship") || undefined,
      otherRelationship: searchParams.get("otherRelationship") || undefined,
    };

    console.log("📥 Incoming profile search filters:", filters);

    const results = await searchSubjects(filters);

    console.log("📤 Query results:", results);

    return NextResponse.json({ profiles: results });
  } catch (err: any) {
    console.error("❌ profiles API failed:", err);
    return NextResponse.json(
      {
        error: "Server error",
        details: err.message || String(err),
      },
      { status: 500 }
    );
  }
}
