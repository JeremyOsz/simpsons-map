import { describe, expect, it } from "vitest";
import { getRegionDisplayName, inferRegionCode } from "@/lib/region-mapper";

describe("inferRegionCode", () => {
  it("maps US state names and major city aliases", () => {
    expect(inferRegionCode("US", "A trip to New York is planned.")).toBe("NY");
    expect(inferRegionCode("US", "They moved to Chicago for work.")).toBe("IL");
    expect(inferRegionCode("US", "A Vegas parody appears in the gag.")).toBe("NV");
  });

  it("maps Canadian and Australian administrative regions", () => {
    expect(inferRegionCode("CA", "A side quest in Toronto, Ontario.")).toBe("ON");
    expect(inferRegionCode("CA", "A Vancouver skyline gag.")).toBe("BC");
    expect(inferRegionCode("AU", "Springfield somehow lands in Sydney.")).toBe("NSW");
  });

  it("falls back to UNKNOWN for unmapped mention", () => {
    expect(inferRegionCode("US", "A random US reference.")).toBe("UNKNOWN");
  });

  it("returns undefined for non-allowlisted mapping table", () => {
    expect(inferRegionCode("JP", "Tokyo")).toBeUndefined();
  });
});

describe("getRegionDisplayName", () => {
  it("returns the canonical region name", () => {
    expect(getRegionDisplayName("US", "CA")).toBe("California");
    expect(getRegionDisplayName("CA", "ON")).toBe("Ontario");
    expect(getRegionDisplayName("AU", "NSW")).toBe("New South Wales");
  });

  it("returns Unknown for the synthetic UNKNOWN code", () => {
    expect(getRegionDisplayName("US", "UNKNOWN")).toBe("Unknown");
  });
});
