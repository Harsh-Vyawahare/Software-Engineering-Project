import { Router } from 'express';
import { FacultyController } from '../controllers/faculty.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();
const facultyController = new FacultyController();

router.use(authenticateToken);
router.use(requireRole('FACULTY', 'ADMIN'));

router.get('/dashboard', (req, res) => facultyController.getDashboard(req, res));
router.post('/sessions/start', (req, res) => facultyController.startSession(req, res));
router.get('/sessions/:sessionId', (req, res) => facultyController.getLiveSessionDetails(req, res));
router.post('/sessions/:sessionId/rotate-qr', (req, res) => facultyController.rotateQr(req, res));
router.post('/sessions/:sessionId/end', (req, res) => facultyController.endSession(req, res));
router.post('/sessions/:sessionId/manual-mark', (req, res) => facultyController.manualMark(req, res));
router.get('/leave-inbox', (req, res) => facultyController.getLeaveInbox(req, res));
router.post('/leave-inbox/:itemId/review', (req, res) => facultyController.reviewLeave(req, res));
router.get('/timetable', (req, res) => facultyController.getTimetable(req, res));

export default router;
