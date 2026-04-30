import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get plan
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .single();
    const planId = subData?.plan_id ?? "standard";

    // Get subject_id and contributor_id
    const { data: userData } = await supabase
      .from("users")
      .select("subject_id")
      .eq("auth_user_id", user.id)
      .single();
    const subjectId = userData?.subject_id ?? null;

    const { data: contributorData } = await supabase
      .from("contributors")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const contributorId = contributorData?.id ?? null;

    // ─── Base queries (Insights + Pro) ───────────────────────────────────

    const [
      profileViewsRes,
      searchImpressionsRes,
      recordsAboutMeRes,
      recordsSubmittedRes,
      votesRes,
      citizenStatementsRes,
      debateStatementsRes,
      userScoreRes,
      subjectScoreRes,
      categoryRes,
    ] = await Promise.all([
      subjectId
        ? supabase.from("profile_views").select("viewed_at, is_anonymous, viewer_auth_user_id, city, region, country, source, viewer_role").eq("subject_id", subjectId)
        : Promise.resolve({ data: [] }),
      subjectId
        ? supabase.from("search_impressions").select("appeared_at, query, searcher_auth_user_id").eq("subject_id", subjectId)
        : Promise.resolve({ data: [] }),
      subjectId
        ? supabase.from("records").select("id, status, final_outcome, credibility, ai_vendor_1_result, category, voting_started_at, decision_made_at, debate_started_at, published_at, created_at").eq("subject_id", subjectId).in("status", ["published", "deletion_request", "debate", "voting", "decision"])
        : Promise.resolve({ data: [] }),
      contributorId
        ? supabase.from("records").select("id, status, final_outcome, ai_vendor_1_result, credibility, category").eq("contributor_id", contributorId)
        : Promise.resolve({ data: [] }),
      supabase.from("record_votes").select("id, record_id, choice, created_at").eq("user_id", user.id),
      supabase.from("record_community_statements").select("id, record_id").eq("author_user_id", user.id),
      supabase.from("record_debate_messages").select("id, record_id").eq("author_user_id", user.id),
      supabase.from("user_scores").select("credibility_score, contributor_score, voter_score, citizen_score, overall_score").eq("user_id", user.id).single(),
      subjectId
        ? supabase.from("subject_scores").select("subject_score").eq("subject_uuid", subjectId).single()
        : Promise.resolve({ data: null }),
      supabase.from("user_accountdetails").select("job_title").eq("user_id", user.id).single(),
    ]);

    const profileViews = (profileViewsRes as any).data || [];
    const searchImpressions = (searchImpressionsRes as any).data || [];
    const recordsAboutMe = (recordsAboutMeRes as any).data || [];
    const recordsSubmitted = (recordsSubmittedRes as any).data || [];
    const votes = (votesRes as any).data || [];
    const citizenStatements = (citizenStatementsRes as any).data || [];
    const debateStatements = (debateStatementsRes as any).data || [];
    const userScore = (userScoreRes as any).data;
    const subjectScore = (subjectScoreRes as any).data;
    const category = (categoryRes as any).data?.job_title ?? null;

    // ─── Profile view analytics ───────────────────────────────────────────

    const totalProfileViews = profileViews.length;

    const viewerIdCounts: Record<string, number> = {};
    profileViews.forEach((v: any) => {
      if (v.viewer_auth_user_id) {
        viewerIdCounts[v.viewer_auth_user_id] = (viewerIdCounts[v.viewer_auth_user_id] || 0) + 1;
      }
    });
    const uniqueViewers = Object.keys(viewerIdCounts).length;
    const returningCount = Object.values(viewerIdCounts).filter((c) => c > 1).length;
    const newViewerCount = uniqueViewers - returningCount;

    // Time of day
    const timeOfDay: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    profileViews.forEach((v: any) => {
      const hour = new Date(v.viewed_at).getHours();
      if (hour >= 6 && hour < 12) timeOfDay.morning++;
      else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
      else if (hour >= 17 && hour < 21) timeOfDay.evening++;
      else timeOfDay.night++;
    });

    // Peak activity day
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayCounts: Record<string, number> = {};
    profileViews.forEach((v: any) => {
      const day = dayNames[new Date(v.viewed_at).getDay()];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const peakDayData = dayNames.map((d) => ({ day: d, count: dayCounts[d] || 0 }));

    // Geographic breakdown
    const geoMap: Record<string, number> = {};
    profileViews.forEach((v: any) => {
      if (v.city && v.region) {
        const key = `${v.city}, ${v.region}`;
        geoMap[key] = (geoMap[key] || 0) + 1;
      }
    });
    const topLocations = Object.entries(geoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    // ─── Search impressions ───────────────────────────────────────────────

    const totalImpressions = searchImpressions.length;
    const keywordMap: Record<string, number> = {};
    searchImpressions.forEach((s: any) => {
      if (s.query) {
        const q = s.query.toLowerCase().trim();
        keywordMap[q] = (keywordMap[q] || 0) + 1;
      }
    });
    const topKeywords = Object.entries(keywordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));

    // ─── Record outcomes ──────────────────────────────────────────────────

    const totalRecordsAboutMe = recordsAboutMe.length;
    const kept = recordsAboutMe.filter((r: any) => r.final_outcome === "sided_with_contributor").length;
    const deleted = recordsAboutMe.filter((r: any) => r.final_outcome === "sided_with_subject").length;
    const pending = recordsAboutMe.filter((r: any) => !r.final_outcome).length;
    const pctKept = totalRecordsAboutMe > 0 ? Math.round((kept / totalRecordsAboutMe) * 100) : 0;
    const pctDeleted = totalRecordsAboutMe > 0 ? Math.round((deleted / totalRecordsAboutMe) * 100) : 0;
    const pctPending = totalRecordsAboutMe > 0 ? Math.round((pending / totalRecordsAboutMe) * 100) : 0;

    // ─── Credibility breakdown (contributor records) ──────────────────────

    const credMap: Record<string, number> = {};
    recordsSubmitted.forEach((r: any) => {
      const raw = (r.ai_vendor_1_result || r.credibility || "Pending").toString().toLowerCase();
      let label = "Pending";
      if (raw.includes("evidence")) label = "Evidence-Based";
      else if (raw.includes("opinion")) label = "Opinion-Based";
      else if (raw.includes("unable")) label = "Unable to Verify";
      credMap[label] = (credMap[label] || 0) + 1;
    });
    const credibilityBreakdown = Object.entries(credMap).map(([label, count]) => ({ label, count }));

    // ─── Category breakdown ───────────────────────────────────────────────

    const catMap: Record<string, number> = {};
    recordsAboutMe.forEach((r: any) => {
      const cat = r.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    // ─── Notable records ──────────────────────────────────────────────────

    let mostActiveRecord: any = null;
    let mostControversialRecord: any = null;
    let longestDebateRecord: any = null;

    if (recordsAboutMe.length > 0) {
      const recordIds = recordsAboutMe.map((r: any) => r.id);

      const [voteTallyRes, statementCountRes, debateMsgRes] = await Promise.all([
        supabase.from("record_votes").select("record_id, choice").in("record_id", recordIds),
        supabase.from("record_community_statements").select("record_id").in("record_id", recordIds),
        supabase.from("record_debate_messages").select("record_id").in("record_id", recordIds),
      ]);

      const allVotes = (voteTallyRes as any).data || [];
      const allStatements = (statementCountRes as any).data || [];
      const allDebateMsgs = (debateMsgRes as any).data || [];

      const activityScore: Record<string, number> = {};
      const contributorCounts: Record<string, number> = {};
      const subjectCounts: Record<string, number> = {};
      const debateCounts: Record<string, number> = {};
      const statementCounts: Record<string, number> = {};

      recordIds.forEach((id: string) => {
        activityScore[id] = 0;
        contributorCounts[id] = 0;
        subjectCounts[id] = 0;
        debateCounts[id] = 0;
        statementCounts[id] = 0;
      });

      allVotes.forEach((v: any) => {
        activityScore[v.record_id] = (activityScore[v.record_id] || 0) + 1;
        if (v.choice === "side_with_contributor") contributorCounts[v.record_id]++;
        else subjectCounts[v.record_id]++;
      });

      allStatements.forEach((s: any) => {
        activityScore[s.record_id] = (activityScore[s.record_id] || 0) + 1;
        statementCounts[s.record_id]++;
      });

      allDebateMsgs.forEach((m: any) => {
        debateCounts[m.record_id] = (debateCounts[m.record_id] || 0) + 1;
      });

      const mostActiveId = Object.entries(activityScore).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (mostActiveId) {
        const rec = recordsAboutMe.find((r: any) => r.id === mostActiveId);
        mostActiveRecord = {
          id: mostActiveId,
          category: rec?.category ?? "Unknown",
          votes: (contributorCounts[mostActiveId] || 0) + (subjectCounts[mostActiveId] || 0),
          statements: statementCounts[mostActiveId] || 0,
          totalActivity: activityScore[mostActiveId],
        };
      }

      const controversial = Object.entries(contributorCounts)
        .map(([id, k]) => {
          const d = subjectCounts[id] || 0;
          const total = k + d;
          if (total < 2) return null;
          const diff = Math.abs(k - d);
          return { id, contributor: k, subject: d, total, diff };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.diff - b.diff);

      if (controversial.length > 0) {
        const rec = recordsAboutMe.find((r: any) => r.id === controversial[0]!.id);
        mostControversialRecord = {
          id: controversial[0]!.id,
          category: rec?.category ?? "Unknown",
          contributor: controversial[0]!.contributor,
          subject: controversial[0]!.subject,
        };
      }

      const longestDebateId = Object.entries(debateCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (longestDebateId && debateCounts[longestDebateId] > 0) {
        const rec = recordsAboutMe.find((r: any) => r.id === longestDebateId);
        longestDebateRecord = {
          id: longestDebateId,
          category: rec?.category ?? "Unknown",
          messageCount: debateCounts[longestDebateId],
        };
      }
    }

    // ─── Dispute resolution ───────────────────────────────────────────────

    const disputed = recordsAboutMe.filter((r: any) => ["debate", "voting", "decision"].includes(r.status));
    const resolvedInFavor = disputed.filter((r: any) => r.final_outcome === "sided_with_contributor").length;
    const disputeResolutionRate = disputed.length > 0 ? Math.round((resolvedInFavor / disputed.length) * 100) : null;

    const decidedRecords = recordsAboutMe.filter((r: any) => r.voting_started_at && r.decision_made_at);
    let avgVotingDays: number | null = null;
    if (decidedRecords.length > 0) {
      const totalDays = decidedRecords.reduce((acc: number, r: any) => {
        return acc + (new Date(r.decision_made_at).getTime() - new Date(r.voting_started_at).getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgVotingDays = Math.round(totalDays / decidedRecords.length);
    }

    // ─── Contributor success rate ──────────────────────────────────────────

    const totalSubmitted = recordsSubmitted.length;
    const sided_contributor = recordsSubmitted.filter((r: any) => r.final_outcome === "sided_with_contributor").length;
    const sided_subject = recordsSubmitted.filter((r: any) => r.final_outcome === "sided_with_subject").length;
    const contributorSuccessRate = totalSubmitted > 0 ? Math.round((sided_contributor / totalSubmitted) * 100) : null;

    // ─── Most active role ──────────────────────────────────────────────────

    const roleActivity = {
      "Record Contributor": totalSubmitted,
      "Community Voter": votes.length,
      "Citizen": citizenStatements.length,
      "Debate Participant": debateStatements.length,
    };
    const mostActiveRole = Object.entries(roleActivity).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // ─── Comparison vs similar profiles ──────────────────────────────────

    let comparisonData: any = null;
    if (category && subjectId) {
      const { data: similarUsers } = await supabase
        .from("user_accountdetails")
        .select("user_id")
        .ilike("job_title", `%${category}%`)
        .neq("user_id", user.id)
        .limit(50);

      if (similarUsers && similarUsers.length > 0) {
        const { data: similarSubjects } = await supabase
          .from("subjects")
          .select("subject_uuid")
          .in("owner_auth_user_id", similarUsers.map((u: any) => u.user_id));

        if (similarSubjects && similarSubjects.length > 0) {
          const { data: similarScores } = await supabase
            .from("subject_scores")
            .select("subject_score")
            .in("subject_uuid", similarSubjects.map((s: any) => s.subject_uuid));

          if (similarScores && similarScores.length > 0) {
            const scores = similarScores.map((s: any) => Number(s.subject_score ?? 0));
            const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
            const myScore = Number(subjectScore?.subject_score ?? 0);
            const percentile = Math.round(scores.filter((s: number) => s <= myScore).length / scores.length * 100);
            comparisonData = {
              category,
              myScore: myScore.toFixed(1),
              avgScore: avgScore.toFixed(1),
              sampleSize: scores.length,
              percentile,
            };
          }
        }
      }
    }

    // ─── PRO-ONLY queries ─────────────────────────────────────────────────

    let proData: any = null;

    if (planId === "pro") {

      // Monthly growth rate
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const thisMonthViews = profileViews.filter((v: any) => new Date(v.viewed_at) >= thisMonthStart).length;
      const lastMonthViews = profileViews.filter((v: any) => {
        const d = new Date(v.viewed_at);
        return d >= lastMonthStart && d < thisMonthStart;
      }).length;

      const monthlyGrowthRate = lastMonthViews > 0
        ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
        : thisMonthViews > 0 ? 100 : 0;

      // Traffic source breakdown
      const sourceMap: Record<string, number> = { search: 0, direct: 0, record_referral: 0 };
      profileViews.forEach((v: any) => {
        const src = v.source || "direct";
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      });
      const trafficSources = Object.entries(sourceMap).map(([source, count]) => ({
        source,
        count,
        pct: totalProfileViews > 0 ? Math.round((count / totalProfileViews) * 100) : 0,
      }));

      // Viewer role distribution (aggregate only — no names)
      const roleMap: Record<string, number> = {};
      profileViews.forEach((v: any) => {
        const role = v.viewer_role || "Unknown";
        roleMap[role] = (roleMap[role] || 0) + 1;
      });
      const viewerRoleDistribution = Object.entries(roleMap).map(([role, count]) => ({ role, count }));

      // Repeat visitor rate
      const repeatVisitorRate = uniqueViewers > 0
        ? Math.round((returningCount / uniqueViewers) * 100)
        : 0;

      // Peak growth week
      const weekMap: Record<string, number> = {};
      profileViews.forEach((v: any) => {
        const d = new Date(v.viewed_at);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        weekMap[key] = (weekMap[key] || 0) + 1;
      });
      const peakWeek = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0];
      const peakGrowthWeek = peakWeek ? { week: peakWeek[0], count: peakWeek[1] } : null;

      // New viewer trend (last 8 weeks)
      const weeklyNewViewers: { week: string; count: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const count = profileViews.filter((v: any) => {
          const d = new Date(v.viewed_at);
          return d >= weekStart && d < weekEnd && v.viewer_auth_user_id;
        }).length;
        weeklyNewViewers.push({ week: weekStart.toISOString().split("T")[0], count });
      }

      // Submit clicks and social link clicks
      const [submitClicksRes, socialClicksRes, recordViewsRes, scoreSnapshotsRes, followsRes, pinsRes] = await Promise.all([
        subjectId
          ? supabase.from("submit_clicks").select("clicked_at, clicker_auth_user_id").eq("subject_id", subjectId)
          : Promise.resolve({ data: [] }),
        subjectId
          ? supabase.from("social_link_clicks").select("clicked_at, platform").eq("subject_id", subjectId)
          : Promise.resolve({ data: [] }),
        subjectId
          ? supabase.from("record_views").select("record_id, viewed_date").eq("subject_id", subjectId)
          : Promise.resolve({ data: [] }),
        supabase.from("score_snapshots").select("subject_score, credibility_score, overall_score, week_start").eq("user_id", user.id).order("week_start", { ascending: true }).limit(13),
        subjectId
          ? supabase.from("record_follows").select("record_id").in("record_id", recordsAboutMe.map((r: any) => r.id))
          : Promise.resolve({ data: [] }),
        subjectId
          ? supabase.from("pinned_records").select("record_id").in("record_id", recordsAboutMe.map((r: any) => r.id))
          : Promise.resolve({ data: [] }),
      ]);

      const submitClicks = (submitClicksRes as any).data || [];
      const socialClicks = (socialClicksRes as any).data || [];
      const recordViews = (recordViewsRes as any).data || [];
      const scoreSnapshots = (scoreSnapshotsRes as any).data || [];
      const follows = (followsRes as any).data || [];
      const pins = (pinsRes as any).data || [];

      // Conversion funnel
      const profileToSubmitRate = totalProfileViews > 0
        ? Math.round((submitClicks.length / totalProfileViews) * 100)
        : 0;
      const profileToSocialRate = totalProfileViews > 0
        ? Math.round((socialClicks.length / totalProfileViews) * 100)
        : 0;
      const searchToProfileRate = totalImpressions > 0
        ? Math.round((totalProfileViews / totalImpressions) * 100)
        : 0;

      // Social click breakdown by platform
      const platformMap: Record<string, number> = {};
      socialClicks.forEach((c: any) => {
        const p = c.platform || "unknown";
        platformMap[p] = (platformMap[p] || 0) + 1;
      });
      const socialClicksByPlatform = Object.entries(platformMap)
        .sort((a, b) => b[1] - a[1])
        .map(([platform, count]) => ({ platform, count }));

      // Record views per record (for record performance)
      const recordViewMap: Record<string, number> = {};
      recordViews.forEach((v: any) => {
        recordViewMap[v.record_id] = (recordViewMap[v.record_id] || 0) + 1;
      });
      const topRecordsByViews = Object.entries(recordViewMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([recordId, views]) => {
          const rec = recordsAboutMe.find((r: any) => r.id === recordId);
          return { id: recordId, category: rec?.category ?? "Unknown", views };
        });

      // Engagement velocity (avg hours from published to first vote)
      let avgHoursToFirstVote: number | null = null;
      if (recordsAboutMe.length > 0 && votes.length > 0) {
        const recordIds = recordsAboutMe.map((r: any) => r.id);
        const { data: firstVotes } = await supabase
          .from("record_votes")
          .select("record_id, created_at")
          .in("record_id", recordIds)
          .order("created_at", { ascending: true });

        const firstVoteByRecord: Record<string, string> = {};
        (firstVotes || []).forEach((v: any) => {
          if (!firstVoteByRecord[v.record_id]) firstVoteByRecord[v.record_id] = v.created_at;
        });

        const deltas: number[] = [];
        recordsAboutMe.forEach((r: any) => {
          if (r.published_at && firstVoteByRecord[r.id]) {
            const hours = (new Date(firstVoteByRecord[r.id]).getTime() - new Date(r.published_at).getTime()) / (1000 * 60 * 60);
            if (hours >= 0) deltas.push(hours);
          }
        });

        if (deltas.length > 0) {
          avgHoursToFirstVote = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
        }
      }

      // Voter quality on records about me
      let voterQualityScore: number | null = null;
      if (recordsAboutMe.length > 0) {
        const recordIds = recordsAboutMe.map((r: any) => r.id);
        const { data: badges } = await supabase
          .from("voter_quality_badges")
          .select("is_low_quality, is_convicted")
          .in("record_id", recordIds);

        if (badges && badges.length > 0) {
          const lowQuality = badges.filter((b: any) => b.is_low_quality || b.is_convicted).length;
          voterQualityScore = Math.round(((badges.length - lowQuality) / badges.length) * 100);
        }
      }

      // Streak — consecutive weeks with no new deletion requests
      let streakWeeks = 0;
      const deletionRequests = recordsAboutMe
        .filter((r: any) => r.status === "deletion_request" || ["debate", "voting", "decision"].includes(r.status))
        .map((r: any) => new Date(r.published_at || r.created_at));

      if (deletionRequests.length === 0) {
        streakWeeks = Math.floor((Date.now() - new Date(recordsAboutMe[0]?.published_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 7));
      } else {
        const lastDispute = new Date(Math.max(...deletionRequests.map((d: Date) => d.getTime())));
        streakWeeks = Math.floor((Date.now() - lastDispute.getTime()) / (1000 * 60 * 60 * 24 * 7));
      }

      // Reputation Health Score (0-100)
      // 40% subject score (normalized to 100), 20% dispute win rate, 20% credibility quality, 10% engagement velocity, 10% streak
      const subjectScoreNorm = Math.min(100, (Number(subjectScore?.subject_score ?? 0) / 10) * 100);
      const disputeComponent = disputeResolutionRate ?? 50;
      const credQuality = credibilityBreakdown.find(c => c.label === "Evidence-Based")
        ? Math.round((credibilityBreakdown.find(c => c.label === "Evidence-Based")!.count / Math.max(1, totalSubmitted)) * 100)
        : 50;
      const velocityComponent = avgHoursToFirstVote !== null
        ? Math.max(0, 100 - Math.min(100, avgHoursToFirstVote / 2.4))
        : 50;
      const streakComponent = Math.min(100, streakWeeks * 10);
      const reputationHealthScore = Math.round(
        subjectScoreNorm * 0.4 +
        disputeComponent * 0.2 +
        credQuality * 0.2 +
        velocityComponent * 0.1 +
        streakComponent * 0.1
      );

      // Market position — rank in category
      let marketPosition: any = null;
      if (category && subjectId) {
        const { data: similarUsers } = await supabase
          .from("user_accountdetails")
          .select("user_id")
          .ilike("job_title", `%${category}%`)
          .limit(200);

        if (similarUsers && similarUsers.length > 0) {
          const { data: similarSubjects } = await supabase
            .from("subjects")
            .select("subject_uuid")
            .in("owner_auth_user_id", similarUsers.map((u: any) => u.user_id));

          if (similarSubjects && similarSubjects.length > 0) {
            const { data: allScores } = await supabase
              .from("subject_scores")
              .select("subject_score")
              .in("subject_uuid", similarSubjects.map((s: any) => s.subject_uuid));

            if (allScores && allScores.length > 0) {
              const scores = allScores.map((s: any) => Number(s.subject_score ?? 0)).sort((a, b) => b - a);
              const myScore = Number(subjectScore?.subject_score ?? 0);
              const rank = scores.findIndex(s => s <= myScore) + 1;
              const topPct = Math.round((rank / scores.length) * 100);
              const median = scores[Math.floor(scores.length / 2)];
              const avgRecordVolume = totalRecordsAboutMe;
              const categoryAvgDispute = disputeResolutionRate;
              marketPosition = {
                rank,
                total: scores.length,
                topPct,
                category,
                medianScore: median.toFixed(1),
                myScore: myScore.toFixed(1),
                avgRecordVolume,
                categoryAvgDispute,
              };
            }
          }
        }
      }

      // Notification opt-in count (how many people want updates about records on your profile)
      const { count: notifOptIns } = await supabase
        .from("record_follows")
        .select("*", { count: "exact", head: true })
        .in("record_id", recordsAboutMe.map((r: any) => r.id));

      proData = {
        // Awareness
        monthlyGrowthRate,
        thisMonthViews,
        lastMonthViews,
        trafficSources,
        viewerRoleDistribution,
        repeatVisitorRate,
        peakGrowthWeek,
        weeklyNewViewers,

        // Conversion funnel
        totalSubmitClicks: submitClicks.length,
        totalSocialClicks: socialClicks.length,
        profileToSubmitRate,
        profileToSocialRate,
        searchToProfileRate,
        socialClicksByPlatform,

        // Record performance
        topRecordsByViews,
        totalRecordViews: recordViews.length,

        // Engagement velocity
        avgHoursToFirstVote,

        // Voter quality
        voterQualityScore,

        // Streak
        streakWeeks,

        // Reputation health
        reputationHealthScore,

        // Score trajectory
        scoreSnapshots,

        // Market position
        marketPosition,

        // Retention
        totalFollowers: follows.length,
        totalPins: pins.length,
        notifOptIns: notifOptIns ?? 0,
      };
    }

    // ─── Return ───────────────────────────────────────────────────────────

    return NextResponse.json({
      planId,

      // Activity
      totalVotesCast: votes.length,
      totalCitizenStatements: citizenStatements.length,
      totalDebateStatements: debateStatements.length,
      totalSubmitted,
      totalRecordsAboutMe,

      // Scores
      credibilityScore: userScore?.credibility_score ?? null,
      contributorScore: userScore?.contributor_score ?? null,
      voterScore: userScore?.voter_score ?? null,
      citizenScore: userScore?.citizen_score ?? null,
      overallScore: userScore?.overall_score ?? null,
      subjectScore: subjectScore?.subject_score ?? null,

      // Profile views
      totalProfileViews,
      uniqueViewers,
      newViewerCount,
      returningCount,
      timeOfDay,
      peakDay,
      peakDayData,
      topLocations,

      // Search
      totalImpressions,
      topKeywords,

      // Record outcomes
      kept,
      deleted,
      pending,
      pctKept,
      pctDeleted,
      pctPending,

      // Breakdowns
      credibilityBreakdown,
      categoryBreakdown,

      // Notable records
      mostActiveRecord,
      mostControversialRecord,
      longestDebateRecord,

      // Dispute
      disputeResolutionRate,
      avgVotingDays,

      // Contributor
      sided_contributor,
      sided_subject,
      contributorSuccessRate,

      // Role
      mostActiveRole,
      roleActivity,

      // Comparison
      comparisonData,

      // Pro only
      pro: proData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}