import { create } from 'zustand';

import type { AuthUser } from '@/lib/api/auth';
import { checkPermission } from '@/lib/api/auth';
import { createSelectors } from '@/lib/utils';
import { getToken, removeToken, setToken } from '@/lib/auth/utils';
import type { TokenType } from '@/lib/auth/utils';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { createLogger } from '@/lib/logger';
import { unregisterPushNotifications } from '@/lib/notifications';
import { queryClient } from '@/lib/api/provider';

const logger = createLogger('AuthStore');

type AuthStatus = 'idle' | 'signOut' | 'signIn';
export type UserRole = 'super-admin' | 'company-admin' | 'user';

const USER_DATA_KEY = 'user_data';

/**
 * Map backend role strings to app role types.
 */
export function mapBackendRole(backendRole: string): UserRole {
    switch (backendRole) {
        case 'SUPER_ADMIN':
            return 'super-admin';
        case 'COMPANY_ADMIN':
            return 'company-admin';
        default:
            return 'user';
    }
}

/** Human-readable label for a role. */
export function getRoleLabel(role: UserRole | null): string {
    switch (role) {
        case 'super-admin': return 'Super Admin';
        case 'company-admin': return 'Company Admin';
        default: return 'User';
    }
}

/**
 * Display label for sidebar / profile — matches web `TopBar` ProfileDropdown:
 * prefer tenant RBAC name, then formatted platform `role`, then coarse app role.
 */
export function getUserRoleDisplayLabel(user: AuthUser | null, userRole: UserRole | null): string {
    const tenantRoleName = typeof user?.roleName === 'string' ? user.roleName.trim() : '';
    const rawRole = user?.role ?? '';
    if (tenantRoleName) return tenantRoleName;
    if (rawRole) {
        return rawRole.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return getRoleLabel(userRole);
}

export function persistAuthUser(user: AuthUser): void {
    setItem(USER_DATA_KEY, user);
}

/** Get initials from first + last name. */
export function getUserInitials(user: AuthUser | null): string {
    if (!user) return '?';
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
}

/** Get full display name. */
export function getDisplayName(user: AuthUser | null): string {
    if (!user) return 'Unknown';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
}

interface AuthState {
    status: AuthStatus;
    token: TokenType | null;
    user: AuthUser | null;
    userRole: UserRole | null;
    permissions: string[];
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
    permissions: [],
    signIn: (token, user, role?) => {
        const resolvedRole = role ?? mapBackendRole(user.role);
        const permissions = user.permissions ?? [];
        setToken(token);
        persistAuthUser(user);
        logger.info('User signed in', { email: user.email, role: resolvedRole, permissionCount: permissions.length });
        set({ status: 'signIn', token, user, userRole: resolvedRole, permissions });
    },
    signOut: () => {
        // Unregister push token before clearing auth (fire-and-forget)
        unregisterPushNotifications().catch(() => {});
        removeToken();
        removeItem(USER_DATA_KEY);
        // Clear all React Query caches so new user doesn't see stale data
        queryClient.clear();
        logger.info('User signed out');
        set({ status: 'signOut', token: null, user: null, userRole: null, permissions: [] });
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
                const permissions = userData?.permissions ?? [];
                logger.info('Auth hydrated from storage', { email: userData?.email, role });
                set({ status: 'signIn', token: userToken, user: userData, userRole: role, permissions });
            } else {
                logger.info('No stored session — showing login');
                set({ status: 'signOut' });
            }
        } catch {
            logger.warn('Auth hydration failed — signing out');
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

/** Hook: returns true if the current user has the given permission. */
export function useHasPermission(permission: string): boolean {
    const permissions = useAuthStore.use.permissions();
    return checkPermission(permissions, permission);
}

