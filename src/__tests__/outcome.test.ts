import { describe, it, expect } from "vitest";
import { summarizeRecords, outcomeLabel, demoStageToStatus, demoStageLabel } from "@/lib/outcome";

describe("summarizeRecords", () => {
  it("counts only public records and where people landed", () => {
    const s = summarizeRecords([
      { status: "subject_notified" },
      { status: "published" },
      { status: "deletion_request", dispute_started_at: "2026-10-20" },
      { status: "decision", final_outcome: "keep", dispute_started_at: "2026-10-01" },
      { status: "decision", final_outcome: "delete", dispute_started_at: "2026-10-01" },
      { status: "decision", final_outcome: "tie", dispute_started_at: "2026-10-01" },
      { status: "decision", final_outcome: null, dispute_started_at: "2026-10-01" },
    ]);
    expect(s).toEqual({ total: 6, challenged: 5, sidedWithThem: 1, sidedWithWriter: 1, ties: 1 });
  });
});

describe("outcomeLabel", () => {
  it("uses names, ties, and nothing for no votes", () => {
    expect(outcomeLabel("delete", { subject: "Sam S." })).toBe("Most people sided with Sam S.");
    expect(outcomeLabel("keep")).toBe("Most people sided with the writer");
    expect(outcomeLabel("tie")).toMatch(/tie/i);
    expect(outcomeLabel(null)).toBeNull();
  });
});

describe("demo stages", () => {
  it("maps old stage names to current ones", () => {
    expect(demoStageToStatus("Voting in Progress")).toBe("voting");
    expect(demoStageLabel("Record in Dispute")).toBe("Challenged");
    expect(demoStageLabel("Debate Phase")).toBe("Debate");
    expect(demoStageLabel("Subject Notified")).toBe("Private preview");
    expect(demoStageLabel("Record Published")).toBe("Public");
  });
});
