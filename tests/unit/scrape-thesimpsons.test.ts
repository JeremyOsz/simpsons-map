import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeTheSimpsonsDataset } from "@/lib/ingestion/scrape-thesimpsons";

describe("scrapeTheSimpsonsDataset", () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.THSIMPSONS_SCRIPT_LINES_CSV_URL;
  const originalEpisodesUrl = process.env.THSIMPSONS_EPISODES_CSV_URL;

  beforeEach(() => {
    process.env.THSIMPSONS_SCRIPT_LINES_CSV_URL = "https://example.com/script_lines.csv";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.THSIMPSONS_SCRIPT_LINES_CSV_URL = originalUrl;
    process.env.THSIMPSONS_EPISODES_CSV_URL = originalEpisodesUrl;
    vi.restoreAllMocks();
  });

  it("emits one mention per matched country in the same line", async () => {
    const csv = [
      "season,number_in_season,spoken_words",
      '10,1,"Homer visits Canada and France and then Canada again in one trip."'
    ].join("\n");

    global.fetch = vi.fn(async () => new Response(csv, { status: 200 })) as typeof fetch;

    const result = await scrapeTheSimpsonsDataset();

    const countries = result.mentionsExtracted.map((mention) => mention.countryIso2).sort();
    expect(countries).toEqual(["CA", "FR"]);
    expect(result.mentionsExtracted.every((mention) => mention.episodeId === "10-1")).toBe(true);
  });

  it("uses fallback episode columns when number_in_season is missing", async () => {
    const csv = [
      "season,episode_number,spoken_words",
      '8,12,"A travel montage includes Mexico and Canada."'
    ].join("\n");

    global.fetch = vi.fn(async () => new Response(csv, { status: 200 })) as typeof fetch;

    const result = await scrapeTheSimpsonsDataset();

    expect(result.mentionsExtracted.length).toBe(2);
    expect(result.mentionsExtracted.every((mention) => mention.episodeId === "8-12")).toBe(true);
  });

  it("resolves episode from episode_id via episodes CSV lookup", async () => {
    process.env.THSIMPSONS_EPISODES_CSV_URL = "https://example.com/episodes.csv";

    const scriptLinesCsv = [
      "episode_id,spoken_words",
      '101,"A tour montage includes Mexico and Canada."'
    ].join("\n");

    const episodesCsv = [
      "id,season,number_in_season",
      "101,9,7"
    ].join("\n");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(scriptLinesCsv, { status: 200 }))
      .mockResolvedValueOnce(new Response(episodesCsv, { status: 200 })) as unknown as typeof fetch;

    const result = await scrapeTheSimpsonsDataset();
    expect(result.mentionsExtracted.length).toBe(2);
    expect(result.mentionsExtracted.every((mention) => mention.episodeId === "9-7")).toBe(true);
  });
});
