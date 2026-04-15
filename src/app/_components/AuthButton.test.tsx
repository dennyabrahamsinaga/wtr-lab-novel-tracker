import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButton } from "@/app/_components/AuthButton";

const { signIn, signOut, useSession } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn,
  signOut,
  useSession,
}));

describe("AuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays hidden when auth is not configured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ configured: false }) }));

    render(<AuthButton />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  it("shows a sign-in action when auth is configured and no session exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ configured: true }) }));
    useSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<AuthButton />);

    const button = await screen.findByRole("button", { name: /sign in/i });
    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith("github");
  });

  it("shows a sign-out action for authenticated users", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ configured: true }) }));
    useSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Test User" } },
      status: "authenticated",
    });

    render(<AuthButton />);

    const button = await screen.findByRole("button", { name: /sign out/i });
    fireEvent.click(button);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
