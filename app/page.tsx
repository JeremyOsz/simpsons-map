"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Search } from "lucide-react";
import { MapCanvas } from "@app/components/map-canvas";
import { CountryPanel } from "@app/components/country-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Country, Mention, Region, UnknownPlace } from "@/types/domain";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export default function HomePage() {
  const [selectedIso2, setSelectedIso2] = useState<string>();
  const [search, setSearch] = useState("");
  const [seasonFrom, setSeasonFrom] = useState(1);
  const [seasonTo, setSeasonTo] = useState(36);
  const [confidence, setConfidence] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [showRegions, setShowRegions] = useState(false);
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>();
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [countrySort, setCountrySort] = useState<"mentions_desc" | "name_asc">("mentions_desc");
  const [debugLowConfidenceOnly, setDebugLowConfidenceOnly] = useState(false);
  const [debugUnknownEpisodeOnly, setDebugUnknownEpisodeOnly] = useState(false);
  const [debugReferenceOnly, setDebugReferenceOnly] = useState(false);

  const countriesQueryString = useMemo(() => {
    const params = new URLSearchParams({
      q: search,
      seasonFrom: String(seasonFrom),
      seasonTo: String(seasonTo),
      sort: countrySort
    });
    return params.toString();
  }, [search, seasonFrom, seasonTo, countrySort]);

  const countriesQuery = useQuery<{ data: Country[] }>({
    queryKey: ["countries", countriesQueryString],
    queryFn: () => fetchJson(`/api/countries?${countriesQueryString}`)
  });
  const isCountriesLoading = countriesQuery.isPending;
  const isCountriesRefreshing = countriesQuery.isFetching && !countriesQuery.isPending;

  const selectedCountry = useMemo(
    () => countriesQuery.data?.data.find((country) => country.iso2 === selectedIso2),
    [countriesQuery.data, selectedIso2]
  );

  useEffect(() => {
    if (selectedCountry && !selectedCountry.isRegionEnabled && showRegions) {
      setShowRegions(false);
    }
  }, [selectedCountry, showRegions]);

  useEffect(() => {
    setSelectedRegionCode(undefined);
  }, [selectedIso2]);

  useEffect(() => {
    if (!showRegions) {
      setSelectedRegionCode(undefined);
    }
  }, [showRegions]);

  const mentionsQueryString = useMemo(() => {
    if (!selectedIso2) return "";
    const params = new URLSearchParams({
      country: selectedIso2,
      seasonFrom: String(seasonFrom),
      seasonTo: String(seasonTo),
      q: search,
      limit: "50"
    });
    if (showRegions && selectedRegionCode) params.set("region", selectedRegionCode);
    if (confidence !== "all") params.set("confidence", confidence);
    if (sourceType !== "all") params.set("sourceType", sourceType);
    return params.toString();
  }, [selectedIso2, seasonFrom, seasonTo, search, confidence, sourceType, showRegions, selectedRegionCode]);

  const mentionsQuery = useQuery<{ data: { items: Mention[] } }>({
    queryKey: ["mentions", mentionsQueryString],
    queryFn: () => fetchJson(`/api/mentions?${mentionsQueryString}`),
    enabled: Boolean(selectedIso2)
  });
  const isMentionsLoading = mentionsQuery.isPending;
  const isMentionsRefreshing = mentionsQuery.isFetching && !mentionsQuery.isPending;

  const regionsQuery = useQuery<{ data: Region[] }>({
    queryKey: ["regions", selectedIso2],
    queryFn: () => fetchJson(`/api/countries/${selectedIso2}/regions`),
    enabled: Boolean(selectedIso2 && selectedCountry?.isRegionEnabled)
  });
  const isRegionsLoading = regionsQuery.isPending;
  const unknownWikiQuery = useQuery<{ data: { items: Mention[]; nextCursor?: string } }>({
    queryKey: ["unknown-wiki", search],
    queryFn: () => fetchJson(`/api/admin/unknown-wiki?${new URLSearchParams({ q: search, limit: "20" }).toString()}`)
  });
  const unknownPlacesQueryString = useMemo(() => {
    const params = new URLSearchParams({
      q: search,
      seasonFrom: String(seasonFrom),
      seasonTo: String(seasonTo)
    });
    return params.toString();
  }, [search, seasonFrom, seasonTo]);
  const unknownPlacesQuery = useQuery<{ data: { items: UnknownPlace[] } }>({
    queryKey: ["unknown-places", unknownPlacesQueryString],
    queryFn: () => fetchJson(`/api/admin/unknown-places?${unknownPlacesQueryString}`)
  });

  const countryRows = useMemo(() => {
    const countries = countriesQuery.data?.data ?? [];
    return countries.filter((country) => {
      if (debugLowConfidenceOnly && (country.lowConfidenceCount ?? 0) === 0) return false;
      if (debugUnknownEpisodeOnly && (country.unknownEpisodeCount ?? 0) === 0) return false;
      if (debugReferenceOnly && (country.sourceMix?.referenceLink ?? 0) === 0) return false;
      return true;
    });
  }, [countriesQuery.data, debugLowConfidenceOnly, debugUnknownEpisodeOnly, debugReferenceOnly]);
  const mappableRows = useMemo(() => countryRows.filter((country) => !country.isUnknownOrFictional), [countryRows]);
  const unknownRows = useMemo(() => countryRows.filter((country) => country.isUnknownOrFictional), [countryRows]);

  return (
    <main className="mx-auto grid min-h-screen max-w-[1500px] grid-rows-[auto_auto_1fr] gap-4 px-4 py-5 md:px-6">
      <Card className="simpson-header">
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-simpson-ink md:text-4xl">Simpsons Country Mentions Explorer</h1>
            <p className="mt-1 text-sm font-semibold text-slate-700">Track where the world pops up across Springfield stories.</p>
          </div>
          <div className="donut-ring hidden rounded-xl bg-white/90 p-2 md:block">
            <Globe2 className="h-8 w-8 text-simpson-ink" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="search"
                className="pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Country, quote, or S05E14"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="season-from">Season from</Label>
            <Input
              id="season-from"
              type="number"
              value={seasonFrom}
              min={1}
              max={36}
              onChange={(event) => setSeasonFrom(Number(event.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="season-to">Season to</Label>
            <Input
              id="season-to"
              type="number"
              value={seasonTo}
              min={1}
              max={36}
              onChange={(event) => setSeasonTo(Number(event.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confidence">Confidence</Label>
            <Select id="confidence" value={confidence} onChange={(event) => setConfidence(event.target.value)}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="source">Source</Label>
            <Select id="source" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="all">All sources</option>
              <option value="WIKI_PAGE">Wiki page</option>
              <option value="REFERENCE_LINK">Reference link</option>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-5">
            <Label>View</Label>
            <div className="inline-flex rounded-xl border-2 border-simpson-ink bg-white p-1 shadow-cartoon mx-2">
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-black ${viewMode === "map" ? "bg-sky-300" : "bg-transparent"}`}
                onClick={() => setViewMode("map")}
              >
                Map
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-black ${viewMode === "list" ? "bg-sky-300" : "bg-transparent"}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid min-h-0 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {viewMode === "map" ? (
            <>
              <MapCanvas
                countries={countriesQuery.data?.data ?? []}
                regions={regionsQuery.data?.data ?? []}
                activeIso2={selectedIso2}
                activeRegionCode={selectedRegionCode}
                showRegions={showRegions}
                onCountrySelect={setSelectedIso2}
                onRegionSelect={setSelectedRegionCode}
              />
              {isCountriesLoading && (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
                  </CardContent>
                </Card>
              )}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 border-b-2 border-slate-200 bg-yellow-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700">
                    <span>Unknown/Fictional places ({(unknownPlacesQuery.data?.data.items ?? []).length})</span>
                    {(unknownPlacesQuery.isFetching || isCountriesRefreshing) && <span className="text-[10px] text-slate-600">Updating...</span>}
                  </div>
                  {unknownPlacesQuery.isPending ? (
                    <div className="space-y-2 px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </div>
                  ) : (unknownPlacesQuery.data?.data.items ?? []).length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-600">No unknown or fictional countries match the current filters.</p>
                  ) : (
                    <ul className="max-h-48 overflow-auto divide-y divide-slate-200 text-sm">
                      {(unknownPlacesQuery.data?.data.items ?? []).map((place) => (
                        <li key={`${place.iso2}-${place.name}`}>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between px-4 py-2 text-left hover:bg-sky-50 ${
                              selectedIso2 === place.iso2 ? "bg-sky-100" : ""
                            }`}
                            onClick={() => setSelectedIso2(place.iso2)}
                          >
                            <span className="font-semibold">{place.name}</span>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-600">{place.mentionCount} mentions</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-[620px] overflow-hidden">
              <CardContent className="h-full overflow-auto p-0">
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b-2 border-slate-200 bg-white px-3 py-2">
                  <Select value={countrySort} onChange={(event) => setCountrySort(event.target.value as "mentions_desc" | "name_asc")} className="h-8 w-44 text-xs">
                    <option value="mentions_desc">Sort: Mentions desc</option>
                    <option value="name_asc">Sort: Name A-Z</option>
                  </Select>
                  <button
                    className={`rounded-lg border-2 border-simpson-ink px-2 py-1 text-xs font-bold ${debugLowConfidenceOnly ? "bg-yellow-200" : "bg-white"}`}
                    onClick={() => setDebugLowConfidenceOnly((value) => !value)}
                  >
                    Low confidence only
                  </button>
                  <button
                    className={`rounded-lg border-2 border-simpson-ink px-2 py-1 text-xs font-bold ${debugUnknownEpisodeOnly ? "bg-yellow-200" : "bg-white"}`}
                    onClick={() => setDebugUnknownEpisodeOnly((value) => !value)}
                  >
                    Unknown episode only
                  </button>
                  <button
                    className={`rounded-lg border-2 border-simpson-ink px-2 py-1 text-xs font-bold ${debugReferenceOnly ? "bg-yellow-200" : "bg-white"}`}
                    onClick={() => setDebugReferenceOnly((value) => !value)}
                  >
                    Reference source only
                  </button>
                  {isCountriesRefreshing && <span className="ml-auto text-xs font-bold uppercase text-slate-600">Refreshing...</span>}
                </div>
                {isCountriesLoading ? (
                  <div className="space-y-2 p-4">
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                  <thead className="sticky top-11 bg-yellow-100">
                    <tr>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Country</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">ISO</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Mentions</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Keyword hits</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Source mix</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Low conf.</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Unknown ep.</th>
                      <th className="border-b-2 border-slate-200 px-4 py-2 font-black">Regions</th>
                    </tr>
                  </thead>
                    <tbody>
                    {mappableRows.map((country) => (
                      <tr
                        key={country.id}
                        onClick={() => {
                          setSelectedIso2(country.iso2);
                          setViewMode("map");
                        }}
                        className={`cursor-pointer border-b border-slate-200 hover:bg-sky-50 ${
                          selectedIso2 === country.iso2 ? "bg-sky-100" : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-semibold">{country.name}</td>
                        <td className="px-4 py-2">{country.iso2}</td>
                        <td className="px-4 py-2 font-bold">{country.mentionCount}</td>
                        <td className="px-4 py-2">{country.keywordHitCount ?? 0}</td>
                        <td className="px-4 py-2 text-xs">
                          W:{country.sourceMix?.wikiPage ?? 0} / R:{country.sourceMix?.referenceLink ?? 0}
                        </td>
                        <td className="px-4 py-2">{country.lowConfidenceCount ?? 0}</td>
                        <td className="px-4 py-2">{country.unknownEpisodeCount ?? 0}</td>
                        <td className="px-4 py-2">{country.isRegionEnabled ? "Enabled" : "-"}</td>
                      </tr>
                    ))}
                    {unknownRows.length > 0 && (
                      <tr className="bg-yellow-50">
                        <td colSpan={8} className="px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700">
                          Unknown/Fictional places
                        </td>
                      </tr>
                    )}
                    {unknownRows.map((country) => (
                      <tr
                        key={country.id}
                        onClick={() => {
                          setSelectedIso2(country.iso2);
                          setViewMode("map");
                        }}
                        className={`cursor-pointer border-b border-slate-200 hover:bg-sky-50 ${
                          selectedIso2 === country.iso2 ? "bg-sky-100" : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-semibold">{country.name}</td>
                        <td className="px-4 py-2">{country.iso2}</td>
                        <td className="px-4 py-2 font-bold">{country.mentionCount}</td>
                        <td className="px-4 py-2">{country.keywordHitCount ?? 0}</td>
                        <td className="px-4 py-2 text-xs">
                          W:{country.sourceMix?.wikiPage ?? 0} / R:{country.sourceMix?.referenceLink ?? 0}
                        </td>
                        <td className="px-4 py-2">{country.lowConfidenceCount ?? 0}</td>
                        <td className="px-4 py-2">{country.unknownEpisodeCount ?? 0}</td>
                        <td className="px-4 py-2">{country.isRegionEnabled ? "Enabled" : "-"}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
          {viewMode === "list" && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2 border-b-2 border-slate-200 bg-yellow-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700">
                  <span>Unknown wiki mentions (debug): {(unknownWikiQuery.data?.data.items ?? []).length}</span>
                  {unknownWikiQuery.isFetching && <span className="text-[10px] text-slate-600">Updating...</span>}
                </div>
                {unknownWikiQuery.isPending ? (
                  <div className="space-y-2 p-4">
                    <div className="h-9 animate-pulse rounded bg-slate-100" />
                    <div className="h-9 animate-pulse rounded bg-slate-100" />
                    <div className="h-9 animate-pulse rounded bg-slate-100" />
                  </div>
                ) : (
                  <ul className="max-h-48 overflow-auto divide-y divide-slate-200 text-xs">
                    {(unknownWikiQuery.data?.data.items ?? []).map((mention) => (
                      <li key={mention.id} className="px-4 py-2">
                        <div className="mb-1 font-bold">{mention.countryIso2}</div>
                        <div className="line-clamp-2 text-slate-700">{mention.snippet}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <CountryPanel
          country={selectedCountry}
          mentions={mentionsQuery.data?.data.items ?? []}
          regions={regionsQuery.data?.data ?? []}
          activeRegionCode={selectedRegionCode}
          showRegions={showRegions}
          isMentionsLoading={isMentionsLoading}
          isMentionsFetching={isMentionsRefreshing}
          isRegionsLoading={isRegionsLoading}
          onToggleRegions={() => setShowRegions((value) => !value)}
          onRegionSelect={setSelectedRegionCode}
          searchQuery={search}
        />
      </section>
    </main>
  );
}
