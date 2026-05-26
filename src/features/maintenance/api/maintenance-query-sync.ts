import type { QueryClient } from '@tanstack/react-query';

import { maintenanceKeys } from '@/features/maintenance/api/use-maintenance-queries';

/** Overrides app-wide 5m staleTime so maintenance lists refresh when revisiting screens. */
export const maintenanceLiveQueryOptions = {
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
};

function isMaintenanceKey(key: readonly unknown[], segment: string): boolean {
    return key[0] === 'maintenance' && key[1] === segment;
}

export function invalidateMaintenanceWorkOrderQueries(queryClient: QueryClient): void {
    queryClient.invalidateQueries({
        predicate: (query) => {
            const key = query.queryKey;
            return (
                isMaintenanceKey(key, 'work-orders') ||
                isMaintenanceKey(key, 'wo-board') ||
                isMaintenanceKey(key, 'work-order')
            );
        },
    });
}

export function invalidateMaintenancePMScheduleQueries(
    queryClient: QueryClient,
    pmScheduleId?: string,
): void {
    if (pmScheduleId) {
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.pmSchedule(pmScheduleId) });
    }
    queryClient.invalidateQueries({
        predicate: (query) => {
            const key = query.queryKey;
            return isMaintenanceKey(key, 'pm-schedules') || isMaintenanceKey(key, 'pm-schedule');
        },
    });
    queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.all, 'pm-calendar'] });
}
