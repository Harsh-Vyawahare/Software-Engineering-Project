import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();
const studentController = new StudentController();

router.use(authenticateToken);
router.use(requireRole('STUDENT'));

router.get('/dashboard', (req, res) => studentController.getDashboard(req, res));
router.post('/enroll-photo', (req, res) => studentController.enrollPhoto(req, res));
router.post('/verify-attendance', (req, res) => studentController.submitAttendance(req, res));
router.get('/history/subject/:subjectId', (req, res) => studentController.getSubjectHistory(req, res));
router.get('/timetable', (req, res) => studentController.getTimetable(req, res));

// Leave management
router.get('/leave/preview', (req, res) => studentController.previewLeave(req, res));
router.post('/leave/apply', (req, res) => studentController.submitLeave(req, res));
router.get('/leave/history', (req, res) => studentController.getLeaveHistory(req, res));
router.delete('/leave/:leaveId', (req, res) => studentController.withdrawLeave(req, res));

export default router;
