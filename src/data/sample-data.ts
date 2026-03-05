import type { Country, Episode, IngestionRun, Mention, Region } from "@/types/domain";
import { hashSnippet } from "@/lib/hash";

export const sampleCountries: Country[] = [
  { id: "c1", iso2: "US", name: "United States", mentionCount: 6, isRegionEnabled: true },
  { id: "c2", iso2: "JP", name: "Japan", mentionCount: 3, isRegionEnabled: false },
  { id: "c3", iso2: "GB", name: "United Kingdom", mentionCount: 2, isRegionEnabled: false },
  { id: "c4", iso2: "CA", name: "Canada", mentionCount: 2, isRegionEnabled: true },
  { id: "c5", iso2: "AU", name: "Australia", mentionCount: 2, isRegionEnabled: true },
  { id: "c6", iso2: "FR", name: "France", mentionCount: 2, isRegionEnabled: false },
  { id: "c7", iso2: "DE", name: "Germany", mentionCount: 1, isRegionEnabled: false },
  { id: "c8", iso2: "BR", name: "Brazil", mentionCount: 1, isRegionEnabled: true }
];

export const sampleRegions: Region[] = [
  { id: "r1", countryIso2: "US", code: "CA", name: "California", mentionCount: 2 },
  { id: "r2", countryIso2: "US", code: "NY", name: "New York", mentionCount: 1 },
  { id: "r3", countryIso2: "US", code: "IL", name: "Illinois", mentionCount: 2 },
  { id: "r4", countryIso2: "US", code: "UNKNOWN", name: "Unknown", mentionCount: 1 },
  { id: "r5", countryIso2: "CA", code: "ON", name: "Ontario", mentionCount: 1 },
  { id: "r6", countryIso2: "CA", code: "UNKNOWN", name: "Unknown", mentionCount: 1 }
];

export const sampleEpisodes: Episode[] = [
  { id: "e1", season: 5, episodeNumber: 14, title: "Lisa vs. Malibu Stacy", airDate: "1994-02-17" },
  { id: "e2", season: 7, episodeNumber: 23, title: "Much Apu About Nothing", airDate: "1996-05-05" },
  { id: "e3", season: 10, episodeNumber: 23, title: "Thirty Minutes over Tokyo", airDate: "1999-05-16" },
  { id: "e4", season: 15, episodeNumber: 4, title: "The Regina Monologues", airDate: "2003-11-23" },
  { id: "e5", season: 12, episodeNumber: 17, title: "Simpson Safari", airDate: "2001-04-01" },
  { id: "e6", season: 6, episodeNumber: 16, title: "Bart vs. Australia", airDate: "1995-02-19" },
  { id: "e7", season: 16, episodeNumber: 20, title: "Home Away from Homer", airDate: "2005-05-15" }
];

const mentionSeed: Omit<Mention, "normalizedSnippetHash">[] = [
  {
    id: "m1",
    countryIso2: "US",
    regionCode: "CA",
    episodeId: "e1",
    snippet: "Springfield gets compared with California trends.",
    confidence: 0.81,
    sourceUrl: "https://simpsons.fandom.com/wiki/United_States",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m2",
    countryIso2: "US",
    regionCode: "IL",
    episodeId: "e2",
    snippet: "A line references Illinois political debates in Springfield.",
    confidence: 0.77,
    sourceUrl: "https://simpsons.fandom.com/wiki/United_States",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m3",
    countryIso2: "JP",
    episodeId: "e3",
    snippet: "The whole family is stranded in Tokyo, Japan.",
    confidence: 0.95,
    sourceUrl: "https://simpsons.fandom.com/wiki/Japan",
    sourceType: "WIKI_PAGE",
    isImplied: false,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m4",
    countryIso2: "GB",
    episodeId: "e4",
    snippet: "They visit London in the United Kingdom for a royal trip.",
    confidence: 0.92,
    sourceUrl: "https://simpsons.fandom.com/wiki/United_Kingdom",
    sourceType: "REFERENCE_LINK",
    isImplied: false,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m5",
    countryIso2: "AU",
    regionCode: "NSW",
    episodeId: "e6",
    snippet: "Bart gets in trouble after a prank call reaches Australia.",
    confidence: 0.9,
    sourceUrl: "https://simpsons.fandom.com/wiki/Australia",
    sourceType: "WIKI_PAGE",
    isImplied: false,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m6",
    countryIso2: "CA",
    regionCode: "ON",
    episodeId: "e7",
    snippet: "A side gag references Toronto, Ontario during a travel montage.",
    confidence: 0.78,
    sourceUrl: "https://simpsons.fandom.com/wiki/Canada",
    sourceType: "REFERENCE_LINK",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m7",
    countryIso2: "FR",
    episodeId: "e2",
    snippet: "A character compares fancy cuisine to a Paris, France bistro.",
    confidence: 0.74,
    sourceUrl: "https://simpsons.fandom.com/wiki/France",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m8",
    countryIso2: "DE",
    episodeId: "e1",
    snippet: "A chalkboard line jokes about a German exchange student.",
    confidence: 0.7,
    sourceUrl: "https://simpsons.fandom.com/wiki/Germany",
    sourceType: "REFERENCE_LINK",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m9",
    countryIso2: "BR",
    regionCode: "SP",
    episodeId: "e5",
    snippet: "A carnival sequence makes a brief nod to Brazil.",
    confidence: 0.72,
    sourceUrl: "https://simpsons.fandom.com/wiki/Brazil",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m10",
    countryIso2: "US",
    regionCode: "NY",
    episodeId: "e7",
    snippet: "A New York callback appears in a quick travel gag.",
    confidence: 0.82,
    sourceUrl: "https://simpsons.fandom.com/wiki/United_States",
    sourceType: "REFERENCE_LINK",
    isImplied: false,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m11",
    countryIso2: "JP",
    episodeId: "e5",
    snippet: "A background sign references sushi from Tokyo, Japan.",
    confidence: 0.79,
    sourceUrl: "https://simpsons.fandom.com/wiki/Japan",
    sourceType: "REFERENCE_LINK",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m12",
    countryIso2: "GB",
    episodeId: "e3",
    snippet: "Homer imitates a British accent and mentions London.",
    confidence: 0.76,
    sourceUrl: "https://simpsons.fandom.com/wiki/United_Kingdom",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m13",
    countryIso2: "IN",
    regionCode: "MH",
    episodeId: "e2",
    snippet: "A throwaway line references Mumbai, Maharashtra in India.",
    confidence: 0.73,
    sourceUrl: "https://simpsons.fandom.com/wiki/India",
    sourceType: "REFERENCE_LINK",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m14",
    countryIso2: "CN",
    regionCode: "GD",
    episodeId: "e3",
    snippet: "A gag mentions Shenzhen in Guangdong, China.",
    confidence: 0.74,
    sourceUrl: "https://simpsons.fandom.com/wiki/China",
    sourceType: "REFERENCE_LINK",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    id: "m15",
    countryIso2: "RU",
    regionCode: "MOW",
    episodeId: "e4",
    snippet: "One joke compares a scene to downtown Moscow, Russia.",
    confidence: 0.72,
    sourceUrl: "https://simpsons.fandom.com/wiki/Russia",
    sourceType: "WIKI_PAGE",
    isImplied: true,
    publishedAt: "2026-03-01T00:00:00.000Z"
  }
];

export const sampleMentions: Mention[] = mentionSeed.map((mention) => ({
  ...mention,
  normalizedSnippetHash: hashSnippet(mention.snippet)
}));

export const sampleRuns: IngestionRun[] = [
  {
    id: "run1",
    startedAt: "2026-03-01T00:00:00.000Z",
    completedAt: "2026-03-01T00:12:00.000Z",
    status: "COMPLETED",
    pagesScanned: 42,
    mentionsExtracted: 80,
    mentionsPublished: 55
  }
];
