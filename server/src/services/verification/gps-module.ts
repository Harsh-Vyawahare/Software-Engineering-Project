import { calculateHaversineDistanceMeters } from '../../utils/geo.js';

export interface GpsCheckResult {
  valid: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  error?: string;
}

export class GpsVerificationModule {
  /**
   * Verifies if the reported GPS coordinates are within the classroom's allowed radius (BR-11)
   */
  verifyLocation(
    studentLat: number,
    studentLon: number,
    classroomLat: number,
    classroomLon: number,
    allowedRadiusMeters: number = 100,
    isMockGpsEnabled: boolean = false
  ): GpsCheckResult {
    if (isMockGpsEnabled) {
      return {
        valid: true,
        distanceMeters: 12.5,
        allowedRadiusMeters,
      };
    }

    const distance = calculateHaversineDistanceMeters(
      studentLat,
      studentLon,
      classroomLat,
      classroomLon
    );

    const roundedDistance = Math.round(distance * 10) / 10;

    if (roundedDistance > allowedRadiusMeters) {
      return {
        valid: false,
        distanceMeters: roundedDistance,
        allowedRadiusMeters,
        error: `You are ${roundedDistance}m away from the classroom. You must be within ${allowedRadiusMeters}m to mark attendance.`,
      };
    }

    return {
      valid: true,
      distanceMeters: roundedDistance,
      allowedRadiusMeters,
    };
  }
}
