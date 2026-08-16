import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paymybills',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  mtn: {
    apiKey: process.env.MTN_API_KEY || '',
    apiUrl: process.env.MTN_API_URL || 'https://proxy.momoapi.mtn.com',
    subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY || '',
    environment: process.env.MTN_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MTN_CALLBACK_URL || 'http://localhost:3000/api/v1/webhooks/mtn',
  },

  airtel: {
    apiKey: process.env.AIRTEL_API_KEY || '',
    apiUrl: process.env.AIRTEL_API_URL || 'https://openapi.airtel.africa',
    clientId: process.env.AIRTEL_CLIENT_ID || '',
    clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
    callbackUrl: process.env.AIRTEL_CALLBACK_URL || 'http://localhost:3000/api/v1/webhooks/airtel',
  },

  otp: {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    maxAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '3', 10),
  },

  qrCode: {
    expirySeconds: parseInt(process.env.QR_CODE_EXPIRY_SECONDS || '600', 10),
    secret: process.env.QR_CODE_SECRET || 'dev-qr-secret-change-in-production',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
