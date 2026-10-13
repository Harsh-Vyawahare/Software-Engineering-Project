# SPIT Attend — Assumptions & Design Decisions

This document formally captures all architectural assumptions, UML vs. SRS conflict resolutions, timetable interpretations, and resolution of SRS Appendix C (To Be Determined) items for **SPIT Attend** (Smart Attendance Management System v2) at Sardar Patel Institute of Technology (SPIT), Mumbai.

---

## 1. Hierarchy & Authority Rules

As mandated:
1. **The Timetable Image wins** for any scheduling, room, faculty, or slot discrepancies.
2. **UML Diagrams win** for data model structure, relationships, and component interactions.
3. **SRS Document wins** for behavioral specifications, functional requirements (FR-*), non-functional requirements (NFR), and business rules (BR-*).

---

## 2. UML vs. SRS Conflict Resolutions

| # | Topic | SRS Specification | UML Specification | Resolution Adopted |
|---|---|---|---|---|
| 1 | **Data Model Structure** | Appendix A Data Dictionary defines flat entities (`student`, `faculty`, `classroom`, `course_section`, etc.) without batch or division hierarchy. | UML Class & ER diagrams show normalized relational hierarchy: Department → Class/Division (`TE-D`) → Batches (`D1`–`D4`), MDM Elective, MDM Batches. | **Followed UML**: Schema models `Division`, `Batch`, `MdmBatch`, `CourseSection` with `audience_type` (`division`, `batch`, `elective`, `elective_batch`), and `AudienceRef`. Auto-enrollment derives student roster automatically. |
| 2 | **Leave Request Scope** | FR-LV-01 states student submits leave for a date range and a single subject. | Sequence and Component diagrams imply institutional multi-subject routing across affected timetable slots. | **Combined/Enhanced**: Student selects a date range. The system automatically expands affected slots from the student's personalized timetable (theory + their batch lab), creates a parent `LeaveRequest` and child `LeaveRequestItem`s grouped by faculty. Each faculty member approves or rejects their respective slots. |
| 3 | **Attendance Marking Denominator** | FR-PCT-01 specifies percentage = `Present / Total Conducted * 100`. Does not clarify if "Excused" sessions count in the denominator. | Institutional standard in engineering colleges is that approved leaves (medical/official) do not penalize students. | **Resolution**: Approved leaves marked `Excused` are deducted from the denominator (`Present / (Total Conducted - Excused) * 100`). Configurable via Admin Setting `exclude_excused_from_denominator` (default: `true`). |
| 4 | **Block Duration vs. Record Count** | SRS speaks of class periods. Labs in timetable are 2-hour blocks (e.g. 9:00–11:00 AM). | UML models one session per timetable block. | **Resolution**: Each scheduled timetable block (even 2-hour labs or 2-hour MDM lectures) constitutes exactly **one** attendance session and **one** attendance record per student. |
| 5 | **Reference Photo Storage** | SRS 2.5 (CO-5) requires passwords and reference photos to be stored in hashed or encrypted form. | UML Sequence diagram shows face descriptor vector (128-d float array) compared with registered face. | **Resolution**: Reference photos are stored as encrypted blobs/files on disk, and 128-dimensional facial embeddings (descriptors) are stored in the database. Raw photos are accessible only to the student and Administrator. |

---

## 3. Resolution of SRS Appendix C (To Be Determined List)

| SRS Item | Description | Resolution & Configured Value |
|---|---|---|
| **TBD-01** | Exact face-recognition library/model (CO-1, FR-FACE-02) | **Client-side face-api.js** (TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet) extracting 128-d descriptor, combined with server-side biometric verification endpoint in `VerificationService`. Liveness verification prompts ("Look straight / Blink") prevent static photo spoofing. |
| **TBD-02** | Final GPS verification radius (BR-11, FR-GPS-02) | **100 meters** around SPIT campus coordinates (`19.1232° N, 72.8363° E`). Configurable by Admin (10 m to 1000 m). |
| **TBD-03** | Final face-match similarity threshold (BR-12, FR-FACE-03) | **80%** similarity threshold (descriptor euclidean distance ≤ 0.48). Configurable by Admin (50% to 99%). |
| **TBD-04** | Email service provider (DE-2, CI-2) | `EmailService` interface with dual mode: **Nodemailer SMTP** (production-ready) and **Dev In-App Mailbox & Preview** (default for demo/offline zero-credential operation). Dispatches within <60 s. |
| **TBD-05** | Relational database engine (OE-3) | **Prisma ORM** supporting **SQLite** (out-of-the-box zero-configuration immediate run) and **PostgreSQL** via provided `docker-compose.yml`. Enforces strict unique constraints on `[session_id, student_id]` with ACID transactions. |
| **TBD-06** | Archival & retention policy (Sec 6) | Physical deletion is forbidden (`is_archived: true`). Historical attendance records are permanently retained for institutional audit trails. |
| **TBD-07** | QR code refresh interval (BR-10, FR-QR-02) | **60 seconds** default. Configurable by Admin (15 s to 300 s). Signed HMAC-SHA256 payload with timestamp and session nonce. |
| **TBD-08** | Institutional attendance eligibility threshold (BR-1) | **75.0%** overall and per subject. Configurable by Admin (50.0% to 90.0%). Students below 75% receive automated warnings and red visual indicators. |
| **TBD-09** | Report export formats (FR-REP-02) | **CSV Export** (RFC 4180 compliant) and **Printable/PDF Export** with official SPIT institutional header, logo, and signature blocks. |
| **TBD-10** | Unsupported device / hardware failure procedure | **Faculty Manual Override** (FR-MAN-01..03) with mandatory logged reason and audit trail. |

---

## 4. Timetable Interpretation & Seed Assumptions

1. **Current System Date/Time**: Fixed for seed evaluation at **Monday, 12 October 2026, 17:06:05 IST**. Attendance history is generated for working days between **10 August 2026** and **12 October 2026**.
2. **Faculty Legend**:
   - `SRD`: Dr. Surekha Dholay
   - `AT`: Dr. Anuj Tiwari
   - `SB`: Prof. Sanket Borse
   - `VG`: Prof. Vrushali Gavitre
   - `ARN`: Prof. Aishwarya Nalwade
   - `AD`: Prof. Aniket Deo
   - `PL`: Prof. Prathamesh Lokhande
   - `RRS`: Prof. Rohan Shinde
   - `SK`: Prof. Swapnali Kurhade
   - `SP`: Prof. Sohail Pathan
   - `AK`: Prof. Anshuman Kalbhore
   - `SBG`: Prof. Sunil Ghane
   - `PD`: Prof. PD (placeholder name; editable in Admin portal)
3. **Elective Clash Rationale (Videsh Tambe)**:
   - Student Videsh Tambe (UID: 2024300255) is in Batch D2.
   - Batch D2 has `DC Lab` scheduled on Tuesday 2:15 PM – 4:15 PM in Room 603-2.
   - MDM-II lectures are scheduled on Tuesday 2:15 PM – 3:15 PM.
   - Therefore, D2 students cannot opt for MDM-II without a hard timetable clash. Videsh is correctly marked as "Not opted".
4. **Friday 9:00–11:00 AM Slot**:
   - Titled `MDM Lab()` in the timetable image without specific faculty or batch details.
   - Seeded as a non-counting placeholder slot; editable by Administrator.
5. **Non-attendance Slots**:
   - Short Break (11:00 AM – 11:15 AM)
   - Long Break (12:15 PM – 1:15 PM)
   - Thursday Student Activity Slot (5:15 PM – 6:15 PM)
   - Friday Faculty Quality Circle Slot (3:15 PM – 5:15 PM)
   - These slots are displayed in grey, disabled for attendance generation, and excluded from statistics.
6. **Seed Student Target Attendance Percentages**:
   - Aneesh Suvarna (Batch D4): ~93% (Excellent - Green)
   - Harsh Vyawahare (Batch D3): ~88% (Good - Green)
   - Sanket Waghmare (Batch D3): ~82% (Good - Green)
   - Brishchket Singh (Batch D1): ~77% (Borderline - Amber, alert banner)
   - Videsh Tambe (Batch D2): ~71% (Critical - Red, ineligible warning)
7. **Photo Enrollment on Seed**:
   - All 5 seeded student accounts start without reference photos (`reference_photo_url = null`).
   - On first login, students receive a guided biometric enrollment modal. The initial photo is auto-approved. Subsequent photo change requests require Administrator approval.
