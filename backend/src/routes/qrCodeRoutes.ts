import { Router } from 'express';
import { qrCodeController } from '../controllers/qrCodeController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateQRCodeSchema, scanQRCodeSchema } from '../utils/validations';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.post('/generate', validate(generateQRCodeSchema), qrCodeController.generateQRCode);
router.get('/history', qrCodeController.getQRHistory);
router.get('/:codeId', validate(Joi.object({ codeId: Joi.string().uuid().required() }), 'params'), qrCodeController.getQRCode);
router.post('/scan', validate(scanQRCodeSchema), qrCodeController.scanQRCode);
router.delete('/:codeId', validate(Joi.object({ codeId: Joi.string().uuid().required() }), 'params'), qrCodeController.revokeQRCode);

export default router;
