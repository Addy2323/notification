import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { tokenApiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(tokenApiRateLimiter);

router.get('/:token', driverController.getDriverDelivery);
router.post('/:token/start', driverController.startDelivery);
router.post('/:token/arrived', driverController.markArrived);
router.post('/:token/delivered', driverController.confirmDelivered);

export default router;
