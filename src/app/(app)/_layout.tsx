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
    const { isOpen, close } = useSidebar();
    const router = useRouter();
    const pathname = usePathname();
    const signOut = useAuth.use.signOut();
    const user = useAuth.use.user();
    const userRole = useAuth.use.userRole();

    const isSuperAdmin = userRole === 'super-admin';

    const isCompanyAdmin = userRole === 'company-admin';

    const companyAdminSections: SidebarSection[] = React.useMemo(
        () => [
            {
                title: 'Dashboard',
                items: [
                    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const, onPress: () => router.push('/'), isActive: pathname === '/' },
                ],
            },
            {
                title: 'Company',
                items: [
                    { id: 'profile', label: 'Company Profile', icon: 'companies' as const, onPress: () => router.push('/company/profile' as any), isActive: pathname.startsWith('/company/profile') },
                    { id: 'locations', label: 'Locations', icon: 'companies' as const, onPress: () => router.push('/company/locations' as any), isActive: pathname.startsWith('/company/locations') },
                    { id: 'shifts', label: 'Shifts & Time', icon: 'settings' as const, onPress: () => router.push('/company/shifts' as any), isActive: pathname.startsWith('/company/shifts') },
                    { id: 'contacts', label: 'Key Contacts', icon: 'users' as const, onPress: () => router.push('/company/contacts' as any), isActive: pathname.startsWith('/company/contacts') },
                ],
            },
            {
                title: 'HR & People',
                items: [
                    { id: 'departments', label: 'Departments', icon: 'companies' as const, onPress: () => router.push('/company/hr/departments' as any), isActive: pathname.startsWith('/company/hr/departments') },
                    { id: 'designations', label: 'Designations', icon: 'users' as const, onPress: () => router.push('/company/hr/designations' as any), isActive: pathname.startsWith('/company/hr/designations') },
                    { id: 'grades', label: 'Grades & Bands', icon: 'settings' as const, onPress: () => router.push('/company/hr/grades' as any), isActive: pathname.startsWith('/company/hr/grades') },
                    { id: 'emp-types', label: 'Employee Types', icon: 'users' as const, onPress: () => router.push('/company/hr/employee-types' as any), isActive: pathname.startsWith('/company/hr/employee-types') },
                    { id: 'cost-centres', label: 'Cost Centres', icon: 'billing' as const, onPress: () => router.push('/company/hr/cost-centres' as any), isActive: pathname.startsWith('/company/hr/cost-centres') },
                    { id: 'employees', label: 'Employee Directory', icon: 'users' as const, onPress: () => router.push('/company/hr/employees' as any), isActive: pathname.startsWith('/company/hr/employees') },
                ],
            },
            {
                title: 'Configuration',
                items: [
                    { id: 'no-series', label: 'Number Series', icon: 'settings' as const, onPress: () => router.push('/company/no-series' as any), isActive: pathname.startsWith('/company/no-series') },
                    { id: 'iot-reasons', label: 'IOT Reasons', icon: 'settings' as const, onPress: () => router.push('/company/iot-reasons' as any), isActive: pathname.startsWith('/company/iot-reasons') },
                    { id: 'controls', label: 'System Controls', icon: 'settings' as const, onPress: () => router.push('/company/controls' as any), isActive: pathname.startsWith('/company/controls') },
                    { id: 'settings', label: 'Settings', icon: 'settings' as const, onPress: () => router.push('/company/settings' as any), isActive: pathname.startsWith('/company/settings') },
                ],
            },
            {
                title: 'People & Access',
                items: [
                    { id: 'users', label: 'User Management', icon: 'users' as const, onPress: () => router.push('/company/users' as any), isActive: pathname.startsWith('/company/users') },
                    { id: 'roles', label: 'Roles & Permissions', icon: 'users' as const, onPress: () => router.push('/company/roles' as any), isActive: pathname.startsWith('/company/roles') },
                    { id: 'feature-toggles', label: 'Feature Toggles', icon: 'settings' as const, onPress: () => router.push('/company/feature-toggles' as any), isActive: pathname.startsWith('/company/feature-toggles') },
                ],
            },
            {
                title: 'Reports',
                items: [
                    { id: 'audit', label: 'Audit Logs', icon: 'audit' as const, onPress: () => router.push('/(app)/reports/audit' as any), isActive: pathname.startsWith('/reports/audit') },
                ],
            },
            {
                title: 'Support',
                items: [
                    { id: 'support', label: 'Help & Support', icon: 'support' as const, onPress: () => {}, isActive: false },
                ],
            },
        ],
        [pathname, router]
    );

    const superAdminSections: SidebarSection[] = React.useMemo(
        () => [
            {
                items: [
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        icon: 'dashboard' as const,
                        isActive: pathname === '/',
                        onPress: () => router.push('/'),
                    },
                    {
                        id: 'companies',
                        label: 'Companies',
                        icon: 'companies' as const,
                        isActive: pathname === '/companies',
                        onPress: () => router.push('/companies'),
                    },
                ],
            },
            {
                title: 'Billing',
                items: [
                    {
                        id: 'billing-overview',
                        label: 'Overview',
                        icon: 'billing' as const,
                        isActive: pathname === '/billing',
                        onPress: () => router.push('/billing'),
                    },
                    {
                        id: 'billing-invoices',
                        label: 'Invoices',
                        icon: 'billing' as const,
                        isActive: pathname.startsWith('/billing/invoices'),
                        onPress: () => router.push('/(app)/billing/invoices' as any),
                    },
                    {
                        id: 'billing-payments',
                        label: 'Payments',
                        icon: 'billing' as const,
                        isActive: pathname.startsWith('/billing/payments'),
                        onPress: () => router.push('/(app)/billing/payments' as any),
                    },
                ],
            },
            {
                title: 'Administration',
                items: [
                    {
                        id: 'audit',
                        label: 'Audit Logs',
                        icon: 'audit' as const,
                        isActive: pathname === '/reports/audit',
                        onPress: () => router.push('/(app)/reports/audit' as any),
                    },
                    {
                        id: 'users',
                        label: 'User Management',
                        icon: 'users' as const,
                        isActive: false,
                        onPress: () => {},
                    },
                ],
            },
            {
                title: 'System',
                items: [
                    {
                        id: 'settings',
                        label: 'Settings',
                        icon: 'settings' as const,
                        isActive: pathname === '/settings',
                        onPress: () => router.push('/settings'),
                    },
                    {
                        id: 'support',
                        label: 'Support',
                        icon: 'support' as const,
                        isActive: false,
                        onPress: () => {},
                    },
                ],
            },
        ],
        [pathname, router]
    );

    const defaultSections: SidebarSection[] = React.useMemo(
        () => [
            {
                items: [
                    {
                        id: 'dashboard',
                        label: 'Dashboard',
                        icon: 'dashboard' as const,
                        isActive: pathname === '/',
                        onPress: () => router.push('/'),
                    },
                ],
            },
            {
                title: 'System',
                items: [
                    {
                        id: 'settings',
                        label: 'Settings',
                        icon: 'settings' as const,
                        isActive: pathname === '/settings',
                        onPress: () => router.push('/settings'),
                    },
                    {
                        id: 'support',
                        label: 'Support',
                        icon: 'support' as const,
                        isActive: false,
                        onPress: () => {},
                    },
                ],
            },
        ],
        [pathname, router]
    );

    const sections = isSuperAdmin
        ? superAdminSections
        : isCompanyAdmin
            ? companyAdminSections
            : defaultSections;

    return (
        <Sidebar
            isOpen={isOpen}
            onClose={close}
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

function TabLayoutInner() {
    const status = useAuth.use.status();
    const userRole = useAuth.use.userRole();
    const [isFirstTime] = useIsFirstTime();
    const insets = useSafeAreaInsets();
    const isSuperAdmin = userRole === 'super-admin';
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
                        title: 'Companies',
                        tabBarIcon: ({ color, focused }) => (
                            <CompaniesIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'companies-tab',
                        href: isSuperAdmin ? undefined : null,
                    }}
                />
                <Tabs.Screen
                    name="billing"
                    options={{
                        title: 'Billing',
                        tabBarIcon: ({ color, focused }) => (
                            <BillingIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'billing-tab',
                        href: isSuperAdmin ? undefined : null,
                    }}
                />
                <Tabs.Screen
                    name="more"
                    options={{
                        title: 'More',
                        tabBarIcon: ({ color, focused }) => (
                            <MoreIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'more-tab',
                    }}
                />
                <Tabs.Screen name="reports" options={{ href: null }} />
                <Tabs.Screen name="settings" options={{ href: null }} />
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
