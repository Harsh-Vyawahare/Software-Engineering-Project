# SPIT Attend — Requirements Traceability Matrix (RTM)

This document maps all Functional Requirements (FR-*), Non-Functional Requirements (NFR), Business Rules (BR-*), Constraints (CO-*), Communication Interfaces (CI-*), and User Interface Requirements (UI-*) from the SRS and Master Prompt to their implementing components, files, and database tables.

---

## 1. Functional Requirements (FR) Traceability

| Req ID | Requirement Description | Implementing Backend / Service | Implementing Frontend Component | Status |
|---|---|---|---|---|
| **FR-AUTH-01** | Admin create student/faculty accounts with credentials & reference photo | `server/src/controllers/admin.controller.ts`, `server/src/services/user.service.ts` | `client/src/pages/admin/AdminUsersPage.tsx`, `AddUserModal.tsx` | Implemented |
| **FR-AUTH-02** | User login using ID/email & password with RBAC | `server/src/controllers/auth.controller.ts`, `server/src/middlewares/auth.middleware.ts` | `client/src/pages/auth/LoginPage.tsx` | Implemented |
| **FR-AUTH-03** | Account lock for 15 min after 5 consecutive failed attempts | `server/src/services/auth.service.ts` (`failedAttempts`, `lockedUntil`) | `client/src/pages/auth/LoginPage.tsx` (Countdown banner) | Implemented |
| **FR-AUTH-04** | Password reset via 30-min secure token link | `server/src/services/auth.service.ts`, `server/src/services/email.service.ts` | `client/src/pages/auth/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` | Implemented |
| **FR-AUTH-05** | Update contact details & request photo replacement requiring admin approval | `server/src/controllers/user.controller.ts`, `server/src/services/photo-request.service.ts` | `client/src/pages/student/StudentProfilePage.tsx`, `AdminPhotoApprovalModal.tsx` | Implemented |
| **FR-CRS-01** | Create subject and course section with faculty and classroom | `server/src/controllers/course.controller.ts` | `client/src/pages/admin/AdminCoursesPage.tsx` | Implemented |
| **FR-CRS-02** | Prevent scheduling conflicts on same classroom/faculty with overlapping times | `server/src/services/course.service.ts` (`checkScheduleClash`) | `client/src/pages/admin/AdminCoursesPage.tsx` (Live clash alert) | Implemented |
| **FR-CRS-03** | Record GPS coordinates & radius for classrooms | `server/src/controllers/classroom.controller.ts` | `client/src/pages/admin/AdminClassroomsPage.tsx` (Map picker) | Implemented |
| **FR-CRS-04** | Enroll students into course sections (auto-derived + manual) | `server/src/services/enrollment.service.ts` | `client/src/pages/admin/AdminEnrollmentPage.tsx` | Implemented |
| **FR-CRS-05** | Deactivate (never physically delete) student or faculty accounts | `server/src/controllers/admin.controller.ts` (`status = 'DEACTIVATED'`) | `client/src/pages/admin/AdminUsersPage.tsx` | Implemented |
| **FR-SESS-01** | Faculty start session only for assigned course within 15-min grace window | `server/src/services/session.service.ts` (`startSession`) | `client/src/pages/faculty/FacultyDashboardPage.tsx` | Implemented |
| **FR-SESS-02** | Prevent second session for same period on same date | `server/src/services/session.service.ts` (Unique check) | `client/src/pages/faculty/FacultyDashboardPage.tsx` | Implemented |
| **FR-SESS-03** | Faculty end open session, auto-marking unverified students Absent | `server/src/services/session.service.ts` (`endSession`) | `client/src/pages/faculty/FacultyLiveSessionPage.tsx` | Implemented |
| **FR-SESS-04** | Auto-close session remaining open past class duration + 15 min | `server/src/services/session.service.ts` (Background cron / TTL check) | Handled automatically on server | Implemented |
| **FR-QR-01** | Generate unique QR code per session with non-reusable identifier | `server/src/services/verification.service.ts` (`generateQrToken`) | `client/src/pages/faculty/FacultyLiveSessionPage.tsx` | Implemented |
| **FR-QR-02** | Rotate QR code every 60s (configurable BR-10) | `server/src/services/verification.service.ts` (HMAC token rotation) | `client/src/pages/faculty/FacultyLiveSessionPage.tsx` (Animated timer ring) | Implemented |
| **FR-QR-03** | Reject expired QR code with specific error prompt | `server/src/services/verification.service.ts` (`verifyQrToken`) | `client/src/components/attendance/AttendanceStepper.tsx` | Implemented |
| **FR-QR-04** | Reject duplicate verification for already present student | `server/src/services/attendance.service.ts` (Unique DB constraint) | `client/src/components/attendance/AttendanceStepper.tsx` | Implemented |
| **FR-QR-05** | Push real-time roster updates to Faculty view via Socket.IO | `server/src/sockets/attendance.socket.ts` | `client/src/pages/faculty/FacultyLiveSessionPage.tsx` | Implemented |
| **FR-GPS-01** | Request GPS coordinates via browser Geolocation API | Browser Geolocation API | `client/src/components/attendance/GpsVerificationStep.tsx` | Implemented |
| **FR-GPS-02** | Accept scan only within configurable radius (default 100m) of room | `server/src/services/verification.service.ts` (Haversine formula) | `client/src/components/attendance/GpsVerificationStep.tsx` (Radar display) | Implemented |
| **FR-FACE-01** | Capture live face image via device camera | HTML5 Video / MediaDevices API | `client/src/components/attendance/FaceVerificationStep.tsx` | Implemented |
| **FR-FACE-02** | Compare face against stored reference photo and compute similarity | `server/src/services/verification.service.ts` & browser `face-api.js` | `client/src/components/attendance/FaceVerificationStep.tsx` | Implemented |
| **FR-FACE-03** | Accept face verification only if similarity >= threshold (default 80%) | `server/src/services/verification.service.ts` | `client/src/components/attendance/FaceVerificationStep.tsx` | Implemented |
| **FR-MAN-01** | Faculty view full roster and manually toggle Present/Absent | `server/src/controllers/attendance.controller.ts` | `client/src/pages/faculty/FacultyLiveSessionPage.tsx` | Implemented |
| **FR-MAN-02** | Mandatory reason when faculty manually marks student | `server/src/services/attendance.service.ts` (Validates reason length) | `client/src/components/attendance/ManualAttendanceModal.tsx` | Implemented |
| **FR-MAN-03** | Record marking method (`qr_verified` vs `manual`) on each record | Prisma `AttendanceRecord.method` | `client/src/pages/student/StudentSubjectDetailPage.tsx` | Implemented |
| **FR-PCT-01** | Calculate percentage per subject (Present / Total, 1 decimal place) | `server/src/services/attendance.service.ts` (`calculatePercentages`) | `client/src/components/dashboard/AttendanceRing.tsx` | Implemented |
| **FR-PCT-02** | Recalculate percentage automatically upon any attendance update | Triggered on every attendance commit / override | All dashboards (TanStack Query cache invalidation) | Implemented |
| **FR-PCT-03** | Display attendance % per subject and overall with colour indicator vs 75% | Server REST API (`/api/student/attendance-summary`) | `client/src/pages/student/StudentDashboardPage.tsx` | Implemented |
| **FR-PCT-04** | Chronological attendance history with date, status, and method | `server/src/controllers/student.controller.ts` | `client/src/pages/student/StudentHistoryPage.tsx` | Implemented |
| **FR-LV-01** | Student submit leave request with dates, reason, affected session expansion | `server/src/controllers/leave.controller.ts` | `client/src/pages/student/StudentLeaveApplyPage.tsx` | Implemented |
| **FR-LV-02** | Reject leave request where end date precedes start date | `server/src/validators/leave.validator.ts` | Form inline validation in `StudentLeaveApplyPage.tsx` | Implemented |
| **FR-LV-03** | Faculty approve/reject pending request with mandatory comment on rejection | `server/src/controllers/faculty.controller.ts` | `client/src/pages/faculty/FacultyLeaveInboxPage.tsx` | Implemented |
| **FR-LV-04** | Mark corresponding attendance sessions as `Excused` on leave approval | `server/src/services/leave.service.ts` | Reflected in Student and Faculty dashboards | Implemented |
| **FR-LV-05** | Send email notification to student within 60s of status change | `server/src/services/email.service.ts` | In-app notification center + email preview modal | Implemented |
| **FR-DASH-01** | Student dashboard: overall %, per-subject %, today's schedule | `server/src/controllers/student.controller.ts` | `client/src/pages/student/StudentDashboardPage.tsx` | Implemented |
| **FR-DASH-02** | Faculty dashboard: today's sessions, start attendance, pending leaves | `server/src/controllers/faculty.controller.ts` | `client/src/pages/faculty/FacultyDashboardPage.tsx` | Implemented |
| **FR-REP-01** | Faculty generate attendance report for course section and date range | `server/src/controllers/report.controller.ts` | `client/src/pages/faculty/FacultyReportsPage.tsx` | Implemented |
| **FR-REP-02** | Export generated report as CSV and PDF | `server/src/services/report.service.ts` | `client/src/pages/faculty/FacultyReportsPage.tsx` | Implemented |
| **FR-ADM-01** | Admin activate, suspend, or deactivate user accounts | `server/src/controllers/admin.controller.ts` | `client/src/pages/admin/AdminUsersPage.tsx` | Implemented |
| **FR-ADM-02** | Admin override locked attendance record with previous/new value & justification | `server/src/controllers/admin.controller.ts` | `client/src/pages/admin/AdminOverridesPage.tsx` | Implemented |
| **FR-ADM-03** | Admin configure attendance threshold, QR validity, GPS radius, face threshold | `server/src/controllers/admin.controller.ts` | `client/src/pages/admin/AdminSettingsPage.tsx` | Implemented |
| **FR-ADM-04** | Maintain audit log of all administrative actions and auth events | `server/src/services/audit.service.ts`, `AuditLog` table | `client/src/pages/admin/AdminAuditLogPage.tsx` | Implemented |

---

## 2. Non-Functional & Business Rules Traceability

| Code | Requirement / Rule | Implementation Detail |
|---|---|---|
| **BR-1** | Min 75% attendance eligibility threshold | Configured in `Settings` table; visual color coding: Green ≥75%, Amber 70–74.9%, Red <70%. Bunk-o-meter computes required lectures to hit 75%. |
| **BR-10** | Rotating QR code validity period (default 60 s) | Configured in `Settings` table; JWT/HMAC timestamp checked; client socket timer refreshes automatically. |
| **BR-11** | GPS geofence radius (default 100 m) | Haversine distance formula against classroom coordinates; reject if distance > allowed radius. |
| **BR-12** | Face verification threshold (default 80%) | Euclidean descriptor distance transformed to percentage; checked against configured threshold. |
| **BR-13** | Student cannot be marked Present twice | Prisma unique index `@@unique([sessionId, studentId])` + atomic database transaction. |
| **BR-14** | Faculty can correct attendance within 24 hours; Admin required afterwards | Checked against `session.endTime + 24 hours` in backend middleware. |
| **PERF-01** | Check-in verification pipeline ≤ 5 seconds | Optimized pipeline with in-memory token validation and lightweight biometric comparison. |
| **PERF-02** | Support 60 concurrent student check-ins | Tested with load test script (`server/tests/load-test.ts`); non-blocking I/O. |
| **PERF-03** | Percentage recalculation ≤ 2 seconds | Efficient SQL aggregation grouped by subject and session type. |
| **REL-01** | ACID duplicate check-in prevention | Prisma transaction (`prisma.$transaction`) with serializable isolation on attendance insertion. |
| **SEC-01** | Passwords salted and hashed | `bcryptjs` with salt rounds = 12. |
| **SEC-02** | HTTPS / TLS encryption readiness | Secure cookie flags (`secure: true`, `httpOnly: true`, `sameSite: 'lax'`), Helmet HTTP security headers. |
| **SEC-03** | Role-Based Access Control (RBAC) | Strict Express middleware checking user roles (`STUDENT`, `FACULTY`, `ADMIN`). |
| **SEC-04** | Session timeout after 30 min of inactivity | JWT expiration + activity timestamp tracking. |
| **SEC-05** | Audit logging of auth & overrides | Centralized `AuditLog` table recording actor, action, target, IP address, timestamp, diff. |
| **PRIV-01** | Minimal data collection | Only reference photo and coordinates needed for active verification are processed. |
| **PRIV-02** | Delete reference photo on account deactivation | Reference photo file unlinked and descriptor cleared on student deactivation. |
| **USE-01** | Check-in sequence completed ≤ 15 seconds | 3-step streamlined stepper UI with real-time feedback. |
| **MAINT-01** | Modular verification pipeline | Independent modules: `QrVerificationModule`, `GpsVerificationModule`, `FaceVerificationModule` orchestrated by `VerificationService`. |
| **COMP-01** | Fully responsive from 320 px to 1920 px | Tailwind mobile-first design with bottom navigation on mobile and collapsible sidebar on desktop. |
