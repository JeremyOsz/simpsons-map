import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";
import { countriesQuerySchema, parseQuery } from "@/lib/api";

export const revalidate = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = parseQuery(countriesQuerySchema, request.url);
    const countries = await getDataStore().listCountries(query);
    return NextResponse.json({ data: countries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
