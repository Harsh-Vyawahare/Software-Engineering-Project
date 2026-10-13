import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();
const reportController = new ReportController();

router.use(authenticateToken);
router.use(requireRole('FACULTY', 'ADMIN'));

router.get('/data', (req, res) => reportController.getReportData(req, res));
router.get('/csv', (req, res) => reportController.exportCsv(req, res));

export default router;
