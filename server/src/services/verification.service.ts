import { PrismaClient } from '@prisma/client';
import { QrVerificationModule } from './verification/qr-module.js';
import { GpsVerificationModule } from './verification/gps-module.js';
import { FaceVerificationModule } from './verification/face-module.js';

export interface VerifyAttendanceInput {
  qrToken: string;
  studentId: string;
  latitude: number;
  longitude: number;
  liveFaceDescriptor: number[];
  deviceFingerprint?: string;
}

export class VerificationService {
  private qrModule = new QrVerificationModule();
  private gpsModule = new GpsVerificationModule();
  private faceModule = new FaceVerificationModule();

  constructor(private prisma: PrismaClient) {}

  generateQrToken(sessionId: string, courseSectionId: string, secret: string): string {
    return this.qrModule.generateToken(sessionId, courseSectionId, secret);
  }

  /**
   * Complete 3-step verification pipeline (QR -> GPS -> Face) in that exact order.
   * Atomic, transaction-safe database write guarantees student cannot be marked Present twice (REL-01, BR-13, CO-4).
   */
  async processAttendanceVerification(input: VerifyAttendanceInput) {
    const startTime = Date.now();

    // 0. Fetch global settings
    const settings = await this.prisma.setting.findUnique({
      where: { id: 'global_settings' },
    });
    const qrValidity = settings?.qrValiditySeconds ?? 60;
    const gpsRadius = settings?.gpsRadiusMeters ?? 100;
    const faceThreshold = settings?.faceMatchThreshold ?? 80;
    const mockGps = settings?.demoMockGps ?? false;

    // STEP 1: QR Verification
    // First peek payload to identify session
    let decodedJson = '';
    try {
      decodedJson = Buffer.from(input.qrToken, 'base64').toString('utf-8');
    } catch {
      return { success: false, stepFailed: 'QR', message: 'Malformed QR code.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(decodedJson);
    } catch {
      return { success: false, stepFailed: 'QR', message: 'Invalid QR payload format.' };
    }

    const { sessionId, courseSectionId } = parsed;
    if (!sessionId || !courseSectionId) {
      return { success: false, stepFailed: 'QR', message: 'Invalid QR session data.' };
    }

    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        courseSection: {
          include: {
            classroom: true,
            subject: true,
          },
        },
      },
    });

    if (!session || session.status !== 'OPEN') {
      return { success: false, stepFailed: 'QR', message: 'This attendance session is closed or inactive.' };
    }

    const qrCheck = this.qrModule.verifyToken(input.qrToken, session.qrSecret, qrValidity);
    if (!qrCheck.valid) {
      return { success: false, stepFailed: 'QR', message: qrCheck.error || 'Invalid or expired QR code.' };
    }

    // Check enrollment and batch-awareness!
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      include: { batch: true, division: true },
    });

    if (!student) {
      return { success: false, stepFailed: 'QR', message: 'Student record not found.' };
    }

    // Check if enrolled
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseSectionId: {
          studentId: input.studentId,
          courseSectionId: session.courseSectionId,
        },
      },
    });

    if (!enrollment) {
      // Provide detailed friendly batch mismatch message (Section 3)
      if (session.courseSection.type === 'LAB' && session.courseSection.audienceType === 'BATCH') {
        return {
          success: false,
          stepFailed: 'QR',
          message: `This lab is for Batch ${session.courseSection.audienceRef}. Your batch is ${student.batch.name}.`,
        };
      }
      return {
        success: false,
        stepFailed: 'QR',
        message: `You are not enrolled in this section (${session.courseSection.subject.name}).`,
      };
    }

    // Check if student already marked Present (REL-01, BR-13, FR-QR-04)
    const existingRecord = await this.prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: input.studentId,
        },
      },
    });

    if (existingRecord && existingRecord.status === 'PRESENT') {
      return {
        success: false,
        stepFailed: 'QR',
        message: 'You have already been marked Present for this session.',
      };
    }

    // STEP 2: GPS Verification
    const classroom = session.courseSection.classroom;
    const gpsCheck = this.gpsModule.verifyLocation(
      input.latitude,
      input.longitude,
      classroom.latitude,
      classroom.longitude,
      classroom.allowedRadiusM || gpsRadius,
      mockGps
    );

    if (!gpsCheck.valid) {
      return {
        success: false,
        stepFailed: 'GPS',
        message: gpsCheck.error || 'GPS verification failed.',
        distanceMeters: gpsCheck.distanceMeters,
        allowedRadiusMeters: gpsCheck.allowedRadiusMeters,
      };
    }

    // STEP 3: Face Verification
    if (!student.faceDescriptor) {
      return {
        success: false,
        stepFailed: 'FACE',
        message: 'No reference photo found on your account. Please complete biometric enrollment first.',
      };
    }

    let storedDescriptor: number[] = [];
    try {
      storedDescriptor = JSON.parse(student.faceDescriptor);
    } catch {
      return { success: false, stepFailed: 'FACE', message: 'Corrupted stored face template. Please contact admin.' };
    }

    const faceCheck = this.faceModule.verifyFace(input.liveFaceDescriptor, storedDescriptor, faceThreshold);
    if (!faceCheck.valid) {
      return {
        success: false,
        stepFailed: 'FACE',
        message: faceCheck.error || 'Face verification failed.',
        similarityScore: faceCheck.similarityScore,
        threshold: faceCheck.threshold,
      };
    }

    // ALL 3 CHECKS PASSED -> Atomic transaction to record attendance
    const record = await this.prisma.$transaction(
      async (tx) => {
        // Re-verify inside transaction to prevent concurrent race condition (REL-01)
        const existing = await tx.attendanceRecord.findUnique({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId: input.studentId,
            },
          },
        });

        if (existing && existing.status === 'PRESENT') {
          throw new Error('DUPLICATE_PRESENT');
        }

        if (existing) {
          return tx.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              status: 'PRESENT',
              method: 'QR_VERIFIED',
              gpsVerified: true,
              gpsDistanceM: gpsCheck.distanceMeters,
              faceScore: faceCheck.similarityScore,
              timestamp: new Date(),
            },
          });
        } else {
          return tx.attendanceRecord.create({
            data: {
              sessionId,
              studentId: input.studentId,
              status: 'PRESENT',
              method: 'QR_VERIFIED',
              gpsVerified: true,
              gpsDistanceM: gpsCheck.distanceMeters,
              faceScore: faceCheck.similarityScore,
              timestamp: new Date(),
            },
          });
        }
      },
      { maxWait: 20000, timeout: 30000 }
    );

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      recordId: record.id,
      sessionId,
      studentId: input.studentId,
      subjectName: session.courseSection.subject.name,
      roomName: classroom.name,
      distanceMeters: gpsCheck.distanceMeters,
      faceScore: faceCheck.similarityScore,
      timestamp: record.timestamp,
      verificationTimeMs: elapsedMs,
    };
  }
}
