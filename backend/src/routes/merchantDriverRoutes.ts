import { Router } from 'express';
import * as merchantDriverController from '../controllers/merchantDriverController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', merchantDriverController.listDrivers);
router.get('/search', merchantDriverController.searchDrivers);
router.get('/:id', merchantDriverController.getDriver);
router.post('/', merchantDriverController.createMerchantDriver);

export default router;
