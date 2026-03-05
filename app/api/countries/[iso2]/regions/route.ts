import { NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";
import { isRegionEnabledCountry } from "@/config/region-allowlist";

export async function GET(_: Request, context: { params: Promise<{ iso2: string }> }): Promise<NextResponse> {
  const { iso2 } = await context.params;

  if (!isRegionEnabledCountry(iso2)) {
    return NextResponse.json({ error: "Region breakdown disabled for this country" }, { status: 404 });
  }

  const regions = await getDataStore().listRegions(iso2);
  return NextResponse.json({ data: regions });
}
