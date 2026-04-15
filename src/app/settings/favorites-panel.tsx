"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readApiErrorMessage } from "@/lib/client-api";

type Favorite = {
  wtrNovelId: number;
  slug: string;
  titleEn: string;
  titleId?: string | null;
  lastNotifiedChapterOrder: number;
  updatedAt: string;
};

export function FavoritesPanel() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) throw new Error(await readApiErrorMessage(res));
        const json = (await res.json()) as { favorites: Favorite[] };
        if (!cancelled) setItems(json.favorites);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeFavorite(item: Favorite) {
    setPendingId(item.wtrNovelId);
    setError(null);
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wtrNovelId: item.wtrNovelId,
          slug: item.slug,
          titleEn: item.titleEn,
          titleId: item.titleId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiErrorMessage(res));
      const json = (await res.json()) as { isFavorite: boolean };
      if (json.isFavorite) {
        throw new Error("Favorite removal did not complete.");
      }
      setItems((prev) => prev.filter((entry) => entry.wtrNovelId !== item.wtrNovelId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <div className="text-sm text-zinc-400">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (items.length === 0) return <div className="text-sm text-zinc-400">No favorites yet.</div>;

  return (
    <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
      {items.map((f) => (
        <div key={f.wtrNovelId} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-100">{f.titleEn}</div>
            <div className="mt-0.5 text-xs text-zinc-400">
              Last notified chapter: {f.lastNotifiedChapterOrder}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              disabled={pendingId === f.wtrNovelId}
              onClick={() => void removeFavorite(f)}
              className="text-xs text-zinc-400 underline underline-offset-2 transition hover:text-zinc-100 disabled:opacity-40"
            >
              {pendingId === f.wtrNovelId ? "Removing…" : "Remove"}
            </button>
            <Link
              className="text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
              href={`/novels/${f.wtrNovelId}/${f.slug}`}
            >
              Open
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
