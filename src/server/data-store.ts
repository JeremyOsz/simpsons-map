import { sampleCountries, sampleEpisodes, sampleMentions, sampleRegions, sampleRuns } from "@/data/sample-data";
import { confidenceBucket } from "@/lib/confidence";
import type { Country, Episode, IngestionRun, Mention, MentionFilters, Region, UnknownPlace } from "@/types/domain";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { countryDisplayNameFromIso, inferIso2FromTitle, isRecognizedIso2, normalizeCountryTitle } from "@/lib/countries";
import { isRegionEnabledCountry } from "@/config/region-allowlist";
import { parseEpisodeReference } from "@/lib/episode";
import { getEpisodeTitleLookup } from "@/lib/episode-lookup";
import { getRegionDisplayName, inferRegionCode } from "@/lib/region-mapper";

interface PersistedState {
  mentions: Mention[];
  runs: IngestionRun[];
}

const DATA_DIR = join(process.cwd(), ".data");
const STORE_FILE = join(DATA_DIR, "runtime-store.json");

function loadPersistedState(): PersistedState {
  if (!existsSync(STORE_FILE)) {
    return {
      mentions: [...sampleMentions],
      runs: [...sampleRuns]
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as PersistedState;
    const persistedMentions = (Array.isArray(parsed.mentions) ? parsed.mentions : []).map(normalizeMentionCountryIso2);
    const mergedMentions = [...sampleMentions];

    for (const mention of persistedMentions) {
      const exists = mergedMentions.some(
        (candidate) =>
          candidate.countryIso2 === mention.countryIso2 &&
          candidate.episodeId === mention.episodeId &&
          candidate.normalizedSnippetHash === mention.normalizedSnippetHash &&
          candidate.sourceUrl === mention.sourceUrl
      );
      if (!exists) mergedMentions.push(mention);
    }

    return {
      mentions: mergedMentions,
      runs: Array.isArray(parsed.runs) && parsed.runs.length > 0 ? parsed.runs : [...sampleRuns]
    };
  } catch {
    return {
      mentions: [...sampleMentions],
      runs: [...sampleRuns]
    };
  }
}

function persistState(state: PersistedState): void {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export interface DataStore {
  listCountries(filters: Pick<MentionFilters, "q" | "seasonFrom" | "seasonTo" | "sort">): Promise<Country[]>;
  getCountry(iso2: string): Promise<Country | null>;
  listRegions(iso2: string): Promise<Region[]>;
  listMentions(filters: MentionFilters): Promise<{ items: Mention[]; nextCursor?: string }>;
  listUnknownWikiMentions(filters: Pick<MentionFilters, "q" | "cursor" | "limit">): Promise<{ items: Mention[]; nextCursor?: string }>;
  listUnknownPlaces(filters: Pick<MentionFilters, "q" | "seasonFrom" | "seasonTo">): Promise<UnknownPlace[]>;
  getEpisode(id: string): Promise<Episode | null>;
  createIngestionRun(run: IngestionRun): Promise<void>;
  updateIngestionRun(run: IngestionRun): Promise<void>;
  getIngestionRun(id: string): Promise<IngestionRun | null>;
  upsertMentions(mentions: Mention[]): Promise<number>;
  backfillUnknownEpisodes(): Promise<{ updated: number; remainingUnknown: number }>;
}

class InMemoryDataStore implements DataStore {
  private countries = [...sampleCountries];
  private regions = [...sampleRegions];
  private episodes = [...sampleEpisodes];
  private mentions: Mention[];
  private runs: IngestionRun[];

  constructor() {
    const persisted = loadPersistedState();
    this.mentions = persisted.mentions;
    this.runs = persisted.runs;
    this.recomputeCountryCounts();
  }

  async listCountries(filters: Pick<MentionFilters, "q" | "seasonFrom" | "seasonTo" | "sort">): Promise<Country[]> {
    const seasonFiltered = this.filterMentions({
      seasonFrom: filters.seasonFrom,
      seasonTo: filters.seasonTo
    });
    const q = (filters.q ?? "").trim().toLowerCase();
    let countries = this.deriveCountriesFromMentions(seasonFiltered);
    if (q.length > 0) {
      const byCountry = new Map(countries.map((country) => [country.iso2, country]));
      const mentionMatchesByIso = new Map<string, number>();
      const mentionMatches = this.filterMentions({
        seasonFrom: filters.seasonFrom,
        seasonTo: filters.seasonTo,
        q
      });

      for (const mention of mentionMatches) {
        mentionMatchesByIso.set(mention.countryIso2, (mentionMatchesByIso.get(mention.countryIso2) ?? 0) + 1);
      }

      countries = countries.filter((country) => {
        const countryNameMatch = country.name.toLowerCase().includes(q) || country.iso2.toLowerCase().includes(q);
        const mentionMatch = (mentionMatchesByIso.get(country.iso2) ?? 0) > 0;
        return countryNameMatch || mentionMatch;
      });

      countries = countries.map((country) => ({
        ...country,
        keywordHitCount: mentionMatchesByIso.get(country.iso2) ?? 0
      }));

      for (const [iso2, hitCount] of mentionMatchesByIso.entries()) {
        if (byCountry.has(iso2)) continue;
        countries.push({
          id: `derived-${iso2}-search`,
          iso2,
          name: countryDisplayNameFromIso(iso2),
          mentionCount: hitCount,
          isRegionEnabled: isRegionEnabledCountry(iso2),
          sourceMix: { wikiPage: 0, referenceLink: 0 },
          lowConfidenceCount: 0,
          unknownEpisodeCount: 0,
          keywordHitCount: hitCount,
          isUnknownOrFictional: !isRecognizedIso2(iso2)
        });
      }
    }

    const sort = filters.sort ?? "mentions_desc";
    if (sort === "name_asc") {
      return countries.sort((a, b) => a.name.localeCompare(b.name));
    }

    return countries.sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
  }

  async getCountry(iso2: string): Promise<Country | null> {
    const normalizedIso = iso2.toUpperCase();
    const countries = this.deriveCountriesFromMentions(this.mentions);
    const found = countries.find((country) => country.iso2 === normalizedIso);
    if (found) return found;

    const sample = this.countries.find((country) => country.iso2 === normalizedIso);
    if (!sample) return null;
    return {
      ...sample,
      name: countryDisplayNameFromIso(normalizedIso),
      isRegionEnabled: isRegionEnabledCountry(normalizedIso),
      sourceMix: { wikiPage: 0, referenceLink: 0 },
      lowConfidenceCount: 0,
      unknownEpisodeCount: 0
    };
  }

  async listRegions(iso2: string): Promise<Region[]> {
    const normalizedIso = iso2.toUpperCase();
    const mentionCounts = new Map<string, number>();

    for (const mention of this.mentions) {
      if (mention.countryIso2 !== normalizedIso) continue;
      const code = this.getEffectiveRegionCode(mention);
      mentionCounts.set(code, (mentionCounts.get(code) ?? 0) + 1);
    }

    if (mentionCounts.size === 0) {
      return this.regions.filter((region) => region.countryIso2 === normalizedIso);
    }

    const sampleByCode = new Map(
      this.regions
        .filter((region) => region.countryIso2 === normalizedIso)
        .map((region) => [region.code.toUpperCase(), region.name])
    );

    return Array.from(mentionCounts.entries())
      .map(([code, count], index) => ({
        id: `derived-${normalizedIso}-${code}-${index}`,
        countryIso2: normalizedIso,
        code,
        name: getRegionDisplayName(normalizedIso, code) ?? sampleByCode.get(code) ?? code,
        mentionCount: count
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
  }

  async listMentions(filters: MentionFilters): Promise<{ items: Mention[]; nextCursor?: string }> {
    const cursor = filters.cursor ?? "";
    const limit = Math.max(1, Math.min(filters.limit ?? 20, 100));

    const filtered = this.filterMentions(filters).sort((a, b) => a.id.localeCompare(b.id));
    const startIndex = cursor ? filtered.findIndex((m) => m.id === cursor) + 1 : 0;
    const items = filtered.slice(startIndex, startIndex + limit).map((mention) => {
      const effectiveRegionCode = this.getEffectiveRegionCode(mention);
      if (mention.regionCode?.toUpperCase() === effectiveRegionCode) return mention;
      return { ...mention, regionCode: effectiveRegionCode };
    });
    const nextCursor = startIndex + limit < filtered.length ? items.at(-1)?.id : undefined;

    return { items, nextCursor };
  }

  async listUnknownWikiMentions(filters: Pick<MentionFilters, "q" | "cursor" | "limit">): Promise<{ items: Mention[]; nextCursor?: string }> {
    const cursor = filters.cursor ?? "";
    const limit = Math.max(1, Math.min(filters.limit ?? 20, 100));

    const filtered = this.mentions
      .filter((mention) => mention.sourceType === "WIKI_PAGE" && mention.episodeId === "0-0")
      .filter((mention) => {
        if (!filters.q) return true;
        const q = filters.q.toLowerCase();
        return (
          mention.snippet.toLowerCase().includes(q) ||
          mention.countryIso2.toLowerCase().includes(q) ||
          countryDisplayNameFromIso(mention.countryIso2).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const startIndex = cursor ? filtered.findIndex((m) => m.id === cursor) + 1 : 0;
    const items = filtered.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < filtered.length ? items.at(-1)?.id : undefined;
    return { items, nextCursor };
  }

  async listUnknownPlaces(filters: Pick<MentionFilters, "q" | "seasonFrom" | "seasonTo">): Promise<UnknownPlace[]> {
    const unknownMentions = this.filterMentions({
      seasonFrom: filters.seasonFrom,
      seasonTo: filters.seasonTo,
      q: filters.q
    }).filter((mention) => !isRecognizedIso2(mention.countryIso2));

    const places = new Map<string, UnknownPlace>();
    for (const mention of unknownMentions) {
      const iso2 = mention.countryIso2.toUpperCase();
      const placeName =
        extractPlaceNameFromSourceUrl(mention.sourceUrl) ??
        (iso2 === "ZZ" ? "Unknown/Fictional place" : countryDisplayNameFromIso(iso2));
      const key = `${iso2}:${placeName.toLowerCase()}`;
      const current = places.get(key) ?? { iso2, name: placeName, mentionCount: 0 };
      current.mentionCount += 1;
      places.set(key, current);
    }

    return Array.from(places.values()).sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
  }

  async getEpisode(id: string): Promise<Episode | null> {
    return this.episodes.find((episode) => episode.id === id) ?? null;
  }

  async createIngestionRun(run: IngestionRun): Promise<void> {
    this.runs.push(run);
    this.flushToDisk();
  }

  async updateIngestionRun(run: IngestionRun): Promise<void> {
    const index = this.runs.findIndex((candidate) => candidate.id === run.id);
    if (index === -1) {
      this.runs.push(run);
      return;
    }

    this.runs[index] = run;
    this.flushToDisk();
  }

  async getIngestionRun(id: string): Promise<IngestionRun | null> {
    return this.runs.find((run) => run.id === id) ?? null;
  }

  async upsertMentions(mentions: Mention[]): Promise<number> {
    let inserted = 0;

    for (const mention of mentions) {
      const normalizedMention = normalizeMentionCountryIso2(mention);
      const exists = this.mentions.some(
        (candidate) =>
          candidate.countryIso2 === normalizedMention.countryIso2 &&
          candidate.episodeId === normalizedMention.episodeId &&
          candidate.normalizedSnippetHash === normalizedMention.normalizedSnippetHash &&
          candidate.sourceUrl === normalizedMention.sourceUrl
      );

      if (!exists) {
        this.mentions.push(normalizedMention);
        inserted += 1;
      }
    }

    this.recomputeCountryCounts();
    this.flushToDisk();

    return inserted;
  }

  async backfillUnknownEpisodes(): Promise<{ updated: number; remainingUnknown: number }> {
    const episodeTitleLookup = getEpisodeTitleLookup();
    const knownByHash = new Map<string, string>();
    for (const mention of this.mentions) {
      if (mention.episodeId !== "0-0") {
        knownByHash.set(mention.normalizedSnippetHash, mention.episodeId);
      }
    }

    let updated = 0;
    this.mentions = this.mentions.map((mention) => {
      if (mention.episodeId !== "0-0") return mention;

      const byHash = knownByHash.get(mention.normalizedSnippetHash);
      if (byHash) {
        updated += 1;
        return { ...mention, episodeId: byHash };
      }

      const parsed = parseEpisodeReference(mention.snippet, episodeTitleLookup);
      if (!parsed) return mention;
      updated += 1;
      return { ...mention, episodeId: `${parsed.season}-${parsed.episodeNumber}` };
    });

    this.recomputeCountryCounts();
    this.flushToDisk();
    const remainingUnknown = this.mentions.filter((mention) => mention.episodeId === "0-0").length;
    return { updated, remainingUnknown };
  }

  private filterMentions(filters: Pick<MentionFilters, "country" | "region" | "seasonFrom" | "seasonTo" | "q" | "confidence" | "sourceType">): Mention[] {
    return this.mentions.filter((mention) => {
      if (filters.country && mention.countryIso2 !== filters.country.toUpperCase()) return false;
      if (filters.region && this.getEffectiveRegionCode(mention) !== filters.region.toUpperCase()) return false;
      if (filters.sourceType && mention.sourceType !== filters.sourceType) return false;
      if (filters.confidence && confidenceBucket(mention.confidence) !== filters.confidence) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const episodeQuery = q.match(/s(\d{1,2})e(\d{1,2})/i);
        const episode = this.episodes.find((candidate) => candidate.id === mention.episodeId);

        if (episodeQuery && episode) {
          const season = Number(episodeQuery[1]);
          const episodeNumber = Number(episodeQuery[2]);
          if (episode.season !== season || episode.episodeNumber !== episodeNumber) return false;
        } else {
          const matchesSnippet = mention.snippet.toLowerCase().includes(q);
          const matchesCountryIso = mention.countryIso2.toLowerCase().includes(q);
          const matchesCountryName = countryDisplayNameFromIso(mention.countryIso2).toLowerCase().includes(q);

          if (!matchesSnippet && !matchesCountryIso && !matchesCountryName) {
            return false;
          }
        }
      }

      if (filters.seasonFrom || filters.seasonTo) {
        const episode = this.episodes.find((candidate) => candidate.id === mention.episodeId);
        if (!episode) return true;
        if (filters.seasonFrom && episode.season < filters.seasonFrom) return false;
        if (filters.seasonTo && episode.season > filters.seasonTo) return false;
      }

      return true;
    });
  }

  private getEffectiveRegionCode(mention: Mention): string {
    if (mention.regionCode && mention.regionCode.trim().length > 0) {
      return mention.regionCode.toUpperCase();
    }

    if (!isRegionEnabledCountry(mention.countryIso2)) {
      return "UNKNOWN";
    }

    return inferRegionCode(mention.countryIso2, mention.snippet) ?? "UNKNOWN";
  }

  private recomputeCountryCounts(): void {
    for (const country of this.countries) {
      country.mentionCount = this.mentions.filter((mention) => mention.countryIso2 === country.iso2).length;
    }
  }

  private deriveCountriesFromMentions(mentions: Mention[]): Country[] {
    const stats = new Map<
      string,
      {
        mentionCount: number;
        wikiPage: number;
        referenceLink: number;
        lowConfidenceCount: number;
        unknownEpisodeCount: number;
      }
    >();

    for (const mention of mentions) {
      const iso2 = mention.countryIso2.toUpperCase();
      const current = stats.get(iso2) ?? {
        mentionCount: 0,
        wikiPage: 0,
        referenceLink: 0,
        lowConfidenceCount: 0,
        unknownEpisodeCount: 0
      };

      current.mentionCount += 1;
      if (mention.sourceType === "WIKI_PAGE") current.wikiPage += 1;
      if (mention.sourceType === "REFERENCE_LINK") current.referenceLink += 1;
      if (mention.confidence < 0.75) current.lowConfidenceCount += 1;
      if (mention.episodeId === "0-0") current.unknownEpisodeCount += 1;

      stats.set(iso2, current);
    }

    const derived = Array.from(stats.entries()).map(([iso2, stat], index) => ({
      id: `derived-${iso2}-${index}`,
      iso2,
      name: countryDisplayNameFromIso(iso2),
      mentionCount: stat.mentionCount,
      isRegionEnabled: isRegionEnabledCountry(iso2),
      sourceMix: {
        wikiPage: stat.wikiPage,
        referenceLink: stat.referenceLink
      },
      lowConfidenceCount: stat.lowConfidenceCount,
      unknownEpisodeCount: stat.unknownEpisodeCount,
      isUnknownOrFictional: !isRecognizedIso2(iso2)
    }));

    if (derived.length > 0) return derived;

    return this.countries.map((country) => ({
      ...country,
      name: countryDisplayNameFromIso(country.iso2),
      isRegionEnabled: isRegionEnabledCountry(country.iso2),
      sourceMix: { wikiPage: 0, referenceLink: 0 },
      lowConfidenceCount: 0,
      unknownEpisodeCount: 0,
      isUnknownOrFictional: !isRecognizedIso2(country.iso2)
    }));
  }

  private flushToDisk(): void {
    persistState({
      mentions: this.mentions,
      runs: this.runs
    });
  }
}

let singleton: DataStore | undefined;

function extractPlaceNameFromSourceUrl(sourceUrl: string): string | undefined {
  try {
    const url = new URL(sourceUrl);
    const wikiIndex = url.pathname.indexOf("/wiki/");
    if (wikiIndex === -1) return undefined;
    const slug = decodeURIComponent(url.pathname.slice(wikiIndex + "/wiki/".length)).split("/")[0];
    if (!slug) return undefined;
    const normalized = normalizeCountryTitle(slug.replace(/_/g, " "));
    return normalized.length > 0 ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function normalizeMentionCountryIso2(mention: Mention): Mention {
  const currentIso2 = mention.countryIso2.toUpperCase();
  if (isRecognizedIso2(currentIso2)) return mention;
  const placeName = extractPlaceNameFromSourceUrl(mention.sourceUrl);
  if (!placeName) return mention;
  const inferred = inferIso2FromTitle(placeName);
  if (!inferred) return mention;
  return { ...mention, countryIso2: inferred.toUpperCase() };
}

export function getDataStore(): DataStore {
  if (!singleton) {
    singleton = new InMemoryDataStore();
  }

  return singleton;
}
