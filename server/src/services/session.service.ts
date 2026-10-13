import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { VerificationService } from './verification.service.js';

export class SessionService {
  constructor(
    private prisma: PrismaClient,
    private verificationService: VerificationService,
    private io?: SocketIOServer
  ) {}

  setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Faculty starts an attendance session (FR-SESS-01, FR-SESS-02)
   */
  async startSession(courseSectionId: string, facultyId: string, customDate?: string) {
    const settings = await this.prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const isDemoMode = settings?.demoMode ?? false;

    const section = await this.prisma.courseSection.findUnique({
      where: { id: courseSectionId },
      include: {
        subject: true,
        classroom: true,
        enrollments: {
          include: {
            student: { include: { user: true, batch: true } },
          },
        },
      },
    });

    if (!section) throw new Error('Course section not found');
    // Allow section faculty, substitute faculty, or demo mode to conduct session


    const now = new Date();
    const dateStr = customDate || (settings?.demoSimulatedDate ? settings.demoSimulatedDate : now.toISOString().split('T')[0]);

    // Check grace window unless in demo mode (FR-SESS-01)
    if (!isDemoMode && !customDate) {
      const dayMap: Record<number, string> = {
        1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY',
      };
      const todayDay = dayMap[now.getDay()];
      if (section.dayOfWeek !== todayDay) {
        throw new Error(`Cannot start session: This class is scheduled on ${section.dayOfWeek}, today is ${todayDay || 'WEEKEND'}`);
      }

      const [startH, startM] = section.startTime.split(':').map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(startH, startM, 0, 0);

      const diffMinutes = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);
      if (diffMinutes < -15 || diffMinutes > 15) {
        throw new Error(
          `Outside permitted 15-minute start window (${section.startTime} ± 15 mins). Current time: ${now.toLocaleTimeString()}`
        );
      }
    }

    // Check FR-SESS-02: Prevent second session for same period on same date
    const existingSession = await this.prisma.attendanceSession.findUnique({
      where: {
        courseSectionId_date: {
          courseSectionId,
          date: dateStr,
        },
      },
    });

    if (existingSession) {
      if (existingSession.status === 'OPEN') {
        return existingSession; // already open
      }
      if (isDemoMode) {
        const qrSecret = crypto.randomBytes(16).toString('hex');
        const newToken = this.verificationService.generateQrToken(existingSession.id, courseSectionId, qrSecret);
        const updated = await this.prisma.attendanceSession.update({
          where: { id: existingSession.id },
          data: {
            status: 'OPEN',
            qrSecret,
            qrCurrentToken: newToken,
            qrRotatedAt: now,
          },
        });
        if (this.io) {
          this.io.emit('session_started', {
            sessionId: updated.id,
            courseSectionId,
            subjectName: section.subject.name,
            type: section.type,
            audienceRef: section.audienceRef,
            roomName: section.classroom.name,
          });
        }
        return updated;
      }
      throw new Error(`A session for this class has already taken place on ${dateStr} (FR-SESS-02).`);
    }

    const qrSecret = crypto.randomBytes(16).toString('hex');
    const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const initialQrToken = this.verificationService.generateQrToken(sessionId, courseSectionId, qrSecret);

    const session = await this.prisma.attendanceSession.create({
      data: {
        id: sessionId,
        courseSectionId,
        date: dateStr,
        startTime: now,
        status: 'OPEN',
        qrSecret,
        qrCurrentToken: initialQrToken,
        qrRotatedAt: now,
      },
    });

    // Notify connected clients that session is live
    if (this.io) {
      this.io.emit('session_started', {
        sessionId: session.id,
        courseSectionId,
        subjectName: section.subject.name,
        type: section.type,
        audienceRef: section.audienceRef,
        roomName: section.classroom.name,
      });
    }

    return session;
  }

  /**
   * Rotate QR token for an open session (FR-QR-02, BR-10)
   */
  async rotateQrCode(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'OPEN') {
      throw new Error('Session is not open');
    }

    const now = new Date();
    const newToken = this.verificationService.generateQrToken(sessionId, session.courseSectionId, session.qrSecret);

    const updated = await this.prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        qrCurrentToken: newToken,
        qrRotatedAt: now,
      },
    });

    if (this.io) {
      this.io.to(`session_${sessionId}`).emit('qr_rotated', {
        sessionId,
        token: newToken,
        rotatedAt: now.toISOString(),
      });
    }

    return updated;
  }

  /**
   * End session and mark unverified enrolled students as Absent (FR-SESS-03)
   */
  async endSession(sessionId: string, facultyId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        courseSection: {
          include: {
            enrollments: true,
          },
        },
        records: true,
      },
    });

    if (!session) throw new Error('Session not found');
    const settings = await this.prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const isDemoMode = settings?.demoMode ?? true;
    if (session.courseSection.facultyId !== facultyId && !isDemoMode && !facultyId) throw new Error('Unauthorized');

    const recordedStudentIds = new Set(session.records.map((r) => r.studentId));

    // Mark remaining enrolled students as ABSENT
    await this.prisma.$transaction(async (tx) => {
      for (const enroll of session.courseSection.enrollments) {
        if (!recordedStudentIds.has(enroll.studentId)) {
          await tx.attendanceRecord.create({
            data: {
              sessionId,
              studentId: enroll.studentId,
              status: 'ABSENT',
              method: 'MANUAL',
            },
          });
        }
      }

      await tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          endTime: new Date(),
        },
      });
    });

    if (this.io) {
      this.io.to(`session_${sessionId}`).emit('session_closed', { sessionId });
      this.io.emit('session_ended', { sessionId });
    }

    return { success: true };
  }

  /**
   * Faculty manual override for an attendance record (FR-MAN-01, FR-MAN-02, BR-14)
   */
  async manualMarkAttendance(
    sessionId: string,
    studentId: string,
    facultyId: string,
    status: 'PRESENT' | 'ABSENT' | 'EXCUSED',
    reason: string
  ) {
    if (!reason || reason.trim().length < 3) {
      throw new Error('A brief reason is required when manually marking attendance (FR-MAN-02).');
    }

    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { courseSection: true },
    });

    if (!session) throw new Error('Session not found');

    // BR-14 check: Faculty can edit within 24 hours of session end
    if (session.status === 'CLOSED' && session.endTime) {
      const hoursSinceEnd = (Date.now() - session.endTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceEnd > 24) {
        throw new Error(
          '24-hour correction window has expired (BR-14). Please contact the Administrator to override this record.'
        );
      }
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      update: {
        status,
        method: 'MANUAL',
        manualReason: reason,
        manualMarkedBy: facultyId,
        timestamp: new Date(),
      },
      create: {
        sessionId,
        studentId,
        status,
        method: 'MANUAL',
        manualReason: reason,
        manualMarkedBy: facultyId,
        timestamp: new Date(),
      },
    });

    // Push realtime update to faculty roster
    if (this.io) {
      this.io.to(`session_${sessionId}`).emit('roster_updated', {
        sessionId,
        studentId,
        status,
        method: 'MANUAL',
        reason,
      });
    }

    return record;
  }
}
