import { extractNextData, fetchHtml, fetchHtmlWithUrl, normalizeToWww } from "@/lib/wtr/nextData";
import type { WtrSeriePageProps } from "@/lib/wtr/types";
import { z } from "zod";

function extractLocs(xml: string) {
  const re = new RegExp("<loc>(.*?)</loc>", "g");
  const locs = [...xml.matchAll(re)].map((m) => m[1]!);
  return locs;
}

export async function fetchNovelIndexFromSitemaps(opts: {
  sitemapIndexUrl: string;
}) {
  const indexXml = await fetchHtml(opts.sitemapIndexUrl);
  const sitemapUrls = extractLocs(indexXml).map(normalizeToWww);

  const novelUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    // only novel sitemaps
    if (!sitemapUrl.includes("/novels/sitemap/")) continue;
    const xml = await fetchHtml(sitemapUrl);
    const urls = extractLocs(xml).map(normalizeToWww);
    for (const u of urls) {
      if (u.includes("/en/novel/")) novelUrls.push(u);
    }
  }

  return Array.from(new Set(novelUrls));
}

const pagePropsSchema = z.object({
  serie: z.object({
    serie_data: z.any(),
    last_chapters: z.array(z.any()).default([]),
  }),
  tags: z.array(z.any()).default([]),
});

export async function fetchNovelPage(url: string): Promise<{
  pageProps: WtrSeriePageProps;
  finalUrl: string;
} | null> {
  const doc = await fetchHtmlWithUrl(url);
  const data = extractNextData(doc.html);
  const pageProps = (data.props?.pageProps ?? null) as unknown;
  const parsed = pagePropsSchema.safeParse(pageProps);
  if (!parsed.success) return null;
  if (!parsed.data.serie) return null;
  return {
    pageProps: parsed.data as unknown as WtrSeriePageProps,
    finalUrl: doc.finalUrl,
  };
}

export async function fetchNovelPageProps(url: string): Promise<WtrSeriePageProps | null> {
  const page = await fetchNovelPage(url);
  return page?.pageProps ?? null;
}

export async function fetchNovelPair(enUrl: string) {
  const normalizedEn = normalizeToWww(enUrl);
  const enPage = await fetchNovelPage(normalizedEn);
  if (!enPage) return null;

  const canonicalEnUrl = enPage.finalUrl;
  const canonicalIdUrl = canonicalEnUrl.replace("/en/novel/", "/id/novel/");
  const idPage = await fetchNovelPage(canonicalIdUrl).catch(() => null);

  return {
    enUrl: canonicalEnUrl,
    idUrl: idPage?.finalUrl ?? canonicalIdUrl,
    en: enPage.pageProps,
    id: idPage?.pageProps ?? null,
  };
}
