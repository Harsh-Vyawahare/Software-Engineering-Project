import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportController {
  /**
   * Generate attendance report data for a course section and date range (FR-REP-01)
   */
  async getReportData(req: Request, res: Response): Promise<any> {
    const { courseSectionId, startDate, endDate } = req.query;

    if (!courseSectionId) {
      return res.status(400).json({ message: 'courseSectionId is required' });
    }

    const section = await prisma.courseSection.findUnique({
      where: { id: String(courseSectionId) },
      include: {
        subject: true,
        faculty: { include: { user: true } },
        classroom: true,
        enrollments: {
          include: { student: { include: { user: true, batch: true } } },
        },
      },
    });

    if (!section) return res.status(404).json({ message: 'Course section not found' });

    const sessionWhere: any = {
      courseSectionId: String(courseSectionId),
      status: 'CLOSED',
    };
    if (startDate && endDate) {
      sessionWhere.date = {
        gte: String(startDate),
        lte: String(endDate),
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: { records: true },
      orderBy: { date: 'asc' },
    });

    const students = section.enrollments.map((e) => e.student);
    const totalSessions = sessions.length;

    // Student summary
    const studentStats = students.map((st) => {
      let present = 0;
      let absent = 0;
      let excused = 0;

      for (const sess of sessions) {
        const rec = sess.records.find((r) => r.studentId === st.id);
        if (rec) {
          if (rec.status === 'PRESENT') present++;
          else if (rec.status === 'ABSENT') absent++;
          else if (rec.status === 'EXCUSED') excused++;
        } else {
          absent++;
        }
      }

      const denominator = totalSessions - excused;
      const pct = denominator > 0 ? Math.round((present / denominator) * 1000) / 10 : 100.0;

      return {
        studentId: st.id,
        rollNumber: st.rollNumber,
        name: st.user.name,
        batch: st.batch.name,
        email: st.user.email,
        present,
        absent,
        excused,
        percentage: pct,
        isEligible: pct >= 75.0,
      };
    });

    return res.json({
      section: {
        id: section.id,
        subjectName: section.subject.name,
        subjectCode: section.subject.code,
        type: section.type,
        audienceRef: section.audienceRef,
        facultyName: section.faculty.user.name,
        classroomName: section.classroom.name,
        slot: `${section.startTime} - ${section.endTime}`,
        dayOfWeek: section.dayOfWeek,
      },
      totalSessions,
      sessions: sessions.map((s) => ({ id: s.id, date: s.date })),
      students: studentStats,
    });
  }

  /**
   * Export CSV format (FR-REP-02)
   */
  async exportCsv(req: Request, res: Response): Promise<any> {
    const { courseSectionId, startDate, endDate } = req.query;
    if (!courseSectionId) return res.status(400).json({ message: 'courseSectionId is required' });

    const section = await prisma.courseSection.findUnique({
      where: { id: String(courseSectionId) },
      include: {
        subject: true,
        faculty: { include: { user: true } },
        enrollments: {
          include: { student: { include: { user: true, batch: true } } },
        },
      },
    });

    if (!section) return res.status(404).json({ message: 'Course section not found' });

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        courseSectionId: String(courseSectionId),
        status: 'CLOSED',
        ...(startDate && endDate ? { date: { gte: String(startDate), lte: String(endDate) } } : {}),
      },
      include: { records: true },
      orderBy: { date: 'asc' },
    });

    const students = section.enrollments.map((e) => e.student);
    const totalSessions = sessions.length;

    let csv = `SPIT Attend — Attendance Report\r\n`;
    csv += `Subject: ${section.subject.name} (${section.subject.code})\r\n`;
    csv += `Type: ${section.type} | Audience: ${section.audienceRef}\r\n`;
    csv += `Faculty: ${section.faculty.user.name}\r\n`;
    csv += `Total Sessions: ${totalSessions}\r\n\r\n`;

    csv += `Roll Number,Student Name,Batch,Present,Absent,Excused,Attendance %,Exam Eligibility (>=75%)\r\n`;

    for (const st of students) {
      let present = 0;
      let absent = 0;
      let excused = 0;

      for (const sess of sessions) {
        const rec = sess.records.find((r) => r.studentId === st.id);
        if (rec) {
          if (rec.status === 'PRESENT') present++;
          else if (rec.status === 'ABSENT') absent++;
          else if (rec.status === 'EXCUSED') excused++;
        } else {
          absent++;
        }
      }

      const denominator = totalSessions - excused;
      const pct = denominator > 0 ? Math.round((present / denominator) * 1000) / 10 : 100.0;
      const eligible = pct >= 75.0 ? 'ELIGIBLE' : 'DEBARRED / WARNING';

      csv += `"${st.rollNumber}","${st.user.name}","${st.batch.name}",${present},${absent},${excused},${pct}%,${eligible}\r\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SPIT_Attend_${section.subject.code}_${section.type}_Report.csv"`
    );
    return res.send(csv);
  }
}
