# How It Works

This document explains how the app functions internally: UI data flow, API behavior, ingestion, persistence, and extension points.

## 1. Runtime Architecture

The app currently uses a local runtime store backed by JSON.

- `app/page.tsx` is the primary client surface.
- API routes in `app/api/**` call a datastore singleton from `src/server/data-store.ts`.
- The datastore hydrates from sample data + persisted state in `.data/runtime-store.json`.
- Ingestion (`src/server/ingestion-service.ts`) writes new mentions/runs into that datastore.

### Key point

Prisma schema exists (`prisma/schema.prisma`) for future DB persistence, but active runtime reads/writes are handled by the in-memory + JSON datastore.

## 2. Frontend Data Flow

Main UI container: `app/page.tsx`

### Queries

- Countries query:
  - `GET /api/countries?q=&seasonFrom=&seasonTo=&sort=`
- Mentions query (enabled once country selected):
  - `GET /api/mentions?country=&seasonFrom=&seasonTo=&q=&confidence=&sourceType=&region=&limit=50`
- Regions query (only when selected country is region-enabled):
  - `GET /api/countries/:iso2/regions`
- Debug panels:
  - `GET /api/admin/unknown-wiki`
  - `GET /api/admin/unknown-places`

### State interactions

- `selectedIso2` drives mention/region fetches.
- `showRegions` toggles map layer + panel mode.
- `selectedRegionCode` adds a region filter to mentions.
- Shared filters (`search`, `seasonFrom`, `seasonTo`, `confidence`, `sourceType`) are reflected in API query params.

### Rendering components

- `app/components/map-canvas.tsx`
  - Renders SVG world map via D3 projection.
  - Colors countries/regions by mention count buckets.
  - Loads region GeoJSON dynamically from `/geo/regions/{iso2}.geojson`.
- `app/components/country-panel.tsx`
  - Groups mentions by `episodeId`.
  - Dedupes by `normalizedSnippetHash` per episode group.
  - Displays trend chart by season and source/frinkiac links.

## 3. API Contracts

Query parsing and validation use Zod in `src/lib/api.ts`.

### `GET /api/countries`

- Returns country summary rows with mention counts and debug metrics.
- Supports:
  - `q`: country name/iso or snippet text search basis
  - `seasonFrom`, `seasonTo`
  - `sort`: `mentions_desc | name_asc`

### `GET /api/countries/:iso2`

- Returns `{ country, mentions }` for a country.
- Applies mention filters from the same schema as `/api/mentions`.

### `GET /api/countries/:iso2/regions`

- Only enabled for `REGION_ALLOWLIST` countries.
- Returns 404 for countries outside allowlist.

### `GET /api/mentions`

Filters:
- `country`, `region`
- `seasonFrom`, `seasonTo`
- `q` (supports episode code search like `S05E14`)
- `confidence`: `high | medium | low`
- `sourceType`: `WIKI_PAGE | REFERENCE_LINK`
- `cursor`, `limit`

### Admin/debug routes

- `/api/admin/unknown-wiki`
  - Unknown episode wiki mentions (`episodeId = "0-0"`) with paging.
- `/api/admin/unknown-places`
  - Mentions whose `countryIso2` is not recognized, grouped as unknown/fantasy places.

### Ingestion routes

- `POST /api/ingestion/run`
  - Requires header: `x-admin-token` matching `INGESTION_ADMIN_TOKEN`.
  - Executes full ingestion run and returns accepted run result.
- `GET /api/ingestion/runs/:id`
  - Fetches run status/metrics.

## 4. Datastore Behavior

Implementation: `src/server/data-store.ts`

### Initialization

On first access:
- Loads persisted state from `.data/runtime-store.json` if available.
- Falls back to sample mentions/runs if absent or unreadable.
- Merges sample mentions with persisted mentions, deduping by:
  - `countryIso2 + episodeId + normalizedSnippetHash + sourceUrl`

### Country derivation

Countries shown in UI are derived from mention aggregates:
- Mention count
- Source mix (`WIKI_PAGE` vs `REFERENCE_LINK`)
- Low confidence count (`confidence < 0.75`)
- Unknown episode count (`episodeId = "0-0"`)
- Unknown/fantasy marker (unrecognized ISO)

### Region derivation

For a selected country:
- Region count is derived from mention `regionCode`.
- If `regionCode` is missing and country is region-enabled, region code is inferred from snippet text using `inferRegionCode`.

### Mention filtering

`filterMentions()` applies:
- Country and region
- Source type
- Confidence bucket
- Search query (`snippet` contains query or episode-code match)
- Season range via linked episode data where known

## 5. Ingestion Pipeline

Orchestrator: `src/server/ingestion-service.ts`

### Sources

1. Fandom source (`src/lib/ingestion/scrape-fandom.ts`)
- Discovers pages in `Category:Countries` via MediaWiki API.
- Maps page titles to ISO2 using `inferIso2FromTitle`.
- Unresolved titles are bucketed to `ZZ`.
- Parses page HTML and extracts candidate snippets from `<li>` and `<p>`.
- Keeps snippets that pass Simpsons relevance checks.
- Parses episode references from snippet text or title lookup.

2. Dataset source (`src/lib/ingestion/scrape-thesimpsons.ts`)
- Optional, enabled only when `THSIMPSONS_SCRIPT_LINES_CSV_URL` is set.
- Reads CSV from local file path or HTTP URL.
- Matches country tokens with regex over script lines.
- Attempts episode resolution from row fields, episode lookup CSV, then inline code parsing.

### Confidence and publication

Mention confidence is scored by `scoreMentionConfidence()` (`src/lib/confidence.ts`) using:
- Explicit country token presence
- Episode citation presence
- Source structuredness
- Corroboration count
- Implied-mention penalty

Only mentions with confidence `>= CONFIDENCE_PUBLISH_THRESHOLD` are published/upserted.

### Post-processing

After merging source mentions:
- Unknown episodes are enriched by matching snippet hashes against known episode mentions.
- Remaining unknowns are reparsed for episode references.
- Upsert dedupe runs before save.
- Backfill is rerun against full store for legacy unknowns.

### Run metrics

Each run tracks:
- `pagesScanned`
- `mentionsExtracted`
- `mentionsPublished`
- `status` (`RUNNING | COMPLETED | FAILED`)
- optional `errorMessage`

## 6. Region Drill-Down Mechanics

Allowlist in `src/config/region-allowlist.ts`:
- `US`, `CA`, `AU`, `IN`, `CN`, `BR`, `RU`

For allowlisted countries:
- UI can toggle into region mode.
- Region geometry is loaded from `public/geo/regions/{iso2}.geojson`.
- Region counts come from mention `regionCode` (original or inferred).

If no region geometry file exists, the UI falls back gracefully by not rendering region layer.

## 7. Domain Model

Types live in `src/types/domain.ts`.

Core entities:
- `Country`
- `Region`
- `Episode`
- `Mention`
- `IngestionRun`

Prisma equivalents are defined in `prisma/schema.prisma` with similar structure and unique constraints, especially the mention dedupe composite unique key.

## 8. Important Environment Variables

- `INGESTION_ADMIN_TOKEN`
  - Required for API-triggered ingestion.
- `CONFIDENCE_PUBLISH_THRESHOLD`
  - Controls publish cutoff (default `0.55`).
- `THSIMPSONS_SCRIPT_LINES_CSV_URL`
  - Enables dataset ingestion when set.
- `THSIMPSONS_EPISODES_CSV_URL`
  - Optional episode lookup for resolving dataset episode IDs.
- `DATABASE_URL`
  - Needed for Prisma workflows, not currently used by runtime datastore handlers.

## 9. Testing Strategy

- Unit tests: pure logic modules (`tests/unit/*`)
- Integration tests: API route behavior (`tests/integration/*`)
- E2E tests: end-user map flow (`tests/e2e/*`)

Recommended checks before merge:

```bash
npm test
npm run test:e2e
```

## 10. Known Constraints and Future Work

- Runtime persistence is local JSON, not multi-user safe.
- Ingestion source quality can vary; low-confidence and unknown-episode tooling is intentionally exposed in UI/debug routes.
- Prisma models are ready, but route handlers/datastore are not yet migrated to DB-backed storage.
- Region inference is heuristic and driven by text token matching.

A production migration path is:
1. Introduce a Prisma-backed datastore implementation.
2. Keep existing `DataStore` interface and swap implementation via env/config.
3. Add ingestion job queue + persisted logs.
4. Add auth/rate limiting around admin ingestion endpoints.
