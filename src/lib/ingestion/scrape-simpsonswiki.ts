import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import { scoreMentionConfidence } from "@/lib/confidence";
import { parseEpisodeReference } from "@/lib/episode";
import { hashSnippet } from "@/lib/hash";
import { inferIso2FromTitle, normalizeCountryTitle } from "@/lib/countries";
import { inferRegionCode } from "@/lib/region-mapper";
import { isRegionEnabledCountry } from "@/config/region-allowlist";
import { getEpisodeTitleLookup } from "@/lib/episode-lookup";
import type { Mention } from "@/types/domain";
import { getPublishThreshold } from "@/lib/ingestion/scrape-fandom";

const SOURCE_URL = "https://simpsonswiki.com/wiki/Places_visited_by_the_Simpson_family";

export interface SecondaryScrapeResult {
  pagesScanned: number;
  mentionsExtracted: Mention[];
}

function parseCountrySections($: cheerio.CheerioAPI): Array<{ countryName: string; snippet: string }> {
  const results: Array<{ countryName: string; snippet: string }> = [];

  $("#mw-content-text h2, #mw-content-text h3, #mw-content-text h4").each((_, heading) => {
    const headingText = $(heading)
      .text()
      .replace(/\[edit\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const normalized = normalizeCountryTitle(headingText);
    const iso2 = inferIso2FromTitle(normalized);
    if (!iso2) return;

    let next = $(heading).next();
    while (next.length > 0 && !/^h[2-4]$/i.test(next.get(0)?.tagName ?? "")) {
      if (next.is("ul") || next.is("ol")) {
        next.find("li").each((__, li) => {
          const snippet = $(li).text().replace(/\s+/g, " ").trim();
          if (snippet.length >= 20) {
            results.push({ countryName: normalized, snippet });
          }
        });
      }
      next = next.next();
    }
  });

  return results;
}

export async function scrapeSimpsonsWikiPlaces(): Promise<SecondaryScrapeResult> {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "SimpsonsCountryMentionsExplorerBot/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed request ${SOURCE_URL}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const sections = parseCountrySections($);
  const episodeTitleLookup = getEpisodeTitleLookup();

  const mentionsExtracted: Mention[] = [];

  for (const entry of sections) {
    const iso2 = inferIso2FromTitle(entry.countryName);
    if (!iso2) continue;

    const episode = parseEpisodeReference(entry.snippet, episodeTitleLookup);
    const isImplied = !entry.snippet.toLowerCase().includes(entry.countryName.toLowerCase());
    const confidence = scoreMentionConfidence({
      snippet: entry.snippet,
      countryName: entry.countryName,
      hasEpisodeCitation: Boolean(episode),
      sourceStructured: true,
      corroborationCount: 1,
      isImplied
    });

    mentionsExtracted.push({
      id: randomUUID(),
      countryIso2: iso2,
      regionCode: isRegionEnabledCountry(iso2) ? inferRegionCode(iso2, entry.snippet) : undefined,
      episodeId: episode ? `${episode.season}-${episode.episodeNumber}` : "0-0",
      snippet: entry.snippet,
      confidence,
      sourceUrl: SOURCE_URL,
      sourceType: "REFERENCE_LINK",
      isImplied,
      publishedAt: confidence >= getPublishThreshold() ? new Date().toISOString() : undefined,
      normalizedSnippetHash: hashSnippet(entry.snippet)
    });
  }

  return {
    pagesScanned: 1,
    mentionsExtracted
  };
}
