export function isTrustedMutationRequest(req: Request) {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export function hasValidCronSecret(req: Request, secret?: string | null) {
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
