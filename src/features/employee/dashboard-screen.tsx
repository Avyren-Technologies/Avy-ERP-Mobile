/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    PanResponder,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
    Circle,
    Defs,
    Line,
    LinearGradient as SvgLinearGradient,
    Path,
    Rect,
    Stop,
    Text as SvgText,
} from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess, showErrorMessage } from '@/components/ui/utils';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useDashboard, essKeys } from '@/features/company-admin/api/use-ess-queries';
import { checkPermission } from '@/lib/api/auth';
import { client } from '@/lib/api/client';
import type {
    DashboardAnnouncement,
    DashboardAttendanceDay,
    DashboardData,
    DashboardHoliday,
    DashboardLeaveBalanceItem,
    DashboardLeaveDonutItem,
    DashboardMonthlyTrendItem,
    DashboardPendingApproval,
    DashboardShiftCalendarDay,
    DashboardShiftInfo,
    DashboardTeamSummary,
    DashboardWeeklyChartDay,
} from '@/lib/api/ess';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_H = 64;
const THUMB_SIZE = 52;
const TRACK_W = SCREEN_WIDTH - 64;
const MAX_SLIDE = TRACK_W - THUMB_SIZE - 8;

// ================================================================
// Helpers
// ================================================================

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

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseWorkedHours(value: unknown): number | null {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const n = parseFloat(value.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function formatTimeShort(iso: string | null | undefined): string {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const DEFAULT_DASHBOARD_STATS: DashboardData['stats'] = {
    leaveBalanceTotal: 0,
    attendancePercentage: 0,
    presentDays: 0,
    workingDays: 0,
    pendingApprovalsCount: 0,
    goals: { activeCount: 0, avgCompletion: 0 },
};

function normalizeDashboardData(data: DashboardData): DashboardData {
    return {
        announcements: data.announcements ?? [],
        shift: data.shift ?? null,
        stats: {
            ...DEFAULT_DASHBOARD_STATS,
            ...(data.stats ?? {}),
            goals: {
                ...DEFAULT_DASHBOARD_STATS.goals,
                ...(data.stats?.goals ?? {}),
            },
        },
        leaveBalances: data.leaveBalances ?? [],
        recentAttendance: data.recentAttendance ?? [],
        teamSummary: data.teamSummary ?? null,
        pendingApprovals: data.pendingApprovals ?? [],
        upcomingHolidays: data.upcomingHolidays ?? [],
        shiftCalendar: data.shiftCalendar ?? null,
        weeklyChart: data.weeklyChart ?? null,
        leaveDonut: data.leaveDonut ?? null,
        monthlyTrend: data.monthlyTrend ?? null,
    };
}

// ================================================================
// Leave Bar Colors
// ================================================================

const LEAVE_COLORS = [
    colors.primary[500],
    colors.success[500],
    colors.accent[500],
    colors.warning[500],
    colors.info[500],
    colors.danger[500],
];

// ================================================================
// Chart Colors
// ================================================================

const CHART_COLORS = {
    present: '#10B981',
    absent: '#EF4444',
    holiday: '#3B82F6',
    weekoff: '#94A3B8',
    halfDay: '#F59E0B',
    late: '#D97706',
};

function getBarColor(status: string, isHoliday: boolean, isWeekOff: boolean): string {
    if (isHoliday) return CHART_COLORS.holiday;
    if (isWeekOff) return CHART_COLORS.weekoff;
    const lower = status.toLowerCase();
    if (lower === 'present') return CHART_COLORS.present;
    if (lower === 'absent') return CHART_COLORS.absent;
    if (lower.includes('half')) return CHART_COLORS.halfDay;
    if (lower === 'late') return CHART_COLORS.late;
    return CHART_COLORS.present;
}

const DONUT_COLORS: Record<string, string> = {
    PAID: '#6366F1',
    UNPAID: '#F59E0B',
    COMPENSATORY: '#8B5CF6',
    STATUTORY: '#10B981',
    EARNED: '#3B82F6',
    CASUAL: '#14B8A6',
    SICK: '#EF4444',
};

function getDonutColor(category: string, fallback: string): string {
    return DONUT_COLORS[category.toUpperCase()] ?? fallback;
}

// ================================================================
// Icon Components
// ================================================================

const svgProps = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ClockIcon = ({ s = 20, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>
);
const CheckIcon = ({ s = 20, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" /></Svg>
);
const ArrowIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"><Path d="M13 5l7 7-7 7" /><Path d="M6 12h14" /></Svg>
);
const TimerIcon = ({ s = 16, c = colors.success[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="13" r="8" /><Path d="M12 9v4l2 2" /><Path d="M5 3L2 6" /><Path d="M22 6l-3-3" /><Line x1="12" y1="1" x2="12" y2="3" /></Svg>
);
const MegaphoneIcon = ({ s = 16, c = colors.accent[500] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M3 11l18-5v12L3 13v-2z" /><Path d="M11.6 16.8a3 3 0 11-5.8-1.6" /></Svg>
);
const CalendarIcon = ({ s = 20, c = colors.primary[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Rect x="3" y="4" width="18" height="18" rx="2" /><Path d="M16 2v4M8 2v4M3 10h18" /></Svg>
);
const TargetIcon = ({ s = 20, c = colors.accent[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="12" r="10" /><Circle cx="12" cy="12" r="6" /><Circle cx="12" cy="12" r="2" /></Svg>
);
const CheckSquareIcon = ({ s = 20, c = colors.warning[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Rect x="3" y="3" width="18" height="18" rx="2" /><Path d="M9 12l2 2 4-4" /></Svg>
);
const SendIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 2L11 13" /><Path d="M22 2l-7 20-4-9-9-4z" /></Svg>
);
const FileTextIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></Svg>
);
const EyeIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" /></Svg>
);
const UserIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="8" r="4" /><Path d="M20 21a8 8 0 10-16 0" /></Svg>
);
const UsersIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></Svg>
);
const ClipboardCheckIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Rect x="4" y="2" width="16" height="20" rx="2" /><Path d="M9 12l2 2 4-4M9 2v2M15 2v2" /></Svg>
);
const GraduationCapIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 10L12 5 2 10l10 5 10-5z" /><Path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" /><Line x1="22" y1="10" x2="22" y2="16" /></Svg>
);
const LandmarkIcon = ({ s = 22, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M3 22h18M6 18V7M10 18V7M14 18V7M18 18V7M2 22h20M12 2l10 5H2l10-5z" /></Svg>
);
const UserCheckIcon = ({ s = 16, c = colors.success[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Path d="M17 11l2 2 4-4" /></Svg>
);
const UserXIcon = ({ s = 16, c = colors.danger[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Line x1="18" y1="8" x2="23" y2="13" /><Line x1="23" y1="8" x2="18" y2="13" /></Svg>
);
const UserMinusIcon = ({ s = 16, c = colors.info[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Line x1="23" y1="11" x2="17" y2="11" /></Svg>
);
const UserCogIcon = ({ s = 16, c = colors.neutral[500] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Circle cx="20" cy="11" r="2" /></Svg>
);
const CoffeeIcon = ({ s = 14, c = 'rgba(255,255,255,0.7)' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v2M10 2v2M14 2v2" /></Svg>
);
const TrendUpIcon = ({ s = 12, c = colors.success[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M23 6l-9.5 9.5-5-5L1 18" /><Path d="M17 6h6v6" /></Svg>
);
const TrendDownIcon = ({ s = 12, c = colors.danger[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M23 18l-9.5-9.5-5 5L1 6" /><Path d="M17 18h6v-6" /></Svg>
);
const MapPinIcon = ({ s = 14, c = 'rgba(255,255,255,0.5)' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>
);
const ChevronRightIcon = ({ s = 16, c = colors.neutral[300] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M9 18l6-6-6-6" /></Svg>
);

// ================================================================
// Quick Action Definitions
// ================================================================

interface QuickActionDef {
    id: string;
    title: string;
    subtitle: string;
    iconComponent: (props: { s?: number; c?: string }) => React.ReactElement;
    gradient: readonly [string, string];
    borderGradient: readonly [string, string];
    route: string;
    permission?: string;
}

const ALL_QUICK_ACTIONS: QuickActionDef[] = [
    { id: 'apply-leave', title: 'Apply Leave', subtitle: 'Submit a leave request', iconComponent: SendIcon, gradient: [colors.primary[500], colors.primary[700]], borderGradient: [colors.primary[500], colors.primary[600]], route: '/company/hr/my-leave', permission: 'ess:apply-leave' },
    { id: 'payslips', title: 'My Payslips', subtitle: 'View salary slips', iconComponent: FileTextIcon, gradient: [colors.success[500], colors.success[700]], borderGradient: [colors.success[500], colors.success[600]], route: '/company/hr/my-payslips', permission: 'ess:view-payslips' },
    { id: 'attendance', title: 'My Attendance', subtitle: 'View attendance log', iconComponent: EyeIcon, gradient: [colors.info[500], colors.info[700]], borderGradient: [colors.info[500], colors.info[600]], route: '/company/hr/my-attendance', permission: 'ess:view-attendance' },
    { id: 'profile', title: 'My Profile', subtitle: 'Update your details', iconComponent: UserIcon, gradient: [colors.warning[500], colors.warning[700]], borderGradient: [colors.warning[500], colors.warning[600]], route: '/company/hr/my-profile', permission: 'ess:view-profile' },
    { id: 'team-view', title: 'Team View', subtitle: 'Manage your team', iconComponent: UsersIcon, gradient: [colors.accent[500], colors.accent[700]], borderGradient: [colors.accent[500], colors.accent[600]], route: '/company/hr/team-view', permission: 'hr:approve' },
    { id: 'approvals', title: 'Approvals', subtitle: 'Pending requests', iconComponent: ClipboardCheckIcon, gradient: [colors.danger[500], colors.danger[700]], borderGradient: [colors.danger[500], colors.danger[600]], route: '/company/hr/approval-requests', permission: 'hr:approve' },
    { id: 'it-declaration', title: 'IT Declaration', subtitle: 'Tax declarations', iconComponent: LandmarkIcon, gradient: [colors.primary[400], colors.accent[500]], borderGradient: [colors.primary[400], colors.accent[500]], route: '/company/hr/it-declarations', permission: 'ess:it-declaration' },
    { id: 'goals', title: 'My Goals', subtitle: 'Track your goals', iconComponent: TargetIcon, gradient: [colors.success[400], colors.success[600]], borderGradient: [colors.success[400], colors.success[600]], route: '/company/hr/my-goals', permission: 'ess:view-goals' },
    { id: 'training', title: 'My Training', subtitle: 'Enroll in programs', iconComponent: GraduationCapIcon, gradient: [colors.info[400], colors.info[600]], borderGradient: [colors.info[400], colors.info[600]], route: '/company/hr/my-training', permission: 'ess:enroll-training' },
];

// ================================================================
// Premium Card Shell
// ================================================================

function PremiumCard({
    children,
    gradientAccentColors,
    style,
}: {
    children: React.ReactNode;
    gradientAccentColors?: readonly [string, string];
    style?: object;
}) {
    return (
        <View style={[S.premiumCard, style]}>
            {gradientAccentColors && (
                <LinearGradient
                    colors={gradientAccentColors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={S.premiumCardAccent}
                />
            )}
            <View style={S.premiumCardContent}>
                {children}
            </View>
        </View>
    );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <View style={S.cardHeaderRow}>
            <View>
                <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{title}</Text>
                {subtitle ? <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[400], marginTop: 1 }}>{subtitle}</Text> : null}
            </View>
            {action}
        </View>
    );
}

// ================================================================
// Status Badges
// ================================================================

function AttStatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
        NOT_CHECKED_IN: { bg: 'rgba(255,255,255,0.15)', fg: 'rgba(255,255,255,0.8)', label: 'Not Checked In' },
        CHECKED_IN: { bg: 'rgba(16,185,129,0.2)', fg: '#6EE7B7', label: 'Checked In' },
        CHECKED_OUT: { bg: 'rgba(255,255,255,0.1)', fg: 'rgba(255,255,255,0.7)', label: 'Checked Out' },
        NOT_LINKED: { bg: 'rgba(245,158,11,0.2)', fg: '#FCD34D', label: 'Not Linked' },
    };
    const c = map[status] ?? map.NOT_CHECKED_IN;
    return (
        <View style={[S.heroBadge, { backgroundColor: c.bg }]}>
            {status === 'CHECKED_IN' && (
                <View style={S.pulsingDot}>
                    <View style={[S.pulsingDotInner, { backgroundColor: '#6EE7B7' }]} />
                </View>
            )}
            <Text className="font-inter text-xs font-bold" style={{ color: c.fg }}>{c.label}</Text>
        </View>
    );
}

function AttendanceStatusBadge({ status }: { status: string }) {
    const lower = status.toLowerCase();
    let bg = colors.neutral[100];
    let fg = colors.neutral[600];
    if (lower === 'present') { bg = colors.success[50]; fg = colors.success[700]; }
    else if (lower === 'half day') { bg = colors.warning[50]; fg = colors.warning[700]; }
    else if (lower === 'absent') { bg = colors.danger[50]; fg = colors.danger[700]; }
    else if (lower === 'on leave' || lower === 'leave') { bg = colors.info[50]; fg = colors.info[700]; }
    else if (lower === 'holiday' || lower === 'week off') { bg = colors.accent[50]; fg = colors.accent[700]; }
    return (
        <View style={[S.smallBadge, { backgroundColor: bg }]}>
            <Text className="font-inter" style={[S.smallBadgeText, { color: fg }]}>{status}</Text>
        </View>
    );
}

function HolidayTypeBadge({ type }: { type: string }) {
    const lower = type.toLowerCase();
    let bg = colors.accent[50];
    let fg = colors.accent[700];
    if (lower.includes('national') || lower === 'gazetted') { bg = colors.info[50]; fg = colors.info[700]; }
    else if (lower.includes('company') || lower === 'restricted') { bg = colors.primary[50]; fg = colors.primary[700]; }
    else if (lower.includes('optional')) { bg = colors.neutral[100]; fg = colors.neutral[600]; }
    return (
        <View style={[S.smallBadge, { backgroundColor: bg }]}>
            <Text className="font-inter" style={[S.smallBadgeText, { color: fg }]}>{type}</Text>
        </View>
    );
}

// ================================================================
// Slide-to-Action
// ================================================================

function SlideAction({
    mode,
    onComplete,
    loading,
}: {
    mode: 'checkin' | 'checkout' | 'done';
    onComplete: () => void;
    loading: boolean;
}) {
    const pan = React.useRef(new Animated.Value(0)).current;
    const completedRef = React.useRef(false);

    React.useEffect(() => {
        pan.setValue(0);
        completedRef.current = false;
    }, [mode, pan]);

    const responder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
            onPanResponderGrant: () => { completedRef.current = false; },
            onPanResponderMove: (_, gs) => {
                if (completedRef.current) return;
                const x = Math.max(0, Math.min(gs.dx, MAX_SLIDE));
                pan.setValue(x);
            },
            onPanResponderRelease: (_, gs) => {
                if (completedRef.current) return;
                const x = Math.max(0, Math.min(gs.dx, MAX_SLIDE));
                if (x / MAX_SLIDE >= 0.75) {
                    completedRef.current = true;
                    Animated.spring(pan, { toValue: MAX_SLIDE, useNativeDriver: true, friction: 6 }).start(() => {
                        onComplete();
                        setTimeout(() => {
                            pan.setValue(0);
                            completedRef.current = false;
                        }, 800);
                    });
                } else {
                    Animated.spring(pan, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
                }
            },
        }),
    ).current;

    const isDone = mode === 'done';
    const isCheckIn = mode === 'checkin';
    const trackColor = isDone ? 'rgba(255,255,255,0.1)' : isCheckIn ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)';
    const label = isDone ? 'Shift Complete' : loading ? 'Processing...' : isCheckIn ? 'Slide to Check In' : 'Slide to Check Out';

    return (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
            <View style={[S.track, { backgroundColor: trackColor, width: TRACK_W, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Text className="font-inter text-sm font-semibold" style={S.trackLabel}>{label}</Text>
                {!isDone && (
                    <Animated.View
                        {...responder.panHandlers}
                        style={[S.thumb, { transform: [{ translateX: pan }] }]}
                    >
                        {loading ? (
                            <ClockIcon s={20} c={colors.primary[600]} />
                        ) : isCheckIn ? (
                            <ArrowIcon s={20} c={colors.success[600]} />
                        ) : (
                            <ArrowIcon s={20} c={colors.danger[600]} />
                        )}
                    </Animated.View>
                )}
                {isDone && (
                    <View style={[S.thumb, { position: 'absolute', left: MAX_SLIDE / 2 }]}>
                        <CheckIcon s={20} c={colors.neutral[500]} />
                    </View>
                )}
            </View>
        </View>
    );
}

// ================================================================
// SECTION 1: Welcome Header + Announcements
// ================================================================

function WelcomeHeader({ firstName }: { firstName: string }) {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    return (
        <AnimatedRN.View entering={FadeInUp.duration(600)}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[S.welcomeCard, { paddingTop: insets.top + 16 }]}
            >
                <View style={S.welcomeHeaderRow}>
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
        </AnimatedRN.View>
    );
}

function AnnouncementsBanner({ announcements }: { announcements: DashboardAnnouncement[] }) {
    const scrollRef = React.useRef<ScrollView>(null);
    const [currentIdx, setCurrentIdx] = React.useState(0);
    const { width } = useWindowDimensions();
    const cardWidth = width - 48;

    React.useEffect(() => {
        if (announcements.length <= 1) return;
        const id = setInterval(() => {
            setCurrentIdx((prev) => {
                const next = (prev + 1) % announcements.length;
                scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
                return next;
            });
        }, 5000);
        return () => clearInterval(id);
    }, [announcements.length, cardWidth]);

    const priorityBorder = (p: DashboardAnnouncement['priority']) => {
        if (p === 'URGENT') return colors.danger[500];
        if (p === 'HIGH') return colors.warning[500];
        return colors.neutral[100];
    };

    if (announcements.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(100).duration(400)} style={[S.sectionContainer, { marginTop: 20 }]}>
                <PremiumCard>
                    <View style={S.announcementHeader}>
                        <View style={S.announcementIconWrap}>
                            <MegaphoneIcon s={12} c="#fff" />
                        </View>
                        <Text className="font-inter" style={S.sectionLabel}>ANNOUNCEMENTS</Text>
                    </View>
                    <Text className="font-inter" style={S.emptyText}>No recent announcements.</Text>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(100).duration(400)} style={[S.sectionContainer, { marginTop: 20 }]}>
            <View style={[S.premiumCard, { borderColor: priorityBorder(announcements[currentIdx]?.priority ?? 'LOW') }]}>
                <View style={S.premiumCardContent}>
                    <View style={S.announcementHeader}>
                        <View style={S.announcementIconWrap}>
                            <MegaphoneIcon s={12} c="#fff" />
                        </View>
                        <Text className="font-inter" style={S.sectionLabel}>ANNOUNCEMENTS</Text>
                        {announcements[currentIdx]?.priority === 'URGENT' && (
                            <View style={{ backgroundColor: colors.danger[500], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
                                <Text className="font-inter text-xs font-bold" style={{ color: '#fff', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>Urgent</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                            setCurrentIdx(idx);
                        }}
                    >
                        {announcements.map((a) => (
                            <View key={a.id} style={{ width: cardWidth - 40 }}>
                                <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{a.title}</Text>
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[500], marginTop: 4 }} numberOfLines={2}>{a.body}</Text>
                            </View>
                        ))}
                    </ScrollView>
                    {announcements.length > 1 && (
                        <View style={S.dotsRow}>
                            {announcements.map((_, i) => (
                                <View key={i} style={[S.dot, { backgroundColor: i === currentIdx ? colors.primary[500] : colors.neutral[200], width: i === currentIdx ? 16 : 7 }]} />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 2: Shift Check-In Hero (Glassmorphic Mesh Gradient)
// ================================================================

function ShiftCheckInHero({ shift }: { shift: DashboardShiftInfo | null }) {
    const queryClient = useQueryClient();

    // Live clock
    const [clockStr, setClockStr] = React.useState(() =>
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    );
    React.useEffect(() => {
        const id = setInterval(() => {
            setClockStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // GPS
    const [geo, setGeo] = React.useState<{ lat: number; lng: number } | null>(null);
    const geoFetched = React.useRef(false);
    React.useEffect(() => {
        if (geoFetched.current) return;
        geoFetched.current = true;
        (async () => {
            try {
                const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
                if (permStatus !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setGeo({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            } catch {
                // GPS is optional
            }
        })();
    }, []);

    // Elapsed timer
    const status = shift?.status ?? 'NOT_CHECKED_IN';
    const startRef = React.useRef(Date.now());
    const baseRef = React.useRef(shift?.elapsedSeconds ?? 0);
    const [elapsed, setElapsed] = React.useState(shift?.elapsedSeconds ?? 0);

    React.useEffect(() => {
        baseRef.current = shift?.elapsedSeconds ?? 0;
        startRef.current = Date.now();
    }, [shift?.elapsedSeconds]);

    React.useEffect(() => {
        if (status !== 'CHECKED_IN' || !shift?.punchIn) return;
        startRef.current = Date.now();
        baseRef.current = shift.elapsedSeconds ?? 0;
        const id = setInterval(() => {
            setElapsed(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [status, shift?.punchIn, shift?.elapsedSeconds]);

    // Mutations
    const checkInMut = useMutation({
        mutationFn: async () => {
            const body: Record<string, number> = {};
            if (geo) { body.latitude = geo.lat; body.longitude = geo.lng; }
            return (await client.post('/hr/attendance/check-in', body) as any).data;
        },
        onSuccess: () => {
            showSuccess('Checked In', 'Attendance recorded successfully');
            queryClient.invalidateQueries({ queryKey: ['attendance', 'my-status'] });
            queryClient.invalidateQueries({ queryKey: essKeys.dashboard() });
        },
        onError: () => showErrorMessage('Failed to check in. Please try again.'),
    });

    const checkOutMut = useMutation({
        mutationFn: async () => {
            const body: Record<string, number> = {};
            if (geo) { body.latitude = geo.lat; body.longitude = geo.lng; }
            return (await client.post('/hr/attendance/check-out', body) as any).data;
        },
        onSuccess: () => {
            showSuccess('Checked Out', 'Have a great day!');
            queryClient.invalidateQueries({ queryKey: ['attendance', 'my-status'] });
            queryClient.invalidateQueries({ queryKey: essKeys.dashboard() });
        },
        onError: () => showErrorMessage('Failed to check out. Please try again.'),
    });

    const isBusy = checkInMut.isPending || checkOutMut.isPending;
    const isCheckedIn = status === 'CHECKED_IN';
    const isCheckedOut = status === 'CHECKED_OUT';
    const workedHrs = parseWorkedHours(shift?.workedHours);

    const slideMode = isCheckedOut ? 'done' : isCheckedIn ? 'checkout' : 'checkin';

    const handleSlideComplete = React.useCallback(() => {
        if (slideMode === 'checkin') checkInMut.mutate();
        else if (slideMode === 'checkout') checkOutMut.mutate();
    }, [slideMode, checkInMut, checkOutMut]);

    return (
        <AnimatedRN.View entering={FadeInDown.delay(200).duration(500)} style={S.sectionContainer}>
            <View style={S.shiftCard}>
                <LinearGradient
                    colors={[colors.primary[600], colors.accent[600], colors.primary[800]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={S.shiftGradient}
                >
                    {/* Shift name + time */}
                    <Text className="font-inter text-lg font-bold" style={{ color: '#FFFFFF', letterSpacing: 0.5 }}>
                        {shift ? shift.shiftName : 'No shift assigned'}
                    </Text>
                    {shift ? (
                        <View style={{ marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                <ClockIcon s={14} c="rgba(255,255,255,0.7)" />
                                <Text className="font-inter text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>
                                    {shift.startTime} -- {shift.endTime}
                                </Text>
                            </View>
                            {shift.locationName && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                                    <MapPinIcon s={12} />
                                    <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{shift.locationName}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Contact your HR to assign a shift</Text>
                    )}

                    {/* Live clock */}
                    <Text className="font-inter" style={S.shiftClock}>{clockStr}</Text>

                    {/* Status badge */}
                    <View style={{ marginTop: 8 }}>
                        <AttStatusBadge status={status} />
                    </View>

                    {/* Elapsed timer when checked in */}
                    {isCheckedIn && (
                        <View style={S.elapsedBox}>
                            <TimerIcon s={15} c="#FFFFFF" />
                            <Text className="font-inter text-xl font-bold" style={{ color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{formatDuration(elapsed)}</Text>
                            <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>elapsed</Text>
                        </View>
                    )}

                    {/* Checked out: show worked hours */}
                    {isCheckedOut && workedHrs != null && (
                        <View style={S.workedBox}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
                                <CheckIcon s={24} c="#6EE7B7" />
                            </View>
                            <Text className="font-inter text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>
                                Shift Complete
                            </Text>
                            <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {workedHrs.toFixed(1)} hrs worked
                            </Text>
                        </View>
                    )}

                    {/* Slide action */}
                    <SlideAction mode={slideMode} onComplete={handleSlideComplete} loading={isBusy} />

                    {/* Break schedule pills */}
                    {shift && shift.status !== 'NOT_LINKED' && (
                        <View style={S.breaksRow}>
                            <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Breaks</Text>
                            <View style={S.breakPill}>
                                <CoffeeIcon s={11} />
                                <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Lunch 12:30 - 1:00</Text>
                            </View>
                            <View style={S.breakPill}>
                                <CoffeeIcon s={11} />
                                <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Tea 3:30 - 3:45</Text>
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </View>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 3: Shift Calendar (14-day strip)
// ================================================================

function shiftTypeColor(shiftType: string | null): string {
    if (!shiftType) return colors.neutral[400];
    const t = shiftType.toUpperCase();
    if (t === 'DAY' || t === 'GENERAL' || t === 'MORNING') return colors.info[500];
    if (t === 'NIGHT' || t === 'EVENING') return colors.primary[700];
    if (t === 'FLEXIBLE' || t === 'ROTATIONAL') return colors.accent[500];
    return colors.primary[500];
}

function ShiftCalendarStrip({ calendar }: { calendar: DashboardShiftCalendarDay[] | null }) {
    const flatListRef = React.useRef<FlatList>(null);

    // Auto-scroll to today on mount
    React.useEffect(() => {
        if (!calendar || calendar.length === 0) return;
        const todayIdx = calendar.findIndex((d) => d.isToday);
        if (todayIdx < 0) return;
        // Small delay to let layout complete
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: Math.max(0, todayIdx - 1), animated: true, viewOffset: 20 });
        }, 300);
    }, [calendar]);

    if (!calendar || calendar.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(300).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.primary[500], colors.info[500]]}>
                    <CardHeader title="Shift Calendar" subtitle="14-day view" />
                    <Text className="font-inter" style={S.emptyText}>No shift schedule available.</Text>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    const renderItem = ({ item: day }: { item: DashboardShiftCalendarDay }) => {
        const isToday = day.isToday;
        const isHoliday = day.isHoliday;
        const isWeekOff = day.isWeekOff;
        const dateNum = new Date(day.date).getDate();

        return (
            <View
                style={[
                    S.calendarDayCard,
                    isToday && S.calendarDayToday,
                    isHoliday && !isToday && S.calendarDayHoliday,
                    isWeekOff && !isToday && !isHoliday && S.calendarDayWeekOff,
                ]}
            >
                <Text className="font-inter" style={{
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: isToday ? colors.primary[600] : colors.neutral[400],
                }}>{day.dayName}</Text>

                <Text className="font-inter" style={{
                    fontSize: 20,
                    fontWeight: '700',
                    marginTop: 2,
                    color: isToday ? colors.primary[700] : colors.primary[950],
                }}>{dateNum}</Text>

                {isToday && (
                    <Text className="font-inter" style={{
                        fontSize: 8,
                        fontWeight: '700',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: colors.primary[500],
                        marginTop: 1,
                    }}>TODAY</Text>
                )}

                {isHoliday ? (
                    <Text className="font-inter" style={{
                        fontSize: 9,
                        fontWeight: '700',
                        color: colors.warning[600],
                        marginTop: 4,
                        textAlign: 'center',
                    }} numberOfLines={2}>{day.holidayName ?? 'Holiday'}</Text>
                ) : isWeekOff ? (
                    <Text className="font-inter" style={{
                        fontSize: 9,
                        fontWeight: '500',
                        color: colors.neutral[400],
                        marginTop: 4,
                    }}>Week Off</Text>
                ) : day.shiftName ? (
                    <View style={{ marginTop: 4, alignItems: 'center', gap: 2 }}>
                        <View style={{ height: 3, width: '100%', borderRadius: 2, backgroundColor: shiftTypeColor(day.shiftType) }} />
                        <Text className="font-inter" style={{ fontSize: 9, fontWeight: '500', color: colors.neutral[500] }} numberOfLines={1}>{day.shiftName}</Text>
                        {day.startTime && day.endTime && (
                            <Text className="font-inter" style={{ fontSize: 8, color: colors.neutral[400], fontVariant: ['tabular-nums'] }}>
                                {day.startTime} - {day.endTime}
                            </Text>
                        )}
                    </View>
                ) : (
                    <Text className="font-inter" style={{ fontSize: 9, color: colors.neutral[400], marginTop: 4 }}>--</Text>
                )}
            </View>
        );
    };

    return (
        <AnimatedRN.View entering={FadeInDown.delay(300).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.info[500]]}>
                <CardHeader title="Shift Calendar" subtitle="14-day view" />
                <FlatList
                    ref={flatListRef}
                    data={calendar}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.date}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                    onScrollToIndexFailed={() => {}}
                />
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 4: Quick Stats (2x2 grid)
// ================================================================

function QuickStatsRow({ data }: { data: DashboardData }) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 48 - 12) / 2;
    const stats = data.stats;

    // Compute attendance trend from monthlyTrend
    const attendanceTrend = React.useMemo(() => {
        if (!data.monthlyTrend || data.monthlyTrend.length < 2) return null;
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const sorted = [...data.monthlyTrend].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
        });
        const latest = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        if (!latest || !prev) return null;
        const diff = latest.attendancePercentage - prev.attendancePercentage;
        if (diff === 0) return null;
        return { direction: diff > 0 ? ('up' as const) : ('down' as const), value: `${Math.abs(diff).toFixed(1)}%` };
    }, [data.monthlyTrend]);

    const items = [
        {
            label: 'Leave Balance',
            value: stats.leaveBalanceTotal.toString(),
            subtitle: 'Remaining days',
            icon: <CalendarIcon s={18} c={colors.primary[600]} />,
            bg: colors.primary[50],
            gradientColors: [colors.primary[50], '#FFFFFF'] as readonly [string, string],
            trend: null as { direction: 'up' | 'down'; value: string } | null,
        },
        {
            label: 'Attendance',
            value: `${stats.attendancePercentage}%`,
            subtitle: `${stats.presentDays}/${stats.workingDays} days`,
            icon: <ClockIcon s={18} c={colors.success[600]} />,
            bg: colors.success[50],
            gradientColors: [colors.success[50], '#FFFFFF'] as readonly [string, string],
            trend: attendanceTrend,
        },
        {
            label: 'Pending Approvals',
            value: stats.pendingApprovalsCount.toString(),
            subtitle: stats.pendingApprovalsCount > 0 ? 'Awaiting action' : 'All caught up',
            icon: <CheckSquareIcon s={18} c={stats.pendingApprovalsCount > 0 ? colors.warning[600] : colors.neutral[400]} />,
            bg: stats.pendingApprovalsCount > 0 ? colors.warning[50] : colors.neutral[100],
            gradientColors: (stats.pendingApprovalsCount > 0 ? [colors.warning[50], '#FFFFFF'] : [colors.neutral[100], '#FFFFFF']) as readonly [string, string],
            trend: null as { direction: 'up' | 'down'; value: string } | null,
        },
        {
            label: 'Active Goals',
            value: stats.goals.activeCount.toString(),
            subtitle: `Avg ${stats.goals.avgCompletion}% done`,
            icon: <TargetIcon s={18} c={colors.accent[600]} />,
            bg: colors.accent[50],
            gradientColors: [colors.accent[50], '#FFFFFF'] as readonly [string, string],
            trend: null as { direction: 'up' | 'down'; value: string } | null,
        },
    ];

    return (
        <View style={S.sectionContainer}>
            <AnimatedRN.View entering={FadeInDown.delay(350).duration(400)}>
                <Text className="font-inter" style={S.sectionTitle}>Overview</Text>
            </AnimatedRN.View>
            <View style={S.statsGrid}>
                {items.map((item, i) => (
                    <AnimatedRN.View key={item.label} entering={FadeInDown.delay(400 + i * 80).duration(400)} style={{ width: cardWidth }}>
                        <View style={S.statCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <View style={[S.statIconContainer, { backgroundColor: item.bg }]}>
                                    {item.icon}
                                </View>
                                {item.trend && (
                                    <View style={[S.trendBadge, { backgroundColor: item.trend.direction === 'up' ? colors.success[50] : colors.danger[50] }]}>
                                        {item.trend.direction === 'up' ? <TrendUpIcon /> : <TrendDownIcon />}
                                        <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: item.trend.direction === 'up' ? colors.success[600] : colors.danger[600] }}>{item.trend.value}</Text>
                                    </View>
                                )}
                            </View>
                            <Text className="font-inter" style={S.statValue}>{item.value}</Text>
                            <Text className="font-inter" style={S.statLabel}>{item.label}</Text>
                            <Text className="font-inter" style={S.statSubtitle}>{item.subtitle}</Text>
                        </View>
                    </AnimatedRN.View>
                ))}
            </View>
        </View>
    );
}

// ================================================================
// SECTION 5: Weekly Attendance Bar Chart (SVG)
// ================================================================

function WeeklyAttendanceChart({ weeklyChart }: { weeklyChart: DashboardWeeklyChartDay[] | null }) {
    const { width } = useWindowDimensions();
    const chartW = width - 96;
    const chartH = 180;
    const paddingLeft = 30;
    const paddingBottom = 24;
    const paddingTop = 8;
    const drawW = chartW - paddingLeft;
    const drawH = chartH - paddingBottom - paddingTop;
    const maxHours = 12;

    if (!weeklyChart || weeklyChart.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(500).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.success[500], colors.info[500]]}>
                    <CardHeader title="Weekly Attendance" subtitle="Hours worked per day" />
                    <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
                        <Text className="font-inter" style={S.emptyText}>No attendance data available.</Text>
                    </View>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    const barWidth = Math.min(24, (drawW / weeklyChart.length) * 0.6);
    const gap = drawW / weeklyChart.length;
    const yMarkers = [0, 4, 8, 12];

    return (
        <AnimatedRN.View entering={FadeInDown.delay(500).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.success[500], colors.info[500]]}>
                <CardHeader title="Weekly Attendance" subtitle="Hours worked per day" />
                <Svg width={chartW} height={chartH}>
                    {/* Y-axis grid lines and labels */}
                    {yMarkers.map((val) => {
                        const y = paddingTop + drawH - (val / maxHours) * drawH;
                        return (
                            <React.Fragment key={val}>
                                <Line x1={paddingLeft} y1={y} x2={chartW} y2={y} stroke={colors.neutral[100]} strokeWidth={1} strokeDasharray="3,3" />
                                <SvgText x={paddingLeft - 4} y={y + 4} fontSize={10} fill={colors.neutral[400]} textAnchor="end">{`${val}h`}</SvgText>
                            </React.Fragment>
                        );
                    })}
                    {/* Bars */}
                    {weeklyChart.map((day, i) => {
                        const x = paddingLeft + i * gap + (gap - barWidth) / 2;
                        const barH = Math.max(2, (day.hoursWorked / maxHours) * drawH);
                        const y = paddingTop + drawH - barH;
                        const fill = getBarColor(day.status, day.isHoliday, day.isWeekOff);
                        return (
                            <React.Fragment key={day.date}>
                                <Rect x={x} y={y} width={barWidth} height={barH} rx={4} ry={4} fill={fill} />
                                <SvgText
                                    x={paddingLeft + i * gap + gap / 2}
                                    y={chartH - 6}
                                    fontSize={10}
                                    fill={colors.neutral[400]}
                                    textAnchor="middle"
                                >
                                    {day.dayName.slice(0, 3)}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
                {/* Legend */}
                <View style={S.chartLegend}>
                    {[
                        { color: CHART_COLORS.present, label: 'Present' },
                        { color: CHART_COLORS.absent, label: 'Absent' },
                        { color: CHART_COLORS.holiday, label: 'Holiday' },
                        { color: CHART_COLORS.weekoff, label: 'Week Off' },
                    ].map((item) => (
                        <View key={item.label} style={S.legendItem}>
                            <View style={[S.legendDot, { backgroundColor: item.color }]} />
                            <Text className="font-inter" style={S.legendText}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 6: Leave Donut Chart (SVG)
// ================================================================

function LeaveDonutChart({ leaveDonut }: { leaveDonut: DashboardLeaveDonutItem[] | null }) {
    if (!leaveDonut || leaveDonut.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(550).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.accent[500], colors.primary[500]]}>
                    <CardHeader title="Leave Balance" subtitle="Category breakdown" />
                    <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
                        <Text className="font-inter" style={S.emptyText}>No leave data available.</Text>
                    </View>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    const totalRemaining = leaveDonut.reduce((sum, d) => sum + d.remaining, 0);
    const total = leaveDonut.reduce((sum, d) => sum + d.remaining, 0);
    const size = 160;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;

    // Build segments
    let accumulatedOffset = 0;
    const segments = leaveDonut.map((d) => {
        const segmentLength = total > 0 ? (d.remaining / total) * circumference : 0;
        const offset = accumulatedOffset;
        accumulatedOffset += segmentLength;
        return {
            ...d,
            fill: getDonutColor(d.category, d.color),
            segmentLength,
            offset,
        };
    });

    return (
        <AnimatedRN.View entering={FadeInDown.delay(550).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.accent[500], colors.primary[500]]}>
                <CardHeader title="Leave Balance" subtitle="Category breakdown" />
                <View style={{ alignItems: 'center' }}>
                    <View style={{ width: size, height: size, position: 'relative' }}>
                        <Svg width={size} height={size}>
                            {/* Background circle */}
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="none"
                                stroke={colors.neutral[100]}
                                strokeWidth={strokeWidth}
                            />
                            {/* Segments */}
                            {segments.map((seg) => (
                                <Circle
                                    key={seg.category}
                                    cx={cx}
                                    cy={cy}
                                    r={radius}
                                    fill="none"
                                    stroke={seg.fill}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${seg.segmentLength} ${circumference - seg.segmentLength}`}
                                    strokeDashoffset={-seg.offset}
                                    strokeLinecap="round"
                                    transform={`rotate(-90, ${cx}, ${cy})`}
                                />
                            ))}
                        </Svg>
                        {/* Center text */}
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                            <Text className="font-inter text-2xl font-bold" style={{ color: colors.primary[950], fontVariant: ['tabular-nums'] }}>{totalRemaining}</Text>
                            <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[400], fontWeight: '500' }}>days left</Text>
                        </View>
                    </View>
                </View>
                {/* Legend */}
                <View style={S.donutLegendGrid}>
                    {segments.map((seg) => (
                        <View key={seg.category} style={S.donutLegendItem}>
                            <View style={[S.legendDot, { backgroundColor: seg.fill }]} />
                            <Text className="font-inter" style={{ fontSize: 10, fontWeight: '500', color: colors.neutral[500], flex: 1 }} numberOfLines={1}>{seg.category}</Text>
                            <Text className="font-inter" style={{ fontSize: 10, fontWeight: '700', color: colors.primary[950], fontVariant: ['tabular-nums'] }}>{seg.used}/{seg.totalEntitled}</Text>
                        </View>
                    ))}
                </View>
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 7: Quick Actions (2-column grid with gradient left border)
// ================================================================

function QuickActionsGrid({ permissions }: { permissions: string[] }) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const cardWidth = (width - 48 - 12) / 2;

    const visibleActions = React.useMemo(() => {
        return ALL_QUICK_ACTIONS
            .filter((a) => !a.permission || checkPermission(permissions, a.permission))
            .slice(0, 6);
    }, [permissions]);

    if (visibleActions.length === 0) return null;

    return (
        <View style={S.sectionContainer}>
            <AnimatedRN.View entering={FadeInDown.delay(600).duration(400)}>
                <Text className="font-inter" style={S.sectionLabel}>QUICK ACTIONS</Text>
            </AnimatedRN.View>
            <View style={[S.actionGrid, { marginTop: 12 }]}>
                {visibleActions.map((action, i) => (
                    <AnimatedRN.View key={action.id} entering={FadeInDown.delay(650 + i * 60).duration(400)}>
                        <Pressable
                            style={({ pressed }) => [
                                S.quickActionCard,
                                { width: cardWidth, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                            ]}
                            onPress={() => router.push(action.route as any)}
                        >
                            {/* Gradient left border */}
                            <LinearGradient
                                colors={action.borderGradient as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={S.quickActionBorder}
                            />
                            <View style={S.quickActionInner}>
                                <LinearGradient
                                    colors={action.gradient as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={S.quickActionIconWrap}
                                >
                                    <action.iconComponent s={18} c="#FFFFFF" />
                                </LinearGradient>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{action.title}</Text>
                                    <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[400], marginTop: 1 }} numberOfLines={1}>{action.subtitle}</Text>
                                </View>
                                <ChevronRightIcon s={14} c={colors.neutral[300]} />
                            </View>
                        </Pressable>
                    </AnimatedRN.View>
                ))}
            </View>
        </View>
    );
}

// ================================================================
// SECTION 8: Leave Balance + Recent Attendance
// ================================================================

function LeaveBalanceSection({ balances }: { balances: DashboardLeaveBalanceItem[] }) {
    return (
        <AnimatedRN.View entering={FadeInDown.delay(700).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.accent[500]]}>
                <CardHeader title="Leave Balance" subtitle="Breakdown by type" />
                {balances.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No leave types configured.</Text>
                ) : (
                    <View style={{ gap: 14 }}>
                        {balances.map((lb, i) => {
                            const total = lb.allocated;
                            const used = lb.used;
                            const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
                            const color = lb.color ?? LEAVE_COLORS[i % LEAVE_COLORS.length];

                            return (
                                <View key={lb.leaveTypeName}>
                                    <View style={S.leaveRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[S.legendDot, { backgroundColor: color }]} />
                                            <Text className="font-inter text-sm font-medium" style={{ color: colors.primary[950] }}>{lb.leaveTypeName}</Text>
                                        </View>
                                        <Text className="font-inter text-xs font-bold" style={{ color: colors.neutral[500], fontVariant: ['tabular-nums'] }}>
                                            {lb.remaining}/{total} days
                                        </Text>
                                    </View>
                                    <View style={S.leaveBarBg}>
                                        <LinearGradient
                                            colors={[color, color]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[S.leaveBarFill, { width: `${percent}%` }] as any}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </PremiumCard>
        </AnimatedRN.View>
    );
}

function RecentAttendanceSection({ records }: { records: DashboardAttendanceDay[] }) {
    const last7 = records.slice(0, 7);

    return (
        <AnimatedRN.View entering={FadeInDown.delay(750).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.success[500], colors.primary[500]]}>
                <CardHeader title="Recent Attendance" subtitle="Last 7 days" />
                {last7.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No attendance records found.</Text>
                ) : (
                    <View style={{ gap: 0 }}>
                        {last7.map((day, i) => {
                            const wh = parseWorkedHours(day.workedHours);
                            return (
                                <View key={day.date + i} style={S.attendanceItem}>
                                    <View style={S.attendanceLeft}>
                                        <View style={{ width: 36, alignItems: 'center' }}>
                                            <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[950] }}>{new Date(day.date).getDate()}</Text>
                                            <Text className="font-inter" style={{ fontSize: 9, color: colors.neutral[400], textTransform: 'uppercase', fontWeight: '500' }}>
                                                {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                                            </Text>
                                        </View>
                                        <AttendanceStatusBadge status={day.status} />
                                    </View>
                                    <View style={S.attendanceRight}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500], fontVariant: ['tabular-nums'] }}>
                                            {formatTimeShort(day.punchIn)}{day.punchOut ? ` - ${formatTimeShort(day.punchOut)}` : ''}
                                        </Text>
                                        <View style={S.hoursChip}>
                                            <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[950], fontVariant: ['tabular-nums'] }}>
                                                {wh != null ? `${wh.toFixed(1)}h` : '--'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 9: Monthly Trend Area Chart (SVG)
// ================================================================

function MonthlyTrendChart({ monthlyTrend }: { monthlyTrend: DashboardMonthlyTrendItem[] | null }) {
    const { width } = useWindowDimensions();
    const chartW = width - 96;
    const chartH = 200;
    const paddingLeft = 32;
    const paddingBottom = 24;
    const paddingTop = 12;
    const paddingRight = 8;
    const drawW = chartW - paddingLeft - paddingRight;
    const drawH = chartH - paddingBottom - paddingTop;

    if (!monthlyTrend || monthlyTrend.length === 0) return null;

    const maxVal = 100;
    const yMarkers = [0, 25, 50, 75, 100];

    // Build path
    const points = monthlyTrend.map((d, i) => {
        const x = paddingLeft + (i / Math.max(monthlyTrend.length - 1, 1)) * drawW;
        const y = paddingTop + drawH - (d.attendancePercentage / maxVal) * drawH;
        return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + drawH} L ${points[0].x} ${paddingTop + drawH} Z`;

    return (
        <AnimatedRN.View entering={FadeInDown.delay(800).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.accent[500]]}>
                <CardHeader title="Monthly Attendance Trend" subtitle="6-month overview" />
                <Svg width={chartW} height={chartH}>
                    <Defs>
                        <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={colors.primary[500]} stopOpacity={0.3} />
                            <Stop offset="100%" stopColor={colors.primary[500]} stopOpacity={0.02} />
                        </SvgLinearGradient>
                    </Defs>
                    {/* Y-axis grid */}
                    {yMarkers.map((val) => {
                        const y = paddingTop + drawH - (val / maxVal) * drawH;
                        return (
                            <React.Fragment key={val}>
                                <Line x1={paddingLeft} y1={y} x2={chartW - paddingRight} y2={y} stroke={colors.neutral[100]} strokeWidth={1} strokeDasharray="3,3" />
                                <SvgText x={paddingLeft - 4} y={y + 4} fontSize={10} fill={colors.neutral[400]} textAnchor="end">{`${val}%`}</SvgText>
                            </React.Fragment>
                        );
                    })}
                    {/* Area fill */}
                    <Path d={areaPath} fill="url(#areaGradient)" />
                    {/* Line */}
                    <Path d={linePath} fill="none" stroke={colors.primary[500]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {/* Data points */}
                    {points.map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.primary[500]} stroke="#fff" strokeWidth={2} />
                    ))}
                    {/* X-axis labels */}
                    {monthlyTrend.map((d, i) => {
                        const x = paddingLeft + (i / Math.max(monthlyTrend.length - 1, 1)) * drawW;
                        return (
                            <SvgText key={d.month + d.year} x={x} y={chartH - 6} fontSize={10} fill={colors.neutral[400]} textAnchor="middle">
                                {d.month.slice(0, 3)}
                            </SvgText>
                        );
                    })}
                </Svg>
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 10: Manager Section (Team Summary + Pending Approvals)
// ================================================================

function TeamSummaryCard({ summary }: { summary: DashboardTeamSummary }) {
    const items = [
        { label: 'Present', value: summary.present, color: colors.success[500], bgColor: colors.success[100], icon: <UserCheckIcon s={14} c={colors.success[600]} /> },
        { label: 'Absent', value: summary.absent, color: colors.danger[500], bgColor: colors.danger[100], icon: <UserXIcon s={14} c={colors.danger[600]} /> },
        { label: 'On Leave', value: summary.onLeave, color: colors.info[500], bgColor: colors.info[100], icon: <UserMinusIcon s={14} c={colors.info[600]} /> },
        { label: 'Not In', value: summary.notCheckedIn, color: colors.neutral[400], bgColor: colors.neutral[200], icon: <UserCogIcon s={14} c={colors.neutral[500]} /> },
    ];

    const ringSize = 56;
    const ringRadius = 22;
    const ringCircumference = 2 * Math.PI * ringRadius;

    return (
        <AnimatedRN.View entering={FadeInDown.delay(850).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.info[500], colors.primary[500]]}>
                <CardHeader title="Team Summary" subtitle={`${summary.total} total members`} />
                <View style={S.teamGrid}>
                    {items.map((item) => {
                        const pct = summary.total > 0 ? (item.value / summary.total) * 100 : 0;
                        const dashOffset = ringCircumference - (ringCircumference * pct) / 100;

                        return (
                            <View key={item.label} style={S.teamRingItem}>
                                <View style={{ width: ringSize, height: ringSize, position: 'relative' }}>
                                    <Svg width={ringSize} height={ringSize} style={{ transform: [{ rotate: '-90deg' }] }}>
                                        <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" strokeWidth={4} stroke={item.bgColor} />
                                        <Circle
                                            cx={ringSize / 2}
                                            cy={ringSize / 2}
                                            r={ringRadius}
                                            fill="none"
                                            strokeWidth={4}
                                            stroke={item.color}
                                            strokeDasharray={ringCircumference}
                                            strokeDashoffset={dashOffset}
                                            strokeLinecap="round"
                                        />
                                    </Svg>
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text className="font-inter text-lg font-bold" style={{ color: item.color, fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                                    </View>
                                </View>
                                <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: colors.neutral[400], letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 6 }}>{item.label}</Text>
                            </View>
                        );
                    })}
                </View>
            </PremiumCard>
        </AnimatedRN.View>
    );
}

function PendingApprovalsCard({ approvals }: { approvals: DashboardPendingApproval[] }) {
    const router = useRouter();
    const top3 = approvals.slice(0, 3);

    const typeColor = (type: string): { bg: string; fg: string } => {
        const lower = type.toLowerCase();
        if (lower.includes('leave')) return { bg: colors.info[50], fg: colors.info[700] };
        if (lower.includes('attendance')) return { bg: colors.success[50], fg: colors.success[700] };
        return { bg: colors.accent[50], fg: colors.accent[700] };
    };

    return (
        <AnimatedRN.View entering={FadeInDown.delay(900).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.warning[500], colors.danger[500]]}>
                <CardHeader title="Pending Approvals" subtitle={`${approvals.length} total`} />
                {top3.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No pending approvals.</Text>
                ) : (
                    <View style={{ gap: 10 }}>
                        {top3.map((item) => {
                            const initials = item.employeeName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase();
                            const tc = typeColor(item.type);

                            return (
                                <View key={item.id} style={S.approvalItem}>
                                    <LinearGradient
                                        colors={[colors.primary[400], colors.accent[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={S.approvalAvatar}
                                    >
                                        <Text className="font-inter" style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{initials}</Text>
                                    </LinearGradient>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{item.employeeName}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                            <View style={[S.approvalTypeBadge, { backgroundColor: tc.bg }]}>
                                                <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: tc.fg, letterSpacing: 0.5, textTransform: 'uppercase' }}>{item.type}</Text>
                                            </View>
                                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500], flex: 1 }} numberOfLines={1}>{item.description}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
                {approvals.length > 0 && (
                    <Pressable
                        style={({ pressed }) => [S.viewAllButton, { opacity: pressed ? 0.8 : 1 }]}
                        onPress={() => router.push('/company/hr/approval-requests' as any)}
                    >
                        <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[600] }}>View All Approvals</Text>
                    </Pressable>
                )}
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// SECTION 11: Upcoming Holidays (Horizontal ScrollView)
// ================================================================

function UpcomingHolidaysList({ holidays }: { holidays: DashboardHoliday[] }) {
    const next8 = holidays.slice(0, 8);

    const isThisMonth = (dateStr: string): boolean => {
        const now = new Date();
        const d = new Date(dateStr);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    if (next8.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(950).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.warning[500], colors.accent[500]]}>
                    <CardHeader title="Upcoming Holidays" />
                    <Text className="font-inter" style={S.emptyText}>No upcoming holidays.</Text>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(950).duration(400)} style={S.sectionContainer}>
            <Text className="font-inter" style={[S.sectionLabel, { marginBottom: 12 }]}>UPCOMING HOLIDAYS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {next8.map((h) => {
                    const d = new Date(h.date);
                    const current = isThisMonth(h.date);

                    return (
                        <View key={h.id} style={[S.holidayCard, current && S.holidayCardCurrent]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                {current ? (
                                    <LinearGradient
                                        colors={[colors.primary[500], colors.accent[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={S.holidayDateCircle}
                                    >
                                        <Text className="font-inter text-lg font-bold" style={{ color: '#fff' }}>{d.getDate()}</Text>
                                        <Text className="font-inter" style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
                                            {d.toLocaleDateString('en-IN', { month: 'short' })}
                                        </Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[S.holidayDateCircle, { backgroundColor: colors.primary[50] }]}>
                                        <Text className="font-inter text-lg font-bold" style={{ color: colors.primary[600] }}>{d.getDate()}</Text>
                                        <Text className="font-inter" style={{ fontSize: 8, fontWeight: '700', color: colors.primary[400], textTransform: 'uppercase' }}>
                                            {d.toLocaleDateString('en-IN', { month: 'short' })}
                                        </Text>
                                    </View>
                                )}
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{h.name}</Text>
                                    <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[400], marginTop: 2 }}>
                                        {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                                    </Text>
                                    <View style={{ marginTop: 6 }}>
                                        <HolidayTypeBadge type={h.type} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </AnimatedRN.View>
    );
}

// ================================================================
// Loading Skeleton
// ================================================================

function DashboardSkeleton() {
    return (
        <View style={{ padding: 20, gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </View>
    );
}

// ================================================================
// MAIN SCREEN
// ================================================================

export function EmployeeDashboard() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore.use.user();
    const permissions = useAuthStore.use.permissions();
    const firstName = user?.firstName ?? 'there';

    const { data: dashboardResponse, isLoading, refetch } = useDashboard();
    const [pullRefreshing, setPullRefreshing] = React.useState(false);

    const data: DashboardData | undefined = React.useMemo(() => {
        const raw = dashboardResponse as any;
        const extracted = raw?.data?.data ?? raw?.data ?? raw;
        return extracted ? normalizeDashboardData(extracted) : undefined;
    }, [dashboardResponse]);

    const onPullRefresh = React.useCallback(async () => {
        setPullRefreshing(true);
        try { await refetch(); } finally { setPullRefreshing(false); }
    }, [refetch]);

    if (isLoading || !data) {
        return (
            <View style={S.container}>
                <WelcomeHeader firstName={firstName} />
                <DashboardSkeleton />
            </View>
        );
    }

    const hasTeamData = data.teamSummary !== null;
    const hasPendingApprovals = data.pendingApprovals.length > 0;
    const showManagerRow = hasTeamData || hasPendingApprovals;

    return (
        <View style={S.container}>
            <ScrollView
                contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={pullRefreshing}
                        onRefresh={onPullRefresh}
                        tintColor={colors.primary[500]}
                    />
                }
            >
                {/* SECTION 1: Welcome Header */}
                <WelcomeHeader firstName={firstName} />

                {/* SECTION 1b: Announcements */}
                <AnnouncementsBanner announcements={data.announcements} />

                {/* SECTION 2: Shift Check-In Hero */}
                <ShiftCheckInHero shift={data.shift} />

                {/* SECTION 3: Shift Calendar */}
                <ShiftCalendarStrip calendar={data.shiftCalendar} />

                {/* SECTION 4: Quick Stats */}
                <QuickStatsRow data={data} />

                {/* SECTION 5: Weekly Attendance Chart */}
                <WeeklyAttendanceChart weeklyChart={data.weeklyChart} />

                {/* SECTION 6: Leave Donut Chart */}
                <LeaveDonutChart leaveDonut={data.leaveDonut} />

                {/* SECTION 7: Quick Actions */}
                <QuickActionsGrid permissions={permissions} />

                {/* SECTION 8: Leave Balance */}
                <LeaveBalanceSection balances={data.leaveBalances} />

                {/* SECTION 8b: Recent Attendance */}
                <RecentAttendanceSection records={data.recentAttendance} />

                {/* SECTION 9: Monthly Trend Chart */}
                <MonthlyTrendChart monthlyTrend={data.monthlyTrend} />

                {/* SECTION 10: Manager Section */}
                {showManagerRow && hasTeamData && (
                    <TeamSummaryCard summary={data.teamSummary!} />
                )}
                {showManagerRow && hasPendingApprovals && (
                    <PendingApprovalsCard approvals={data.pendingApprovals} />
                )}

                {/* SECTION 11: Upcoming Holidays */}
                <UpcomingHolidaysList holidays={data.upcomingHolidays} />
            </ScrollView>
        </View>
    );
}

// ================================================================
// STYLES
// ================================================================

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
    welcomeHeaderRow: {
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
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.neutral[400],
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // Premium Card Shell
    premiumCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    premiumCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    premiumCardContent: {
        padding: 18,
        paddingTop: 20,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    // Announcements
    announcementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    announcementIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: colors.accent[500],
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 12,
        justifyContent: 'center',
    },
    dot: {
        height: 7,
        borderRadius: 3.5,
    },

    // Shift Hero
    shiftCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    shiftGradient: {
        padding: 24,
        alignItems: 'center',
    },
    shiftClock: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
        fontVariant: ['tabular-nums'],
        letterSpacing: 3,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(110,231,183,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulsingDotInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    elapsedBox: {
        marginTop: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    workedBox: {
        marginTop: 14,
        alignItems: 'center',
        gap: 2,
    },
    breaksRow: {
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    breakPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    // Slide
    track: {
        height: TRACK_H,
        borderRadius: 16,
        justifyContent: 'center',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    trackLabel: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.85)',
    },
    thumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE - 8,
        borderRadius: 12,
        marginLeft: 4,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
    },

    // Shift Calendar
    calendarDayCard: {
        width: 88,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        backgroundColor: '#FFFFFF',
        padding: 10,
        alignItems: 'center',
    },
    calendarDayToday: {
        borderWidth: 2,
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
        shadowColor: colors.primary[500],
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
    },
    calendarDayHoliday: {
        backgroundColor: colors.warning[50],
        borderColor: colors.warning[200],
    },
    calendarDayWeekOff: {
        backgroundColor: colors.neutral[50],
        borderColor: colors.neutral[200],
    },

    // Quick Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary[950],
        fontVariant: ['tabular-nums'],
        marginTop: 10,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.neutral[500],
        marginTop: 2,
    },
    statSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.neutral[400],
        marginTop: 1,
    },

    // Charts
    chartLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.neutral[500],
    },

    // Donut Legend
    donutLegendGrid: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
    },
    donutLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    // Quick Actions
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickActionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    quickActionBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    quickActionInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        paddingLeft: 16,
    },
    quickActionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Leave Balance
    leaveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    leaveBarBg: {
        height: 8,
        backgroundColor: colors.neutral[100],
        borderRadius: 4,
        overflow: 'hidden',
    },
    leaveBarFill: {
        height: '100%',
        borderRadius: 4,
    },

    // Attendance
    attendanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 4,
        backgroundColor: 'rgba(250,250,250,0.7)',
    },
    attendanceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    attendanceRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hoursChip: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },

    // Small Badge
    smallBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    smallBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Manager Section
    teamGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 16,
    },
    teamRingItem: {
        alignItems: 'center',
    },

    // Approvals
    approvalItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(250,250,250,0.7)',
    },
    approvalAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approvalTypeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    viewAllButton: {
        marginTop: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
    },

    // Holidays
    holidayCard: {
        width: 200,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        backgroundColor: '#FFFFFF',
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    holidayCardCurrent: {
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
    },
    holidayDateCircle: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Misc
    emptyText: {
        fontSize: 13,
        color: colors.neutral[400],
        textAlign: 'center',
        paddingVertical: 12,
    },
});
