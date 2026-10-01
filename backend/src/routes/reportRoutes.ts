import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/pdf', ReportController.downloadPDF);
router.get('/excel', ReportController.downloadExcel);

export default router;
