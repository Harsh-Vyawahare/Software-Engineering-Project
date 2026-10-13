/**
 * Calculate Euclidean distance between two 128-dimensional face descriptor vectors
 */
export function calculateDescriptorDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) {
    throw new Error('Descriptor vectors must have the same length (128)');
  }
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Convert descriptor distance into a similarity percentage (0 - 100%)
 * In face-api.js, distance <= 0.6 is considered a match.
 * Distance 0 => 100% match
 * Distance 0.48 => ~80% match
 * Distance >= 0.6 => <=70% match
 */
export function distanceToSimilarityPercentage(distance: number): number {
  // Linear scale mapping distance [0, 0.6] to [100, 70], and > 0.6 falling quickly
  if (distance <= 0) return 100;
  if (distance >= 1.0) return 0;
  // Score function: 100 - (distance / 0.6) * 25
  const score = Math.max(0, Math.min(100, 100 - (distance / 0.6) * 25));
  return Math.round(score * 10) / 10;
}
