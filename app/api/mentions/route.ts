import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";
import { mentionsQuerySchema, parseQuery } from "@/lib/api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = parseQuery(mentionsQuerySchema, request.url);
    const mentions = await getDataStore().listMentions(query);
    return NextResponse.json({ data: mentions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
