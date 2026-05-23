import { describe, it, expect } from "vitest";
import { classifyRecord } from "@/lib/ai/classifyRecord";

describe("classifyRecord", () => {
  // ─── Anonymity Granted outcomes ──────────────────────────────────────────────

  it("returns Anonymity Granted when has attachments and long description", () => {
    const result = classifyRecord({
      description: "a".repeat(201),
      rating: 3,
      hasAttachments: true,
    });
    expect(result).toBe("Anonymity Granted");
  });

  it("returns Anonymity Granted when description is exactly 201 chars with attachments", () => {
    const result = classifyRecord({
      description: "a".repeat(201),
      rating: 5,
      hasAttachments: true,
    });
    expect(result).toBe("Anonymity Granted");
  });

  it("does NOT return Anonymity Granted when description is exactly 200 chars", () => {
    const result = classifyRecord({
      description: "a".repeat(200),
      rating: 3,
      hasAttachments: true,
    });
    expect(result).not.toBe("Anonymity Granted");
  });

  it("does NOT return Anonymity Granted when has attachments but short description", () => {
    const result = classifyRecord({
      description: "short",
      rating: 3,
      hasAttachments: true,
    });
    expect(result).not.toBe("Anonymity Granted");
  });

  // ─── Anonymity Not Granted outcomes ───────────────────────────────────────────────

  it("returns Anonymity Not Granted when no attachments and rating <= 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 3,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Not Granted");
  });

  it("returns Anonymity Not Granted when rating is exactly 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 5,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Not Granted");
  });

  it("returns Anonymity Not Granted when rating is 1", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 1,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Not Granted");
  });

  it("does NOT return Anonymity Not Granted when rating > 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 6,
      hasAttachments: false,
    });
    expect(result).not.toBe("Anonymity Not Granted");
  });

  // ─── Anonymity Granted outcomes ────────────────────────────────────────────

  it("returns Anonymity Granted when no attachments and rating > 5", () => {
    const result = classifyRecord({
      description: "some description",
      rating: 6,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Granted");
  });

  it("returns Anonymity Granted when null description with attachments", () => {
    const result = classifyRecord({
      description: null,
      rating: 3,
      hasAttachments: true,
    });
    expect(result).toBe("Anonymity Granted");
  });

  it("returns Anonymity Granted when null rating with no attachments", () => {
    const result = classifyRecord({
      description: "some description",
      rating: null,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Granted");
  });

  it("returns Anonymity Granted when everything is null", () => {
    const result = classifyRecord({
      description: null,
      rating: null,
      hasAttachments: false,
    });
    expect(result).toBe("Anonymity Granted");
  });

  // ─── Return type ──────────────────────────────────────────────────────────

  it("always returns one of the three valid values", () => {
    const validValues = ["Anonymity Granted", "Anonymity Not Granted", "Anonymity Granted"];
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
