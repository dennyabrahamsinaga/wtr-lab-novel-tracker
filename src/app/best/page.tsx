import Link from "next/link";
import { ExpandableText } from "@/app/_components/ExpandableText";
import { NovelThumbnail } from "@/app/_components/NovelThumbnail";
import { fetchReviews, fetchReviewStats, normalizeReviewText } from "@/lib/wtr/reviews";
import { getBestRankedCached } from "@/lib/wtr/bestCache";
import { fetchNovelByIdAndSlug } from "@/lib/wtr/novel";
import { isCanonicalNovelMismatch } from "@/lib/wtr/match";

function clampInt(value: unknown, fallback: number) {
  const n = typeof value === "string" ? Number(value) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = clampInt(sp.page, 1);
  const pageSize = 10;
  const ranked = await getBestRankedCached().catch(() => ({ items: [] as Awaited<ReturnType<typeof getBestRankedCached>>["items"] }));
  const total = ranked.items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const candidates = ranked.items.slice(start, start + pageSize * 4);

  const enriched = await Promise.all(
    candidates.map(async ({ novel: n, stats: cachedStats }) => {
      const canonical = await fetchNovelByIdAndSlug({ id: n.wtrNovelId, slug: n.slug }).catch(() => null);
      if (canonical && isCanonicalNovelMismatch(n, canonical)) {
        return null;
      }

      const displayNovel = canonical ?? n;
      const [stats, reviews] = await Promise.all([
        cachedStats ?? (await fetchReviewStats(n.serieId).catch(() => null)),
        fetchReviews({ serieId: n.serieId, sort: "most_liked", page: 0 }).catch(() => []),
      ]);

      const best = reviews.find((r) => r.comment) ?? null;

      return {
        novel: displayNovel,
        stats,
        bestReview: best
          ? {
              id: best.id,
              rate: best.rate,
              likes: best.like_count,
              text: best.comment ? normalizeReviewText(best.comment) : null,
            }
          : null,
      };
    }),
  );
  const visible = enriched.filter(Boolean).slice(0, pageSize) as NonNullable<typeof enriched[number]>[];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Best</h1>
        <p className="text-sm text-zinc-400">
          Sorted by a confidence-weighted score. Includes novels with 0 reviews or low ratings too.
        </p>
      </div>

      <div className="grid gap-3">
        {visible.map(({ novel, stats, bestReview }, idx) => (
          <Link
            key={novel.wtrNovelId}
            href={`/novels/${novel.wtrNovelId}/${novel.slug}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-start gap-3 sm:w-[320px]">
                <div className="text-sm font-semibold tabular-nums text-zinc-500">#{start + idx + 1}</div>
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                  {novel.thumbnail ? <NovelThumbnail src={novel.thumbnail} alt="" sizes="64px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-zinc-100 group-hover:underline">
                    {novel.titleEn}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {novel.status === "ongoing" ? "Ongoing" : "Completed"} • {novel.chapterCount} chapters
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-200">
                    <span className="rounded-md bg-zinc-950 px-2 py-1">
                      EN: {(stats?.average_rating ?? novel.rating).toFixed(2)} / 5
                    </span>
                    <span className="rounded-md bg-zinc-950 px-2 py-1">
                      Votes: {stats?.total_votes ?? novel.totalRates}
                    </span>
                    <span className="rounded-md bg-zinc-950 px-2 py-1">
                      ID: {(stats?.average_rating ?? novel.rating).toFixed(2)} / 5
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="text-xs font-medium text-zinc-300">Top review</div>
                {bestReview?.text ? (
                  <ExpandableText
                    text={bestReview.text}
                    minWords={45}
                    preventDefaultClick
                    className="mt-1 text-sm text-zinc-100"
                  />
                ) : (
                  <div className="mt-1 text-sm text-zinc-500">No review comment available.</div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                  {bestReview ? (
                    <>
                      <span className="rounded-md border border-zinc-800 px-2 py-1">
                        Rating: {bestReview.rate}
                      </span>
                      <span className="rounded-md border border-zinc-800 px-2 py-1">
                        Likes: {bestReview.likes}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-md border border-zinc-800 px-2 py-1">No comment</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {visible.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
            Best-ranked novels are temporarily unavailable. Retry in a moment while WTR-LAB refreshes.
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          Page {safePage} / {totalPages} • {total} novels
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/best?page=${Math.max(1, safePage - 1)}`}
            aria-disabled={safePage <= 1}
            className={[
              "rounded-md border border-zinc-800 px-3 py-1 text-sm text-zinc-100",
              safePage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-zinc-900",
            ].join(" ")}
          >
            Prev
          </Link>
          <Link
            href={`/best?page=${Math.min(totalPages, safePage + 1)}`}
            aria-disabled={safePage >= totalPages}
            className={[
              "rounded-md border border-zinc-800 px-3 py-1 text-sm text-zinc-100",
              safePage >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-zinc-900",
            ].join(" ")}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
