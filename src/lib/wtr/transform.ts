import type { WtrSeriePageProps, WtrTag } from "@/lib/wtr/types";

export type NovelStatus = "ongoing" | "completed" | "other";
export type ReleaseStatus = "released" | "unreleased";

export type NovelDatasetItem = {
  wtrNovelId: number;
  serieId: number;
  slug: string;
  sourceUrlEn: string;
  sourceUrlId: string;
  titleEn: string;
  titleId?: string;
  author?: string;
  descriptionEn?: string;
  descriptionId?: string;
  thumbnail?: string;
  chapterCount: number;
  rating: number;
  totalRates: number;
  inLibrary?: number;
  views?: number;
  status: NovelStatus;
  releaseStatus: ReleaseStatus;
  tagIds: number[];
  tags: { id: number; title: string; slug: string; category: string }[];
  updatedAt?: string;
  lastChapters?: { order: number; title: string; updatedAt: string }[];
};

function toWtrThumbnailUrl(image?: string) {
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

export function mapStatus(code: number): NovelStatus {
  // Derived from WTR-LAB HTML on /en/novel-finder:
  // st-0 => Ongoing, st-1 => Completed, st-3 => Dropped (others may exist).
  if (code === 0) return "ongoing";
  if (code === 1) return "completed";
  return "other";
}

export function mapReleaseStatus(rawStatus: number): ReleaseStatus {
  return rawStatus === 0 ? "released" : "unreleased";
}

function mapTagList(tagIds: number[], tags: WtrTag[]) {
  const byId = new Map(tags.map((t) => [t.id, t] as const));
  return tagIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((t) => ({
      id: t!.id,
      title: t!.title,
      slug: t!.slug,
      category: t!.category_name,
    }));
}

export function toDatasetItem(pair: {
  enUrl: string;
  idUrl: string;
  en: WtrSeriePageProps;
  id: WtrSeriePageProps | null;
}): NovelDatasetItem | null {
  const serie = pair.en.serie.serie_data;
  const status = mapStatus(serie.status);
  const releaseStatus = mapReleaseStatus(serie.raw_status);

  // Requirement: only show Ongoing/Completed + Released
  if (releaseStatus !== "released") return null;
  if (status !== "ongoing" && status !== "completed") return null;

  const titleEn = serie.data.title ?? "Untitled";
  const titleId = pair.id?.serie?.serie_data?.data?.title ?? undefined;

  return {
    wtrNovelId: Number(serie.raw_id ?? serie.id),
    serieId: serie.id,
    slug: serie.slug,
    sourceUrlEn: pair.enUrl,
    sourceUrlId: pair.id ? pair.idUrl : pair.enUrl.replace("/en/novel/", "/id/novel/"),
    titleEn,
    titleId,
    author: serie.data.author ?? serie.author ?? undefined,
    descriptionEn: serie.data.description ?? undefined,
    descriptionId: pair.id?.serie?.serie_data?.data?.description ?? undefined,
    thumbnail: toWtrThumbnailUrl(serie.data.image ?? undefined),
    chapterCount: Number(serie.chapter_count ?? 0),
    rating: Number(serie.rating ?? 0),
    totalRates: Number(serie.total_rate ?? 0),
    inLibrary: typeof serie.in_library === "number" ? serie.in_library : undefined,
    views: typeof serie.view === "number" ? serie.view : undefined,
    status,
    releaseStatus,
    tagIds: serie.tags ?? [],
    tags: mapTagList(serie.tags ?? [], pair.en.tags),
    updatedAt: serie.updated_at,
    lastChapters: pair.en.serie.last_chapters?.map((c) => ({
      order: c.order,
      title: c.title,
      updatedAt: c.updated_at,
    })),
  };
}
