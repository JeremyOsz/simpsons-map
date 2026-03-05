import { randomUUID } from "node:crypto";
import { getDataStore } from "@/server/data-store";
import { scrapeFandomCountryMentions, getPublishThreshold } from "@/lib/ingestion/scrape-fandom";
import { scrapeTheSimpsonsDataset } from "@/lib/ingestion/scrape-thesimpsons";
import { getEpisodeTitleLookup } from "@/lib/episode-lookup";
import { parseEpisodeReference } from "@/lib/episode";
import type { IngestionRun, Mention } from "@/types/domain";
import type { ScrapeResult as FandomScrapeResult } from "@/lib/ingestion/scrape-fandom";
import type { SecondaryScrapeResult as DatasetScrapeResult } from "@/lib/ingestion/scrape-thesimpsons";

type SourceResult = {
  pagesScanned: number;
  mentionsExtracted: Mention[];
  metadata?: Record<string, unknown>;
};

type SourceName = "fandom" | "dataset";

function logIngestion(runId: string, phase: string, payload: Record<string, unknown>): void {
  const line = {
    ts: new Date().toISOString(),
    runId,
    phase,
    ...payload
  };
  console.log(`[ingestion] ${JSON.stringify(line)}`);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function runSource(
  runId: string,
  name: SourceName,
  fn: () => Promise<FandomScrapeResult | DatasetScrapeResult>
): Promise<SourceResult> {
  const started = Date.now();
  logIngestion(runId, "source_start", { source: name });
  try {
    const result = await fn();
    const elapsedMs = Date.now() - started;
    logIngestion(runId, "source_success", {
      source: name,
      elapsedMs,
      pagesScanned: result.pagesScanned,
      mentionsExtracted: result.mentionsExtracted.length,
      metadata:
        "unresolvedTitlesCount" in result
          ? {
              unresolvedTitlesCount: result.unresolvedTitlesCount,
              unresolvedTitlesSample: result.unresolvedTitlesSample
            }
          : undefined
    });
    return {
      pagesScanned: result.pagesScanned,
      mentionsExtracted: result.mentionsExtracted,
      metadata:
        "unresolvedTitlesCount" in result
          ? {
              unresolvedTitlesCount: result.unresolvedTitlesCount,
              unresolvedTitlesSample: result.unresolvedTitlesSample
            }
          : undefined
    };
  } catch (error) {
    const elapsedMs = Date.now() - started;
    logIngestion(runId, "source_failure", {
      source: name,
      elapsedMs,
      error: formatError(error)
    });
    return { pagesScanned: 0, mentionsExtracted: [] };
  }
}

function runStarted(id: string): IngestionRun {
  return {
    id,
    startedAt: new Date().toISOString(),
    status: "RUNNING",
    pagesScanned: 0,
    mentionsExtracted: 0,
    mentionsPublished: 0
  };
}

function enrichUnknownEpisodeMentions(runId: string, mentions: Mention[]): Mention[] {
  const episodeTitleLookup = getEpisodeTitleLookup();
  const byHashKnownEpisode = new Map<string, string>();
  for (const mention of mentions) {
    if (mention.episodeId !== "0-0") {
      byHashKnownEpisode.set(mention.normalizedSnippetHash, mention.episodeId);
    }
  }

  let unknownBefore = 0;
  let resolvedByHash = 0;
  let resolvedBySnippetRef = 0;

  const enriched = mentions.map((mention) => {
    if (mention.episodeId !== "0-0") return mention;
    unknownBefore += 1;

    const knownEpisode = byHashKnownEpisode.get(mention.normalizedSnippetHash);
    if (knownEpisode) {
      resolvedByHash += 1;
      return { ...mention, episodeId: knownEpisode };
    }

    const parsed = parseEpisodeReference(mention.snippet, episodeTitleLookup);
    if (parsed) {
      resolvedBySnippetRef += 1;
      return { ...mention, episodeId: `${parsed.season}-${parsed.episodeNumber}` };
    }

    return mention;
  });

  const unknownAfter = enriched.filter((mention) => mention.episodeId === "0-0").length;
  logIngestion(runId, "episode_enrichment", {
    unknownBefore,
    resolvedByHash,
    resolvedBySnippetRef,
    unknownAfter
  });

  return enriched;
}

export async function executeIngestionRun(): Promise<IngestionRun> {
  const store = getDataStore();
  const id = randomUUID();
  const started = runStarted(id);
  const runStartedAt = Date.now();
  logIngestion(id, "run_start", {
    threshold: getPublishThreshold()
  });
  await store.createIngestionRun(started);

  try {
    const [fandomResult, datasetResult] = await Promise.all([
      runSource(id, "fandom", () => scrapeFandomCountryMentions()),
      runSource(id, "dataset", () => scrapeTheSimpsonsDataset())
    ]);

    const mergedMentions = enrichUnknownEpisodeMentions(id, [...fandomResult.mentionsExtracted, ...datasetResult.mentionsExtracted]);
    const result = {
      pagesScanned: fandomResult.pagesScanned + datasetResult.pagesScanned,
      mentionsExtracted: mergedMentions
    };
    const threshold = getPublishThreshold();
    const fandomPublishableCount = fandomResult.mentionsExtracted.filter((mention: Mention) => mention.confidence >= threshold).length;
    const datasetPublishableCount = datasetResult.mentionsExtracted.filter((mention: Mention) => mention.confidence >= threshold).length;
    const publishable = result.mentionsExtracted.filter((mention: Mention) => mention.confidence >= threshold);
    const dropped = result.mentionsExtracted.length - publishable.length;

    logIngestion(id, "filter_complete", {
      threshold,
      extractedTotal: result.mentionsExtracted.length,
      publishable: publishable.length,
      droppedByThreshold: dropped,
      bySource: {
        fandom: {
          extracted: fandomResult.mentionsExtracted.length,
          publishable: fandomPublishableCount
        },
        dataset: {
          extracted: datasetResult.mentionsExtracted.length,
          publishable: datasetPublishableCount
        }
      }
    });

    const inserted = await store.upsertMentions(publishable);
    logIngestion(id, "dedupe_complete", {
      publishable: publishable.length,
      inserted,
      skippedAsDuplicate: publishable.length - inserted
    });

    const backfill = await store.backfillUnknownEpisodes();
    logIngestion(id, "unknown_episode_backfill", backfill);

    const completed: IngestionRun = {
      ...started,
      completedAt: new Date().toISOString(),
      status: "COMPLETED",
      pagesScanned: result.pagesScanned,
      mentionsExtracted: result.mentionsExtracted.length,
      mentionsPublished: inserted
    };

    await store.updateIngestionRun(completed);
    logIngestion(id, "run_complete", {
      status: completed.status,
      elapsedMs: Date.now() - runStartedAt,
      pagesScanned: completed.pagesScanned,
      mentionsExtracted: completed.mentionsExtracted,
      mentionsPublished: completed.mentionsPublished
    });
    return completed;
  } catch (error) {
    const failed: IngestionRun = {
      ...started,
      completedAt: new Date().toISOString(),
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown ingestion error"
    };

    await store.updateIngestionRun(failed);
    logIngestion(id, "run_failed", {
      elapsedMs: Date.now() - runStartedAt,
      error: formatError(error)
    });
    return failed;
  }
}
