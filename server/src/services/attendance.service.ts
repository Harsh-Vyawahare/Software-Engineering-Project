import { PrismaClient } from '@prisma/client';

export interface SubjectStats {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  color: string;
  theory: {
    attended: number;
    conducted: number;
    excused: number;
    percentage: number;
  } | null;
  lab: {
    attended: number;
    conducted: number;
    excused: number;
    percentage: number;
  } | null;
  combined: {
    attended: number;
    conducted: number;
    excused: number;
    percentage: number;
  };
  facultyNames: {
    theory?: string;
    lab?: string;
  };
  isBelowThreshold: boolean;
  bunkOMeter: {
    canBunk: number; // how many lectures student can miss while staying >= 75%
    neededToTarget: number; // how many consecutive lectures needed to hit 75% if below
  };
}

export class AttendanceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate detailed attendance breakdown for a student (Theory %, Lab %, Combined %, Overall %)
   */
  async getStudentAttendanceSummary(studentId: string) {
    const settings = await this.prisma.setting.findUnique({
      where: { id: 'global_settings' },
    });
    const minThreshold = settings?.minAttendanceThreshold ?? 75.0;
    const excludeExcused = settings?.excludeExcusedFromDenominator ?? true;

    // Fetch all enrollments for this student
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        courseSection: {
          include: {
            subject: true,
            faculty: { include: { user: true } },
          },
        },
      },
    });

    const sectionIds = enrollments.map((e) => e.courseSectionId);

    // Fetch all sessions and records for these sections
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          courseSectionId: { in: sectionIds },
          status: 'CLOSED', // finalized sessions
        },
      },
      include: {
        session: {
          include: {
            courseSection: {
              include: {
                subject: true,
                faculty: { include: { user: true } },
              },
            },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    // Group records by subject
    const subjectMap: Record<string, {
      subject: any;
      theoryFaculty?: string;
      labFaculty?: string;
      theory: { attended: number; conducted: number; excused: number };
      lab: { attended: number; conducted: number; excused: number };
    }> = {};

    for (const e of enrollments) {
      const sec = e.courseSection;
      const sub = sec.subject;
      if (!subjectMap[sub.id]) {
        subjectMap[sub.id] = {
          subject: sub,
          theory: { attended: 0, conducted: 0, excused: 0 },
          lab: { attended: 0, conducted: 0, excused: 0 },
        };
      }
      if (sec.type === 'LECTURE') {
        subjectMap[sub.id].theoryFaculty = sec.faculty.user.name;
      } else if (sec.type === 'LAB') {
        subjectMap[sub.id].labFaculty = sec.faculty.user.name;
      }
    }

    // Tally records
    let overallAttended = 0;
    let overallConducted = 0;
    let overallExcused = 0;

    for (const r of records) {
      const subId = r.session.courseSection.subjectId;
      const isLab = r.session.courseSection.type === 'LAB';
      const target = isLab ? subjectMap[subId]?.lab : subjectMap[subId]?.theory;

      if (!target) continue;

      target.conducted++;
      overallConducted++;

      if (r.status === 'PRESENT') {
        target.attended++;
        overallAttended++;
      } else if (r.status === 'EXCUSED') {
        target.excused++;
        overallExcused++;
      }
    }

    const calcPct = (attended: number, conducted: number, excused: number) => {
      const denominator = excludeExcused ? conducted - excused : conducted;
      if (denominator <= 0) return 100.0;
      return Math.round((attended / denominator) * 1000) / 10;
    };

    const calcBunkOMeter = (attended: number, conducted: number, excused: number, target: number = 75.0) => {
      const denom = excludeExcused ? conducted - excused : conducted;
      if (denom === 0) return { canBunk: 0, neededToTarget: 0 };
      const currentPct = (attended / denom) * 100;

      if (currentPct >= target) {
        // How many can miss: (attended / (denom + X)) >= (target / 100)
        // attended * 100 >= target * denom + target * X
        // target * X <= attended * 100 - target * denom
        const canBunk = Math.floor((attended * 100 - target * denom) / target);
        return { canBunk: Math.max(0, canBunk), neededToTarget: 0 };
      } else {
        // How many needed consecutively: (attended + Y) / (denom + Y) >= target / 100
        // 100 * attended + 100 * Y >= target * denom + target * Y
        // (100 - target) * Y >= target * denom - 100 * attended
        const needed = Math.ceil((target * denom - 100 * attended) / (100 - target));
        return { canBunk: 0, neededToTarget: Math.max(0, needed) };
      }
    };

    const subjectsSummary: SubjectStats[] = [];

    for (const [subId, data] of Object.entries(subjectMap)) {
      const sub = data.subject;
      const t = data.theory;
      const l = data.lab;

      const theoryStats = sub.hasTheory
        ? {
            attended: t.attended,
            conducted: t.conducted,
            excused: t.excused,
            percentage: calcPct(t.attended, t.conducted, t.excused),
          }
        : null;

      const labStats = sub.hasLab
        ? {
            attended: l.attended,
            conducted: l.conducted,
            excused: l.excused,
            percentage: calcPct(l.attended, l.conducted, l.excused),
          }
        : null;

      const combinedAttended = t.attended + l.attended;
      const combinedConducted = t.conducted + l.conducted;
      const combinedExcused = t.excused + l.excused;
      const combinedPct = calcPct(combinedAttended, combinedConducted, combinedExcused);

      const bunk = calcBunkOMeter(combinedAttended, combinedConducted, combinedExcused, minThreshold);

      subjectsSummary.push({
        subjectId: subId,
        subjectCode: sub.code,
        subjectName: sub.name,
        color: sub.color,
        theory: theoryStats,
        lab: labStats,
        combined: {
          attended: combinedAttended,
          conducted: combinedConducted,
          excused: combinedExcused,
          percentage: combinedPct,
        },
        facultyNames: {
          theory: data.theoryFaculty,
          lab: data.labFaculty,
        },
        isBelowThreshold: combinedPct < minThreshold,
        bunkOMeter: bunk,
      });
    }

    const overallPct = calcPct(overallAttended, overallConducted, overallExcused);
    const overallBunk = calcBunkOMeter(overallAttended, overallConducted, overallExcused, minThreshold);

    return {
      overall: {
        attended: overallAttended,
        conducted: overallConducted,
        excused: overallExcused,
        percentage: overallPct,
        isBelowThreshold: overallPct < minThreshold,
        minThreshold,
        bunkOMeter: overallBunk,
      },
      subjects: subjectsSummary,
    };
  }
}
