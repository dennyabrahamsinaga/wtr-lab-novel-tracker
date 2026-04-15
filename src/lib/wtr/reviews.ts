import { z } from "zod";

const reviewStatsSchema = z.object({
  success: z.boolean(),
  ratingStats: z.object({
    total_votes: z.number(),
    average_rating: z.number(),
    distribution: z.record(z.string(), z.number()).optional(),
    distribution_with_comment: z.record(z.string(), z.number()).optional(),
    total_with_comment: z.number().optional(),
  }),
});

const reviewItemSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  serie_id: z.number(),
  rate: z.number(),
  comment: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  like_count: z.number(),
  reply_count: z.number(),
  award_count: z.number(),
  username: z.string().nullable().optional(),
});

const reviewGetSchema = z.object({
  success: z.boolean(),
  data: z.array(reviewItemSchema),
});

export type ReviewStats = z.infer<typeof reviewStatsSchema>["ratingStats"];
export type ReviewItem = z.infer<typeof reviewItemSchema>;

function wtrApi(path: string) {
  // Important: wtr-lab.com may return Cloudflare challenge for server-to-server,
  // but www.wtr-lab.com works for these endpoints.
  return `https://www.wtr-lab.com${path}`;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; WTRNovelUpdates/1.0; +https://vercel.com/)",
      referer: "https://www.wtr-lab.com/",
    },
    // Reuse upstream caching (these endpoints advertise max-age=60).
    cache: "force-cache",
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

export async function fetchReviewStats(serieId: number) {
  const json = await fetchJson(wtrApi(`/api/review/stats?serie_id=${serieId}`));
  const parsed = reviewStatsSchema.parse(json);
  return parsed.ratingStats;
}

export async function fetchReviews(opts: {
  serieId: number;
  page?: number;
  sort?: "most_liked" | "most_recent";
}) {
  const page = opts.page ?? 0;
  const sort = opts.sort ?? "most_liked";
  const json = await fetchJson(
    wtrApi(`/api/review/get?serie_id=${opts.serieId}&page=${page}&sort=${sort}`),
  );
  const parsed = reviewGetSchema.parse(json);
  return parsed.data;
}

export function normalizeReviewText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

