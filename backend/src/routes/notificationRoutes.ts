import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), notificationController.markAsRead);

export default router;
