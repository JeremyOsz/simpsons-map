import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const TITLE_ALIASES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "u.s.a": "US",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  macedonia: "MK",
  "north macedonia": "MK",
  "republic of macedonia": "MK",
  kosovo: "XK",
  "east timor": "TL",
  "cape verde": "CV",
  "eswatini": "SZ",
  "swaziland": "SZ",
  "myanmar (burma)": "MM",
  "laos": "LA",
  "czech republic": "CZ",
  "south korea": "KR",
  "north korea": "KP",
  "vatican city": "VA",
  "ivory coast": "CI",
  "hong kong": "HK",
  "taiwan": "TW",
  "federated states of micronesia": "FM",
  micronesia: "FM",
  "palestine": "PS",
  "vatican": "VA",
  brunei: "BN",
  syria: "SY",
  czechoslovakia: "CZ",
  yugoslavia: "RS",
  tibet: "CN",
  polynesia: "PF"
};

const DISPLAY_ALIASES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  MK: "North Macedonia",
  CZ: "Czech Republic",
  KR: "South Korea",
  KP: "North Korea",
  CI: "Ivory Coast",
  VA: "Vatican City",
  TL: "East Timor",
  CV: "Cape Verde",
  SZ: "Eswatini",
  ZZ: "Unknown/Fictional places"
};

export function normalizeCountryTitle(title: string): string {
  return title
    .replace(/^Category:/i, "")
    .replace(/\(country\)/gi, "")
    .replace(/\(disambiguation\)/gi, "")
    .replace(/\([^)]*?\)/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/[.,/#!$%^&*;:{}=_`~]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPrefixes(value: string): string {
  return value
    .replace(/\brepublic of\b/g, "")
    .replace(/\bstate of\b/g, "")
    .replace(/\bfederation of\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferIso2FromTitle(title: string): string | null {
  const normalized = normalizeCountryTitle(title).toLowerCase();
  if (TITLE_ALIASES[normalized]) return TITLE_ALIASES[normalized];

  const code = countries.getAlpha2Code(normalized, "en");
  if (code) return code;

  const withoutThe = normalized.replace(/^the\s+/, "");
  if (TITLE_ALIASES[withoutThe]) return TITLE_ALIASES[withoutThe];
  const fallback = countries.getAlpha2Code(withoutThe, "en");
  if (fallback) return fallback;

  const stripped = stripPrefixes(withoutThe);
  if (TITLE_ALIASES[stripped]) return TITLE_ALIASES[stripped];

  const strippedCode = countries.getAlpha2Code(stripped, "en");
  if (strippedCode) return strippedCode;

  const names = countries.getNames("en", { select: "official" });
  const strictTokenMatches: string[] = [];
  for (const [iso2, name] of Object.entries(names)) {
    const normalizedName = stripPrefixes(normalizeCountryTitle(name).toLowerCase());
    if (normalizedName === stripped) {
      strictTokenMatches.push(iso2);
    }
  }

  if (strictTokenMatches.length === 1) {
    return strictTokenMatches[0];
  }

  return null;
}

export function knownCountryTokens(): Array<{ iso2: string; token: string }> {
  const names = countries.getNames("en", { select: "official" });
  const tokens: Array<{ iso2: string; token: string }> = [];
  const seen = new Set<string>();

  for (const [iso2, name] of Object.entries(names)) {
    const token = normalizeCountryTitle(name).toLowerCase();
    if (token.length >= 4) {
      const key = `${iso2}::${token}`;
      if (!seen.has(key)) {
        tokens.push({ iso2, token });
        seen.add(key);
      }
    }
  }

  for (const [alias, iso2] of Object.entries(TITLE_ALIASES)) {
    const key = `${iso2}::${alias}`;
    if (!seen.has(key)) {
      tokens.push({ iso2, token: alias });
      seen.add(key);
    }
  }

  return tokens;
}

export function countryDisplayNameFromIso(iso2: string): string {
  const normalizedIso = iso2.toUpperCase();
  if (DISPLAY_ALIASES[normalizedIso]) return DISPLAY_ALIASES[normalizedIso];

  const official = countries.getName(normalizedIso, "en", { select: "official" });
  if (official) {
    return official
      .replace(/^The\s+/i, "")
      .replace(/^Republic of\s+/i, "")
      .replace(/^State of\s+/i, "")
      .replace(/^Federation of\s+/i, "")
      .trim();
  }

  return `Unknown (${normalizedIso})`;
}

export function isRecognizedIso2(iso2: string): boolean {
  const normalizedIso = iso2.toUpperCase();
  if (DISPLAY_ALIASES[normalizedIso]) return normalizedIso !== "ZZ";
  return Boolean(countries.getName(normalizedIso, "en", { select: "official" }));
}
