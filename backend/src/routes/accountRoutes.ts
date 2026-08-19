import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { linkAccountSchema } from '../utils/validations';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.post('/link', validate(linkAccountSchema), accountController.linkAccount);
router.get('/', accountController.getAccounts);
router.get('/:id', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), accountController.getAccount);
router.delete('/:id', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), accountController.removeAccount);
router.patch('/:id/default', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), accountController.setDefault);
router.get('/:id/balance', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), accountController.getBalance);
router.post('/:id/balance/refresh', validate(Joi.object({ id: Joi.string().uuid().required() }), 'params'), accountController.refreshBalance);

export default router;
