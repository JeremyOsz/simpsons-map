# Simpsons Country Mentions Explorer

A Next.js + TypeScript app that maps country mentions across *The Simpsons* and shows supporting snippets by episode.

It includes:
- A world map + region drill-down UI
- Search/filterable mention evidence
- Local in-memory datastore with JSON persistence
- Ingestion pipelines (Fandom + optional `thesimpsons` CSVs)
- API routes for UI and admin/debug workflows

## 1. What This Project Does

The app builds a country-mention dataset from source text and lets you explore it in two ways:
- `Map` view: countries colored by mention count, optional region-level view for allowlisted countries
- `List` view: sortable country table + unknown/fictional place bucket

When you pick a country, the side panel shows:
- Mention groups by episode
- Confidence scores
- Snippets with source links
- Season trend counts

## 2. Tech Stack

- Next.js App Router + React 19 + TypeScript
- TanStack Query (client-side data fetching/caching)
- D3 geo + `geojson-world-map` (SVG map rendering)
- Tailwind CSS
- Zod for API query validation
- Vitest (unit/integration) + Playwright (E2E)
- Prisma schema included for PostgreSQL production modeling

## 3. Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Configure env

```bash
cp .env.example .env.local
```

Default env variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simpsons_map?schema=public"
INGESTION_ADMIN_TOKEN="change-me"
CONFIDENCE_PUBLISH_THRESHOLD="0.55"
THSIMPSONS_SCRIPT_LINES_CSV_URL=""
THSIMPSONS_EPISODES_CSV_URL=""
```

### Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Development Commands

```bash
npm run dev              # start Next.js dev server
npm run build            # production build
npm run start            # run built app
npm run lint             # lint
npm test                 # vitest run
npm run test:coverage    # vitest with coverage
npm run test:e2e         # playwright tests
npm run ingest           # run ingestion pipeline once
npm run seed             # print sample dataset counts
npm run export:thesimpsons  # export local CSVs via R (optional)
```

## 5. Data and Persistence

Runtime data is managed by [`src/server/data-store.ts`](src/server/data-store.ts):

- Starts from sample data in [`src/data/sample-data.ts`](src/data/sample-data.ts)
- Merges in persisted runtime records from `.data/runtime-store.json`
- Persists updated mentions + ingestion runs back to `.data/runtime-store.json`

Current runtime store behavior:
- Countries/regions/episodes are derived from in-memory sample structures
- Mentions + runs are extended by ingestion output
- Mention dedupe key is:
  - `(countryIso2, episodeId, normalizedSnippetHash, sourceUrl)`

## 6. Ingestion Overview

Ingestion entrypoints:
- API: `POST /api/ingestion/run` (requires `x-admin-token`)
- Script: `npm run ingest`

Pipeline (see [`src/server/ingestion-service.ts`](src/server/ingestion-service.ts)):
1. Run source scrapers in parallel:
   - Fandom scraper: [`src/lib/ingestion/scrape-fandom.ts`](src/lib/ingestion/scrape-fandom.ts)
   - Optional CSV scraper: [`src/lib/ingestion/scrape-thesimpsons.ts`](src/lib/ingestion/scrape-thesimpsons.ts)
2. Merge mentions
3. Try to enrich unknown episodes (`episodeId = "0-0"`) from hash matches and episode parsing
4. Keep only mentions at/above `CONFIDENCE_PUBLISH_THRESHOLD` (default `0.55`)
5. Upsert into runtime store with dedupe
6. Run backfill for unresolved episodes and mark run complete/failed

### Optional `thesimpsons` CSV inputs

Set env vars to local file paths or HTTP URLs:
- `THSIMPSONS_SCRIPT_LINES_CSV_URL`
- `THSIMPSONS_EPISODES_CSV_URL`

If unset, dataset ingestion is skipped.

## 7. API Summary

### Main API

- `GET /api/countries`
  - Query: `q`, `seasonFrom`, `seasonTo`, `sort`
- `GET /api/countries/:iso2`
  - Returns selected country + mentions for that country
- `GET /api/countries/:iso2/regions`
  - Region breakdown for allowlisted countries only
- `GET /api/mentions`
  - Query: `country`, `region`, `seasonFrom`, `seasonTo`, `q`, `confidence`, `sourceType`, `cursor`, `limit`
- `GET /api/episodes/:id`
- `POST /api/ingestion/run`
  - Header: `x-admin-token`
- `GET /api/ingestion/runs/:id`

### Admin/debug API

- `GET /api/admin/unknown-wiki`
- `GET /api/admin/unknown-places`

For full route behavior and examples, see [`docs/how-it-works.md`](docs/how-it-works.md).

## 8. Testing

- Unit tests: parsers, confidence scoring, country mapping, hashing, region mapping, and ingestion helpers
- Integration tests: API route behavior
- E2E tests: map flow and UI interactions

Run:

```bash
npm test
npm run test:e2e
```

## 9. Project Structure

```text
app/
  api/                   # route handlers
  components/            # map + panel UI components
src/
  data/                  # sample bootstrap data
  lib/                   # parsing, scoring, mapping, ingestion helpers
  server/                # datastore + ingestion orchestration
  types/                 # domain types
public/geo/
  countries.geojson
  regions/*.geojson      # region geometry for allowlisted countries
scripts/
  run-ingestion.ts
  seed.ts
prisma/
  schema.prisma
tests/
  unit/ integration/ e2e/
```

## 10. Notes and Limitations

- Runtime persistence currently uses local JSON (`.data/runtime-store.json`) and in-memory objects, not Prisma runtime DB writes.
- Prisma schema models production persistence but is not wired into route handlers yet.
- Region drill-down is enabled by allowlist (`US`, `CA`, `AU`, `IN`, `CN`, `BR`, `RU`) and available GeoJSON files.
- Unknown/fictional country pages are bucketed under `ZZ`.

## 11. Further Documentation

- Implementation details: [`docs/how-it-works.md`](docs/how-it-works.md)
- Prisma model: [`prisma/schema.prisma`](prisma/schema.prisma)
- Workspace agent policies: [`AGENTS.md`](AGENTS.md)
