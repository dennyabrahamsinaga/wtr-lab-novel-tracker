"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasInternalQueryParams, stripInternalQueryParams } from "@/lib/internal-url";

export function UrlSanitizer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!hasInternalQueryParams(currentUrl.searchParams)) return;

    stripInternalQueryParams(currentUrl.searchParams);
    const search = currentUrl.searchParams.toString();
    const nextHref = `${pathname}${search ? `?${search}` : ""}${currentUrl.hash}`;
    window.history.replaceState(window.history.state, "", nextHref);
  }, [pathname, searchParams]);

  return null;
}
