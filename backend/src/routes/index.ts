import { Router } from 'express';
import authRoutes from './authRoutes';
import deliveryRoutes from './deliveryRoutes';
import driverRoutes from './driverRoutes';
import trackingRoutes from './trackingRoutes';
import adminRoutes from './adminRoutes';
import orderRoutes from './orderRoutes';
import customerRoutes from './customerRoutes';
import merchantDriverRoutes from './merchantDriverRoutes';
import productRoutes from './productRoutes';
import salesRoutes from './salesRoutes';
import analyticsRoutes from './analyticsRoutes';
import reportRoutes from './reportRoutes';
import trackingAnalyticsRoutes from './trackingAnalyticsRoutes';
import ratingRoutes from './ratingRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/driver', driverRoutes);
router.use('/track', trackingRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', merchantDriverRoutes);
router.use('/products', productRoutes);
router.use('/sales', salesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/track', trackingAnalyticsRoutes);
router.use('/ratings', ratingRoutes);

export default router;
