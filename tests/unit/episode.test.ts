import { describe, expect, it } from "vitest";
import { parseEpisodeReference } from "@/lib/episode";

describe("parseEpisodeReference", () => {
  it("parses explicit SxxExx markers", () => {
    expect(parseEpisodeReference("In Much Apu About Nothing (S7E23), Apu visits India.")).toEqual({
      season: 7,
      episodeNumber: 23
    });
  });

  it("resolves episode by quoted title when lookup is provided", () => {
    const lookup = new Map([
      ["from russia without love", { season: 30, episodeNumber: 6 }]
    ]);

    expect(
      parseEpisodeReference(
        'In "From Russia Without Love", Anastasia Alekova is thought to be a Russian mail order bride.',
        lookup
      )
    ).toEqual({ season: 30, episodeNumber: 6 });
  });

  it("resolves episode by episode-prefix pattern", () => {
    const lookup = new Map([["from russia without love", { season: 30, episodeNumber: 6 }]]);

    expect(parseEpisodeReference('Episode - "From Russia Without Love" (mentioned)', lookup)).toEqual({
      season: 30,
      episodeNumber: 6
    });
  });

  it("returns null when no code or matching title exists", () => {
    const lookup = new Map([["some other episode", { season: 1, episodeNumber: 1 }]]);

    expect(parseEpisodeReference("Russia is the largest country in the world.", lookup)).toBeNull();
  });
});
