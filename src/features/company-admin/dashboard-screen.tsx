/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
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
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useAuthStore, getDisplayName } from '@/features/auth/use-auth-store';
import { useCompanyAdminStats } from '@/features/super-admin/api/use-dashboard-queries';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12) / 2;
const QUICK_ACTION_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12 * 3) / 4;

// ============ TYPES ============

interface KPICardData {
    title: string;
    value: string | null;
    change: string | null;
    changePositive: boolean;
    iconColor: string;
    iconBg: string;
    iconType: 'employees' | 'attendance' | 'leave' | 'approvals';
}

interface QuickAction {
    id: string;
    title: string;
    iconType: 'manage-employees' | 'attendance' | 'leave-requests' | 'reports';
    gradient: readonly [string, string];
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'employee' | 'attendance' | 'leave' | 'system';
}

// ============ MOCK / FALLBACK DATA ============

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: '1',
        title: 'Employees',
        iconType: 'manage-employees',
        gradient: [colors.primary[500], colors.primary[700]],
    },
    {
        id: '2',
        title: 'Attendance',
        iconType: 'attendance',
        gradient: [colors.accent[500], colors.accent[700]],
    },
    {
        id: '3',
        title: 'Leave',
        iconType: 'leave-requests',
        gradient: [colors.success[500], colors.success[700]],
    },
    {
        id: '4',
        title: 'Reports',
        iconType: 'reports',
        gradient: [colors.info[500], colors.info[700]],
    },
];

const RECENT_ACTIVITY: ActivityItem[] = [
    {
        id: '1',
        title: 'New Employee Onboarded',
        description: 'Rahul Sharma joined the Engineering team',
        time: '30 min ago',
        type: 'employee',
    },
    {
        id: '2',
        title: 'Leave Approved',
        description: 'Priya Patel — Casual Leave (2 days)',
        time: '1 hr ago',
        type: 'leave',
    },
    {
        id: '3',
        title: 'Attendance Alert',
        description: '3 employees marked late today',
        time: '2 hrs ago',
        type: 'attendance',
    },
    {
        id: '4',
        title: 'Payroll Processed',
        description: 'March 2026 payroll batch completed',
        time: '1 day ago',
        type: 'system',
    },
];

// ============ ICON COMPONENTS ============

function KPIIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'employees':
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
        case 'attendance':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M22 11.08V12a10 10 0 11-5.93-9.14"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path
                        d="M22 4L12 14.01l-3-3"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'leave':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </Svg>
            );
        case 'approvals':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                        stroke={color}
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path d="M14 2v6h6M9 15l2 2 4-4" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        default:
            return null;
    }
}

function QuickActionIcon({ type }: { type: string }) {
    switch (type) {
        case 'manage-employees':
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
        case 'attendance':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                        d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'leave-requests':
            return (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#fff" strokeWidth="1.8" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </Svg>
            );
        case 'reports':
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
        default:
            return null;
    }
}

function ActivityTypeIcon({ type }: { type: string }) {
    const getColor = () => {
        switch (type) {
            case 'employee': return colors.primary[500];
            case 'attendance': return colors.success[500];
            case 'leave': return colors.warning[500];
            case 'system': return colors.info[500];
            default: return colors.neutral[400];
        }
    };
    const getBgColor = () => {
        switch (type) {
            case 'employee': return colors.primary[100];
            case 'attendance': return colors.success[100];
            case 'leave': return colors.warning[100];
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

function HeaderSection() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const displayName = getDisplayName(user);

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
                                Company Admin
                            </Text>
                            <Text className="font-inter text-xl font-bold text-white" numberOfLines={1}>
                                {displayName}
                            </Text>
                        </View>
                    </View>

                    {/* Notification Bell */}
                    <Pressable style={styles.notificationBell}>
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path
                                d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                                stroke="#ffffff"
                                strokeWidth="1.8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <View style={styles.notificationBadge}>
                            <Text className="font-inter text-[9px] font-bold text-white">5</Text>
                        </View>
                    </Pressable>
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
                        Plan: Enterprise
                    </Text>
                </Animated.View>
            </LinearGradient>
        </Animated.View>
    );
}

function KPICard({ data, index }: { data: KPICardData; index: number }) {
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(200 + index * 100)}
            style={styles.kpiCard}
        >
            <View style={styles.kpiHeader}>
                <View style={[styles.kpiIconContainer, { backgroundColor: data.iconBg }]}>
                    <KPIIcon type={data.iconType} color={data.iconColor} />
                </View>
                {data.change != null && (
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
                            className={`font-inter text-[10px] font-bold ${data.changePositive ? 'text-success-600' : 'text-danger-600'}`}
                        >
                            {data.change}
                        </Text>
                    </View>
                )}
            </View>
            <Text className="mt-3 font-inter text-2xl font-bold text-primary-950 dark:text-white">
                {data.value ?? '\u2014'}
            </Text>
            <Text className="mt-1 font-inter text-xs font-medium text-neutral-500">
                {data.title}
            </Text>
        </Animated.View>
    );
}

function KPISection() {
    const { data: response, isLoading } = useCompanyAdminStats();
    const stats = response?.data as Record<string, any> | undefined;

    const kpiData: KPICardData[] = React.useMemo(() => [
        {
            title: 'Total Employees',
            value: stats?.totalEmployees?.toString() ?? null,
            change: stats?.employeeChange ? `+${stats.employeeChange}` : null,
            changePositive: true,
            iconColor: colors.primary[600],
            iconBg: colors.primary[100],
            iconType: 'employees' as const,
        },
        {
            title: 'Active Today',
            value: stats?.activeToday?.toString() ?? null,
            change: stats?.activePercent ? `${stats.activePercent}%` : null,
            changePositive: true,
            iconColor: colors.success[600],
            iconBg: colors.success[100],
            iconType: 'attendance' as const,
        },
        {
            title: 'On Leave',
            value: stats?.onLeave?.toString() ?? null,
            change: null,
            changePositive: false,
            iconColor: colors.warning[600],
            iconBg: colors.warning[100],
            iconType: 'leave' as const,
        },
        {
            title: 'Pending Approvals',
            value: stats?.pendingApprovals?.toString() ?? null,
            change: stats?.pendingApprovals && stats.pendingApprovals > 0 ? 'Action needed' : null,
            changePositive: false,
            iconColor: colors.info[600],
            iconBg: colors.info[100],
            iconType: 'approvals' as const,
        },
    ], [stats]);

    if (isLoading) {
        return (
            <View style={styles.kpiGrid}>
                {[0, 1, 2, 3].map((i) => (
                    <Animated.View
                        key={i}
                        entering={FadeInUp.duration(400).delay(200 + i * 100)}
                        style={[styles.kpiCard, styles.kpiCardLoading]}
                    >
                        <ActivityIndicator size="small" color={colors.primary[400]} />
                    </Animated.View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.kpiGrid}>
            {kpiData.map((kpi, index) => (
                <KPICard key={kpi.title} data={kpi} index={index} />
            ))}
        </View>
    );
}

function QuickActionsSection() {
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
                        <Pressable style={styles.quickActionCard}>
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

function ModuleUsageSection() {
    const modules = [
        { name: 'HR Management', usage: 92 },
        { name: 'Attendance', usage: 87 },
        { name: 'Payroll', usage: 78 },
        { name: 'Inventory', usage: 45 },
    ];

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(800)}
            style={styles.section}
        >
            <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
                Module Usage
            </Text>
            <View style={styles.moduleCard}>
                {modules.map((mod, index) => (
                    <View
                        key={mod.name}
                        style={[
                            styles.moduleRow,
                            index < modules.length - 1 && styles.moduleRowBorder,
                        ]}
                    >
                        <View style={styles.moduleInfo}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">
                                {mod.name}
                            </Text>
                            <Text className="font-inter text-xs text-neutral-500">
                                {mod.usage}% utilization
                            </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: `${mod.usage}%`,
                                        backgroundColor:
                                            mod.usage >= 80
                                                ? colors.success[500]
                                                : mod.usage >= 50
                                                  ? colors.warning[500]
                                                  : colors.neutral[400],
                                    },
                                ]}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
}

function RecentActivitySection() {
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(1000)}
            style={styles.section}
        >
            <View style={styles.sectionHeader}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                    Recent Activity
                </Text>
                <Pressable style={styles.seeAllButton}>
                    <Text className="font-inter text-sm font-semibold text-primary-500">
                        See All
                    </Text>
                </Pressable>
            </View>

            <View style={styles.activityCard}>
                {RECENT_ACTIVITY.map((item, index) => (
                    <Animated.View
                        key={item.id}
                        entering={FadeInRight.duration(300).delay(1100 + index * 80)}
                    >
                        <Pressable
                            style={[
                                styles.activityItem,
                                index < RECENT_ACTIVITY.length - 1 && styles.activityItemBorder,
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

// ============ MAIN COMPONENT ============

export function CompanyAdminDashboard() {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
                bounces={false}
            >
                {/* Header */}
                <HeaderSection />

                {/* KPI Cards Grid */}
                <KPISection />

                {/* Quick Actions */}
                <QuickActionsSection />

                {/* Module Usage */}
                <ModuleUsageSection />

                {/* Recent Activity */}
                <RecentActivitySection />
            </ScrollView>
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
    headerTextContainer: {
        flex: 1,
    },
    notificationBell: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.danger[500],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary[600],
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
    kpiCardLoading: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
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
    // Module Usage
    moduleCard: {
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
    moduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    moduleRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    moduleInfo: {
        flex: 1,
        marginRight: 16,
    },
    progressBarContainer: {
        width: 80,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.neutral[100],
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
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
