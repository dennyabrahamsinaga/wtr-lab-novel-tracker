import { NextResponse } from "next/server";
import { z } from "zod";
import { bestReviewScore } from "@/lib/wtr/score";
import { fetchNovelListPage } from "@/lib/wtr/novelList";
import { fetchFinderTags } from "@/lib/wtr/tags";
import { mapSerieToNovel } from "@/lib/wtr/map";
import type { FinderNovel } from "@/lib/wtr/map";
import { getSearchCache, setSearchCache } from "@/lib/wtr/searchCache";
import { searchHitToNovel, searchSite } from "@/lib/wtr/siteSearch";
import { fetchNovelPage } from "@/lib/wtr/sitemap";

export const runtime = "nodejs";

const schema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  tagMode: z.enum(["and", "or"]).optional(),
  status: z.enum(["ongoing", "completed"]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minChapters: z.coerce.number().int().min(0).optional(),
  maxChapters: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["updated", "rating", "chapters", "best"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(20).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const tagIds =
    parsed.data.tags?.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)) ?? [];

  const q = (parsed.data.q ?? "").trim().toLowerCase();
  const status = parsed.data.status;
  const minRating = parsed.data.minRating ?? 0;
  const minChapters = parsed.data.minChapters ?? 0;
  const maxChapters = parsed.data.maxChapters ?? Number.POSITIVE_INFINITY;
  const tagMode = parsed.data.tagMode ?? "and";
  const sort = parsed.data.sort ?? "updated";
  const pageSize = Math.max(1, Math.min(20, parsed.data.pageSize ?? 10));
  const page = Math.max(1, parsed.data.page ?? 1);

  const hasAdvancedFilters =
    Boolean(q) ||
    tagIds.length > 0 ||
    Boolean(status) ||
    minRating > 0 ||
    minChapters > 0 ||
    Number.isFinite(maxChapters) && maxChapters !== Number.POSITIVE_INFINITY ||
    sort !== "updated";

  function sortItems(items: FinderNovel[]) {
    return sort === "rating"
      ? items.sort((a, b) => (b.rating - a.rating) || (b.totalRates - a.totalRates))
      : sort === "chapters"
        ? items.sort((a, b) => b.chapterCount - a.chapterCount)
        : sort === "best"
          ? items.sort((a, b) => bestReviewScore(b) - bestReviewScore(a))
          : items.sort((a, b) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""));
  }

  if (!hasAdvancedFilters) {
    const tags = await fetchFinderTags("en").catch(() => []);
    const out: FinderNovel[] = [];
    let remotePage = page;
    let totalRemote = 0;

    while (out.length < pageSize && remotePage < page + 20) {
      const res = await fetchNovelListPage({ locale: "en", page: remotePage });
      totalRemote = res.count;
      for (const serie of res.series) {
        const novel = mapSerieToNovel(serie, tags);
        if (novel) out.push(novel);
        if (out.length >= pageSize) break;
      }
      remotePage++;
      if ((remotePage - 1) * 10 >= totalRemote) break;
    }

    return NextResponse.json(
      {
        items: out.slice(0, pageSize),
        total: totalRemote,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalRemote / 10)),
      },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  }

  const cacheKey = JSON.stringify({
    q,
    status,
    tagIds,
    tagMode,
    minRating,
    minChapters,
    maxChapters,
    sort,
    page,
    pageSize,
  });
  const cached = getSearchCache(cacheKey, 5 * 60 * 1000);
  if (cached) {
    return NextResponse.json(cached, { headers: { "cache-control": "public, max-age=60" } });
  }

  if (q) {
    const hits = await searchSite(q);
    const candidates = hits.filter((h) => Number.isFinite(h.id) && h.slug).slice(0, 30);
    const needsDetailLookup = tagIds.length > 0;
    const tagsForMap = needsDetailLookup ? await fetchFinderTags("en") : [];

    const mapped = await Promise.all(
      candidates.map(async (hit) => {
        const fallback = searchHitToNovel(hit);
        if (!fallback) return null;

        const page = needsDetailLookup
          ? await fetchNovelPage(`https://www.wtr-lab.com/en/novel/${hit.id}/${hit.slug}`).catch(() => null)
          : null;
        const serieData = page?.pageProps?.serie?.serie_data ?? null;
        const mappedNovel = serieData ? mapSerieToNovel(serieData, tagsForMap) : null;
        if (mappedNovel) {
          return {
            ...mappedNovel,
            slug: page?.finalUrl.split("/").pop() || mappedNovel.slug,
          };
        }
        return fallback;
      }),
    );

    const exactKey = q.replace(/[^a-z0-9]+/g, "");
    const base = mapped.filter(Boolean) as FinderNovel[];
    const filtered = base.filter((novel) => {
      if (status && novel.status !== status) return false;
      if (novel.rating < minRating) return false;
      if (novel.chapterCount < minChapters) return false;
      if (novel.chapterCount > maxChapters) return false;
      if (tagIds.length > 0) {
        const ok =
          tagMode === "or"
            ? tagIds.some((id) => novel.tagIds.includes(id))
            : tagIds.every((id) => novel.tagIds.includes(id));
        if (!ok) return false;
      }
      return true;
    });

    const ranked = sortItems(filtered);
    ranked.sort((a, b) => {
      const aExact = a.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "") === exactKey ? 1 : 0;
      const bExact = b.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "") === exactKey ? 1 : 0;
      return bExact - aExact;
    });

    const total = ranked.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = ranked.slice(start, start + pageSize);

    const result = { items: pageItems, total, page: safePage, pageSize, totalPages };
    setSearchCache(cacheKey, result);
    return NextResponse.json(result, { headers: { "cache-control": "public, max-age=60" } });
  }

  const requiredPlus = page * pageSize + pageSize;
  const scanPages = Math.max(20, Math.min(400, Number(process.env.WTR_SCAN_PAGES ?? "120")));
  const tagsForMap = await fetchFinderTags("en").catch(() => []);

  const matches: FinderNovel[] = [];
  let remotePage = 1;
  const batchSize = 8;

  function accept(novel: FinderNovel) {
    if (status && novel.status !== status) return false;
    if (novel.rating < minRating) return false;
    if (novel.chapterCount < minChapters) return false;
    if (novel.chapterCount > maxChapters) return false;
    if (tagIds.length > 0) {
      const ok =
        tagMode === "or"
          ? tagIds.some((id) => novel.tagIds.includes(id))
          : tagIds.every((id) => novel.tagIds.includes(id));
      if (!ok) return false;
    }
    if (q) {
      const hay = `${novel.titleEn} ${novel.author ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  while (matches.length < requiredPlus && remotePage <= scanPages) {
    const pages = Array.from({ length: batchSize }, (_, i) => remotePage + i).filter((p) => p <= scanPages);
    const settled = await Promise.allSettled(pages.map((p) => fetchNovelListPage({ locale: "en", page: p })));
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const serie of s.value.series) {
        const novel = mapSerieToNovel(serie, tagsForMap);
        if (!novel) continue;
        if (!accept(novel)) continue;
        matches.push(novel);
      }
    }
    remotePage += batchSize;
  }

  const items = sortItems(matches);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const result = { items: pageItems, total, page: safePage, pageSize, totalPages };
  setSearchCache(cacheKey, result);

  return NextResponse.json(result, {
    headers: {
      "cache-control": "public, max-age=60",
    },
  });
}
