import { cache } from "react";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { NovelDatasetItem } from "@/lib/wtr/transform";
import { bestReviewScore } from "@/lib/wtr/score";

const datasetSchema = z.object({
  generatedAt: z.string().optional(),
  items: z.array(z.any()),
});

const DATA_PATHS = [
  path.join(process.cwd(), "src", "data", "novels.json"),
  path.join(process.cwd(), "src", "data", "novels.sample.json"),
];

function readDataset(): { items: NovelDatasetItem[] } {
  for (const p of DATA_PATHS) {
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const parsed = datasetSchema.parse(JSON.parse(raw));
    return { items: parsed.items as NovelDatasetItem[] };
  }
  return { items: [] };
}

export const getDataset = cache(() => readDataset());

export function getNovelById(wtrNovelId: number) {
  const { items } = getDataset();
  return items.find((n) => n.wtrNovelId === wtrNovelId) ?? null;
}

export type NovelQuery = {
  q?: string;
  tagIds?: number[];
  tagMode?: "and" | "or";
  status?: "ongoing" | "completed";
  minRating?: number;
  minChapters?: number;
  maxChapters?: number;
  sort?: "updated" | "rating" | "chapters" | "best";
  page?: number;
  pageSize?: number;
};

export function queryNovels(query: NovelQuery) {
  const { items } = getDataset();

  const q = (query.q ?? "").trim().toLowerCase();
  const tagIds = query.tagIds ?? [];
  const tagMode = query.tagMode ?? "and";
  const status = query.status;
  const minRating = query.minRating ?? 0;
  const minChapters = query.minChapters ?? 0;
  const maxChapters = query.maxChapters ?? Number.POSITIVE_INFINITY;
  const sort = query.sort ?? "updated";
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? 24));
  const page = Math.max(1, query.page ?? 1);

  let filtered = items.filter((n) => {
    if (status && n.status !== status) return false;
    if (n.rating < minRating) return false;
    if (n.chapterCount < minChapters) return false;
    if (n.chapterCount > maxChapters) return false;
    if (tagIds.length > 0) {
      const ok =
        tagMode === "or"
          ? tagIds.some((id) => n.tagIds.includes(id))
          : tagIds.every((id) => n.tagIds.includes(id));
      if (!ok) return false;
    }
    if (q) {
      const hay = `${n.titleEn} ${n.titleId ?? ""} ${n.author ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered =
    sort === "rating"
      ? filtered.sort((a, b) => (b.rating - a.rating) || (b.totalRates - a.totalRates))
      : sort === "chapters"
        ? filtered.sort((a, b) => b.chapterCount - a.chapterCount)
        : sort === "best"
          ? filtered.sort((a, b) => bestReviewScore(b) - bestReviewScore(a))
          : filtered.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return { items: pageItems, total, page: safePage, pageSize, totalPages };
}

export function getAllTags() {
  const { items } = getDataset();
  const byId = new Map<number, { id: number; title: string; slug: string; category: string; count: number }>();
  for (const n of items) {
    for (const t of n.tags) {
      const cur = byId.get(t.id);
      if (cur) cur.count += 1;
      else byId.set(t.id, { ...t, count: 1 });
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.count - a.count);
}
