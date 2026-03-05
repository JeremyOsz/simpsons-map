export interface ConfidenceInput {
  snippet: string;
  countryName: string;
  hasEpisodeCitation: boolean;
  sourceStructured: boolean;
  corroborationCount: number;
  isImplied: boolean;
}

export function scoreMentionConfidence(input: ConfidenceInput): number {
  let score = 0.2;
  const normalized = input.snippet.toLowerCase();

  if (normalized.includes(input.countryName.toLowerCase())) score += 0.3;
  if (input.hasEpisodeCitation) score += 0.25;
  if (input.sourceStructured) score += 0.15;
  score += Math.min(input.corroborationCount * 0.05, 0.15);
  if (input.isImplied) score -= 0.1;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function confidenceBucket(score: number): "high" | "medium" | "low" {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
