import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { client } from '@/lib/api/client';

/**
 * Auto-refreshes user permissions on mount by calling GET /auth/profile.
 * Ensures role/permission changes take effect without logout/login.
 */
export function usePermissionRefresh() {
    const status = useAuthStore.use.status();

    useEffect(() => {
        if (status !== 'signIn') return;

        let cancelled = false;

        async function refresh() {
            try {
                const res: any = await client.get('/auth/profile');
                if (cancelled) return;
                const data = res?.data ?? res;
                const freshPermissions: string[] = data?.user?.permissions ?? [];
                const currentPermissions = useAuthStore.getState().permissions;
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
