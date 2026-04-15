import { fetchNovelPair } from "@/lib/wtr/sitemap";
import { titleOverlap } from "@/lib/wtr/match";
import { toDatasetItem } from "@/lib/wtr/transform";
import { findSearchHitBySlug } from "@/lib/wtr/siteSearch";

function slugToWords(slug: string) {
  return slug.replace(/-/g, " ");
}

function looksRelatedToRequestedSlug(
  requestedSlug: string,
  candidate: { slug: string; titleEn: string },
) {
  if (candidate.slug === requestedSlug) return true;

  const requestedWords = slugToWords(requestedSlug);
  return (
    titleOverlap(requestedWords, slugToWords(candidate.slug)) >= 0.45 ||
    titleOverlap(requestedWords, candidate.titleEn) >= 0.45
  );
}

export async function fetchNovelByIdAndSlug(opts: {
  id: number;
  slug: string;
}) {
  const tried = new Set<number>();

  async function attempt(publicId: number) {
    if (!Number.isFinite(publicId) || tried.has(publicId)) return null;
    tried.add(publicId);

    const enUrl = `https://www.wtr-lab.com/en/novel/${publicId}/${opts.slug}`;
    const pair = await fetchNovelPair(enUrl).catch(() => null);
    if (!pair) return null;
    return toDatasetItem(pair);
  }

  const direct = await attempt(opts.id);
  if (direct && direct.slug === opts.slug) return direct;

  const hit = await findSearchHitBySlug(opts.slug).catch(() => null);
  const resolvedPublicId = Number(hit?.raw_id ?? hit?.id ?? NaN);
  if (Number.isFinite(resolvedPublicId)) {
    const resolved = await attempt(resolvedPublicId);
    if (resolved) return resolved;
  }

  if (direct && looksRelatedToRequestedSlug(opts.slug, direct)) {
    return direct;
  }

  return null;
}
