import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();
const adminController = new AdminController();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/dashboard', (req, res) => adminController.getDashboardStats(req, res));

// Students management
router.get('/students', (req, res) => adminController.getStudents(req, res));
router.post('/students/preview-enrollment', (req, res) => adminController.previewStudentEnrollment(req, res));
router.post('/students', (req, res) => adminController.addStudent(req, res));
router.patch('/students/:studentId/status', (req, res) => adminController.updateStudentStatus(req, res));
router.post('/students/:studentId/reset-device', (req, res) => adminController.resetDeviceBinding(req, res));

// Photo requests
router.get('/photo-requests', (req, res) => adminController.getPhotoRequests(req, res));
router.post('/photo-requests/:requestId/review', (req, res) => adminController.reviewPhotoRequest(req, res));

// Faculty management
router.get('/faculty', (req, res) => adminController.getFaculty(req, res));

// Classrooms
router.get('/classrooms', (req, res) => adminController.getClassrooms(req, res));
router.patch('/classrooms/:classroomId/gps', (req, res) => adminController.updateClassroomGps(req, res));

// Settings
router.get('/settings', (req, res) => adminController.getSettings(req, res));
router.patch('/settings', (req, res) => adminController.updateSettings(req, res));

// Overrides & Audit Log
router.post('/override-attendance', (req, res) => adminController.overrideAttendance(req, res));
router.get('/audit-logs', (req, res) => adminController.getAuditLogs(req, res));
router.post('/reset-demo-data', (req, res) => adminController.resetDemoData(req, res));

export default router;
