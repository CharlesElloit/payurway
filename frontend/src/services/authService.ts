import { apiClient } from './api';

export interface RegisterParams {
  phone: string;
  password: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    isVerified: boolean;
  };
  accessToken: string | null;
  refreshToken: string | null;
  otp?: string;
  requiresVerification?: boolean;
  message?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  requiresVerification?: boolean;
}

export interface VerifyOtpResponse {
  user: {
    id: string;
    phone: string;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface BiometricChallenge {
  challenge: string;
  expiresAt: string;
}

export interface BiometricRegisterResponse {
  credentialId: string;
  deviceName: string | null;
  deviceType: string;
  createdAt: string;
}

export interface BiometricCredential {
  id: string;
  credentialId: string;
  deviceName: string | null;
  deviceType: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

class AuthService {
  async register(params: RegisterParams): Promise<RegisterResponse> {
    return apiClient.request<RegisterResponse>({
      method: 'POST',
      path: '/auth/register',
      body: params,
      requireAuth: false,
    });
  }

  async login(phone: string, password: string): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>({
      method: 'POST',
      path: '/auth/login',
      body: { phone, password },
      requireAuth: false,
    });
  }

  async checkPhone(phone: string): Promise<{ exists: boolean; isVerified: boolean; isActive: boolean }> {
    return apiClient.request<{ exists: boolean; isVerified: boolean; isActive: boolean }>({
      method: 'POST',
      path: '/auth/check-phone',
      body: { phone },
      requireAuth: false,
    });
  }

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    return apiClient.request<VerifyOtpResponse>({
      method: 'POST',
      path: '/auth/verify-otp',
      body: { phone, otp },
      requireAuth: false,
    });
  }

  async resendOtp(phone: string): Promise<{ message: string; otp: string }> {
    return apiClient.request({
      method: 'POST',
      path: '/auth/resend-otp',
      body: { phone },
      requireAuth: false,
    });
  }

  async getProfile() {
    return apiClient.request({
      method: 'GET',
      path: '/auth/profile',
    });
  }

  async getBiometricChallenge(): Promise<BiometricChallenge> {
    return apiClient.request<BiometricChallenge>({
      method: 'POST',
      path: '/auth/biometric/challenge',
      body: {},
    });
  }

  async getBiometricLoginChallenge(): Promise<BiometricChallenge> {
    return apiClient.request<BiometricChallenge>({
      method: 'POST',
      path: '/auth/biometric/login-challenge',
      body: {},
      requireAuth: false,
    });
  }

  async registerBiometric(params: {
    credentialId: string;
    publicKey: string;
    deviceName?: string;
    deviceType: 'fingerprint' | 'face' | 'voice';
  }): Promise<BiometricRegisterResponse> {
    return apiClient.request<BiometricRegisterResponse>({
      method: 'POST',
      path: '/auth/biometric/register',
      body: params,
    });
  }

  async biometricLogin(params: {
    phone: string;
    credentialId: string;
    signature: string;
    challenge: string;
  }): Promise<LoginResponse> {
    return apiClient.request<LoginResponse>({
      method: 'POST',
      path: '/auth/biometric/login',
      body: params,
      requireAuth: false,
    });
  }

  async listBiometricCredentials(): Promise<BiometricCredential[]> {
    return apiClient.request<BiometricCredential[]>({
      method: 'GET',
      path: '/auth/biometric/credentials',
    });
  }

  async deleteBiometricCredential(credentialId: string): Promise<{ message: string }> {
    return apiClient.request({
      method: 'POST',
      path: '/auth/biometric/delete',
      body: { credentialId },
    });
  }

  async revokeAllBiometricCredentials(): Promise<{ message: string }> {
    return apiClient.request({
      method: 'POST',
      path: '/auth/biometric/revoke-all',
      body: {},
    });
  }

  async logout() {
    await apiClient.logout();
  }
}

export const authService = new AuthService();
