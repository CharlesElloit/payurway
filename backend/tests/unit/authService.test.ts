import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockUser, mockUnverifiedUser, mockRefreshToken } from '../mocks/fixtures';
import { authService } from '../../src/services/authService';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../src/utils/errors';
import { hashOTP } from '../../src/utils/helpers';

beforeEach(() => {
  resetMocks();
});

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      const result = await authService.register({
        email: 'test@example.com',
        phone: '+256771234567',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.otpSent).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should throw ConflictError if email already exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue(mockUser as any);

      await expect(
        authService.register({
          email: 'test@example.com',
          phone: '+256701234567',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if phone already exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue(mockUser as any);

      await expect(
        authService.register({
          email: 'new@example.com',
          phone: '+256771234567',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should hash the password before storing', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      await authService.register({
        email: 'test@example.com',
        phone: '+256771234567',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      const createCall = prismaMock.user.create.mock.calls[0][0];
      const passwordHash = createCall.data.passwordHash;
      const isValid = await bcrypt.compare('password123', passwordHash);
      expect(isValid).toBe(true);
      expect(passwordHash).not.toBe('password123');
    });

    it('should store OTP in redis', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      await authService.register({
        email: 'test@example.com',
        phone: '+256771234567',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(redisMock.setex).toHaveBeenCalledWith(
        `otp:${mockUser.phone}`,
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);
      prismaMock.user.update.mockResolvedValue(userWithHash as any);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedError for wrong email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('wrong@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      prismaMock.user.findUnique.mockResolvedValue(inactiveUser as any);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should return requiresVerification for unverified user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const userWithHash = { ...mockUnverifiedUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.requiresVerification).toBe(true);
      expect(result.accessToken).toBeNull();
      expect(result.refreshToken).toBeNull();
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should store refresh token when userAgent provided', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);
      prismaMock.user.update.mockResolvedValue(userWithHash as any);
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken as any);

      await authService.login('test@example.com', 'password123', 'test-agent', '127.0.0.1');

      expect(prismaMock.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should update lastLoginAt on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);
      prismaMock.user.update.mockResolvedValue(userWithHash as any);

      await authService.login('test@example.com', 'password123');

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      );
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP and return tokens', async () => {
      const otp = '123456';
      const otpHash = hashOTP(otp);
      redisMock.get.mockResolvedValue(JSON.stringify({ hash: otpHash, attempts: 0, createdAt: Date.now() }));
      redisMock.del.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue(mockUnverifiedUser as any);
      prismaMock.user.update.mockResolvedValue({ ...mockUnverifiedUser, isVerified: true } as any);

      const result = await authService.verifyOTP('+256771234567', otp);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(redisMock.del).toHaveBeenCalledWith('otp:+256771234567');
    });

    it('should throw BadRequestError for expired OTP', async () => {
      redisMock.get.mockResolvedValue(null);

      await expect(
        authService.verifyOTP('+256771234567', '123456')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for max OTP attempts', async () => {
      redisMock.get.mockResolvedValue(
        JSON.stringify({ hash: 'somehash', attempts: 3, createdAt: Date.now() })
      );

      await expect(
        authService.verifyOTP('+256771234567', '123456')
      ).rejects.toThrow(BadRequestError);
    });

    it('should increment attempts for wrong OTP', async () => {
      redisMock.get.mockResolvedValue(
        JSON.stringify({ hash: hashOTP('correct'), attempts: 0, createdAt: Date.now() })
      );
      redisMock.setex.mockResolvedValue('OK');

      await expect(
        authService.verifyOTP('+256771234567', 'wrong')
      ).rejects.toThrow(BadRequestError);

      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should mark user as verified if not yet verified', async () => {
      const otp = '123456';
      redisMock.get.mockResolvedValue(
        JSON.stringify({ hash: hashOTP(otp), attempts: 0, createdAt: Date.now() })
      );
      redisMock.del.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue(mockUnverifiedUser as any);
      prismaMock.user.update.mockResolvedValue({ ...mockUnverifiedUser, isVerified: true } as any);

      await authService.verifyOTP('+256771234567', otp);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isVerified: true }),
        })
      );
    });
  });

  describe('resendOTP', () => {
    it('should resend OTP successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      redisMock.get.mockResolvedValue(null);

      const result = await authService.resendOTP('+256771234567');

      expect(result.message).toBe('OTP sent successfully');
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should throw NotFoundError for unknown phone', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.resendOTP('+25600000000')).rejects.toThrow(NotFoundError);
    });

    it('should throw if recent OTP exists within cooldown', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      redisMock.get.mockResolvedValue(
        JSON.stringify({ hash: 'somehash', attempts: 1, createdAt: Date.now() })
      );

      await expect(authService.resendOTP('+256771234567')).rejects.toThrow(BadRequestError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(mockRefreshToken as any);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.refreshToken.delete.mockResolvedValue(mockRefreshToken as any);
      prismaMock.refreshToken.create.mockResolvedValue(mockRefreshToken as any);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for expired token', async () => {
      const expiredToken = { ...mockRefreshToken, expiresAt: new Date(Date.now() - 1000) };
      prismaMock.refreshToken.findUnique.mockResolvedValue(expiredToken as any);
      prismaMock.refreshToken.delete.mockResolvedValue(expiredToken as any);

      await expect(authService.refreshToken('expired-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should logout and delete refresh token', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await authService.logout('valid-token');

      expect(result.message).toBe('Logged out successfully');
      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await authService.getProfile('user-uuid-1');

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundError for unknown user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('unknown-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await authService.updateProfile('user-uuid-1', { firstName: 'Jane' });

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const hashedPassword = await bcrypt.hash('currentpass', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);
      prismaMock.user.update.mockResolvedValue(userWithHash as any);
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await authService.changePassword('user-uuid-1', 'currentpass', 'newpass123');

      expect(result.message).toContain('Password changed');
      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should throw BadRequestError for wrong current password', async () => {
      const hashedPassword = await bcrypt.hash('correctpass', 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(userWithHash as any);

      await expect(
        authService.changePassword('user-uuid-1', 'wrongpass', 'newpass123')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError for unknown user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('unknown-id', 'pass', 'newpass')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
