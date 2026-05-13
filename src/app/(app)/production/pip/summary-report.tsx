import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipIncentiveSummaryScreen } from '@/features/production/pip/pip-incentive-summary-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipSummaryReportRoute() {
    const canAccess = useCanPerform('production.pip:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipIncentiveSummaryScreen />;
}
