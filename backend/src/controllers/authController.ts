import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/authService';

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
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      const result = await authService.login(email, password, userAgent, ipAddress);
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
}

export const authController = new AuthController();
