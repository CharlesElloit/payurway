import Joi from 'joi';

export const registerSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
  }),
});

export const loginSchema = Joi.object({
  phone: Joi.string().required(),
  password: Joi.string().required(),
});

export const verifyOTPSchema = Joi.object({
  phone: Joi.string().required(),
  otp: Joi.string().length(6).required(),
});

export const resendOTPSchema = Joi.object({
  phone: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  email: Joi.string().email(),
}).min(1);

export const linkAccountSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required(),
  pin: Joi.string().pattern(/^\d{4,6}$/).required().messages({
    'string.pattern.base': 'PIN must be 4-6 digits',
  }),
  carrier: Joi.string().valid('mtn', 'airtel').optional(),
});

export const generateQRCodeSchema = Joi.object({
  carrier: Joi.string().valid('mtn', 'airtel').required(),
  currency: Joi.string().length(3).optional().default('UGX'),
});

export const initiatePaymentSchema = Joi.object({
  senderPhone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required(),
  receiverPhone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional(),
  receiverId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().required(),
  carrier: Joi.string().valid('mtn', 'airtel').required(),
  currency: Joi.string().length(3).optional().default('UGX'),
  description: Joi.string().max(255).optional(),
  qrCodeId: Joi.string().uuid().optional(),
}).oxor('receiverPhone', 'receiverId');

export const scanQRCodeSchema = Joi.object({
  qrCodeId: Joi.string().uuid().required(),
  signature: Joi.string().required(),
  amount: Joi.number().positive().required(),
  senderPhone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required(),
  description: Joi.string().max(255).optional(),
});

export const requestPaymentSchema = Joi.object({
  targetPhone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required(),
  amount: Joi.number().positive().required(),
  carrier: Joi.string().valid('mtn', 'airtel').required(),
  description: Joi.string().max(255).optional(),
});

export const respondPaymentRequestSchema = Joi.object({
  action: Joi.string().valid('accept', 'reject').required(),
});

export const paymentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  status: Joi.string()
    .valid('pending', 'processing', 'requested', 'completed', 'failed', 'cancelled', 'expired')
    .optional(),
});

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

export const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
