import type { AuthUser } from '@/lib/api/auth';

import { useEffect } from 'react';
import { persistAuthUser, useAuthStore } from '@/features/auth/use-auth-store';
import { client } from '@/lib/api/client';

/**
 * Auto-refreshes user permissions on mount by calling GET /auth/profile.
 * Merges profile fields (including `roleName`) into the auth user — matches web `usePermissionRefresh`.
 */
export function usePermissionRefresh() {
    const status = useAuthStore.use.status();

    useEffect(() => {
        if (status !== 'signIn') return;

        let cancelled = false;

        async function refresh() {
            try {
                const res = (await client.get('/auth/profile')) as {
                    data?: { user?: Partial<AuthUser> };
                    user?: Partial<AuthUser>;
                };
                if (cancelled) return;

                const freshUser = (res?.data?.user ?? res?.user ?? null) as Partial<AuthUser> | null;
                const freshPermissions: string[] =
                    res?.data?.user?.permissions ?? res?.user?.permissions ?? [];

                const currentUser = useAuthStore.getState().user;
                const currentPermissions = useAuthStore.getState().permissions;

                if (freshUser && typeof freshUser === 'object') {
                    const mergedPermissions =
                        freshPermissions.length > 0 ? freshPermissions : (currentPermissions ?? []);
                    const mergedUser = {
                        ...(currentUser ?? {}),
                        ...freshUser,
                        permissions: mergedPermissions,
                    } as AuthUser;
                    useAuthStore.setState({ user: mergedUser, permissions: mergedPermissions });
                    persistAuthUser(mergedUser);
                    return;
                }

                if (freshPermissions.length > 0 && JSON.stringify(freshPermissions) !== JSON.stringify(currentPermissions)) {
                    useAuthStore.setState({ permissions: freshPermissions });
                }
            } catch {
                // Silent fail
            }
        }

        refresh();
        return () => { cancelled = true; };
    }, [status]);
}
