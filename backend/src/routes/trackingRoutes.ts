import { Router } from 'express';
import * as trackingController from '../controllers/trackingController';
import { tokenApiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(tokenApiRateLimiter);

router.get('/:token', trackingController.getCustomerTracking);

export default router;
