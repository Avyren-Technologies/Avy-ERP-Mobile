/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Animated,
    Dimensions,
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
const BellIcon = ({ s = 24, c = '#fff' }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 01-3.46 0" /></Svg>
);
const ChevronLeftIcon = ({ s = 20, c = colors.primary[600] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M15 18l-6-6 6-6" /></Svg>
);
const InfoIcon = ({ s = 40, c = colors.neutral[300] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="12" r="10" /><Line x1="12" y1="16" x2="12" y2="12" /><Line x1="12" y1="8" x2="12.01" y2="8" /></Svg>
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
// FIX 1: Welcome Header — Hamburger LEFT, Notification RIGHT, Marquee Name
// ================================================================

function MarqueeText({ text, maxChars = 15 }: { text: string; maxChars?: number }) {
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const needsScroll = text.length > maxChars;
    const animRef = React.useRef<Animated.CompositeAnimation | null>(null);

    React.useEffect(() => {
        if (!needsScroll) return;
        // estimate text width: ~16px per char at fontSize 28
        const textWidth = text.length * 16;
        const containerWidth = SCREEN_WIDTH - 140; // minus hamburger, bell, padding
        const scrollDistance = Math.max(0, textWidth - containerWidth);

        const forward = Animated.timing(scrollX, {
            toValue: -scrollDistance,
            duration: 3000,
            useNativeDriver: true,
        });
        const pauseEnd = Animated.delay(2000);
        const backward = Animated.timing(scrollX, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
        });
        const pauseStart = Animated.delay(2000);

        animRef.current = Animated.loop(
            Animated.sequence([pauseStart, forward, pauseEnd, backward])
        );
        animRef.current.start();

        return () => {
            animRef.current?.stop();
        };
    }, [needsScroll, text, scrollX]);

    if (!needsScroll) {
        return (
            <Text className="font-inter" style={S.userName}>{text}</Text>
        );
    }

    return (
        <View style={{ overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateX: scrollX }] }}>
                <Text className="font-inter" style={S.userName} numberOfLines={1}>{text}</Text>
            </Animated.View>
        </View>
    );
}

function WelcomeHeader({ firstName }: { firstName: string }) {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();

    return (
        <AnimatedRN.View entering={FadeInUp.duration(600)}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[S.welcomeCard, { paddingTop: insets.top + 16 }]}
            >
                <View style={S.welcomeHeaderRow}>
                    {/* FIX 1: Hamburger LEFT */}
                    <HamburgerButton onPress={toggle} />
                    <View style={S.welcomeTextWrap}>
                        <Text className="font-inter" style={S.greeting}>
                            {getGreeting()},
                        </Text>
                        <MarqueeText text={firstName} />
                    </View>
                    {/* FIX 1: Notification bell RIGHT */}
                    <Pressable
                        onPress={() => {
                            try {
                                router.push('/company/announcements' as any);
                            } catch {
                                showSuccess('Coming soon', 'Notifications screen is under development');
                            }
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={({ pressed }) => [S.bellButton, pressed && { opacity: 0.6 }]}
                    >
                        <BellIcon s={22} c="#fff" />
                        {/* Red dot badge placeholder */}
                        <View style={S.bellDot} />
                    </Pressable>
                </View>
                <Text className="font-inter" style={S.dateText}>
                    {formatDate()}
                </Text>
            </LinearGradient>
        </AnimatedRN.View>
    );
}

// ================================================================
// FIX 6: Announcements — Marquee Ticker + View All
// ================================================================

function AnnouncementsTicker({ announcements }: { announcements: DashboardAnnouncement[] }) {
    const router = useRouter();
    const scrollX = React.useRef(new Animated.Value(0)).current;
    const [isPaused, setIsPaused] = React.useState(false);
    const animRef = React.useRef<Animated.CompositeAnimation | null>(null);
    const { width } = useWindowDimensions();

    const top3 = announcements.slice(0, 3);

    const tickerText = React.useMemo(() => {
        if (top3.length === 0) return '';
        return top3.map((a) => {
            const prefix = a.priority === 'URGENT' ? '[URGENT] ' : a.priority === 'HIGH' ? '[HIGH] ' : '';
            return `${prefix}${a.title}: ${a.body}`;
        }).join('     |     ');
    }, [top3]);

    const estimatedTextWidth = tickerText.length * 7;

    React.useEffect(() => {
        if (top3.length === 0 || isPaused) return;
        scrollX.setValue(width);
        const anim = Animated.loop(
            Animated.timing(scrollX, {
                toValue: -estimatedTextWidth,
                duration: Math.max(8000, estimatedTextWidth * 20),
                useNativeDriver: true,
            })
        );
        animRef.current = anim;
        anim.start();
        return () => { anim.stop(); };
    }, [top3.length, isPaused, scrollX, width, estimatedTextWidth]);

    const priorityBg = React.useMemo(() => {
        if (top3.length === 0) return colors.primary[50];
        const highest = top3.reduce((acc, a) => {
            const order = { URGENT: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
            return order[a.priority] > order[acc] ? a.priority : acc;
        }, 'LOW' as DashboardAnnouncement['priority']);
        if (highest === 'URGENT') return colors.danger[500];
        if (highest === 'HIGH') return colors.warning[500];
        return colors.primary[50];
    }, [top3]);

    const textColor = priorityBg === colors.primary[50] ? colors.primary[700] : '#FFFFFF';

    if (top3.length === 0) {
        return null;
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(100).duration(400)}>
            <Pressable
                onPressIn={() => setIsPaused(true)}
                onPressOut={() => setIsPaused(false)}
                onPress={() => router.push('/company/announcements' as any)}
                style={[S.tickerBar, { backgroundColor: priorityBg }]}
            >
                <View style={S.tickerIconWrap}>
                    <MegaphoneIcon s={12} c={textColor} />
                </View>
                <View style={S.tickerTextWrap}>
                    <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollX }] }}>
                        <Text className="font-inter text-xs font-semibold" style={{ color: textColor }} numberOfLines={1}>
                            {tickerText}
                        </Text>
                    </Animated.View>
                </View>
                <Pressable
                    onPress={() => router.push('/company/announcements' as any)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text className="font-inter text-xs font-bold" style={{ color: textColor, textDecorationLine: 'underline' }}>View All</Text>
                </Pressable>
            </Pressable>
        </AnimatedRN.View>
    );
}

// ================================================================
// FIX 2: Shift Check-In Hero — Fixed Clock Display
// ================================================================

function ShiftCheckInHero({ shift }: { shift: DashboardShiftInfo | null }) {
    const queryClient = useQueryClient();
    const isNarrowScreen = SCREEN_WIDTH < 380;

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

    // FIX 2: Clock font sizes adjusted to avoid clipping
    const clockFontSize = isNarrowScreen ? 42 : 48;

    return (
        <AnimatedRN.View entering={FadeInDown.delay(150).duration(500)} style={S.sectionContainer}>
            <View style={S.shiftCard}>
                <LinearGradient
                    colors={[colors.primary[600], colors.accent[600], colors.primary[800]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={S.shiftGradient}
                >
                    {shift ? (
                        <>
                            {/* Shift name + time */}
                            <Text className="font-inter text-lg font-bold" style={{ color: '#FFFFFF', letterSpacing: 0.5 }}>
                                {shift.shiftName}
                            </Text>
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

                            {/* FIX 2: Live clock with reduced letterSpacing and adjustsFontSizeToFit */}
                            <Text
                                className="font-inter"
                                style={[S.shiftClock, { fontSize: clockFontSize }]}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                            >
                                {clockStr}
                            </Text>

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
                        </>
                    ) : (
                        <>
                            {/* FIX 2: No shift assigned — clean empty state */}
                            <Text className="font-inter text-lg font-bold" style={{ color: '#FFFFFF', letterSpacing: 0.5 }}>
                                No shift assigned
                            </Text>
                            <Text className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                                Contact your HR to assign a shift
                            </Text>

                            <View style={S.noShiftClockWrap}>
                                <Text className="font-inter" style={S.noShiftClockLabel}>
                                    Current Time
                                </Text>
                                <Text
                                    className="font-inter"
                                    style={S.noShiftClockValue}
                                >
                                    {clockStr}
                                </Text>
                            </View>

                            {/* Status badge */}
                            <View style={{ marginTop: 8 }}>
                                <AttStatusBadge status={status} />
                            </View>
                        </>
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
// FIX 3: Shift Calendar — Proper Month Calendar View
// ================================================================

function shiftTypeColor(shiftType: string | null): string {
    if (!shiftType) return colors.neutral[400];
    const t = shiftType.toUpperCase();
    if (t === 'DAY' || t === 'GENERAL' || t === 'MORNING') return colors.info[500];
    if (t === 'NIGHT' || t === 'EVENING') return colors.primary[700];
    if (t === 'FLEXIBLE' || t === 'ROTATIONAL') return colors.accent[500];
    return colors.primary[500];
}

function getShiftDotColor(shiftType: string | null): string {
    if (!shiftType) return 'transparent';
    const t = shiftType.toUpperCase();
    if (t === 'DAY' || t === 'GENERAL' || t === 'MORNING') return colors.info[500];
    if (t === 'NIGHT' || t === 'EVENING') return colors.primary[700];
    if (t === 'FLEXIBLE' || t === 'ROTATIONAL') return colors.accent[500];
    return colors.primary[500];
}

function ShiftMonthCalendar({ calendar }: { calendar: DashboardShiftCalendarDay[] | null }) {
    const { width } = useWindowDimensions();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
    const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = React.useState<string | null>(
        today.toISOString().split('T')[0]
    );
    const slideAnim = React.useRef(new Animated.Value(0)).current;

    // Build a lookup map from calendar data
    const calendarMap = React.useMemo(() => {
        const map = new Map<string, DashboardShiftCalendarDay>();
        if (calendar) {
            calendar.forEach((day) => {
                map.set(day.date, day);
            });
        }
        return map;
    }, [calendar]);

    // Month navigation
    const goToPrevMonth = () => {
        slideAnim.setValue(width);
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        slideAnim.setValue(-width);
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    // Generate calendar grid
    const calendarGrid = React.useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const totalDays = lastDay.getDate();
        // Monday = 0, Sunday = 6
        let startWeekday = firstDay.getDay() - 1;
        if (startWeekday < 0) startWeekday = 6;

        const cells: Array<{ date: string | null; day: number; isCurrentMonth: boolean }> = [];

        // Previous month padding
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = startWeekday - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;
            const m = currentMonth === 0 ? 11 : currentMonth - 1;
            const y = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({ date: dateStr, day: d, isCurrentMonth: false });
        }

        // Current month days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({ date: dateStr, day: d, isCurrentMonth: true });
        }

        // Next month padding to fill the grid
        const remaining = 7 - (cells.length % 7);
        if (remaining < 7) {
            for (let d = 1; d <= remaining; d++) {
                const m = currentMonth === 11 ? 0 : currentMonth + 1;
                const y = currentMonth === 11 ? currentYear + 1 : currentYear;
                const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                cells.push({ date: dateStr, day: d, isCurrentMonth: false });
            }
        }

        return cells;
    }, [currentMonth, currentYear]);

    // Selected day details
    const selectedDayData = React.useMemo(() => {
        if (!selectedDate) return null;
        return calendarMap.get(selectedDate) ?? null;
    }, [selectedDate, calendarMap]);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const cellSize = (width - 48 - 36 - 12) / 7; // padding + inner padding + gaps
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (!calendar || calendar.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(200).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.primary[500], colors.info[500]]}>
                    <CardHeader title="Shift Calendar" subtitle="Monthly view" />
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={36} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 8 }}>
                            No shift schedule available
                        </Text>
                        <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[300], marginTop: 2 }}>
                            Contact HR to set up your shift calendar
                        </Text>
                    </View>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(200).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.info[500]]}>
                {/* Month navigation */}
                <View style={S.calMonthNav}>
                    <Pressable onPress={goToPrevMonth} hitSlop={8} style={({ pressed }) => [S.calNavBtn, pressed && { opacity: 0.6 }]}>
                        <ChevronLeftIcon s={18} c={colors.primary[600]} />
                    </Pressable>
                    <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>
                        {monthNames[currentMonth]} {currentYear}
                    </Text>
                    <Pressable onPress={goToNextMonth} hitSlop={8} style={({ pressed }) => [S.calNavBtn, pressed && { opacity: 0.6 }]}>
                        <ChevronRightIcon s={18} c={colors.primary[600]} />
                    </Pressable>
                </View>

                {/* Day headers */}
                <View style={S.calDayHeaderRow}>
                    {dayHeaders.map((dh) => (
                        <View key={dh} style={[S.calDayHeaderCell, { width: cellSize }]}>
                            <Text className="font-inter" style={S.calDayHeaderText}>{dh}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar grid */}
                <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                    <View style={S.calGrid}>
                        {calendarGrid.map((cell, idx) => {
                            const dayData = cell.date ? calendarMap.get(cell.date) : null;
                            const isToday = cell.date === todayStr;
                            const isSelected = cell.date === selectedDate;
                            const isHoliday = dayData?.isHoliday ?? false;
                            const isWeekOff = dayData?.isWeekOff ?? false;
                            const hasShift = !!dayData?.shiftName;

                            return (
                                <Pressable
                                    key={`${cell.date}-${idx}`}
                                    onPress={() => cell.date && cell.isCurrentMonth && setSelectedDate(cell.date)}
                                    style={[
                                        S.calDayCell,
                                        { width: cellSize, height: cellSize },
                                        !cell.isCurrentMonth && { opacity: 0.3 },
                                        isHoliday && cell.isCurrentMonth && S.calDayHoliday,
                                        isWeekOff && !isHoliday && cell.isCurrentMonth && S.calDayWeekOff,
                                        isToday && S.calDayToday,
                                        isSelected && !isToday && S.calDaySelected,
                                    ]}
                                >
                                    <Text
                                        className="font-inter"
                                        style={[
                                            S.calDayText,
                                            isToday && { color: '#FFFFFF', fontWeight: '800' },
                                            !cell.isCurrentMonth && { color: colors.neutral[300] },
                                        ]}
                                    >
                                        {cell.day}
                                    </Text>
                                    {/* Shift type dot */}
                                    {hasShift && cell.isCurrentMonth && !isHoliday && !isWeekOff && (
                                        <View style={[S.calShiftDot, { backgroundColor: getShiftDotColor(dayData?.shiftType ?? null) }]} />
                                    )}
                                    {isHoliday && cell.isCurrentMonth && (
                                        <View style={[S.calShiftDot, { backgroundColor: colors.warning[500] }]} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Detail panel for selected date */}
                {selectedDate && (
                    <View style={S.calDetailPanel}>
                        {selectedDayData ? (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <CalendarIcon s={16} c={colors.primary[500]} />
                                    <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>
                                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                                {selectedDayData.isHoliday ? (
                                    <View style={{ marginTop: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={[S.calDetailDot, { backgroundColor: colors.warning[500] }]} />
                                            <Text className="font-inter text-sm font-medium" style={{ color: colors.warning[700] }}>
                                                {selectedDayData.holidayName ?? 'Holiday'}
                                            </Text>
                                        </View>
                                    </View>
                                ) : selectedDayData.isWeekOff ? (
                                    <View style={{ marginTop: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={[S.calDetailDot, { backgroundColor: colors.neutral[400] }]} />
                                            <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[500] }}>
                                                Week Off
                                            </Text>
                                        </View>
                                    </View>
                                ) : selectedDayData.shiftName ? (
                                    <View style={{ marginTop: 8, gap: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={[S.calDetailDot, { backgroundColor: shiftTypeColor(selectedDayData.shiftType) }]} />
                                            <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>
                                                {selectedDayData.shiftName}
                                            </Text>
                                            {selectedDayData.shiftType && (
                                                <View style={[S.smallBadge, { backgroundColor: colors.primary[50] }]}>
                                                    <Text className="font-inter" style={[S.smallBadgeText, { color: colors.primary[600] }]}>
                                                        {selectedDayData.shiftType}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {selectedDayData.startTime && selectedDayData.endTime && (
                                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500], marginLeft: 14, fontVariant: ['tabular-nums'] }}>
                                                {selectedDayData.startTime} -- {selectedDayData.endTime}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <View style={{ marginTop: 8 }}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[400] }}>No shift scheduled</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <CalendarIcon s={16} c={colors.neutral[400]} />
                                <Text className="font-inter text-sm" style={{ color: colors.neutral[400] }}>
                                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} -- No data available
                                </Text>
                            </View>
                        )}
                    </View>
                )}
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
            <AnimatedRN.View entering={FadeInDown.delay(250).duration(400)}>
                <Text className="font-inter" style={S.sectionTitle}>Overview</Text>
            </AnimatedRN.View>
            <View style={S.statsGrid}>
                {items.map((item, i) => (
                    <AnimatedRN.View key={item.label} entering={FadeInDown.delay(300 + i * 60).duration(400)} style={{ width: cardWidth }}>
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
// FIX 4 + FIX 5: Weekly Attendance Bar Chart with Dynamic Axis + Tooltips
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

    // FIX 5: Tooltip state
    const [selectedBarIdx, setSelectedBarIdx] = React.useState<number | null>(null);

    if (!weeklyChart || weeklyChart.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(350).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.success[500], colors.info[500]]}>
                    <CardHeader title="Weekly Attendance" subtitle="Hours worked per day" />
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={36} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 8 }}>
                            No attendance data available
                        </Text>
                    </View>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    // FIX 4: Dynamic Y-axis max
    const dataMax = Math.max(...weeklyChart.map((d) => d.hoursWorked));
    const maxHours = Math.max(8, Math.ceil(dataMax / 4) * 4);

    // FIX 4: Dynamic Y-axis markers
    const yStep = maxHours / 4;
    const yMarkers = [0, yStep, yStep * 2, yStep * 3, maxHours];

    const barWidth = Math.min(24, (drawW / weeklyChart.length) * 0.6);
    const gap = drawW / weeklyChart.length;

    // FIX 4: Dynamic x-axis label interval
    const labelInterval = Math.max(1, Math.floor(weeklyChart.length / 5));

    return (
        <AnimatedRN.View entering={FadeInDown.delay(350).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.success[500], colors.info[500]]}>
                <CardHeader title="Weekly Attendance" subtitle="Hours worked per day" />
                <Pressable onPress={() => setSelectedBarIdx(null)}>
                    <View>
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
                                const isActive = selectedBarIdx === i;

                                // FIX 4: Show label only at intervals or at the last index
                                const showLabel = i % labelInterval === 0 || i === weeklyChart.length - 1;

                                return (
                                    <React.Fragment key={day.date}>
                                        <Rect
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={barH}
                                            rx={4}
                                            ry={4}
                                            fill={fill}
                                            opacity={isActive ? 1 : selectedBarIdx != null ? 0.4 : 1}
                                            onPress={() => setSelectedBarIdx(i === selectedBarIdx ? null : i)}
                                        />
                                        {showLabel && (
                                            <SvgText
                                                x={paddingLeft + i * gap + gap / 2}
                                                y={chartH - 6}
                                                fontSize={10}
                                                fill={colors.neutral[400]}
                                                textAnchor="middle"
                                            >
                                                {day.dayName.slice(0, 3)}
                                            </SvgText>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </Svg>

                        {/* FIX 5: Bar chart tooltip */}
                        {selectedBarIdx != null && weeklyChart[selectedBarIdx] && (
                            <View
                                style={[
                                    S.chartTooltip,
                                    {
                                        left: Math.min(
                                            Math.max(4, paddingLeft + selectedBarIdx * gap + gap / 2 - 60),
                                            chartW - 130
                                        ),
                                        top: Math.max(
                                            0,
                                            paddingTop + drawH - (weeklyChart[selectedBarIdx].hoursWorked / maxHours) * drawH - 60
                                        ),
                                    },
                                ]}
                            >
                                <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[950] }}>
                                    {new Date(weeklyChart[selectedBarIdx].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                                </Text>
                                <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>
                                    {weeklyChart[selectedBarIdx].hoursWorked.toFixed(1)}h worked
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <View style={[S.legendDot, { backgroundColor: getBarColor(weeklyChart[selectedBarIdx].status, weeklyChart[selectedBarIdx].isHoliday, weeklyChart[selectedBarIdx].isWeekOff), width: 6, height: 6 }]} />
                                    <Text className="font-inter" style={{ fontSize: 9, color: colors.neutral[400], textTransform: 'capitalize' }}>
                                        {weeklyChart[selectedBarIdx].isHoliday ? 'Holiday' : weeklyChart[selectedBarIdx].isWeekOff ? 'Week Off' : weeklyChart[selectedBarIdx].status}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </Pressable>
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
// FIX 5: Leave Donut Chart with Tooltip
// ================================================================

function LeaveDonutChart({ leaveDonut }: { leaveDonut: DashboardLeaveDonutItem[] | null }) {
    const [selectedSegment, setSelectedSegment] = React.useState<number | null>(null);

    if (!leaveDonut || leaveDonut.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(400).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.accent[500], colors.primary[500]]}>
                    <CardHeader title="Leave Balance" subtitle="Category breakdown" />
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={36} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 8 }}>
                            No leave data available
                        </Text>
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

    const selectedSeg = selectedSegment != null ? segments[selectedSegment] : null;

    return (
        <AnimatedRN.View entering={FadeInDown.delay(400).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.accent[500], colors.primary[500]]}>
                <CardHeader title="Leave Balance" subtitle="Category breakdown" />
                <Pressable onPress={() => setSelectedSegment(null)}>
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
                                {segments.map((seg, idx) => (
                                    <Circle
                                        key={seg.category}
                                        cx={cx}
                                        cy={cy}
                                        r={radius}
                                        fill="none"
                                        stroke={seg.fill}
                                        strokeWidth={selectedSegment === idx ? strokeWidth + 4 : strokeWidth}
                                        strokeDasharray={`${seg.segmentLength} ${circumference - seg.segmentLength}`}
                                        strokeDashoffset={-seg.offset}
                                        strokeLinecap="round"
                                        transform={`rotate(-90, ${cx}, ${cy})`}
                                        onPress={() => setSelectedSegment(idx === selectedSegment ? null : idx)}
                                        opacity={selectedSegment != null && selectedSegment !== idx ? 0.4 : 1}
                                    />
                                ))}
                            </Svg>
                            {/* Center text */}
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                                {selectedSeg ? (
                                    <>
                                        <Text className="font-inter text-lg font-bold" style={{ color: selectedSeg.fill, fontVariant: ['tabular-nums'] }}>{selectedSeg.remaining}</Text>
                                        <Text className="font-inter" style={{ fontSize: 9, color: colors.neutral[500], fontWeight: '600' }}>{selectedSeg.category}</Text>
                                        <Text className="font-inter" style={{ fontSize: 8, color: colors.neutral[400], fontWeight: '500' }}>
                                            {selectedSeg.used}/{selectedSeg.totalEntitled} used
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="font-inter text-2xl font-bold" style={{ color: colors.primary[950], fontVariant: ['tabular-nums'] }}>{totalRemaining}</Text>
                                        <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[400], fontWeight: '500' }}>days left</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </Pressable>
                {/* Legend */}
                <View style={S.donutLegendGrid}>
                    {segments.map((seg, idx) => (
                        <Pressable
                            key={seg.category}
                            onPress={() => setSelectedSegment(idx === selectedSegment ? null : idx)}
                        >
                            <View style={[S.donutLegendItem, selectedSegment === idx && { backgroundColor: colors.primary[50], borderRadius: 8, padding: 4, marginHorizontal: -4 }]}>
                                <View style={[S.legendDot, { backgroundColor: seg.fill }]} />
                                <Text className="font-inter" style={{ fontSize: 10, fontWeight: '500', color: colors.neutral[500], flex: 1 }} numberOfLines={1}>{seg.category}</Text>
                                <Text className="font-inter" style={{ fontSize: 10, fontWeight: '700', color: colors.primary[950], fontVariant: ['tabular-nums'] }}>{seg.used}/{seg.totalEntitled}</Text>
                            </View>
                        </Pressable>
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
            <AnimatedRN.View entering={FadeInDown.delay(450).duration(400)}>
                <Text className="font-inter" style={S.sectionLabel}>QUICK ACTIONS</Text>
            </AnimatedRN.View>
            <View style={[S.actionGrid, { marginTop: 12 }]}>
                {visibleActions.map((action, i) => (
                    <AnimatedRN.View key={action.id} entering={FadeInDown.delay(500 + i * 50).duration(400)}>
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
        <AnimatedRN.View entering={FadeInDown.delay(550).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.accent[500]]}>
                <CardHeader title="Leave Balance" subtitle="Breakdown by type" />
                {balances.length === 0 ? (
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={32} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 6 }}>
                            No leave types configured
                        </Text>
                    </View>
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
        <AnimatedRN.View entering={FadeInDown.delay(600).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.success[500], colors.primary[500]]}>
                <CardHeader title="Recent Attendance" subtitle="Last 7 days" />
                {last7.length === 0 ? (
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={32} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 6 }}>
                            No attendance records found
                        </Text>
                    </View>
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
// FIX 5: Monthly Trend Area Chart with Tooltip
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
    const [selectedPointIdx, setSelectedPointIdx] = React.useState<number | null>(null);

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
        <AnimatedRN.View entering={FadeInDown.delay(650).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.primary[500], colors.accent[500]]}>
                <CardHeader title="Monthly Attendance Trend" subtitle="6-month overview" />
                <Pressable onPress={() => setSelectedPointIdx(null)}>
                    <View>
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

                            {/* FIX 5: Vertical indicator line for selected point */}
                            {selectedPointIdx != null && points[selectedPointIdx] && (
                                <Line
                                    x1={points[selectedPointIdx].x}
                                    y1={paddingTop}
                                    x2={points[selectedPointIdx].x}
                                    y2={paddingTop + drawH}
                                    stroke={colors.primary[300]}
                                    strokeWidth={1}
                                    strokeDasharray="4,4"
                                />
                            )}

                            {/* Data points */}
                            {points.map((p, i) => (
                                <Circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r={selectedPointIdx === i ? 6 : 3.5}
                                    fill={selectedPointIdx === i ? colors.accent[500] : colors.primary[500]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                    onPress={() => setSelectedPointIdx(i === selectedPointIdx ? null : i)}
                                />
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

                        {/* FIX 5: Area chart tooltip */}
                        {selectedPointIdx != null && monthlyTrend[selectedPointIdx] && points[selectedPointIdx] && (
                            <View
                                style={[
                                    S.chartTooltip,
                                    {
                                        left: Math.min(
                                            Math.max(4, points[selectedPointIdx].x - 65),
                                            chartW - 140
                                        ),
                                        top: Math.max(0, points[selectedPointIdx].y - 64),
                                    },
                                ]}
                            >
                                <Text className="font-inter text-xs font-bold" style={{ color: colors.primary[950] }}>
                                    {monthlyTrend[selectedPointIdx].month} {monthlyTrend[selectedPointIdx].year}
                                </Text>
                                <Text className="font-inter" style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>
                                    Attendance: {monthlyTrend[selectedPointIdx].attendancePercentage.toFixed(1)}%
                                </Text>
                                <Text className="font-inter" style={{ fontSize: 9, color: colors.neutral[400], marginTop: 1 }}>
                                    {monthlyTrend[selectedPointIdx].presentDays}/{monthlyTrend[selectedPointIdx].workingDays} days present
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>
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
        <AnimatedRN.View entering={FadeInDown.delay(700).duration(400)} style={S.sectionContainer}>
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
        <AnimatedRN.View entering={FadeInDown.delay(750).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.warning[500], colors.danger[500]]}>
                <CardHeader title="Pending Approvals" subtitle={`${approvals.length} total`} />
                {top3.length === 0 ? (
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={32} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 6 }}>
                            No pending approvals
                        </Text>
                    </View>
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
// FIX 7: Upcoming Holidays — Vertical List with Date Badge
// ================================================================

function UpcomingHolidaysList({ holidays }: { holidays: DashboardHoliday[] }) {
    const next8 = holidays.slice(0, 8);

    const daysUntil = (dateStr: string): number => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const isThisWeek = (dateStr: string): boolean => {
        const days = daysUntil(dateStr);
        return days >= 0 && days <= 7;
    };

    if (next8.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(800).duration(400)} style={S.sectionContainer}>
                <PremiumCard gradientAccentColors={[colors.warning[500], colors.accent[500]]}>
                    <CardHeader title="Upcoming Holidays" />
                    <View style={S.emptyStateContainer}>
                        <InfoIcon s={32} c={colors.neutral[300]} />
                        <Text className="font-inter text-sm font-medium" style={{ color: colors.neutral[400], marginTop: 6 }}>
                            No upcoming holidays
                        </Text>
                    </View>
                </PremiumCard>
            </AnimatedRN.View>
        );
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(800).duration(400)} style={S.sectionContainer}>
            <PremiumCard gradientAccentColors={[colors.warning[500], colors.accent[500]]}>
                <CardHeader title="Upcoming Holidays" subtitle={`${next8.length} holidays`} />
                <View style={{ gap: 0 }}>
                    {next8.map((h, idx) => {
                        const d = new Date(h.date);
                        const days = daysUntil(h.date);
                        const thisWeek = isThisWeek(h.date);
                        const dayStr = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`;

                        return (
                            <View key={h.id}>
                                <View style={[S.holidayListItem, thisWeek && S.holidayListItemHighlight]}>
                                    {/* Left: Date badge */}
                                    {thisWeek ? (
                                        <LinearGradient
                                            colors={[colors.primary[500], colors.accent[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={S.holidayDateBadge}
                                        >
                                            <Text className="font-inter" style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>
                                                {d.getDate()}
                                            </Text>
                                            <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {d.toLocaleDateString('en-IN', { month: 'short' })}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={[S.holidayDateBadge, { backgroundColor: colors.primary[50] }]}>
                                            <Text className="font-inter" style={{ fontSize: 20, fontWeight: '800', color: colors.primary[600] }}>
                                                {d.getDate()}
                                            </Text>
                                            <Text className="font-inter" style={{ fontSize: 9, fontWeight: '700', color: colors.primary[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {d.toLocaleDateString('en-IN', { month: 'short' })}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Center: Holiday info */}
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>
                                            {h.name}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                            <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[400] }}>
                                                {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                                            </Text>
                                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.neutral[300] }} />
                                            <Text className="font-inter" style={{ fontSize: 11, color: thisWeek ? colors.primary[600] : colors.neutral[400], fontWeight: thisWeek ? '600' : '400' }}>
                                                {dayStr}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Right: Type badge */}
                                    <HolidayTypeBadge type={h.type} />
                                </View>
                                {/* Divider */}
                                {idx < next8.length - 1 && (
                                    <View style={S.holidayDivider} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </PremiumCard>
        </AnimatedRN.View>
    );
}

// ================================================================
// Loading Skeleton — FIX 8: Better visual
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

                {/* FIX 6: Announcements Ticker */}
                <AnnouncementsTicker announcements={data.announcements} />

                {/* SECTION 2: Shift Check-In Hero */}
                <ShiftCheckInHero shift={data.shift} />

                {/* FIX 3: Shift Calendar — Full Month */}
                <ShiftMonthCalendar calendar={data.shiftCalendar} />

                {/* SECTION 4: Quick Stats */}
                <QuickStatsRow data={data} />

                {/* FIX 4+5: Weekly Attendance Chart with Dynamic Axis + Tooltips */}
                <WeeklyAttendanceChart weeklyChart={data.weeklyChart} />

                {/* FIX 5: Leave Donut Chart with Tooltip */}
                <LeaveDonutChart leaveDonut={data.leaveDonut} />

                {/* SECTION 7: Quick Actions */}
                <QuickActionsGrid permissions={permissions} />

                {/* SECTION 8: Leave Balance */}
                <LeaveBalanceSection balances={data.leaveBalances} />

                {/* SECTION 8b: Recent Attendance */}
                <RecentAttendanceSection records={data.recentAttendance} />

                {/* FIX 5: Monthly Trend Chart with Tooltip */}
                <MonthlyTrendChart monthlyTrend={data.monthlyTrend} />

                {/* SECTION 10: Manager Section */}
                {showManagerRow && hasTeamData && (
                    <TeamSummaryCard summary={data.teamSummary!} />
                )}
                {showManagerRow && hasPendingApprovals && (
                    <PendingApprovalsCard approvals={data.pendingApprovals} />
                )}

                {/* FIX 7: Upcoming Holidays — Vertical List */}
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

    // Welcome Card — FIX 1: Layout adjusted
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
        gap: 12,
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
    // FIX 1: Bell button
    bellButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bellDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.danger[500],
        borderWidth: 1.5,
        borderColor: colors.gradient.start,
    },

    // FIX 6: Ticker bar
    tickerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    tickerIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        flexShrink: 0,
    },
    tickerTextWrap: {
        flex: 1,
        overflow: 'hidden',
        height: 18,
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

    // Shift Hero — FIX 2: No overflow hidden on gradient, reduced letterSpacing
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
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
        fontVariant: ['tabular-nums'],
        letterSpacing: 1,
    },
    // FIX 2: No shift state
    noShiftClockWrap: {
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    noShiftClockLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        includeFontPadding: false,
        lineHeight: 16,
    },
    noShiftClockValue: {
        fontSize: 28,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        fontVariant: ['tabular-nums'],
        marginTop: 4,
        includeFontPadding: false,
        lineHeight: 34,
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

    // FIX 3: Month Calendar Styles
    calMonthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    calNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    calDayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 6,
    },
    calDayHeaderCell: {
        alignItems: 'center',
    },
    calDayHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.neutral[400],
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    calDayCell: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        marginVertical: 2,
    },
    calDayText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary[950],
    },
    calDayToday: {
        backgroundColor: colors.primary[500],
        borderRadius: 10,
    },
    calDaySelected: {
        borderWidth: 2,
        borderColor: colors.accent[500],
        borderRadius: 10,
    },
    calDayHoliday: {
        backgroundColor: colors.warning[50],
    },
    calDayWeekOff: {
        backgroundColor: colors.neutral[100],
    },
    calShiftDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 2,
    },
    calDetailPanel: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    calDetailDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
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
    // FIX 5: Tooltip
    chartTooltip: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        minWidth: 120,
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

    // FIX 7: Holiday List
    holidayListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    holidayListItemHighlight: {
        backgroundColor: colors.primary[50],
        borderRadius: 14,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    holidayDateBadge: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    holidayDivider: {
        height: 1,
        backgroundColor: colors.neutral[100],
        marginHorizontal: 4,
    },

    // FIX 8: Consistent empty states
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },

    // Misc
    emptyText: {
        fontSize: 13,
        color: colors.neutral[400],
        textAlign: 'center',
        paddingVertical: 12,
    },
});
