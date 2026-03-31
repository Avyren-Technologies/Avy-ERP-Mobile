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
} from '@/components/ui/sidebar';
import type { SidebarSection, SidebarIconType } from '@/components/ui/sidebar';
import {
    useAuthStore as useAuth,
    getDisplayName,
    getUserInitials,
    getRoleLabel,
} from '@/features/auth/use-auth-store';
import { checkPermission } from '@/lib/api/auth';
import { useNavigationManifest } from '@/features/company-admin/api/use-company-admin-queries';
import { usePermissionRefresh } from '@/hooks/use-permission-refresh';
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

function LeaveIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" fill={focused ? colors.primary[500] : 'none'} />
                <Path d="M16 2v4M8 2v4M3 10h18" stroke={focused ? 'rgba(255,255,255,0.6)' : color} strokeWidth="1.8" strokeLinecap="round" />
                <Path d="M9 16l2 2 4-4" stroke={focused ? '#FFFFFF' : color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </View>
    );
}

function AttendanceIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill={focused ? colors.primary[500] : 'none'} />
                <Path d="M12 6v6l4 2" stroke={focused ? '#FFFFFF' : color} strokeWidth="1.8" strokeLinecap="round" />
            </Svg>
        </View>
    );
}

// ============ MANIFEST ICON MAPPING ============

function mapManifestIcon(icon: string): SidebarIconType {
    const MAP: Record<string, SidebarIconType> = {
        'dashboard': 'dashboard', 'building': 'companies', 'credit-card': 'billing',
        'users': 'users', 'user': 'users', 'user-cog': 'users', 'user-check': 'users', 'user-plus': 'users',
        'settings': 'settings', 'sliders': 'settings', 'clock': 'settings', 'timer': 'settings',
        'cpu': 'settings', 'hash': 'settings', 'file-check': 'settings', 'pen-tool': 'settings',
        'git-branch': 'settings', 'database': 'settings', 'refresh-cw': 'settings',
        'support': 'support', 'message-circle': 'support',
        'shield-check': 'audit', 'shield': 'audit', 'check-square': 'audit',
        'log-out': 'logout', 'log-in': 'settings',
        'receipt': 'billing', 'dollar-sign': 'billing', 'wallet': 'billing',
        'calculator': 'billing', 'landmark': 'billing', 'hand-coins': 'billing',
        'file-text': 'reports', 'file-spreadsheet': 'reports', 'file-signature': 'reports',
        'bar-chart': 'reports', 'activity': 'dashboard',
        'blocks': 'settings', 'toggle-left': 'settings',
        'map-pin': 'companies', 'briefcase': 'companies', 'package': 'companies',
        'calendar': 'settings', 'calendar-off': 'settings', 'calendar-check': 'settings', 'calendar-days': 'settings',
        'clipboard-list': 'settings', 'book-open': 'settings', 'send': 'settings', 'scale': 'settings',
        'play': 'settings', 'pause-circle': 'settings', 'stamp': 'settings',
        'mail': 'settings', 'bell-ring': 'settings',
        'arrow-left-right': 'settings', 'trending-up': 'settings',
        'target': 'settings', 'flag': 'settings', 'star': 'settings',
        'brain': 'settings', 'git-fork': 'settings',
        'graduation-cap': 'settings', 'award': 'settings',
        'alert-triangle': 'settings', 'gavel': 'settings',
        'wrench': 'settings', 'factory': 'settings', 'plane': 'settings', 'gift': 'settings',
        'message-square': 'settings',
    };
    return MAP[icon] ?? 'settings';
}

function isPathActive(currentPath: string, itemPath: string): boolean {
    // Convert web paths to mobile paths for comparison
    const mobilePath = itemPath.replace(/^\/app/, '');
    if (mobilePath === '/dashboard') return currentPath === '/';
    return currentPath === mobilePath || currentPath.startsWith(mobilePath + '/');
}

// ============ SIDEBAR ROOT (inside SidebarProvider) ============

function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const signOut = useAuth.use.signOut();
    const user = useAuth.use.user();
    const userRole = useAuth.use.userRole();

    const { data: manifestData } = useNavigationManifest();
    usePermissionRefresh();

    /**
     * Build sidebar sections entirely from the navigation manifest API.
     * All roles (including super admin) are served by the manifest.
     * Returns empty array while the manifest is loading (<200ms).
     */
    const sections: SidebarSection[] = React.useMemo(() => {
        const rawManifest = (manifestData as any)?.data ?? manifestData;
        if (Array.isArray(rawManifest) && rawManifest.length > 0) {
            return rawManifest.map((section: any) => ({
                moduleSeparator: section.moduleSeparator,
                title: section.group === 'Overview' ? undefined : section.group,
                items: section.items.map((item: any) => ({
                    id: item.id,
                    label: item.label,
                    icon: mapManifestIcon(item.icon),
                    isActive: isPathActive(pathname, item.path) || (item.children ?? []).some((child: any) => isPathActive(pathname, child.path)),
                    children: (item.children ?? []).map((child: any) => ({
                        label: child.label,
                        path: child.path,
                        isActive: isPathActive(pathname, child.path),
                        onPress: () => {
                            const childMobilePath = child.path.replace(/^\/app/, '');
                            router.push(childMobilePath as any);
                        },
                    })),
                    onPress: () => {
                        const mobilePath = item.path.replace(/^\/app/, '');
                        router.push(mobilePath as any);
                    },
                })),
            })).filter((s: any) => s.items.length > 0);
        }

        // Loading state — show empty sidebar while manifest fetches
        return [];
    }, [pathname, router, manifestData]);

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
    const isEmployee =
        userRole !== 'super-admin' &&
        userRole !== 'company-admin' &&
        permissions.some((p: string) => p.startsWith('ess:')) &&
        !permissions.some(
            (p: string) => p === 'company:read' || p === 'company:*'
        );
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
    const showCompanyTab = hasPerm('company:read') || hasPerm('platform:admin');
    const showBillingTab = hasPerm('company:read') || hasPerm('platform:admin') || hasPerm('hr:read');
    const showSettingsTab = hasPerm('company:read') || hasPerm('platform:admin');
    const canViewOps = hasPerm('inventory:read') || hasPerm('production:read') || hasPerm('maintenance:read');

    const visibleTabs = new Set<string>(['index']);

    if (isEmployee) {
        // Employee gets: Dashboard, Leave, Attendance, More
        visibleTabs.add('my-leave');
        visibleTabs.add('my-attendance');
        visibleTabs.add('more');
    } else {
        if (showCompanyTab) visibleTabs.add('companies');
        if (showBillingTab) visibleTabs.add('billing');
        if (showSettingsTab || canViewOps) visibleTabs.add('more');
        if (isSuperAdmin) visibleTabs.add('admin-support');
        else visibleTabs.add('support');
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
                    listeners={(isCompanyAdmin || (userRole === 'user' && showCompanyTab)) ? {
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
                        title: isCompanyAdmin || (userRole === 'user' && showBillingTab) ? 'HR' : 'Billing',
                        tabBarIcon: ({ color, focused }) => (
                            isCompanyAdmin
                                ? <HRIcon color={color} focused={focused} />
                                : <BillingIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'billing-tab',
                        href: visibleTabs.has('billing') ? undefined : null,
                    }}
                    listeners={(isCompanyAdmin || (userRole === 'user' && showBillingTab)) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/company/hr/employees');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="more"
                    options={{
                        title: isEmployee ? 'More' : 'Settings',
                        tabBarIcon: ({ color, focused }) => (
                            isEmployee
                                ? <MoreIcon color={color} focused={focused} />
                                : <SettingsIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'more-tab',
                        href: visibleTabs.has('more') ? undefined : null,
                    }}
                    listeners={(!isEmployee && (isCompanyAdmin || (userRole === 'user' && showSettingsTab))) ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/more');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="reports"
                    options={{ href: null }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{ href: null }}
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
                {/* ── Employee-specific tabs ── */}
                <Tabs.Screen
                    name="my-leave"
                    options={{
                        title: 'Leave',
                        tabBarIcon: ({ color, focused }) => (
                            <LeaveIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'my-leave-tab',
                        href: visibleTabs.has('my-leave') ? '/my-leave' : null,
                    }}
                    listeners={isEmployee ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/company/hr/my-leave');
                        },
                    } : undefined}
                />
                <Tabs.Screen
                    name="my-attendance"
                    options={{
                        title: 'Attendance',
                        tabBarIcon: ({ color, focused }) => (
                            <AttendanceIcon color={color} focused={focused} />
                        ),
                        tabBarButtonTestID: 'my-attendance-tab',
                        href: visibleTabs.has('my-attendance') ? '/my-attendance' : null,
                    }}
                    listeners={isEmployee ? {
                        tabPress: (e) => {
                            e.preventDefault();
                            router.navigate('/company/hr/my-attendance');
                        },
                    } : undefined}
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
