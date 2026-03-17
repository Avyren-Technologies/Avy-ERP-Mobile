/**
 * Tests for: src/lib/api/auth.ts
 *
 * Strategy:
 * - Mock `@/lib/api/client` so that `client.post` / `client.get` are jest fns.
 * - Mock `axios` so that `axios.create()` returns a mock instance whose
 *   `.post` we can inspect (used by the refreshClient path).
 * - All jest.mock factories must be self-contained; outer variables referenced
 *   inside factories must be prefixed with 'mock' to satisfy Jest's hoisting
 *   rules. We then use jest.mocked() after imports to get typed references.
 */

// ---------------------------------------------------------------------------
// Mocks — hoisted before all imports
// ---------------------------------------------------------------------------

jest.mock('env', () => ({
  __esModule: true,
  default: {
    EXPO_PUBLIC_API_URL: 'https://api.test.avyren.com',
  },
}));

// Mock the intercepted axios client used by all authApi methods except refreshToken.
jest.mock('@/lib/api/client', () => ({
  client: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock axios module-level create so the refreshClient receives a mock instance.
// The factory must only reference variables starting with 'mock' (Jest rule).
jest.mock('axios', () => {
  const mockRefreshPost = jest.fn();
  const mockInstance = { post: mockRefreshPost };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
    },
    create: jest.fn(() => mockInstance),
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks so they receive mocked modules
// ---------------------------------------------------------------------------
import axios from 'axios';
import { client } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

// Typed mock references
const mockClientPost = jest.mocked(client.post);
const mockClientGet = jest.mocked(client.get);
const mockAxiosCreate = jest.mocked(axios.create);
// The axios mock returns the same instance for every create() call, so this is
// the same refresh client instance auth.ts uses internally.
const mockRefreshClient = mockAxiosCreate() as { post: jest.Mock };
const mockRefreshPost = jest.mocked(mockRefreshClient.post);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const EMAIL = 'test@avyren.com';
const PASSWORD = 'S3cur3P@ss!';
const REFRESH_TOKEN_VALUE = 'refresh-abc-123';
const CURRENT_PASSWORD = 'OldP@ss1';
const NEW_PASSWORD = 'NewP@ss2';
const RESET_CODE = '839201';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  describe('login', () => {
    it('calls POST /auth/login with email and password', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true, data: {} });

      await authApi.login(EMAIL, PASSWORD);

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/login', {
        email: EMAIL,
        password: PASSWORD,
      });
    });

    it('returns the response from the client', async () => {
      const expectedResponse = {
        success: true,
        data: {
          user: { id: '1', email: EMAIL, firstName: 'A', lastName: 'B', role: 'SUPER_ADMIN' },
          tokens: { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 },
        },
      };
      mockClientPost.mockResolvedValueOnce(expectedResponse);

      const result = await authApi.login(EMAIL, PASSWORD);

      expect(result).toEqual(expectedResponse);
    });

    it('rejects when the client rejects', async () => {
      mockClientPost.mockRejectedValueOnce(new Error('Network Error'));

      await expect(authApi.login(EMAIL, PASSWORD)).rejects.toThrow('Network Error');
    });
  });

  // =========================================================================
  describe('refreshToken', () => {
    it('uses the separate refreshClient (not the intercepted client) to POST /auth/refresh-token', async () => {
      expect(mockRefreshPost).toBeDefined();

      mockRefreshPost.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            tokens: { accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 3600 },
          },
        },
      });

      await authApi.refreshToken(REFRESH_TOKEN_VALUE);

      // The intercepted client must NOT be used for token refresh.
      expect(mockClientPost).not.toHaveBeenCalled();

      expect(mockRefreshPost).toHaveBeenCalledTimes(1);
      expect(mockRefreshPost).toHaveBeenCalledWith('/auth/refresh-token', {
        refreshToken: REFRESH_TOKEN_VALUE,
      });
    });

    it('returns the raw axios response (not unwrapped by interceptor)', async () => {
      const rawResponse = {
        data: {
          success: true,
          data: {
            tokens: { accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 3600 },
          },
        },
      };
      mockRefreshPost.mockResolvedValueOnce(rawResponse);

      const result = await authApi.refreshToken(REFRESH_TOKEN_VALUE);

      // refreshClient has no response interceptor, so result is the full axios response.
      expect(result).toEqual(rawResponse);
    });
  });

  // =========================================================================
  describe('logout', () => {
    it('calls POST /auth/logout with no body', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true });

      await authApi.logout();

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/logout');
    });
  });

  // =========================================================================
  describe('forgotPassword', () => {
    it('calls POST /auth/forgot-password with email', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true });

      await authApi.forgotPassword(EMAIL);

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/forgot-password', { email: EMAIL });
    });
  });

  // =========================================================================
  describe('verifyResetCode', () => {
    it('calls POST /auth/verify-reset-code with email and code', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true });

      await authApi.verifyResetCode(EMAIL, RESET_CODE);

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/verify-reset-code', {
        email: EMAIL,
        code: RESET_CODE,
      });
    });
  });

  // =========================================================================
  describe('resetPassword', () => {
    it('calls POST /auth/reset-password with email, code, and newPassword', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true });

      await authApi.resetPassword(EMAIL, RESET_CODE, NEW_PASSWORD);

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/reset-password', {
        email: EMAIL,
        code: RESET_CODE,
        newPassword: NEW_PASSWORD,
      });
    });
  });

  // =========================================================================
  describe('getProfile', () => {
    it('calls GET /auth/profile', async () => {
      const profileResponse = {
        success: true,
        data: { id: '1', email: EMAIL, firstName: 'A', lastName: 'B', role: 'SUPER_ADMIN' },
      };
      mockClientGet.mockResolvedValueOnce(profileResponse);

      const result = await authApi.getProfile();

      expect(mockClientGet).toHaveBeenCalledTimes(1);
      expect(mockClientGet).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(profileResponse);
    });

    it('does not call POST for getProfile', async () => {
      mockClientGet.mockResolvedValueOnce({ success: true, data: null });

      await authApi.getProfile();

      expect(mockClientPost).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  describe('changePassword', () => {
    it('calls POST /auth/change-password with currentPassword and newPassword', async () => {
      mockClientPost.mockResolvedValueOnce({ success: true });

      await authApi.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);

      expect(mockClientPost).toHaveBeenCalledTimes(1);
      expect(mockClientPost).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });
    });
  });
});
