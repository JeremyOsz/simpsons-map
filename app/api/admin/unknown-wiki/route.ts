import { NextResponse } from "next/server";
import { parseQuery, mentionsQuerySchema } from "@/lib/api";
import { getDataStore } from "@/server/data-store";

export async function GET(request: Request) {
  try {
    const query = parseQuery(
      mentionsQuerySchema.pick({
        q: true,
        cursor: true,
        limit: true
      }),
      request.url
    );

    const data = await getDataStore().listUnknownWikiMentions(query);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }
}
