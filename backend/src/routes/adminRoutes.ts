import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { paginationQuerySchema } from '../utils/validations';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/transactions', adminController.getTransactions);
router.get('/users', adminController.getUsers);
router.get('/analytics', adminController.getAnalytics);

export default router;
