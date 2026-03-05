import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import { scoreMentionConfidence } from "@/lib/confidence";
import { parseEpisodeReference } from "@/lib/episode";
import { hashSnippet } from "@/lib/hash";
import { isRegionEnabledCountry } from "@/config/region-allowlist";
import { inferRegionCode } from "@/lib/region-mapper";
import { inferIso2FromTitle, normalizeCountryTitle } from "@/lib/countries";
import { cleanSnippetText, isSimpsonsRelevantSnippet } from "@/lib/ingestion/snippet-relevance";
import { getEpisodeTitleLookup } from "@/lib/episode-lookup";
import type { Mention, SourceType } from "@/types/domain";

const BASE_URL = "https://simpsons.fandom.com";
const API_URL = `${BASE_URL}/api.php`;
const UNKNOWN_FICTIONAL_ISO2 = "ZZ";


export interface ScrapeResult {
  pagesScanned: number;
  mentionsExtracted: Mention[];
  unresolvedTitlesCount?: number;
  unresolvedTitlesSample?: string[];
}

interface CountryPage {
  iso2: string;
  name: string;
  title: string;
  url: string;
}

const PAGE_CONCURRENCY = 8;

interface CategoryMembersResponse {
  continue?: {
    cmcontinue?: string;
  };
  query?: {
    categorymembers?: Array<{
      pageid: number;
      ns: number;
      title: string;
    }>;
  };
}

interface ParseResponse {
  parse?: {
    text?: string;
  };
}

function inferSourceType(url: string): SourceType {
  return url.includes("/wiki/") ? "WIKI_PAGE" : "REFERENCE_LINK";
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "user-agent": "SimpsonsCountryMentionsExplorerBot/1.0",
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed request ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function discoverCountryPages(): Promise<{ pages: CountryPage[]; unresolvedTitles: string[] }> {
  const pages: CountryPage[] = [];
  const unresolvedTitles = new Set<string>();
  let continuation: string | undefined;

  do {
    const payload = await fetchJson<CategoryMembersResponse>({
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:Countries",
      cmlimit: "500",
      cmnamespace: "0",
      format: "json",
      formatversion: "2",
      ...(continuation ? { cmcontinue: continuation } : {})
    });

    const members = payload.query?.categorymembers ?? [];

    for (const member of members) {
      const iso2 = inferIso2FromTitle(member.title);
      if (!iso2) {
        unresolvedTitles.add(member.title);
        pages.push({
          iso2: UNKNOWN_FICTIONAL_ISO2,
          title: member.title,
          name: normalizeCountryTitle(member.title),
          url: `${BASE_URL}/wiki/${encodeURIComponent(member.title.replace(/ /g, "_"))}`
        });
        continue;
      }

      const pageName = normalizeCountryTitle(member.title);
      pages.push({
        iso2,
        title: member.title,
        name: pageName,
        url: `${BASE_URL}/wiki/${encodeURIComponent(member.title.replace(/ /g, "_"))}`
      });
    }

    continuation = payload.continue?.cmcontinue;
  } while (continuation);

  const deduped = new Map<string, CountryPage>();
  for (const page of pages) {
    const key = page.iso2 === UNKNOWN_FICTIONAL_ISO2 ? `${page.iso2}:${page.title}` : page.iso2;
    if (!deduped.has(key)) deduped.set(key, page);
  }

  return {
    pages: Array.from(deduped.values()),
    unresolvedTitles: Array.from(unresolvedTitles)
  };
}

async function fetchParsedPageHtml(title: string): Promise<string> {
  const payload = await fetchJson<ParseResponse>({
    action: "parse",
    page: title,
    prop: "text",
    format: "json",
    formatversion: "2"
  });

  return payload.parse?.text ?? "";
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

  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, input.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

function extractSnippets($: cheerio.CheerioAPI): string[] {
  const snippets = new Set<string>();

  $("li, p").each((_, element) => {
    const text = cleanSnippetText($(element).text());
    if (text.length < 40) return;
    if (!isSimpsonsRelevantSnippet(text)) return;
    snippets.add(text);
  });

  return Array.from(snippets).slice(0, 240);
}

function extractMentionFromSnippet(
  country: CountryPage,
  snippet: string,
  sourceUrl: string,
  episodeTitleLookup: Map<string, { season: number; episodeNumber: number }>
): Mention {
  const episodeRef = parseEpisodeReference(snippet, episodeTitleLookup);
  const isImplied =
    !snippet.toLowerCase().includes(country.name.toLowerCase()) &&
    !snippet.toLowerCase().includes(country.iso2.toLowerCase());

  const confidence = scoreMentionConfidence({
    snippet,
    countryName: country.name,
    hasEpisodeCitation: Boolean(episodeRef),
    sourceStructured: true,
    corroborationCount: 1,
    isImplied
  });

  return {
    id: randomUUID(),
    countryIso2: country.iso2,
    regionCode: isRegionEnabledCountry(country.iso2) ? inferRegionCode(country.iso2, snippet) : undefined,
    episodeId: episodeRef ? `${episodeRef.season}-${episodeRef.episodeNumber}` : "0-0",
    snippet,
    confidence,
    sourceUrl,
    sourceType: inferSourceType(sourceUrl),
    isImplied,
    publishedAt: confidence >= getPublishThreshold() ? new Date().toISOString() : undefined,
    normalizedSnippetHash: hashSnippet(snippet)
  };
}

export function getPublishThreshold(): number {
  const parsed = Number(process.env.CONFIDENCE_PUBLISH_THRESHOLD ?? "0.55");
  return Number.isFinite(parsed) ? parsed : 0.55;
}

export async function scrapeFandomCountryMentions(): Promise<ScrapeResult> {
  const episodeTitleLookup = getEpisodeTitleLookup();
  const discovery = await discoverCountryPages();
  const countryPages = discovery.pages;
  const perPageMentions = await mapWithConcurrency(countryPages, PAGE_CONCURRENCY, async (country) => {
    try {
      const html = await fetchParsedPageHtml(country.title);
      if (!html) return [] as Mention[];
      const $ = cheerio.load(html);
      const snippets = extractSnippets($);
      return snippets.map((snippet) => extractMentionFromSnippet(country, snippet, country.url, episodeTitleLookup));
    } catch {
      return [] as Mention[];
    }
  });

  const mentionsExtracted = perPageMentions.flat();

  if (discovery.unresolvedTitles.length > 0) {
    console.log(
      `[ingestion][fandom] ${JSON.stringify({
        unresolvedTitlesCount: discovery.unresolvedTitles.length,
        unresolvedTitlesSample: discovery.unresolvedTitles.slice(0, 25)
      })}`
    );
  }

  return {
    pagesScanned: countryPages.length,
    mentionsExtracted,
    unresolvedTitlesCount: discovery.unresolvedTitles.length,
    unresolvedTitlesSample: discovery.unresolvedTitles.slice(0, 25)
  };
}
