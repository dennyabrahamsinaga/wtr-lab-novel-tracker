"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!configured) return null;

  return (
    <Link
      href="/api/auth/signin"
      className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 hover:bg-zinc-900"
    >
      Sign in
    </Link>
  );
}
