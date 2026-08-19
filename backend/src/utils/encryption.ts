import crypto from 'crypto';
import { config } from '../config';
import { BadRequestError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SEPARATOR = ':';

function getKey(): Buffer {
  const key = config.encryption.key;
  if (!key) {
    throw new BadRequestError('ENCRYPTION_KEY is not configured');
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}${SEPARATOR}${tag.toString('hex')}${SEPARATOR}${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(SEPARATOR);

  if (parts.length !== 3) {
    throw new BadRequestError('Invalid encrypted data format');
  }

  const [ivHex, tagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function encryptPin(pin: string): string {
  return encrypt(pin);
}

export function decryptPin(encryptedPin: string): string {
  return decrypt(encryptedPin);
}
