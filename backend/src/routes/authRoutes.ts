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
  biometricRegisterSchema,
  biometricLoginSchema,
  biometricDeleteSchema,
  checkPhoneSchema,
} from '../utils/validations';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/check-phone', validate(checkPhoneSchema), authController.checkPhone);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), authController.resendOTP);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);

router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// ─── Biometric Auth ─────────────────────────────────────────
router.post('/biometric/challenge', authenticate, authController.biometricChallenge);
router.post('/biometric/login-challenge', authController.biometricLoginChallenge);
router.post('/biometric/register', authenticate, validate(biometricRegisterSchema), authController.biometricRegister);
router.post('/biometric/login', validate(biometricLoginSchema), authController.biometricLogin);
router.get('/biometric/credentials', authenticate, authController.biometricCredentials);
router.post('/biometric/delete', authenticate, validate(biometricDeleteSchema), authController.biometricDelete);
router.post('/biometric/revoke-all', authenticate, authController.biometricRevokeAll);

export default router;
