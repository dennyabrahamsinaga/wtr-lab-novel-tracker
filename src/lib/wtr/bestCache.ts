import { fetchReviewStats } from "@/lib/wtr/reviews";
import { getWtrIndexCached } from "@/lib/wtr/indexCache";

type BestItem = {
  novel: Awaited<ReturnType<typeof getWtrIndexCached>>["novels"][number];
  stats: { average_rating: number; total_votes: number } | null;
  score: number;
};

type Cache = {
  fetchedAt: number;
  items: BestItem[];
};

const globalForBest = globalThis as unknown as { wtrBest?: Cache };

function scoreFor(novel: { rating: number; totalRates: number; inLibrary?: number }, stats: BestItem["stats"]) {
  const baseRating = stats?.average_rating ?? novel.rating ?? 0;
  const votes = stats?.total_votes ?? novel.totalRates ?? 0;
  const library = novel.inLibrary ?? 0;
  const confidence = Math.log10(votes + 1);
  return baseRating * (1 + confidence) + Math.log10(library + 1);
}

export async function getBestRankedCached(opts?: { maxAgeMs?: number }) {
  const maxAgeMs = opts?.maxAgeMs ?? 30 * 60 * 1000;
  const existing = globalForBest.wtrBest;
  if (existing && Date.now() - existing.fetchedAt < maxAgeMs) return existing;

  const { novels } = await getWtrIndexCached();

  // To keep this fast, only fetch review stats for top candidates by list-based score.
  const candidateCount = Math.max(50, Math.min(800, Number(process.env.BEST_CANDIDATES ?? "300")));
  const prelim = [...novels].sort((a, b) => scoreFor(b, null) - scoreFor(a, null)).slice(0, candidateCount);

  const statsById = new Map<number, BestItem["stats"]>();
  const concurrency = 15;
  let cursor = 0;
  async function worker() {
    while (cursor < prelim.length) {
      const i = cursor++;
      const novel = prelim[i]!;
      if (statsById.has(novel.serieId)) continue;
      const stats = await fetchReviewStats(novel.serieId)
        .then((s) => ({ average_rating: s.average_rating, total_votes: s.total_votes }))
        .catch(() => null);
      statsById.set(novel.serieId, stats);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const items: BestItem[] = novels.map((novel) => {
    const stats = statsById.get(novel.serieId) ?? null;
    const score = scoreFor(novel, stats);
    return { novel, stats, score };
  });

  items.sort((a, b) => b.score - a.score);

  const next: Cache = { fetchedAt: Date.now(), items };
  globalForBest.wtrBest = next;
  return next;
}
