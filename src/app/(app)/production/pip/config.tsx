import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipIncentiveConfigScreen } from '@/features/production/pip/pip-incentive-config-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipConfigRoute() {
    const canAccess = useCanPerform('production.pip:configure');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipIncentiveConfigScreen />;
}
