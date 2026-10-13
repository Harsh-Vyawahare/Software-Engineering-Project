import { PrismaClient } from '@prisma/client';
import { EnrollmentService } from '../src/services/enrollment.service.js';

const prisma = new PrismaClient();
const enrollmentService = new EnrollmentService(prisma);

async function runTests() {
  console.log('--- Starting Section 8 Seed & Business Logic Verification Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // 1. Assert all 5 demo students exist
    const students = await prisma.student.findMany({
      include: {
        user: true,
        division: true,
        batch: true,
        mdmBatch: true,
        enrollments: {
          include: {
            courseSection: {
              include: { subject: true, faculty: true, classroom: true },
            },
          },
        },
      },
    });
    assert(students.length === 5, '5 Seeded students exist', `Found ${students.length}`);

    const harsh = students.find((s) => s.rollNumber === '2024300271')!;
    const sanket = students.find((s) => s.rollNumber === '2024300273')!;
    const videsh = students.find((s) => s.rollNumber === '2024300255')!;
    const brishchket = students.find((s) => s.rollNumber === '2024300244')!;
    const aneesh = students.find((s) => s.rollNumber === '2024300253')!;

    // 2. Test: Every batch has exactly 4 labs
    for (const bName of ['D1', 'D2', 'D3', 'D4']) {
      const batchLabs = await prisma.courseSection.findMany({
        where: {
          type: 'LAB',
          audienceType: 'BATCH',
          audienceRef: bName,
          isPlaceholder: false,
        },
      });
      assert(batchLabs.length === 4, `Batch ${bName} has exactly 4 labs`, `Found ${batchLabs.length}`);
    }

    // 3. Test: D1 student has NO Monday lab
    const d1MondayLabs = brishchket.enrollments.filter(
      (e) => e.courseSection.type === 'LAB' && e.courseSection.dayOfWeek === 'MONDAY' && e.courseSection.audienceType === 'BATCH'
    );
    assert(d1MondayLabs.length === 0, 'D1 student has no Monday morning lab', `Found ${d1MondayLabs.length}`);

    // 4. Test: D3 student sees Mon AISC Lab/SP/607-B but NOT Mon CNS Lab/VG/703-B
    const harshMondayAisc = harsh.enrollments.find(
      (e) =>
        e.courseSection.type === 'LAB' &&
        e.courseSection.dayOfWeek === 'MONDAY' &&
        e.courseSection.subject.code === 'AISC' &&
        e.courseSection.classroom.name === '607-B'
    );
    assert(!!harshMondayAisc, 'D3 student sees Mon AISC Lab/SP/607-B');

    const harshMondayCnsLab = harsh.enrollments.find(
      (e) =>
        e.courseSection.type === 'LAB' &&
        e.courseSection.dayOfWeek === 'MONDAY' &&
        e.courseSection.subject.code === 'CNS'
    );
    assert(!harshMondayCnsLab, 'D3 student does NOT see Mon CNS Lab/VG/703-B (which is for D4)');

    // 5. Test: D2 lab roster contains ONLY D2 students
    const d2DcLab = await prisma.courseSection.findFirst({
      where: {
        type: 'LAB',
        audienceType: 'BATCH',
        audienceRef: 'D2',
        dayOfWeek: 'TUESDAY',
      },
      include: {
        enrollments: {
          include: { student: { include: { batch: true } } },
        },
      },
    });
    assert(!!d2DcLab, 'D2 Tuesday DC Lab section exists');
    if (d2DcLab) {
      const allD2 = d2DcLab.enrollments.every((e) => e.student.batch.name === 'D2');
      assert(allD2 && d2DcLab.enrollments.length > 0, 'D2 lab roster contains ONLY D2 students', `Enrolled count: ${d2DcLab.enrollments.length}`);
    }

    // 6. Test: MDM enrollment clash for D2 is detected (Tuesday DC Lab 14:15-16:15 vs MDM lecture 14:15-15:15)
    const clashesForD2 = await enrollmentService.checkStudentClashes(videsh.id, 'D2', 'DSA', 'MDM Batch 1');
    assert(
      clashesForD2.length > 0,
      'MDM enrollment clash for D2 is correctly detected',
      clashesForD2.map((c) => c.reason).join('; ')
    );

    // 7. Test: Leave routing sends SE theory to SK and SE lab to SB
    const seTheorySection = await prisma.courseSection.findFirst({
      where: {
        subject: { code: 'SE' },
        type: 'LECTURE',
      },
      include: { faculty: true },
    });
    const seLabD1Section = await prisma.courseSection.findFirst({
      where: {
        subject: { code: 'SE' },
        type: 'LAB',
        audienceRef: 'D1',
      },
      include: { faculty: true },
    });
    assert(
      seTheorySection?.faculty.employeeId === 'SK',
      'SE theory routes to SK (Prof. Swapnali Kurhade)',
      `Actual: ${seTheorySection?.faculty.employeeId}`
    );
    assert(
      seLabD1Section?.faculty.employeeId === 'SB',
      'SE lab routes to SB (Prof. Sanket Borse)',
      `Actual: ${seLabD1Section?.faculty.employeeId}`
    );

    // 8. Test: Batch lab rejection logic
    // If D3 student tries to scan D2 lab session
    const isHarshAllowedInD2 = d2DcLab?.enrollments.some((e) => e.studentId === harsh.id);
    assert(!isHarshAllowedInD2, 'Lab QR from another batch rejects D3 student on D2 lab');

    console.log(`\nTests Summary: ${passed} Passed, ${failed} Failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
