import type { WtrSerieData, WtrTag } from "@/lib/wtr/types";
import { mapReleaseStatus, mapStatus } from "@/lib/wtr/transform";

export type FinderNovel = {
  wtrNovelId: number;
  serieId: number;
  slug: string;
  titleEn: string;
  author?: string;
  descriptionEn?: string;
  thumbnail?: string;
  chapterCount: number;
  rating: number;
  totalRates: number;
  inLibrary?: number;
  status: "ongoing" | "completed" | "other";
  releaseStatus: "released" | "unreleased";
  tagIds: number[];
  tags: { id: number; title: string; slug: string; category: string }[];
  updatedAt?: string;
};

export function toWtrThumbnailUrl(image?: string) {
  if (!image) return undefined;
  try {
    const url = new URL(image);
    if (url.hostname === "img.wtr-lab.com" && url.pathname.startsWith("/cdn/series/")) {
      const file = url.pathname.split("/").pop();
      if (!file) return undefined;
      const src = file.includes(".") ? `s3://wtrimg/series/${file}` : `series/${file}`;
      return `https://www.wtr-lab.com/api/v2/img?src=${encodeURIComponent(src)}&w=344&q=80`;
    }
  } catch {
    // ignore
  }
  return image;
}

export function mapSerieToNovel(serie: WtrSerieData, tags: WtrTag[]): FinderNovel | null {
  const status = mapStatus(serie.status);
  const releaseStatus = mapReleaseStatus(serie.raw_status);

  if (releaseStatus !== "released") return null;
  if (status !== "ongoing" && status !== "completed") return null;

  const tagById = new Map(tags.map((t) => [t.id, t] as const));
  const tagObjs = (serie.tags ?? [])
    .map((id) => tagById.get(id))
    .filter(Boolean)
    .map((t) => ({
      id: t!.id,
      title: t!.title,
      slug: t!.slug,
      category: t!.category_name,
    }));

  return {
    wtrNovelId: Number(serie.raw_id ?? serie.id),
    serieId: serie.id,
    slug: serie.slug,
    titleEn: serie.data?.title ?? "Untitled",
    author: (serie.data?.author as string | undefined) ?? (serie.author as string | undefined),
    descriptionEn: (serie.data?.description as string | undefined) ?? undefined,
    thumbnail: toWtrThumbnailUrl((serie.data?.image as string | undefined) ?? undefined),
    chapterCount: Number(serie.chapter_count ?? 0),
    rating: Number(serie.rating ?? 0),
    totalRates: Number(serie.total_rate ?? 0),
    inLibrary: typeof serie.in_library === "number" ? serie.in_library : undefined,
    status,
    releaseStatus,
    tagIds: serie.tags ?? [],
    tags: tagObjs,
    updatedAt: serie.updated_at,
  };
}
