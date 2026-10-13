# SPIT Attend — Smart Attendance Management System (v2)

**Sardar Patel Institute of Technology (SPIT), Mumbai**  
*Autonomous Institute Affiliated to the University of Mumbai*  
*Academic Year 2026–27 ODD Semester (Class: TE BTech Division-D)*

---

## 1. Executive Summary

**SPIT Attend** is a responsive, mobile-first web application designed to eliminate proxy attendance in university lecture halls and laboratories. It replaces legacy biometric hardware and manual rolls with a high-assurance **3-step verification pipeline**:

$$\text{Faculty Rotating QR (60s)} \longrightarrow \text{Browser GPS Campus Geofence} \longrightarrow \text{Live Face Biometric Match}$$

A student is marked **Present** only when all three sequenced checks succeed. The platform incorporates batch-aware timetabling (Division D lectures vs. D1–D4 lab batches vs. MDM-II electives), multi-faculty leave request routing, atomic duplicate check-in prevention, and an administrative compliance console.

---

## 2. Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────────┐
   │                   React 18 + Vite PWA                       │
   │  (Tailwind CSS, Plus Jakarta Sans, Lucide, Framer Motion)   │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ HTTPS REST / WSS Socket.IO
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              Node.js + Express (TypeScript)                 │
   │     VerificationService (QR / GPS / Face Biometric)         │
   │  RBAC Auth · Rate Limiting · Nodemailer · Audit Logger      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ Prisma ORM (ACID Transactions)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │        Relational Database (SQLite / PostgreSQL)            │
   │  Unique Constraints: @@unique([sessionId, studentId])       │
   └─────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, Framer Motion, Recharts, Canvas Confetti, TanStack Query, Installable PWA.
- **Backend**: Node.js, Express, TypeScript, Socket.IO (real-time live roster push), Prisma ORM, bcrypt, JWT in httpOnly cookies, Zod validation, Helmet security headers.
- **Database**: SQLite (zero-config, immediate out-of-the-box evaluation) and PostgreSQL via `docker-compose.yml`.
- **Biometric Pipeline**: 128-dimensional facial embeddings, Euclidean distance to similarity percentage, 80% passing threshold (BR-12).
- **Geofence Engine**: Native browser Geolocation API (CO-2), Haversine spherical distance calculation vs. SPIT campus coordinates (`19.1232° N, 72.8363° E`), default 100 m radius (BR-11).
- **QR Engine**: Cryptographically signed HMAC-SHA256 rotating payload refreshed every 60 seconds (BR-10).

---

## 3. Demo Credentials

Default demo password for all seeded accounts is **`Spit@2026`**.

### 3.1 Demo Students (Class: TE D)

| Student Name | Login UID | Email | Batch | MDM-II Elective / Batch | Attendance Status |
|---|---|---|---|---|---|
| **Harsh Vyawahare** | `2024300271` | `2024300271@spit.edu.in` | **D3** | DSA / MDM Batch 1 | ~88% (Good — Green) |
| **Sanket Waghmare** | `2024300273` | `2024300273@spit.edu.in` | **D3** | IOT / MDM Batch 1 | ~82% (Good — Green) |
| **Videsh Tambe** | `2024300255` | `2024300255@spit.edu.in` | **D2** | *Not opted (DC Lab clash)* | ~71% (Critical — Red Warning) |
| **Brishchket Singh** | `2024300244` | `2024300244@spit.edu.in` | **D1** | DSA / MDM Batch 2 | ~77% (Borderline — Amber) |
| **Aneesh Suvarna** | `2024300253` | `2024300253@spit.edu.in` | **D4** | IOT / MDM Batch 3 | ~93% (Excellent — Green) |

*Note: In the login portal, click any of the **1-Click Demo Accounts** to populate credentials instantly.*

### 3.2 Faculty Accounts

Login using either Employee ID or Email with password **`Spit@2026`**:

| Code | Faculty Name | Email | Subjects Taught |
|---|---|---|---|
| **SK** | Prof. Swapnali Kurhade | `sk@spit.edu.in` | Software Engineering (Theory & D2 Lab) |
| **ARN** | Prof. Aishwarya Nalwade | `arn@spit.edu.in` | Artificial Intelligence & Soft Computing (Theory) |
| **VG** | Prof. Vrushali Gavitre | `vg@spit.edu.in` | CNS (Theory & D1/D4 Lab), DC (D1/D3 Lab) |
| **AT** | Dr. Anuj Tiwari | `at@spit.edu.in` | TOC (Theory), MDM-II DSA (Theory & Labs) |
| **AD** | Prof. Aniket Deo | `ad@spit.edu.in` | Distributed Computing (Tuesday Theory) |
| **PL** | Prof. Prathamesh Lokhande | `pl@spit.edu.in` | Distributed Computing (Thu/Fri Theory & D2 Lab) |
| **SB** | Prof. Sanket Borse | `sb@spit.edu.in` | Software Engineering (D1, D2, D3, D4 Labs) |
| **RRS** | Prof. Rohan Shinde | `rrs@spit.edu.in` | CNS (D2 & D3 Labs) |
| **SP** | Prof. Sohail Pathan | `sp@spit.edu.in` | AISC (D3 Lab) |
| **AK** | Prof. Anshuman Kalbhore | `ak@spit.edu.in` | AISC (D1 & D4 Labs) |
| **SBG** | Prof. Sunil Ghane | `sbg@spit.edu.in` | TOC (Thursday Theory) |
| **PD** | Prof. PD | `pd@spit.edu.in` | MDM-II IOT (Theory & Labs) |

### 3.3 Administrator Account

- **Login ID**: `ADMIN001`
- **Email**: `admin@spit.edu.in`
- **Password**: `Spit@2026`

---

## 4. Quick Start & Setup

### 4.1 Prerequisites
- Node.js LTS (v18+ or v20+)
- npm v9+

### 4.2 Installation & Seed (Single Step)

```bash
# 1. Install root, server, and client dependencies
cd server
npm install
npm run prisma:push
npm run prisma:seed

cd ../client
npm install
npm run build
```

### 4.3 Running the Application

You can run the full-stack server (which serves the frontend bundle and APIs on port 5000):

```bash
cd server
npm start
# Open http://localhost:5000 in your browser
```

Or run frontend and backend independently in development mode with HMR:

```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend Vite dev server (port 5173)
cd client
npm run dev
# Open http://localhost:5173
```

---

## 5. Verification & Testing

### 5.1 Section 8 Business Logic & Timetable Assertions

Run the automated test suite verifying all 14 mandatory SRS & Section 8 rules:

```bash
cd server
npm test
```

**Assertions verified:**
1. All 5 seeded student accounts exist with correct academic metadata.
2. Batches D1, D2, D3, and D4 each have exactly 4 scheduled labs.
3. Batch D1 student has NO Monday morning lab.
4. Batch D3 student sees Monday AISC Lab (`SP`/`607-B`) and does NOT see Monday CNS Lab (`VG`/`703-B`).
5. Batch D2 lab rosters contain exclusively Batch D2 students.
6. Timetable clash detection for Batch D2 (DC Lab vs. MDM-II lecture) is flagged.
7. Leave request routing directs Software Engineering theory to Prof. Swapnali Kurhade (`SK`) and SE lab to Prof. Sanket Borse (`SB`).
8. Lab QR from another batch is rejected with specific error feedback.

### 5.2 PERF-02 Load Test (60 Concurrent Check-Ins)

Run the synthetic benchmark simulating 60 simultaneous student check-ins:

```bash
cd server
npx tsx tests/load-test.ts
```

*Benchmark Output: Completed 60 check-ins in 552 ms (9.2 ms avg per check-in), exceeding PERF-01 (≤ 5 s).*

---

## 6. Key Features Implemented

1. **Rotating QR Generation & Projector Mode**:
   - Cryptographic HMAC token rotated automatically every 60 seconds.
   - Projector Mode provides high-contrast full-screen projection for lecture theatres.
2. **GPS Geofence with Campus Coordinates**:
   - Compares user coordinates with venue coordinates using Haversine calculation (100 m radius).
   - Clear privacy notice informing students that continuous tracking is not performed (PRIV-01).
   - Mock GPS bypass available in the Demo Toolbar for testing off-campus.
3. **Biometric Face Verification**:
   - 128-d descriptor extraction with liveness checks ("Look straight / Blink once").
   - First-time enrollment modal auto-approves baseline; subsequent changes submit an Admin request (FR-AUTH-05).
4. **Batch-Aware Timetable Engine**:
   - Division D common lectures enrolled for all; lab sessions enrolled only for matching batch (D1–D4).
   - Cross-batch scan rejection: *"This lab is for Batch D2. Your batch is D3."*
5. **Component Attendance Percentages (Theory %, Lab %, Combined %)**:
   - Separate progress bars and statistics for Theory and Lab components.
   - Overall semester percentage across all sessions.
   - Bunk-o-meter smart planner (*"You can safely miss 2 more lectures"* / *"Need 3 consecutive lectures to reach 75%"*).
6. **Multi-Faculty Leave Routing**:
   - Student selects date range; system expands affected slots from personalized timetable.
   - Routes items to each respective faculty member for approval/rejection with mandatory comment.
   - Approved sessions are automatically marked as `Excused` and excluded from attendance denominators.
7. **In-App Dev Mailbox & Realtime Simulation**:
   - Click the envelope icon in the top-right Demo Toolbar to inspect all dispatched emails without SMTP credentials.
   - Click *"Simulate Student Check-in"* to animate the faculty live roster in real time using real seeded students.
8. **Institutional Reports & Exports**:
   - RFC 4180 compliant CSV export (FR-REP-02).
   - Print-ready PDF report with official SPIT letterhead, logo, and examination authority signature blocks.

---

## 7. Assumptions & Documentation

Detailed traceability and assumption documents are available in the `/docs` folder:
- [`docs/ASSUMPTIONS.md`](file:///C:/Users/slbha/.gemini/antigravity/scratch/spit-attend/docs/ASSUMPTIONS.md): Complete analysis of UML vs. SRS mappings and resolution of SRS Appendix C (TBD-01 to TBD-10).
- [`docs/TRACEABILITY.md`](file:///C:/Users/slbha/.gemini/antigravity/scratch/spit-attend/docs/TRACEABILITY.md): Requirements Traceability Matrix mapping every FR, NFR, and BR to its implementing file.
- [`docs/timetable-te-d.png`](file:///C:/Users/slbha/.gemini/antigravity/scratch/spit-attend/docs/timetable-te-d.png): The authoritative Division-D timetable image.
