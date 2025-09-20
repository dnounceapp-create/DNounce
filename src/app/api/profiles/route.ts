import { NextResponse } from "next/server";
import { searchSubjects } from "@/lib/searchSubjectsQuery";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

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

    const data = await searchSubjects(filters);

    return NextResponse.json({ profiles: data });
  } catch (err: any) {
    console.error("❌ Server error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}