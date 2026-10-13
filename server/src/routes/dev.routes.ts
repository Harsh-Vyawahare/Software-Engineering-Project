import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service.js';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();
const emailService = new EmailService();
let ioInstance: SocketIOServer | null = null;

export function initDevRoutes(io: SocketIOServer) {
  ioInstance = io;
}

// Dev Mailbox inspection endpoint (CI-2, TBD-04)
router.get('/emails', (req, res) => {
  return res.json({ emails: emailService.getDevMailbox() });
});

router.delete('/emails', (req, res) => {
  emailService.clearDevMailbox();
  return res.json({ message: 'Mailbox cleared' });
});

// Demo Check-in Simulator: animates faculty live roster in real time using real seeded students (Section 7)
router.post('/simulate-checkin', async (req, res): Promise<any> => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      courseSection: {
        include: {
          enrollments: {
            include: { student: { include: { user: true, batch: true } } },
          },
        },
      },
      records: true,
    },
  });

  if (!session || session.status !== 'OPEN') {
    return res.status(400).json({ message: 'Session is not open or does not exist' });
  }

  // Find enrolled students who haven't checked in yet
  const presentStudentIds = new Set(session.records.map((r) => r.studentId));
  const pendingStudents = session.courseSection.enrollments
    .map((e) => e.student)
    .filter((s) => !presentStudentIds.has(s.id));

  if (pendingStudents.length === 0) {
    return res.json({ message: 'All enrolled students have already checked in!' });
  }

  // Pick next pending student
  const student = pendingStudents[0];

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId,
      studentId: student.id,
      status: 'PRESENT',
      method: 'QR_VERIFIED',
      gpsVerified: true,
      gpsDistanceM: 18.4,
      faceScore: 92.5,
      timestamp: new Date(),
    },
  });

  if (ioInstance) {
    ioInstance.to(`session_${sessionId}`).emit('roster_updated', {
      sessionId,
      studentId: student.id,
      rollNumber: student.rollNumber,
      name: student.user.name,
      batch: student.batch.name,
      status: 'PRESENT',
      method: 'QR_VERIFIED',
      gpsDistanceM: 18.4,
      faceScore: 92.5,
      markedAt: record.timestamp,
    });
  }

  return res.json({
    message: `Simulated check-in for ${student.user.name} (${student.rollNumber})`,
    student: {
      id: student.id,
      name: student.user.name,
      rollNumber: student.rollNumber,
      batch: student.batch.name,
    },
  });
});

export default router;
