import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoreMentionConfidence } from "@/lib/confidence";
import { parseEpisodeCode } from "@/lib/episode";
import { hashSnippet } from "@/lib/hash";
import { inferRegionCode } from "@/lib/region-mapper";
import { isRegionEnabledCountry } from "@/config/region-allowlist";
import { knownCountryTokens } from "@/lib/countries";
import type { Mention } from "@/types/domain";
import { getPublishThreshold } from "@/lib/ingestion/scrape-fandom";
const THESIMPSONS_GITHUB_URL = "https://github.com/jcrodriguez1989/thesimpsons";

export interface SecondaryScrapeResult {
  pagesScanned: number;
  mentionsExtracted: Mention[];
}

interface ScriptLineRow {
  spoken_words?: string;
  raw_text?: string;
  season?: string;
  number_in_season?: string;
  episode_id?: string;
  episode_number?: string;
  episode_num?: string;
  episode?: string;
  season_id?: string;
}

interface EpisodeRow {
  id?: string;
  episode_id?: string;
  season?: string;
  season_id?: string;
  number_in_season?: string;
  episode_number?: string;
  episode_num?: string;
}

interface CountryTokenMatcher {
  iso2: string;
  token: string;
  regex: RegExp;
}

function csvInputEnabled(input: string | undefined): input is string {
  if (!input) return false;
  const normalized = input.trim();
  if (normalized.length === 0) return false;
  if (normalized === "undefined" || normalized === "null") return false;
  return true;
}

function isHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

async function readCsvInput(input: string): Promise<string> {
  if (isHttpUrl(input)) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed request ${input}: ${response.status}`);
    }
    return response.text();
  }

  const resolvedPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
  return readFile(resolvedPath, "utf8");
}

function datasetSourceUrl(input: string): string {
  if (isHttpUrl(input) && !input.includes("simpsons_script_lines.csv")) {
    return input;
  }
  return THESIMPSONS_GITHUB_URL;
}

export async function scrapeTheSimpsonsDataset(): Promise<SecondaryScrapeResult> {
  const scriptLinesUrl = process.env.THSIMPSONS_SCRIPT_LINES_CSV_URL;
  if (!csvInputEnabled(scriptLinesUrl)) {
    return { pagesScanned: 0, mentionsExtracted: [] };
  }

  const csv = await readCsvInput(scriptLinesUrl);
  const sourceUrl = datasetSourceUrl(scriptLinesUrl);
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true
  }) as ScriptLineRow[];
  const episodeLookup = await loadEpisodesLookup();

  const countryTokens = knownCountryTokens()
    .map((token) => ({
      ...token,
      regex: new RegExp(`(^|[^a-z0-9])${escapeRegExp(token.token)}([^a-z0-9]|$)`, "i")
    }))
    .sort((a, b) => b.token.length - a.token.length) as CountryTokenMatcher[];
  const mentionsExtracted: Mention[] = [];
  let linesWithCountryMatch = 0;
  let rowsParsed = 0;
  let unknownEpisodeRows = 0;

  for (const row of rows) {
    rowsParsed += 1;
    const line = (row.spoken_words ?? row.raw_text ?? "").trim();
    if (line.length < 20) continue;

    const matchedByIso = new Map<string, CountryTokenMatcher>();
    for (const token of countryTokens) {
      if (!token.regex.test(line)) continue;
      if (!matchedByIso.has(token.iso2)) {
        matchedByIso.set(token.iso2, token);
      }
    }
    if (matchedByIso.size === 0) continue;
    linesWithCountryMatch += 1;

    const { season, episodeNumber } = inferEpisodeFromRow(row, line, episodeLookup);
    if (season === 0 || episodeNumber === 0) unknownEpisodeRows += 1;

    for (const matched of matchedByIso.values()) {
      const confidence = scoreMentionConfidence({
        snippet: line,
        countryName: matched.token,
        hasEpisodeCitation: season > 0 && episodeNumber > 0,
        sourceStructured: true,
        corroborationCount: 1,
        isImplied: false
      });

      mentionsExtracted.push({
        id: randomUUID(),
        countryIso2: matched.iso2,
        regionCode: isRegionEnabledCountry(matched.iso2) ? inferRegionCode(matched.iso2, line) : undefined,
        episodeId: season > 0 && episodeNumber > 0 ? `${season}-${episodeNumber}` : "0-0",
        snippet: line,
        confidence,
        sourceUrl,
        sourceType: "REFERENCE_LINK",
        isImplied: false,
        publishedAt: confidence >= getPublishThreshold() ? new Date().toISOString() : undefined,
        normalizedSnippetHash: hashSnippet(line)
      });
    }
  }

  console.log(
    `[ingestion][dataset] ${JSON.stringify({
      rowsParsed,
      linesWithCountryMatch,
      mentionsExtracted: mentionsExtracted.length,
      unknownEpisodeRows,
      episodeLookupSize: episodeLookup.size
    })}`
  );

  return {
    pagesScanned: 1,
    mentionsExtracted
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferEpisodeFromRow(
  row: ScriptLineRow,
  line: string,
  episodeLookup: Map<string, { season: number; episodeNumber: number }>
): { season: number; episodeNumber: number } {
  const seasonCandidates = [row.season, row.season_id];
  const episodeCandidates = [row.number_in_season, row.episode_number, row.episode_num, row.episode];

  const season = firstPositiveInteger(seasonCandidates);
  const episodeNumber = firstPositiveInteger(episodeCandidates);
  if (season > 0 && episodeNumber > 0) return { season, episodeNumber };

  const rawEpisodeId = (row.episode_id ?? "").trim();
  if (rawEpisodeId) {
    const resolved = episodeLookup.get(rawEpisodeId);
    if (resolved) return resolved;
  }

  const parsedFromLine = parseEpisodeCode(line);
  if (parsedFromLine) {
    return parsedFromLine;
  }

  return { season: 0, episodeNumber: 0 };
}

function firstPositiveInteger(values: Array<string | undefined>): number {
  for (const value of values) {
    const parsed = Number(value ?? 0);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

async function loadEpisodesLookup(): Promise<Map<string, { season: number; episodeNumber: number }>> {
  const episodesUrl = process.env.THSIMPSONS_EPISODES_CSV_URL;
  if (!csvInputEnabled(episodesUrl)) return new Map();

  const csv = await readCsvInput(episodesUrl);
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true
  }) as EpisodeRow[];

  const lookup = new Map<string, { season: number; episodeNumber: number }>();
  for (const row of rows) {
    const id = String(row.id ?? row.episode_id ?? "").trim();
    if (!id) continue;

    const season = firstPositiveInteger([row.season, row.season_id]);
    const episodeNumber = firstPositiveInteger([row.number_in_season, row.episode_number, row.episode_num]);
    if (season <= 0 || episodeNumber <= 0) continue;

    lookup.set(id, { season, episodeNumber });
  }

  return lookup;
}
