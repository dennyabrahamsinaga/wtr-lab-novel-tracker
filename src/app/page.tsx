import { NovelExplorer } from "@/app/_components/NovelExplorer";
import { fetchFinderTags } from "@/lib/wtr/tags";
import { Suspense } from "react";

export default async function Home() {
  const tags = await fetchFinderTags("en").catch(() => []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Browse novels</h1>
        <p className="text-sm text-zinc-400">
          Only <span className="font-medium">Released</span> novels with status{" "}
          <span className="font-medium">Ongoing</span> or <span className="font-medium">Completed</span> are shown.
        </p>
      </div>
      <Suspense
        fallback={<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">Loading novels…</div>}
      >
        <NovelExplorer
          allTags={tags.map((t) => ({ id: t.id, title: t.title, slug: t.slug, category: t.category_name, count: 0 }))}
        />
      </Suspense>
    </div>
  );
}
