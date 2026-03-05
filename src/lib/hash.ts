import { createHash } from "node:crypto";

export function normalizeSnippet(snippet: string): string {
  return snippet.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashSnippet(snippet: string): string {
  return createHash("sha256").update(normalizeSnippet(snippet)).digest("hex");
}
