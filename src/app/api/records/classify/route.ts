import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyRecord } from "@/lib/ai/classifyRecord";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { recordId } = await req.json();

    if (!recordId || typeof recordId !== "string") {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    // 1) Read the record
    const { data: record, error: fetchError } = await supabaseAdmin
      .from("records")
      .select("id, description, rating")
      .eq("id", recordId)
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: "Record not found", details: fetchError?.message },
        { status: 404 }
      );
    }

    // 2) Compute credibility
    const credibility = classifyRecord({
      description: record.description,
      rating: record.rating,
      hasAttachments: false, // keep simple for now
    });

    const ai_vendor_1_score =
      credibility === "Evidence-Based"
        ? 0.9
        : credibility === "Opinion-Based"
        ? 0.6
        : 0.3;

    // 3) Update the record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("records")
      .update({
        credibility,
        ai_vendor_1_result: credibility,
        ai_vendor_1_score,
        record_type: "classified",
      })
      .eq("id", recordId)
      .select("id, record_type, credibility, ai_vendor_1_result, ai_vendor_1_score")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Update failed", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Internal error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
