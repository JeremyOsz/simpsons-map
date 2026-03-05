import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import { scoreMentionConfidence } from "@/lib/confidence";
import { parseEpisodeReference } from "@/lib/episode";
import { hashSnippet } from "@/lib/hash";
import { inferIso2FromTitle, normalizeCountryTitle } from "@/lib/countries";
import { inferRegionCode } from "@/lib/region-mapper";
import { isRegionEnabledCountry } from "@/config/region-allowlist";
import { cleanSnippetText, isSimpsonsRelevantSnippet } from "@/lib/ingestion/snippet-relevance";
import { getEpisodeTitleLookup } from "@/lib/episode-lookup";
import type { Mention } from "@/types/domain";
import { getPublishThreshold } from "@/lib/ingestion/scrape-fandom";

const SOURCE_URL = "https://simpsonswiki.com/wiki/Countries";
const PAGE_CONCURRENCY = 8;

export interface SecondaryScrapeResult {
  pagesScanned: number;
  mentionsExtracted: Mention[];
}

interface CountryPage {
  name: string;
  iso2: string;
  url: string;
}

async function mapWithConcurrency<T, R>(
  input: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(input.length);
  let cursor = 0;

  async function worker() {
    while (cursor < input.length) {
      const index = cursor++;
      results[index] = await mapper(input[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(input.length, 1)) }, () => worker()));
  return results;
}

function toAbsoluteUrl(href: string): string {
  if (href.startsWith("http")) return href;
  return `https://simpsonswiki.com${href}`;
}

async function discoverCountryPages(): Promise<CountryPage[]> {
  const response = await fetch(SOURCE_URL, {
    headers: { "user-agent": "SimpsonsCountryMentionsExplorerBot/1.0" }
  });

  if (!response.ok) {
    throw new Error(`Failed request ${SOURCE_URL}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const links = $("#mw-pages a, #mw-content-text a");
  const countries = new Map<string, CountryPage>();

  links.each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const title = ($(element).attr("title") ?? $(element).text()).trim();
    if (!href.startsWith("/wiki/")) return;
    if (href.includes(":")) return;
    if (!title || title.length < 3) return;

    const normalized = normalizeCountryTitle(title);
    const iso2 = inferIso2FromTitle(normalized);
    if (!iso2) return;

    if (!countries.has(iso2)) {
      countries.set(iso2, {
        name: normalized,
        iso2,
        url: toAbsoluteUrl(href)
      });
    }
  });

  return Array.from(countries.values());
}

function extractSnippets($: cheerio.CheerioAPI): string[] {
  const snippets = new Set<string>();

  $("#mw-content-text li, #mw-content-text p").each((_, element) => {
    const text = cleanSnippetText($(element).text());
    if (text.length < 35) return;
    if (!isSimpsonsRelevantSnippet(text)) return;
    snippets.add(text);
  });

  return Array.from(snippets).slice(0, 120);
}

export async function scrapeSimpsonsWikiCountries(): Promise<SecondaryScrapeResult> {
  const countryPages = await discoverCountryPages();
  const episodeTitleLookup = getEpisodeTitleLookup();

  const perPage = await mapWithConcurrency(countryPages, PAGE_CONCURRENCY, async (country) => {
    const mentionRows: Mention[] = [];

    try {
      const response = await fetch(country.url, {
        headers: { "user-agent": "SimpsonsCountryMentionsExplorerBot/1.0" }
      });
      if (!response.ok) return mentionRows;

      const html = await response.text();
      const $ = cheerio.load(html);
      const snippets = extractSnippets($);

      if (snippets.length === 0) {
        const fallback = `${country.name} is listed in SimpsonsWiki countries index.`;
        const confidence = scoreMentionConfidence({
          snippet: fallback,
          countryName: country.name,
          hasEpisodeCitation: false,
          sourceStructured: true,
          corroborationCount: 1,
          isImplied: false
        });

        mentionRows.push({
          id: randomUUID(),
          countryIso2: country.iso2,
          regionCode: isRegionEnabledCountry(country.iso2) ? inferRegionCode(country.iso2, fallback) : undefined,
          episodeId: "0-0",
          snippet: fallback,
          confidence,
          sourceUrl: country.url,
          sourceType: "REFERENCE_LINK",
          isImplied: false,
          publishedAt: confidence >= getPublishThreshold() ? new Date().toISOString() : undefined,
          normalizedSnippetHash: hashSnippet(fallback)
        });

        return mentionRows;
      }

      for (const snippet of snippets) {
        const episode = parseEpisodeReference(snippet, episodeTitleLookup);
        const confidence = scoreMentionConfidence({
          snippet,
          countryName: country.name,
          hasEpisodeCitation: Boolean(episode),
          sourceStructured: true,
          corroborationCount: 1,
          isImplied: !snippet.toLowerCase().includes(country.name.toLowerCase())
        });

        mentionRows.push({
          id: randomUUID(),
          countryIso2: country.iso2,
          regionCode: isRegionEnabledCountry(country.iso2) ? inferRegionCode(country.iso2, snippet) : undefined,
          episodeId: episode ? `${episode.season}-${episode.episodeNumber}` : "0-0",
          snippet,
          confidence,
          sourceUrl: country.url,
          sourceType: "REFERENCE_LINK",
          isImplied: false,
          publishedAt: confidence >= getPublishThreshold() ? new Date().toISOString() : undefined,
          normalizedSnippetHash: hashSnippet(snippet)
        });
      }
    } catch {
      return mentionRows;
    }

    return mentionRows;
  });

  return {
    pagesScanned: countryPages.length,
    mentionsExtracted: perPage.flat()
  };
}
