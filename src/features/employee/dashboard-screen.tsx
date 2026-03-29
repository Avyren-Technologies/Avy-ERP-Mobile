/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useAuthStore } from '@/features/auth/use-auth-store';

// ============ TYPES ============

interface QuickStat {
    label: string;
    value: string;
    subtitle: string;
    iconType: 'leave' | 'attendance' | 'holiday';
    bg: string;
    iconColor: string;
}

interface ActionCard {
    id: string;
    title: string;
    subtitle: string;
    iconType: 'leave' | 'payslip' | 'checkin' | 'attendance' | 'profile' | 'chatbot';
    gradient: readonly [string, string];
    route: string;
}

interface HolidayItem {
    id: string;
    name: string;
    date: string;
    day: string;
}

// ============ HELPERS ============

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatDate(): string {
    return new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ============ MOCK DATA ============

const QUICK_STATS: QuickStat[] = [
    {
        label: 'Leave Balance',
        value: '12',
        subtitle: 'days remaining',
        iconType: 'leave',
        bg: colors.success[50],
        iconColor: colors.success[500],
    },
    {
        label: 'Attendance',
        value: '96%',
        subtitle: 'this month',
        iconType: 'attendance',
        bg: colors.primary[50],
        iconColor: colors.primary[500],
    },
    {
        label: 'Next Holiday',
        value: 'Apr 14',
        subtitle: 'Ambedkar Jayanti',
        iconType: 'holiday',
        bg: colors.warning[50],
        iconColor: colors.warning[500],
    },
];

const ACTION_CARDS: ActionCard[] = [
    {
        id: 'apply-leave',
        title: 'Apply Leave',
        subtitle: 'Request time off',
        iconType: 'leave',
        gradient: [colors.success[400], colors.success[600]] as const,
        route: '/company/hr/my-leave',
    },
    {
        id: 'my-payslips',
        title: 'My Payslips',
        subtitle: 'View salary slips',
        iconType: 'payslip',
        gradient: [colors.primary[400], colors.primary[600]] as const,
        route: '/company/hr/my-payslips',
    },
    {
        id: 'check-in',
        title: 'Check In',
        subtitle: 'Mark attendance',
        iconType: 'checkin',
        gradient: [colors.accent[400], colors.accent[600]] as const,
        route: '/company/hr/shift-check-in',
    },
    {
        id: 'my-attendance',
        title: 'My Attendance',
        subtitle: 'View records',
        iconType: 'attendance',
        gradient: [colors.info[400], colors.info[600]] as const,
        route: '/company/hr/my-attendance',
    },
    {
        id: 'my-profile',
        title: 'My Profile',
        subtitle: 'Personal details',
        iconType: 'profile',
        gradient: [colors.warning[400], colors.warning[600]] as const,
        route: '/company/hr/my-profile',
    },
    {
        id: 'hr-chatbot',
        title: 'HR Chatbot',
        subtitle: 'Ask anything',
        iconType: 'chatbot',
        gradient: ['#EC4899', '#BE185D'] as const,
        route: '/company/hr/chatbot',
    },
];

const UPCOMING_HOLIDAYS: HolidayItem[] = [
    { id: '1', name: 'Ambedkar Jayanti', date: 'Apr 14', day: 'Monday' },
    { id: '2', name: 'Good Friday', date: 'Apr 18', day: 'Friday' },
    { id: '3', name: 'May Day', date: 'May 1', day: 'Thursday' },
];

// ============ ICON COMPONENTS ============

function StatIcon({ type, color }: { type: QuickStat['iconType']; color: string }) {
    switch (type) {
        case 'leave':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );
        case 'attendance':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
                    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );
        case 'holiday':
            return (
                <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
                </Svg>
            );
        default: {
            const _exhaustive: never = type;
            return _exhaustive;
        }
    }
}

function ActionIcon({ type }: { type: ActionCard['iconType'] }) {
    const color = '#FFFFFF';
    switch (type) {
        case 'leave':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'payslip':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Rect x="2" y="3" width="20" height="18" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M7 8h10M7 12h6M7 16h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );
        case 'checkin':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'attendance':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );
        case 'profile':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" fill="none" />
                    <Path d="M20 21a8 8 0 10-16 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                </Svg>
            );
        case 'chatbot':
            return (
                <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
                    <Path d="M8 10h.01M12 10h.01M16 10h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
                </Svg>
            );
        default: {
            const _exhaustive: never = type;
            return _exhaustive;
        }
    }
}

// ============ SUB-COMPONENTS ============

function QuickStatCard({ stat, index }: { stat: QuickStat; index: number }) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 48 - 16) / 3;

    return (
        <Animated.View
            entering={FadeInDown.delay(200 + index * 100).duration(500)}
            style={[S.statCard, { width: cardWidth }]}
        >
            <View style={[S.statIconContainer, { backgroundColor: stat.bg }]}>
                <StatIcon type={stat.iconType} color={stat.iconColor} />
            </View>
            <Text className="font-inter" style={S.statValue}>{stat.value}</Text>
            <Text className="font-inter" style={S.statLabel}>{stat.label}</Text>
            <Text className="font-inter" style={S.statSubtitle}>{stat.subtitle}</Text>
        </Animated.View>
    );
}

function ActionGridCard({ action, index }: { action: ActionCard; index: number }) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const cardWidth = (width - 48 - 12) / 2;

    return (
        <Animated.View
            entering={FadeInDown.delay(400 + index * 80).duration(500)}
        >
            <Pressable
                style={({ pressed }) => [
                    S.actionCard,
                    { width: cardWidth, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => router.push(action.route as any)}
            >
                <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={S.actionGradient}
                >
                    <View style={S.actionIconWrap}>
                        <ActionIcon type={action.iconType} />
                    </View>
                    <Text className="font-inter" style={S.actionTitle}>{action.title}</Text>
                    <Text className="font-inter" style={S.actionSubtitle}>{action.subtitle}</Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

function HolidayCard({ holiday, index }: { holiday: HolidayItem; index: number }) {
    return (
        <Animated.View
            entering={FadeInDown.delay(700 + index * 100).duration(500)}
            style={S.holidayCard}
        >
            <View style={S.holidayDateBadge}>
                <Text className="font-inter" style={S.holidayDateText}>{holiday.date}</Text>
            </View>
            <View style={S.holidayInfo}>
                <Text className="font-inter" style={S.holidayName}>{holiday.name}</Text>
                <Text className="font-inter" style={S.holidayDay}>{holiday.day}</Text>
            </View>
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function EmployeeDashboard() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const user = useAuthStore.use.user();
    const firstName = user?.firstName ?? 'there';

    return (
        <View style={S.container}>
            <ScrollView
                contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Welcome Header ── */}
                <Animated.View entering={FadeInUp.duration(600)}>
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[S.welcomeCard, { paddingTop: insets.top + 16 }]}
                    >
                        <View style={S.welcomeHeader}>
                            <View style={S.welcomeTextWrap}>
                                <Text className="font-inter" style={S.greeting}>
                                    {getGreeting()},
                                </Text>
                                <Text className="font-inter" style={S.userName}>
                                    {firstName}
                                </Text>
                            </View>
                            <HamburgerButton onPress={toggle} />
                        </View>
                        <Text className="font-inter" style={S.dateText}>
                            {formatDate()}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                {/* ── Quick Stats ── */}
                <View style={S.sectionContainer}>
                    <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                        <Text className="font-inter" style={S.sectionTitle}>Overview</Text>
                    </Animated.View>
                    <View style={S.statsRow}>
                        {QUICK_STATS.map((stat, i) => (
                            <QuickStatCard key={stat.label} stat={stat} index={i} />
                        ))}
                    </View>
                </View>

                {/* ── Action Grid ── */}
                <View style={S.sectionContainer}>
                    <Animated.View entering={FadeInDown.delay(350).duration(500)}>
                        <Text className="font-inter" style={S.sectionTitle}>Quick Actions</Text>
                    </Animated.View>
                    <View style={S.actionGrid}>
                        {ACTION_CARDS.map((action, i) => (
                            <ActionGridCard key={action.id} action={action} index={i} />
                        ))}
                    </View>
                </View>

                {/* ── Upcoming Holidays ── */}
                <View style={S.sectionContainer}>
                    <Animated.View entering={FadeInDown.delay(650).duration(500)}>
                        <Text className="font-inter" style={S.sectionTitle}>Upcoming Holidays</Text>
                    </Animated.View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={S.holidayScroll}
                    >
                        {UPCOMING_HOLIDAYS.map((holiday, i) => (
                            <HolidayCard key={holiday.id} holiday={holiday} index={i} />
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

// ============ STYLES ============

const S = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    scrollContent: {
        flexGrow: 1,
    },

    // Welcome Card
    welcomeCard: {
        paddingHorizontal: 24,
        paddingBottom: 28,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    welcomeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    welcomeTextWrap: {
        flex: 1,
    },
    greeting: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    userName: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: '700',
        marginTop: 2,
    },
    dateText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 8,
        fontWeight: '500',
    },

    // Section
    sectionContainer: {
        paddingHorizontal: 24,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 14,
    },

    // Quick Stats
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.neutral[900],
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.neutral[500],
        marginTop: 2,
        textAlign: 'center',
    },
    statSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.neutral[400],
        marginTop: 1,
        textAlign: 'center',
    },

    // Action Grid
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
    },
    actionGradient: {
        padding: 18,
        minHeight: 120,
        justifyContent: 'flex-end',
    },
    actionIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    actionSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },

    // Holidays
    holidayScroll: {
        gap: 12,
        paddingRight: 24,
    },
    holidayCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        width: 180,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    holidayDateBadge: {
        backgroundColor: colors.primary[50],
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    holidayDateText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary[600],
    },
    holidayInfo: {
        flex: 1,
    },
    holidayName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral[800],
    },
    holidayDay: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.neutral[400],
        marginTop: 2,
    },
});
