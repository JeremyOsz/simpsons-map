import { describe, expect, it } from "vitest";
import { hashSnippet, normalizeSnippet } from "@/lib/hash";

describe("hashSnippet", () => {
  it("normalizes spacing and case", () => {
    const a = hashSnippet(" Springfield  Rocks ");
    const b = hashSnippet("springfield rocks");

    expect(a).toBe(b);
    expect(normalizeSnippet(" A   B ")).toBe("a b");
  });
});
