import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipDailyEntryScreen } from '@/features/production/pip/pip-daily-entry-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipDailyEntryRoute() {
    const canAccess = useCanPerform('production.pip:create');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipDailyEntryScreen />;
}
