export function bestReviewScore(novel: {
  rating?: number;
  totalRates?: number;
  inLibrary?: number;
}) {
  const rating = novel.rating ?? 0;
  const totalRates = novel.totalRates ?? 0;
  const library = novel.inLibrary ?? 0;

  const confidence = Math.log10(totalRates + 1);
  return rating * (1 + confidence) + Math.log10(library + 1);
}
