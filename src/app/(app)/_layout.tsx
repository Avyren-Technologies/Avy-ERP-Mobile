/* eslint-disable better-tailwindcss/no-unknown-classes */
import { Redirect, SplashScreen, Tabs, usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import colors from '@/components/ui/colors';
import {
    Sidebar,
    SidebarProvider,
    useSidebar,
} from '@/components/ui/sidebar';
import type { SidebarSection } from '@/components/ui/sidebar';
import {
    useAuthStore as useAuth,
    getDisplayName,
    getUserInitials,
    getRoleLabel,
} from '@/features/auth/use-auth-store';
import { checkPermission } from '@/lib/api/auth';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

// ============ TAB ICON COMPONENTS ============

function DashboardIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Rect x="3" y="3" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" />
                <Rect x="14" y="3" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.7 : 1} />
                <Rect x="3" y="14" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.7 : 1} />
                <Rect x="14" y="14" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.5 : 1} />
            </Svg>
        </View>
    );
}

function CompaniesIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2"
                    stroke={color}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

function BillingIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth="1.8" fill={focused ? colors.primary[500] : 'none'} />
                <Path d="M1 10h22" stroke={focused ? 'rgba(255,255,255,0.5)' : color} strokeWidth="1.8" />
            </Svg>
        </View>
    );
}

function MoreIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx="12" cy="5" r="2" fill={color} />
                <Circle cx="12" cy="12" r="2" fill={color} />
                <Circle cx="12" cy="19" r="2" fill={color} />
            </Svg>
        </View>
    );
}

// ============ SIDEBAR ROOT (inside SidebarProvider) ============

function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const signOut = useAuth.use.signOut();
    const user = useAuth.use.user();
    const userRole = useAuth.use.userRole();
    const permissions = useAuth.use.permissions();

    const isSuperAdmin = userRole === 'super-admin';

    const hasPerm = React.useCallback(
        (perm: string) => checkPermission(permissions, perm),
        [permissions]
    );

    /**
     * Build sidebar sections dynamically based on user permissions.
     * Super admins (with '*' permission) see everything via wildcard matching.
     * Each section is included only if the user has the required permission.
     * Sections with no visible items are filtered out.
     */
    const sections: SidebarSection[] = React.useMemo(() => {
        if (isSuperAdmin) {
            // Super admin gets a dedicated layout
            return [
                {
                    items: [
                        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const, isActive: pathname === '/', onPress: () => router.push('/') },
                    ],
                },
                {
                    moduleSeparator: 'Platform Management',
                    title: 'Management',
                    items: [
                        { id: 'companies', label: 'Companies', icon: 'companies' as const, isActive: pathname === '/companies', onPress: () => router.push('/companies') },
                    ],
                },
                {
                    title: 'Billing',
                    items: [
                        { id: 'billing-overview', label: 'Overview', icon: 'billing' as const, isActive: pathname === '/billing', onPress: () => router.push('/billing') },
                        { id: 'billing-invoices', label: 'Invoices', icon: 'billing' as const, isActive: pathname.startsWith('/billing/invoices'), onPress: () => router.push('/(app)/billing/invoices' as any) },
                        { id: 'billing-payments', label: 'Payments', icon: 'billing' as const, isActive: pathname.startsWith('/billing/payments'), onPress: () => router.push('/(app)/billing/payments' as any) },
                    ],
                },
                {
                    title: 'Administration',
                    items: [
                        { id: 'audit', label: 'Audit Logs', icon: 'audit' as const, isActive: pathname === '/reports/audit', onPress: () => router.push('/(app)/reports/audit' as any) },
                    ],
                },
                {
                    moduleSeparator: 'System',
                    title: 'System',
                    items: [
                        { id: 'module-catalogue', label: 'Module Catalogue', icon: 'settings' as const, isActive: false, onPress: () => {} },
                        { id: 'platform-monitor', label: 'Platform Monitor', icon: 'dashboard' as const, isActive: false, onPress: () => {} },
                        { id: 'users', label: 'User Management', icon: 'users' as const, isActive: false, onPress: () => {} },
                        { id: 'settings', label: 'Settings', icon: 'settings' as const, isActive: pathname === '/settings', onPress: () => router.push('/settings') },
                        { id: 'support', label: 'Support', icon: 'support' as const, isActive: pathname === '/admin-support', onPress: () => router.push('/admin-support' as any) },
                    ],
                },
            ];
        }

        // Build permission-filtered sections for non-super-admin users
        const allSections: Array<{ section: SidebarSection; requiredPerm?: string }> = [
            // ── Overview ──
            {
                section: {
                    items: [
                        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const, onPress: () => router.push('/'), isActive: pathname === '/' },
                    ],
                },
            },

            // ══════════ COMPANY ADMIN ══════════
            {
                requiredPerm: 'company:read',
                section: {
                    moduleSeparator: 'Company Admin',
                    title: 'Company',
                    items: [
                        { id: 'profile', label: 'Company Profile', icon: 'companies' as const, onPress: () => router.push('/company/profile' as any), isActive: pathname.startsWith('/company/profile') },
                        { id: 'locations', label: 'Locations', icon: 'companies' as const, onPress: () => router.push('/company/locations' as any), isActive: pathname.startsWith('/company/locations') },
                        { id: 'shifts', label: 'Shifts & Time', icon: 'settings' as const, onPress: () => router.push('/company/shifts' as any), isActive: pathname.startsWith('/company/shifts') },
                        { id: 'contacts', label: 'Key Contacts', icon: 'users' as const, onPress: () => router.push('/company/contacts' as any), isActive: pathname.startsWith('/company/contacts') },
                    ],
                },
            },
            {
                section: {
                    title: 'People & Access',
                    items: [
                        ...(hasPerm('user:read') ? [{ id: 'users', label: 'User Management', icon: 'users' as const, onPress: () => router.push('/company/users' as any), isActive: pathname.startsWith('/company/users') }] : []),
                        ...(hasPerm('role:read') ? [{ id: 'roles', label: 'Roles & Permissions', icon: 'users' as const, onPress: () => router.push('/company/roles' as any), isActive: pathname.startsWith('/company/roles') }] : []),
                        ...(hasPerm('role:read') ? [{ id: 'feature-toggles', label: 'Feature Toggles', icon: 'settings' as const, onPress: () => router.push('/company/feature-toggles' as any), isActive: pathname.startsWith('/company/feature-toggles') }] : []),
                    ],
                },
            },
            {
                requiredPerm: 'company:read',
                section: {
                    title: 'Configuration',
                    items: [
                        { id: 'module-catalogue', label: 'Module Catalogue', icon: 'settings' as const, onPress: () => router.push('/company/module-catalogue' as any), isActive: pathname.startsWith('/company/module-catalogue') },
                        { id: 'no-series', label: 'Number Series', icon: 'settings' as const, onPress: () => router.push('/company/no-series' as any), isActive: pathname.startsWith('/company/no-series') },
                        { id: 'iot-reasons', label: 'IOT Reasons', icon: 'settings' as const, onPress: () => router.push('/company/iot-reasons' as any), isActive: pathname.startsWith('/company/iot-reasons') },
                        ...(hasPerm('company:configure') ? [{ id: 'controls', label: 'System Controls', icon: 'settings' as const, onPress: () => router.push('/company/controls' as any), isActive: pathname.startsWith('/company/controls') }] : []),
                        { id: 'settings', label: 'Settings', icon: 'settings' as const, onPress: () => router.push('/company/settings' as any), isActive: pathname.startsWith('/company/settings') },
                    ],
                },
            },
            {
                requiredPerm: 'company:read',
                section: {
                    title: 'Billing',
                    items: [
                        { id: 'billing-overview', label: 'Billing Overview', icon: 'billing' as const, onPress: () => router.push('/company/billing' as any), isActive: pathname === '/company/billing' },
                        { id: 'billing-invoices', label: 'Invoices', icon: 'billing' as const, onPress: () => router.push('/company/billing-invoices' as any), isActive: pathname.startsWith('/company/billing-invoices') },
                        { id: 'billing-payments', label: 'Payments', icon: 'billing' as const, onPress: () => router.push('/company/billing-payments' as any), isActive: pathname.startsWith('/company/billing-payments') },
                    ],
                },
            },

            // ══════════ HRMS ══════════
            {
                requiredPerm: 'hr:read',
                section: {
                    moduleSeparator: 'HRMS',
                    title: 'Org Structure',
                    items: [
                        { id: 'departments', label: 'Departments', icon: 'companies' as const, onPress: () => router.push('/company/hr/departments' as any), isActive: pathname.startsWith('/company/hr/departments') },
                        { id: 'designations', label: 'Designations', icon: 'users' as const, onPress: () => router.push('/company/hr/designations' as any), isActive: pathname.startsWith('/company/hr/designations') },
                        { id: 'grades', label: 'Grades & Bands', icon: 'settings' as const, onPress: () => router.push('/company/hr/grades' as any), isActive: pathname.startsWith('/company/hr/grades') },
                        { id: 'emp-types', label: 'Employee Types', icon: 'users' as const, onPress: () => router.push('/company/hr/employee-types' as any), isActive: pathname.startsWith('/company/hr/employee-types') },
                        { id: 'cost-centres', label: 'Cost Centres', icon: 'billing' as const, onPress: () => router.push('/company/hr/cost-centres' as any), isActive: pathname.startsWith('/company/hr/cost-centres') },
                        { id: 'employees', label: 'Employee Directory', icon: 'users' as const, onPress: () => router.push('/company/hr/employees' as any), isActive: pathname.startsWith('/company/hr/employees') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Attendance',
                    items: [
                        { id: 'attendance', label: 'Attendance Dashboard', icon: 'settings' as const, onPress: () => router.push('/company/hr/attendance' as any), isActive: pathname === '/company/hr/attendance' },
                        { id: 'holidays', label: 'Holiday Calendar', icon: 'settings' as const, onPress: () => router.push('/company/hr/holidays' as any), isActive: pathname.startsWith('/company/hr/holidays') },
                        { id: 'rosters', label: 'Rosters', icon: 'settings' as const, onPress: () => router.push('/company/hr/rosters' as any), isActive: pathname.startsWith('/company/hr/rosters') },
                        { id: 'attendance-rules', label: 'Attendance Rules', icon: 'settings' as const, onPress: () => router.push('/company/hr/attendance-rules' as any), isActive: pathname.startsWith('/company/hr/attendance-rules') },
                        { id: 'overtime-rules', label: 'Overtime Rules', icon: 'settings' as const, onPress: () => router.push('/company/hr/overtime-rules' as any), isActive: pathname.startsWith('/company/hr/overtime-rules') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Leave Management',
                    items: [
                        { id: 'leave-types', label: 'Leave Types', icon: 'settings' as const, onPress: () => router.push('/company/hr/leave-types' as any), isActive: pathname.startsWith('/company/hr/leave-types') },
                        { id: 'leave-policies', label: 'Leave Policies', icon: 'settings' as const, onPress: () => router.push('/company/hr/leave-policies' as any), isActive: pathname.startsWith('/company/hr/leave-policies') },
                        { id: 'leave-requests', label: 'Leave Requests', icon: 'users' as const, onPress: () => router.push('/company/hr/leave-requests' as any), isActive: pathname.startsWith('/company/hr/leave-requests') },
                        { id: 'leave-balances', label: 'Leave Balances', icon: 'billing' as const, onPress: () => router.push('/company/hr/leave-balances' as any), isActive: pathname.startsWith('/company/hr/leave-balances') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Payroll & Compliance',
                    items: [
                        { id: 'salary-components', label: 'Salary Components', icon: 'billing' as const, onPress: () => router.push('/company/hr/salary-components' as any), isActive: pathname.startsWith('/company/hr/salary-components') },
                        { id: 'salary-structures', label: 'Salary Structures', icon: 'settings' as const, onPress: () => router.push('/company/hr/salary-structures' as any), isActive: pathname.startsWith('/company/hr/salary-structures') },
                        { id: 'employee-salary', label: 'Employee Salary', icon: 'billing' as const, onPress: () => router.push('/company/hr/employee-salary' as any), isActive: pathname.startsWith('/company/hr/employee-salary') },
                        ...(hasPerm('hr:configure') ? [{ id: 'statutory-config', label: 'Statutory Config', icon: 'settings' as const, onPress: () => router.push('/company/hr/statutory-config' as any), isActive: pathname.startsWith('/company/hr/statutory-config') }] : []),
                        ...(hasPerm('hr:configure') ? [{ id: 'tax-config', label: 'Tax & TDS', icon: 'settings' as const, onPress: () => router.push('/company/hr/tax-config' as any), isActive: pathname.startsWith('/company/hr/tax-config') }] : []),
                        ...(hasPerm('hr:configure') ? [{ id: 'bank-config', label: 'Bank Config', icon: 'billing' as const, onPress: () => router.push('/company/hr/bank-config' as any), isActive: pathname.startsWith('/company/hr/bank-config') }] : []),
                        { id: 'loan-policies', label: 'Loan Policies', icon: 'settings' as const, onPress: () => router.push('/company/hr/loan-policies' as any), isActive: pathname.startsWith('/company/hr/loan-policies') },
                        { id: 'loans', label: 'Loans', icon: 'billing' as const, onPress: () => router.push('/company/hr/loans' as any), isActive: pathname.startsWith('/company/hr/loans') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Payroll Operations',
                    items: [
                        { id: 'payroll-runs', label: 'Payroll Runs', icon: 'settings' as const, onPress: () => router.push('/company/hr/payroll-runs' as any), isActive: pathname.startsWith('/company/hr/payroll-runs') },
                        { id: 'payslips', label: 'Payslips', icon: 'billing' as const, onPress: () => router.push('/company/hr/payslips' as any), isActive: pathname.startsWith('/company/hr/payslips') },
                        { id: 'salary-holds', label: 'Salary Holds', icon: 'settings' as const, onPress: () => router.push('/company/hr/salary-holds' as any), isActive: pathname.startsWith('/company/hr/salary-holds') },
                        { id: 'salary-revisions', label: 'Salary Revisions', icon: 'billing' as const, onPress: () => router.push('/company/hr/salary-revisions' as any), isActive: pathname.startsWith('/company/hr/salary-revisions') },
                        { id: 'statutory-filings', label: 'Statutory Filings', icon: 'settings' as const, onPress: () => router.push('/company/hr/statutory-filings' as any), isActive: pathname.startsWith('/company/hr/statutory-filings') },
                        { id: 'payroll-reports', label: 'Payroll Reports', icon: 'billing' as const, onPress: () => router.push('/company/hr/payroll-reports' as any), isActive: pathname.startsWith('/company/hr/payroll-reports') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Self-Service',
                    items: [
                        { id: 'my-profile', label: 'My Profile', icon: 'users' as const, onPress: () => router.push('/company/hr/my-profile' as any), isActive: pathname.startsWith('/company/hr/my-profile') },
                        { id: 'my-payslips', label: 'My Payslips', icon: 'billing' as const, onPress: () => router.push('/company/hr/my-payslips' as any), isActive: pathname.startsWith('/company/hr/my-payslips') },
                        { id: 'my-leave', label: 'My Leave', icon: 'settings' as const, onPress: () => router.push('/company/hr/my-leave' as any), isActive: pathname.startsWith('/company/hr/my-leave') },
                        { id: 'my-attendance', label: 'My Attendance', icon: 'settings' as const, onPress: () => router.push('/company/hr/my-attendance' as any), isActive: pathname.startsWith('/company/hr/my-attendance') },
                        { id: 'shift-check-in', label: 'Shift Check-In', icon: 'settings' as const, onPress: () => router.push('/company/hr/shift-check-in' as any), isActive: pathname.startsWith('/company/hr/shift-check-in') },
                        { id: 'team-view', label: 'Team View (MSS)', icon: 'users' as const, onPress: () => router.push('/company/hr/team-view' as any), isActive: pathname.startsWith('/company/hr/team-view') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'ESS & Workflows',
                    items: [
                        ...(hasPerm('hr:configure') ? [{ id: 'ess-config', label: 'ESS Config', icon: 'settings' as const, onPress: () => router.push('/company/hr/ess-config' as any), isActive: pathname.startsWith('/company/hr/ess-config') }] : []),
                        ...(hasPerm('hr:configure') ? [{ id: 'approval-workflows', label: 'Approval Workflows', icon: 'settings' as const, onPress: () => router.push('/company/hr/approval-workflows' as any), isActive: pathname.startsWith('/company/hr/approval-workflows') }] : []),
                        { id: 'approval-requests', label: 'Approval Requests', icon: 'users' as const, onPress: () => router.push('/company/hr/approval-requests' as any), isActive: pathname.startsWith('/company/hr/approval-requests') },
                        ...(hasPerm('hr:configure') ? [{ id: 'notification-templates', label: 'Notification Templates', icon: 'settings' as const, onPress: () => router.push('/company/hr/notification-templates' as any), isActive: pathname.startsWith('/company/hr/notification-templates') }] : []),
                        ...(hasPerm('hr:configure') ? [{ id: 'notification-rules', label: 'Notification Rules', icon: 'settings' as const, onPress: () => router.push('/company/hr/notification-rules' as any), isActive: pathname.startsWith('/company/hr/notification-rules') }] : []),
                        { id: 'it-declarations', label: 'IT Declarations', icon: 'billing' as const, onPress: () => router.push('/company/hr/it-declarations' as any), isActive: pathname.startsWith('/company/hr/it-declarations') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Transfers & Promotions',
                    items: [
                        { id: 'transfers', label: 'Employee Transfers', icon: 'settings' as const, onPress: () => router.push('/company/hr/transfers' as any), isActive: pathname.startsWith('/company/hr/transfers') },
                        { id: 'promotions', label: 'Employee Promotions', icon: 'settings' as const, onPress: () => router.push('/company/hr/promotions' as any), isActive: pathname.startsWith('/company/hr/promotions') },
                        { id: 'delegates', label: 'Manager Delegation', icon: 'users' as const, onPress: () => router.push('/company/hr/delegates' as any), isActive: pathname.startsWith('/company/hr/delegates') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Performance',
                    items: [
                        { id: 'appraisal-cycles', label: 'Appraisal Cycles', icon: 'settings' as const, onPress: () => router.push('/company/hr/appraisal-cycles' as any), isActive: pathname.startsWith('/company/hr/appraisal-cycles') },
                        { id: 'goals', label: 'Goals & OKRs', icon: 'settings' as const, onPress: () => router.push('/company/hr/goals' as any), isActive: pathname.startsWith('/company/hr/goals') },
                        { id: 'feedback-360', label: '360 Feedback', icon: 'users' as const, onPress: () => router.push('/company/hr/feedback-360' as any), isActive: pathname.startsWith('/company/hr/feedback-360') },
                        { id: 'ratings', label: 'Ratings & Calibration', icon: 'settings' as const, onPress: () => router.push('/company/hr/ratings' as any), isActive: pathname.startsWith('/company/hr/ratings') },
                        { id: 'skills', label: 'Skills & Mapping', icon: 'settings' as const, onPress: () => router.push('/company/hr/skills' as any), isActive: pathname.startsWith('/company/hr/skills') },
                        { id: 'succession', label: 'Succession Planning', icon: 'users' as const, onPress: () => router.push('/company/hr/succession' as any), isActive: pathname.startsWith('/company/hr/succession') },
                        { id: 'performance-dashboard', label: 'Performance Dashboard', icon: 'dashboard' as const, onPress: () => router.push('/company/hr/performance-dashboard' as any), isActive: pathname.startsWith('/company/hr/performance-dashboard') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Recruitment & Training',
                    items: [
                        { id: 'requisitions', label: 'Job Requisitions', icon: 'settings' as const, onPress: () => router.push('/company/hr/requisitions' as any), isActive: pathname.startsWith('/company/hr/requisitions') },
                        { id: 'candidates', label: 'Candidates', icon: 'users' as const, onPress: () => router.push('/company/hr/candidates' as any), isActive: pathname.startsWith('/company/hr/candidates') },
                        { id: 'training', label: 'Training Catalogue', icon: 'settings' as const, onPress: () => router.push('/company/hr/training' as any), isActive: pathname.startsWith('/company/hr/training') },
                        { id: 'training-nominations', label: 'Training Nominations', icon: 'users' as const, onPress: () => router.push('/company/hr/training-nominations' as any), isActive: pathname.startsWith('/company/hr/training-nominations') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Exit & Separation',
                    items: [
                        { id: 'exit-requests', label: 'Exit Requests', icon: 'users' as const, onPress: () => router.push('/company/hr/exit-requests' as any), isActive: pathname.startsWith('/company/hr/exit-requests') },
                        { id: 'clearance-dashboard', label: 'Clearance Dashboard', icon: 'settings' as const, onPress: () => router.push('/company/hr/clearance-dashboard' as any), isActive: pathname.startsWith('/company/hr/clearance-dashboard') },
                        { id: 'fnf-settlement', label: 'F&F Settlement', icon: 'billing' as const, onPress: () => router.push('/company/hr/fnf-settlement' as any), isActive: pathname.startsWith('/company/hr/fnf-settlement') },
                    ],
                },
            },
            {
                requiredPerm: 'hr:read',
                section: {
                    title: 'Advanced HR',
                    items: [
                        { id: 'assets', label: 'Asset Management', icon: 'settings' as const, onPress: () => router.push('/company/hr/assets' as any), isActive: pathname.startsWith('/company/hr/assets') },
                        { id: 'expenses', label: 'Expense Claims', icon: 'billing' as const, onPress: () => router.push('/company/hr/expenses' as any), isActive: pathname.startsWith('/company/hr/expenses') },
                        { id: 'hr-letters', label: 'HR Letters', icon: 'settings' as const, onPress: () => router.push('/company/hr/hr-letters' as any), isActive: pathname.startsWith('/company/hr/hr-letters') },
                        { id: 'grievances', label: 'Grievances', icon: 'users' as const, onPress: () => router.push('/company/hr/grievances' as any), isActive: pathname.startsWith('/company/hr/grievances') },
                        { id: 'disciplinary', label: 'Disciplinary Actions', icon: 'settings' as const, onPress: () => router.push('/company/hr/disciplinary' as any), isActive: pathname.startsWith('/company/hr/disciplinary') },
                    ],
                },
            },

            // ══════════ OPERATIONS ══════════
            {
                section: {
                    moduleSeparator: 'Operations',
                    title: 'Operations',
                    items: [
                        ...(hasPerm('inventory:read') ? [{ id: 'inventory', label: 'Inventory', icon: 'companies' as const, onPress: () => router.push('/company/inventory' as any), isActive: pathname.startsWith('/company/inventory') }] : []),
                        ...(hasPerm('production:read') ? [{ id: 'production', label: 'Production', icon: 'settings' as const, onPress: () => router.push('/company/production' as any), isActive: pathname.startsWith('/company/production') }] : []),
                        ...(hasPerm('maintenance:read') ? [{ id: 'maintenance', label: 'Maintenance', icon: 'settings' as const, onPress: () => router.push('/company/maintenance' as any), isActive: pathname.startsWith('/company/maintenance') }] : []),
                    ],
                },
            },

            // ══════════ REPORTS & SUPPORT ══════════
            {
                requiredPerm: 'audit:read',
                section: {
                    title: 'Reports',
                    items: [
                        { id: 'audit', label: 'Audit Logs', icon: 'audit' as const, onPress: () => router.push('/(app)/reports/audit' as any), isActive: pathname.startsWith('/reports/audit') },
                    ],
                },
            },
            {
                section: {
                    title: 'Support',
                    items: [
                        { id: 'support', label: 'Help & Support', icon: 'support' as const, onPress: () => router.push('/support' as any), isActive: pathname === '/support' },
                    ],
                },
            },
        ];

        return allSections
            .filter(({ requiredPerm }) => !requiredPerm || hasPerm(requiredPerm))
            .map(({ section }) => section)
            .filter((section) => section.items.length > 0);
    }, [pathname, permissions, isSuperAdmin, hasPerm, router]);

    return (
        <Sidebar
            sections={sections}
            userName={getDisplayName(user)}
            userRole={getRoleLabel(userRole)}
            userInitials={getUserInitials(user)}
            onSignOut={signOut}
            collapsible={false}
        />
    );
}

// ============ TAB LAYOUT ============

function HRIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke={color}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

function CompanyIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2"
                    stroke={color}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

function SettingsIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" fill="none" />
                <Path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke={color}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

function SupportIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M21 12a8 8 0 10-16 0v6a2 2 0 002 2h3v-4H7v-4a6 6 0 1112 0v4h-3v4h3a2 2 0 002-2v-6z"
                    stroke={color}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
}

function TabLayoutInner() {
    const status = useAuth.use.status();
    const userRole = useAuth.use.userRole();
    const permissions = useAuth.use.permissions();
    const router = useRouter();
    const [isFirstTime] = useIsFirstTime();
    const insets = useSafeAreaInsets();
    const isSuperAdmin = userRole === 'super-admin';
    const isCompanyAdmin = userRole === 'company-admin';
    // iOS base: 54px content + dynamic home indicator clearance
    // Android base: 68px content (larger touch targets) + gesture nav inset if present
    const TAB_BAR_HEIGHT = (Platform.OS === 'ios' ? 54 : 68) + insets.bottom;

    const hideSplash = useCallback(async () => {
        await SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
        if (status !== 'idle') {
            const timer = setTimeout(() => {
                hideSplash();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [hideSplash, status]);

    if (isFirstTime) {
        return <Redirect href="/onboarding" />;
    }
    if (status === 'signOut') {
        return <Redirect href="/login" />;
    }

    const hasPerm = (perm: string) => checkPermission(permissions, perm);
    const canViewCompany = hasPerm('company:read');
    const canViewHr = hasPerm('hr:read');
    const canViewOps = hasPerm('inventory:read') || hasPerm('production:read') || hasPerm('maintenance:read');
    const canViewReports = hasPerm('audit:read');
    const canViewSettings = hasPerm('company:configure') || hasPerm('role:read') || hasPerm('user:read');

    const visibleTabs = new Set<string>(['index']);

    if (isSuperAdmin) {
        visibleTabs.add('companies');
        visibleTabs.add('billing');
        visibleTabs.add('admin-support');
        visibleTabs.add('settings');
    } else if (isCompanyAdmin) {
        visibleTabs.add('companies');
        visibleTabs.add('billing');
        visibleTabs.add('support');
        visibleTabs.add('settings');
    } else {
        const dynamicCandidates = [
            canViewCompany ? 'companies' : null,
            canViewHr ? 'billing' : null,
            canViewOps ? 'more' : null,
            canViewReports ? 'reports' : null,
            'support',
            canViewSettings ? 'settings' : null,
        ].filter((tab): tab is string => Boolean(tab));

        dynamicCandidates.slice(0, 4).forEach((tab) => visibleTabs.add(tab));
    }

    return (
        <>
            <Tabs
                screenOptions={{
                    tabBarStyle: {
                        backgroundColor: colors.white,
                        borderTopWidth: 0,
                        elevation: 12,
                        shadowColor: colors.primary[900],
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.08,
                        shadowRadius: 16,
                        height: TAB_BAR_HEIGHT,
                        paddingTop: 8,
                        paddingBottom: insets.bottom,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    },
                    tabBarActiveTintColor: colors.primary[600],
                    tabBarInactiveTintColor: colors.neutral[400],
                    tabBarLabelStyle: {
                        fontFamily: 'Inter',
                        fontSize: 11,
                        fontWeight: '600',
                        marginTop: 4,
                    },
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color, focused }) => (
                            <DashboardIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'dashboard-tab',
                    }}
                />
                <Tabs.Screen
                    name="companies"
                    options={{
                        title: isCompanyAdmin || userRole === 'user' ? 'Company' : 'Companies',
                        tabBarIcon: ({ color, focused }) => (
                            isCompanyAdmin
                                ? <CompanyIcon color={color} focused={focused} />
                                : <CompaniesIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'companies-tab',
                        href: visibleTabs.has('companies') ? undefined : null,
                    }}
                    listeners={(isCompanyAdmin || (userRole === 'user' && canViewCompany)) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            // Use navigate (not push) to avoid corrupting the back stack
                            router.navigate('/company/profile');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="billing"
                    options={{
                        title: isCompanyAdmin || (userRole === 'user' && canViewHr) ? 'HR' : 'Billing',
                        tabBarIcon: ({ color, focused }) => (
                            isCompanyAdmin
                                ? <HRIcon color={color} focused={focused} />
                                : <BillingIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'billing-tab',
                        href: visibleTabs.has('billing') ? undefined : null,
                    }}
                    listeners={(isCompanyAdmin || (userRole === 'user' && canViewHr)) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/company/hr/employees');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="more"
                    options={{
                        title: 'Ops',
                        tabBarIcon: ({ color, focused }) => (
                            <MoreIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'more-tab',
                        href: visibleTabs.has('more') ? undefined : null,
                    }}
                    listeners={(userRole === 'user' && canViewOps) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            if (hasPerm('inventory:read')) {
                                router.navigate('/company/inventory');
                                return;
                            }
                            if (hasPerm('production:read')) {
                                router.navigate('/company/production');
                                return;
                            }
                            if (hasPerm('maintenance:read')) {
                                router.navigate('/company/maintenance');
                            }
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="reports"
                    options={{
                        title: 'Reports',
                        tabBarIcon: ({ color, focused }) => (
                            <MoreIcon color={color} focused={focused} />
                        ),
                        href: visibleTabs.has('reports') ? undefined : null,
                    }}
                    listeners={(userRole === 'user' && canViewReports) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/reports/audit');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, focused }) => (
                            <SettingsIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'settings-tab',
                        href: visibleTabs.has('settings') ? undefined : null,
                    }}
                    listeners={(isCompanyAdmin || (userRole === 'user' && canViewSettings)) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/company/settings');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="support"
                    options={{
                        title: 'Support',
                        tabBarIcon: ({ color, focused }) => (
                            <SupportIcon color={color} focused={focused} />
                        ),
                        href: visibleTabs.has('support') ? undefined : null,
                    }}
                />
                <Tabs.Screen
                    name="admin-support"
                    options={{
                        title: 'Support',
                        tabBarIcon: ({ color, focused }) => (
                            <SupportIcon color={color} focused={focused} />
                        ),
                        href: visibleTabs.has('admin-support') ? undefined : null,
                    }}
                />
                <Tabs.Screen name="tenant/[id]" options={{ href: null }} />
                <Tabs.Screen
                    name="tenant/add-company"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen name="tenant/module-assignment" options={{ href: null }} />
                <Tabs.Screen name="company" options={{ href: null }} />
            </Tabs>

            {/* Sidebar renders above everything */}
            <AppSidebar />
        </>
    );
}

export default function TabLayout() {
    return (
        <SidebarProvider>
            <TabLayoutInner />
        </SidebarProvider>
    );
}

const styles = StyleSheet.create({
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabActiveIndicator: {
        position: 'absolute',
        top: -12,
        width: 24,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.primary[500],
    },
});
