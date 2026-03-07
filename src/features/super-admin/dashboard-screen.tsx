/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
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
import { HamburgerButton } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 12) / 2;

// ============ TYPES ============

interface KPICardData {
    title: string;
    value: string;
    change: string;
    changePositive: boolean;
    iconColor: string;
    iconBg: string;
    iconType: 'companies' | 'users' | 'revenue' | 'modules';
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
}

// ============ MOCK DATA ============

const KPI_DATA: KPICardData[] = [
    {
        title: 'Active Companies',
        value: '148',
        change: '+12',
        changePositive: true,
        iconColor: colors.primary[600],
        iconBg: colors.primary[100],
        iconType: 'companies',
    },
    {
        title: 'Total Users',
        value: '3,842',
        change: '+287',
        changePositive: true,
        iconColor: colors.accent[600],
        iconBg: colors.accent[100],
        iconType: 'users',
    },
    {
        title: 'Monthly Revenue',
        value: '₹24.8L',
        change: '+8.2%',
        changePositive: true,
        iconColor: colors.success[600],
        iconBg: colors.success[100],
        iconType: 'revenue',
    },
    {
        title: 'Active Modules',
        value: '892',
        change: '-3',
        changePositive: false,
        iconColor: colors.info[600],
        iconBg: colors.info[100],
        iconType: 'modules',
    },
];

const RECENT_ACTIVITY: ActivityItem[] = [
    {
        id: '1',
        title: 'New Company Registered',
        description: 'Apex Manufacturing Pvt. Ltd joined the platform',
        time: '2 min ago',
        type: 'company',
    },
    {
        id: '2',
        title: 'Subscription Upgraded',
        description: 'Steel Dynamics upgraded to Enterprise plan',
        time: '15 min ago',
        type: 'billing',
    },
    {
        id: '3',
        title: 'Support Ticket Raised',
        description: 'Sahara Industries reported an integration issue',
        time: '1 hr ago',
        type: 'support',
    },
    {
        id: '4',
        title: 'System Update Deployed',
        description: 'v2.4.1 patch deployed to all tenants',
        time: '3 hrs ago',
        type: 'system',
    },
    {
        id: '5',
        title: 'Payment Received',
        description: 'Indo Metals cleared ₹1.2L invoice',
        time: '5 hrs ago',
        type: 'billing',
    },
];

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: '1',
        title: 'Add Company',
        iconType: 'add-company',
        gradient: [colors.primary[500], colors.primary[700]],
    },
    {
        id: '2',
        title: 'Billing',
        iconType: 'manage-billing',
        gradient: [colors.accent[500], colors.accent[700]],
    },
    {
        id: '3',
        title: 'Reports',
        iconType: 'view-reports',
        gradient: [colors.success[500], colors.success[700]],
    },
    {
        id: '4',
        title: 'Settings',
        iconType: 'settings',
        gradient: [colors.info[500], colors.info[700]],
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

function HeaderSection() {
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
                            <Text className="font-inter text-[9px] font-bold text-white">3</Text>
                        </View>
                    </Pressable>
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
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(200 + index * 100)}
            style={styles.kpiCard}
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
        </Animated.View>
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
                            <Text className="mt-2 font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">
                                {action.title}
                            </Text>
                        </Pressable>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

function RecentActivitySection() {
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(900)}
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
                        entering={FadeInRight.duration(300).delay(1000 + index * 80)}
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

function TenantOverviewSection() {
    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(1100)}
            style={styles.section}
        >
            <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
                Tenant Overview
            </Text>
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
                                127
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Active
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                14
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Trial
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                5
                            </Text>
                            <Text className="mt-1 font-inter text-xs font-medium text-primary-200">
                                Suspended
                            </Text>
                        </View>
                        <View style={styles.tenantDivider} />
                        <View style={styles.tenantStat}>
                            <Text className="font-inter text-2xl font-bold text-white">
                                2
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
                <View style={styles.kpiGrid}>
                    {KPI_DATA.map((kpi, index) => (
                        <KPICard key={kpi.title} data={kpi} index={index} />
                    ))}
                </View>

                {/* Quick Actions */}
                <QuickActionsSection />

                {/* Tenant Overview */}
                <TenantOverviewSection />

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
        width: (SCREEN_WIDTH - 48 - 36) / 4,
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
