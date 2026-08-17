import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { initiatePaymentSchema, paymentQuerySchema, requestPaymentSchema, respondPaymentRequestSchema } from '../utils/validations';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.post('/initiate', validate(initiatePaymentSchema), paymentController.initiatePayment);
router.get('/', validate(paymentQuerySchema, 'query'), paymentController.getPayments);
router.get('/requests', paymentController.getPaymentRequests);
router.get('/reference/:reference', validate(Joi.object({ reference: Joi.string().required() }), 'params'), paymentController.getPaymentByReference);
router.get('/:id', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), paymentController.getPayment);
router.post('/:id/cancel', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), paymentController.cancelPayment);
router.post('/request', validate(requestPaymentSchema), paymentController.requestPayment);
router.post('/:id/respond', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), validate(respondPaymentRequestSchema), paymentController.respondToRequest);

export default router;
