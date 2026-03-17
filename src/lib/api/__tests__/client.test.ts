/**
 * Tests for: src/lib/api/client.tsx
 *
 * The client module creates an axios instance and registers two interceptors:
 *   1. Request interceptor — attaches Bearer token when one is stored.
 *   2. Response interceptor — unwraps response.data on success; on 401
 *      TOKEN_EXPIRED it refreshes tokens (queuing concurrent failures) and
 *      signs out when refresh fails.
 *
 * Testing approach:
 * - We cannot spy on the interceptors through the public axios API after
 *   the fact, so we extract and call the interceptor handler functions
 *   directly by capturing them from `axios.create().interceptors.*`.
 * - `axios.create` is mocked before importing `client.tsx` so we can
 *   collect the registered handlers.
 * - Dynamic imports inside the error interceptor (`@/lib/api/auth` and
 *   `@/features/auth/use-auth-store`) are mocked with jest.mock.
 */

// ---------------------------------------------------------------------------
// IMPORTANT: All jest.mock calls must be declared BEFORE any imports so that
// Jest hoists them to the top of the file at transform time.
// ---------------------------------------------------------------------------

jest.mock('env', () => ({
  __esModule: true,
  default: { EXPO_PUBLIC_API_URL: 'https://api.test.avyren.com' },
}));

// Mock getToken used by the request interceptor
jest.mock('@/lib/auth/utils', () => ({
  getToken: jest.fn(),
}));

// Mock authApi.refreshToken used inside the error interceptor (dynamic import)
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    refreshToken: jest.fn(),
  },
}));

// Mock signOut and updateTokens used inside the error interceptor (dynamic import)
jest.mock('@/features/auth/use-auth-store', () => ({
  signOut: jest.fn(),
  updateTokens: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Axios mock — exposes a stable callable instance with interceptor spies.
// ---------------------------------------------------------------------------

type RequestHandler = (config: any) => any;
type ResponseSuccessHandler = (response: any) => any;
type ResponseErrorHandler = (error: any) => Promise<any>;

jest.mock('axios', () => {
  const mockAxiosInstance = Object.assign(
    jest.fn().mockResolvedValue({ data: {} }),
    {
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    },
  );

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

// ---------------------------------------------------------------------------
// Import the module under test AFTER all jest.mock declarations.
// Importing it triggers axios.create() and interceptor registration.
// ---------------------------------------------------------------------------
// eslint-disable-next-line import/first
import axios from 'axios';
import { authApi } from '@/lib/api/auth';
import { getToken } from '@/lib/auth/utils';
import { signOut, updateTokens } from '@/features/auth/use-auth-store';
import { client } from '@/lib/api/client';

type MockAxiosInstance = jest.Mock & {
  interceptors: {
    request: {
      use: jest.Mock;
    };
    response: {
      use: jest.Mock;
    };
  };
};

const mockAxiosCreate = jest.mocked(axios.create);
const mockAxiosInstance = mockAxiosCreate() as MockAxiosInstance;
const mockRequestUse = jest.mocked(mockAxiosInstance.interceptors.request.use);
const mockResponseUse = jest.mocked(mockAxiosInstance.interceptors.response.use);
const mockCallableInstance = jest.mocked(mockAxiosInstance);
const mockGetToken = jest.mocked(getToken);
const mockRefreshToken = jest.mocked(authApi.refreshToken);
const mockSignOut = jest.mocked(signOut);
const mockUpdateTokens = jest.mocked(updateTokens);

function getCapturedRequestOnFulfilled() {
  return mockRequestUse.mock.calls[0]?.[0] as RequestHandler;
}

function getCapturedRequestOnRejected() {
  return mockRequestUse.mock.calls[0]?.[1] as (error: unknown) => Promise<unknown>;
}

function getCapturedResponseOnFulfilled() {
  return mockResponseUse.mock.calls[0]?.[0] as ResponseSuccessHandler;
}

function getCapturedResponseOnRejected() {
  return mockResponseUse.mock.calls[0]?.[1] as ResponseErrorHandler;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAxiosError(
  status: number,
  code?: string,
  config?: Partial<{ _retry: boolean; headers: Record<string, string> }>,
) {
  return {
    response: {
      status,
      data: { success: false, code, message: 'error' },
    },
    config: {
      _retry: false,
      headers: { Authorization: '' },
      ...config,
    },
    isAxiosError: true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('client (axios interceptors)', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    mockRefreshToken.mockReset();
    mockSignOut.mockReset();
    mockUpdateTokens.mockReset();
    mockCallableInstance.mockReset();
    mockCallableInstance.mockResolvedValue({ data: {} });
  });

  // =========================================================================
  describe('module setup', () => {
    it('exports a client object', () => {
      expect(client).toBeDefined();
    });

    it('registers exactly one request interceptor', () => {
      expect(mockRequestUse).toHaveBeenCalledTimes(1);
    });

    it('registers exactly one response interceptor', () => {
      expect(mockResponseUse).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  describe('request interceptor', () => {
    it('attaches Authorization header when a token exists', () => {
      mockGetToken.mockReturnValue({ access: 'access-token-123', refresh: 'refresh-token' });

      const config = { headers: {} } as any;
      const result = getCapturedRequestOnFulfilled()(config);

      expect(result.headers.Authorization).toBe('Bearer access-token-123');
    });

    it('does not attach Authorization header when no token is stored', () => {
      mockGetToken.mockReturnValue(null);

      const config = { headers: {} } as any;
      const result = getCapturedRequestOnFulfilled()(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('does not attach Authorization header when token exists but access is empty', () => {
      // tokenData is non-null but access is falsy
      mockGetToken.mockReturnValue({ access: '', refresh: 'refresh-token' });

      const config = { headers: {} } as any;
      const result = getCapturedRequestOnFulfilled()(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('returns the config unchanged when no token', () => {
      mockGetToken.mockReturnValue(null);

      const config = { headers: { 'Content-Type': 'application/json' } } as any;
      const result = getCapturedRequestOnFulfilled()(config);

      expect(result).toBe(config);
    });

    it('request error handler rejects with the error', async () => {
      const err = new Error('network failure');
      await expect(getCapturedRequestOnRejected()(err)).rejects.toThrow('network failure');
    });
  });

  // =========================================================================
  describe('response interceptor — success', () => {
    it('unwraps response.data and returns it directly', () => {
      const response = {
        data: { success: true, data: { id: '1' }, message: 'OK' },
        status: 200,
      };

      const result = getCapturedResponseOnFulfilled()(response);

      // The interceptor returns response.data (the ApiResponse object), not the
      // full axios response.
      expect(result).toEqual({ success: true, data: { id: '1' }, message: 'OK' });
    });
  });

  // =========================================================================
  describe('response interceptor — error handling', () => {
    it('passes non-401 errors through without refresh', async () => {
      const error = makeAxiosError(403, 'FORBIDDEN');

      await expect(getCapturedResponseOnRejected()(error)).rejects.toEqual(error);
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    it('passes 401 errors WITHOUT TOKEN_EXPIRED code through without refresh', async () => {
      const error = makeAxiosError(401, 'UNAUTHORIZED');

      await expect(getCapturedResponseOnRejected()(error)).rejects.toEqual(error);
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    it('passes 500 errors through without refresh', async () => {
      const error = makeAxiosError(500);

      await expect(getCapturedResponseOnRejected()(error)).rejects.toEqual(error);
    });

    // -----------------------------------------------------------------------
    // Token refresh on 401 TOKEN_EXPIRED
    // -----------------------------------------------------------------------

    it('attempts token refresh on 401 TOKEN_EXPIRED and retries original request', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      mockRefreshToken.mockResolvedValue({
        data: {
          success: true,
          data: {
            tokens: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 },
          },
        },
      });
      mockCallableInstance.mockResolvedValueOnce({ success: true, data: {} });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await getCapturedResponseOnRejected()(error);

      expect(mockRefreshToken).toHaveBeenCalledWith('old-refresh');
    });

    it('calls updateTokens with new tokens after successful refresh', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      mockRefreshToken.mockResolvedValue({
        data: {
          success: true,
          data: {
            tokens: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 },
          },
        },
      });
      mockCallableInstance.mockResolvedValueOnce({ success: true });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');
      await getCapturedResponseOnRejected()(error);

      expect(mockUpdateTokens).toHaveBeenCalledWith({
        access: 'new-access',
        refresh: 'new-refresh',
      });
    });

    it('retries the original request with the new Authorization header', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      mockRefreshToken.mockResolvedValue({
        data: {
          data: {
            tokens: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 },
          },
        },
      });
      mockCallableInstance.mockResolvedValueOnce({ success: true });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');
      await getCapturedResponseOnRejected()(error);

      // The retried request should carry the new token
      const retriedConfig = mockCallableInstance.mock.calls[0][0];
      expect(retriedConfig.headers.Authorization).toBe('Bearer new-access');
    });

    it('does not retry a request that already has _retry=true (avoids infinite loops)', async () => {
      const error = makeAxiosError(401, 'TOKEN_EXPIRED', { _retry: true });

      await expect(getCapturedResponseOnRejected()(error)).rejects.toBeDefined();
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Refresh failure → sign out
    // -----------------------------------------------------------------------

    it('signs out when the refresh token call fails', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      mockRefreshToken.mockRejectedValue(new Error('refresh failed'));

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await expect(getCapturedResponseOnRejected()(error)).rejects.toThrow('refresh failed');
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('signs out when no refresh token is available in storage', async () => {
      // getToken returns null — no refresh token available
      mockGetToken.mockReturnValue(null);

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await expect(getCapturedResponseOnRejected()(error)).rejects.toThrow(
        'No refresh token available',
      );
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('signs out when the refresh response contains no tokens', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      // Response data has no tokens field
      mockRefreshToken.mockResolvedValue({
        data: { success: false, data: null },
      });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await expect(getCapturedResponseOnRejected()(error)).rejects.toThrow(
        'Invalid refresh response',
      );
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // Concurrent 401 queue pattern
    // -----------------------------------------------------------------------

    it('queues concurrent 401 requests and resolves them all after a single refresh', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });

      // Simulate a slow refresh call — we hold the resolve until both errors are submitted.
      let resolveRefresh!: (value: any) => void;
      const refreshPromise = new Promise<any>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshToken.mockReturnValue(refreshPromise);

      // The instance callable resolves all retried requests with success
      mockCallableInstance.mockResolvedValue({ success: true });

      const error1 = makeAxiosError(401, 'TOKEN_EXPIRED');
      const error2 = makeAxiosError(401, 'TOKEN_EXPIRED');

      // Fire both 401 errors concurrently (do not await yet)
      const promise1 = getCapturedResponseOnRejected()(error1);
      const promise2 = getCapturedResponseOnRejected()(error2);

      // Now resolve the refresh
      resolveRefresh({
        data: {
          data: {
            tokens: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 },
          },
        },
      });

      await Promise.all([promise1, promise2]);

      // Only one refresh call should have been made regardless of two 401 errors.
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('rejects all queued requests when refresh fails', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });

      let rejectRefresh!: (reason: any) => void;
      const refreshPromise = new Promise<any>((_, reject) => {
        rejectRefresh = reject;
      });
      refreshPromise.catch(() => undefined);
      mockRefreshToken.mockReturnValue(refreshPromise);

      const error1 = makeAxiosError(401, 'TOKEN_EXPIRED');
      const error2 = makeAxiosError(401, 'TOKEN_EXPIRED');

      const promise1 = getCapturedResponseOnRejected()(error1).catch((error) => error);
      const promise2 = getCapturedResponseOnRejected()(error2).catch((error) => error);

      const refreshError = new Error('refresh network down');
      rejectRefresh(refreshError);

      // Both queued promises must reject
      await expect(promise1).resolves.toBe(refreshError);
      await expect(promise2).resolves.toBe(refreshError);
    });
  });
});
