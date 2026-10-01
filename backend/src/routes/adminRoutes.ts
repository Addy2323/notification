import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// Overview & Growth
router.get('/overview', adminController.getOverview);
router.get('/metrics', adminController.getOverview); // Backward compatibility
router.get('/growth', adminController.getGrowth);

// Merchant Management
router.get('/merchants', adminController.listMerchants);
router.post('/merchants', adminController.createMerchant);
router.put('/merchants/:id', adminController.updateMerchant);
router.delete('/merchants/:id', adminController.deleteMerchant);
router.get('/merchants/:id/profile', adminController.getMerchantProfile);
router.patch('/merchants/:id/status', adminController.toggleMerchantStatus);

// Global Search
router.get('/search', adminController.globalSearch);

// Rankings & Leaderboard
router.get('/rankings', adminController.getRankings);

// Traffic & Growth Analytics
router.get('/traffic', adminController.getTraffic);
router.get('/traffic/live', adminController.getLiveTraffic);

// System Health & Incidents
router.get('/health', adminController.getHealth);
router.post('/incidents/:id/resolve', adminController.resolveIncident);

// Reporting (PDF & Excel)
router.get('/reports/pdf', adminController.downloadPDFReport);
router.get('/reports/excel', adminController.downloadExcelReport);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
