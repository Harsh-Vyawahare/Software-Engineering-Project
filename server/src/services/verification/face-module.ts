import { calculateDescriptorDistance, distanceToSimilarityPercentage } from '../../utils/face.js';

export interface FaceCheckResult {
  valid: boolean;
  similarityScore: number;
  threshold: number;
  error?: string;
}

export class FaceVerificationModule {
  /**
   * Verifies live captured face descriptor against stored reference descriptor (BR-12)
   */
  verifyFace(
    liveDescriptor: number[],
    storedDescriptor: number[],
    threshold: number = 80.0
  ): FaceCheckResult {
    if (!liveDescriptor || liveDescriptor.length !== 128) {
      return {
        valid: false,
        similarityScore: 0,
        threshold,
        error: 'Invalid live face descriptor. Please ensure your face is clearly visible inside the oval guide.',
      };
    }

    if (!storedDescriptor || storedDescriptor.length !== 128) {
      return {
        valid: false,
        similarityScore: 0,
        threshold,
        error: 'No reference photo enrolled. Please enroll your photo first in your Profile.',
      };
    }

    const distance = calculateDescriptorDistance(liveDescriptor, storedDescriptor);
    const similarityScore = distanceToSimilarityPercentage(distance);

    if (similarityScore < threshold) {
      return {
        valid: false,
        similarityScore,
        threshold,
        error: `Face match score of ${similarityScore}% is below required threshold of ${threshold}%.`,
      };
    }

    return {
      valid: true,
      similarityScore,
      threshold,
    };
  }
}
