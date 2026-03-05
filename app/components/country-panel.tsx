"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Country, Mention, Region } from "@/types/domain";

interface CountryPanelProps {
  country?: Country;
  mentions: Mention[];
  regions: Region[];
  activeRegionCode?: string;
  showRegions: boolean;
  isMentionsLoading: boolean;
  isMentionsFetching: boolean;
  isRegionsLoading: boolean;
  onToggleRegions: () => void;
  onRegionSelect: (regionCode?: string) => void;
  searchQuery?: string;
}

function episodeLabel(episodeId: string): string {
  if (episodeId === "0-0") return "Unknown episode";
  const [season, episode] = episodeId.split("-");
  if (!season || !episode) return episodeId;
  return `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`;
}

export function CountryPanel({
  country,
  mentions,
  regions,
  activeRegionCode,
  showRegions,
  isMentionsLoading,
  isMentionsFetching,
  isRegionsLoading,
  onToggleRegions,
  onRegionSelect,
  searchQuery
}: CountryPanelProps) {
  const [trendOpen, setTrendOpen] = useState(true);
  const trendRows = useMemo(
    () =>
      Object.entries(
        mentions
          .filter((mention) => mention.episodeId !== "0-0")
          .reduce<Record<string, number>>((acc, mention) => {
            const season = mention.episodeId.split("-")[0] ?? "0";
            acc[season] = (acc[season] ?? 0) + 1;
            return acc;
          }, {})
      ).sort((a, b) => Number(a[0]) - Number(b[0])),
    [mentions]
  );
  const mentionGroups = useMemo(() => {
    const grouped = new Map<string, Map<string, Mention>>();

    for (const mention of mentions) {
      const isGenericUnknownWikiSnippet =
        mention.episodeId === "0-0" &&
        mention.sourceType === "WIKI_PAGE" &&
        !/(?:\bS\d{1,2}E\d{1,2}\b|episode\s*[-:])/i.test(mention.snippet);
      if (isGenericUnknownWikiSnippet) continue;

      const episodeGroup = grouped.get(mention.episodeId) ?? new Map<string, Mention>();
      const dedupeKey = mention.normalizedSnippetHash || mention.snippet.trim().toLowerCase();
      const existing = episodeGroup.get(dedupeKey);
      if (!existing || mention.confidence > existing.confidence) {
        episodeGroup.set(dedupeKey, mention);
      }
      grouped.set(mention.episodeId, episodeGroup);
    }

    return Array.from(grouped.entries())
      .map(([episodeId, bySnippet]) => ({
        episodeId,
        mentions: Array.from(bySnippet.values()).sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
      }))
      .sort((a, b) => compareEpisodeIds(a.episodeId, b.episodeId));
  }, [mentions]);

  if (!country) {
    return (
      <Card className="h-full">
        <CardContent className="grid h-full place-content-center gap-2 text-center">
          <h2 className="text-2xl font-black">Pick a country</h2>
          <p className="max-w-xs text-sm text-slate-600">Click any highlighted country on the map to load mentions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="donut-sprinkle-bg h-full overflow-hidden">
      <CardHeader className="space-y-3 border-b-2 border-slate-200 bg-gradient-to-r from-yellow-200 via-yellow-100 to-orange-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{country.name}</CardTitle>
            {country.isUnknownOrFictional && <p className="text-xs font-bold uppercase text-slate-600">Unknown/Fictional places bucket</p>}
          </div>
          <Badge>{country.mentionCount} mentions</Badge>
        </div>
        {isMentionsFetching && !isMentionsLoading && (
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Updating mentions...</p>
        )}

        {country.isRegionEnabled && (
          <Button variant="outline" className="w-full" onClick={onToggleRegions}>
            {showRegions ? "Show country view" : "View regions"}
          </Button>
        )}
      </CardHeader>

      <CardContent className="grid max-h-[610px] gap-5 overflow-y-auto py-4">
        {showRegions && isRegionsLoading && (
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Region breakdown</h3>
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
              <div className="h-10 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
              <div className="h-10 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
            </div>
          </section>
        )}

        {showRegions && !isRegionsLoading && regions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Region breakdown</h3>
            <button
              type="button"
              className={`w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-bold ${
                !activeRegionCode ? "border-simpson-ink bg-sky-100 text-slate-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => onRegionSelect(undefined)}
            >
              All regions
            </button>
            <ul className="grid gap-2">
              {regions.map((region) => (
                <li key={region.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-sm ${
                      activeRegionCode === region.code
                        ? "border-simpson-ink bg-sky-100 text-slate-900"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => onRegionSelect(region.code)}
                  >
                    <span>{region.name}</span>
                    <strong>{region.mentionCount}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <button
            className="flex w-full items-center justify-between rounded-xl border-2 border-simpson-ink bg-white px-3 py-2 text-left text-sm font-black uppercase tracking-wide text-slate-700"
            onClick={() => setTrendOpen((value) => !value)}
          >
            <span>Season trend</span>
            <span>{trendOpen ? "Hide" : "Show"}</span>
          </button>
          {trendOpen && (
            <div className="grid gap-2">
              {isMentionsLoading && (
                <>
                  <div className="h-4 animate-pulse rounded bg-white/80" />
                  <div className="h-4 animate-pulse rounded bg-white/80" />
                  <div className="h-4 animate-pulse rounded bg-white/80" />
                </>
              )}
              {trendRows.map(([season, count]) => (
                <div key={season} className="grid grid-cols-[58px_1fr_24px] items-center gap-2 text-sm">
                  <span className="font-semibold">S{season.padStart(2, "0")}</span>
                  <div className="h-3 overflow-hidden rounded-full border-2 border-simpson-ink bg-white">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-orange-400"
                      style={{ width: `${Math.min(100, count * 22)}%` }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Mentions</h3>
          {isMentionsLoading ? (
            <div className="grid gap-2">
              <div className="h-28 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
              <div className="h-28 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
              <div className="h-28 animate-pulse rounded-xl border-2 border-simpson-ink bg-white" />
            </div>
          ) : mentionGroups.length === 0 ? (
            <p className="rounded-xl border-2 border-simpson-ink bg-white p-3 text-sm text-slate-700">No episode-linked mentions match the current filters.</p>
          ) : (
            <ul className="grid gap-2">
              {mentionGroups.map((group) => (
                <li key={group.episodeId} className="rounded-xl border-2 border-simpson-ink bg-white p-3">
                  <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700">
                    <span>{episodeLabel(group.episodeId)}</span>
                    <Badge className="text-[10px]">{group.mentions.length} entries</Badge>
                  </div>
                  <ul className="grid gap-3">
                    {group.mentions.map((mention) => (
                      <li key={mention.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="mb-2 flex items-center justify-end">
                          <Badge className="text-[10px]">{Math.round(mention.confidence * 100)}%</Badge>
                        </div>
                        <p className="mb-2 text-sm leading-relaxed text-slate-700">{renderHighlightedSnippet(mention.snippet, searchQuery)}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <a className="text-xs font-bold text-sky-700 hover:underline" href={resolveSourceUrl(mention)} target="_blank" rel="noreferrer">
                            Source
                          </a>
                          <a
                            className="text-xs font-bold text-fuchsia-700 hover:underline"
                            href={`https://frinkiac.com/?q=${encodeURIComponent(mention.snippet)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Frinkiac
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function compareEpisodeIds(left: string, right: string): number {
  if (left === "0-0" && right !== "0-0") return 1;
  if (right === "0-0" && left !== "0-0") return -1;
  const [leftSeason = "0", leftEpisode = "0"] = left.split("-");
  const [rightSeason = "0", rightEpisode = "0"] = right.split("-");
  const seasonDiff = Number(rightSeason) - Number(leftSeason);
  if (seasonDiff !== 0) return seasonDiff;
  return Number(rightEpisode) - Number(leftEpisode);
}

function renderHighlightedSnippet(snippet: string, searchQuery: string | undefined) {
  const query = (searchQuery ?? "").trim();
  if (query.length < 2) return snippet;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = snippet.split(regex);
  if (parts.length <= 1) return snippet;
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function resolveSourceUrl(mention: Mention): string {
  if (
    mention.sourceType === "REFERENCE_LINK" &&
    (mention.sourceUrl.includes("simpsons_script_lines.csv") ||
      mention.sourceUrl.includes(".data/thesimpsons") ||
      mention.sourceUrl.includes("github.com/jcrodriguez1989/thesimpsons"))
  ) {
    return "https://github.com/jcrodriguez1989/thesimpsons";
  }
  return mention.sourceUrl;
}
