import { NextResponse } from "next/server";
import { searchSubjects } from "@/lib/searchSubjectsQuery";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      profileId: searchParams.get("profileId") || undefined,
      name: searchParams.get("name") || undefined,
      nickname: searchParams.get("nickname") || undefined,
      organization: searchParams.get("organization") || undefined,
      category: searchParams.get("category") || undefined,
      location: searchParams.get("location") || undefined,
      relationship: searchParams.get("relationship") || undefined,
      otherRelationship: searchParams.get("otherRelationship") || undefined,
    };

    const results = await searchSubjects(filters);

    return NextResponse.json({ profiles: results });
  } catch (err: any) {
    console.error("❌ API error:", err.message);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}