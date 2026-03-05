import { describe, expect, it } from "vitest";
import { isSimpsonsRelevantSnippet } from "@/lib/ingestion/snippet-relevance";

describe("isSimpsonsRelevantSnippet", () => {
  it("rejects encyclopedia-style country intros", () => {
    expect(
      isSimpsonsRelevantSnippet("India is a country in South Asia with a population of over a billion people.")
    ).toBe(false);
  });

  it("accepts snippets with episode markers and Simpsons context", () => {
    expect(isSimpsonsRelevantSnippet("In Much Apu About Nothing (S7E23), Apu recalls growing up in India.")).toBe(true);
  });
});
