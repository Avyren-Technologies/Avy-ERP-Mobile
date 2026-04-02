/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as LocalAuthentication from 'expo-local-authentication';
import { Redirect, SplashScreen, Tabs, usePathname, useRouter } from 'expo-router';
import {
    Building,
    Building2,
    CalendarCheck,
    Clock,
    CreditCard,
    Fingerprint,
    Headphones,
    LayoutDashboard,
    Settings,
    Users,
} from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SidebarIconType, SidebarSection } from '@/components/ui/sidebar'; // eslint-disable-line perfectionist/sort-imports
import colors from '@/components/ui/colors';
import {
    Sidebar,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { showSuccess } from '@/components/ui/utils';
import {
    getDisplayName,
    getRoleLabel,
    getUserInitials,
    useAuthStore as useAuth,
} from '@/features/auth/use-auth-store';
import { useNavigationManifest } from '@/features/company-admin/api/use-company-admin-queries';
import { usePermissionRefresh } from '@/hooks/use-permission-refresh';
import { checkPermission } from '@/lib/api/auth';
import { client } from '@/lib/api/client';
import { getToken } from '@/lib/auth/utils';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';
import { getItem, setItem } from '@/lib/storage';

// ============ TAB ICON COMPONENT ============

function TabIcon({ icon: Icon, color, focused }: { icon: any; color: string; focused: boolean }) {
    return (
        <View style={styles.tabIconContainer}>
            {focused && <View style={styles.tabActiveIndicator} />}
            <Icon color={color} size={22} strokeWidth={focused ? 2.2 : 1.8} />
        </View>
    );
}

// ============ TAB BAR VISIBILITY CONTEXT ============

type TabBarControl = { hide: () => void; show: () => void };
const TabBarVisibilityContext = React.createContext<TabBarControl>({ hide: () => {}, show: () => {} });
export const useTabBarVisibility = () => React.useContext(TabBarVisibilityContext);

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
    return currentPath === mobilePath || currentPath.startsWith(`${mobilePath}/`);
}

function toMobileRoutePath(itemPath: string): string {
    const mobilePath = itemPath.replace(/^\/app/, '');
    // Dashboard is the root tab ("index"), not a "/dashboard" route file.
    if (mobilePath === '/dashboard') return '/';
    return mobilePath;
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
                            const childMobilePath = toMobileRoutePath(child.path);
                            router.push(childMobilePath as any);
                        },
                    })),
                    onPress: () => {
                        const mobilePath = toMobileRoutePath(item.path);
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

// ============ BIOMETRIC PROMPT MODAL ============

const BIOMETRIC_PROMPT_SHOWN_KEY = 'biometric_prompt_shown';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

function BiometricPromptModal({
    onEnable,
    onSkip,
}: {
    onEnable: () => void;
    onSkip: () => void;
}) {
    return (
        <Modal transparent animationType="fade" statusBarTranslucent>
            <View style={biometricStyles.overlay}>
                <View style={biometricStyles.card}>
                    <View style={biometricStyles.iconContainer}>
                        <Fingerprint color={colors.primary[600]} size={48} strokeWidth={1.5} />
                    </View>
                    <Text style={biometricStyles.title}>Enable Biometric Login?</Text>
                    <Text style={biometricStyles.description}>
                        Sign in faster with Face ID / Fingerprint next time you open the app.
                    </Text>
                    <Pressable style={biometricStyles.enableButton} onPress={onEnable}>
                        <Text style={biometricStyles.enableButtonText}>Enable</Text>
                    </Pressable>
                    <Pressable style={biometricStyles.skipButton} onPress={onSkip}>
                        <Text style={biometricStyles.skipButtonText}>Not Now</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const biometricStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 16,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: 'Inter',
        fontSize: 20,
        fontWeight: '700',
        color: colors.neutral[900],
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral[500],
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    enableButton: {
        backgroundColor: colors.primary[600],
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    enableButtonText: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
    skipButton: {
        paddingVertical: 10,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
    },
    skipButtonText: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral[400],
    },
});

// ============ TAB LAYOUT ============

function TabLayoutInner() {
    'use no memo'; // Reanimated shared values are incompatible with React Compiler
    const status = useAuth.use.status();
    const userRole = useAuth.use.userRole();
    const permissions = useAuth.use.permissions();
    const router = useRouter();
    const [isFirstTime] = useIsFirstTime();
    const insets = useSafeAreaInsets();
    const isSuperAdmin = userRole === 'super-admin';
    // Determine effective role from PERMISSIONS, not from User.role (which is always COMPANY_ADMIN for company users).
    // A user is an "employee" if they have ESS permissions but NOT company:read/company:* (admin-level access).
    const hasCompanyAccess = permissions.some(
        (p: string) => p === 'company:read' || p === 'company:*' || p === 'company:configure'
    );
    const hasEssAccess = permissions.some((p: string) => p.startsWith('ess:'));
    const isEmployee = !isSuperAdmin && hasEssAccess && !hasCompanyAccess;
    const isCompanyAdmin = !isSuperAdmin && hasCompanyAccess;
    // iOS base: 54px content + dynamic home indicator clearance
    // Android base: 68px content (larger touch targets) + gesture nav inset if present
    const TAB_BAR_HEIGHT = (Platform.OS === 'ios' ? 54 : 68) + insets.bottom;

    // ── Animated tab bar hide/show ──
    const tabTranslateY = useSharedValue(0);
    const autoShowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideTabBar = useCallback(() => {
        tabTranslateY.value = withTiming(TAB_BAR_HEIGHT + 10, { duration: 250 });
        if (autoShowRef.current) clearTimeout(autoShowRef.current);
        autoShowRef.current = setTimeout(() => {
            tabTranslateY.value = withTiming(0, { duration: 300 });
        }, 3000);
    }, [TAB_BAR_HEIGHT, tabTranslateY]);

    const showTabBar = useCallback(() => {
        if (autoShowRef.current) clearTimeout(autoShowRef.current);
        tabTranslateY.value = withTiming(0, { duration: 300 });
    }, [tabTranslateY]);

    const tabBarControl: TabBarControl = React.useMemo(
        () => ({ hide: hideTabBar, show: showTabBar }),
        [hideTabBar, showTabBar],
    );

    useEffect(() => {
        return () => {
            if (autoShowRef.current) clearTimeout(autoShowRef.current);
        };
    }, []);

    const tabBarAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: tabTranslateY.value }],
    }));

    // ── Biometric prompt ──
    const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

    useEffect(() => {
        async function checkBiometric() {
            // Only for company users
            if (isSuperAdmin || status !== 'signIn') return;

            const alreadyAsked = getItem<boolean>(BIOMETRIC_PROMPT_SHOWN_KEY);
            const biometricEnabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
            if (alreadyAsked || biometricEnabled) return;

            // Check device capability
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) return;

            // Check company setting
            try {
                const response = await client.get('/auth/security-settings');
                const data = response as any;
                if (!data?.data?.biometricLoginEnabled) return;
            } catch {
                return;
            }

            // Show prompt after a short delay
            setTimeout(() => setShowBiometricPrompt(true), 1500);
        }
        checkBiometric();
    }, [status, isSuperAdmin]);

    const handleEnableBiometric = useCallback(async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm to enable biometric login',
            });
            if (result.success) {
                const token = getToken();
                if (token?.refresh) {
                    await setItem(BIOMETRIC_TOKEN_KEY, token.refresh);
                    await setItem(BIOMETRIC_ENABLED_KEY, true);
                }
                showSuccess('Biometric login enabled');
            }
        } catch {
            // ignore
        }
        await setItem(BIOMETRIC_PROMPT_SHOWN_KEY, true);
        setShowBiometricPrompt(false);
    }, []);

    const handleSkipBiometric = useCallback(async () => {
        await setItem(BIOMETRIC_PROMPT_SHOWN_KEY, true);
        setShowBiometricPrompt(false);
    }, []);

    // ── Splash screen ──
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
        // Employee gets: Dashboard, Leave, Attendance, Settings
        visibleTabs.add('my-leave');
        visibleTabs.add('my-attendance');
        visibleTabs.add('more');
    } else if (isSuperAdmin) {
        // Super admin gets: Dashboard, Companies, Billing, Support, Settings
        visibleTabs.add('companies');
        visibleTabs.add('billing');
        visibleTabs.add('admin-support');
        visibleTabs.add('more');
    } else {
        // Company admin / Manager / custom roles: Dashboard, Company, HR, Support, Settings
        if (showCompanyTab) visibleTabs.add('companies');
        if (showBillingTab) visibleTabs.add('billing');
        visibleTabs.add('support');
        visibleTabs.add('more');
    }

    return (
        <TabBarVisibilityContext.Provider value={tabBarControl}>
            <>
                <Tabs
                    screenOptions={{
                        tabBarStyle: { display: 'none' },
                        headerShown: false,
                    }}
                    tabBar={(props) => (
                        <Animated.View style={[{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                        }, tabBarAnimStyle]}>
                            <View style={{
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
                                flexDirection: 'row',
                            }}>
                                {props.state.routes.map((route, index) => {
                                    const { options } = props.descriptors[route.key];
                                    // Only show tabs that are in the visibleTabs set
                                    if (!visibleTabs.has(route.name)) return null;

                                    const isFocused = props.state.index === index;
                                    const color = isFocused ? colors.primary[600] : colors.neutral[400];
                                    const label = options.title ?? route.name;

                                    return (
                                        <Pressable
                                            key={route.key}
                                            accessibilityRole="button"
                                            accessibilityState={isFocused ? { selected: true } : {}}
                                            onPress={() => {
                                                const event = props.navigation.emit({
                                                    type: 'tabPress',
                                                    target: route.key,
                                                    canPreventDefault: true,
                                                });
                                                if (!isFocused && !event.defaultPrevented) {
                                                    props.navigation.navigate(route.name);
                                                }
                                            }}
                                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {options.tabBarIcon?.({ color, focused: isFocused, size: 22 })}
                                            <Text style={{
                                                fontFamily: 'Inter',
                                                fontSize: 11,
                                                fontWeight: isFocused ? '700' : '600',
                                                marginTop: 4,
                                                color,
                                            }}>{label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    )}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: 'Dashboard',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={LayoutDashboard} color={color} focused={focused} />
                            ),
                            tabBarButtonTestID: 'dashboard-tab',
                        }}
                    />
                    <Tabs.Screen
                        name="companies"
                        options={{
                            title: isCompanyAdmin || userRole === 'user' ? 'Company' : 'Companies',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={isCompanyAdmin ? Building : Building2} color={color} focused={focused} />
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
                                <TabIcon icon={isCompanyAdmin ? Users : CreditCard} color={color} focused={focused} />
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
                    {/* ── Employee-specific tabs ── */}
                    <Tabs.Screen
                        name="my-leave"
                        options={{
                            title: 'Leave',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={CalendarCheck} color={color} focused={focused} />
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
                                <TabIcon icon={Clock} color={color} focused={focused} />
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
                    <Tabs.Screen
                        name="support"
                        options={{
                            title: 'Support',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={Headphones} color={color} focused={focused} />
                            ),
                            href: visibleTabs.has('support') ? undefined : null,
                        }}
                    />
                    <Tabs.Screen
                        name="admin-support"
                        options={{
                            title: 'Support',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={Headphones} color={color} focused={focused} />
                            ),
                            href: visibleTabs.has('admin-support') ? undefined : null,
                        }}
                    />
                    {/* Settings tab — always last visible tab */}
                    <Tabs.Screen
                        name="more"
                        options={{
                            title: 'Settings',
                            tabBarIcon: ({ color, focused }) => (
                                <TabIcon icon={Settings} color={color} focused={focused} />
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
                    {/* ── Hidden route tabs ── */}
                    <Tabs.Screen
                        name="reports"
                        options={{ href: null }}
                    />
                    <Tabs.Screen
                        name="settings"
                        options={{ href: null }}
                    />
                    <Tabs.Screen
                        name="help"
                        options={{ href: null }}
                    />
                    <Tabs.Screen
                        name="modules"
                        options={{ href: null }}
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

                {/* Biometric prompt modal */}
                {showBiometricPrompt && (
                    <BiometricPromptModal
                        onEnable={handleEnableBiometric}
                        onSkip={handleSkipBiometric}
                    />
                )}
            </>
        </TabBarVisibilityContext.Provider>
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
