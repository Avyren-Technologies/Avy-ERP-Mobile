/* eslint-disable better-tailwindcss/no-unknown-classes */
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    RefreshControl,
    StyleSheet,
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
import { HamburgerButton } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { NotificationBell } from '@/features/notifications/notification-bell';
import { NotificationsSheet } from '@/features/notifications/notifications-sheet';
import type { NotificationsSheetHandle } from '@/features/notifications/notifications-sheet';
import { notificationKeys } from '@/features/notifications/notifications-sheet';
import { useSuperAdminStats, useRecentActivity } from '@/features/super-admin/api/use-dashboard-queries';
import { notificationApi } from '@/lib/api/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12) / 2;
const QUICK_ACTION_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12 * 3) / 4;

// ============ TYPES ============

interface KPICardData {
    title: string;
    value: string;
    change: string;
    changePositive: boolean;
    iconColor: string;
    iconBg: string;
    iconType: 'companies' | 'users' | 'revenue' | 'modules';
    route: string;
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'company' | 'billing' | 'support' | 'system';
}

interface QuickAction {
    id: string;
    title: string;
    iconType: 'add-company' | 'manage-billing' | 'view-reports' | 'settings';
    gradient: readonly [string, string];
    route: string;
}

// ============ HELPERS ============

function formatIndianCurrency(amount: number): string {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
}

function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
}

function buildKPIData(stats: any): KPICardData[] {
    return [
        {
            title: 'Active Companies',
            value: formatCount(stats?.activeCompanies ?? 0),
            change: '',
            changePositive: true,
            iconColor: colors.primary[600],
            iconBg: colors.primary[100],
            iconType: 'companies',
            route: '/(app)/companies',
        },
        {
            title: 'Total Users',
            value: formatCount(stats?.totalUsers ?? 0),
            change: '',
            changePositive: true,
            iconColor: colors.accent[600],
            iconBg: colors.accent[100],
            iconType: 'users',
            route: '/(app)/companies',
        },
        {
            title: 'Monthly Revenue',
            value: formatIndianCurrency(stats?.monthlyRevenue ?? 0),
            change: '',
            changePositive: true,
            iconColor: colors.success[600],
            iconBg: colors.success[100],
            iconType: 'revenue',
            route: '/(app)/billing',
        },
        {
            title: 'Active Modules',
            value: String(stats?.activeModules ?? 0),
            change: '',
            changePositive: true,
            iconColor: colors.info[600],
            iconBg: colors.info[100],
            iconType: 'modules',
            route: '/(app)/companies',
        },
    ];
}

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
    if (action?.toLowerCase().includes('company') || action?.toLowerCase().includes('tenant')) return 'company';
    if (action?.toLowerCase().includes('billing') || action?.toLowerCase().includes('invoice') || action?.toLowerCase().includes('payment')) return 'billing';
    if (action?.toLowerCase().includes('support') || action?.toLowerCase().includes('ticket')) return 'support';
    return 'system';
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: '1',
        title: 'Add Company',
        iconType: 'add-company',
        gradient: [colors.primary[500], colors.primary[700]],
        route: '/(app)/tenant/add-company',
    },
    {
        id: '2',
        title: 'Billing',
        iconType: 'manage-billing',
        gradient: [colors.accent[500], colors.accent[700]],
        route: '/(app)/billing',
    },
    {
        id: '3',
        title: 'Reports',
        iconType: 'view-reports',
        gradient: [colors.success[500], colors.success[700]],
        route: '/(app)/reports/audit',
    },
    {
        id: '4',
        title: 'Settings',
        iconType: 'settings',
        gradient: [colors.info[500], colors.info[700]],
        route: '/(app)/settings',
    },
];

// ============ ICON COMPONENTS ============

function KPIIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'companies':
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
        case 'revenue':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
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
        default:
            return null;
    }
}

function QuickActionIcon({ type }: { type: string }) {
    switch (type) {
        case 'add-company':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );
        case 'manage-billing':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'view-reports':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M18 20V10M12 20V4M6 20v-6"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'settings':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.8" fill="none" />
                    <Path
                        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                        stroke="#fff"
                        strokeWidth="1.5"
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
            case 'company': return colors.primary[500];
            case 'billing': return colors.success[500];
            case 'support': return colors.warning[500];
            case 'system': return colors.info[500];
            default: return colors.neutral[400];
        }
    };
    const getBgColor = () => {
        switch (type) {
            case 'company': return colors.primary[100];
            case 'billing': return colors.success[100];
            case 'support': return colors.warning[100];
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

function HeaderSection({ onBellPress, unreadCount }: { onBellPress: () => void; unreadCount: number }) {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    return (
        <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
                {/* Decorative circles on header */}
                <View style={styles.headerCircle1} />
                <View style={styles.headerCircle2} />

                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        {/* Hamburger Menu */}
                        <HamburgerButton onPress={toggle} />

                        <View style={styles.headerTextContainer}>
                            <Text className="font-inter text-sm font-medium text-primary-200">
                                Super Admin
                            </Text>
                            <Text className="font-inter text-xl font-bold text-white">
                                Welcome back
                            </Text>
                        </View>
                    </View>

                    {/* Notification Bell */}
                    <NotificationBell onPress={onBellPress} unreadCount={unreadCount} />
                </View>

                {/* Platform Health Bar */}
                <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.healthBar}>
                    <View style={styles.healthItem}>
                        <View style={[styles.healthDot, { backgroundColor: colors.success[400] }]} />
                        <Text className="font-inter text-xs font-medium text-white/80">
                            All Systems Operational
                        </Text>
                    </View>
                    <Text className="font-inter text-xs text-white/60">
                        Uptime: 99.98%
                    </Text>
                </Animated.View>
            </LinearGradient>
        </Animated.View>
    );
}

function KPICard({ data, index }: { data: KPICardData; index: number }) {
    const router = useRouter();

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(200 + index * 100)}
        >
            <Pressable
                onPress={() => router.push(data.route as any)}
                style={({ pressed }) => [
                    styles.kpiCard,
                    pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                ]}
            >
                <View style={styles.kpiHeader}>
                    <View style={[styles.kpiIconContainer, { backgroundColor: data.iconBg }]}>
                        <KPIIcon type={data.iconType} color={data.iconColor} />
                    </View>
                    <View
                        style={[
                            styles.changeBadge,
                            {
                                backgroundColor: data.changePositive
                                    ? colors.success[50]
                                    : colors.danger[50],
                            },
                        ]}
                    >
                        <Text
                            className={`font-inter text-[10px] font-bold ${data.changePositive ? 'text-success-600' : 'text-danger-600'
                                }`}
                        >
                            {data.change}
                        </Text>
                    </View>
                </View>
                <Text className="mt-3 font-inter text-2xl font-bold text-primary-950 dark:text-white">
                    {data.value}
                </Text>
                <Text className="mt-1 font-inter text-xs font-medium text-neutral-500">
                    {data.title}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function QuickActionsSection() {
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
            <Animated.View entering={FadeInUp.duration(400).delay(900)} style={styles.section}>
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
            entering={FadeInUp.duration(400).delay(900)}
            style={styles.section}
        >
            <View style={styles.sectionHeader}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                    Recent Activity
                </Text>
                <Pressable
                    style={styles.seeAllButton}
                    onPress={() => router.push('/(app)/reports/audit' as any)}
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
                        entering={FadeInRight.duration(300).delay(1000 + index * 80)}
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
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={1}>
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

function TenantOverviewSection({ overview }: { overview: { active: number; trial: number; suspended: number; expired: number } }) {
    const router = useRouter();

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(1100)}
            style={styles.section}
        >
            <View style={styles.sectionHeader}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                    Tenant Overview
                </Text>
                <Pressable
                    style={styles.seeAllButton}
                    onPress={() => router.push('/(app)/companies' as any)}
                >
                    <Text className="font-inter text-sm font-semibold text-primary-500">
                        View All
                    </Text>
                </Pressable>
            </View>
            <View style={styles.tenantCard}>
                <LinearGradient
                    colors={[colors.primary[600], colors.accent[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tenantGradient}
                >
                    {/* Decorative circles */}
                    <View style={styles.tenantCircle1} />
                    <View style={styles.tenantCircle2} />

                    <View style={styles.tenantRow}>
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {overview.active}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Active
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {overview.trial}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Trial
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {overview.suspended}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Suspended
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                {overview.expired}
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Expired
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function SuperAdminDashboard() {
    const insets = useSafeAreaInsets();
    const { data: statsResponse, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useSuperAdminStats();
    const { data: activityResponse, isLoading: activityLoading, refetch: refetchActivity } = useRecentActivity();

    const [refreshing, setRefreshing] = React.useState(false);

    // Notification bell
    const notifSheetRef = React.useRef<NotificationsSheetHandle>(null);
    const { data: unreadData } = useQuery({
        queryKey: notificationKeys.unreadCount(),
        queryFn: () => notificationApi.getUnreadCount(),
        refetchInterval: 30000,
    });
    const unreadCount: number = (unreadData as any)?.data?.count ?? 0;

    const stats = statsResponse?.data ?? statsResponse;
    const kpiData = buildKPIData(stats);
    const tenantOverview = stats?.tenantOverview ?? { active: 0, trial: 0, suspended: 0, expired: 0 };

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
                <HeaderSection onBellPress={() => notifSheetRef.current?.open()} unreadCount={unreadCount} />
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
                            { key: 'to', width: '100%', height: 100, borderRadius: 20 },
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
                <Text className="mt-1 font-inter text-sm text-neutral-500 text-center">
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
                // Keep pull-to-refresh gesture enabled on iOS.
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
                <HeaderSection onBellPress={() => notifSheetRef.current?.open()} unreadCount={unreadCount} />

                {/* KPI Cards Grid */}
                <View style={styles.kpiGrid}>
                    {kpiData.map((kpi, index) => (
                        <KPICard key={kpi.title} data={kpi} index={index} />
                    ))}
                </View>

                {/* Quick Actions */}
                <QuickActionsSection />

                {/* Tenant Overview */}
                <TenantOverviewSection overview={tenantOverview} />

                {/* Recent Activity */}
                <RecentActivitySection items={activityItems} isLoading={activityLoading} />
            </ScrollView>

            {/* Notifications Bottom Sheet */}
            <NotificationsSheet ref={notifSheetRef} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
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
    avatarContainer: {
        marginRight: 14,
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success[400],
        borderWidth: 2,
        borderColor: colors.primary[600],
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
        width: CARD_WIDTH,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.primary[50],
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
    changeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
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
        backgroundColor: colors.primary[50],
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickActionCard: {
        alignItems: 'center',
        width: QUICK_ACTION_WIDTH,
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
    // Tenant Overview
    tenantCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    tenantGradient: {
        padding: 24,
        overflow: 'hidden',
    },
    tenantCircle1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    tenantCircle2: {
        position: 'absolute',
        bottom: -15,
        left: 40,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    tenantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tenantStat: {
        flex: 1,
        alignItems: 'center',
    },
    tenantDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    // Activity
    activityCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        paddingVertical: 4,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.primary[50],
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
