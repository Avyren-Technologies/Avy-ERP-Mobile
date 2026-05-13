import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { MachineMasterScreen } from '@/features/masters/machine-master-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function MachinesRoute() {
    const canAccess = useCanPerform('masters.machines:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <MachineMasterScreen />;
}
