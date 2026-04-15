import { describe, expect, it } from "vitest";
import { hasInternalQueryParams, isHtmlDocumentRequest, stripInternalQueryParams } from "@/lib/internal-url";

describe("internal URL helpers", () => {
  it("detects framework-internal query parameters", () => {
    expect(hasInternalQueryParams(new URLSearchParams("_rsc=abc&pageSize=10"))).toBe(true);
    expect(hasInternalQueryParams(new URLSearchParams("pageSize=10"))).toBe(false);
  });

  it("strips only internal query parameters", () => {
    const searchParams = new URLSearchParams("_rsc=abc&pageSize=10&sort=best");
    stripInternalQueryParams(searchParams);

    expect(searchParams.toString()).toBe("pageSize=10&sort=best");
  });

  it("recognizes real browser document requests", () => {
    expect(
      isHtmlDocumentRequest({
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
        secFetchDest: "document",
      }),
    ).toBe(true);

    expect(
      isHtmlDocumentRequest({
        accept: "text/x-component",
        secFetchDest: "empty",
      }),
    ).toBe(false);
  });
});
