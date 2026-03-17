/**
 * Tests for: src/features/auth/use-auth-mutations.ts
 *
 * Strategy:
 * - Each hook is tested via `renderHook` wrapped in a fresh QueryClientProvider
 *   so tests are isolated and no shared state leaks between them.
 * - `authApi` is mocked at module level; individual tests configure per-call
 *   return values via mockResolvedValueOnce / mockRejectedValueOnce.
 * - `signIn` and `signOut` store actions are mocked to verify side-effects
 *   without touching real Zustand or MMKV state.
 * - Each mutation is exercised via `.mutateAsync()` because it returns a
 *   Promise that resolves/rejects synchronously within `act()`.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  },
}));

jest.mock('@/features/auth/use-auth-store', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { authApi } from '@/lib/api/auth';
import { signIn, signOut } from '@/features/auth/use-auth-store';
import {
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useVerifyResetCodeMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} from '@/features/auth/use-auth-mutations';

const mockLogin = jest.mocked(authApi.login);
const mockLogout = jest.mocked(authApi.logout);
const mockForgotPassword = jest.mocked(authApi.forgotPassword);
const mockVerifyResetCode = jest.mocked(authApi.verifyResetCode);
const mockResetPassword = jest.mocked(authApi.resetPassword);
const mockChangePassword = jest.mocked(authApi.changePassword);
const mockSignIn = jest.mocked(signIn);
const mockSignOut = jest.mocked(signOut);

beforeAll(() => {
  notifyManager.setNotifyFunction((callback) => {
    act(() => {
      callback();
    });
  });
});

afterAll(() => {
  notifyManager.setNotifyFunction((callback) => {
    callback();
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh QueryClient for each test with retries disabled so that
 * failed mutations reject immediately without waiting for retry backoff.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false, gcTime: Infinity },
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

/**
 * Returns a React wrapper that provides a fresh QueryClient.
 * Must be called once per test to avoid shared state.
 */
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const EMAIL = 'test@avyren.com';
const PASSWORD = 'S3cur3P@ss!';
const NEW_PASSWORD = 'NewP@ss2!';
const CURRENT_PASSWORD = 'OldP@ss1!';
const RESET_CODE = '912837';

const MOCK_USER = {
  id: 'u-1',
  email: EMAIL,
  firstName: 'Test',
  lastName: 'User',
  role: 'SUPER_ADMIN',
};

const MOCK_TOKENS = {
  accessToken: 'access-token-xyz',
  refreshToken: 'refresh-token-xyz',
  expiresIn: 3600,
};

const SUCCESS_LOGIN_RESPONSE = {
  success: true,
  data: { user: MOCK_USER, tokens: MOCK_TOKENS },
};

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('useLoginMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.login with email and password', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_LOGIN_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith(EMAIL, PASSWORD);
  });

  it('calls signIn with tokens and user on successful login', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_LOGIN_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(
      { access: MOCK_TOKENS.accessToken, refresh: MOCK_TOKENS.refreshToken },
      MOCK_USER,
    );
  });

  it('does NOT call signIn when response.success is false', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('does NOT call signIn when response.data is missing', async () => {
    mockLogin.mockResolvedValueOnce({ success: true, data: null });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('surfaces the error when authApi.login rejects', async () => {
    const networkError = new Error('Network Error');
    mockLogin.mockRejectedValueOnce(networkError);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(networkError);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('returns the full API response from mutateAsync', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_LOGIN_RESPONSE);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync({ email: EMAIL, password: PASSWORD });
    });

    expect(returnValue).toEqual(SUCCESS_LOGIN_RESPONSE);
  });
});

// =========================================================================
describe('useLogoutMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.logout', async () => {
    mockLogout.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLogoutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('calls signOut on successful logout', async () => {
    mockLogout.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLogoutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('calls signOut even when authApi.logout rejects (local sign-out on failure)', async () => {
    mockLogout.mockRejectedValueOnce(new Error('Server error'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useLogoutMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // mutation will error but onError should still fire signOut
      }
    });

    // Wait for the mutation error state to settle and onError to run
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
describe('useForgotPasswordMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.forgotPassword with the provided email', async () => {
    mockForgotPassword.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useForgotPasswordMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL });
    });

    expect(mockForgotPassword).toHaveBeenCalledTimes(1);
    expect(mockForgotPassword).toHaveBeenCalledWith(EMAIL);
  });

  it('returns the API response', async () => {
    const expected = { success: true, message: 'Reset email sent' };
    mockForgotPassword.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useForgotPasswordMutation(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync({ email: EMAIL });
    });

    expect(returnValue).toEqual(expected);
  });

  it('surfaces errors from authApi.forgotPassword', async () => {
    mockForgotPassword.mockRejectedValueOnce(new Error('Not found'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useForgotPasswordMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: EMAIL });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// =========================================================================
describe('useVerifyResetCodeMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.verifyResetCode with email and code', async () => {
    mockVerifyResetCode.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useVerifyResetCodeMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: EMAIL, code: RESET_CODE });
    });

    expect(mockVerifyResetCode).toHaveBeenCalledTimes(1);
    expect(mockVerifyResetCode).toHaveBeenCalledWith(EMAIL, RESET_CODE);
  });

  it('returns the API response', async () => {
    const expected = { success: true, message: 'Code verified' };
    mockVerifyResetCode.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useVerifyResetCodeMutation(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync({ email: EMAIL, code: RESET_CODE });
    });

    expect(returnValue).toEqual(expected);
  });

  it('surfaces errors from authApi.verifyResetCode', async () => {
    mockVerifyResetCode.mockRejectedValueOnce(new Error('Invalid code'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useVerifyResetCodeMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: EMAIL, code: RESET_CODE });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// =========================================================================
describe('useResetPasswordMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.resetPassword with email, code, and newPassword', async () => {
    mockResetPassword.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useResetPasswordMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: EMAIL,
        code: RESET_CODE,
        newPassword: NEW_PASSWORD,
      });
    });

    expect(mockResetPassword).toHaveBeenCalledTimes(1);
    expect(mockResetPassword).toHaveBeenCalledWith(EMAIL, RESET_CODE, NEW_PASSWORD);
  });

  it('returns the API response', async () => {
    const expected = { success: true, message: 'Password reset successfully' };
    mockResetPassword.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useResetPasswordMutation(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync({
        email: EMAIL,
        code: RESET_CODE,
        newPassword: NEW_PASSWORD,
      });
    });

    expect(returnValue).toEqual(expected);
  });

  it('surfaces errors from authApi.resetPassword', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('Code expired'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useResetPasswordMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: EMAIL,
          code: RESET_CODE,
          newPassword: NEW_PASSWORD,
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// =========================================================================
describe('useChangePasswordMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = makeQueryClient();
  });

  it('calls authApi.changePassword with currentPassword and newPassword', async () => {
    mockChangePassword.mockResolvedValueOnce({ success: true });
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });
    });

    expect(mockChangePassword).toHaveBeenCalledTimes(1);
    expect(mockChangePassword).toHaveBeenCalledWith(CURRENT_PASSWORD, NEW_PASSWORD);
  });

  it('returns the API response', async () => {
    const expected = { success: true, message: 'Password updated' };
    mockChangePassword.mockResolvedValueOnce(expected);
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.mutateAsync({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });
    });

    expect(returnValue).toEqual(expected);
  });

  it('surfaces errors from authApi.changePassword', async () => {
    mockChangePassword.mockRejectedValueOnce(new Error('Wrong current password'));
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          currentPassword: CURRENT_PASSWORD,
          newPassword: NEW_PASSWORD,
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
