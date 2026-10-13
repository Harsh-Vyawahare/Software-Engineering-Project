import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service.js';

export class LeaveService {
  constructor(
    private prisma: PrismaClient,
    private emailService: EmailService
  ) {}

  /**
   * Preview affected sessions for a given date range based on the student's personalized timetable
   */
  async getAffectedSessionsPreview(studentId: string, startDateStr: string, endDateStr: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            courseSection: {
              include: {
                subject: true,
                faculty: { include: { user: true } },
                classroom: true,
              },
            },
          },
        },
      },
    });

    if (!student) throw new Error('Student not found');

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (end < start) {
      throw new Error('End date cannot be earlier than start date');
    }

    const dayMap: Record<number, string> = {
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
    };

    const holidays = await this.prisma.holiday.findMany();
    const holidayDates = new Set(holidays.map((h) => h.date));

    const affected: Array<{
      date: string;
      section: any;
      facultyName: string;
      subjectName: string;
      slot: string;
      type: string;
    }> = [];

    const curr = new Date(start);
    while (curr <= end) {
      const isoDate = curr.toISOString().split('T')[0];
      const dayNum = curr.getDay();

      if (dayNum >= 1 && dayNum <= 5 && !holidayDates.has(isoDate)) {
        const dayStr = dayMap[dayNum];
        for (const enroll of student.enrollments) {
          const sec = enroll.courseSection;
          if (sec.dayOfWeek === dayStr && !sec.isPlaceholder) {
            affected.push({
              date: isoDate,
              section: sec,
              facultyName: sec.faculty.user.name,
              subjectName: sec.subject.name,
              slot: `${sec.startTime} - ${sec.endTime}`,
              type: sec.type,
            });
          }
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    return affected;
  }

  /**
   * Submit leave request and auto-route items to each relevant faculty
   */
  async submitLeaveRequest(studentId: string, startDate: string, endDate: string, reason: string, attachmentUrl?: string) {
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('End date cannot precede start date');
    }

    const affected = await this.getAffectedSessionsPreview(studentId, startDate, endDate);

    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          studentId,
          startDate,
          endDate,
          reason,
          attachmentUrl,
          status: 'PENDING',
        },
      });

      for (const item of affected) {
        await tx.leaveRequestItem.create({
          data: {
            leaveRequestId: request.id,
            courseSectionId: item.section.id,
            sessionDate: item.date,
            facultyId: item.section.facultyId,
            status: 'PENDING',
          },
        });
      }

      return request;
    });
  }

  /**
   * Faculty reviews their portion of a leave request
   */
  async reviewLeaveItem(
    itemId: string,
    facultyId: string,
    status: 'APPROVED' | 'REJECTED',
    comment?: string
  ) {
    const item = await this.prisma.leaveRequestItem.findUnique({
      where: { id: itemId },
      include: {
        courseSection: { include: { subject: true } },
        leaveRequest: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    if (!item) throw new Error('Leave request item not found');
    if (item.facultyId !== facultyId) throw new Error('Unauthorized: Item belongs to another faculty');
    if (status === 'REJECTED' && (!comment || comment.trim().length === 0)) {
      throw new Error('Comment is mandatory when rejecting a leave request');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.leaveRequestItem.update({
        where: { id: itemId },
        data: {
          status,
          comment,
          reviewedAt: new Date(),
        },
      });

      // If approved, mark any matching attendance records on that date as EXCUSED (FR-LV-04)
      if (status === 'APPROVED') {
        const session = await tx.attendanceSession.findFirst({
          where: {
            courseSectionId: item.courseSectionId,
            date: item.sessionDate,
          },
        });

        if (session) {
          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: session.id,
                studentId: item.leaveRequest.studentId,
              },
            },
            update: {
              status: 'EXCUSED',
              method: 'MANUAL',
              manualReason: `Approved leave request #${item.leaveRequestId}: ${comment || 'Excused'}`,
              manualMarkedBy: facultyId,
            },
            create: {
              sessionId: session.id,
              studentId: item.leaveRequest.studentId,
              status: 'EXCUSED',
              method: 'MANUAL',
              manualReason: `Approved leave request #${item.leaveRequestId}: ${comment || 'Excused'}`,
              manualMarkedBy: facultyId,
            },
          });
        }
      }

      // Check all items of parent request to update parent status
      const allItems = await tx.leaveRequestItem.findMany({
        where: { leaveRequestId: item.leaveRequestId },
      });

      const allApproved = allItems.every((i) => i.status === 'APPROVED');
      const allRejected = allItems.every((i) => i.status === 'REJECTED');
      const anyApproved = allItems.some((i) => i.status === 'APPROVED');
      const anyPending = allItems.some((i) => i.status === 'PENDING');

      let parentStatus = 'PENDING';
      if (allApproved) parentStatus = 'APPROVED';
      else if (allRejected) parentStatus = 'REJECTED';
      else if (anyApproved && !anyPending) parentStatus = 'PARTIALLY_APPROVED';
      else if (anyApproved && anyPending) parentStatus = 'PENDING';

      await tx.leaveRequest.update({
        where: { id: item.leaveRequestId },
        data: { status: parentStatus },
      });

      return updatedItem;
    });

    // Send email to student (FR-LV-05, CI-2)
    const studentUser = item.leaveRequest.student.user;
    await this.emailService.sendEmail({
      to: studentUser.email,
      subject: `Leave Request Update: ${item.courseSection.subject.name} (${status})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Leave Request Decision</h2>
          <p>Dear ${studentUser.name},</p>
          <p>Your leave request for <strong>${item.courseSection.subject.name}</strong> on <strong>${item.sessionDate}</strong> has been <strong>${status}</strong>.</p>
          ${comment ? `<p><strong>Faculty Remarks:</strong> ${comment}</p>` : ''}
          <p>You can check your updated attendance status in SPIT Attend.</p>
        </div>
      `,
    });

    return updated;
  }
}
