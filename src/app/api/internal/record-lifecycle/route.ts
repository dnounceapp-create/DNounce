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

      // =====================================================
      // STAGE 1 → STAGE 2 (AI finished → Subject Notified)
      // =====================================================
      if (status === "ai_verification" && r.ai_completed_at) {
        await admin
          .from("records")
          .update({
            status: "subject_notified",
          })
          .eq("id", r.id);

        continue;
      }

      // =====================================================
      // STAGE 2 → STAGE 3 (Publish after required window)
      // =====================================================
      if (status === "subject_notified" && r.ai_completed_at) {
        const aiDone = new Date(r.ai_completed_at);

        // 72h AI window + 24h buffer
        const publishTime = new Date(
          aiDone.getTime() + (72 + 24) * 60 * 60 * 1000
        );

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

      // =====================================================
      // STAGE 4 → STAGE 5 (Deletion Request → Debate after 72h)
      // =====================================================
      if (status === "deletion_request" && r.dispute_started_at) {
        const start = new Date(r.dispute_started_at);
        const debateStart = new Date(
          start.getTime() + 72 * 60 * 60 * 1000
        );

        if (now >= debateStart) {
          await admin
            .from("records")
            .update({
              status: "debate",
              debate_started_at: now.toISOString(),
              debate_ends_at: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }

      // =====================================================
      // STAGE 5 → STAGE 6 (Debate → Voting when debate ends)
      // =====================================================
      if (status === "debate" && r.debate_started_at) {
        const start = new Date(r.debate_started_at);

        // Authoritative end if present, else fallback = start + 72h
        const debateEnd = r.debate_ends_at
          ? new Date(r.debate_ends_at)
          : new Date(start.getTime() + 72 * 60 * 60 * 1000);

        // If debate_ends_at was missing, backfill it once (optional but nice)
        if (!r.debate_ends_at) {
          await admin
            .from("records")
            .update({ debate_ends_at: debateEnd.toISOString() })
            .eq("id", r.id);
        }

        if (now >= debateEnd) {
          await admin
            .from("records")
            .update({
              status: "voting",
              voting_started_at: now.toISOString(),
              voting_ends_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }

      // =====================================================
      // STAGE 6 → STAGE 7 (Voting → Decision when voting ends)
      // =====================================================
      if (status === "voting" && r.voting_started_at) {
        const start = new Date(r.voting_started_at);

        const votingEnd = r.voting_ends_at
          ? new Date(r.voting_ends_at)
          : new Date(start.getTime() + 48 * 60 * 60 * 1000);

        if (!r.voting_ends_at) {
          await admin
            .from("records")
            .update({ voting_ends_at: votingEnd.toISOString() })
            .eq("id", r.id);
        }

        if (now >= votingEnd) {
          await admin
            .from("records")
            .update({
              status: "decision",
              decision_made_at: now.toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}


