import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipDailyReportScreen } from '@/features/production/pip/pip-daily-report-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipDailyReportRoute() {
    const canAccess = useCanPerform('production.pip:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipDailyReportScreen />;
}
