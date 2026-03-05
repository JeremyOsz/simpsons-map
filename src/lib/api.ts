import { z } from "zod";

export const mentionsQuerySchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  seasonFrom: z.coerce.number().int().min(1).max(40).optional(),
  seasonTo: z.coerce.number().int().min(1).max(40).optional(),
  q: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  sourceType: z.enum(["WIKI_PAGE", "REFERENCE_LINK"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const countriesQuerySchema = z.object({
  seasonFrom: z.coerce.number().int().min(1).max(40).optional(),
  seasonTo: z.coerce.number().int().min(1).max(40).optional(),
  q: z.string().optional(),
  sort: z.enum(["mentions_desc", "name_asc"]).default("mentions_desc")
});

export const unknownPlacesQuerySchema = z.object({
  seasonFrom: z.coerce.number().int().min(1).max(40).optional(),
  seasonTo: z.coerce.number().int().min(1).max(40).optional(),
  q: z.string().optional()
});

export function parseQuery<T extends z.ZodTypeAny>(schema: T, url: string): z.infer<T> {
  const searchParams = Object.fromEntries(new URL(url).searchParams.entries());
  return schema.parse(searchParams);
}
