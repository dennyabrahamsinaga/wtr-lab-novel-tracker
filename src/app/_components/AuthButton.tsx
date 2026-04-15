"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

function ConfiguredAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <button
      type="button"
      onClick={() => (session?.user ? signOut({ callbackUrl: "/" }) : signIn("github"))}
      className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 hover:bg-zinc-900"
    >
      {session?.user ? "Sign out" : "Sign in"}
    </button>
  );
}

export function AuthButton() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/auth/config");
        const json = (await res.json()) as { configured: boolean };
        if (!cancelled) setConfigured(Boolean(json.configured));
      } catch {
        if (!cancelled) setConfigured(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!configured) return null;
  return <ConfiguredAuthButton />;
}
