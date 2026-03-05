export function parseEpisodeCode(text: string): { season: number; episodeNumber: number } | null {
  const compact = text.match(/s(\d{1,2})e(\d{1,2})/i);
  if (compact) {
    return {
      season: Number(compact[1]),
      episodeNumber: Number(compact[2])
    };
  }

  const longForm = text.match(/season\s*(\d{1,2})\D+episode\s*(\d{1,2})/i);
  if (longForm) {
    return {
      season: Number(longForm[1]),
      episodeNumber: Number(longForm[2])
    };
  }

  return null;
}

function normalizeEpisodeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"“”‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCandidatesFromText(text: string): string[] {
  const candidates = new Set<string>();
  const quotePattern = /["“]([^"“”]{3,120})["”]/g;
  let match: RegExpExecArray | null;

  while ((match = quotePattern.exec(text)) !== null) {
    const normalized = normalizeEpisodeTitle(match[1] ?? "");
    if (normalized) candidates.add(normalized);
  }

  const episodePrefix = text.match(/episode\s*[-:]\s*["“]?([^"“”(\n]{3,120})/i);
  if (episodePrefix?.[1]) {
    const normalized = normalizeEpisodeTitle(episodePrefix[1]);
    if (normalized) candidates.add(normalized);
  }

  return Array.from(candidates);
}

export function parseEpisodeReference(
  text: string,
  titleLookup?: Map<string, { season: number; episodeNumber: number }>
): { season: number; episodeNumber: number } | null {
  const parsedCode = parseEpisodeCode(text);
  if (parsedCode) return parsedCode;
  if (!titleLookup || titleLookup.size === 0) return null;

  for (const candidate of titleCandidatesFromText(text)) {
    const resolved = titleLookup.get(candidate);
    if (resolved) return resolved;
  }

  return null;
}

export function toEpisodeTitleKey(title: string): string {
  return normalizeEpisodeTitle(title);
}
