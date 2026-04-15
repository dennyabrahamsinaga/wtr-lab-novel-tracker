import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchNovelPair, toDatasetItem, findSearchHitBySlug } = vi.hoisted(() => ({
  fetchNovelPair: vi.fn(),
  toDatasetItem: vi.fn(),
  findSearchHitBySlug: vi.fn(),
}));

vi.mock("@/lib/wtr/sitemap", () => ({
  fetchNovelPair,
}));

vi.mock("@/lib/wtr/transform", () => ({
  toDatasetItem,
}));

vi.mock("@/lib/wtr/siteSearch", () => ({
  findSearchHitBySlug,
}));

import { fetchNovelByIdAndSlug } from "@/lib/wtr/novel";

describe("fetchNovelByIdAndSlug", () => {
  beforeEach(() => {
    fetchNovelPair.mockReset();
    toDatasetItem.mockReset();
    findSearchHitBySlug.mockReset();
  });

  it("falls back from an internal series id to the public route id", async () => {
    fetchNovelPair.mockResolvedValueOnce(null).mockResolvedValueOnce({ ok: true });
    findSearchHitBySlug.mockResolvedValue({ id: 11681, raw_id: 11949 });
    toDatasetItem.mockReturnValue({
      wtrNovelId: 11949,
      serieId: 11681,
      slug: "after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
    });

    const novel = await fetchNovelByIdAndSlug({
      id: 11681,
      slug: "after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
    });

    expect(fetchNovelPair).toHaveBeenNthCalledWith(
      1,
      "https://www.wtr-lab.com/en/novel/11681/after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
    );
    expect(fetchNovelPair).toHaveBeenNthCalledWith(
      2,
      "https://www.wtr-lab.com/en/novel/11949/after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
    );
    expect(novel?.wtrNovelId).toBe(11949);
    expect(novel?.serieId).toBe(11681);
  });

  it("keeps the direct result when the slug already matches", async () => {
    fetchNovelPair.mockResolvedValue({ ok: true });
    toDatasetItem.mockReturnValue({
      wtrNovelId: 45577,
      serieId: 43969,
      slug: "invincible-he-takes-on-the-empress-as-his-disciple-and-establishes-the-evergreen-immortal-sect",
    });

    const novel = await fetchNovelByIdAndSlug({
      id: 45577,
      slug: "invincible-he-takes-on-the-empress-as-his-disciple-and-establishes-the-evergreen-immortal-sect",
    });

    expect(findSearchHitBySlug).not.toHaveBeenCalled();
    expect(novel?.wtrNovelId).toBe(45577);
  });

  it("returns null instead of redirecting to an unrelated novel when slug recovery fails", async () => {
    fetchNovelPair.mockResolvedValue({ ok: true });
    toDatasetItem.mockReturnValue({
      wtrNovelId: 11428,
      serieId: 11000,
      slug: "shushan-disciples-at-hogwarts",
      titleEn: "Shushan Disciples at Hogwarts",
    });
    findSearchHitBySlug.mockResolvedValue(null);

    const novel = await fetchNovelByIdAndSlug({
      id: 11681,
      slug: "after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
    });

    expect(novel).toBeNull();
  });
});
