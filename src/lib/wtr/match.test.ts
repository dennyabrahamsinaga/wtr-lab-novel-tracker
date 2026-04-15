import { describe, expect, it } from "vitest";
import { isCanonicalNovelMismatch, titleOverlap } from "@/lib/wtr/match";

describe("title matching", () => {
  it("detects stale canonical redirects that point to a different novel", () => {
    expect(
      isCanonicalNovelMismatch(
        {
          slug: "douluo-dalu-3-huo-yuhao-in-legend-of-dragon-king",
          titleEn: "Douluo Dalu 3: Huo Yuhao in Legend of Dragon King",
        },
        {
          slug: "after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
          titleEn: "After Being Dumped, I Bound to the Godly Rich System, and I Signed in to Become Beautiful",
        },
      ),
    ).toBe(true);
  });

  it("keeps minor canonical slug changes for the same novel", () => {
    expect(
      isCanonicalNovelMismatch(
        {
          slug: "lord-of-mysteries-book-one",
          titleEn: "Lord of Mysteries",
        },
        {
          slug: "lord-of-the-mysteries",
          titleEn: "Lord of the Mysteries",
        },
      ),
    ).toBe(false);
    expect(titleOverlap("Lord of Mysteries", "Lord of the Mysteries")).toBeGreaterThan(0.35);
  });
});

