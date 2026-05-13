import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipDashboardScreen } from '@/features/production/pip/pip-dashboard-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipDashboardRoute() {
    const canAccess = useCanPerform('production.pip:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipDashboardScreen />;
}
