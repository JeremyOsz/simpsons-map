export const REGION_ALLOWLIST = ["US", "CA", "AU", "IN", "CN", "BR", "RU"] as const;

export function isRegionEnabledCountry(iso2: string): boolean {
  return REGION_ALLOWLIST.includes(iso2.toUpperCase() as (typeof REGION_ALLOWLIST)[number]);
}
