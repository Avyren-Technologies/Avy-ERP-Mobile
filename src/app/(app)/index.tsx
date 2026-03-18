import { useAuthStore } from '@/features/auth/use-auth-store';
import { CompanyAdminDashboard } from '@/features/company-admin/dashboard-screen';
import { SuperAdminDashboard } from '@/features/super-admin/dashboard-screen';

export default function DashboardRoute() {
    const userRole = useAuthStore((s) => s.userRole);

    if (userRole === 'company-admin') {
        return <CompanyAdminDashboard />;
    }

    return <SuperAdminDashboard />;
}
