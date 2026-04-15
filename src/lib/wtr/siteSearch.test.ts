import { describe, expect, it } from "vitest";
import { searchHitToNovel } from "@/lib/wtr/siteSearch";

describe("searchHitToNovel", () => {
  it("maps WTR search payloads to browseable novels without dropping exact hits", () => {
    const novel = searchHitToNovel({
      id: 43969,
      raw_id: 45577,
      slug: "invincible-he-takes-on-the-empress-as-his-disciple-and-establishes-the-evergreen-immortal-sect",
      status: 0,
      rating: 2.8333333,
      total_rate: 18,
      chapter_count: 277,
      in_library: 416,
      updated_at: "2026-03-21 12:19:13.721255+00",
      data: {
        title: "Invincible: He Takes on the Empress As His Disciple and Establishes the Evergreen Immortal Sect",
        author: "Zhang Wei Xun",
        description: "The protagonist, Lin Daoyuan, was trapped by a system for a million years.",
        image: "https://img.wtr-lab.com/cdn/series/demo.png",
      },
    });

    expect(novel).toMatchObject({
      wtrNovelId: 45577,
      serieId: 43969,
      slug: "invincible-he-takes-on-the-empress-as-his-disciple-and-establishes-the-evergreen-immortal-sect",
      titleEn: "Invincible: He Takes on the Empress As His Disciple and Establishes the Evergreen Immortal Sect",
      author: "Zhang Wei Xun",
      chapterCount: 277,
      rating: 2.8333333,
      totalRates: 18,
      status: "ongoing",
      releaseStatus: "released",
    });
    expect(novel?.thumbnail).toContain("/api/v2/img?");
  });

  it("skips unsupported status values", () => {
    const novel = searchHitToNovel({
      id: 1,
      slug: "dropped-novel",
      status: 3,
      data: { title: "Dropped Novel" },
    });

    expect(novel).toBeNull();
  });
});
