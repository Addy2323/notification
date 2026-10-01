import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user?.id || 'unknown'}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const router = Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/request-otp', authRateLimiter, authController.requestOtp);
router.post('/verify-otp', authRateLimiter, authController.verifyOtp);
router.post('/verify-pin', authRateLimiter, authController.verifyPin);
router.post('/reset-pin', authRateLimiter, authController.resetPin);
router.post('/check-phone', authRateLimiter, authController.checkPhone);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.post('/verify-password', authRateLimiter, authController.verifyPassword);
router.get('/operators', authController.getOperators);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', authController.logout);
router.post('/avatar', requireAuth, upload.single('avatar'), authController.uploadAvatar);

export default router;
