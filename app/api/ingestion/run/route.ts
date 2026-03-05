import { NextResponse } from "next/server";
import { executeIngestionRun } from "@/server/ingestion-service";

export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers.get("x-admin-token");

  if (!token || token !== process.env.INGESTION_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await executeIngestionRun();
  return NextResponse.json({ data: run }, { status: 202 });
}
