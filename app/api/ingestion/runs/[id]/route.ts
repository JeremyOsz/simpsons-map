import { NextResponse } from "next/server";
import { getDataStore } from "@/server/data-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params;
  const run = await getDataStore().getIngestionRun(id);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ data: run });
}
