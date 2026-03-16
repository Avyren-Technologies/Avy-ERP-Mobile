import axios from 'axios';
import Env from 'env';

import { client } from '@/lib/api/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  tenantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// Separate axios instance for refresh token calls to avoid interceptor loops
const refreshClient = axios.create({
  baseURL: Env.EXPO_PUBLIC_API_URL,
});

/**
 * Auth API service.
 *
 * NOTE: The response interceptor on `client` unwraps `response.data`,
 * so all client calls resolve with `ApiResponse<T>` directly at runtime.
 * We cast accordingly so TypeScript matches the runtime behaviour.
 */
export const authApi = {
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }) as Promise<ApiResponse<LoginResponse>>,

  /** Uses the raw refreshClient (no interceptors) to avoid infinite loops */
  refreshToken: (refreshToken: string) =>
    refreshClient.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh-token', {
      refreshToken,
    }),

  logout: () =>
    client.post('/auth/logout') as Promise<ApiResponse>,

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }) as Promise<ApiResponse>,

  verifyResetCode: (email: string, code: string) =>
    client.post('/auth/verify-reset-code', { email, code }) as Promise<ApiResponse>,

  resetPassword: (email: string, code: string, newPassword: string) =>
    client.post('/auth/reset-password', { email, code, newPassword }) as Promise<ApiResponse>,

  getProfile: () =>
    client.get('/auth/profile') as Promise<ApiResponse<AuthUser>>,

  changePassword: (currentPassword: string, newPassword: string) =>
    client.post('/auth/change-password', { currentPassword, newPassword }) as Promise<ApiResponse>,
};
