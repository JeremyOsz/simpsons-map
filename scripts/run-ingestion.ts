import { executeIngestionRun } from "@/server/ingestion-service";

async function main() {
  const run = await executeIngestionRun();
  console.log(JSON.stringify(run, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
