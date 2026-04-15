"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { NovelDatasetItem } from "@/lib/wtr/transform";
import { ExpandableText } from "@/app/_components/ExpandableText";
import { readApiErrorMessage } from "@/lib/client-api";

type Tag = { id: number; title: string; slug: string; category: string; count: number };

type ApiResponse = {
  items: Array<NovelDatasetItem & { rating?: number | null; totalRates?: number | null }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function toNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    sp.set(k, v);
  }
  return sp.toString();
}

function formatStatus(value: string) {
  if (value === "ongoing") return "Ongoing";
  if (value === "completed") return "Completed";
  return "Ongoing + Completed";
}

export function NovelExplorer({ allTags }: { allTags: Tag[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(() => {
    const tags = (searchParams.get("tags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "",
      tags,
      tagMode: searchParams.get("tagMode") ?? "and",
      minRating: toNumber(searchParams.get("minRating"), 0),
      minChapters: toNumber(searchParams.get("minChapters"), 0),
      maxChapters: toNumber(searchParams.get("maxChapters"), 0),
      sort: searchParams.get("sort") ?? "updated",
      page: toNumber(searchParams.get("page"), 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagMode, setTagMode] = useState(initial.tagMode);
  const [minRating, setMinRating] = useState(initial.minRating);
  const [minChapters, setMinChapters] = useState(initial.minChapters);
  const [maxChapters, setMaxChapters] = useState(initial.maxChapters);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showDescriptions = sort === "best" || sort === "rating";

  const queryString = useMemo(() => {
    return buildQuery({
      q: q.trim() || undefined,
      status: status || undefined,
      tags: tags.length ? tags.join(",") : undefined,
      tagMode: tagMode === "or" ? "or" : undefined,
      minRating: minRating ? String(minRating) : undefined,
      minChapters: minChapters ? String(minChapters) : undefined,
      maxChapters: maxChapters ? String(maxChapters) : undefined,
      sort: sort !== "updated" ? sort : undefined,
      page: page !== 1 ? String(page) : undefined,
      pageSize: "10",
    });
  }, [maxChapters, minChapters, minRating, page, q, sort, status, tagMode, tags]);

  useEffect(() => {
    router.replace(`/?${queryString}`, { scroll: false });
  }, [queryString, router]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/novels?${queryString}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await readApiErrorMessage(res));
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString]);

  const tagOptions = useMemo(() => [...allTags].sort((a, b) => a.title.localeCompare(b.title)), [allTags]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagCategory, setTagCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set(tagOptions.map((t) => t.category));
    return ["All", ...Array.from(set.values()).sort()];
  }, [tagOptions]);

  const filteredTagOptions = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    return tagOptions.filter((t) => {
      if (tagCategory !== "All" && t.category !== tagCategory) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
    });
  }, [tagCategory, tagOptions, tagSearch]);

  function toggleTag(id: number) {
    setPage(1);
    setTags((prev) => {
      const s = String(id);
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      return [...prev, s];
    });
  }

  function setBest() {
    setPage(1);
    setSort("best");
  }

  const selectedTagTitles = tags
    .map((id) => allTags.find((item) => String(item.id) === id)?.title ?? id)
    .slice(0, 4);

  const activeFilters = [
    q.trim() ? `Query: ${q.trim()}` : null,
    status ? `Status: ${formatStatus(status)}` : null,
    minRating ? `Rating >= ${minRating}` : null,
    minChapters ? `Chapters >= ${minChapters}` : null,
    maxChapters ? `Chapters <= ${maxChapters}` : null,
    tags.length ? `Tags: ${selectedTagTitles.join(", ")}${tags.length > 4 ? ` +${tags.length - 4}` : ""}` : null,
    sort !== "updated" ? `Sort: ${sort}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-[0_24px_80px_-48px_rgba(245,158,11,0.45)] backdrop-blur">
        <div className="border-b border-zinc-800/80 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-sky-500/10 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">Explorer</div>
              <div>
                <div className="text-xl font-semibold text-zinc-50">Find released WTR novels faster</div>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                  Search by title, narrow by tags or chapter count, then jump to the novel page with cleaner metadata and update tracking.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <div className="text-zinc-500">Scope</div>
                <div className="mt-1 font-medium text-zinc-100">Released only</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <div className="text-zinc-500">Statuses</div>
                <div className="mt-1 font-medium text-zinc-100">Ongoing, Completed</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <div className="text-zinc-500">Default page</div>
                <div className="mt-1 font-medium text-zinc-100">10 novels</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                <div className="text-zinc-500">Live source</div>
                <div className="mt-1 font-medium text-zinc-100">WTR-LAB</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Search</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              placeholder="Search title or author. Exact titles rank first."
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Status</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Ongoing + Completed</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Sort</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="updated">Recently updated</option>
                <option value="rating">Rating</option>
                <option value="best">Best reviews</option>
                <option value="chapters">Most chapters</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Min rating</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={minRating}
                onChange={(e) => {
                  setMinRating(Number(e.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Min chapters</span>
              <input
                type="number"
                min={0}
                step={1}
                value={minChapters}
                onChange={(e) => {
                  setMinChapters(Number(e.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Max chapters</span>
              <input
                type="number"
                min={0}
                step={1}
                value={maxChapters}
                onChange={(e) => {
                  setMaxChapters(Number(e.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={setBest}
              className="h-11 rounded-xl bg-amber-300 px-4 text-sm font-medium text-zinc-950 transition hover:bg-amber-200"
            >
              Best reviews
            </button>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setStatus("");
                setTags([]);
                setMinRating(0);
                setMinChapters(0);
                setMaxChapters(0);
                setSort("updated");
                setPage(1);
              }}
              className="h-11 rounded-xl border border-zinc-800 px-4 text-sm text-zinc-100 transition hover:bg-zinc-900"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Active filters</span>
            {activeFilters.length ? (
              activeFilters.map((filter) => (
                <span key={filter} className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300">
                  {filter}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">No filters applied. Showing the latest browse feed.</span>
            )}
          </div>

          <div className="text-xs font-medium text-zinc-300">Tags</div>
          <div className="mt-2 grid gap-3 md:grid-cols-[140px_1fr]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Mode</span>
              <select
                value={tagMode}
                onChange={(e) => {
                  setTagMode(e.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="and">And</option>
                <option value="or">Or</option>
              </select>
            </label>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagCategory(c)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    c === tagCategory
                        ? "border-amber-300 bg-amber-300 text-zinc-950"
                        : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900",
                  ].join(" ")}
                >
                  {c}
                </button>
              ))}
            </div>

              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Search tags. Example: System, Female Protagonist, Revenge"
              />

              <div className="max-h-56 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/50">
                {filteredTagOptions.slice(0, 200).map((t) => {
                  const active = tags.includes(String(t.id));
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        active
                          ? "bg-amber-300 text-zinc-950"
                          : "bg-zinc-950 text-zinc-100 hover:bg-zinc-900",
                      ].join(" ")}
                      title={t.category}
                    >
                      <span className="truncate">{t.title}</span>
                      {t.count > 0 ? (
                        <span className={active ? "text-zinc-600" : "text-zinc-500"}>{t.count}</span>
                      ) : null}
                    </button>
                  );
                })}
                {filteredTagOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-400">No tags found.</div>
                ) : null}
              </div>

              {tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 20).map((id) => {
                    const t = allTags.find((x) => String(x.id) === id);
                    return (
                      <button
                        key={id}
                        type="button"
                      onClick={() => toggleTag(Number(id))}
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200 transition hover:bg-zinc-900"
                        title="Remove"
                      >
                        {t?.title ?? id} ✕
                      </button>
                    );
                  })}
              </div>
              ) : (
                <div className="text-xs text-zinc-400">No tags selected.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <div>
          {loading ? "Loading live WTR data…" : error ? "Error" : data ? `${data.total} results` : ""}
          {error ? <span className="ml-2 text-red-600">{error}</span> : null}
        </div>
        {data ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-100 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs">
              Page {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex gap-3">
                <div className="h-24 w-16 rounded-lg bg-zinc-800/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-4/5 rounded bg-zinc-800/80" />
                  <div className="h-3 w-2/5 rounded bg-zinc-800/60" />
                  <div className="h-3 w-3/5 rounded bg-zinc-800/60" />
                  <div className="h-3 w-full rounded bg-zinc-800/50" />
                  <div className="h-3 w-5/6 rounded bg-zinc-800/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-300">
          <div className="text-base font-semibold text-zinc-100">No novels matched this combination.</div>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Try reducing the tag count, lowering the rating threshold, or switching the tag mode from <span className="font-medium text-zinc-200">And</span> to <span className="font-medium text-zinc-200">Or</span>.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.items ?? []).map((n) => (
          <Link
            key={n.wtrNovelId}
            href={`/novels/${n.wtrNovelId}/${n.slug}`}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/65 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.95)] transition hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-zinc-900"
          >
            <div className="flex gap-3">
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                {n.thumbnail ? (
                  <Image
                    src={n.thumbnail}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-semibold leading-6 text-zinc-100 group-hover:text-amber-100">
                  {n.titleEn}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-300">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                    {n.status === "ongoing" ? "Ongoing" : n.status === "completed" ? "Completed" : "Other"}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                    {n.chapterCount} chapters
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-300">
                  <span className="rounded-full bg-amber-300/15 px-2 py-1 text-amber-100">
                    Rating {(Number(n.rating ?? 0)).toFixed(2)}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-2 py-1">
                    {Number(n.totalRates ?? 0)} votes
                  </span>
                </div>
                {showDescriptions ? (
                  <ExpandableText
                    text={n.descriptionEn ?? "—"}
                    minWords={28}
                    preventDefaultClick
                    className="mt-3 text-xs leading-6 text-zinc-300"
                  />
                ) : null}
                {showDescriptions ? (
                  <div className="mt-3 text-[11px] text-zinc-500">
                    EN: {(Number(n.rating ?? 0)).toFixed(2)} / 5 • ID: {(Number(n.rating ?? 0)).toFixed(2)} / 5
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
