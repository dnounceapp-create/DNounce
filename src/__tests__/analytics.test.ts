import { describe, it, expect } from "vitest";

// ─── Pure analytics computation logic extracted for testing ──────────────────
// Mirrors the logic in app/api/analytics/route.ts

function computeTimeOfDay(profileViews: { viewed_at: string }[]) {
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  profileViews.forEach((v) => {
    const hour = new Date(v.viewed_at).getUTCHours();
    if (hour >= 6 && hour < 12) timeOfDay.morning++;
    else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
    else if (hour >= 17 && hour < 21) timeOfDay.evening++;
    else timeOfDay.night++;
  });
  return timeOfDay;
}

function computeUniqueViewers(profileViews: { viewer_auth_user_id: string | null }[]): number {
  return new Set(
    profileViews.filter((v) => v.viewer_auth_user_id).map((v) => v.viewer_auth_user_id)
  ).size;
}

function computeReturningCount(profileViews: { viewer_auth_user_id: string | null }[]): number {
  const counts: Record<string, number> = {};
  profileViews.forEach((v) => {
    if (v.viewer_auth_user_id) {
      counts[v.viewer_auth_user_id] = (counts[v.viewer_auth_user_id] || 0) + 1;
    }
  });
  return Object.values(counts).filter((c) => c > 1).length;
}

function computeContributorSuccessRate(
  records: { final_outcome: string | null }[]
): number | null {
  const total = records.length;
  if (total === 0) return null;
  const upheld = records.filter((r) => r.final_outcome === "sided_with_contributor").length;
  return Math.round((upheld / total) * 100);
}

function computeDisputeResolutionRate(
  records: { status: string; final_outcome: string | null }[]
): number | null {
  const disputed = records.filter((r) =>
    ["debate", "voting", "decision"].includes(r.status)
  );
  if (disputed.length === 0) return null;
  const resolved = disputed.filter((r) => r.final_outcome === "sided_with_contributor").length;
  return Math.round((resolved / disputed.length) * 100);
}

function computeCredibilityBreakdown(records: { ai_vendor_1_result: string | null; credibility: string | null }[]) {
  const credMap: Record<string, number> = {};
  records.forEach((r) => {
    const raw = (r.ai_vendor_1_result || r.credibility || "Pending").toString().toLowerCase();
    let label = "Pending";
    if (raw.includes("evidence")) label = "Evidence-Based";
    else if (raw.includes("opinion")) label = "Opinion-Based";
    else if (raw.includes("unable")) label = "Unable to Verify";
    credMap[label] = (credMap[label] || 0) + 1;
  });
  return Object.entries(credMap).map(([label, count]) => ({ label, count }));
}

function computeMonthlyGrowthRate(
  profileViews: { viewed_at: string }[],
  now: Date
): number {
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = profileViews.filter((v) => new Date(v.viewed_at) >= thisMonthStart).length;
  const lastMonth = profileViews.filter((v) => {
    const d = new Date(v.viewed_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;

  if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

function computeConversionRate(clicks: number, views: number): number {
  if (views === 0) return 0;
  return Math.round((clicks / views) * 100);
}

// ─── computeTimeOfDay ────────────────────────────────────────────────────────

describe("computeTimeOfDay", () => {
  it("correctly buckets morning views (6-11)", () => {
    const views = [
      { viewed_at: "2024-01-01T06:00:00Z" },
      { viewed_at: "2024-01-01T11:00:00Z" },
    ];
    const result = computeTimeOfDay(views);
    expect(result.morning).toBe(2);
    expect(result.afternoon).toBe(0);
    expect(result.evening).toBe(0);
    expect(result.night).toBe(0);
  });

  it("correctly buckets afternoon views (12-16)", () => {
    const views = [{ viewed_at: "2024-01-01T14:00:00Z" }];
    expect(computeTimeOfDay(views).afternoon).toBe(1);
  });

  it("correctly buckets evening views (17-20)", () => {
    const views = [{ viewed_at: "2024-01-01T19:00:00Z" }];
    expect(computeTimeOfDay(views).evening).toBe(1);
  });

  it("correctly buckets night views (21-5)", () => {
    const views = [
      { viewed_at: "2024-01-01T22:00:00Z" },
      { viewed_at: "2024-01-01T03:00:00Z" },
    ];
    expect(computeTimeOfDay(views).night).toBe(2);
  });

  it("returns all zeros for empty views", () => {
    const result = computeTimeOfDay([]);
    expect(result).toEqual({ morning: 0, afternoon: 0, evening: 0, night: 0 });
  });

  it("total count equals input count", () => {
    const views = Array.from({ length: 10 }, (_, i) => ({
      viewed_at: `2024-01-01T${String(i + 1).padStart(2, "0")}:00:00Z`,
    }));
    const result = computeTimeOfDay(views);
    const total = result.morning + result.afternoon + result.evening + result.night;
    expect(total).toBe(10);
  });
});

// ─── computeUniqueViewers ────────────────────────────────────────────────────

describe("computeUniqueViewers", () => {
  it("counts unique viewer IDs", () => {
    const views = [
      { viewer_auth_user_id: "user-1" },
      { viewer_auth_user_id: "user-1" },
      { viewer_auth_user_id: "user-2" },
    ];
    expect(computeUniqueViewers(views)).toBe(2);
  });

  it("ignores null viewer IDs (anonymous)", () => {
    const views = [
      { viewer_auth_user_id: null },
      { viewer_auth_user_id: null },
      { viewer_auth_user_id: "user-1" },
    ];
    expect(computeUniqueViewers(views)).toBe(1);
  });

  it("returns 0 for empty views", () => {
    expect(computeUniqueViewers([])).toBe(0);
  });

  it("returns 0 for all anonymous views", () => {
    const views = [{ viewer_auth_user_id: null }, { viewer_auth_user_id: null }];
    expect(computeUniqueViewers(views)).toBe(0);
  });
});

// ─── computeReturningCount ───────────────────────────────────────────────────

describe("computeReturningCount", () => {
  it("counts viewers who visited more than once", () => {
    const views = [
      { viewer_auth_user_id: "user-1" },
      { viewer_auth_user_id: "user-1" },
      { viewer_auth_user_id: "user-2" },
    ];
    expect(computeReturningCount(views)).toBe(1);
  });

  it("returns 0 when all users visited only once", () => {
    const views = [
      { viewer_auth_user_id: "user-1" },
      { viewer_auth_user_id: "user-2" },
    ];
    expect(computeReturningCount(views)).toBe(0);
  });

  it("ignores anonymous viewers", () => {
    const views = [
      { viewer_auth_user_id: null },
      { viewer_auth_user_id: null },
    ];
    expect(computeReturningCount(views)).toBe(0);
  });
});

// ─── computeContributorSuccessRate ───────────────────────────────────────────

describe("computeContributorSuccessRate", () => {
  it("returns 100 when all records are kept", () => {
    const records = [
      { final_outcome: "sided_with_contributor" },
      { final_outcome: "sided_with_contributor" },
    ];
    expect(computeContributorSuccessRate(records)).toBe(100);
  });

  it("returns 0 when all records are deleted", () => {
    const records = [
      { final_outcome: "sided_with_subject" },
      { final_outcome: "sided_with_subject" },
    ];
    expect(computeContributorSuccessRate(records)).toBe(0);
  });

  it("returns 50 when half kept half deleted", () => {
    const records = [
      { final_outcome: "sided_with_contributor" },
      { final_outcome: "sided_with_subject" },
    ];
    expect(computeContributorSuccessRate(records)).toBe(50);
  });

  it("returns null when no records", () => {
    expect(computeContributorSuccessRate([])).toBeNull();
  });

  it("ignores null outcomes (pending)", () => {
    const records = [
      { final_outcome: "sided_with_contributor" },
      { final_outcome: null },
    ];
    expect(computeContributorSuccessRate(records)).toBe(50);
  });
});

// ─── computeDisputeResolutionRate ────────────────────────────────────────────

describe("computeDisputeResolutionRate", () => {
  it("returns 100 when all disputes resolved in favor", () => {
    const records = [
      { status: "decision", final_outcome: "sided_with_contributor" },
      { status: "voting", final_outcome: "sided_with_contributor" },
    ];
    expect(computeDisputeResolutionRate(records)).toBe(100);
  });

  it("returns 0 when all disputes lost", () => {
    const records = [
      { status: "decision", final_outcome: "sided_with_subject" },
    ];
    expect(computeDisputeResolutionRate(records)).toBe(0);
  });

  it("returns null when no disputed records", () => {
    const records = [{ status: "published", final_outcome: null }];
    expect(computeDisputeResolutionRate(records)).toBeNull();
  });

  it("ignores non-disputed records", () => {
    const records = [
      { status: "published", final_outcome: null },
      { status: "decision", final_outcome: "sided_with_contributor" },
    ];
    expect(computeDisputeResolutionRate(records)).toBe(100);
  });
});

// ─── computeCredibilityBreakdown ─────────────────────────────────────────────

describe("computeCredibilityBreakdown", () => {
  it("correctly buckets evidence-based records", () => {
    const records = [{ ai_vendor_1_result: "Evidence-Based", credibility: null }];
    const result = computeCredibilityBreakdown(records);
    expect(result.find((r) => r.label === "Evidence-Based")?.count).toBe(1);
  });

  it("correctly buckets opinion-based records", () => {
    const records = [{ ai_vendor_1_result: "Opinion-Based", credibility: null }];
    const result = computeCredibilityBreakdown(records);
    expect(result.find((r) => r.label === "Opinion-Based")?.count).toBe(1);
  });

  it("correctly buckets unable to verify records", () => {
    const records = [{ ai_vendor_1_result: "Unable to Verify", credibility: null }];
    const result = computeCredibilityBreakdown(records);
    expect(result.find((r) => r.label === "Unable to Verify")?.count).toBe(1);
  });

  it("falls back to credibility field when ai_vendor_1_result is null", () => {
    const records = [{ ai_vendor_1_result: null, credibility: "Evidence-Based" }];
    const result = computeCredibilityBreakdown(records);
    expect(result.find((r) => r.label === "Evidence-Based")?.count).toBe(1);
  });

  it("defaults to Pending when both fields are null", () => {
    const records = [{ ai_vendor_1_result: null, credibility: null }];
    const result = computeCredibilityBreakdown(records);
    expect(result.find((r) => r.label === "Pending")?.count).toBe(1);
  });

  it("returns empty array for no records", () => {
    expect(computeCredibilityBreakdown([])).toEqual([]);
  });
});

// ─── computeMonthlyGrowthRate ────────────────────────────────────────────────

describe("computeMonthlyGrowthRate", () => {
  it("returns 100 when there were no views last month and some this month", () => {
    const now = new Date("2024-02-15T00:00:00Z");
    const views = [{ viewed_at: "2024-02-10T00:00:00Z" }];
    expect(computeMonthlyGrowthRate(views, now)).toBe(100);
  });

  it("returns 0 when no views in either month", () => {
    const now = new Date("2024-02-15T00:00:00Z");
    expect(computeMonthlyGrowthRate([], now)).toBe(0);
  });

  it("returns positive growth when this month > last month", () => {
    const now = new Date("2024-02-15T00:00:00Z");
    const views = [
      { viewed_at: "2024-01-10T00:00:00Z" }, // last month: 1
      { viewed_at: "2024-02-10T00:00:00Z" }, // this month: 1
      { viewed_at: "2024-02-11T00:00:00Z" }, // this month: 2
    ];
    expect(computeMonthlyGrowthRate(views, now)).toBe(100); // 100% growth
  });

  it("returns negative growth when this month < last month", () => {
    const now = new Date("2024-02-15T00:00:00Z");
    const views = [
      { viewed_at: "2024-01-10T00:00:00Z" },
      { viewed_at: "2024-01-11T00:00:00Z" }, // last month: 2
    ];
    expect(computeMonthlyGrowthRate(views, now)).toBe(-100); // 100% decline
  });
});

// ─── computeConversionRate ───────────────────────────────────────────────────

describe("computeConversionRate", () => {
  it("returns correct percentage", () => {
    expect(computeConversionRate(10, 100)).toBe(10);
  });

  it("returns 0 when no clicks", () => {
    expect(computeConversionRate(0, 100)).toBe(0);
  });

  it("returns 0 when no views", () => {
    expect(computeConversionRate(10, 0)).toBe(0);
  });

  it("returns 100 when all views converted", () => {
    expect(computeConversionRate(50, 50)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(computeConversionRate(1, 3)).toBe(33);
  });
});
