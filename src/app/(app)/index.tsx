import { useAuthStore } from '@/features/auth/use-auth-store';
import { CompanyAdminDashboard } from '@/features/company-admin/dashboard-screen';
import { EmployeeDashboard } from '@/features/employee/dashboard-screen';
import { SuperAdminDashboard } from '@/features/super-admin/dashboard-screen';

export default function DashboardRoute() {
    const userRole = useAuthStore((s) => s.userRole);
    const permissions = useAuthStore((s) => s.permissions);

    // Employee: has ESS permissions but not company:read
    const isEmployee =
        userRole !== 'super-admin' &&
        userRole !== 'company-admin' &&
        permissions.some((p: string) => p.startsWith('ess:')) &&
        !permissions.some(
            (p: string) => p === 'company:read' || p === 'company:*'
        );

    if (isEmployee) {
        return <EmployeeDashboard />;
    }

    if (userRole === 'company-admin') {
        return <CompanyAdminDashboard />;
    }

    return <SuperAdminDashboard />;
}
