import { describe, expect, it } from "vitest";
import { confidenceBucket, scoreMentionConfidence } from "@/lib/confidence";

describe("scoreMentionConfidence", () => {
  it("scores explicit citation as high confidence", () => {
    const score = scoreMentionConfidence({
      snippet: "In S10E23, the Simpsons visit Tokyo, Japan.",
      countryName: "Japan",
      hasEpisodeCitation: true,
      sourceStructured: true,
      corroborationCount: 2,
      isImplied: false
    });

    expect(score).toBeGreaterThanOrEqual(0.75);
    expect(confidenceBucket(score)).toBe("high");
  });

  it("penalizes implied mentions", () => {
    const score = scoreMentionConfidence({
      snippet: "The family goes abroad in S10E23.",
      countryName: "Japan",
      hasEpisodeCitation: true,
      sourceStructured: false,
      corroborationCount: 0,
      isImplied: true
    });

    expect(score).toBeLessThan(0.75);
  });
});
