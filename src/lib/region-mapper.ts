interface RegionDefinition {
  name: string;
  keywords: string[];
}

const REGION_DEFINITIONS: Record<string, Record<string, RegionDefinition>> = {
  US: {
    AL: { name: "Alabama", keywords: ["alabama", "birmingham"] },
    AK: { name: "Alaska", keywords: ["alaska", "anchorage"] },
    AZ: { name: "Arizona", keywords: ["arizona", "phoenix"] },
    AR: { name: "Arkansas", keywords: ["arkansas", "little rock"] },
    CA: { name: "California", keywords: ["california", "los angeles", "san francisco"] },
    CO: { name: "Colorado", keywords: ["colorado", "denver"] },
    CT: { name: "Connecticut", keywords: ["connecticut", "hartford"] },
    DE: { name: "Delaware", keywords: ["delaware", "wilmington, delaware"] },
    FL: { name: "Florida", keywords: ["florida", "miami", "orlando"] },
    GA: { name: "Georgia", keywords: ["georgia, usa", "atlanta"] },
    HI: { name: "Hawaii", keywords: ["hawaii", "honolulu"] },
    ID: { name: "Idaho", keywords: ["idaho", "boise"] },
    IL: { name: "Illinois", keywords: ["illinois", "chicago", "springfield, illinois"] },
    IN: { name: "Indiana", keywords: ["indiana", "indianapolis"] },
    IA: { name: "Iowa", keywords: ["iowa", "des moines"] },
    KS: { name: "Kansas", keywords: ["kansas", "wichita"] },
    KY: { name: "Kentucky", keywords: ["kentucky", "louisville"] },
    LA: { name: "Louisiana", keywords: ["louisiana", "new orleans"] },
    ME: { name: "Maine", keywords: ["maine", "portland, maine"] },
    MD: { name: "Maryland", keywords: ["maryland", "baltimore"] },
    MA: { name: "Massachusetts", keywords: ["massachusetts", "boston"] },
    MI: { name: "Michigan", keywords: ["michigan", "detroit"] },
    MN: { name: "Minnesota", keywords: ["minnesota", "minneapolis"] },
    MS: { name: "Mississippi", keywords: ["mississippi", "jackson, mississippi"] },
    MO: { name: "Missouri", keywords: ["missouri", "st louis", "saint louis"] },
    MT: { name: "Montana", keywords: ["montana", "billings"] },
    NE: { name: "Nebraska", keywords: ["nebraska", "omaha"] },
    NV: { name: "Nevada", keywords: ["nevada", "las vegas", "vegas"] },
    NH: { name: "New Hampshire", keywords: ["new hampshire", "manchester, new hampshire"] },
    NJ: { name: "New Jersey", keywords: ["new jersey", "newark, new jersey"] },
    NM: { name: "New Mexico", keywords: ["new mexico", "albuquerque"] },
    NY: { name: "New York", keywords: ["new york", "brooklyn", "manhattan"] },
    NC: { name: "North Carolina", keywords: ["north carolina", "charlotte, north carolina"] },
    ND: { name: "North Dakota", keywords: ["north dakota", "fargo"] },
    OH: { name: "Ohio", keywords: ["ohio", "columbus, ohio"] },
    OK: { name: "Oklahoma", keywords: ["oklahoma", "oklahoma city"] },
    OR: { name: "Oregon", keywords: ["oregon", "portland, oregon", "springfield, oregon"] },
    PA: { name: "Pennsylvania", keywords: ["pennsylvania", "philadelphia", "pittsburgh"] },
    RI: { name: "Rhode Island", keywords: ["rhode island", "providence"] },
    SC: { name: "South Carolina", keywords: ["south carolina", "charleston, south carolina"] },
    SD: { name: "South Dakota", keywords: ["south dakota", "sioux falls"] },
    TN: { name: "Tennessee", keywords: ["tennessee", "nashville"] },
    TX: { name: "Texas", keywords: ["texas", "houston", "dallas", "austin"] },
    UT: { name: "Utah", keywords: ["utah", "salt lake city"] },
    VT: { name: "Vermont", keywords: ["vermont", "burlington, vermont"] },
    VA: { name: "Virginia", keywords: ["virginia", "richmond, virginia"] },
    WA: { name: "Washington", keywords: ["washington state", "seattle"] },
    WV: { name: "West Virginia", keywords: ["west virginia", "charleston, west virginia"] },
    WI: { name: "Wisconsin", keywords: ["wisconsin", "milwaukee"] },
    WY: { name: "Wyoming", keywords: ["wyoming", "cheyenne"] },
    DC: { name: "District of Columbia", keywords: ["district of columbia", "washington dc", "washington, d.c."] }
  },
  CA: {
    AB: { name: "Alberta", keywords: ["alberta", "calgary", "edmonton"] },
    BC: { name: "British Columbia", keywords: ["british columbia", "vancouver"] },
    MB: { name: "Manitoba", keywords: ["manitoba", "winnipeg"] },
    NB: { name: "New Brunswick", keywords: ["new brunswick", "fredericton"] },
    NL: { name: "Newfoundland and Labrador", keywords: ["newfoundland", "labrador", "st john's"] },
    NS: { name: "Nova Scotia", keywords: ["nova scotia", "halifax"] },
    NT: { name: "Northwest Territories", keywords: ["northwest territories", "yellowknife"] },
    NU: { name: "Nunavut", keywords: ["nunavut", "iqaluit"] },
    ON: { name: "Ontario", keywords: ["ontario", "toronto", "ottawa"] },
    PE: { name: "Prince Edward Island", keywords: ["prince edward island", "charlottetown"] },
    QC: { name: "Quebec", keywords: ["quebec", "montreal"] },
    SK: { name: "Saskatchewan", keywords: ["saskatchewan", "regina"] },
    YT: { name: "Yukon", keywords: ["yukon", "whitehorse"] }
  },
  AU: {
    NSW: { name: "New South Wales", keywords: ["new south wales", "sydney"] },
    VIC: { name: "Victoria", keywords: ["victoria, australia", "melbourne"] },
    QLD: { name: "Queensland", keywords: ["queensland", "brisbane"] },
    WA: { name: "Western Australia", keywords: ["western australia", "perth"] },
    SA: { name: "South Australia", keywords: ["south australia", "adelaide"] },
    TAS: { name: "Tasmania", keywords: ["tasmania", "hobart"] },
    ACT: { name: "Australian Capital Territory", keywords: ["australian capital territory", "canberra"] },
    NT: { name: "Northern Territory", keywords: ["northern territory", "darwin"] }
  },
  IN: {
    MH: { name: "Maharashtra", keywords: ["maharashtra", "mumbai", "pune"] },
    DL: { name: "Delhi", keywords: ["delhi", "new delhi"] },
    KA: { name: "Karnataka", keywords: ["karnataka", "bengaluru", "bangalore"] },
    TN: { name: "Tamil Nadu", keywords: ["tamil nadu", "chennai"] },
    WB: { name: "West Bengal", keywords: ["west bengal", "kolkata", "calcutta"] },
    GJ: { name: "Gujarat", keywords: ["gujarat", "ahmedabad"] },
    UP: { name: "Uttar Pradesh", keywords: ["uttar pradesh", "lucknow"] },
    RJ: { name: "Rajasthan", keywords: ["rajasthan", "jaipur"] }
  },
  CN: {
    BJ: { name: "Beijing", keywords: ["beijing"] },
    SH: { name: "Shanghai", keywords: ["shanghai"] },
    GD: { name: "Guangdong", keywords: ["guangdong", "guangzhou", "shenzhen"] },
    SC: { name: "Sichuan", keywords: ["sichuan", "chengdu"] },
    ZJ: { name: "Zhejiang", keywords: ["zhejiang", "hangzhou"] },
    JS: { name: "Jiangsu", keywords: ["jiangsu", "nanjing"] },
    HB: { name: "Hubei", keywords: ["hubei", "wuhan"] },
    SD: { name: "Shandong", keywords: ["shandong", "qingdao"] }
  },
  BR: {
    SP: { name: "Sao Paulo", keywords: ["sao paulo", "são paulo"] },
    RJ: { name: "Rio de Janeiro", keywords: ["rio de janeiro"] },
    MG: { name: "Minas Gerais", keywords: ["minas gerais", "belo horizonte"] },
    BA: { name: "Bahia", keywords: ["bahia", "salvador"] },
    RS: { name: "Rio Grande do Sul", keywords: ["rio grande do sul", "porto alegre"] },
    PR: { name: "Parana", keywords: ["parana", "paraná", "curitiba"] },
    PE: { name: "Pernambuco", keywords: ["pernambuco", "recife"] },
    CE: { name: "Ceara", keywords: ["ceara", "ceará", "fortaleza"] }
  },
  RU: {
    MOW: { name: "Moscow", keywords: ["moscow"] },
    SPE: { name: "Saint Petersburg", keywords: ["saint petersburg", "st petersburg"] },
    KDA: { name: "Krasnodar Krai", keywords: ["krasnodar", "sochi"] },
    SVE: { name: "Sverdlovsk Oblast", keywords: ["sverdlovsk", "yekaterinburg", "ekaterinburg"] },
    NVS: { name: "Novosibirsk Oblast", keywords: ["novosibirsk"] },
    TAT: { name: "Tatarstan", keywords: ["tatarstan", "kazan"] },
    ROS: { name: "Rostov Oblast", keywords: ["rostov", "rostov on don"] },
    PRI: { name: "Primorsky Krai", keywords: ["primorsky", "vladivostok"] }
  }
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"'?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(haystack);
}

export function inferRegionCode(countryIso2: string, snippet: string): string | undefined {
  const definitions = REGION_DEFINITIONS[countryIso2.toUpperCase()];
  if (!definitions) return undefined;

  const normalized = normalize(snippet);

  for (const [code, definition] of Object.entries(definitions)) {
    if (definition.keywords.some((keyword) => hasKeyword(normalized, normalize(keyword)))) {
      return code;
    }
  }

  return "UNKNOWN";
}

export function getRegionDisplayName(countryIso2: string, regionCode: string): string | undefined {
  if (regionCode.toUpperCase() === "UNKNOWN") return "Unknown";
  return REGION_DEFINITIONS[countryIso2.toUpperCase()]?.[regionCode.toUpperCase()]?.name;
}
