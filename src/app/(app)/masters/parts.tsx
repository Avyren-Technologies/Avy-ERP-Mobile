import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PartMasterScreen } from '@/features/masters/part-master-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PartsRoute() {
    const canAccess = useCanPerform('masters.parts:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PartMasterScreen />;
}
