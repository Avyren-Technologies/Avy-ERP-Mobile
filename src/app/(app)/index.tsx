import { useAuthStore } from '@/features/auth/use-auth-store';
import { EmployeeDashboard } from '@/features/employee/dashboard-screen';
import { SuperAdminDashboard } from '@/features/super-admin/dashboard-screen';

export default function DashboardRoute() {
    const userRole = useAuthStore((s) => s.userRole);

    // Super Admin gets their own platform dashboard
    if (userRole === 'super-admin') {
        return <SuperAdminDashboard />;
    }

    // All other roles (company-admin, employee, dynamic roles) use the
    // dynamic dashboard which adapts its widgets based on permissions
    // and the data the backend returns (e.g. team summary for managers)
    return <EmployeeDashboard />;
}
