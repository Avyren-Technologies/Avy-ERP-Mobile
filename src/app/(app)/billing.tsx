import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { BillingOverviewScreen } from '@/features/super-admin/billing-overview-screen';

export default function BillingRoute() {
    const userRole = useAuthStore.use.userRole();

    if (userRole !== 'super-admin') {
        return (
            <NoPermissionScreen
                title="Super Admin Only"
                description="Billing and subscription management is restricted to Super Administrators."
            />
        );
    }

    return <BillingOverviewScreen />;
}
