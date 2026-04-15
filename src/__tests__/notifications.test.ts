import { describe, it, expect } from "vitest";

// ─── Pure notification logic extracted for testing ────────────────────────────
// Mirrors the logic in supabase/functions/send-notifications and lifecycle route

// Notification type routing
function resolveEmailTemplate(type: string): string {
  if (type === "stage_2_subject") return "stage_2_subject";
  if (type === "verdict_countdown") return "verdict_countdown";
  if (type === "verdict_announced") return "verdict_announced";
  if (type === "seven_day_unlock") return "seven_day_unlock";
  return "generic_fallback";
}

// Notification body builder
function buildVerdictCountdownBody(role: "subject" | "contributor" | "voter" | "follower"): string {
  if (role === "subject") return "The community verdict on a record about you will be announced tomorrow. Come back to see the result.";
  if (role === "contributor") return "The community verdict on a record you submitted will be announced tomorrow.";
  if (role === "voter") return "A record you voted on is announcing its verdict tomorrow. Come back to see the result.";
  return "A record you are following is announcing its verdict tomorrow. Come back to see the result.";
}

function buildVerdictAnnouncedBody(role: "subject" | "contributor" | "voter" | "follower"): string {
  if (role === "subject") return "The community has reached a decision on a record about you. See the result now.";
  if (role === "contributor") return "The community has reached a decision on a record you submitted. See the result now.";
  if (role === "voter") return "The community has reached a decision on a record you voted on. See the result now.";
  return "A record you are following has reached a verdict. See the result now.";
}

// Who gets notified for each type
function getRecipientRoles(type: string): string[] {
  if (type === "verdict_countdown") return ["subject", "contributor", "voter", "follower"];
  if (type === "verdict_announced") return ["subject", "contributor", "voter", "follower"];
  if (type === "stage_2_subject") return ["subject"];
  if (type === "stage_4_contributor") return ["contributor"];
  if (type === "stage_5_subject") return ["subject"];
  if (type === "stage_5_contributor") return ["contributor"];
  if (type === "stage_6_subject") return ["subject"];
  if (type === "stage_6_contributor") return ["contributor"];
  if (type === "voting_ended_subject") return ["subject"];
  if (type === "voting_ended_contributor") return ["contributor"];
  if (type === "seven_day_unlock") return ["subject", "contributor"];
  if (type === "badge_earned") return ["user"];
  if (type === "ticket_response") return ["user"];
  return [];
}

// Dedup check — should we skip inserting if already exists
function shouldSkipNotification(
  existingNotifications: { type: string; record_id: string }[],
  type: string,
  recordId: string
): boolean {
  return existingNotifications.some(
    (n) => n.type === type && n.record_id === recordId
  );
}

// Community unlock timing
function isCommunityUnlocked(decisionStartedAt: string | null, now: Date): boolean {
  if (!decisionStartedAt) return false;
  const unlockAt = new Date(new Date(decisionStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  return now >= unlockAt;
}

// Verdict tally visibility
function isVerdictVisible(verdictAnnouncedAt: string | null, now: Date): boolean {
  if (!verdictAnnouncedAt) return true; // no delay set = always visible
  return now >= new Date(verdictAnnouncedAt);
}

// ─── resolveEmailTemplate ────────────────────────────────────────────────────

describe("resolveEmailTemplate", () => {
  it("routes stage_2_subject to correct template", () => {
    expect(resolveEmailTemplate("stage_2_subject")).toBe("stage_2_subject");
  });

  it("routes verdict_countdown to correct template", () => {
    expect(resolveEmailTemplate("verdict_countdown")).toBe("verdict_countdown");
  });

  it("routes verdict_announced to correct template", () => {
    expect(resolveEmailTemplate("verdict_announced")).toBe("verdict_announced");
  });

  it("routes seven_day_unlock to correct template", () => {
    expect(resolveEmailTemplate("seven_day_unlock")).toBe("seven_day_unlock");
  });

  it("routes unknown types to generic fallback", () => {
    expect(resolveEmailTemplate("badge_earned")).toBe("generic_fallback");
    expect(resolveEmailTemplate("ticket_response")).toBe("generic_fallback");
    expect(resolveEmailTemplate("stage_4_contributor")).toBe("generic_fallback");
    expect(resolveEmailTemplate("tagged")).toBe("generic_fallback");
    expect(resolveEmailTemplate("unknown_type")).toBe("generic_fallback");
  });
});

// ─── buildVerdictCountdownBody ───────────────────────────────────────────────

describe("buildVerdictCountdownBody", () => {
  it("subject gets record-about-you body", () => {
    const body = buildVerdictCountdownBody("subject");
    expect(body).toContain("record about you");
  });

  it("contributor gets record-you-submitted body", () => {
    const body = buildVerdictCountdownBody("contributor");
    expect(body).toContain("record you submitted");
  });

  it("voter gets record-you-voted-on body", () => {
    const body = buildVerdictCountdownBody("voter");
    expect(body).toContain("voted on");
  });

  it("follower gets record-you-are-following body", () => {
    const body = buildVerdictCountdownBody("follower");
    expect(body).toContain("following");
  });

  it("all bodies mention tomorrow or 24 hours", () => {
    const roles: ("subject" | "contributor" | "voter" | "follower")[] = ["subject", "contributor", "voter", "follower"];
    roles.forEach((role) => {
      const body = buildVerdictCountdownBody(role);
      expect(body.toLowerCase()).toMatch(/tomorrow|24 hours/);
    });
  });
});

// ─── buildVerdictAnnouncedBody ───────────────────────────────────────────────

describe("buildVerdictAnnouncedBody", () => {
  it("subject gets record-about-you body", () => {
    const body = buildVerdictAnnouncedBody("subject");
    expect(body).toContain("record about you");
  });

  it("contributor gets record-you-submitted body", () => {
    const body = buildVerdictAnnouncedBody("contributor");
    expect(body).toContain("record you submitted");
  });

  it("voter gets record-you-voted-on body", () => {
    const body = buildVerdictAnnouncedBody("voter");
    expect(body).toContain("voted on");
  });

  it("follower gets following body", () => {
    const body = buildVerdictAnnouncedBody("follower");
    expect(body).toContain("following");
  });

  it("all bodies mention result or verdict", () => {
    const roles: ("subject" | "contributor" | "voter" | "follower")[] = ["subject", "contributor", "voter", "follower"];
    roles.forEach((role) => {
      const body = buildVerdictAnnouncedBody(role);
      expect(body.toLowerCase()).toMatch(/result|verdict|decision/);
    });
  });
});

// ─── getRecipientRoles ───────────────────────────────────────────────────────

describe("getRecipientRoles", () => {
  it("verdict_countdown notifies subject, contributor, voter, and follower", () => {
    const roles = getRecipientRoles("verdict_countdown");
    expect(roles).toContain("subject");
    expect(roles).toContain("contributor");
    expect(roles).toContain("voter");
    expect(roles).toContain("follower");
    expect(roles).toHaveLength(4);
  });

  it("verdict_announced notifies subject, contributor, voter, and follower", () => {
    const roles = getRecipientRoles("verdict_announced");
    expect(roles).toContain("subject");
    expect(roles).toContain("contributor");
    expect(roles).toContain("voter");
    expect(roles).toContain("follower");
    expect(roles).toHaveLength(4);
  });

  it("stage_2_subject only notifies subject", () => {
    const roles = getRecipientRoles("stage_2_subject");
    expect(roles).toEqual(["subject"]);
  });

  it("stage_4_contributor only notifies contributor", () => {
    const roles = getRecipientRoles("stage_4_contributor");
    expect(roles).toEqual(["contributor"]);
  });

  it("seven_day_unlock notifies subject and contributor", () => {
    const roles = getRecipientRoles("seven_day_unlock");
    expect(roles).toContain("subject");
    expect(roles).toContain("contributor");
    expect(roles).toHaveLength(2);
  });

  it("badge_earned only notifies the user", () => {
    expect(getRecipientRoles("badge_earned")).toEqual(["user"]);
  });

  it("unknown type returns empty array", () => {
    expect(getRecipientRoles("unknown_type")).toEqual([]);
  });
});

// ─── shouldSkipNotification ───────────────────────────────────────────────────

describe("shouldSkipNotification", () => {
  it("skips when same type and record_id already exists", () => {
    const existing = [{ type: "verdict_countdown", record_id: "record-123" }];
    expect(shouldSkipNotification(existing, "verdict_countdown", "record-123")).toBe(true);
  });

  it("does NOT skip when type is different", () => {
    const existing = [{ type: "verdict_countdown", record_id: "record-123" }];
    expect(shouldSkipNotification(existing, "verdict_announced", "record-123")).toBe(false);
  });

  it("does NOT skip when record_id is different", () => {
    const existing = [{ type: "verdict_countdown", record_id: "record-123" }];
    expect(shouldSkipNotification(existing, "verdict_countdown", "record-456")).toBe(false);
  });

  it("does NOT skip when existing is empty", () => {
    expect(shouldSkipNotification([], "verdict_countdown", "record-123")).toBe(false);
  });

  it("skips when one of multiple existing matches", () => {
    const existing = [
      { type: "badge_earned", record_id: "record-123" },
      { type: "verdict_countdown", record_id: "record-123" },
    ];
    expect(shouldSkipNotification(existing, "verdict_countdown", "record-123")).toBe(true);
  });
});

// ─── isCommunityUnlocked ──────────────────────────────────────────────────────

describe("isCommunityUnlocked", () => {
  it("returns true when 7 days have passed since decision_started_at", () => {
    const decisionStarted = "2024-01-01T00:00:00Z";
    const now = new Date("2024-01-08T01:00:00Z"); // 7 days + 1 hour
    expect(isCommunityUnlocked(decisionStarted, now)).toBe(true);
  });

  it("returns false when less than 7 days have passed", () => {
    const decisionStarted = "2024-01-01T00:00:00Z";
    const now = new Date("2024-01-07T23:00:00Z"); // just under 7 days
    expect(isCommunityUnlocked(decisionStarted, now)).toBe(false);
  });

  it("returns false when decision_started_at is null", () => {
    expect(isCommunityUnlocked(null, new Date())).toBe(false);
  });

  it("returns true exactly at 7 day mark", () => {
    const decisionStarted = "2024-01-01T00:00:00Z";
    const now = new Date("2024-01-08T00:00:00Z"); // exactly 7 days
    expect(isCommunityUnlocked(decisionStarted, now)).toBe(true);
  });
});

// ─── isVerdictVisible ────────────────────────────────────────────────────────

describe("isVerdictVisible", () => {
  it("returns true when verdict_announced_at has passed", () => {
    const verdictAt = "2024-01-10T00:00:00Z";
    const now = new Date("2024-01-11T00:00:00Z");
    expect(isVerdictVisible(verdictAt, now)).toBe(true);
  });

  it("returns false when verdict_announced_at has not passed", () => {
    const verdictAt = "2024-01-10T00:00:00Z";
    const now = new Date("2024-01-09T00:00:00Z");
    expect(isVerdictVisible(verdictAt, now)).toBe(false);
  });

  it("returns true when verdict_announced_at is null (no delay set)", () => {
    expect(isVerdictVisible(null, new Date())).toBe(true);
  });

  it("returns true exactly at verdict_announced_at", () => {
    const verdictAt = "2024-01-10T00:00:00Z";
    expect(isVerdictVisible(verdictAt, new Date(verdictAt))).toBe(true);
  });

  it("tally is hidden 1 second before verdict_announced_at", () => {
    const verdictAt = new Date("2024-01-10T00:00:00Z");
    const now = new Date(verdictAt.getTime() - 1000);
    expect(isVerdictVisible(verdictAt.toISOString(), now)).toBe(false);
  });
});
