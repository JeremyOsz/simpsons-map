import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";
import { mentionsQuerySchema, parseQuery } from "@/lib/api";

export async function GET(request: NextRequest, context: { params: Promise<{ iso2: string }> }): Promise<NextResponse> {
  try {
    const { iso2 } = await context.params;
    const store = getDataStore();
    const country = await store.getCountry(iso2);

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const query = parseQuery(mentionsQuerySchema, request.url);
    const mentions = await store.listMentions({ ...query, country: iso2 });

    return NextResponse.json({
      data: {
        country,
        mentions
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
