import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

const router = Router();

router.post('/mtn', webhookController.handleMTNWebhook);
router.post('/airtel', webhookController.handleAirtelWebhook);
router.post('/status', webhookController.handleStatusCallback);

export default router;
