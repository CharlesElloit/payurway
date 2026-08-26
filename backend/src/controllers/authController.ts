import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/authService';
import { biometricService } from '../services/biometricService';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      const result = await authService.login(phone, password, userAgent, ipAddress);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOTP(phone, otp);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async resendOTP(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.resendOTP(phone);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.logout(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.getProfile(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async checkPhone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.checkPhone(phone);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Biometric Auth ─────────────────────────────────────────
  async biometricChallenge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await biometricService.generateChallenge(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricLoginChallenge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await biometricService.generateChallenge();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricRegister(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await biometricService.register(req.user!.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricLogin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      const result = await biometricService.verifyAndLogin(req.body, userAgent, ipAddress);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricCredentials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await biometricService.listCredentials(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { credentialId } = req.body;
      const result = await biometricService.deleteCredential(req.user!.id, credentialId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async biometricRevokeAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await biometricService.revokeAllCredentials(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
