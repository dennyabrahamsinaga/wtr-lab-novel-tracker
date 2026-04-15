"use client";

import { useState } from "react";
import { readApiErrorMessage } from "@/lib/client-api";

export function FavoriteButton({
  initialIsFavorite,
  disabled,
  payload,
}: {
  initialIsFavorite: boolean;
  disabled: boolean;
  payload: { wtrNovelId: number; slug: string; titleEn: string; titleId?: string };
}) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiErrorMessage(res));
      const json = (await res.json()) as { isFavorite: boolean };
      setIsFavorite(json.isFavorite);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={isFavorite}
        disabled={disabled || loading}
        onClick={toggle}
        className={[
          "h-9 rounded-md px-3 text-sm font-medium",
          disabled
            ? "bg-zinc-900 text-zinc-500"
            : isFavorite
              ? "bg-zinc-100 text-zinc-900"
              : "border border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900",
        ].join(" ")}
      >
        {loading ? "…" : isFavorite ? "Favorited" : "Favorite"}
      </button>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
