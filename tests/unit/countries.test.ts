import { describe, expect, it } from "vitest";
import { countryDisplayNameFromIso, inferIso2FromTitle } from "@/lib/countries";

describe("countries helpers", () => {
  it("maps Macedonia variants to MK", () => {
    expect(inferIso2FromTitle("Macedonia")).toBe("MK");
    expect(inferIso2FromTitle("Republic of Macedonia")).toBe("MK");
    expect(inferIso2FromTitle("The Republic of North Macedonia")).toBe("MK");
  });

  it("maps common UK and legacy wiki variants", () => {
    expect(inferIso2FromTitle("England")).toBe("GB");
    expect(inferIso2FromTitle("Scotland")).toBe("GB");
    expect(inferIso2FromTitle("Northern Ireland")).toBe("GB");
    expect(inferIso2FromTitle("Brunei")).toBe("BN");
    expect(inferIso2FromTitle("Syria")).toBe("SY");
    expect(inferIso2FromTitle("Micronesia")).toBe("FM");
    expect(inferIso2FromTitle("Czechoslovakia")).toBe("CZ");
    expect(inferIso2FromTitle("Yugoslavia")).toBe("RS");
    expect(inferIso2FromTitle("Tibet")).toBe("CN");
    expect(inferIso2FromTitle("Polynesia")).toBe("PF");
  });

  it("returns null for unknown country titles", () => {
    expect(inferIso2FromTitle("Springfieldistan")).toBeNull();
  });

  it("returns user-friendly display names", () => {
    expect(countryDisplayNameFromIso("MK")).toBe("North Macedonia");
    expect(countryDisplayNameFromIso("ZZ")).toBe("Unknown/Fictional places");
  });
});
