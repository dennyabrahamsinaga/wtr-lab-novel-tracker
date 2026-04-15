import { extractNextData, fetchHtml, normalizeToWww } from "@/lib/wtr/nextData";
import { z } from "zod";
import type { WtrSerieData } from "@/lib/wtr/types";

const pagePropsSchema = z.object({
  series: z.array(z.any()).default([]),
  count: z.coerce.number(),
});

export async function fetchNovelListPage(opts: {
  locale: "en" | "id";
  page: number; // 1-based
}) {
  const page = Math.max(1, Math.floor(opts.page));
  const url = normalizeToWww(`https://wtr-lab.com/${opts.locale}/novel-list?page=${page}`);
  const html = await fetchHtml(url);
  const data = extractNextData(html);
  const parsed = pagePropsSchema.parse(data.props?.pageProps);

  return {
    count: parsed.count,
    series: parsed.series as WtrSerieData[],
  };
}
