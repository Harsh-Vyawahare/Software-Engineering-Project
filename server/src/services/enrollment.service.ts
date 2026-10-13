import { PrismaClient } from '@prisma/client';

export class EnrollmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Derive course sections for a student based on Division, Batch, MDM Elective, and MDM Batch.
   */
  async getDerivedSectionsForStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        division: true,
        batch: true,
        mdmBatch: true,
      },
    });

    if (!student) throw new Error(`Student ${studentId} not found`);

    const sections = await this.prisma.courseSection.findMany({
      where: {
        isPlaceholder: false,
      },
      include: {
        subject: true,
        faculty: { include: { user: true } },
        classroom: true,
      },
    });

    return sections.filter((sec) => {
      // 1. Division Common Lecture
      if (sec.audienceType === 'DIVISION' && sec.audienceRef === student.division.name) {
        return true;
      }
      // 2. Batch Lab
      if (sec.audienceType === 'BATCH' && sec.audienceRef === student.batch.name) {
        return true;
      }
      // 3. MDM Elective Lecture
      if (sec.audienceType === 'ELECTIVE' && student.mdmElective && sec.audienceRef === student.mdmElective) {
        return true;
      }
      // 4. MDM Batch Lab
      if (
        sec.audienceType === 'ELECTIVE_BATCH' &&
        student.mdmElective &&
        student.mdmBatch &&
        sec.audienceRef === `${student.mdmElective}_${student.mdmBatch.name}`
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Sync enrollments in DB for a student
   */
  async syncStudentEnrollments(studentId: string) {
    const derived = await this.getDerivedSectionsForStudent(studentId);

    // Keep manual enrollments, update auto-derived ones
    const existing = await this.prisma.enrollment.findMany({
      where: { studentId },
    });

    const derivedIds = new Set(derived.map((s) => s.id));

    // Delete auto-derived ones that no longer apply
    const toDelete = existing.filter((e) => e.isAutoDerived && !derivedIds.has(e.courseSectionId));
    if (toDelete.length > 0) {
      await this.prisma.enrollment.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }

    // Add new ones
    const existingSectionIds = new Set(existing.map((e) => e.courseSectionId));
    for (const sec of derived) {
      if (!existingSectionIds.has(sec.id)) {
        await this.prisma.enrollment.create({
          data: {
            studentId,
            courseSectionId: sec.id,
            isAutoDerived: true,
          },
        });
      }
    }
  }

  /**
   * Check for schedule clashes before enrolling or changing batch/MDM
   */
  async checkStudentClashes(studentId: string, targetBatchName?: string, targetMdmElective?: string, targetMdmBatchName?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { division: true, batch: true, mdmBatch: true },
    });
    if (!student) throw new Error('Student not found');

    const batchName = targetBatchName || student.batch.name;
    const mdmElective = targetMdmElective !== undefined ? targetMdmElective : student.mdmElective;
    const mdmBatchName = targetMdmBatchName !== undefined ? targetMdmBatchName : student.mdmBatch?.name;

    const allSections = await this.prisma.courseSection.findMany({
      where: { isPlaceholder: false },
      include: { subject: true, classroom: true, faculty: { include: { user: true } } },
    });

    const candidateSections = allSections.filter((sec) => {
      if (sec.audienceType === 'DIVISION' && sec.audienceRef === student.division.name) return true;
      if (sec.audienceType === 'BATCH' && sec.audienceRef === batchName) return true;
      if (sec.audienceType === 'ELECTIVE' && mdmElective && sec.audienceRef === mdmElective) return true;
      if (sec.audienceType === 'ELECTIVE_BATCH' && mdmElective && mdmBatchName && sec.audienceRef === `${mdmElective}_${mdmBatchName}`) return true;
      return false;
    });

    // Check overlaps
    const clashes: Array<{ sec1: any; sec2: any; reason: string }> = [];
    for (let i = 0; i < candidateSections.length; i++) {
      for (let j = i + 1; j < candidateSections.length; j++) {
        const s1 = candidateSections[i];
        const s2 = candidateSections[j];
        if (s1.dayOfWeek === s2.dayOfWeek) {
          if (this.timeOverlaps(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
            clashes.push({
              sec1: s1,
              sec2: s2,
              reason: `Time conflict on ${s1.dayOfWeek}: ${s1.subject.name} (${s1.startTime}-${s1.endTime}) overlaps with ${s2.subject.name} (${s2.startTime}-${s2.endTime})`,
            });
          }
        }
      }
    }
    return clashes;
  }

  private timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMin(start1);
    const e1 = toMin(end1);
    const s2 = toMin(start2);
    const e2 = toMin(end2);
    return Math.max(s1, s2) < Math.min(e1, e2);
  }
}
