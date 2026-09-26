import { Router } from 'express';
import authRoutes from './authRoutes';
import deliveryRoutes from './deliveryRoutes';
import driverRoutes from './driverRoutes';
import trackingRoutes from './trackingRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/driver', driverRoutes);
router.use('/track', trackingRoutes);
router.use('/admin', adminRoutes);

export default router;
