import type { FinderNovel } from "@/lib/wtr/map";

export type NovelSearchResult = {
  items: FinderNovel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type CacheEntry = {
  fetchedAt: number;
  value: NovelSearchResult;
};

const globalForCache = globalThis as unknown as { wtrSearch?: Map<string, CacheEntry> };
const store = globalForCache.wtrSearch ?? new Map<string, CacheEntry>();
globalForCache.wtrSearch = store;

export function getSearchCache(key: string, maxAgeMs: number) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > maxAgeMs) return null;
  return hit.value;
}

export function setSearchCache(key: string, value: NovelSearchResult) {
  store.set(key, { fetchedAt: Date.now(), value });
}

