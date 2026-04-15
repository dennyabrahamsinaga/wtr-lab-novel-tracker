import { fetchNovelListPage } from "@/lib/wtr/novelList";
import { mapSerieToNovel, type FinderNovel } from "@/lib/wtr/map";
import type { WtrTag } from "@/lib/wtr/types";
import { fetchFinderTags } from "@/lib/wtr/tags";

type Cache = {
  fetchedAt: number;
  novels: FinderNovel[];
  tags: WtrTag[];
  version: number;
};

const globalForCache = globalThis as unknown as { wtrIndex?: Cache };

const CACHE_VERSION = 2;

function getIndexPages() {
  const n = Number(process.env.WTR_INDEX_PAGES ?? "200");
  if (!Number.isFinite(n) || n <= 0) return 200;
  return Math.min(1000, Math.floor(n));
}

export async function getWtrIndexCached(opts?: { maxAgeMs?: number }) {
  const maxAgeMs = opts?.maxAgeMs ?? 10 * 60 * 1000;
  const existing = globalForCache.wtrIndex;
  if (existing && existing.version === CACHE_VERSION && Date.now() - existing.fetchedAt < maxAgeMs) return existing;

  const pages = getIndexPages();
  const novels: FinderNovel[] = [];
  const tags: WtrTag[] = await fetchFinderTags("en");

  const concurrency = 10;
  let cursor = 1;
  async function worker() {
    while (cursor <= pages) {
      const page = cursor++;
      try {
        const res = await fetchNovelListPage({ locale: "en", page });
        for (const serie of res.series) {
          const novel = mapSerieToNovel(serie, tags);
          if (novel) novels.push(novel);
        }
      } catch {
        continue;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const next: Cache = { fetchedAt: Date.now(), novels, tags, version: CACHE_VERSION };
  globalForCache.wtrIndex = next;
  return next;
}
