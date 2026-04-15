export function normalizeTitleKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleOverlap(a: string, b: string) {
  const aTokens = new Set(normalizeTitleKey(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeTitleKey(b).split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let shared = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) shared++;
  }
  return shared / Math.max(aTokens.size, bTokens.size);
}

export function isCanonicalNovelMismatch(
  listed: { slug: string; titleEn: string },
  canonical: { slug: string; titleEn: string },
) {
  return canonical.slug !== listed.slug && titleOverlap(canonical.titleEn, listed.titleEn) < 0.35;
}

