/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
    FadeInUp,
    SlideInRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { getDisplayName, getUserRoleDisplayLabel, useAuthStore } from '@/features/auth/use-auth-store';
import { useCompanyActivity } from '@/features/company-admin/api/use-company-admin-queries';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { NotificationsSheet } from '@/features/notifications/notifications-sheet';
import type { NotificationsSheetHandle } from '@/features/notifications/notifications-sheet';
import { useUnreadNotificationCount } from '@/features/notifications/use-notification-count';
import { useCompanyAdminStats } from '@/features/super-admin/api/use-dashboard-queries';
import { useIsDark } from '@/hooks/use-is-dark';

function useResponsiveWidths() {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12) / 2;
    const QUICK_ACTION_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12 * 3) / 4;
    return { SCREEN_WIDTH, CARD_WIDTH, QUICK_ACTION_WIDTH };
}

// ============ TYPES ============

interface KPICardData {
    title: string;
    value: string;
    iconColor: string;
    iconBg: string;
    iconType: 'users' | 'locations' | 'modules' | 'status';
    statusValue?: string;
}

interface QuickAction {
    id: string;
    title: string;
    iconType: 'manage-users' | 'manage-shifts' | 'key-contacts' | 'audit-logs';
    gradient: readonly [string, string];
    route: string;
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'user' | 'location' | 'module' | 'system';
}

// ============ HELPERS ============

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function mapActivityType(action: string): ActivityItem['type'] {
    if (action?.toLowerCase().includes('user') || action?.toLowerCase().includes('employee')) return 'user';
    if (action?.toLowerCase().includes('location') || action?.toLowerCase().includes('branch') || action?.toLowerCase().includes('plant')) return 'location';
    if (action?.toLowerCase().includes('module')) return 'module';
    return 'system';
}

function mapWizardStatusToBadge(status?: string): 'active' | 'trial' | 'suspended' | 'expired' | 'pending' {
    if (!status) return 'pending';
    const lower = status.toLowerCase();
    if (lower === 'active') return 'active';
    if (lower === 'pilot' || lower === 'trial') return 'trial';
    if (lower === 'inactive' || lower === 'suspended') return 'suspended';
    if (lower === 'draft') return 'pending';
    return 'active';
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: '1',
        title: 'Users',
        iconType: 'manage-users',
        gradient: [colors.primary[500], colors.primary[700]],
        route: '/company/users',
    },
    {
        id: '2',
        title: 'Shifts',
        iconType: 'manage-shifts',
        gradient: [colors.accent[500], colors.accent[700]],
        route: '/company/shifts',
    },
    {
        id: '3',
        title: 'Contacts',
        iconType: 'key-contacts',
        gradient: [colors.success[500], colors.success[700]],
        route: '/company/contacts',
    },
    {
        id: '4',
        title: 'Audit',
        iconType: 'audit-logs',
        gradient: [colors.info[500], colors.info[700]],
        route: '/reports/audit',
    },
];

// ============ ICON COMPONENTS ============

function KPIIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'users':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'locations':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.8" fill="none" />
                </Svg>
            );
        case 'modules':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
                    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
                    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
                    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
                </Svg>
            );
        case 'status':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        default:
            return null;
    }
}

function QuickActionIcon({ type }: { type: string }) {
    switch (type) {
        case 'manage-users':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'manage-shifts':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.8" fill="none" />
                    <Path d="M12 6v6l4 2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'key-contacts':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path d="M22 6l-10 7L2 6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'audit-logs':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        default:
            return null;
    }
}

function ActivityTypeIcon({ type }: { type: string }) {
    const getColor = () => {
        switch (type) {
            case 'user': return colors.primary[500];
            case 'location': return colors.accent[500];
            case 'module': return colors.success[500];
            case 'system': return colors.info[500];
            default: return colors.neutral[400];
        }
    };
    const getBgColor = () => {
        switch (type) {
            case 'user': return colors.primary[100];
            case 'location': return colors.accent[100];
            case 'module': return colors.success[100];
            case 'system': return colors.info[100];
            default: return colors.neutral[100];
        }
    };
    return (
        <View style={[styles.activityIcon, { backgroundColor: getBgColor() }]}>
            <View style={[styles.activityDot, { backgroundColor: getColor() }]} />
        </View>
    );
}

// ============ SUB-COMPONENTS ============

function HeaderSection({ stats, onBellPress, unreadCount }: { stats?: any; onBellPress: () => void; unreadCount: number }) {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const userRole = useAuthStore.use.userRole();
    const displayName = getDisplayName(user);
    const roleLabel = getUserRoleDisplayLabel(user, userRole);
    const userTier = stats?.userTier ?? 'N/A';

    return (
        <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
                {/* Decorative circles */}
                <View style={styles.headerCircle1} />
                <View style={styles.headerCircle2} />

                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <HamburgerButton onPress={toggle} />

                        <View style={styles.headerTextContainer}>
                            <Text className="font-inter text-sm font-medium text-primary-200">
                                {roleLabel}
                            </Text>
                            <Text className="font-inter text-xl font-bold text-white" numberOfLines={1}>
                                {displayName}
                            </Text>
                        </View>
                    </View>

                    {/* Notification Bell */}
                    <NotificationBell onPress={onBellPress} unreadCount={unreadCount} />
                </View>

                {/* Company status bar */}
                <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.healthBar}>
                    <View style={styles.healthItem}>
                        <View style={[styles.healthDot, { backgroundColor: colors.success[400] }]} />
                        <Text className="font-inter text-xs font-medium text-white/80">
                            Company Active
                        </Text>
                    </View>
                    <Text className="font-inter text-xs text-white/60">
                        Plan: {userTier}
                    </Text>
                </Animated.View>
            </LinearGradient>
        </Animated.View>
    );
}

function KPICard({ data, index, cardWidth }: { data: KPICardData; index: number; cardWidth: number }) {
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(200 + index * 100)}
        >
            <View style={[styles.kpiCard, { width: cardWidth }]}>
                <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconContainer, { backgroundColor: data.iconBg }]}>
                        <KPIIcon type={data.iconType} color={data.iconColor} />
                    </View>
                </View>
                {data.iconType === 'status' && data.statusValue ? (
                    <View style={styles.kpiStatusRow}>
                        <StatusBadge status={mapWizardStatusToBadge(data.statusValue)} size="sm" />
                    </View>
                ) : (
                    <Text className="mt-3 font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        {data.value}
                    </Text>
                )}
                <Text className="mt-1 font-inter text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {data.title}
                </Text>
            </View>
        </Animated.View>
    );
}

function QuickActionsSection({ actionWidth }: { actionWidth: number }) {
    const router = useRouter();

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(600)}
            style={styles.section}
        >
            <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
                Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.map((action, index) => (
                    <Animated.View
                        key={action.id}
                        entering={SlideInRight.duration(400).delay(700 + index * 80)}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                styles.quickActionCard,
                                { width: actionWidth },
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => router.push(action.route as any)}
                        >
                            <LinearGradient
                                colors={action.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.quickActionIcon}
                            >
                                <QuickActionIcon type={action.iconType} />
                            </LinearGradient>
                            <Text
                                style={styles.quickActionTitle}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.85}
                            >
                                {action.title}
                            </Text>
                        </Pressable>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

function CompanyOverviewSection({ stats }: { stats: any }) {
    const companyName = stats?.companyName ?? 'My Company';
    const wizardStatus = stats?.wizardStatus ?? 'Active';
    const activeModules = stats?.activeModules ?? 0;
    const totalLocations = stats?.totalLocations ?? 0;
    const userTier = stats?.userTier ?? 'Enterprise';

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(800)}
            style={styles.section}
        >
            <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
                Company Overview
            </Text>
            <View style={styles.overviewCard}>
                <LinearGradient
                    colors={[colors.primary[600], colors.accent[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.overviewGradient}
                >
                    {/* Decorative circles */}
                    <View style={styles.overviewCircle1} />
                    <View style={styles.overviewCircle2} />

                    <View style={styles.overviewHeader}>
                        <Text className="font-inter text-lg font-bold text-white" numberOfLines={1}>
                            {companyName}
                        </Text>
                        <StatusBadge status={mapWizardStatusToBadge(wizardStatus)} size="sm" />
                    </View>

                    <View style={styles.overviewRow}>
                        <View style={styles.overviewStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {activeModules}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Modules
                            </Text>
                        </View>
                        <View style={styles.overviewDivider} />
                        <View style={styles.overviewStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {totalLocations}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Locations
                            </Text>
                        </View>
                        <View style={styles.overviewDivider} />
                        <View style={styles.overviewStat}>
                            <Text className="font-inter text-sm font-bold text-white">
                                {userTier}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Tier
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </Animated.View>
    );
}

function RecentActivitySection({ items, isLoading }: { items: ActivityItem[]; isLoading: boolean }) {
    const router = useRouter();

    if (isLoading) {
        return (
            <View style={styles.section}>
                <Skeleton
                    isLoading={true}
                    layout={[
                        { key: 'h', width: '50%', height: 20, borderRadius: 6, marginBottom: 16 },
                        { key: 'r1', width: '100%', height: 52, borderRadius: 12, marginBottom: 8 },
                        { key: 'r2', width: '100%', height: 52, borderRadius: 12, marginBottom: 8 },
                        { key: 'r3', width: '100%', height: 52, borderRadius: 12 },
                    ]}
                >
                    <View />
                </Skeleton>
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <Animated.View entering={FadeInUp.duration(400).delay(1000)} style={styles.section}>
                <EmptyState
                    icon="inbox"
                    title="No recent activity"
                    message="Activity will appear here as actions are performed."
                />
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(1000)}
            style={styles.section}
        >
            <View style={styles.sectionHeader}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                    Recent Activity
                </Text>
                <Pressable
                    style={styles.seeAllButton}
                    onPress={() => router.push('/reports/audit' as any)}
                >
                    <Text className="font-inter text-sm font-semibold text-primary-500">
                        View All
                    </Text>
                </Pressable>
            </View>

            <View style={styles.activityCard}>
                {items.map((item, index) => (
                    <Animated.View
                        key={item.id}
                        entering={FadeInRight.duration(300).delay(1100 + index * 80)}
                    >
                        <Pressable
                            style={[
                                styles.activityItem,
                                index < items.length - 1 && styles.activityItemBorder,
                            ]}
                        >
                            <ActivityTypeIcon type={item.type} />
                            <View style={styles.activityContent}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                    {item.title}
                                </Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                                    {item.description}
                                </Text>
                            </View>
                            <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                {item.time}
                            </Text>
                        </Pressable>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyAdminDashboard() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { CARD_WIDTH, QUICK_ACTION_WIDTH } = useResponsiveWidths();
    const { data: statsResponse, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useCompanyAdminStats();
    const { data: activityResponse, isLoading: activityLoading, refetch: refetchActivity } = useCompanyActivity(5);

    const [refreshing, setRefreshing] = React.useState(false);

    // Notification bell
    const notifSheetRef = React.useRef<NotificationsSheetHandle>(null);
    const { data: unreadData } = useUnreadNotificationCount();
    const unreadCount: number = unreadData?.data?.count ?? 0;

    const stats = statsResponse?.data ?? statsResponse;

    const kpiData: KPICardData[] = React.useMemo(() => [
        {
            title: 'Total Users',
            value: String(stats?.totalUsers ?? 0),
            iconColor: colors.primary[600],
            iconBg: colors.primary[100],
            iconType: 'users' as const,
        },
        {
            title: 'Locations',
            value: String(stats?.totalLocations ?? 0),
            iconColor: colors.accent[600],
            iconBg: colors.accent[100],
            iconType: 'locations' as const,
        },
        {
            title: 'Active Modules',
            value: String(stats?.activeModules ?? 0),
            iconColor: colors.success[600],
            iconBg: colors.success[100],
            iconType: 'modules' as const,
        },
        {
            title: 'Company Status',
            value: stats?.wizardStatus ?? 'Active',
            statusValue: stats?.wizardStatus ?? 'Active',
            iconColor: colors.info[600],
            iconBg: colors.info[100],
            iconType: 'status' as const,
        },
    ], [stats]);

    const rawActivity = activityResponse?.data ?? activityResponse ?? [];
    const activityItems: ActivityItem[] = Array.isArray(rawActivity)
        ? rawActivity.map((item: any, idx: number) => ({
            id: item.id ?? String(idx),
            title: item.action ?? item.title ?? 'Activity',
            description: item.details ?? item.description ?? '',
            time: item.timestamp ? timeAgo(item.timestamp) : item.time ?? '',
            type: mapActivityType(item.action ?? item.type ?? ''),
        }))
        : [];

    if (statsLoading) {
        return (
            <View style={styles.container}>
                <HeaderSection stats={stats} onBellPress={() => notifSheetRef.current?.open()} unreadCount={unreadCount} />
                <View style={styles.kpiGrid}>
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'kpi1', width: CARD_WIDTH, height: 110, borderRadius: 20, marginBottom: 12 },
                            { key: 'kpi2', width: CARD_WIDTH, height: 110, borderRadius: 20, marginBottom: 12 },
                            { key: 'kpi3', width: CARD_WIDTH, height: 110, borderRadius: 20 },
                            { key: 'kpi4', width: CARD_WIDTH, height: 110, borderRadius: 20 },
                        ]}
                        containerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
                    >
                        <View />
                    </Skeleton>
                </View>
                <View style={styles.section}>
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'qa', width: '100%', height: 80, borderRadius: 16 },
                        ]}
                    >
                        <View />
                    </Skeleton>
                </View>
                <View style={styles.section}>
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'ov', width: '100%', height: 120, borderRadius: 20 },
                        ]}
                    >
                        <View />
                    </Skeleton>
                </View>
                <View style={styles.section}>
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'a1', width: '100%', height: 50, borderRadius: 12, marginBottom: 8 },
                            { key: 'a2', width: '100%', height: 50, borderRadius: 12, marginBottom: 8 },
                            { key: 'a3', width: '100%', height: 50, borderRadius: 12 },
                        ]}
                    >
                        <View />
                    </Skeleton>
                </View>
                <NotificationsSheet ref={notifSheetRef} />
            </View>
        );
    }

    if (statsError) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
                <Text className="font-inter text-base font-semibold text-danger-600">Failed to load dashboard</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400 text-center">
                    {(statsError as any)?.message ?? 'An error occurred. Please try again.'}
                </Text>
                <Pressable onPress={() => refetchStats()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary[500] }}>
                    <Text className="font-inter text-sm font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
                bounces
                alwaysBounceVertical
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => {
                            if (refreshing) return;
                            setRefreshing(true);
                            try {
                                await Promise.all([refetchStats(), refetchActivity()]);
                            } finally {
                                setRefreshing(false);
                            }
                        }}
                    />
                }
            >
                {/* Header */}
                <HeaderSection stats={stats} onBellPress={() => notifSheetRef.current?.open()} unreadCount={unreadCount} />

                {/* KPI Cards Grid */}
                <View style={styles.kpiGrid}>
                    {kpiData.map((kpi, index) => (
                        <KPICard key={kpi.title} data={kpi} index={index} cardWidth={CARD_WIDTH} />
                    ))}
                </View>

                {/* Quick Actions */}
                <QuickActionsSection actionWidth={QUICK_ACTION_WIDTH} />

                {/* Company Overview */}
                <CompanyOverviewSection stats={stats} />

                {/* Recent Activity */}
                <RecentActivitySection items={activityItems} isLoading={activityLoading} />
            </ScrollView>

            {/* Notifications Bottom Sheet */}
            <NotificationsSheet ref={notifSheetRef} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    scrollContent: {
        flexGrow: 1,
    },
    // Header
    headerGradient: {
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerCircle2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTextContainer: {
        flex: 1,
    },
    healthBar: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    healthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    healthDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    // KPI Cards
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        marginTop: -12,
        gap: 12,
    },
    kpiCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 20,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    kpiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    kpiIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiStatusRow: {
        marginTop: 12,
    },
    // Quick Actions
    section: {
        paddingHorizontal: 24,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllButton: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickActionCard: {
        alignItems: 'center',
    },
    quickActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    quickActionTitle: {
        marginTop: 8,
        width: '100%',
        textAlign: 'center',
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary[900],
    },
    // Company Overview
    overviewCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    overviewGradient: {
        padding: 24,
        overflow: 'hidden',
    },
    overviewCircle1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    overviewCircle2: {
        position: 'absolute',
        bottom: -15,
        left: 40,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    overviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overviewStat: {
        flex: 1,
        alignItems: 'center',
    },
    overviewDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    // Activity
    activityCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 20,
        paddingVertical: 4,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    activityItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    activityContent: {
        flex: 1,
        marginRight: 8,
    },
});
const styles = createStyles(false);
