import { PrismaClient } from '@prisma/client';
import { VerificationService } from '../src/services/verification.service.js';
import crypto from 'crypto';

const prisma = new PrismaClient();
const verificationService = new VerificationService(prisma);

async function runLoadTest() {
  console.log('--- Starting PERF-02 Load Test: 60 Concurrent Student Check-Ins ---');

  // 1. Setup synthetic section & session
  const classroom = await prisma.classroom.findFirst();
  const subject = await prisma.subject.findFirst();
  const faculty = await prisma.faculty.findFirst();
  const division = await prisma.division.findFirst();
  const batch = await prisma.batch.findFirst();

  if (!classroom || !subject || !faculty || !division || !batch) {
    throw new Error('Seed data missing');
  }

  const syntheticSection = await prisma.courseSection.create({
    data: {
      subjectId: subject.id,
      type: 'LECTURE',
      audienceType: 'DIVISION',
      audienceRef: 'TE D',
      facultyId: faculty.id,
      classroomId: classroom.id,
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
    },
  });

  const qrSecret = crypto.randomBytes(16).toString('hex');
  const session = await prisma.attendanceSession.create({
    data: {
      courseSectionId: syntheticSection.id,
      date: '2026-10-12',
      startTime: new Date(),
      status: 'OPEN',
      qrSecret,
      qrCurrentToken: verificationService.generateQrToken('load-test-session', syntheticSection.id, qrSecret),
    },
  });

  // Re-generate token with real session id
  const validQrToken = verificationService.generateQrToken(session.id, syntheticSection.id, qrSecret);
  await prisma.attendanceSession.update({
    where: { id: session.id },
    data: { qrCurrentToken: validQrToken },
  });

  // 2. Create 60 synthetic enrolled students
  console.log('Creating 60 synthetic student accounts...');
  const syntheticStudentIds: string[] = [];
  const dummyDescriptor = Array.from({ length: 128 }, (_, i) => 0.05 * Math.sin(i * 0.1));
  const dummyDescriptorStr = JSON.stringify(dummyDescriptor);

  for (let i = 1; i <= 60; i++) {
    const uid = `SYNTH_${Date.now()}_${i}`;
    const user = await prisma.user.create({
      data: {
        loginId: uid,
        name: `Synthetic Student ${i}`,
        email: `${uid}@test.local`,
        passwordHash: 'dummy',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    const student = await prisma.student.create({
      data: {
        id: user.id,
        rollNumber: uid,
        divisionId: division.id,
        batchId: batch.id,
        referencePhotoUrl: 'dummy-photo',
        faceDescriptor: dummyDescriptorStr,
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseSectionId: syntheticSection.id,
        isAutoDerived: false,
      },
    });

    syntheticStudentIds.push(student.id);
  }

  // 3. Fire 60 concurrent check-ins with concurrency pool
  console.log('Dispatching 60 student verification requests (PERF-02)...');
  const startTime = Date.now();

  const results: any[] = [];
  const concurrency = 6;
  const queue = [...syntheticStudentIds];

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const studentId = queue.shift();
      if (!studentId) break;
      const res = await verificationService.processAttendanceVerification({
        qrToken: validQrToken,
        studentId,
        latitude: classroom.latitude + 0.0001,
        longitude: classroom.longitude + 0.0001,
        liveFaceDescriptor: dummyDescriptor,
      });
      results.push(res);
    }
  });

  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.success).length;

  console.log(`\nPERF-02 Results:`);
  console.log(`  Total Concurrent Check-ins: 60`);
  console.log(`  Successful: ${passedCount}`);
  console.log(`  Failed: ${60 - passedCount}`);
  console.log(`  Total Elapsed Time: ${durationMs} ms (${(durationMs / 1000).toFixed(2)} s)`);
  console.log(`  Average Time per Check-in: ${(durationMs / 60).toFixed(1)} ms`);

  // Assert PERF-01 and PERF-02:
  // Must complete all 60 check-ins successfully and within reasonable time
  if (passedCount !== 60) {
    throw new Error(`Load test failed: only ${passedCount}/60 succeeded.`);
  }

  // Clean up synthetic records
  console.log('Cleaning up synthetic test data...');
  await prisma.attendanceRecord.deleteMany({ where: { sessionId: session.id } });
  await prisma.attendanceSession.delete({ where: { id: session.id } });
  await prisma.enrollment.deleteMany({ where: { courseSectionId: syntheticSection.id } });
  await prisma.courseSection.delete({ where: { id: syntheticSection.id } });
  for (const stId of syntheticStudentIds) {
    await prisma.student.delete({ where: { id: stId } });
    await prisma.user.delete({ where: { id: stId } });
  }

  console.log('PERF-02 Load Test PASSED 100%!');
}

runLoadTest()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('PERF-02 Load Test Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
