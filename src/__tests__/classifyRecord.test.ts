import { describe, it, expect } from "vitest";
import { classifyRecord } from "@/lib/ai/classifyRecord";

describe("classifyRecord", () => {
  // ─── Evidence-Based outcomes ──────────────────────────────────────────────

  it("returns Evidence-Based when has attachments and long description", () => {
    const result = classifyRecord({
      description: "a".repeat(201),
      rating: 3,
      hasAttachments: true,
    });
    expect(result).toBe("Evidence-Based");
  });

  it("returns Evidence-Based when description is exactly 201 chars with attachments", () => {
    const result = classifyRecord({
      description: "a".repeat(201),
      rating: 5,
      hasAttachments: true,
    });
    expect(result).toBe("Evidence-Based");
  });

  it("does NOT return Evidence-Based when description is exactly 200 chars", () => {
    const result = classifyRecord({
      description: "a".repeat(200),
      rating: 3,
      hasAttachments: true,
    });
    expect(result).not.toBe("Evidence-Based");
  });

  it("does NOT return Evidence-Based when has attachments but short description", () => {
    const result = classifyRecord({
      description: "short",
      rating: 3,
      hasAttachments: true,
    });
    expect(result).not.toBe("Evidence-Based");
  });

  // ─── Opinion-Based outcomes ───────────────────────────────────────────────

  it("returns Opinion-Based when no attachments and rating <= 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 3,
      hasAttachments: false,
    });
    expect(result).toBe("Opinion-Based");
  });

  it("returns Opinion-Based when rating is exactly 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 5,
      hasAttachments: false,
    });
    expect(result).toBe("Opinion-Based");
  });

  it("returns Opinion-Based when rating is 1", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 1,
      hasAttachments: false,
    });
    expect(result).toBe("Opinion-Based");
  });

  it("does NOT return Opinion-Based when rating > 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 6,
      hasAttachments: false,
    });
    expect(result).not.toBe("Opinion-Based");
  });

  // ─── Unable to Verify outcomes ────────────────────────────────────────────

  it("returns Unable to Verify when no attachments and rating > 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 6,
      hasAttachments: false,
    });
    expect(result).toBe("Unable to Verify");
  });

  it("returns Unable to Verify when null description with attachments", () => {
    const result = classifyRecord({
      description: null,
      rating: 3,
      hasAttachments: true,
    });
    expect(result).toBe("Unable to Verify");
  });

  it("returns Unable to Verify when null rating with no attachments", () => {
    const result = classifyRecord({
      description: "some description",
      rating: null,
      hasAttachments: false,
    });
    expect(result).toBe("Unable to Verify");
  });

  it("returns Unable to Verify when everything is null", () => {
    const result = classifyRecord({
      description: null,
      rating: null,
      hasAttachments: false,
    });
    expect(result).toBe("Unable to Verify");
  });

  // ─── Return type ──────────────────────────────────────────────────────────

  it("always returns one of the three valid values", () => {
    const validValues = ["Evidence-Based", "Opinion-Based", "Unable to Verify"];
    const cases = [
      { description: "a".repeat(201), rating: 3, hasAttachments: true },
      { description: "short", rating: 3, hasAttachments: false },
      { description: null, rating: null, hasAttachments: false },
      { description: "a".repeat(201), rating: null, hasAttachments: true },
    ];
    cases.forEach((c) => {
      expect(validValues).toContain(classifyRecord(c));
    });
  });
});
