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
          const executionEndsAt = new Date(votingEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
          const verdictAnnouncedAt = new Date(votingEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
          await admin
            .from("records")
            .update({
              status: "decision",
              execution_ends_at: executionEndsAt.toISOString(),
              verdict_announced_at: verdictAnnouncedAt.toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }

      // =====================================================
      // STAGE 7 — Finalize after execution window closes
      // =====================================================
      if (status === "decision" && r.execution_ends_at && !r.decision_made_at) {
        const executionEnd = new Date(r.execution_ends_at);

        if (now >= executionEnd) {
          await admin
            .from("records")
            .update({
              decision_made_at: now.toISOString(),
            })
            .eq("id", r.id);
        }

        continue;
      }

      // =====================================================
      // VERDICT COUNTDOWN — notify 24h before announcement
      // =====================================================
      if (status === "decision" && r.verdict_announced_at && !r.decision_made_at) {
        const verdictAt = new Date(r.verdict_announced_at);
        const notifyAt = new Date(verdictAt.getTime() - 24 * 60 * 60 * 1000);

        if (now >= notifyAt && now < verdictAt) {
          // Check if we already sent this notification
          const { data: existing } = await admin
            .from("notifications")
            .select("id")
            .eq("record_id", r.id)
            .eq("type", "verdict_countdown")
            .maybeSingle();

          if (!existing) {
            const countdownNotifs: { user_id: string; title: string; body: string; type: string; record_id: string }[] = [];

            // Subject
            if (r.subject_id) {
              const { data: subjectOwner } = await admin
                .from("subjects")
                .select("owner_auth_user_id")
                .eq("subject_uuid", r.subject_id)
                .maybeSingle();
              if (subjectOwner?.owner_auth_user_id) {
                countdownNotifs.push({
                  user_id: subjectOwner.owner_auth_user_id,
                  title: "Verdict drops in 24 hours",
                  body: "The community verdict on a record about you will be announced tomorrow. Come back to see the result.",
                  type: "verdict_countdown",
                  record_id: r.id,
                });
              }
            }

            // Contributor
            if (r.contributor_id) {
              const { data: contributor } = await admin
                .from("contributors")
                .select("auth_user_id")
                .eq("id", r.contributor_id)
                .maybeSingle();
              if (contributor?.auth_user_id) {
                countdownNotifs.push({
                  user_id: contributor.auth_user_id,
                  title: "Verdict drops in 24 hours",
                  body: "The community verdict on a record you submitted will be announced tomorrow.",
                  type: "verdict_countdown",
                  record_id: r.id,
                });
              }
            }

            // Voters
            const { data: voters } = await admin
              .from("record_votes")
              .select("user_id")
              .eq("record_id", r.id);
            (voters ?? []).forEach((v: any) => {
              countdownNotifs.push({
                user_id: v.user_id,
                title: "Verdict drops in 24 hours",
                body: "A record you voted on is announcing its verdict tomorrow. Come back to see the result.",
                type: "verdict_countdown",
                record_id: r.id,
              });
            });

            // Followers
            const { data: followers } = await admin
              .from("record_follows")
              .select("user_id")
              .eq("record_id", r.id);
            (followers ?? []).forEach((f: any) => {
              countdownNotifs.push({
                user_id: f.user_id,
                title: "Verdict drops in 24 hours",
                body: "A record you are following is announcing its verdict tomorrow. Come back to see the result.",
                type: "verdict_countdown",
                record_id: r.id,
              });
            });

            if (countdownNotifs.length > 0) {
              await admin.from("notifications").insert(countdownNotifs);
            }
          }
        }

        // Announce verdict when verdict_announced_at passes
        if (now >= verdictAt) {
          const { data: existing } = await admin
            .from("notifications")
            .select("id")
            .eq("record_id", r.id)
            .eq("type", "verdict_announced")
            .maybeSingle();

          if (!existing) {
            const notifs: { user_id: string; title: string; body: string; type: string; record_id: string }[] = [];

            // Subject
            if (r.subject_id) {
              const { data: subjectOwner } = await admin
                .from("subjects")
                .select("owner_auth_user_id")
                .eq("subject_uuid", r.subject_id)
                .maybeSingle();
              if (subjectOwner?.owner_auth_user_id) {
                notifs.push({
                  user_id: subjectOwner.owner_auth_user_id,
                  title: "The verdict is in",
                  body: "The community has reached a decision on a record about you. See the result now.",
                  type: "verdict_announced",
                  record_id: r.id,
                });
              }
            }

            // Contributor
            if (r.contributor_id) {
              const { data: contributor } = await admin
                .from("contributors")
                .select("auth_user_id")
                .eq("id", r.contributor_id)
                .maybeSingle();
              if (contributor?.auth_user_id) {
                notifs.push({
                  user_id: contributor.auth_user_id,
                  title: "The verdict is in",
                  body: "The community has reached a decision on a record you submitted. See the result now.",
                  type: "verdict_announced",
                  record_id: r.id,
                });
              }
            }

            // Voters
            const { data: voters } = await admin
              .from("record_votes")
              .select("user_id")
              .eq("record_id", r.id);
            (voters ?? []).forEach((v: any) => {
              notifs.push({
                user_id: v.user_id,
                title: "The verdict is in",
                body: "The community has reached a decision on a record you voted on. See the result now.",
                type: "verdict_announced",
                record_id: r.id,
              });
            });

            // Followers
            const { data: followers } = await admin
              .from("record_follows")
              .select("user_id")
              .eq("record_id", r.id);
            (followers ?? []).forEach((f: any) => {
              notifs.push({
                user_id: f.user_id,
                title: "The verdict is in",
                body: "A record you are following has reached a verdict. See the result now.",
                type: "verdict_announced",
                record_id: r.id,
              });
            });

            if (notifs.length > 0) {
              await admin.from("notifications").insert(notifs);
            }
          }
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


