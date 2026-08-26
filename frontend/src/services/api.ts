import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000/api/v1`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api/v1';
  return 'http://localhost:3000/api/v1';
}

const API_BASE_URL = getBaseUrl();

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'pmb_access_token',
  REFRESH_TOKEN: 'pmb_refresh_token',
  USER: 'pmb_user',
} as const;

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  requireAuth?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiError {
  statusCode: number;
  message: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  get baseUrl(): string {
    return API_BASE_URL;
  }

  async init() {
    try {
      const [access, refresh] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      this.accessToken = access[1];
      this.refreshToken = refresh[1];
    } catch {
      // Non-fatal
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, access],
      [STORAGE_KEYS.REFRESH_TOKEN, refresh],
    ]);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
  }

  async request<T = any>({ method, path, body, requireAuth = true }: ApiRequestOptions): Promise<T> {
    if (requireAuth && !this.accessToken) {
      throw { statusCode: 401, message: 'Not authenticated' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        statusCode: response.status,
        message: (json as any).message || 'Request failed',
      };

      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request({ method, path, body, requireAuth });
        }
      }

      throw error;
    }

    return json.data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return false;
      }

      const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await response.json();
      await this.setTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    } catch {
      await this.clearTokens();
      return false;
    }
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch {
      // Non-fatal
    }
    await this.clearTokens();
    await AsyncStorage.removeItem('pmb_has_registered');
  }
}

export const apiClient = new ApiClient();
