import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { EnrollmentService } from '../services/enrollment.service.js';
import { runSeed } from '../seed.js';

const prisma = new PrismaClient();
const enrollmentService = new EnrollmentService(prisma);

export class AdminController {
  /**
   * Institution dashboard stats
   */
  async getDashboardStats(req: Request, res: Response): Promise<any> {
    const totalStudents = await prisma.student.count();
    const totalFaculty = await prisma.faculty.count();
    const totalCourses = await prisma.subject.count();
    const totalClassrooms = await prisma.classroom.count();

    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    const minThreshold = settings?.minAttendanceThreshold ?? 75.0;

    // Fetch low attendance students
    const students = await prisma.student.findMany({
      include: {
        user: true,
        batch: true,
        division: true,
        attendanceRecords: {
          where: { session: { status: 'CLOSED' } },
        },
      },
    });

    const atRiskStudents: any[] = [];
    for (const st of students) {
      const total = st.attendanceRecords.length;
      const present = st.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
      const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;
      if (pct < minThreshold && total > 0) {
        atRiskStudents.push({
          id: st.id,
          name: st.user.name,
          rollNumber: st.rollNumber,
          batch: st.batch.name,
          division: st.division.name,
          percentage: pct,
          attended: present,
          total,
        });
      }
    }

    // Live sessions right now
    const openSessions = await prisma.attendanceSession.findMany({
      where: { status: 'OPEN' },
      include: {
        courseSection: {
          include: {
            subject: true,
            faculty: { include: { user: true } },
            classroom: true,
          },
        },
        records: true,
      },
    });

    return res.json({
      counts: {
        students: totalStudents,
        faculty: totalFaculty,
        courses: totalCourses,
        classrooms: totalClassrooms,
        activeSessions: openSessions.length,
      },
      settings,
      atRiskStudents,
      liveSessions: openSessions.map((s) => ({
        id: s.id,
        subjectName: s.courseSection.subject.name,
        type: s.courseSection.type,
        audienceRef: s.courseSection.audienceRef,
        facultyName: s.courseSection.faculty.user.name,
        roomName: s.courseSection.classroom.name,
        presentCount: s.records.filter((r) => r.status === 'PRESENT').length,
        startedAt: s.startTime,
      })),
    });
  }

  /**
   * Preview auto-enrollments & schedule clashes before creating/editing student
   */
  async previewStudentEnrollment(req: Request, res: Response): Promise<any> {
    const { batchName, mdmElective, mdmBatchName } = req.body;
    if (!batchName) return res.status(400).json({ message: 'batchName is required' });

    const allSections = await prisma.courseSection.findMany({
      where: { isPlaceholder: false },
      include: { subject: true, classroom: true, faculty: { include: { user: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const enrolledSections = allSections.filter((sec) => {
      if (sec.audienceType === 'DIVISION' && sec.audienceRef === 'TE D') return true;
      if (sec.audienceType === 'BATCH' && sec.audienceRef === batchName) return true;
      if (sec.audienceType === 'ELECTIVE' && mdmElective && sec.audienceRef === mdmElective) return true;
      if (sec.audienceType === 'ELECTIVE_BATCH' && mdmElective && mdmBatchName && sec.audienceRef === `${mdmElective}_${mdmBatchName}`) return true;
      return false;
    });

    // Check clashes
    const clashes: Array<{ sec1: any; sec2: any; reason: string }> = [];
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    for (let i = 0; i < enrolledSections.length; i++) {
      for (let j = i + 1; j < enrolledSections.length; j++) {
        const s1 = enrolledSections[i];
        const s2 = enrolledSections[j];
        if (s1.dayOfWeek === s2.dayOfWeek) {
          if (Math.max(toMin(s1.startTime), toMin(s2.startTime)) < Math.min(toMin(s1.endTime), toMin(s2.endTime))) {
            clashes.push({
              sec1: s1,
              sec2: s2,
              reason: `Schedule conflict on ${s1.dayOfWeek}: ${s1.subject.name} (${s1.startTime}-${s1.endTime}) overlaps with ${s2.subject.name} (${s2.startTime}-${s2.endTime})`,
            });
          }
        }
      }
    }

    return res.json({
      sections: enrolledSections,
      clashes,
      hasClash: clashes.length > 0,
    });
  }

  /**
   * Add new student (FR-AUTH-01)
   */
  async addStudent(req: Request, res: Response): Promise<any> {
    const { name, uid, email, batchName, mdmElective, mdmBatchName, photoUrl, faceDescriptor } = req.body;

    if (!name || !uid || !email || !batchName) {
      return res.status(400).json({ message: 'Name, UID, Email, and Batch are required' });
    }

    const division = await prisma.division.findFirst({ where: { name: 'TE D' } });
    const batch = await prisma.batch.findFirst({ where: { name: batchName } });
    if (!division || !batch) return res.status(400).json({ message: 'Invalid division or batch' });

    let mdmBatchId: string | null = null;
    if (mdmBatchName) {
      const mb = await prisma.mdmBatch.findFirst({ where: { name: mdmBatchName } });
      if (mb) mdmBatchId = mb.id;
    }

    const defaultHash = await bcrypt.hash('Spit@2026', 10);

    const user = await prisma.user.create({
      data: {
        loginId: uid.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: defaultHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        forcePasswordChange: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        id: user.id,
        rollNumber: uid.trim(),
        divisionId: division.id,
        batchId: batch.id,
        mdmElective: mdmElective || null,
        mdmBatchId,
        referencePhotoUrl: photoUrl || null,
        faceDescriptor: faceDescriptor ? JSON.stringify(faceDescriptor) : null,
      },
    });

    // Auto-derive enrollments
    await enrollmentService.syncStudentEnrollments(student.id);

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        action: 'ADMIN_CREATE_STUDENT',
        targetType: 'STUDENT',
        targetId: student.id,
        details: `Created student ${name} (${uid}) in Batch ${batchName}`,
        ipAddress: req.ip,
      },
    });

    return res.json({ message: 'Student created and auto-enrolled successfully', student });
  }

  /**
   * Get all students
   */
  async getStudents(req: Request, res: Response): Promise<any> {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        batch: true,
        division: true,
        mdmBatch: true,
      },
      orderBy: { rollNumber: 'asc' },
    });
    return res.json({ students });
  }

  /**
   * Update student status (ACTIVE / SUSPENDED / DEACTIVATED) (FR-ADM-01, FR-CRS-05, PRIV-02)
   */
  async updateStudentStatus(req: Request, res: Response): Promise<any> {
    const { studentId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // PRIV-02: If deactivating, delete reference photo and descriptor
    let photoData: any = {};
    if (status === 'DEACTIVATED') {
      photoData = {
        referencePhotoUrl: null,
        faceDescriptor: null,
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: studentId },
        data: { status },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: photoData,
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user?.id,
          actorName: req.user?.name,
          action: 'USER_STATUS_CHANGE',
          targetType: 'USER',
          targetId: studentId,
          details: `Changed status of ${student.user.name} to ${status}${status === 'DEACTIVATED' ? ' (Biometric photo deleted per PRIV-02)' : ''}`,
          ipAddress: req.ip,
        },
      }),
    ]);

    return res.json({ message: `Student status updated to ${status}` });
  }

  /**
   * Reset device binding for a student (Anti-proxy feature)
   */
  async resetDeviceBinding(req: Request, res: Response): Promise<any> {
    const { studentId } = req.params;
    await prisma.student.update({
      where: { id: studentId },
      data: { deviceFingerprint: null, deviceBoundAt: null },
    });
    return res.json({ message: 'Device binding reset successfully' });
  }

  /**
   * Get all faculty
   */
  async getFaculty(req: Request, res: Response): Promise<any> {
    const faculty = await prisma.faculty.findMany({
      include: { user: true, courseSections: { include: { subject: true } } },
      orderBy: { employeeId: 'asc' },
    });
    return res.json({ faculty });
  }

  /**
   * Get all classrooms and update GPS coordinates (FR-CRS-03)
   */
  async getClassrooms(req: Request, res: Response): Promise<any> {
    const classrooms = await prisma.classroom.findMany({ orderBy: { name: 'asc' } });
    return res.json({ classrooms });
  }

  async updateClassroomGps(req: Request, res: Response): Promise<any> {
    const { classroomId } = req.params;
    const { latitude, longitude, allowedRadiusM } = req.body;

    const updated = await prisma.classroom.update({
      where: { id: classroomId },
      data: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        allowedRadiusM: Number(allowedRadiusM),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        action: 'CLASSROOM_GPS_UPDATE',
        targetType: 'CLASSROOM',
        targetId: classroomId,
        details: `Updated GPS to (${latitude}, ${longitude}), radius ${allowedRadiusM}m`,
        ipAddress: req.ip,
      },
    });

    return res.json({ message: 'Classroom GPS coordinates updated successfully', classroom: updated });
  }

  /**
   * Get and update global settings (FR-ADM-03)
   */
  async getSettings(req: Request, res: Response): Promise<any> {
    const settings = await prisma.setting.findUnique({ where: { id: 'global_settings' } });
    return res.json({ settings });
  }

  async updateSettings(req: Request, res: Response): Promise<any> {
    const {
      minAttendanceThreshold,
      qrValiditySeconds,
      gpsRadiusMeters,
      faceMatchThreshold,
      excludeExcusedFromDenominator,
      demoMode,
      demoSimulatedDate,
      demoSimulatedTime,
      demoMockGps,
    } = req.body;

    const updated = await prisma.setting.update({
      where: { id: 'global_settings' },
      data: {
        minAttendanceThreshold: minAttendanceThreshold !== undefined ? Number(minAttendanceThreshold) : undefined,
        qrValiditySeconds: qrValiditySeconds !== undefined ? Number(qrValiditySeconds) : undefined,
        gpsRadiusMeters: gpsRadiusMeters !== undefined ? Number(gpsRadiusMeters) : undefined,
        faceMatchThreshold: faceMatchThreshold !== undefined ? Number(faceMatchThreshold) : undefined,
        excludeExcusedFromDenominator: excludeExcusedFromDenominator !== undefined ? Boolean(excludeExcusedFromDenominator) : undefined,
        demoMode: demoMode !== undefined ? Boolean(demoMode) : undefined,
        demoSimulatedDate: demoSimulatedDate !== undefined ? demoSimulatedDate : undefined,
        demoSimulatedTime: demoSimulatedTime !== undefined ? demoSimulatedTime : undefined,
        demoMockGps: demoMockGps !== undefined ? Boolean(demoMockGps) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        action: 'SETTINGS_UPDATE',
        targetType: 'SETTINGS',
        details: JSON.stringify(req.body),
        ipAddress: req.ip,
      },
    });

    return res.json({ message: 'Settings updated successfully', settings: updated });
  }

  /**
   * Administrative attendance override with audit log (FR-ADM-02, FR-ADM-04)
   */
  async overrideAttendance(req: Request, res: Response): Promise<any> {
    const { recordId, newStatus, justification } = req.body;
    if (!recordId || !newStatus || !justification) {
      return res.status(400).json({ message: 'recordId, newStatus, and justification are required' });
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        student: { include: { user: true } },
        session: { include: { courseSection: { include: { subject: true } } } },
      },
    });

    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    const prevStatus = record.status;

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: newStatus,
        method: 'MANUAL',
        manualReason: `Admin Override: ${justification}`,
        manualMarkedBy: req.user?.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        action: 'ATTENDANCE_OVERRIDE',
        targetType: 'ATTENDANCE_RECORD',
        targetId: recordId,
        details: JSON.stringify({
          studentName: record.student.user.name,
          rollNumber: record.student.rollNumber,
          subject: record.session.courseSection.subject.name,
          date: record.session.date,
          previousStatus: prevStatus,
          newStatus,
          justification,
        }),
        ipAddress: req.ip,
      },
    });

    return res.json({ message: 'Attendance record overridden successfully', record: updated });
  }

  /**
   * Search audit logs (SEC-05)
   */
  async getAuditLogs(req: Request, res: Response): Promise<any> {
    const { search, action, limit = 100 } = req.query;
    const where: any = {};
    if (action) where.action = String(action);
    if (search) {
      where.OR = [
        { actorName: { contains: String(search) } },
        { details: { contains: String(search) } },
        { action: { contains: String(search) } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
    });

    return res.json({ logs });
  }

  /**
   * Reset demo data button (Section 4.1)
   */
  async resetDemoData(req: Request, res: Response): Promise<any> {
    try {
      await runSeed(true);
      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id,
          actorName: req.user?.name,
          action: 'DEMO_DATA_RESET',
          targetType: 'SYSTEM',
          details: 'Demo data was reset to initial factory state',
          ipAddress: req.ip,
        },
      });
      return res.json({ message: 'Demo data has been successfully reset to initial state!' });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Failed to reset demo data' });
    }
  }

  /**
   * Photo approval requests list & decision (FR-AUTH-05)
   */
  async getPhotoRequests(req: Request, res: Response): Promise<any> {
    const requests = await prisma.photoChangeRequest.findMany({
      include: {
        student: { include: { user: true, batch: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ requests });
  }

  async reviewPhotoRequest(req: Request, res: Response): Promise<any> {
    const { requestId } = req.params;
    const { status } = req.body; // APPROVED | REJECTED

    const reqItem = await prisma.photoChangeRequest.findUnique({ where: { id: requestId } });
    if (!reqItem) return res.status(404).json({ message: 'Request not found' });

    await prisma.$transaction(async (tx) => {
      await tx.photoChangeRequest.update({
        where: { id: requestId },
        data: {
          status,
          reviewedBy: req.user?.id,
        },
      });

      if (status === 'APPROVED') {
        await tx.student.update({
          where: { id: reqItem.studentId },
          data: {
            referencePhotoUrl: reqItem.photoUrl,
            faceDescriptor: reqItem.faceDescriptor,
          },
        });
      }
    });

    return res.json({ message: `Photo change request ${status.toLowerCase()} successfully` });
  }
}
