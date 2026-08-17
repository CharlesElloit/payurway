import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { accountService } from '../services/accountService';

export class AccountController {
  async linkAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { phoneNumber, carrier } = req.body;
      const result = await accountService.linkAccount(req.user!.id, phoneNumber, carrier);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { accountId, otp } = req.body;
      const result = await accountService.verifyAccount(req.user!.id, accountId, otp);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.getAccounts(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.getAccount(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.removeAccount(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async setDefault(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.setDefault(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.getBalance(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refreshBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountService.refreshBalance(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const accountController = new AccountController();
