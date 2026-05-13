import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { PipSlabConfigScreen } from '@/features/production/pip/pip-slab-config-screen';
import { useCanPerform } from '@/hooks/use-can-perform';

export default function PipSlabConfigRoute() {
    const canAccess = useCanPerform('production.pip:read');

    if (!canAccess) {
        return <NoPermissionScreen />;
    }

    return <PipSlabConfigScreen />;
}
