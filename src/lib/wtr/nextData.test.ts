import { describe, expect, it } from "vitest";
import { extractNextData, isAllowedWtrUrl } from "@/lib/wtr/nextData";

describe("extractNextData", () => {
  it("extracts __NEXT_DATA__ JSON", () => {
    const html =
      '<html><head></head><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"ok":true}}}</script></body></html>';
    const data = extractNextData(html);
    expect((data.props as { pageProps: { ok: boolean } }).pageProps.ok).toBe(true);
  });

  it("rejects non-WTR hosts for server-side fetches", () => {
    expect(isAllowedWtrUrl("https://www.wtr-lab.com/en/novel/1/example")).toBe(true);
    expect(isAllowedWtrUrl("https://img.wtr-lab.com/example.jpg")).toBe(true);
    expect(isAllowedWtrUrl("https://evil.example.com/redirect")).toBe(false);
  });
});
