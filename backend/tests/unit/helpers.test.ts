import {
  generateOTP,
  hashOTP,
  verifyOTPHash,
  signQRCodeData,
  generateTransactionReference,
  normalizePhoneNumber,
  detectCarrier,
  formatCurrency,
  paginate,
  maskPhone,
} from '../../src/utils/helpers';

describe('Helper Utilities', () => {
  describe('OTP Generation', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('OTP Hashing', () => {
    it('should hash an OTP', () => {
      const hash = hashOTP('123456');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes', () => {
      const hash1 = hashOTP('123456');
      const hash2 = hashOTP('123456');
      expect(hash1).toBe(hash2);
    });

    it('should verify correct OTP', () => {
      const otp = '123456';
      const hash = hashOTP(otp);
      expect(verifyOTPHash(otp, hash)).toBe(true);
    });

    it('should reject incorrect OTP', () => {
      const hash = hashOTP('123456');
      expect(verifyOTPHash('000000', hash)).toBe(false);
    });
  });

  describe('QR Code Signing', () => {
    it('should sign data and produce a hex string', () => {
      const data = JSON.stringify({ id: 'test', amount: 50000 });
      const sig = signQRCodeData(data);
      expect(sig).toBeDefined();
      expect(/^[a-f0-9]+$/.test(sig)).toBe(true);
    });

    it('should produce consistent signatures', () => {
      const data = 'same-data';
      const sig1 = signQRCodeData(data);
      const sig2 = signQRCodeData(data);
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different data', () => {
      const sig1 = signQRCodeData('data-1');
      const sig2 = signQRCodeData('data-2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Transaction Reference', () => {
    it('should generate a reference starting with PMB-', () => {
      const ref = generateTransactionReference();
      expect(ref.startsWith('PMB-')).toBe(true);
    });

    it('should generate unique references', () => {
      const refs = new Set(Array.from({ length: 100 }, () => generateTransactionReference()));
      expect(refs.size).toBe(100);
    });
  });

  describe('Phone Number Normalization', () => {
    it('should add country code to local number', () => {
      expect(normalizePhoneNumber('0771234567')).toBe('256771234567');
    });

    it('should keep number with country code', () => {
      expect(normalizePhoneNumber('+256771234567')).toBe('256771234567');
    });

    it('should handle number without leading zero', () => {
      expect(normalizePhoneNumber('771234567')).toBe('256771234567');
    });
  });

  describe('Carrier Detection', () => {
    it('should detect MTN from 77 prefix', () => {
      expect(detectCarrier('+256771234567')).toBe('mtn');
    });

    it('should detect MTN from 78 prefix', () => {
      expect(detectCarrier('25678123456')).toBe('mtn');
    });

    it('should detect MTN from 79 prefix', () => {
      expect(detectCarrier('791234567')).toBe('mtn');
    });

    it('should detect Airtel from 70 prefix', () => {
      expect(detectCarrier('701234567')).toBe('airtel');
    });

    it('should detect Airtel from 75 prefix', () => {
      expect(detectCarrier('751234567')).toBe('airtel');
    });

    it('should detect Airtel from 76 prefix', () => {
      expect(detectCarrier('+25676123456')).toBe('airtel');
    });

    it('should return null for unknown prefix', () => {
      expect(detectCarrier('0801234567')).toBeNull();
    });
  });

  describe('Currency Formatting', () => {
    it('should format UGX currency', () => {
      const formatted = formatCurrency(50000);
      expect(formatted).toContain('50');
    });

    it('should handle zero amount', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should calculate skip for page 1', () => {
      const result = paginate(1, 20);
      expect(result.skip).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate skip for page 3', () => {
      const result = paginate(3, 20);
      expect(result.skip).toBe(40);
    });

    it('should clamp page to minimum 1', () => {
      const result = paginate(0, 20);
      expect(result.page).toBe(1);
    });

    it('should clamp limit to max 100', () => {
      const result = paginate(1, 200);
      expect(result.limit).toBe(100);
    });

    it('should clamp limit to minimum 1', () => {
      const result = paginate(1, 0);
      expect(result.limit).toBe(1);
    });
  });

  describe('Phone Masking', () => {
    it('should mask middle digits', () => {
      const masked = maskPhone('+256771234567');
      expect(masked).toBe('+25********67');
    });

    it('should handle short numbers', () => {
      const masked = maskPhone('123');
      expect(masked).toBe('123');
    });
  });
});
