import { sampleCountries, sampleEpisodes, sampleMentions, sampleRegions } from "@/data/sample-data";

async function main() {
  console.log("Seed preview");
  console.table({
    countries: sampleCountries.length,
    regions: sampleRegions.length,
    episodes: sampleEpisodes.length,
    mentions: sampleMentions.length
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
