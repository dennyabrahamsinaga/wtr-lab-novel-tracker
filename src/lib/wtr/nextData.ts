import { z } from "zod";
import type { WtrNextData } from "@/lib/wtr/types";

export function normalizeToWww(url: string) {
  return url.replace("https://wtr-lab.com/", "https://www.wtr-lab.com/");
}

const ALLOWED_WTR_HOSTS = new Set(["wtr-lab.com", "www.wtr-lab.com", "img.wtr-lab.com"]);

export function isAllowedWtrUrl(url: string) {
  try {
    return ALLOWED_WTR_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function assertAllowedWtrUrl(url: string) {
  if (!isAllowedWtrUrl(url)) {
    throw new Error(`Blocked non-WTR URL: ${url}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHtmlWithUrl(url: string, opts?: { retries?: number }) {
  const target = normalizeToWww(url);
  assertAllowedWtrUrl(target);
  const retries = Math.max(0, opts?.retries ?? 2);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signal =
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(15_000)
          : undefined;
      let currentUrl = target;
      let redirects = 0;
      let res: Response | null = null;

      while (redirects <= 5) {
        res = await fetch(currentUrl, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (compatible; WTRNovelUpdates/1.0; +https://vercel.com/)",
          },
          redirect: "manual",
          signal,
        });

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) throw new Error(`Redirect without location for ${currentUrl}`);
          currentUrl = normalizeToWww(new URL(location, currentUrl).toString());
          assertAllowedWtrUrl(currentUrl);
          redirects++;
          continue;
        }

        break;
      }
      if (!res) throw new Error(`Failed to fetch ${target}`);
      if (res.status >= 300 && res.status < 400) {
        throw new Error(`Too many redirects for ${target}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${target}`);

      return {
        html: await res.text(),
        finalUrl: currentUrl,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${target}`);
}

export async function fetchHtml(url: string) {
  const { html } = await fetchHtmlWithUrl(url);
  return html;
}

export function extractNextData(html: string): WtrNextData {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("Missing __NEXT_DATA__");
  const after = html.slice(start + marker.length);
  const end = after.indexOf("</script>");
  if (end === -1) throw new Error("Unterminated __NEXT_DATA__");
  const jsonText = after.slice(0, end);
  return z.unknown().parse(JSON.parse(jsonText)) as WtrNextData;
}
