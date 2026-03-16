import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import Env from 'env';

import { getToken } from '@/lib/auth/utils';

export const client = axios.create({
  baseURL: Env.EXPO_PUBLIC_API_URL,
});

// --- Token refresh queue pattern ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// --- Request interceptor: attach access token ---
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokenData = getToken();
    if (tokenData?.access) {
      config.headers.Authorization = `Bearer ${tokenData.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response interceptor: unwrap data + handle 401 refresh ---
client.interceptors.response.use(
  // Success: unwrap axios response.data so consumers get ApiResponse directly
  (response) => response.data,

  // Error handler
  async (error: AxiosError<{ success: boolean; code?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isTokenExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED';

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokenData = getToken();
        if (!tokenData?.refresh) {
          throw new Error('No refresh token available');
        }

        // Import dynamically to avoid circular dependency at module level
        const { authApi } = await import('@/lib/api/auth');
        const response = await authApi.refreshToken(tokenData.refresh);
        const newTokens = response.data?.data?.tokens;

        if (!newTokens) {
          throw new Error('Invalid refresh response');
        }

        // Update store with new tokens
        const { updateTokens } = await import('@/features/auth/use-auth-store');
        updateTokens({
          access: newTokens.accessToken,
          refresh: newTokens.refreshToken,
        });

        // Process queued requests with new token
        processQueue(null, newTokens.accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Sign out on refresh failure
        const { signOut } = await import('@/features/auth/use-auth-store');
        signOut();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
