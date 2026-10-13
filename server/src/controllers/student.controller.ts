import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../services/attendance.service.js';
import { VerificationService } from '../services/verification.service.js';
import { LeaveService } from '../services/leave.service.js';
import { EmailService } from '../services/email.service.js';

const prisma = new PrismaClient();
const attendanceService = new AttendanceService(prisma);
const verificationService = new VerificationService(prisma);
const emailService = new EmailService();
const leaveService = new LeaveService(prisma, emailService);

export class StudentController {
  /**
   * Get Student Dashboard data
   */
  async getDashboard(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        division: true,
        batch: true,
        mdmBatch: true,
      },
    });

    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const summary = await attendanceService.getStudentAttendanceSummary(studentId);

    // Get current date & day of week (accounting for demo simulated time if enabled)
    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const now = new Date();
    const todayIso = settings?.demoSimulatedDate || now.toISOString().split('T')[0];

    // Determine day of week
    const targetDate = new Date(`${todayIso}T12:00:00Z`);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayOfWeek = dayNames[targetDate.getUTCDay()];

    // Today's scheduled sections for THIS student
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        courseSection: {
          include: {
            subject: true,
            faculty: { include: { user: true } },
            classroom: true,
          },
        },
      },
    });

    const todaysSections = enrollments
      .map((e) => e.courseSection)
      .filter((s) => s.dayOfWeek === currentDayOfWeek && !s.isPlaceholder)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Check attendance records for today's sessions
    const sectionIds = todaysSections.map((s) => s.id);
    const todaySessions = await prisma.attendanceSession.findMany({
      where: {
        courseSectionId: { in: sectionIds },
        date: todayIso,
      },
      include: {
        records: {
          where: { studentId },
        },
      },
    });

    const sessionBySectionId: Record<string, any> = {};
    for (const sess of todaySessions) {
      sessionBySectionId[sess.courseSectionId] = sess;
    }

    let liveSessionCard: any = null;
    let nextScheduledCard: any = null;

    const timeline = todaysSections.map((sec) => {
      const sess = sessionBySectionId[sec.id];
      const rec = sess?.records[0];

      let status = 'UPCOMING';
      if (sess && sess.status === 'OPEN') {
        status = rec ? rec.status : 'LIVE';
      } else if (rec) {
        status = rec.status;
      }

      const item = {
        sectionId: sec.id,
        sessionId: sess?.id,
        subjectName: sec.subject.name,
        subjectCode: sec.subject.code,
        color: sec.subject.color,
        type: sec.type,
        audienceRef: sec.audienceRef,
        facultyName: sec.faculty.user.name,
        classroomName: sec.classroom.name,
        startTime: sec.startTime,
        endTime: sec.endTime,
        status, // LIVE | PRESENT | ABSENT | EXCUSED | UPCOMING
        markedAt: rec?.timestamp,
        method: rec?.method,
      };

      // Check if this is currently live
      if (sess && sess.status === 'OPEN') {
        liveSessionCard = {
          ...item,
          isMarked: !!rec,
          qrCurrentToken: sess.qrCurrentToken,
          classroomLat: sec.classroom.latitude,
          classroomLon: sec.classroom.longitude,
          allowedRadiusM: sec.classroom.allowedRadiusM,
        };
      }

      return item;
    });

    // If no session is live, find next upcoming
    if (!liveSessionCard) {
      const currentTimeStr = settings?.demoSimulatedTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const nextUpcoming = todaysSections.find((s) => s.startTime > currentTimeStr);
      if (nextUpcoming) {
        nextScheduledCard = {
          subjectName: nextUpcoming.subject.name,
          subjectCode: nextUpcoming.subject.code,
          type: nextUpcoming.type,
          facultyName: nextUpcoming.faculty.user.name,
          classroomName: nextUpcoming.classroom.name,
          startTime: nextUpcoming.startTime,
          endTime: nextUpcoming.endTime,
        };
      }
    }

    return res.json({
      student: {
        id: student.id,
        name: student.user.name,
        rollNumber: student.rollNumber,
        email: student.user.email,
        division: student.division.name,
        batch: student.batch.name,
        mdmElective: student.mdmElective,
        mdmBatch: student.mdmBatch?.name,
        hasReferencePhoto: !!student.referencePhotoUrl,
        referencePhotoUrl: student.referencePhotoUrl,
      },
      summary,
      liveSessionCard,
      nextScheduledCard,
      todayTimeline: timeline,
      currentDay: currentDayOfWeek,
      currentDate: todayIso,
    });
  }

  /**
   * Enroll reference photo (first-time auto-approved, subsequent requires admin approval FR-AUTH-05)
   */
  async enrollPhoto(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    const { photoUrl, faceDescriptor } = req.body;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });
    if (!photoUrl || !faceDescriptor) {
      return res.status(400).json({ message: 'Photo data and 128-d face descriptor vector are required' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Save reference photo directly on the student record in the system
    await prisma.student.update({
      where: { id: studentId },
      data: {
        referencePhotoUrl: photoUrl,
        faceDescriptor: JSON.stringify(faceDescriptor),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: studentId,
        actorName: req.user?.name,
        action: 'STUDENT_PHOTO_UPDATE',
        targetType: 'STUDENT',
        targetId: studentId,
        details: 'Biometric reference photo enrolled/updated and saved to student profile',
      },
    });

    return res.json({
      message: 'Biometric reference photo saved successfully! Your profile is updated in the system and active across all devices.',
      autoApproved: true,
      referencePhotoUrl: photoUrl,
    });
  }

  /**
   * Submit attendance verification (QR -> GPS -> Face)
   */
  async submitAttendance(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const { qrToken, latitude, longitude, liveFaceDescriptor, deviceFingerprint } = req.body;

    if (!qrToken || latitude === undefined || longitude === undefined || !liveFaceDescriptor) {
      return res.status(400).json({
        message: 'Missing required verification parameters (qrToken, latitude, longitude, liveFaceDescriptor)',
      });
    }

    const result = await verificationService.processAttendanceVerification({
      qrToken,
      studentId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      liveFaceDescriptor,
      deviceFingerprint,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  }

  /**
   * Get attendance history per subject with filtering (FR-PCT-04)
   */
  async getSubjectHistory(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    const { subjectId } = req.params;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          courseSection: { subjectId },
          status: 'CLOSED',
        },
      },
      include: {
        session: {
          include: {
            courseSection: {
              include: {
                classroom: true,
                faculty: { include: { user: true } },
              },
            },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    return res.json({
      subject,
      records: records.map((r) => ({
        id: r.id,
        date: r.session.date,
        type: r.session.courseSection.type,
        status: r.status,
        method: r.method,
        facultyName: r.session.courseSection.faculty.user.name,
        roomName: r.session.courseSection.classroom.name,
        timestamp: r.timestamp,
        gpsDistanceM: r.gpsDistanceM,
        faceScore: r.faceScore,
        manualReason: r.manualReason,
      })),
    });
  }

  /**
   * Submit leave request
   */
  async submitLeave(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const { startDate, endDate, reason, attachmentUrl } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date, and reason are required' });
    }

    try {
      const request = await leaveService.submitLeaveRequest(
        studentId,
        startDate,
        endDate,
        reason,
        attachmentUrl
      );
      return res.json({ message: 'Leave request submitted successfully', request });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || 'Failed to submit leave request' });
    }
  }

  /**
   * Preview affected sessions for date range
   */
  async previewLeave(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate query parameters are required' });
    }

    try {
      const affected = await leaveService.getAffectedSessionsPreview(
        studentId,
        String(startDate),
        String(endDate)
      );
      return res.json({ affected });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  /**
   * Get student's leave requests history
   */
  async getLeaveHistory(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const leaves = await prisma.leaveRequest.findMany({
      where: { studentId },
      include: {
        items: {
          include: {
            courseSection: { include: { subject: true } },
            faculty: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ leaves });
  }

  /**
   * Withdraw pending leave request
   */
  async withdrawLeave(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    const { leaveId } = req.params;

    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.studentId !== studentId) return res.status(403).json({ message: 'Unauthorized' });

    if (leave.status !== 'PENDING') {
      return res.status(400).json({
        message: `Cannot withdraw: Request has already been reviewed (Current status: ${leave.status}).`,
      });
    }

    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'WITHDRAWN' },
    });

    return res.json({ message: 'Leave request withdrawn successfully.' });
  }

  /**
   * Get student personalized week timetable
   */
  async getTimetable(req: Request, res: Response): Promise<any> {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        courseSection: {
          include: {
            subject: true,
            faculty: { include: { user: true } },
            classroom: true,
          },
        },
      },
    });

    return res.json({
      timetable: enrollments.map((e) => e.courseSection),
    });
  }
}
