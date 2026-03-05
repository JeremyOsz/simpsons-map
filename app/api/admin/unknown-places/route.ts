import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";
import { parseQuery, unknownPlacesQuerySchema } from "@/lib/api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = parseQuery(unknownPlacesQuerySchema, request.url);
    const items = await getDataStore().listUnknownPlaces(query);
    return NextResponse.json({ data: { items } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
