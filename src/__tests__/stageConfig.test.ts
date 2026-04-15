import { describe, it, expect } from "vitest";
import {
  computeEarliestPublishAt,
  evaluateVoterBadges,
  stageConfig,
  stageShortLabel,
  voterQualityRules,
  STAGE_ORDER,
} from "@/config/stageConfig";

// ─── computeEarliestPublishAt ─────────────────────────────────────────────────

describe("computeEarliestPublishAt", () => {
  it("returns 72h from submission when AI finishes instantly", () => {
    const submittedAt = new Date("2024-01-01T00:00:00Z");
    const aiCompleteAt = new Date("2024-01-01T00:00:00Z"); // AI done instantly
    const result = computeEarliestPublishAt(submittedAt, aiCompleteAt);
    const expected = new Date("2024-01-04T00:00:00Z"); // 72h later
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("returns aiComplete + 24h when AI takes longer than 72h", () => {
    const submittedAt = new Date("2024-01-01T00:00:00Z");
    const aiCompleteAt = new Date("2024-01-04T00:00:00Z"); // AI took 72h
    const result = computeEarliestPublishAt(submittedAt, aiCompleteAt);
    const expected = new Date("2024-01-05T00:00:00Z"); // aiComplete + 24h
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("accepts string inputs", () => {
    const result = computeEarliestPublishAt(
      "2024-01-01T00:00:00Z",
      "2024-01-01T00:00:00Z"
    );
    expect(result).toBeInstanceOf(Date);
  });

  it("always returns the later of the two options", () => {
    const submittedAt = new Date("2024-01-01T00:00:00Z");
    const aiCompleteAt = new Date("2024-01-05T00:00:00Z"); // AI took 4 days
    const result = computeEarliestPublishAt(submittedAt, aiCompleteAt);
    // 72h from submission = Jan 4, aiComplete + 24h = Jan 6 → Jan 6 wins
    const expected = new Date("2024-01-06T00:00:00Z");
    expect(result.getTime()).toBe(expected.getTime());
  });
});

// ─── evaluateVoterBadges ──────────────────────────────────────────────────────

describe("evaluateVoterBadges", () => {
  it("returns empty array when no thresholds are met", () => {
    const result = evaluateVoterBadges({
      downvotes: 0,
      voterFlagPercent: 0,
      publicApprovalPercent: 0,
    });
    expect(result).toEqual([]);
  });

  it("returns low-quality badge when downvotes >= 5", () => {
    const result = evaluateVoterBadges({
      downvotes: 5,
      voterFlagPercent: 0,
      publicApprovalPercent: 0,
    });
    expect(result).toContain("⚠ Low-Quality Voter");
  });

  it("does NOT return low-quality badge when downvotes < 5", () => {
    const result = evaluateVoterBadges({
      downvotes: 4,
      voterFlagPercent: 0,
      publicApprovalPercent: 0,
    });
    expect(result).not.toContain("⚠ Low-Quality Voter");
  });

  it("returns conviction badge when both thresholds met", () => {
    const result = evaluateVoterBadges({
      downvotes: 0,
      voterFlagPercent: 33,
      publicApprovalPercent: 50,
    });
    expect(result).toContain("CONVICTED Lost Voting Right");
  });

  it("does NOT return conviction badge when only flagPercent met", () => {
    const result = evaluateVoterBadges({
      downvotes: 0,
      voterFlagPercent: 33,
      publicApprovalPercent: 49,
    });
    expect(result).not.toContain("CONVICTED Lost Voting Right");
  });

  it("does NOT return conviction badge when only approvalPercent met", () => {
    const result = evaluateVoterBadges({
      downvotes: 0,
      voterFlagPercent: 32,
      publicApprovalPercent: 50,
    });
    expect(result).not.toContain("CONVICTED Lost Voting Right");
  });

  it("returns both badges when all thresholds met", () => {
    const result = evaluateVoterBadges({
      downvotes: 5,
      voterFlagPercent: 33,
      publicApprovalPercent: 50,
    });
    expect(result).toContain("⚠ Low-Quality Voter");
    expect(result).toContain("CONVICTED Lost Voting Right");
    expect(result).toHaveLength(2);
  });

  it("exactly at boundary — downvotes exactly 5 triggers badge", () => {
    const result = evaluateVoterBadges({
      downvotes: 5,
      voterFlagPercent: 0,
      publicApprovalPercent: 0,
    });
    expect(result).toContain("⚠ Low-Quality Voter");
  });
});

// ─── stageConfig ─────────────────────────────────────────────────────────────

describe("stageConfig", () => {
  it("has all 7 stages defined", () => {
    expect(Object.keys(stageConfig)).toHaveLength(7);
    STAGE_ORDER.forEach((s) => {
      expect(stageConfig[s]).toBeDefined();
    });
  });

  it("stages 1 and 2 are not public", () => {
    expect(stageConfig[1].flags.isPublic).toBe(false);
    expect(stageConfig[2].flags.isPublic).toBe(false);
  });

  it("stages 3-7 are public", () => {
    [3, 4, 5, 6, 7].forEach((s) => {
      expect(stageConfig[s].flags.isPublic).toBe(true);
    });
  });

  it("stages 1, 2, 4, 5 have interactions locked", () => {
    [1, 2, 4, 5].forEach((s) => {
      expect(stageConfig[s].flags.interactionsLocked).toBe(true);
    });
  });

  it("stages 3, 6, 7 have interactions unlocked", () => {
    [3, 6, 7].forEach((s) => {
      expect(stageConfig[s].flags.interactionsLocked).toBe(false);
    });
  });

  it("stage 6 voting duration is 48h", () => {
    expect(stageConfig[6].timeline.durationHours).toBe(48);
  });

  it("stage 5 debate duration is 72h", () => {
    expect(stageConfig[5].timeline.durationHours).toBe(72);
  });

  it("every stage has a label", () => {
    STAGE_ORDER.forEach((s) => {
      expect(stageConfig[s].label).toBeTruthy();
    });
  });

  it("every stage has actions for all 4 roles", () => {
    STAGE_ORDER.forEach((s) => {
      expect(stageConfig[s].actions.subject).toBeDefined();
      expect(stageConfig[s].actions.contributor).toBeDefined();
      expect(stageConfig[s].actions.voter).toBeDefined();
      expect(stageConfig[s].actions.citizen).toBeDefined();
    });
  });
});

// ─── stageShortLabel ─────────────────────────────────────────────────────────

describe("stageShortLabel", () => {
  it("has labels for all 7 stages", () => {
    STAGE_ORDER.forEach((s) => {
      expect(stageShortLabel[s]).toBeTruthy();
    });
  });

  it("stage 7 is Settled", () => {
    expect(stageShortLabel[7]).toBe("Settled");
  });

  it("stage 1 mentions AI", () => {
    expect(stageShortLabel[1].toLowerCase()).toContain("ai");
  });
});

// ─── voterQualityRules ────────────────────────────────────────────────────────

describe("voterQualityRules", () => {
  it("low quality threshold is 5 downvotes", () => {
    expect(voterQualityRules.lowQualityBadge.thresholdDownvotes).toBe(5);
  });

  it("conviction flag threshold is 33%", () => {
    expect(voterQualityRules.convictionBadge.voterFlagPercentThreshold).toBe(33);
  });

  it("conviction approval threshold is 50%", () => {
    expect(voterQualityRules.convictionBadge.publicApprovalPercentThreshold).toBe(50);
  });

  it("requires explanation for voting", () => {
    expect(voterQualityRules.voting.requireExplanation).toBe(true);
  });
});
