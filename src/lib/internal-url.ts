const INTERNAL_QUERY_PARAMS = new Set(["_rsc"]);

export function hasInternalQueryParams(searchParams: URLSearchParams) {
  return Array.from(searchParams.keys()).some((key) => INTERNAL_QUERY_PARAMS.has(key));
}

export function stripInternalQueryParams(searchParams: URLSearchParams) {
  for (const key of INTERNAL_QUERY_PARAMS) {
    searchParams.delete(key);
  }
  return searchParams;
}

export function isHtmlDocumentRequest(headers: { accept?: string | null; secFetchDest?: string | null }) {
  const accept = headers.accept ?? "";
  const secFetchDest = headers.secFetchDest ?? "";

  return accept.includes("text/html") && (secFetchDest === "" || secFetchDest === "document" || secFetchDest === "iframe");
}
