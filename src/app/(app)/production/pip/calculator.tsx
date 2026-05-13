import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipIncentiveCalculatorScreen } from '@/features/production/pip/pip-incentive-calculator-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipCalculatorRoute() {
    const canAccess = useCanPerform('production.pip:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipIncentiveCalculatorScreen />;
}
