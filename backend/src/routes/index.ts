import { Router } from 'express';
import authRoutes from './authRoutes';
import accountRoutes from './accountRoutes';
import qrCodeRoutes from './qrCodeRoutes';
import paymentRoutes from './paymentRoutes';
import webhookRoutes from './webhookRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/qr', qrCodeRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
