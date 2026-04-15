import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UrlSanitizer } from "@/app/_components/UrlSanitizer";

const { usePathname, useSearchParams } = vi.hoisted(() => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname,
  useSearchParams,
}));

describe("UrlSanitizer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes framework-internal _rsc from the visible URL while preserving valid query params", async () => {
    usePathname.mockReturnValue("/");
    useSearchParams.mockReturnValue(new URLSearchParams("pageSize=10&_rsc=abc"));

    window.history.replaceState({}, "", "/?pageSize=10&_rsc=abc");
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(<UrlSanitizer />);

    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith(window.history.state, "", "/?pageSize=10");
    });
  });

  it("does nothing when the URL is already clean", async () => {
    usePathname.mockReturnValue("/settings");
    useSearchParams.mockReturnValue(new URLSearchParams(""));

    window.history.replaceState({}, "", "/settings");
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(<UrlSanitizer />);

    await waitFor(() => {
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });
  });
});
