import { extractNextData, fetchHtml, normalizeToWww } from "@/lib/wtr/nextData";
import { z } from "zod";
import type { WtrTag } from "@/lib/wtr/types";

const pagePropsSchema = z.object({
  tags: z.object({
    ungrouped: z
      .array(
        z.object({
          value: z.number(),
          label: z.string(),
          category_id: z.number(),
        }),
      )
      .default([]),
    groups: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  }),
});

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function fetchFinderTags(locale: "en" | "id") {
  const url = normalizeToWww(`https://wtr-lab.com/${locale}/novel-finder`);
  const html = await fetchHtml(url);
  const data = extractNextData(html);
  const parsed = pagePropsSchema.parse(data.props?.pageProps);

  const groupById = new Map(parsed.tags.groups.map((g) => [g.id, g.name] as const));
  const tags: WtrTag[] = parsed.tags.ungrouped.map((t) => ({
    id: t.value,
    title: t.label,
    slug: slugify(t.label),
    category_id: t.category_id,
    category_name: groupById.get(t.category_id) ?? "Other",
  }));

  return tags;
}
