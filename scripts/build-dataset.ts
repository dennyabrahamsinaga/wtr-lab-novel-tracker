import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchNovelIndexFromSitemaps, fetchNovelPair } from "../src/lib/wtr/sitemap";
import { toDatasetItem, type NovelDatasetItem } from "../src/lib/wtr/transform";

const OUT_PATH = path.join(process.cwd(), "src", "data", "novels.json");

async function main() {
  const urls = await fetchNovelIndexFromSitemaps({
    sitemapIndexUrl: "https://www.wtr-lab.com/novels/index.xml",
  });

  const items: NovelDatasetItem[] = [];
  let skipped = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    try {
      const pair = await fetchNovelPair(url);
      if (!pair) {
        skipped++;
        continue;
      }
      const item = toDatasetItem(pair);
      if (!item) {
        skipped++;
        continue;
      }
      items.push(item);
      if (i % 50 === 0) {
        console.log(`processed ${i + 1}/${urls.length} (kept=${items.length}, skipped=${skipped})`);
      }
    } catch (err) {
      skipped++;
      console.warn("skip", url, err instanceof Error ? err.message : err);
    }
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2), "utf8");

  console.log(`wrote ${items.length} novels to ${OUT_PATH} (skipped=${skipped})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
