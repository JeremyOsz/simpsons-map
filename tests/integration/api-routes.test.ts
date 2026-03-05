import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCountries } from "@app/api/countries/route";
import { GET as getMentions } from "@app/api/mentions/route";
import { GET as getCountry } from "@app/api/countries/[iso2]/route";
import { GET as getRegions } from "@app/api/countries/[iso2]/regions/route";
import { GET as getUnknownWiki } from "@app/api/admin/unknown-wiki/route";
import { getDataStore } from "@/server/data-store";
import { hashSnippet } from "@/lib/hash";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("API routes", () => {
  it("filters countries by query", async () => {
    const response = await getCountries(makeRequest("http://localhost/api/countries?q=united"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("supports countries sort query", async () => {
    const response = await getCountries(makeRequest("http://localhost/api/countries?sort=name_asc"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("finds countries by mention keyword search", async () => {
    const store = getDataStore();
    const snippet = "Bart says hello from this synthetic integration test line.";
    await store.upsertMentions([
      {
        id: "test-keyword-country-route",
        countryIso2: "US",
        episodeId: "10-2",
        snippet,
        confidence: 0.9,
        sourceUrl: "https://example.com/test-keyword",
        sourceType: "REFERENCE_LINK",
        isImplied: false,
        publishedAt: new Date().toISOString(),
        normalizedSnippetHash: hashSnippet(snippet)
      }
    ]);

    const response = await getCountries(makeRequest("http://localhost/api/countries?q=Bart"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.some((country: { iso2: string; keywordHitCount?: number }) => country.iso2 === "US")).toBe(true);
  });

  it("returns paginated mentions", async () => {
    const response = await getMentions(makeRequest("http://localhost/api/mentions?country=US&limit=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items.length).toBe(1);
  });

  it("filters mentions by region code", async () => {
    const response = await getMentions(makeRequest("http://localhost/api/mentions?country=US&region=IL&limit=50"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items.every((item: { regionCode?: string }) => item.regionCode === "IL")).toBe(true);
  });

  it("validates invalid query params", async () => {
    const response = await getMentions(makeRequest("http://localhost/api/mentions?limit=5000"));
    expect(response.status).toBe(400);
  });

  it("resolves country details for dynamically ingested ISO not present in sample list", async () => {
    const store = getDataStore();
    const snippet = "A reference to Macedonia appears in this debug line.";
    await store.upsertMentions([
      {
        id: "test-mk-country-route",
        countryIso2: "MK",
        episodeId: "0-0",
        snippet,
        confidence: 0.66,
        sourceUrl: "https://example.com/test-mk",
        sourceType: "REFERENCE_LINK",
        isImplied: false,
        publishedAt: new Date().toISOString(),
        normalizedSnippetHash: hashSnippet(snippet)
      }
    ]);

    const response = await getCountry(makeRequest("http://localhost/api/countries/MK"), {
      params: Promise.resolve({ iso2: "MK" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.country.iso2).toBe("MK");
  });

  it("lists unknown wiki mentions in admin endpoint", async () => {
    const store = getDataStore();
    const snippet = "Unresolved wiki-style line for Fictionland unknown episode debugging.";
    await store.upsertMentions([
      {
        id: "test-unknown-wiki-route",
        countryIso2: "ZZ",
        episodeId: "0-0",
        snippet,
        confidence: 0.7,
        sourceUrl: "https://simpsons.fandom.com/wiki/Fictionland",
        sourceType: "WIKI_PAGE",
        isImplied: false,
        publishedAt: new Date().toISOString(),
        normalizedSnippetHash: hashSnippet(snippet)
      }
    ]);

    const response = await getUnknownWiki(makeRequest("http://localhost/api/admin/unknown-wiki?q=Fictionland"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it("derives region rows from ingested mentions", async () => {
    const store = getDataStore();
    const snippet = "A road trip through Austin, Texas appears in this test line.";
    await store.upsertMentions([
      {
        id: "test-regions-route-us-tx",
        countryIso2: "US",
        regionCode: "TX",
        episodeId: "10-3",
        snippet,
        confidence: 0.89,
        sourceUrl: "https://example.com/test-regions-tx",
        sourceType: "REFERENCE_LINK",
        isImplied: false,
        publishedAt: new Date().toISOString(),
        normalizedSnippetHash: hashSnippet(snippet)
      }
    ]);

    const response = await getRegions(makeRequest("http://localhost/api/countries/US/regions"), {
      params: Promise.resolve({ iso2: "US" })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.some((region: { code: string; name: string }) => region.code === "TX" && region.name === "Texas")).toBe(true);
  });
});
