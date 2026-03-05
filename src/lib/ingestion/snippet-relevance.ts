import { parseEpisodeCode } from "@/lib/episode";

const SIMPSONS_KEYWORDS = [
  "simpson",
  "homer",
  "marge",
  "bart",
  "lisa",
  "apu",
  "moe",
  "krusty",
  "springfield",
  "kwik-e-mart",
  "treehouse of horror",
  "itchy & scratchy",
  "itchy and scratchy",
  "episode",
  "season"
];

const COUNTRY_INTRO_PATTERNS = [
  /\bis a country in\b/i,
  /\bofficially the republic of\b/i,
  /\bwith a population of\b/i,
  /\bin south asia\b/i,
  /\bin europe\b/i,
  /\bin africa\b/i,
  /\bin north america\b/i,
  /\bin south america\b/i,
  /\bin oceania\b/i,
  /\bin asia\b/i
];

export function cleanSnippetText(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

export function isSimpsonsRelevantSnippet(snippet: string): boolean {
  const normalized = snippet.toLowerCase();
  const hasEpisodeMarker = Boolean(parseEpisodeCode(snippet));
  const hasSimpsonsKeyword = SIMPSONS_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const isGenericCountryIntro = COUNTRY_INTRO_PATTERNS.some((pattern) => pattern.test(snippet));

  if (isGenericCountryIntro && !hasEpisodeMarker && !hasSimpsonsKeyword) return false;
  return hasEpisodeMarker || hasSimpsonsKeyword;
}

