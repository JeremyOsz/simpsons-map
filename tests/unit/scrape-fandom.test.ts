import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeFandomCountryMentions } from "@/lib/ingestion/scrape-fandom";

describe("scrapeFandomCountryMentions", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("filters encyclopedia-style country intros and keeps Simpsons-related snippets", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("list=categorymembers")) {
        return new Response(
          JSON.stringify({
            query: {
              categorymembers: [{ pageid: 1, ns: 0, title: "India" }]
            }
          }),
          { status: 200 }
        );
      }

      if (url.includes("action=parse") && url.includes("page=India")) {
        return new Response(
          JSON.stringify({
            parse: {
              text: [
                '<div id="mw-content-text">',
                "<p>India is a country in South Asia with a population of over a billion people.</p>",
                "<p>In Much Apu About Nothing (S7E23), Apu recalls growing up in India.</p>",
                "</div>"
              ].join("")
            }
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ query: { categorymembers: [] } }), { status: 200 });
    }) as typeof fetch;

    const result = await scrapeFandomCountryMentions();

    expect(result.pagesScanned).toBe(1);
    expect(result.mentionsExtracted.length).toBe(1);
    expect(result.mentionsExtracted[0].snippet).toContain("Much Apu About Nothing");
    expect(result.mentionsExtracted[0].snippet).not.toContain("is a country in South Asia");
  });

  it("derives episode id from quoted title when SxxExx is missing", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("list=categorymembers")) {
        return new Response(
          JSON.stringify({
            query: {
              categorymembers: [{ pageid: 1, ns: 0, title: "India" }]
            }
          }),
          { status: 200 }
        );
      }

      if (url.includes("action=parse") && url.includes("page=India")) {
        return new Response(
          JSON.stringify({
            parse: {
              text: [
                '<div id="mw-content-text">',
                '<p>In "Much Apu About Nothing", Apu recalls growing up in India.</p>',
                "</div>"
              ].join("")
            }
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ query: { categorymembers: [] } }), { status: 200 });
    }) as typeof fetch;

    const result = await scrapeFandomCountryMentions();

    expect(result.mentionsExtracted.length).toBe(1);
    expect(result.mentionsExtracted[0].episodeId).toBe("7-23");
  });
});
