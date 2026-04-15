"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesPanel } from "@/app/settings/favorites-panel";

describe("FavoritesPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("removes a favorite from the list after a successful unfavorite toggle", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            favorites: [
              {
                wtrNovelId: 11949,
                slug: "after-being-dumped-i-bound-to-the-godly-rich-system-and-i-signed-in-to-become-beautiful",
                titleEn:
                  "After Being Dumped, I Bound to the Godly Rich System, and I Signed in to Become Beautiful",
                titleId: null,
                lastNotifiedChapterOrder: 0,
                updatedAt: "2026-04-14T00:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isFavorite: false }), {
          status: 200,
        }),
      );

    render(<FavoritesPanel />);

    expect(
      await screen.findByText(
        "After Being Dumped, I Bound to the Godly Rich System, and I Signed in to Become Beautiful",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.queryByText(/After Being Dumped/i)).not.toBeInTheDocument();
      expect(screen.getByText("No favorites yet.")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/favorites/toggle",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
