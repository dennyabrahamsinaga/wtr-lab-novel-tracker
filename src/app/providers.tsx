"use client";

import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

export function Providers({ children }: PropsWithChildren) {
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

  if (configured === false) return <>{children}</>;
  if (configured === null) return <>{children}</>;
  return <SessionProvider>{children}</SessionProvider>;
}
