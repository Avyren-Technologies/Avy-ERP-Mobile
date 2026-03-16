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
const mockGetToken = jest.fn<{ access: string; refresh: string } | null, []>();

jest.mock('@/lib/auth/utils', () => ({
  getToken: mockGetToken,
}));

// Mock authApi.refreshToken used inside the error interceptor (dynamic import)
const mockRefreshToken = jest.fn();

jest.mock('@/lib/api/auth', () => ({
  authApi: {
    refreshToken: mockRefreshToken,
  },
}));

// Mock signOut and updateTokens used inside the error interceptor (dynamic import)
const mockSignOut = jest.fn();
const mockUpdateTokens = jest.fn();

jest.mock('@/features/auth/use-auth-store', () => ({
  signOut: mockSignOut,
  updateTokens: mockUpdateTokens,
}));

// ---------------------------------------------------------------------------
// Axios mock — captures interceptor handlers so we can invoke them directly.
// ---------------------------------------------------------------------------

type RequestHandler = (config: any) => any;
type ResponseSuccessHandler = (response: any) => any;
type ResponseErrorHandler = (error: any) => Promise<any>;

let capturedRequestOnFulfilled: RequestHandler;
let capturedRequestOnRejected: (error: unknown) => Promise<unknown>;
let capturedResponseOnFulfilled: ResponseSuccessHandler;
let capturedResponseOnRejected: ResponseErrorHandler;

// The mock axios instance that client.tsx receives from axios.create()
const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn((onFulfilled: RequestHandler, onRejected: any) => {
        capturedRequestOnFulfilled = onFulfilled;
        capturedRequestOnRejected = onRejected;
      }),
    },
    response: {
      use: jest.fn((onFulfilled: ResponseSuccessHandler, onRejected: ResponseErrorHandler) => {
        capturedResponseOnFulfilled = onFulfilled;
        capturedResponseOnRejected = onRejected;
      }),
    },
  },
  // The instance itself is callable (client(config)) — used when retrying requests
  // and when resolving queued requests.
} as any;

// Make the mock instance callable: client(config) => Promise
const callableInstance = jest.fn().mockImplementation(() => Promise.resolve({ data: {} }));
Object.assign(callableInstance, mockAxiosInstance);

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => callableInstance),
  },
  create: jest.fn(() => callableInstance),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER all jest.mock declarations.
// Importing it triggers axios.create() and interceptor registration.
// ---------------------------------------------------------------------------
// eslint-disable-next-line import/first
import { client } from '@/lib/api/client';

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
    jest.clearAllMocks();
    // Reset the callable instance mock too
    callableInstance.mockImplementation(() => Promise.resolve({ data: {} }));
  });

  // =========================================================================
  describe('module setup', () => {
    it('exports a client object', () => {
      expect(client).toBeDefined();
    });

    it('registers exactly one request interceptor', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    });

    it('registers exactly one response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  describe('request interceptor', () => {
    it('attaches Authorization header when a token exists', () => {
      mockGetToken.mockReturnValue({ access: 'access-token-123', refresh: 'refresh-token' });

      const config = { headers: {} } as any;
      const result = capturedRequestOnFulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer access-token-123');
    });

    it('does not attach Authorization header when no token is stored', () => {
      mockGetToken.mockReturnValue(null);

      const config = { headers: {} } as any;
      const result = capturedRequestOnFulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('does not attach Authorization header when token exists but access is empty', () => {
      // tokenData is non-null but access is falsy
      mockGetToken.mockReturnValue({ access: '', refresh: 'refresh-token' });

      const config = { headers: {} } as any;
      const result = capturedRequestOnFulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('returns the config unchanged when no token', () => {
      mockGetToken.mockReturnValue(null);

      const config = { headers: { 'Content-Type': 'application/json' } } as any;
      const result = capturedRequestOnFulfilled(config);

      expect(result).toBe(config);
    });

    it('request error handler rejects with the error', async () => {
      const err = new Error('network failure');
      await expect(capturedRequestOnRejected(err)).rejects.toThrow('network failure');
    });
  });

  // =========================================================================
  describe('response interceptor — success', () => {
    it('unwraps response.data and returns it directly', () => {
      const response = {
        data: { success: true, data: { id: '1' }, message: 'OK' },
        status: 200,
      };

      const result = capturedResponseOnFulfilled(response);

      // The interceptor returns response.data (the ApiResponse object), not the
      // full axios response.
      expect(result).toEqual({ success: true, data: { id: '1' }, message: 'OK' });
    });
  });

  // =========================================================================
  describe('response interceptor — error handling', () => {
    it('passes non-401 errors through without refresh', async () => {
      const error = makeAxiosError(403, 'FORBIDDEN');

      await expect(capturedResponseOnRejected(error)).rejects.toEqual(error);
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    it('passes 401 errors WITHOUT TOKEN_EXPIRED code through without refresh', async () => {
      const error = makeAxiosError(401, 'UNAUTHORIZED');

      await expect(capturedResponseOnRejected(error)).rejects.toEqual(error);
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    it('passes 500 errors through without refresh', async () => {
      const error = makeAxiosError(500);

      await expect(capturedResponseOnRejected(error)).rejects.toEqual(error);
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
      callableInstance.mockResolvedValueOnce({ success: true, data: {} });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await capturedResponseOnRejected(error);

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
      callableInstance.mockResolvedValueOnce({ success: true });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');
      await capturedResponseOnRejected(error);

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
      callableInstance.mockResolvedValueOnce({ success: true });

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');
      await capturedResponseOnRejected(error);

      // The retried request should carry the new token
      const retriedConfig = callableInstance.mock.calls[0][0];
      expect(retriedConfig.headers.Authorization).toBe('Bearer new-access');
    });

    it('does not retry a request that already has _retry=true (avoids infinite loops)', async () => {
      const error = makeAxiosError(401, 'TOKEN_EXPIRED', { _retry: true });

      await expect(capturedResponseOnRejected(error)).rejects.toBeDefined();
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Refresh failure → sign out
    // -----------------------------------------------------------------------

    it('signs out when the refresh token call fails', async () => {
      mockGetToken.mockReturnValue({ access: 'old-access', refresh: 'old-refresh' });
      mockRefreshToken.mockRejectedValue(new Error('refresh failed'));

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await expect(capturedResponseOnRejected(error)).rejects.toThrow('refresh failed');
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('signs out when no refresh token is available in storage', async () => {
      // getToken returns null — no refresh token available
      mockGetToken.mockReturnValue(null);

      const error = makeAxiosError(401, 'TOKEN_EXPIRED');

      await expect(capturedResponseOnRejected(error)).rejects.toThrow(
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

      await expect(capturedResponseOnRejected(error)).rejects.toThrow(
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
      callableInstance.mockResolvedValue({ success: true });

      const error1 = makeAxiosError(401, 'TOKEN_EXPIRED');
      const error2 = makeAxiosError(401, 'TOKEN_EXPIRED');

      // Fire both 401 errors concurrently (do not await yet)
      const promise1 = capturedResponseOnRejected(error1);
      const promise2 = capturedResponseOnRejected(error2);

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
      mockRefreshToken.mockReturnValue(refreshPromise);

      const error1 = makeAxiosError(401, 'TOKEN_EXPIRED');
      const error2 = makeAxiosError(401, 'TOKEN_EXPIRED');

      const promise1 = capturedResponseOnRejected(error1);
      const promise2 = capturedResponseOnRejected(error2);

      const refreshError = new Error('refresh network down');
      rejectRefresh(refreshError);

      // Both queued promises must reject
      await expect(promise1).rejects.toBeDefined();
      await expect(promise2).rejects.toBeDefined();
    });
  });
});
