import { create } from 'zustand';

import type { AuthUser } from '@/lib/api/auth';
import { createSelectors } from '@/lib/utils';
import { getToken, removeToken, setToken } from '@/lib/auth/utils';
import type { TokenType } from '@/lib/auth/utils';
import { getItem, removeItem, setItem } from '@/lib/storage';

type AuthStatus = 'idle' | 'signOut' | 'signIn';
type UserRole = 'super-admin' | 'company-admin' | 'user';

const USER_DATA_KEY = 'user_data';

/**
 * Map backend role strings to app role types.
 */
function mapBackendRole(backendRole: string): UserRole {
    switch (backendRole) {
        case 'SUPER_ADMIN':
            return 'super-admin';
        case 'COMPANY_ADMIN':
            return 'company-admin';
        default:
            return 'user';
    }
}

interface AuthState {
    status: AuthStatus;
    token: TokenType | null;
    user: AuthUser | null;
    userRole: UserRole | null;
    signIn: (token: TokenType, user: AuthUser, role?: UserRole) => void;
    signOut: () => void;
    updateTokens: (tokens: TokenType) => void;
    hydrate: () => void;
}

const _useAuthStore = create<AuthState>((set) => ({
    status: 'idle',
    token: null,
    user: null,
    userRole: null,
    signIn: (token, user, role?) => {
        const resolvedRole = role ?? mapBackendRole(user.role);
        setToken(token);
        setItem(USER_DATA_KEY, user);
        set({ status: 'signIn', token, user, userRole: resolvedRole });
    },
    signOut: () => {
        removeToken();
        removeItem(USER_DATA_KEY);
        set({ status: 'signOut', token: null, user: null, userRole: null });
    },
    updateTokens: (tokens) => {
        setToken(tokens);
        set({ token: tokens });
    },
    hydrate: () => {
        try {
            const userToken = getToken();
            const userData = getItem<AuthUser>(USER_DATA_KEY);
            if (userToken !== null) {
                const role = userData ? mapBackendRole(userData.role) : null;
                set({ status: 'signIn', token: userToken, user: userData, userRole: role });
            } else {
                set({ status: 'signOut' });
            }
        } catch {
            set({ status: 'signOut' });
        }
    },
}));

export const useAuthStore = createSelectors(_useAuthStore);

export const hydrateAuth = () => _useAuthStore.getState().hydrate();
export const signIn = (token: TokenType, user: AuthUser, role?: UserRole) =>
    _useAuthStore.getState().signIn(token, user, role);
export const signOut = () => _useAuthStore.getState().signOut();
export const updateTokens = (tokens: TokenType) =>
    _useAuthStore.getState().updateTokens(tokens);
