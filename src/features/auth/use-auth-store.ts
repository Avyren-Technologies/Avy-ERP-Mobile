import { create } from 'zustand';

import { createSelectors } from '@/lib/utils';
import { getToken, removeToken, setToken } from '@/lib/auth/utils';
import type { TokenType } from '@/lib/auth/utils';

type AuthStatus = 'idle' | 'signOut' | 'signIn';

interface AuthState {
    status: AuthStatus;
    token: TokenType | null;
    userRole: 'super-admin' | 'company-admin' | 'user' | null;
    signIn: (token: TokenType, role?: 'super-admin' | 'company-admin' | 'user') => void;
    signOut: () => void;
    hydrate: () => void;
}

const _useAuthStore = create<AuthState>((set) => ({
    status: 'idle',
    token: null,
    userRole: null,
    signIn: (token, role = 'super-admin') => {
        setToken(token);
        set({ status: 'signIn', token, userRole: role });
    },
    signOut: () => {
        removeToken();
        set({ status: 'signOut', token: null, userRole: null });
    },
    hydrate: () => {
        try {
            const userToken = getToken();
            if (userToken !== null) {
                set({ status: 'signIn', token: userToken });
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
export const signIn = (token: TokenType, role?: 'super-admin' | 'company-admin' | 'user') =>
    _useAuthStore.getState().signIn(token, role);
export const signOut = () => _useAuthStore.getState().signOut();
