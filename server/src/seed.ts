import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EnrollmentService } from './services/enrollment.service.js';

const prisma = new PrismaClient();
const enrollmentService = new EnrollmentService(prisma);

export async function runSeed(isReset = false) {
  console.log(`Starting SPIT Attend database seeding (reset: ${isReset})...`);

  // Clear existing if reset requested
  if (isReset) {
    await prisma.attendanceRecord.deleteMany();
    await prisma.attendanceSession.deleteMany();
    await prisma.leaveRequestItem.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.courseSection.deleteMany();
    await prisma.student.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.user.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.mdmBatch.deleteMany();
    await prisma.division.deleteMany();
    await prisma.department.deleteMany();
    await prisma.holiday.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.setting.deleteMany();
  }

  const defaultPasswordHash = await bcrypt.hash('Spit@2026', 10);

  // 1. Settings (FR-ADM-03, BR-1, BR-10, BR-11, BR-12)
  await prisma.setting.upsert({
    where: { id: 'global_settings' },
    update: {},
    create: {
      id: 'global_settings',
      minAttendanceThreshold: 75.0,
      qrValiditySeconds: 60,
      gpsRadiusMeters: 100.0,
      faceMatchThreshold: 80.0,
      excludeExcusedFromDenominator: true,
      demoMode: true,
      demoSimulatedDate: '2026-10-12',
      demoSimulatedTime: '11:15',
      demoMockGps: true,
    },
    update: {
      demoMode: true,
      demoMockGps: true,
    },
  });

  // 2. Department, Division, Batches
  const dept = await prisma.department.upsert({
    where: { code: 'COMP' },
    update: {},
    create: { code: 'COMP', name: 'Computer Engineering' },
  });

  const division = await prisma.division.upsert({
    where: { id: 'division-te-d' },
    update: {},
    create: {
      id: 'division-te-d',
      name: 'TE D',
      semester: 'AY 2026-27 ODD',
      departmentId: dept.id,
    },
  });

  const batchNames = ['D1', 'D2', 'D3', 'D4'];
  const batchMap: Record<string, string> = {};
  for (const bName of batchNames) {
    const b = await prisma.batch.upsert({
      where: { id: `batch-${bName.toLowerCase()}` },
      update: {},
      create: {
        id: `batch-${bName.toLowerCase()}`,
        name: bName,
        divisionId: division.id,
      },
    });
    batchMap[bName] = b.id;
  }

  const mdmBatchNames = ['MDM Batch 1', 'MDM Batch 2', 'MDM Batch 3'];
  const mdmBatchMap: Record<string, string> = {};
  for (let i = 0; i < mdmBatchNames.length; i++) {
    const mbName = mdmBatchNames[i];
    const mb = await prisma.mdmBatch.upsert({
      where: { id: `mdm-batch-${i + 1}` },
      update: {},
      create: {
        id: `mdm-batch-${i + 1}`,
        name: mbName,
      },
    });
    mdmBatchMap[mbName] = mb.id;
  }

  // 3. Admin Account
  await prisma.user.upsert({
    where: { loginId: 'ADMIN001' },
    update: {},
    create: {
      loginId: 'ADMIN001',
      name: 'System Admin',
      email: 'admin@spit.edu.in',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      forcePasswordChange: false,
    },
  });

  // 4. Classrooms (Section 4.4)
  const roomNames = [
    '203', '305', '508', '601', '609', '505', '303',
    '603-2', '603-3', '603-7', '607-B', '702-B', '703-B', '509 old',
  ];
  const roomMap: Record<string, string> = {};
  for (const rName of roomNames) {
    const rm = await prisma.classroom.upsert({
      where: { name: rName },
      update: {},
      create: {
        name: rName,
        latitude: 19.1232,
        longitude: 72.8363,
        allowedRadiusM: 100.0,
      },
    });
    roomMap[rName] = rm.id;
  }

  // 5. Subjects (Section 4.3)
  const subjectsData = [
    { code: 'DC', name: 'Distributed Computing', hasTheory: true, hasLab: true, color: '#2563EB' },
    { code: 'SE', name: 'Software Engineering', hasTheory: true, hasLab: true, color: '#059669' },
    { code: 'AISC', name: 'Artificial Intelligence & Soft Computing', hasTheory: true, hasLab: true, color: '#7C3AED' },
    { code: 'TOC', name: 'Theory of Computation', hasTheory: true, hasLab: false, color: '#D97706' },
    { code: 'CNS', name: 'Cryptography & Network Security', hasTheory: true, hasLab: true, color: '#DC2626' },
    { code: 'MDM-II-DSA', name: 'MDM-II (DSA) - Data Structures & Algorithms', hasTheory: true, hasLab: true, color: '#0891B2' },
    { code: 'MDM-II-IOT', name: 'MDM-II (IOT) - Internet of Things', hasTheory: true, hasLab: true, color: '#4F46E5' },
  ];
  const subjectMap: Record<string, string> = {};
  for (const s of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, hasTheory: s.hasTheory, hasLab: s.hasLab, color: s.color },
      create: s,
    });
    subjectMap[s.code] = sub.id;
  }

  // 6. Faculty (Section 4.2)
  const facultyData = [
    { code: 'SRD', name: 'Dr. Surekha Dholay', email: 'srd@spit.edu.in' },
    { code: 'AT', name: 'Dr. Anuj Tiwari', email: 'at@spit.edu.in' },
    { code: 'SB', name: 'Prof. Sanket Borse', email: 'sb@spit.edu.in' },
    { code: 'VG', name: 'Prof. Vrushali Gavitre', email: 'vg@spit.edu.in' },
    { code: 'ARN', name: 'Prof. Aishwarya Nalwade', email: 'arn@spit.edu.in' },
    { code: 'AD', name: 'Prof. Aniket Deo', email: 'ad@spit.edu.in' },
    { code: 'PL', name: 'Prof. Prathamesh Lokhande', email: 'pl@spit.edu.in' },
    { code: 'RRS', name: 'Prof. Rohan Shinde', email: 'rrs@spit.edu.in' },
    { code: 'SK', name: 'Prof. Swapnali Kurhade', email: 'sk@spit.edu.in' },
    { code: 'SP', name: 'Prof. Sohail Pathan', email: 'sp@spit.edu.in' },
    { code: 'AK', name: 'Prof. Anshuman Kalbhore', email: 'ak@spit.edu.in' },
    { code: 'SBG', name: 'Prof. Sunil Ghane', email: 'sbg@spit.edu.in' },
    { code: 'PD', name: 'Prof. PD', email: 'pd@spit.edu.in' },
  ];
  const facultyMap: Record<string, string> = {};
  for (const f of facultyData) {
    const user = await prisma.user.upsert({
      where: { loginId: f.code },
      update: { name: f.name, email: f.email },
      create: {
        loginId: f.code,
        name: f.name,
        email: f.email,
        passwordHash: defaultPasswordHash,
        role: 'FACULTY',
        status: 'ACTIVE',
        forcePasswordChange: false,
      },
    });
    const fac = await prisma.faculty.upsert({
      where: { employeeId: f.code },
      update: {},
      create: {
        id: user.id,
        employeeId: f.code,
        department: 'Computer Engineering',
      },
    });
    facultyMap[f.code] = fac.id;
  }

  // 7. Course Sections (Lectures & Labs from timetable image)
  const sectionsToSeed = [
    // LECTURES
    // Monday
    { subject: 'AISC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'ARN', room: '609', day: 'MONDAY', start: '11:15', end: '12:15' },
    { subject: 'CNS', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'VG', room: '508', day: 'MONDAY', start: '13:15', end: '14:15' },
    { subject: 'MDM-II-DSA', type: 'LECTURE', audienceType: 'ELECTIVE', audienceRef: 'DSA', faculty: 'AT', room: '601', day: 'MONDAY', start: '14:15', end: '16:15' },
    { subject: 'MDM-II-IOT', type: 'LECTURE', audienceType: 'ELECTIVE', audienceRef: 'IOT', faculty: 'PD', room: '305', day: 'MONDAY', start: '14:15', end: '16:15' },

    // Tuesday
    { subject: 'DC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'AD', room: '203', day: 'TUESDAY', start: '11:15', end: '12:15' },
    { subject: 'SE', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'SK', room: '508', day: 'TUESDAY', start: '13:15', end: '14:15' },
    { subject: 'MDM-II-DSA', type: 'LECTURE', audienceType: 'ELECTIVE', audienceRef: 'DSA', faculty: 'AT', room: '601', day: 'TUESDAY', start: '14:15', end: '15:15' },
    { subject: 'MDM-II-IOT', type: 'LECTURE', audienceType: 'ELECTIVE', audienceRef: 'IOT', faculty: 'PD', room: '305', day: 'TUESDAY', start: '14:15', end: '15:15' },

    // Wednesday
    { subject: 'TOC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'AT', room: '508', day: 'WEDNESDAY', start: '11:15', end: '12:15' },
    { subject: 'CNS', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'VG', room: '508', day: 'WEDNESDAY', start: '13:15', end: '14:15' },
    { subject: 'AISC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'ARN', room: '508', day: 'WEDNESDAY', start: '14:15', end: '15:15' },

    // Thursday
    { subject: 'TOC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'SBG', room: '508', day: 'THURSDAY', start: '11:15', end: '12:15' },
    { subject: 'CNS', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'VG', room: '508', day: 'THURSDAY', start: '13:15', end: '14:15' },
    { subject: 'SE', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'SK', room: '508', day: 'THURSDAY', start: '14:15', end: '15:15' },
    { subject: 'DC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'PL', room: '508', day: 'THURSDAY', start: '15:15', end: '16:15' },
    { subject: 'TOC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'AT', room: '508', day: 'THURSDAY', start: '16:15', end: '17:15' },

    // Friday
    { subject: 'SE', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'SK', room: '508', day: 'FRIDAY', start: '11:15', end: '12:15' },
    { subject: 'AISC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'ARN', room: '609', day: 'FRIDAY', start: '13:15', end: '14:15' },
    { subject: 'DC', type: 'LECTURE', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'PL', room: '508', day: 'FRIDAY', start: '14:15', end: '15:15' },

    // LABS
    // Monday Labs
    { subject: 'SE', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D2', faculty: 'SB', room: '603-3', day: 'MONDAY', start: '09:00', end: '11:00' },
    { subject: 'AISC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D3', faculty: 'SP', room: '607-B', day: 'MONDAY', start: '09:00', end: '11:00' },
    { subject: 'CNS', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D4', faculty: 'VG', room: '703-B', day: 'MONDAY', start: '09:00', end: '11:00' },
    { subject: 'MDM-II-DSA', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'DSA_MDM Batch 1', faculty: 'AT', room: '505', day: 'MONDAY', start: '16:15', end: '18:15' },
    { subject: 'MDM-II-IOT', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'IOT_MDM Batch 1', faculty: 'PD', room: '303', day: 'MONDAY', start: '16:15', end: '18:15' },

    // Tuesday Labs
    { subject: 'SE', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D3', faculty: 'SB', room: '603-3', day: 'TUESDAY', start: '09:00', end: '11:00' },
    { subject: 'AISC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D4', faculty: 'AK', room: '607-B', day: 'TUESDAY', start: '09:00', end: '11:00' },
    { subject: 'CNS', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D1', faculty: 'VG', room: '703-B', day: 'TUESDAY', start: '09:00', end: '11:00' },
    { subject: 'DC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D2', faculty: 'PL', room: '603-2', day: 'TUESDAY', start: '14:15', end: '16:15' },
    { subject: 'MDM-II-DSA', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'DSA_MDM Batch 2', faculty: 'AT', room: '505', day: 'TUESDAY', start: '15:15', end: '17:15' },
    { subject: 'MDM-II-IOT', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'IOT_MDM Batch 2', faculty: 'PD', room: '303', day: 'TUESDAY', start: '15:15', end: '17:15' },

    // Wednesday Labs
    { subject: 'DC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D3', faculty: 'VG', room: '509 old', day: 'WEDNESDAY', start: '09:00', end: '11:00' },
    { subject: 'SE', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D4', faculty: 'SB', room: '702-B', day: 'WEDNESDAY', start: '09:00', end: '11:00' },
    { subject: 'AISC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D1', faculty: 'AK', room: '603-7', day: 'WEDNESDAY', start: '09:00', end: '11:00' },
    { subject: 'CNS', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D2', faculty: 'RRS', room: '703-B', day: 'WEDNESDAY', start: '09:00', end: '11:00' },
    { subject: 'DC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D1', faculty: 'VG', room: '603-2', day: 'WEDNESDAY', start: '15:15', end: '17:15' },
    { subject: 'MDM-II-DSA', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'DSA_MDM Batch 3', faculty: 'AT', room: '505', day: 'WEDNESDAY', start: '15:15', end: '17:15' },
    { subject: 'MDM-II-IOT', type: 'LAB', audienceType: 'ELECTIVE_BATCH', audienceRef: 'IOT_MDM Batch 3', faculty: 'PD', room: '303', day: 'WEDNESDAY', start: '15:15', end: '17:15' },

    // Thursday Labs
    { subject: 'DC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D4', faculty: 'VG', room: '509 old', day: 'THURSDAY', start: '09:00', end: '11:00' },
    { subject: 'SE', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D1', faculty: 'SB', room: '702-B', day: 'THURSDAY', start: '09:00', end: '11:00' },
    { subject: 'AISC', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D2', faculty: 'SK', room: '607-B', day: 'THURSDAY', start: '09:00', end: '11:00' },
    { subject: 'CNS', type: 'LAB', audienceType: 'BATCH', audienceRef: 'D3', faculty: 'RRS', room: '703-B', day: 'THURSDAY', start: '09:00', end: '11:00' },

    // Friday Placeholder
    { subject: 'MDM-II-DSA', type: 'LAB', audienceType: 'DIVISION', audienceRef: 'TE D', faculty: 'PD', room: '505', day: 'FRIDAY', start: '09:00', end: '11:00', isPlaceholder: true },
  ];

  for (const s of sectionsToSeed) {
    const subjectId = subjectMap[s.subject];
    const facultyId = facultyMap[s.faculty];
    const classroomId = roomMap[s.room];
    if (!subjectId || !facultyId || !classroomId) {
      console.warn('Missing reference for section:', s);
      continue;
    }

    const existing = await prisma.courseSection.findFirst({
      where: {
        subjectId,
        type: s.type,
        audienceType: s.audienceType,
        audienceRef: s.audienceRef,
        dayOfWeek: s.day,
        startTime: s.start,
      },
    });

    if (!existing) {
      await prisma.courseSection.create({
        data: {
          subjectId,
          type: s.type,
          audienceType: s.audienceType,
          audienceRef: s.audienceRef,
          facultyId,
          classroomId,
          dayOfWeek: s.day,
          startTime: s.start,
          endTime: s.end,
          isPlaceholder: !!s.isPlaceholder,
        },
      });
    }
  }

  // 8. 5 Seed Students (Section 4.1)
  const studentsData = [
    { name: 'Harsh Vyawahare', uid: '2024300271', batch: 'D3', elective: 'DSA', mdmBatch: 'MDM Batch 1', targetPct: 0.88 },
    { name: 'Sanket Waghmare', uid: '2024300273', batch: 'D3', elective: 'IOT', mdmBatch: 'MDM Batch 1', targetPct: 0.82 },
    { name: 'Videsh Tambe', uid: '2024300255', batch: 'D2', elective: null, mdmBatch: null, targetPct: 0.71 },
    { name: 'Brishchket Singh', uid: '2024300244', batch: 'D1', elective: 'DSA', mdmBatch: 'MDM Batch 2', targetPct: 0.77 },
    { name: 'Aneesh Suvarna', uid: '2024300253', batch: 'D4', elective: 'IOT', mdmBatch: 'MDM Batch 3', targetPct: 0.93 },
  ];

  const studentEntities: any[] = [];
  for (const s of studentsData) {
    const email = `${s.uid}@spit.edu.in`;
    const user = await prisma.user.upsert({
      where: { loginId: s.uid },
      update: { name: s.name, email },
      create: {
        loginId: s.uid,
        name: s.name,
        email,
        passwordHash: defaultPasswordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        forcePasswordChange: true,
      },
    });

    const demoFaceVector = JSON.stringify(Array.from({ length: 128 }, (_, i) => 0.05 * Math.sin(i * 0.1)));

    const student = await prisma.student.upsert({
      where: { id: user.id },
      update: {
        rollNumber: s.uid,
        divisionId: division.id,
        batchId: batchMap[s.batch],
        mdmElective: s.elective,
        mdmBatchId: s.mdmBatch ? mdmBatchMap[s.mdmBatch] : null,
        faceDescriptor: demoFaceVector,
        referencePhotoUrl: '/spit-logo.png',
      },
      create: {
        id: user.id,
        rollNumber: s.uid,
        divisionId: division.id,
        batchId: batchMap[s.batch],
        mdmElective: s.elective,
        mdmBatchId: s.mdmBatch ? mdmBatchMap[s.mdmBatch] : null,
        referencePhotoUrl: '/spit-logo.png',
        faceDescriptor: demoFaceVector,
      },
    });

    // Auto-enroll student into appropriate course sections
    await enrollmentService.syncStudentEnrollments(student.id);
    studentEntities.push({ ...student, targetPct: s.targetPct });
  }

  // 9. Realistic Attendance History Generation (from 10 Aug 2026 to 12 Oct 2026)
  // Check if historical sessions already exist
  const existingSessionsCount = await prisma.attendanceSession.count();
  if (existingSessionsCount === 0 || isReset) {
    console.log('Generating realistic attendance sessions & records (10 Aug 2026 to 12 Oct 2026)...');
    await seedAttendanceHistory(studentEntities);
  }

  console.log('SPIT Attend database seeding completed successfully!');
}

async function seedAttendanceHistory(students: Array<any>) {
  const startDate = new Date('2026-08-10T00:00:00Z');
  const endDate = new Date('2026-10-12T00:00:00Z');

  const holidays = new Set(['2026-08-15', '2026-10-02']); // Independence Day, Gandhi Jayanti

  // Add holidays to DB
  await prisma.holiday.upsert({
    where: { date: '2026-08-15' },
    update: {},
    create: { date: '2026-08-15', title: 'Independence Day', description: 'National Holiday' },
  });
  await prisma.holiday.upsert({
    where: { date: '2026-10-02' },
    update: {},
    create: { date: '2026-10-02', title: 'Mahatma Gandhi Jayanti', description: 'National Holiday' },
  });

  const dayMap: Record<number, string> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
  };

  const sections = await prisma.courseSection.findMany({
    where: { isPlaceholder: false },
    include: { enrollments: true },
  });

  const curr = new Date(startDate);
  while (curr <= endDate) {
    const isoDate = curr.toISOString().split('T')[0];
    const dayOfWeekNum = curr.getUTCDay();

    // Monday to Friday and not a holiday
    if (dayOfWeekNum >= 1 && dayOfWeekNum <= 5 && !holidays.has(isoDate)) {
      const dayOfWeekStr = dayMap[dayOfWeekNum];
      const sectionsForDay = sections.filter((s) => s.dayOfWeek === dayOfWeekStr);

      for (const sec of sectionsForDay) {
        const qrSecret = crypto.randomBytes(16).toString('hex');
        const session = await prisma.attendanceSession.create({
          data: {
            courseSectionId: sec.id,
            date: isoDate,
            startTime: new Date(`${isoDate}T${sec.startTime}:00Z`),
            endTime: new Date(`${isoDate}T${sec.endTime}:00Z`),
            status: 'CLOSED',
            qrSecret,
            qrCurrentToken: crypto.createHmac('sha256', qrSecret).update(`${sec.id}-${isoDate}`).digest('hex'),
          },
        });

        for (const enroll of sec.enrollments) {
          const studentMeta = students.find((s) => s.id === enroll.studentId);
          const targetPct = studentMeta ? studentMeta.targetPct : 0.85;

          // Pseudo-random deterministic roll based on date + student + section
          const hashVal = crypto.createHash('md5').update(`${isoDate}-${enroll.studentId}-${sec.id}`).digest('hex');
          const rand = parseInt(hashVal.substring(0, 4), 16) / 65535;

          let status = rand < targetPct ? 'PRESENT' : 'ABSENT';
          let method = status === 'PRESENT' ? 'QR_VERIFIED' : 'MANUAL';
          let gpsDist = status === 'PRESENT' ? 15 + (rand * 45) : null;
          let faceScore = status === 'PRESENT' ? 84 + (rand * 14) : null;

          // Make a few sessions EXCUSED for demonstration (e.g. medical leave for Videsh & Harsh)
          if (studentMeta?.rollNumber === '2024300255' && isoDate >= '2026-09-14' && isoDate <= '2026-09-16') {
            status = 'EXCUSED';
            method = 'MANUAL';
          }

          await prisma.attendanceRecord.create({
            data: {
              sessionId: session.id,
              studentId: enroll.studentId,
              status,
              method,
              gpsVerified: status === 'PRESENT',
              gpsDistanceM: gpsDist,
              faceScore,
              timestamp: new Date(`${isoDate}T${sec.startTime}:15Z`),
              manualReason: status === 'EXCUSED' ? 'Approved medical leave request #ML-2026' : null,
              manualMarkedBy: status === 'EXCUSED' ? sec.facultyId : null,
            },
          });
        }
      }
    }
    curr.setDate(curr.getDate() + 1);
  }

  // Create sample Leave Request for Harsh & Videsh
  const videsh = students.find((s) => s.rollNumber === '2024300255');
  if (videsh) {
    const lr = await prisma.leaveRequest.create({
      data: {
        studentId: videsh.id,
        startDate: '2026-09-14',
        endDate: '2026-09-16',
        reason: 'Viral fever and medical bed rest prescribed by doctor',
        status: 'APPROVED',
      },
    });

    // Create leave items for Videsh's sections on those dates
    const d2Sections = sections.filter((s) => s.audienceRef === 'TE D' || s.audienceRef === 'D2');
    for (const sec of d2Sections) {
      await prisma.leaveRequestItem.create({
        data: {
          leaveRequestId: lr.id,
          courseSectionId: sec.id,
          sessionDate: '2026-09-14',
          facultyId: sec.facultyId,
          status: 'APPROVED',
          comment: 'Approved with medical certificate verified',
          reviewedAt: new Date('2026-09-15T10:00:00Z'),
        },
      });
    }
  }

  const harsh = students.find((s) => s.rollNumber === '2024300271');
  if (harsh) {
    const pendingLr = await prisma.leaveRequest.create({
      data: {
        studentId: harsh.id,
        startDate: '2026-10-14',
        endDate: '2026-10-15',
        reason: 'Representing SPIT at National Hackathon in Bengaluru',
        status: 'PENDING',
      },
    });

    const harshSections = sections.filter(
      (s) => s.audienceRef === 'TE D' || s.audienceRef === 'D3' || s.audienceRef === 'DSA'
    );
    for (const sec of harshSections) {
      await prisma.leaveRequestItem.create({
        data: {
          leaveRequestId: pendingLr.id,
          courseSectionId: sec.id,
          sessionDate: '2026-10-14',
          facultyId: sec.facultyId,
          status: 'PENDING',
        },
      });
    }
  }

  // Create welcome announcement
  await prisma.announcement.create({
    data: {
      title: 'Welcome to SPIT Attend v2 — Academic Year 2026-27',
      content: 'Please ensure your location permission and front-facing camera are enabled for seamless 3-step check-in.',
      audienceType: 'ALL',
      createdById: 'ADMIN001',
    },
  });
}

// Auto-run if executed directly
if (process.argv[1]?.includes('seed')) {
  runSeed(process.argv.includes('--reset'))
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
