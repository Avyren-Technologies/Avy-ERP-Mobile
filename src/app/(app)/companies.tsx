import { NoPermissionScreen } from '@/components/ui/no-permission-screen';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { CompanyListScreen } from '@/features/super-admin/company-list-screen';

export default function CompaniesRoute() {
    const userRole = useAuthStore.use.userRole();

    if (userRole !== 'super-admin') {
        return (
            <NoPermissionScreen
                title="Super Admin Only"
                description="Company management is restricted to Super Administrators. Please contact your platform administrator for access."
            />
        );
    }

    return <CompanyListScreen />;
}
