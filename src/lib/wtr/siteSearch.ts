import { z } from "zod";
import { mapStatus } from "@/lib/wtr/transform";
import type { FinderNovel } from "@/lib/wtr/map";
import { toWtrThumbnailUrl } from "@/lib/wtr/map";

const resultSchema = z.object({
  id: z.number(),
  slug: z.string(),
  status: z.number().optional(),
  data: z
    .object({
      title: z.string().optional(),
      author: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      raw: z
        .object({
          title: z.string().optional(),
          author: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  rating: z.number().nullable().optional(),
  total_rate: z.number().nullable().optional(),
  chapter_count: z.number().nullable().optional(),
  in_library: z.number().optional(),
  updated_at: z.string().optional(),
  raw_id: z.number().nullable().optional(),
});

const responseSchema = z.object({
  success: z.boolean(),
  data: z.array(resultSchema).default([]),
});

export type WtrSearchHit = z.infer<typeof resultSchema>;

function normalizeSearchKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function slugToSearchText(slug: string) {
  return slug.replace(/-/g, " ").trim();
}

export async function searchSite(text: string): Promise<WtrSearchHit[]> {
  const q = text.trim();
  if (!q) return [];
  const res = await fetch("https://www.wtr-lab.com/api/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (compatible; WTRNovelUpdates/1.0; +https://vercel.com/)",
    },
    body: JSON.stringify({ text: q }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from /api/search`);
  const json = responseSchema.parse(await res.json());
  return json.data;
}

export function searchHitToNovel(hit: WtrSearchHit): FinderNovel | null {
  const status = mapStatus(hit.status ?? 0);
  if (status !== "ongoing" && status !== "completed") return null;

  return {
    wtrNovelId: Number(hit.raw_id ?? hit.id),
    serieId: hit.id,
    slug: hit.slug,
    titleEn: hit.data?.title?.trim() || "Untitled",
    author: hit.data?.author?.trim() || undefined,
    descriptionEn: hit.data?.description?.trim() || undefined,
    thumbnail: toWtrThumbnailUrl(hit.data?.image),
    chapterCount: Number(hit.chapter_count ?? 0),
    rating: Number(hit.rating ?? 0),
    totalRates: Number(hit.total_rate ?? 0),
    inLibrary: typeof hit.in_library === "number" ? hit.in_library : undefined,
    status,
    releaseStatus: "released",
    tagIds: [],
    tags: [],
    updatedAt: hit.updated_at,
  };
}

export async function findSearchHitBySlug(slug: string) {
  const text = slugToSearchText(slug);
  if (!text) return null;

  const hits = await searchSite(text);
  return (
    hits.find((hit) => hit.slug === slug) ??
    hits.find((hit) => normalizeSearchKey(hit.slug) === normalizeSearchKey(slug)) ??
    null
  );
}
