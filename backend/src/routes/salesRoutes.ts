import { Router } from 'express';
import { SalesController } from '../controllers/salesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', SalesController.getSalesLedger);

export default router;
