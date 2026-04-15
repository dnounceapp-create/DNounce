import { describe, it, expect } from "vitest";

// ─── Pure lifecycle timing logic extracted for testing ────────────────────────
// These functions mirror the exact logic in record-lifecycle/route.ts
// so we can test every stage transition outcome without hitting the DB.

function getStage1To2(record: { status: string; ai_completed_at: string | null }) {
  return record.status === "ai_verification" && !!record.ai_completed_at;
}

function getStage2To3(
  record: { status: string; ai_completed_at: string | null },
  now: Date
): boolean {
  if (record.status !== "subject_notified" || !record.ai_completed_at) return false;
  const aiDone = new Date(record.ai_completed_at);
  const publishTime = new Date(aiDone.getTime() + (72 + 24) * 60 * 60 * 1000);
  return now >= publishTime;
}

function getStage4To5(
  record: { status: string; dispute_started_at: string | null },
  now: Date
): boolean {
  if (record.status !== "deletion_request" || !record.dispute_started_at) return false;
  const start = new Date(record.dispute_started_at);
  const debateStart = new Date(start.getTime() + 72 * 60 * 60 * 1000);
  return now >= debateStart;
}

function getStage5To6(
  record: { status: string; debate_started_at: string | null; debate_ends_at: string | null },
  now: Date
): boolean {
  if (record.status !== "debate" || !record.debate_started_at) return false;
  const start = new Date(record.debate_started_at);
  const debateEnd = record.debate_ends_at
    ? new Date(record.debate_ends_at)
    : new Date(start.getTime() + 72 * 60 * 60 * 1000);
  return now >= debateEnd;
}

function getStage6To7(
  record: { status: string; voting_started_at: string | null; voting_ends_at: string | null },
  now: Date
): { shouldTransition: boolean; executionEndsAt: Date | null; verdictAnnouncedAt: Date | null } {
  if (record.status !== "voting" || !record.voting_started_at) {
    return { shouldTransition: false, executionEndsAt: null, verdictAnnouncedAt: null };
  }
  const start = new Date(record.voting_started_at);
  const votingEnd = record.voting_ends_at
    ? new Date(record.voting_ends_at)
    : new Date(start.getTime() + 48 * 60 * 60 * 1000);

  if (now < votingEnd) {
    return { shouldTransition: false, executionEndsAt: null, verdictAnnouncedAt: null };
  }

  const executionEndsAt = new Date(votingEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
  const verdictAnnouncedAt = new Date(votingEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { shouldTransition: true, executionEndsAt, verdictAnnouncedAt };
}

function getStage7Finalize(
  record: { status: string; execution_ends_at: string | null; decision_made_at: string | null },
  now: Date
): boolean {
  if (record.status !== "decision" || !record.execution_ends_at || !!record.decision_made_at) return false;
  return now >= new Date(record.execution_ends_at);
}

function shouldSendVerdictCountdown(
  record: { status: string; verdict_announced_at: string | null; decision_made_at: string | null },
  now: Date
): boolean {
  if (record.status !== "decision" || !record.verdict_announced_at || !!record.decision_made_at) return false;
  const verdictAt = new Date(record.verdict_announced_at);
  const notifyAt = new Date(verdictAt.getTime() - 24 * 60 * 60 * 1000);
  return now >= notifyAt && now < verdictAt;
}

function shouldAnnounceVerdict(
  record: { status: string; verdict_announced_at: string | null; decision_made_at: string | null },
  now: Date
): boolean {
  if (record.status !== "decision" || !record.verdict_announced_at || !!record.decision_made_at) return false;
  return now >= new Date(record.verdict_announced_at);
}

// ─── Stage 1 → 2 ─────────────────────────────────────────────────────────────

describe("Stage 1 → 2: AI complete → Subject Notified", () => {
  it("transitions when ai_completed_at is set", () => {
    expect(getStage1To2({ status: "ai_verification", ai_completed_at: new Date().toISOString() })).toBe(true);
  });

  it("does NOT transition when ai_completed_at is null", () => {
    expect(getStage1To2({ status: "ai_verification", ai_completed_at: null })).toBe(false);
  });

  it("does NOT transition when status is not ai_verification", () => {
    expect(getStage1To2({ status: "subject_notified", ai_completed_at: new Date().toISOString() })).toBe(false);
  });
});

// ─── Stage 2 → 3 ─────────────────────────────────────────────────────────────

describe("Stage 2 → 3: Subject Notified → Published", () => {
  it("transitions after 96h (72h AI + 24h buffer)", () => {
    const aiDone = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-05T01:00:00Z"); // 97h later
    expect(getStage2To3({ status: "subject_notified", ai_completed_at: aiDone.toISOString() }, now)).toBe(true);
  });

  it("does NOT transition before 96h", () => {
    const aiDone = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-04T23:00:00Z"); // 95h later
    expect(getStage2To3({ status: "subject_notified", ai_completed_at: aiDone.toISOString() }, now)).toBe(false);
  });

  it("does NOT transition when ai_completed_at is null", () => {
    expect(getStage2To3({ status: "subject_notified", ai_completed_at: null }, new Date())).toBe(false);
  });

  it("does NOT transition when status is wrong", () => {
    const aiDone = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-10T00:00:00Z");
    expect(getStage2To3({ status: "published", ai_completed_at: aiDone.toISOString() }, now)).toBe(false);
  });
});

// ─── Stage 4 → 5 ─────────────────────────────────────────────────────────────

describe("Stage 4 → 5: Deletion Request → Debate", () => {
  it("transitions after 72h from dispute_started_at", () => {
    const disputeStart = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-04T01:00:00Z"); // 73h later
    expect(getStage4To5({ status: "deletion_request", dispute_started_at: disputeStart.toISOString() }, now)).toBe(true);
  });

  it("does NOT transition before 72h", () => {
    const disputeStart = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-03T23:00:00Z"); // 71h later
    expect(getStage4To5({ status: "deletion_request", dispute_started_at: disputeStart.toISOString() }, now)).toBe(false);
  });

  it("does NOT transition when dispute_started_at is null", () => {
    expect(getStage4To5({ status: "deletion_request", dispute_started_at: null }, new Date())).toBe(false);
  });

  it("does NOT transition when status is wrong", () => {
    const disputeStart = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-10T00:00:00Z");
    expect(getStage4To5({ status: "debate", dispute_started_at: disputeStart.toISOString() }, now)).toBe(false);
  });
});

// ─── Stage 5 → 6 ─────────────────────────────────────────────────────────────

describe("Stage 5 → 6: Debate → Voting", () => {
  it("transitions when debate_ends_at has passed", () => {
    const debateEnd = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-02T00:00:00Z");
    expect(getStage5To6({ status: "debate", debate_started_at: "2024-01-01T00:00:00Z", debate_ends_at: debateEnd.toISOString() }, now)).toBe(true);
  });

  it("does NOT transition when debate_ends_at has not passed", () => {
    const debateEnd = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-05T00:00:00Z");
    expect(getStage5To6({ status: "debate", debate_started_at: "2024-01-01T00:00:00Z", debate_ends_at: debateEnd.toISOString() }, now)).toBe(false);
  });

  it("uses fallback 72h when debate_ends_at is null", () => {
    const debateStart = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-04T01:00:00Z"); // 73h later
    expect(getStage5To6({ status: "debate", debate_started_at: debateStart.toISOString(), debate_ends_at: null }, now)).toBe(true);
  });

  it("does NOT transition when debate_started_at is null", () => {
    expect(getStage5To6({ status: "debate", debate_started_at: null, debate_ends_at: null }, new Date())).toBe(false);
  });
});

// ─── Stage 6 → 7 ─────────────────────────────────────────────────────────────

describe("Stage 6 → 7: Voting → Decision", () => {
  it("transitions when voting_ends_at has passed", () => {
    const votingEnd = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-02T00:00:00Z");
    const result = getStage6To7({ status: "voting", voting_started_at: "2024-01-01T00:00:00Z", voting_ends_at: votingEnd.toISOString() }, now);
    expect(result.shouldTransition).toBe(true);
  });

  it("sets execution_ends_at to 3 days after voting_ends_at", () => {
    const votingEnd = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-02T00:00:00Z");
    const result = getStage6To7({ status: "voting", voting_started_at: "2024-01-01T00:00:00Z", voting_ends_at: votingEnd.toISOString() }, now);
    const expected = new Date("2024-01-04T00:00:00Z");
    expect(result.executionEndsAt?.getTime()).toBe(expected.getTime());
  });

  it("sets verdict_announced_at to 7 days after voting_ends_at", () => {
    const votingEnd = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-02T00:00:00Z");
    const result = getStage6To7({ status: "voting", voting_started_at: "2024-01-01T00:00:00Z", voting_ends_at: votingEnd.toISOString() }, now);
    const expected = new Date("2024-01-08T00:00:00Z");
    expect(result.verdictAnnouncedAt?.getTime()).toBe(expected.getTime());
  });

  it("does NOT transition when voting is still active", () => {
    const votingEnd = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-05T00:00:00Z");
    const result = getStage6To7({ status: "voting", voting_started_at: "2024-01-01T00:00:00Z", voting_ends_at: votingEnd.toISOString() }, now);
    expect(result.shouldTransition).toBe(false);
    expect(result.executionEndsAt).toBeNull();
    expect(result.verdictAnnouncedAt).toBeNull();
  });

  it("uses fallback 48h when voting_ends_at is null", () => {
    const votingStart = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-04T00:00:00Z"); // 72h later, well past 48h
    const result = getStage6To7({ status: "voting", voting_started_at: votingStart.toISOString(), voting_ends_at: null }, now);
    expect(result.shouldTransition).toBe(true);
  });

  it("does NOT transition when status is wrong", () => {
    const result = getStage6To7({ status: "debate", voting_started_at: "2024-01-01T00:00:00Z", voting_ends_at: "2024-01-01T00:00:00Z" }, new Date("2024-01-10T00:00:00Z"));
    expect(result.shouldTransition).toBe(false);
  });
});

// ─── Stage 7 finalize ────────────────────────────────────────────────────────

describe("Stage 7: Finalize after execution window", () => {
  it("finalizes when execution_ends_at has passed and no decision_made_at", () => {
    const now = new Date("2024-01-10T00:00:00Z");
    expect(getStage7Finalize({ status: "decision", execution_ends_at: "2024-01-05T00:00:00Z", decision_made_at: null }, now)).toBe(true);
  });

  it("does NOT finalize when execution window has not passed", () => {
    const now = new Date("2024-01-03T00:00:00Z");
    expect(getStage7Finalize({ status: "decision", execution_ends_at: "2024-01-05T00:00:00Z", decision_made_at: null }, now)).toBe(false);
  });

  it("does NOT finalize when decision_made_at already set", () => {
    const now = new Date("2024-01-10T00:00:00Z");
    expect(getStage7Finalize({ status: "decision", execution_ends_at: "2024-01-05T00:00:00Z", decision_made_at: "2024-01-06T00:00:00Z" }, now)).toBe(false);
  });

  it("does NOT finalize when execution_ends_at is null", () => {
    const now = new Date("2024-01-10T00:00:00Z");
    expect(getStage7Finalize({ status: "decision", execution_ends_at: null, decision_made_at: null }, now)).toBe(false);
  });
});

// ─── Verdict countdown notification ──────────────────────────────────────────

describe("Verdict countdown notification", () => {
  it("fires when now is within 24h before verdict_announced_at", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-09T12:00:00Z"); // 12h before
    expect(shouldSendVerdictCountdown({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, now)).toBe(true);
  });

  it("does NOT fire when more than 24h before verdict", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-08T12:00:00Z"); // 36h before
    expect(shouldSendVerdictCountdown({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, now)).toBe(false);
  });

  it("does NOT fire when verdict has already passed", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-11T00:00:00Z"); // after
    expect(shouldSendVerdictCountdown({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, now)).toBe(false);
  });

  it("does NOT fire when decision_made_at is already set", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-09T12:00:00Z");
    expect(shouldSendVerdictCountdown({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: "2024-01-09T00:00:00Z" }, now)).toBe(false);
  });

  it("does NOT fire when verdict_announced_at is null", () => {
    const now = new Date("2024-01-09T12:00:00Z");
    expect(shouldSendVerdictCountdown({ status: "decision", verdict_announced_at: null, decision_made_at: null }, now)).toBe(false);
  });
});

// ─── Verdict announcement ─────────────────────────────────────────────────────

describe("Verdict announcement", () => {
  it("fires when now is past verdict_announced_at", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-11T00:00:00Z");
    expect(shouldAnnounceVerdict({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, now)).toBe(true);
  });

  it("does NOT fire before verdict_announced_at", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-09T00:00:00Z");
    expect(shouldAnnounceVerdict({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, now)).toBe(false);
  });

  it("does NOT fire when decision_made_at is set", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date("2024-01-11T00:00:00Z");
    expect(shouldAnnounceVerdict({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: "2024-01-10T00:00:00Z" }, now)).toBe(false);
  });

  it("does NOT fire when verdict_announced_at is null", () => {
    const now = new Date("2024-01-11T00:00:00Z");
    expect(shouldAnnounceVerdict({ status: "decision", verdict_announced_at: null, decision_made_at: null }, now)).toBe(false);
  });

  it("fires exactly at verdict_announced_at", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    expect(shouldAnnounceVerdict({ status: "decision", verdict_announced_at: verdictAt.toISOString(), decision_made_at: null }, verdictAt)).toBe(true);
  });
});
