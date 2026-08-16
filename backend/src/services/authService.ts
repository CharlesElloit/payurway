import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config';
import { AuthUser } from '../types';
import { generateOTP, hashOTP, verifyOTPHash } from '../utils/helpers';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import logger from '../utils/logger';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictError(
        existingUser.email === data.email
          ? 'Email already registered'
          : 'Phone number already registered'
      );
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.phone);

    const otp = generateOTP();
    await this.storeOTP(user.phone, otp);
    await this.sendOTP(user.phone, otp);

    logger.info({ userId: user.id }, 'User registered');

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      otpSent: true,
    };
  }

  async login(email: string, password: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      await this.storeOTP(user.phone, otp);
      await this.sendOTP(user.phone, otp);
      return {
        user: this.sanitizeUser(user),
        accessToken: null,
        refreshToken: null,
        requiresVerification: true,
        message: 'Account not verified. OTP sent to your phone.',
      };
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.phone);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (userAgent || ipAddress) {
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    logger.info({ userId: user.id }, 'User logged in');

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async verifyOTP(phone: string, otp: string) {
    const key = `otp:${phone}`;
    const stored = await redis.get(key);

    if (!stored) {
      throw new BadRequestError('OTP expired or not found');
    }

    const otpData = JSON.parse(stored);

    if (otpData.attempts >= config.otp.maxAttempts) {
      await redis.del(key);
      throw new BadRequestError('Too many OTP attempts. Please request a new OTP.');
    }

    if (!verifyOTPHash(otp, otpData.hash)) {
      otpData.attempts += 1;
      await redis.setex(key, config.otp.expirySeconds, JSON.stringify(otpData));
      throw new BadRequestError(`Invalid OTP. ${config.otp.maxAttempts - otpData.attempts} attempts remaining.`);
    }

    await redis.del(key);

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.phone);

    logger.info({ userId: user.id }, 'OTP verified');

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async resendOTP(phone: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const key = `otp:${phone}`;
    const existing = await redis.get(key);
    if (existing) {
      const data = JSON.parse(existing);
      if (data.attempts > 0 && Date.now() - data.createdAt < 60000) {
        throw new BadRequestError('Please wait before requesting a new OTP');
      }
    }

    const otp = generateOTP();
    await this.storeOTP(phone, otp);
    await this.sendOTP(phone, otp);

    return { message: 'OTP sent successfully' };
  }

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(user.id, user.email, user.phone);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        userAgent: stored.userAgent,
        ipAddress: stored.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  private async generateTokens(userId: string, email: string, phone: string) {
    const payload: AuthUser = { id: userId, email, phone };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry as any,
    });

    const refreshToken = jwt.sign(
      { id: userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiry as any }
    );

    return { accessToken, refreshToken };
  }

  private async storeOTP(phone: string, otp: string) {
    const key = `otp:${phone}`;
    const data = {
      hash: hashOTP(otp),
      attempts: 0,
      createdAt: Date.now(),
    };
    await redis.setex(key, config.otp.expirySeconds, JSON.stringify(data));
  }

  private async sendOTP(phone: string, otp: string): Promise<void> {
    logger.info({ phone, otp }, 'OTP generated (sending not implemented yet)');
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
