/**
 * Tests for: src/features/auth/use-auth-store.ts
 *
 * Strategy:
 * - Mock MMKV-backed utilities at the module level. All jest.mock factories
 *   must be self-contained (no outer variable references) because Jest hoists
 *   them above variable declarations. We use jest.mocked() after import to
 *   get typed references to the mock functions.
 * - Reset the Zustand store to initial state between every test via
 *   useAuthStore.setState so tests are fully isolated.
 * - mapBackendRole is private; it is exercised indirectly through signIn and hydrate.
 */

// ---------------------------------------------------------------------------
// Mock @/lib/auth/utils — must be self-contained (no outer variable refs).
// Variable names start with 'mock' so Jest allows them in hoisted factories.
// ---------------------------------------------------------------------------
jest.mock('@/lib/auth/utils', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  removeToken: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock @/lib/storage
// ---------------------------------------------------------------------------
jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports — must come AFTER jest.mock declarations
// ---------------------------------------------------------------------------
import { act } from '@testing-library/react-native';

import {
  useAuthStore,
  hydrateAuth,
  signIn,
  signOut,
  updateTokens,
} from '@/features/auth/use-auth-store';
import type { AuthUser } from '@/lib/api/auth';
import type { TokenType } from '@/lib/auth/utils';

// Obtain typed mock references after the module has been imported.
import * as authUtils from '@/lib/auth/utils';
import * as storage from '@/lib/storage';

const mockGetToken = jest.mocked(authUtils.getToken);
const mockSetToken = jest.mocked(authUtils.setToken);
const mockRemoveToken = jest.mocked(authUtils.removeToken);
const mockGetItem = jest.mocked(storage.getItem);
const mockSetItem = jest.mocked(storage.setItem);
const mockRemoveItem = jest.mocked(storage.removeItem);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const TOKEN: TokenType = { access: 'access-token-abc', refresh: 'refresh-token-xyz' };

function makeSuperAdminUser(): AuthUser {
  return {
    id: 'user-1',
    email: 'admin@avyren.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
  };
}

function makeCompanyAdminUser(): AuthUser {
  return {
    id: 'user-2',
    email: 'ca@company.com',
    firstName: 'Company',
    lastName: 'Admin',
    role: 'COMPANY_ADMIN',
  };
}

function makeRegularUser(): AuthUser {
  return {
    id: 'user-3',
    email: 'user@company.com',
    firstName: 'Regular',
    lastName: 'User',
    role: 'EMPLOYEE',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resetStore() {
  useAuthStore.setState({
    status: 'idle',
    token: null,
    user: null,
    userRole: null,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // =========================================================================
  describe('initial state', () => {
    it('starts with idle status and no user or token', () => {
      const state = useAuthStore.getState();
      expect(state.status).toBe('idle');
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.userRole).toBeNull();
    });
  });

  // =========================================================================
  describe('signIn', () => {
    it('sets status to signIn, stores token and user, resolves SUPER_ADMIN role', () => {
      const user = makeSuperAdminUser();

      act(() => {
        signIn(TOKEN, user);
      });

      const state = useAuthStore.getState();
      expect(state.status).toBe('signIn');
      expect(state.token).toEqual(TOKEN);
      expect(state.user).toEqual(user);
      expect(state.userRole).toBe('super-admin');
    });

    it('persists token to MMKV via setToken', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });

      expect(mockSetToken).toHaveBeenCalledTimes(1);
      expect(mockSetToken).toHaveBeenCalledWith(TOKEN);
    });

    it('persists user object to MMKV via setItem with key user_data', () => {
      const user = makeSuperAdminUser();

      act(() => {
        signIn(TOKEN, user);
      });

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      expect(mockSetItem).toHaveBeenCalledWith('user_data', user);
    });

    it('resolves COMPANY_ADMIN role from user.role', () => {
      act(() => {
        signIn(TOKEN, makeCompanyAdminUser());
      });

      expect(useAuthStore.getState().userRole).toBe('company-admin');
    });

    it('resolves unknown backend role to user', () => {
      act(() => {
        signIn(TOKEN, makeRegularUser());
      });

      expect(useAuthStore.getState().userRole).toBe('user');
    });

    it('uses the explicitly provided role override and ignores user.role', () => {
      // Even though the user object carries SUPER_ADMIN, passing 'user' explicitly wins.
      act(() => {
        signIn(TOKEN, makeSuperAdminUser(), 'user');
      });

      expect(useAuthStore.getState().userRole).toBe('user');
    });
  });

  // =========================================================================
  describe('signOut', () => {
    it('sets status to signOut and clears token, user, and userRole', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });

      act(() => {
        signOut();
      });

      const state = useAuthStore.getState();
      expect(state.status).toBe('signOut');
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.userRole).toBeNull();
    });

    it('removes token from MMKV via removeToken', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });
      jest.clearAllMocks();

      act(() => {
        signOut();
      });

      expect(mockRemoveToken).toHaveBeenCalledTimes(1);
    });

    it('removes user data from MMKV via removeItem with key user_data', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });
      jest.clearAllMocks();

      act(() => {
        signOut();
      });

      expect(mockRemoveItem).toHaveBeenCalledWith('user_data');
    });
  });

  // =========================================================================
  describe('updateTokens', () => {
    it('updates the token in the store without changing user or role', () => {
      const user = makeSuperAdminUser();

      act(() => {
        signIn(TOKEN, user);
      });

      const NEW_TOKEN: TokenType = { access: 'new-access', refresh: 'new-refresh' };

      act(() => {
        updateTokens(NEW_TOKEN);
      });

      const state = useAuthStore.getState();
      expect(state.token).toEqual(NEW_TOKEN);
      expect(state.user).toEqual(user);
      expect(state.userRole).toBe('super-admin');
      expect(state.status).toBe('signIn');
    });

    it('persists the new token to MMKV via setToken', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });
      jest.clearAllMocks();

      const NEW_TOKEN: TokenType = { access: 'new-access', refresh: 'new-refresh' };

      act(() => {
        updateTokens(NEW_TOKEN);
      });

      expect(mockSetToken).toHaveBeenCalledTimes(1);
      expect(mockSetToken).toHaveBeenCalledWith(NEW_TOKEN);
    });

    it('does NOT call removeToken or removeItem during token update', () => {
      act(() => {
        signIn(TOKEN, makeSuperAdminUser());
      });
      jest.clearAllMocks();

      act(() => {
        updateTokens({ access: 'a', refresh: 'r' });
      });

      expect(mockRemoveToken).not.toHaveBeenCalled();
      expect(mockRemoveItem).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  describe('hydrate', () => {
    it('sets status to signIn when a stored token exists', () => {
      const user = makeSuperAdminUser();
      mockGetToken.mockReturnValue(TOKEN);
      // getItem is called for USER_DATA_KEY; use mockReturnValue
      (mockGetItem as jest.Mock).mockReturnValue(user);

      act(() => {
        hydrateAuth();
      });

      const state = useAuthStore.getState();
      expect(state.status).toBe('signIn');
      expect(state.token).toEqual(TOKEN);
      expect(state.user).toEqual(user);
      expect(state.userRole).toBe('super-admin');
    });

    it('sets status to signOut when no stored token exists', () => {
      mockGetToken.mockReturnValue(null);

      act(() => {
        hydrateAuth();
      });

      const state = useAuthStore.getState();
      expect(state.status).toBe('signOut');
      expect(state.token).toBeNull();
    });

    it('sets status to signOut when getToken throws', () => {
      mockGetToken.mockImplementation(() => {
        throw new Error('MMKV read error');
      });

      act(() => {
        hydrateAuth();
      });

      expect(useAuthStore.getState().status).toBe('signOut');
    });

    it('resolves null userRole when token exists but no user data in storage', () => {
      mockGetToken.mockReturnValue(TOKEN);
      (mockGetItem as jest.Mock).mockReturnValue(null);

      act(() => {
        hydrateAuth();
      });

      const state = useAuthStore.getState();
      expect(state.status).toBe('signIn');
      expect(state.user).toBeNull();
      expect(state.userRole).toBeNull();
    });

    it('correctly maps COMPANY_ADMIN role during hydration', () => {
      const user = makeCompanyAdminUser();
      mockGetToken.mockReturnValue(TOKEN);
      (mockGetItem as jest.Mock).mockReturnValue(user);

      act(() => {
        hydrateAuth();
      });

      expect(useAuthStore.getState().userRole).toBe('company-admin');
    });

    it('maps unknown backend role to user during hydration', () => {
      const user = makeRegularUser();
      mockGetToken.mockReturnValue(TOKEN);
      (mockGetItem as jest.Mock).mockReturnValue(user);

      act(() => {
        hydrateAuth();
      });

      expect(useAuthStore.getState().userRole).toBe('user');
    });
  });

  // =========================================================================
  describe('mapBackendRole (via signIn)', () => {
    const roleCases: Array<[string, string]> = [
      ['SUPER_ADMIN', 'super-admin'],
      ['COMPANY_ADMIN', 'company-admin'],
      ['EMPLOYEE', 'user'],
      ['MANAGER', 'user'],
      ['', 'user'],
      // lowercase variants are not recognized by the switch
      ['super-admin', 'user'],
    ];

    it.each(roleCases)(
      'maps backend role "%s" to app role "%s"',
      (backendRole, expectedAppRole) => {
        const user: AuthUser = { ...makeSuperAdminUser(), role: backendRole };

        act(() => {
          signIn(TOKEN, user);
        });

        expect(useAuthStore.getState().userRole).toBe(expectedAppRole);
      },
    );
  });

  // =========================================================================
  describe('selector interface (createSelectors)', () => {
    it('exposes useAuthStore.use.status as a selector function', () => {
      expect(typeof useAuthStore.use.status).toBe('function');
    });

    it('exposes useAuthStore.use.token as a selector function', () => {
      expect(typeof useAuthStore.use.token).toBe('function');
    });

    it('exposes useAuthStore.use.user as a selector function', () => {
      expect(typeof useAuthStore.use.user).toBe('function');
    });

    it('exposes useAuthStore.use.userRole as a selector function', () => {
      expect(typeof useAuthStore.use.userRole).toBe('function');
    });
  });
});
