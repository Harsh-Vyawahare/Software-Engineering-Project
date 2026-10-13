import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SessionService } from '../services/session.service.js';
import { VerificationService } from '../services/verification.service.js';
import { LeaveService } from '../services/leave.service.js';
import { EmailService } from '../services/email.service.js';

const prisma = new PrismaClient();
const verificationService = new VerificationService(prisma);
const emailService = new EmailService();
const leaveService = new LeaveService(prisma, emailService);
let sessionService: SessionService;

export function initFacultyController(sService: SessionService) {
  sessionService = sService;
}

export class FacultyController {
  /**
   * Get Faculty Dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const now = new Date();
    const todayIso = settings?.demoSimulatedDate || now.toISOString().split('T')[0];

    const targetDate = new Date(`${todayIso}T12:00:00Z`);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayOfWeek = dayNames[targetDate.getUTCDay()];

    // Get all sections taught by this faculty
    const sections = await prisma.courseSection.findMany({
      where: { facultyId, isPlaceholder: false },
      include: {
        subject: true,
        classroom: true,
        enrollments: {
          include: { student: { include: { user: true, batch: true } } },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const todaysSections = sections.filter((s) => s.dayOfWeek === currentDayOfWeek);

    // Get today's sessions for these sections
    const sectionIds = todaysSections.map((s) => s.id);
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        courseSectionId: { in: sectionIds },
        date: todayIso,
      },
      include: {
        records: true,
      },
    });

    const sessionBySectionId: Record<string, any> = {};
    for (const sess of sessions) {
      sessionBySectionId[sess.courseSectionId] = sess;
    }

    const todayCards = todaysSections.map((sec) => {
      const sess = sessionBySectionId[sec.id];
      const enrolledCount = sec.enrollments.length;
      const presentCount = sess?.records.filter((r: any) => r.status === 'PRESENT').length ?? 0;

      let sessionStatus = 'NOT_STARTED';
      if (sess) {
        sessionStatus = sess.status; // OPEN | CLOSED
      }

      return {
        sectionId: sec.id,
        sessionId: sess?.id,
        subjectName: sec.subject.name,
        subjectCode: sec.subject.code,
        color: sec.subject.color,
        type: sec.type,
        audienceType: sec.audienceType,
        audienceRef: sec.audienceRef,
        roomName: sec.classroom.name,
        startTime: sec.startTime,
        endTime: sec.endTime,
        enrolledCount,
        presentCount,
        sessionStatus,
        canStart: sessionStatus === 'NOT_STARTED',
      };
    });

    // Pending leave requests for this faculty
    const pendingLeaveCount = await prisma.leaveRequestItem.count({
      where: {
        facultyId,
        status: 'PENDING',
      },
    });

    const openSessions = await prisma.attendanceSession.findMany({
      where: {
        courseSectionId: { in: sections.map((s) => s.id) },
        status: 'OPEN',
      },
    });
    const openSessionMap = new Map(openSessions.map((os) => [os.courseSectionId, os.id]));

    // 5 Key Subjects requested by user: AISC, DC, SE, CNS, TOC
    const targetCodes = ['AISC', 'DC', 'SE', 'CNS', 'TOC'];
    const quickLaunchSubjects: any[] = [];

    for (const code of targetCodes) {
      const sec = await prisma.courseSection.findFirst({
        where: {
          subject: { code },
          isPlaceholder: false,
        },
        include: {
          subject: true,
          classroom: true,
          enrollments: true,
        },
        orderBy: [
          { audienceType: 'asc' }, // prefers DIVISION over BATCH
          { startTime: 'asc' },
        ],
      });

      if (sec) {
        const openSess = await prisma.attendanceSession.findFirst({
          where: {
            courseSectionId: sec.id,
            status: 'OPEN',
          },
        });

        quickLaunchSubjects.push({
          code: sec.subject.code,
          name: sec.subject.name,
          color: sec.subject.color,
          sectionId: sec.id,
          audienceRef: sec.audienceRef,
          type: sec.type,
          classroomName: sec.classroom.name,
          enrolledCount: sec.enrollments.length,
          openSessionId: openSess?.id || null,
        });
      }
    }

    return res.json({
      todaySessions: todayCards,
      pendingLeaveCount,
      quickLaunchSubjects,
      allAssignedSections: sections.map((s) => ({
        id: s.id,
        subjectName: s.subject.name,
        subjectCode: s.subject.code,
        type: s.type,
        audienceRef: s.audienceRef,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        classroomName: s.classroom.name,
        enrolledCount: s.enrollments.length,
        openSessionId: openSessionMap.get(s.id) || null,
      })),
      currentDay: currentDayOfWeek,
      currentDate: todayIso,
    });
  }

  /**
   * Start Attendance Session (FR-SESS-01, FR-SESS-02)
   */
  async startSession(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    let { courseSectionId, subjectCode, customDate } = req.body;

    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    if (!courseSectionId && subjectCode) {
      // First try to find section for this subject that belongs to current faculty
      let sec = await prisma.courseSection.findFirst({
        where: {
          subject: { code: subjectCode },
          facultyId: facultyId,
          isPlaceholder: false,
        },
        orderBy: [
          { audienceType: 'asc' },
          { startTime: 'asc' },
        ],
      });
      // If none found specifically for this faculty, pick any active section for this subject
      if (!sec) {
        sec = await prisma.courseSection.findFirst({
          where: {
            subject: { code: subjectCode },
            isPlaceholder: false,
          },
          orderBy: [
            { audienceType: 'asc' },
            { startTime: 'asc' },
          ],
        });
      }
      if (sec) {
        courseSectionId = sec.id;
      }
    }

    if (!courseSectionId) return res.status(400).json({ message: 'courseSectionId or subjectCode is required' });

    try {
      const session = await sessionService.startSession(courseSectionId, facultyId, customDate);
      return res.json({ message: 'Attendance session started', session });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * Get Live Session Screen details & live roster (UI-3)
   */
  async getLiveSessionDetails(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    const { sessionId } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        courseSection: {
          include: {
            subject: true,
            classroom: true,
            enrollments: {
              include: {
                student: {
                  include: {
                    user: true,
                    batch: true,
                  },
                },
              },
            },
          },
        },
        records: true,
      },
    });

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const isDemoMode = settings?.demoMode ?? true;

    // Allow if session belongs to this faculty, or in demo mode, or if user is faculty/admin
    const isOwner = session.courseSection.facultyId === facultyId;
    if (!isOwner && !isDemoMode && req.user?.role !== 'FACULTY' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized: Session belongs to another faculty' });
    }

    const recordByStudentId = new Map(session.records.map((r) => [r.studentId, r]));

    const roster = session.courseSection.enrollments.map((e) => {
      const st = e.student;
      const rec = recordByStudentId.get(st.id);

      let status = 'ABSENT';
      if (session.status === 'OPEN') {
        status = rec ? rec.status : 'PENDING_VERIFICATION';
      } else if (rec) {
        status = rec.status;
      }

      return {
        studentId: st.id,
        rollNumber: st.rollNumber,
        name: st.user.name,
        batch: st.batch.name,
        email: st.user.email,
        status, // PRESENT | ABSENT | EXCUSED | PENDING_VERIFICATION
        method: rec?.method,
        gpsDistanceM: rec?.gpsDistanceM,
        faceScore: rec?.faceScore,
        markedAt: rec?.timestamp,
        manualReason: rec?.manualReason,
      };
    });

    const presentCount = roster.filter((r) => r.status === 'PRESENT').length;
    const totalCount = roster.length;

    // Check if within 24-hour correction window (BR-14)
    let canFacultyEdit = true;
    if (session.status === 'CLOSED' && session.endTime) {
      const hours = (Date.now() - session.endTime.getTime()) / (1000 * 60 * 60);
      canFacultyEdit = hours <= 24;
    }

    return res.json({
      session: {
        id: session.id,
        status: session.status,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        qrCurrentToken: session.qrCurrentToken,
        qrRotatedAt: session.qrRotatedAt,
        subjectName: session.courseSection.subject.name,
        subjectCode: session.courseSection.subject.code,
        type: session.courseSection.type,
        audienceRef: session.courseSection.audienceRef,
        roomName: session.courseSection.classroom.name,
        classroomLat: session.courseSection.classroom.latitude,
        classroomLon: session.courseSection.classroom.longitude,
        allowedRadiusM: session.courseSection.classroom.allowedRadiusM,
      },
      counts: {
        present: presentCount,
        total: totalCount,
        percentage: totalCount > 0 ? Math.round((presentCount / totalCount) * 1000) / 10 : 0,
      },
      canFacultyEdit,
      roster,
    });
  }

  /**
   * Rotate QR Code (BR-10)
   */
  async rotateQr(req: Request, res: Response): Promise<any> {
    const { sessionId } = req.params;
    try {
      const updated = await sessionService.rotateQrCode(sessionId);
      return res.json({ message: 'QR rotated', qrCurrentToken: updated.qrCurrentToken, qrRotatedAt: updated.qrRotatedAt });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * End Session (FR-SESS-03)
   */
  async endSession(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    const { sessionId } = req.params;

    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    try {
      await sessionService.endSession(sessionId, facultyId);
      return res.json({ message: 'Attendance session finalized successfully.' });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * Manual Attendance Override (FR-MAN-01, FR-MAN-02, BR-14)
   */
  async manualMark(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    const { sessionId } = req.params;
    const { studentId, status, reason } = req.body;

    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });
    if (!studentId || !status || !reason) {
      return res.status(400).json({ message: 'studentId, status, and reason are required' });
    }

    try {
      const record = await sessionService.manualMarkAttendance(sessionId, studentId, facultyId, status, reason);
      return res.json({ message: 'Student status updated manually', record });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * Get faculty leave inbox
   */
  async getLeaveInbox(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    const items = await prisma.leaveRequestItem.findMany({
      where: { facultyId },
      include: {
        courseSection: { include: { subject: true, classroom: true } },
        leaveRequest: {
          include: {
            student: { include: { user: true, batch: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    return res.json({ leaveItems: items });
  }

  /**
   * Review leave item (approve / reject with mandatory comment) (FR-LV-03)
   */
  async reviewLeave(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    const { itemId } = req.params;
    const { status, comment } = req.body;

    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });
    }

    try {
      const updated = await leaveService.reviewLeaveItem(itemId, facultyId, status, comment);
      return res.json({ message: `Leave item ${status.toLowerCase()} successfully`, updated });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * Faculty Timetable
   */
  async getTimetable(req: Request, res: Response): Promise<any> {
    const facultyId = req.user?.id;
    if (!facultyId) return res.status(401).json({ message: 'Unauthorized' });

    const sections = await prisma.courseSection.findMany({
      where: { facultyId, isPlaceholder: false },
      include: {
        subject: true,
        classroom: true,
      },
    });

    return res.json({ timetable: sections });
  }
}
