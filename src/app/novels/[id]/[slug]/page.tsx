import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { COOKIE_SECRET_REQUIRED_MESSAGE, isMissingServerConfigError } from "@/lib/config-errors";
import { prisma } from "@/lib/db";
import {
  STORAGE_NOT_READY_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
  isDatabaseSchemaMissingError,
  isDatabaseUnavailableError,
} from "@/lib/db-errors";
import { FavoriteButton } from "@/app/novels/_components/FavoriteButton";
import { fetchReviews, fetchReviewStats, normalizeReviewText } from "@/lib/wtr/reviews";
import { getPassiveUserId } from "@/lib/user";
import { fetchNovelByIdAndSlug } from "@/lib/wtr/novel";
import { ExpandableText } from "@/app/_components/ExpandableText";
import { NovelThumbnail } from "@/app/_components/NovelThumbnail";

function normalizeText(text?: string | null) {
  return (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export default async function NovelPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  const wtrNovelId = Number(id);
  if (!Number.isFinite(wtrNovelId)) notFound();

  const novel = await fetchNovelByIdAndSlug({ id: wtrNovelId, slug }).catch(() => null);
  if (!novel) {
    const urlEn = `https://www.wtr-lab.com/en/novel/${wtrNovelId}/${slug}`;
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 shadow-[0_24px_80px_-48px_rgba(245,158,11,0.35)]">
          <div className="border-b border-zinc-800 bg-gradient-to-r from-amber-500/12 via-zinc-900 to-sky-500/12 px-6 py-5">
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Reader handoff</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Novel unavailable here</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              WTR-LAB redirected this route before metadata could be extracted. That usually means the novel now uses a different canonical slug, or the page requires a signed-in WTR-LAB session.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="text-sm font-medium text-zinc-100">What you can do</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-400">
                  <p>1. Open the source page on WTR-LAB.</p>
                  <p>2. If WTR-LAB redirects you, copy the final URL.</p>
                  <p>3. Reopen that final URL inside this app to get the correct canonical route.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Requested route</div>
                <div className="mt-2 break-all text-sm text-zinc-300">{urlEn}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <div className="text-sm font-medium text-zinc-100">Next action</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Continue reading on WTR-LAB, then come back with the final canonical route if you want favorites and update tracking to stay aligned.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={urlEn}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-200"
                >
                  Open on WTR-LAB
                </Link>
                <Link
                  href="/"
                  className="inline-flex rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900"
                >
                  Back to browse
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (novel.slug !== slug) {
    redirect(`/novels/${novel.wtrNovelId}/${novel.slug}`);
  }

  const hasIndonesianDescription =
    Boolean(normalizeText(novel.descriptionId)) &&
    normalizeText(novel.descriptionId) !== normalizeText(novel.descriptionEn);

  let userId: string | null = null;
  let favoritesAvailable = true;
  let favoritesMessage: string | null = null;
  try {
    userId = await getPassiveUserId();
  } catch (error) {
    if (isMissingServerConfigError(error)) {
      favoritesAvailable = false;
      favoritesMessage = COOKIE_SECRET_REQUIRED_MESSAGE;
    } else {
      throw error;
    }
  }

  let isFav = false;
  if (userId) {
    try {
      isFav = Boolean(
        await prisma.favorite.findUnique({
          where: { userId_wtrNovelId: { userId, wtrNovelId: novel.wtrNovelId } },
          select: { id: true },
        }),
      );
    } catch (error) {
      if (isMissingServerConfigError(error)) {
        favoritesAvailable = false;
        favoritesMessage = COOKIE_SECRET_REQUIRED_MESSAGE;
      } else if (isDatabaseUnavailableError(error)) {
        favoritesAvailable = false;
        favoritesMessage = STORAGE_UNAVAILABLE_MESSAGE;
      } else if (isDatabaseSchemaMissingError(error)) {
        favoritesAvailable = false;
        favoritesMessage = STORAGE_NOT_READY_MESSAGE;
      } else {
        throw error;
      }
    }
  }

  const [reviewStats, topReviews] = await Promise.all([
    fetchReviewStats(novel.serieId).catch(() => null),
    fetchReviews({ serieId: novel.serieId, sort: "most_liked", page: 0 }).catch(() => []),
  ]);

  const topCommentReviews = topReviews.filter((r) => r.comment).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 shadow-[0_24px_80px_-48px_rgba(245,158,11,0.35)]">
        <div className="border-b border-zinc-800 bg-gradient-to-r from-amber-500/12 via-zinc-900 to-sky-500/12 px-6 py-5">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Novel detail</div>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {novel.thumbnail ? <NovelThumbnail src={novel.thumbnail} alt="" sizes="96px" className="object-cover" /> : null}
          </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{novel.titleEn}</h1>
                {novel.titleId && novel.titleId !== novel.titleEn ? (
                  <div className="text-sm text-zinc-400">ID: {novel.titleId}</div>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1">
                    {novel.status === "ongoing" ? "Ongoing" : novel.status === "completed" ? "Completed" : "Other"}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1">
                    {novel.chapterCount} chapters
                  </span>
                  <span className="rounded-full bg-amber-300/15 px-3 py-1 text-amber-100">
                    Rating {novel.rating.toFixed(2)}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1">
                    {novel.totalRates} votes
                  </span>
                </div>
                {novel.author ? <div className="text-sm text-zinc-400">Author: {novel.author}</div> : null}
                <div className="flex flex-wrap gap-2">
                  {novel.tags.slice(0, 12).map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-200"
                      title={t.category}
                    >
                      {t.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 lg:min-w-72">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Reader actions</div>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                <FavoriteButton
                  initialIsFavorite={isFav}
                  disabled={!favoritesAvailable}
                  payload={{
                    wtrNovelId: novel.wtrNovelId,
                    slug: novel.slug,
                    titleEn: novel.titleEn,
                    titleId: novel.titleId,
                  }}
                />
                <Link
                  href={novel.sourceUrlEn}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-200"
                >
                  Read on WTR-LAB
                </Link>
                <p className="text-xs leading-5 text-zinc-400">
                  Favorites stay linked to this canonical route so new chapter checks and notifications remain aligned.
                </p>
                {!favoritesAvailable && favoritesMessage ? <p className="text-xs leading-5 text-amber-200/90">{favoritesMessage}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="text-sm font-semibold text-zinc-100">Description (EN)</div>
          <ExpandableText className="mt-2 text-sm text-zinc-200" text={novel.descriptionEn ?? "—"} minWords={70} />
          <div className="mt-3 text-xs text-zinc-400">
            Rating (EN): {novel.rating.toFixed(2)} / 5 from {novel.totalRates} ratings
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="text-sm font-semibold text-zinc-100">Deskripsi (ID)</div>
          {hasIndonesianDescription ? (
            <ExpandableText className="mt-2 text-sm text-zinc-200" text={novel.descriptionId ?? "—"} minWords={70} />
          ) : (
            <div className="mt-2 text-sm text-zinc-300">
              Deskripsi bahasa Indonesia belum tersedia dari WTR-LAB untuk novel ini.
            </div>
          )}
          <div className="mt-3 text-xs text-zinc-400">
            Rating (ID): {novel.rating.toFixed(2)} / 5 dari {novel.totalRates} penilaian
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="text-sm font-semibold text-zinc-100">Reviews (from WTR-LAB)</div>
        <div className="mt-2 text-sm text-zinc-200">
          Average: {(reviewStats?.average_rating ?? novel.rating).toFixed(2)} / 5 • Votes:{" "}
          {reviewStats?.total_votes ?? novel.totalRates}
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {topCommentReviews.length ? (
            topCommentReviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-400">
                  Rating: {r.rate} • Likes: {r.like_count}
                </div>
                <ExpandableText
                  className="mt-2 text-xs text-zinc-200"
                  text={normalizeReviewText(r.comment!)}
                  minWords={55}
                />
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400 md:col-span-3">No review comments available for this novel.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="text-sm font-semibold text-zinc-100">Latest chapters (metadata)</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(novel.lastChapters ?? []).map((c) => (
            <div key={c.order} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-xs text-zinc-400">Chapter {c.order}</div>
              <div className="mt-1 line-clamp-2 text-sm text-zinc-100">{c.title}</div>
              <div className="mt-2 text-xs text-zinc-400">Updated: {c.updatedAt}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Note: WTR-LAB disallows crawling chapter pages via <code>robots.txt</code>, so this site does not fetch full
          chapter content.
        </p>
      </div>
    </div>
  );
}
