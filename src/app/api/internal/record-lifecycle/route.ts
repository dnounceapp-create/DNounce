import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {

    const { data: records, error } = await admin
      .from("records")
      .select("*");

    if (error) throw error;

    const now = new Date();

    for (const r of records ?? []) {

      const status = (r.status || "").toLowerCase();

      // -------------------------
      // Stage 1 → Stage 2
      // -------------------------
      if (status === "ai_verification" && r.ai_completed_at) {

        await admin
          .from("records")
          .update({ status: "subject_notified" })
          .eq("id", r.id);

        continue;
      }

      // -------------------------
      // Stage 2 → Stage 3
      // -------------------------
      if (status === "subject_notified" && r.ai_completed_at) {

        const aiDone = new Date(r.ai_completed_at);
        const publishTime = new Date(aiDone.getTime() + (72 + 24) * 60 * 60 * 1000);

        if (now >= publishTime) {

          await admin
            .from("records")
            .update({
              status: "published",
              is_published: true,
              published_at: now.toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }

      // -------------------------
      // Stage 4 → Stage 5
      // -------------------------
      if (status === "deletion_request" && r.updated_at) {

        const start = new Date(r.updated_at);
        const debateStart = new Date(start.getTime() + 72 * 60 * 60 * 1000);

        if (now >= debateStart) {
          await admin
            .from("records")
            .update({ status: "debate" })
            .eq("id", r.id);
        }

        continue;
      }

      // -------------------------
      // Stage 5 → Stage 6
      // -------------------------
      if (status === "debate" && r.updated_at) {

        const start = new Date(r.updated_at);
        const votingStart = new Date(start.getTime() + 72 * 60 * 60 * 1000);

        if (now >= votingStart) {
          await admin
            .from("records")
            .update({ status: "voting" })
            .eq("id", r.id);
        }

        continue;
      }

      // -------------------------
      // Stage 6 → Stage 7
      // -------------------------
      if (status === "voting" && r.updated_at) {

        const start = new Date(r.updated_at);
        const final = new Date(start.getTime() + 48 * 60 * 60 * 1000);

        if (now >= final) {
          await admin
            .from("records")
            .update({ status: "decision" })
            .eq("id", r.id);
        }

      }

    }

    return NextResponse.json({ ok: true });

  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
