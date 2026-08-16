import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../utils/validations';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), authController.resendOTP);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
