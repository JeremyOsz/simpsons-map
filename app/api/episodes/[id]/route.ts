import { NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  const episode = await getDataStore().getEpisode(id);

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  return NextResponse.json({ data: episode });
}
