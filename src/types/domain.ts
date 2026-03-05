export type SourceType = "WIKI_PAGE" | "REFERENCE_LINK";
export type IngestionStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface Country {
  id: string;
  iso2: string;
  name: string;
  mentionCount: number;
  isRegionEnabled: boolean;
  sourceMix?: {
    wikiPage: number;
    referenceLink: number;
  };
  lowConfidenceCount?: number;
  unknownEpisodeCount?: number;
  keywordHitCount?: number;
  isUnknownOrFictional?: boolean;
}

export interface Region {
  id: string;
  countryIso2: string;
  code: string;
  name: string;
  mentionCount: number;
}

export interface Episode {
  id: string;
  season: number;
  episodeNumber: number;
  productionCode?: string;
  title: string;
  airDate?: string;
}

export interface Mention {
  id: string;
  countryIso2: string;
  regionCode?: string;
  episodeId: string;
  snippet: string;
  confidence: number;
  sourceUrl: string;
  sourceType: SourceType;
  isImplied: boolean;
  publishedAt?: string;
  normalizedSnippetHash: string;
}

export interface IngestionRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: IngestionStatus;
  pagesScanned: number;
  mentionsExtracted: number;
  mentionsPublished: number;
  errorMessage?: string;
}

export interface MentionFilters {
  country?: string;
  region?: string;
  seasonFrom?: number;
  seasonTo?: number;
  q?: string;
  confidence?: "high" | "medium" | "low";
  sourceType?: SourceType;
  sort?: "mentions_desc" | "name_asc";
  cursor?: string;
  limit?: number;
}

export interface UnknownPlace {
  iso2: string;
  name: string;
  mentionCount: number;
}
