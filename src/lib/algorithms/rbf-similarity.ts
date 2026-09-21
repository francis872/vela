export type FeatureVector = Record<string, number | null | undefined>;

export type RbfMatch<T> = {
  item: T;
  similarity: number;
  distance: number;
  comparedFeatures: number;
};

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function rbfSimilarity(
  left: FeatureVector,
  right: FeatureVector,
  options?: { sigma?: number; ranges?: Record<string, number> },
) {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => finite(left[key]) && finite(right[key]));
  if (!keys.length) return { similarity: 0, distance: Number.POSITIVE_INFINITY, comparedFeatures: 0 };

  let squared = 0;
  for (const key of keys) {
    const range = Math.max(1e-9, options?.ranges?.[key] ?? 100);
    const delta = ((left[key] as number) - (right[key] as number)) / range;
    squared += delta * delta;
  }
  const distance = Math.sqrt(squared / keys.length);
  const sigma = Math.max(1e-6, options?.sigma ?? 0.35);
  const similarity = Math.exp(-(distance * distance) / (2 * sigma * sigma));
  return {
    similarity: Math.round(similarity * 10000) / 10000,
    distance: Math.round(distance * 10000) / 10000,
    comparedFeatures: keys.length,
  };
}

export function rankRbfMatches<T>(
  target: FeatureVector,
  items: T[],
  vector: (item: T) => FeatureVector,
  options?: { sigma?: number; ranges?: Record<string, number>; minFeatures?: number },
): RbfMatch<T>[] {
  const minFeatures = options?.minFeatures ?? 2;
  return items.map((item) => ({ item, ...rbfSimilarity(target, vector(item), options) }))
    .filter((match) => match.comparedFeatures >= minFeatures)
    .sort((a, b) => b.similarity - a.similarity || a.distance - b.distance);
}
