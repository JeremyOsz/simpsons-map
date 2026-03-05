# Simpsons Country Mentions Explorer

A Next.js + TypeScript web app for exploring country mentions across *The Simpsons* with a cartoon-inspired map UI, mention evidence cards, and region drill-down for allowlisted countries.

## Tech stack

- Next.js (App Router), TypeScript
- MapLibre GL (heatmap + region layer switching)
- Prisma schema (PostgreSQL-ready)
- TanStack Query
- Vitest + Playwright test scaffolding

## Features implemented

- World country heatmap with click-to-open country panel
- Mention detail cards with episode code, confidence, snippet, and source URL
- Search and filters:
  - Text query (country/quote + episode code pattern)
  - Season range
  - Confidence bucket
  - Source type
- Region drill-down for allowlisted countries (`US`, `CA`, `AU`, `IN`, `CN`, `BR`, `RU`)
- API routes from the plan:
  - `GET /api/countries`
  - `GET /api/countries/:iso2`
  - `GET /api/countries/:iso2/regions`
  - `GET /api/mentions`
  - `GET /api/episodes/:id`
  - `POST /api/ingestion/run`
  - `GET /api/ingestion/runs/:id`
- Scraper pipeline for multiple sources:
  - Simpsons Fandom `Category:Countries` via MediaWiki API
  - Optional `thesimpsons` script-lines CSV via `THSIMPSONS_SCRIPT_LINES_CSV_URL` (supports `https://...` or local file path)
  - Optional episodes CSV via `THSIMPSONS_EPISODES_CSV_URL` (supports `https://...` or local file path) to resolve unknown episode ids
- Auto-publish threshold (`CONFIDENCE_PUBLISH_THRESHOLD`, default `0.55`)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env.local
```

3. Run app:

```bash
npm run dev
```

4. Optional checks:

```bash
npm test
npm run test:e2e
```

## Data notes

- The app seeds from local sample data and persists runtime ingestion state to `.data/runtime-store.json`.
- Prisma schema is included for production Postgres migration and persistence.
- Region map geometry is included for US demo (`public/geo/regions/us.geojson`); add more files to extend map drill-down visuals.

## Ingestion

- Trigger via API:
  - `POST /api/ingestion/run`
  - Header: `x-admin-token: $INGESTION_ADMIN_TOKEN`
- Or run script:

```bash
npm run ingest
```

The ingestion flow:

1. Pull mentions from Fandom category pages (parallelized page parsing).
2. Optionally pull mentions from script-lines CSV (`THSIMPSONS_SCRIPT_LINES_CSV_URL`).
3. Parse episode refs (`SxxEyy`, `Season X Episode Y`) when present.
4. Score confidence.
5. Auto-publish high-confidence mentions.
6. Deduplicate by `(countryIso2, episodeId, normalizedSnippetHash, sourceUrl)`.

### Export The Simpsons CSVs locally

If you installed the `thesimpsons` R package, you can export local CSV files used by ingestion:

```bash
npm run export:thesimpsons
```

This writes:

- `.data/thesimpsons/simpsons_script_lines.csv`
- `.data/thesimpsons/simpsons_episodes.csv`
