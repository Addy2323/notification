import { Router } from 'express';
import {
  getPublicRatingInfo,
  submitPublicRating,
  getMerchantRatings,
  getAdminRatings,
} from '../controllers/ratingController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public customer rating endpoints
router.get('/token/:token', getPublicRatingInfo);
router.post('/submit', submitPublicRating);

// Authenticated merchant rating dashboard endpoint
router.get('/merchant', requireAuth, requireRole(['MERCHANT', 'STAFF', 'ADMIN']), getMerchantRatings);

// Authenticated admin rating dashboard endpoint
router.get('/admin', requireAuth, requireRole(['ADMIN']), getAdminRatings);

export default router;
