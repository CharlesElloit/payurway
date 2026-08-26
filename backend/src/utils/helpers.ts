import crypto from 'crypto';
import { config } from '../config';

export function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < config.otp.length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function verifyOTPHash(otp: string, hash: string): boolean {
  return hashOTP(otp) === hash;
}

export function signQRCodeData(data: string): string {
  return crypto
    .createHmac('sha256', config.qrCode.secret)
    .update(data)
    .digest('hex');
}

export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `PMB-${timestamp}-${random}`.toUpperCase();
}

export function generateTransactionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(5).toString('hex');
  return `TXT-${timestamp}-${random}`.toUpperCase();
}

export function normalizePhoneNumber(phone: string, countryCode = '256'): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith(countryCode)) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return countryCode + cleaned.substring(1);
  }
  return countryCode + cleaned;
}

export function detectCarrier(phone: string): 'mtn' | 'airtel' | null {
  const cleaned = phone.replace(/\D/g, '');
  const localNumber = cleaned.startsWith('256') ? cleaned.substring(3) : cleaned;

  if (localNumber.startsWith('77') || localNumber.startsWith('78') || localNumber.startsWith('79') || localNumber.startsWith('31')) {
    return 'mtn';
  }
  if (localNumber.startsWith('70') || localNumber.startsWith('75') || localNumber.startsWith('76')) {
    return 'airtel';
  }
  return null;
}

export function formatCurrency(amount: number, currency = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function paginate(page: number, limit: number) {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  const skip = (p - 1) * l;
  return { page: p, limit: l, skip };
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const visibleStart = phone.substring(0, 3);
  const visibleEnd = phone.substring(phone.length - 2);
  const masked = '*'.repeat(phone.length - 5);
  return `${visibleStart}${masked}${visibleEnd}`;
}
