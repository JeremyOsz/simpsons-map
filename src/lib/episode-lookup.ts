import { parse } from "csv-parse/sync";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sampleEpisodes } from "@/data/sample-data";
import { toEpisodeTitleKey } from "@/lib/episode";

type EpisodeRef = { season: number; episodeNumber: number };

interface EpisodeCsvRow {
  title?: string;
  season?: string;
  number_in_season?: string;
  episode_number?: string;
  episode_num?: string;
}

let cachedLookup: Map<string, EpisodeRef> | null = null;

const TITLE_OVERRIDES: Array<{ title: string; season: number; episodeNumber: number }> = [
  { title: "From Russia Without Love", season: 30, episodeNumber: 6 }
];

function firstPositiveInteger(values: Array<string | number | undefined>): number {
  for (const value of values) {
    const parsed = Number(value ?? 0);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function addEpisode(lookup: Map<string, EpisodeRef>, title: string | undefined, season: number, episodeNumber: number): void {
  if (!title || season <= 0 || episodeNumber <= 0) return;
  const key = toEpisodeTitleKey(title);
  if (!key || lookup.has(key)) return;
  lookup.set(key, { season, episodeNumber });
}

function resolveEpisodesCsvPath(): string | null {
  const configured = (process.env.THSIMPSONS_EPISODES_CSV_URL ?? "").trim();
  if (configured.length > 0 && !/^https?:\/\//i.test(configured)) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }

  const localDefault = path.resolve(process.cwd(), ".data/thesimpsons/simpsons_episodes.csv");
  return existsSync(localDefault) ? localDefault : null;
}

function buildLookup(): Map<string, EpisodeRef> {
  const lookup = new Map<string, EpisodeRef>();

  for (const episode of sampleEpisodes) {
    addEpisode(lookup, episode.title, episode.season, episode.episodeNumber);
  }

  const csvPath = resolveEpisodesCsvPath();
  if (csvPath && existsSync(csvPath)) {
    const csv = readFileSync(csvPath, "utf8");
    const rows = parse(csv, {
      columns: true,
      skip_empty_lines: true
    }) as EpisodeCsvRow[];

    for (const row of rows) {
      const season = firstPositiveInteger([row.season]);
      const episodeNumber = firstPositiveInteger([row.number_in_season, row.episode_number, row.episode_num]);
      addEpisode(lookup, row.title, season, episodeNumber);
    }
  }

  for (const override of TITLE_OVERRIDES) {
    addEpisode(lookup, override.title, override.season, override.episodeNumber);
  }

  return lookup;
}

export function getEpisodeTitleLookup(): Map<string, EpisodeRef> {
  if (!cachedLookup) {
    cachedLookup = buildLookup();
  }

  return cachedLookup;
}

export function clearEpisodeTitleLookupCacheForTests(): void {
  cachedLookup = null;
}
