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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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
    DashboardPendingApproval,
    DashboardShiftInfo,
    DashboardTeamSummary,
} from '@/lib/api/ess';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_H = 64;
const THUMB_SIZE = 52;
const TRACK_W = SCREEN_WIDTH - 64;
const MAX_SLIDE = TRACK_W - THUMB_SIZE - 8;

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

function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatHolidayDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeShort(iso: string | null | undefined): string {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ============ LEAVE BAR COLORS ============

const LEAVE_COLORS = [
    colors.primary[500],
    colors.success[500],
    colors.accent[500],
    colors.warning[500],
    colors.info[500],
    colors.danger[500],
];

// ============ ICON COMPONENTS ============

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
const CalendarDaysIcon = ({ s = 18, c = colors.primary[500] }: { s?: number; c?: string }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Rect x="3" y="4" width="18" height="18" rx="2" /><Path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></Svg>
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

// ============ QUICK ACTION DEFINITIONS ============

interface QuickActionDef {
    id: string;
    title: string;
    iconComponent: (props: { s?: number; c?: string }) => React.ReactElement;
    gradient: readonly [string, string];
    route: string;
    permission?: string;
}

const ALL_QUICK_ACTIONS: QuickActionDef[] = [
    { id: 'apply-leave', title: 'Apply Leave', iconComponent: SendIcon, gradient: [colors.primary[500], colors.primary[700]], route: '/company/hr/my-leave', permission: 'ess:apply-leave' },
    { id: 'payslips', title: 'My Payslips', iconComponent: FileTextIcon, gradient: [colors.success[500], colors.success[700]], route: '/company/hr/my-payslips', permission: 'ess:view-payslips' },
    { id: 'attendance', title: 'My Attendance', iconComponent: EyeIcon, gradient: [colors.info[500], colors.info[700]], route: '/company/hr/my-attendance', permission: 'ess:view-attendance' },
    { id: 'profile', title: 'My Profile', iconComponent: UserIcon, gradient: [colors.warning[500], colors.warning[700]], route: '/company/hr/my-profile', permission: 'ess:view-profile' },
    { id: 'team-view', title: 'Team View', iconComponent: UsersIcon, gradient: [colors.accent[500], colors.accent[700]], route: '/company/hr/team-view', permission: 'hr:approve' },
    { id: 'approvals', title: 'Approvals', iconComponent: ClipboardCheckIcon, gradient: [colors.danger[500], colors.danger[700]], route: '/company/hr/approval-requests', permission: 'hr:approve' },
    { id: 'it-declaration', title: 'IT Declaration', iconComponent: LandmarkIcon, gradient: [colors.primary[400], colors.accent[500]], route: '/company/hr/it-declarations', permission: 'ess:it-declaration' },
    { id: 'goals', title: 'My Goals', iconComponent: TargetIcon, gradient: [colors.success[400], colors.success[600]], route: '/company/hr/my-goals', permission: 'ess:view-goals' },
    { id: 'training', title: 'My Training', iconComponent: GraduationCapIcon, gradient: [colors.info[400], colors.info[600]], route: '/company/hr/my-training', permission: 'ess:enroll-training' },
];

// ============ STATUS BADGE ============

function AttStatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
        NOT_CHECKED_IN: { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Not Checked In' },
        CHECKED_IN: { bg: colors.success[50], fg: colors.success[700], label: 'Checked In' },
        CHECKED_OUT: { bg: colors.primary[50], fg: colors.primary[700], label: 'Checked Out' },
        NOT_LINKED: { bg: colors.warning[50], fg: colors.warning[700], label: 'Not Linked' },
    };
    const c = map[status] ?? map.NOT_CHECKED_IN;
    return (
        <View style={[S.badge, { backgroundColor: c.bg }]}>
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

// ============ SLIDE-TO-ACTION ============

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
    const trackColor = isDone ? colors.neutral[300] : isCheckIn ? colors.success[500] : colors.danger[500];
    const label = isDone ? 'Shift Complete' : loading ? 'Processing...' : isCheckIn ? 'Slide to Check In' : 'Slide to Check Out';

    return (
        <View style={{ alignItems: 'center', marginTop: 16 }}>
            <View style={[S.track, { backgroundColor: trackColor, width: TRACK_W }]}>
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

// ============ SECTION 1: WELCOME + ANNOUNCEMENTS ============

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
        </AnimatedRN.View>
    );
}

function AnnouncementsBanner({ announcements }: { announcements: DashboardAnnouncement[] }) {
    const scrollRef = React.useRef<ScrollView>(null);
    const [currentIdx, setCurrentIdx] = React.useState(0);
    const { width } = useWindowDimensions();
    const cardWidth = width - 48;

    // Auto-scroll every 5s
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

    if (announcements.length === 0) {
        return (
            <AnimatedRN.View entering={FadeInDown.delay(100).duration(400)} style={[S.sectionContainer, { marginTop: 20 }]}>
                <View style={S.cardShell}>
                    <View style={S.announcementHeader}>
                        <MegaphoneIcon />
                        <Text className="font-inter" style={S.sectionLabel}>ANNOUNCEMENTS</Text>
                    </View>
                    <Text className="font-inter" style={S.emptyText}>No recent announcements.</Text>
                </View>
            </AnimatedRN.View>
        );
    }

    return (
        <AnimatedRN.View entering={FadeInDown.delay(100).duration(400)} style={[S.sectionContainer, { marginTop: 20 }]}>
            <View style={S.cardShell}>
                <View style={S.announcementHeader}>
                    <MegaphoneIcon />
                    <Text className="font-inter" style={S.sectionLabel}>ANNOUNCEMENTS</Text>
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
                        <View key={a.id} style={{ width: cardWidth - 16 }}>
                            <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{a.title}</Text>
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[500], marginTop: 4 }} numberOfLines={2}>{a.body}</Text>
                        </View>
                    ))}
                </ScrollView>
                {announcements.length > 1 && (
                    <View style={S.dotsRow}>
                        {announcements.map((_, i) => (
                            <View key={i} style={[S.dot, { backgroundColor: i === currentIdx ? colors.primary[500] : colors.neutral[200] }]} />
                        ))}
                    </View>
                )}
            </View>
        </AnimatedRN.View>
    );
}

// ============ SECTION 2: SHIFT CHECK-IN HERO ============

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
                    colors={[colors.primary[600], colors.primary[700], colors.primary[800]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={S.shiftGradient}
                >
                    {/* Shift name + time */}
                    <Text className="font-inter text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        {shift ? shift.shiftName : 'No shift assigned'}
                    </Text>
                    {shift ? (
                        <Text className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                            {shift.startTime} - {shift.endTime}
                            {shift.locationName ? `  @  ${shift.locationName}` : ''}
                        </Text>
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
                            <TimerIcon s={15} c={colors.success[600]} />
                            <Text className="font-inter text-lg font-bold" style={{ color: colors.success[700], fontVariant: ['tabular-nums'] }}>{formatDuration(elapsed)}</Text>
                            <Text className="font-inter text-xs" style={{ color: colors.success[500] }}>elapsed</Text>
                        </View>
                    )}

                    {/* Checked out: show worked hours */}
                    {isCheckedOut && workedHrs != null && (
                        <View style={S.workedBox}>
                            <CheckIcon s={16} c="rgba(255,255,255,0.7)" />
                            <Text className="font-inter text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {workedHrs.toFixed(1)} hrs worked
                            </Text>
                        </View>
                    )}

                    {/* Slide action */}
                    <SlideAction mode={slideMode} onComplete={handleSlideComplete} loading={isBusy} />
                </LinearGradient>
            </View>
        </AnimatedRN.View>
    );
}

// ============ SECTION 3: QUICK STATS ============

function QuickStatsRow({ data }: { data: DashboardData }) {
    const { width } = useWindowDimensions();
    const cardWidth = (width - 48 - 12) / 2;
    const stats = data.stats;

    const items = [
        {
            label: 'Leave Balance',
            value: stats.leaveBalanceTotal.toString(),
            subtitle: 'Remaining days',
            icon: <CalendarIcon s={18} c={colors.primary[600]} />,
            bg: colors.primary[50],
        },
        {
            label: 'Attendance',
            value: `${stats.attendancePercentage}%`,
            subtitle: `${stats.presentDays}/${stats.workingDays} days`,
            icon: <ClockIcon s={18} c={colors.success[600]} />,
            bg: colors.success[50],
        },
        {
            label: 'Pending Approvals',
            value: stats.pendingApprovalsCount.toString(),
            subtitle: stats.pendingApprovalsCount > 0 ? 'Awaiting action' : 'All caught up',
            icon: <CheckSquareIcon s={18} c={stats.pendingApprovalsCount > 0 ? colors.warning[600] : colors.neutral[400]} />,
            bg: stats.pendingApprovalsCount > 0 ? colors.warning[50] : colors.neutral[100],
        },
        {
            label: 'Active Goals',
            value: stats.goals.activeCount.toString(),
            subtitle: `Avg ${stats.goals.avgCompletion}% done`,
            icon: <TargetIcon s={18} c={colors.accent[600]} />,
            bg: colors.accent[50],
        },
    ];

    return (
        <View style={S.sectionContainer}>
            <AnimatedRN.View entering={FadeInDown.delay(300).duration(400)}>
                <Text className="font-inter" style={S.sectionTitle}>Overview</Text>
            </AnimatedRN.View>
            <View style={S.statsGrid}>
                {items.map((item, i) => (
                    <AnimatedRN.View key={item.label} entering={FadeInDown.delay(350 + i * 80).duration(400)} style={[S.statCard, { width: cardWidth }]}>
                        <View style={[S.statIconContainer, { backgroundColor: item.bg }]}>
                            {item.icon}
                        </View>
                        <Text className="font-inter" style={S.statValue}>{item.value}</Text>
                        <Text className="font-inter" style={S.statLabel}>{item.label}</Text>
                        <Text className="font-inter" style={S.statSubtitle}>{item.subtitle}</Text>
                    </AnimatedRN.View>
                ))}
            </View>
        </View>
    );
}

// ============ SECTION 4: QUICK ACTIONS ============

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
            <AnimatedRN.View entering={FadeInDown.delay(500).duration(400)}>
                <Text className="font-inter" style={S.sectionTitle}>Quick Actions</Text>
            </AnimatedRN.View>
            <View style={S.actionGrid}>
                {visibleActions.map((action, i) => (
                    <AnimatedRN.View key={action.id} entering={FadeInDown.delay(550 + i * 60).duration(400)}>
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
                                    <action.iconComponent s={24} c="#FFFFFF" />
                                </View>
                                <Text className="font-inter" style={S.actionTitle}>{action.title}</Text>
                            </LinearGradient>
                        </Pressable>
                    </AnimatedRN.View>
                ))}
            </View>
        </View>
    );
}

// ============ SECTION 5: LEAVE BALANCE + RECENT ATTENDANCE ============

function LeaveBalanceSection({ balances }: { balances: DashboardLeaveBalanceItem[] }) {
    return (
        <AnimatedRN.View entering={FadeInDown.delay(650).duration(400)} style={S.sectionContainer}>
            <View style={S.cardShell}>
                <Text className="font-inter" style={S.cardTitle}>Leave Balance</Text>
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
                                        <Text className="font-inter text-sm font-medium" style={{ color: colors.primary[950] }}>{lb.leaveTypeName}</Text>
                                        <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[500], fontVariant: ['tabular-nums'] }}>
                                            {lb.remaining}/{total} days
                                        </Text>
                                    </View>
                                    <View style={S.leaveBarBg}>
                                        <View style={[S.leaveBarFill, { width: `${percent}%`, backgroundColor: color }] as any} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </AnimatedRN.View>
    );
}

function RecentAttendanceSection({ records }: { records: DashboardAttendanceDay[] }) {
    const last7 = records.slice(0, 7);

    return (
        <AnimatedRN.View entering={FadeInDown.delay(700).duration(400)} style={S.sectionContainer}>
            <View style={S.cardShell}>
                <Text className="font-inter" style={S.cardTitle}>Recent Attendance</Text>
                {last7.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No attendance records found.</Text>
                ) : (
                    <View style={{ gap: 0 }}>
                        {last7.map((day, i) => {
                            const wh = parseWorkedHours(day.workedHours);
                            return (
                                <View key={day.date + i} style={[S.attendanceRow, i < last7.length - 1 && S.attendanceRowBorder]}>
                                    <View style={S.attendanceLeft}>
                                        <Text className="font-inter text-xs font-medium" style={{ color: colors.neutral[600], width: 90 }}>
                                            {formatShortDate(day.date)}
                                        </Text>
                                        <AttendanceStatusBadge status={day.status} />
                                    </View>
                                    <View style={S.attendanceRight}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500], fontVariant: ['tabular-nums'] }}>
                                            {formatTimeShort(day.punchIn)}
                                        </Text>
                                        <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[950], fontVariant: ['tabular-nums'], width: 40, textAlign: 'right' }}>
                                            {wh != null ? `${wh.toFixed(1)}h` : '--'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </AnimatedRN.View>
    );
}

// ============ SECTION 6: MANAGER SECTION ============

function TeamSummaryCard({ summary }: { summary: DashboardTeamSummary }) {
    const { width } = useWindowDimensions();
    const itemWidth = (width - 48 - 40 - 12) / 2;

    const items = [
        { label: 'Present', value: summary.present, icon: <UserCheckIcon s={14} c={colors.success[600]} />, bg: colors.success[50], fg: colors.success[600] },
        { label: 'Absent', value: summary.absent, icon: <UserXIcon s={14} c={colors.danger[600]} />, bg: colors.danger[50], fg: colors.danger[600] },
        { label: 'On Leave', value: summary.onLeave, icon: <UserMinusIcon s={14} c={colors.info[600]} />, bg: colors.info[50], fg: colors.info[600] },
        { label: 'Not Checked In', value: summary.notCheckedIn, icon: <UserCogIcon s={14} c={colors.neutral[500]} />, bg: colors.neutral[100], fg: colors.neutral[500] },
    ];

    return (
        <AnimatedRN.View entering={FadeInDown.delay(750).duration(400)} style={S.sectionContainer}>
            <View style={S.cardShell}>
                <View style={S.cardTitleRow}>
                    <Text className="font-inter" style={S.cardTitle}>Team Summary</Text>
                    <Text className="font-inter text-xs" style={{ color: colors.neutral[400] }}>{summary.total} total members</Text>
                </View>
                <View style={S.teamGrid}>
                    {items.map((item) => (
                        <View key={item.label} style={[S.teamItem, { backgroundColor: item.bg, width: itemWidth }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                {item.icon}
                                <Text className="font-inter" style={S.teamItemLabel}>{item.label}</Text>
                            </View>
                            <Text className="font-inter text-xl font-bold" style={{ color: item.fg, fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </AnimatedRN.View>
    );
}

function PendingApprovalsCard({ approvals }: { approvals: DashboardPendingApproval[] }) {
    const router = useRouter();
    const top3 = approvals.slice(0, 3);

    return (
        <AnimatedRN.View entering={FadeInDown.delay(800).duration(400)} style={S.sectionContainer}>
            <View style={S.cardShell}>
                <View style={S.cardTitleRow}>
                    <Text className="font-inter" style={S.cardTitle}>Pending Approvals</Text>
                    <Text className="font-inter text-xs" style={{ color: colors.neutral[400] }}>{approvals.length} total</Text>
                </View>
                {top3.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No pending approvals.</Text>
                ) : (
                    <View style={{ gap: 10 }}>
                        {top3.map((item) => (
                            <View key={item.id} style={S.approvalItem}>
                                <View style={S.approvalIcon}>
                                    <ClipboardCheckIcon s={16} c={colors.warning[600]} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{item.employeeName}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                        <View style={S.approvalTypeBadge}>
                                            <Text className="font-inter" style={S.approvalTypeText}>{item.type}</Text>
                                        </View>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500], flex: 1 }} numberOfLines={1}>{item.description}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
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
            </View>
        </AnimatedRN.View>
    );
}

// ============ SECTION 7: UPCOMING HOLIDAYS ============

function UpcomingHolidaysList({ holidays }: { holidays: DashboardHoliday[] }) {
    const next5 = holidays.slice(0, 5);

    return (
        <AnimatedRN.View entering={FadeInDown.delay(850).duration(400)} style={S.sectionContainer}>
            <View style={S.cardShell}>
                <Text className="font-inter" style={S.cardTitle}>Upcoming Holidays</Text>
                {next5.length === 0 ? (
                    <Text className="font-inter" style={S.emptyText}>No upcoming holidays.</Text>
                ) : (
                    <View style={{ gap: 0 }}>
                        {next5.map((h, i) => (
                            <View key={h.id} style={[S.holidayRow, i < next5.length - 1 && S.attendanceRowBorder]}>
                                <View style={S.holidayLeft}>
                                    <View style={S.holidayIconBg}>
                                        <CalendarDaysIcon s={18} c={colors.primary[500]} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }} numberOfLines={1}>{h.name}</Text>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500], marginTop: 2 }}>{formatHolidayDate(h.date)}</Text>
                                    </View>
                                </View>
                                <HolidayTypeBadge type={h.type} />
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </AnimatedRN.View>
    );
}

// ============ LOADING STATE ============

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

// ============ MAIN SCREEN ============

export function EmployeeDashboard() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore.use.user();
    const permissions = useAuthStore.use.permissions();
    const firstName = user?.firstName ?? 'there';

    const { data: dashboardResponse, isLoading, refetch } = useDashboard();
    const [pullRefreshing, setPullRefreshing] = React.useState(false);

    const data: DashboardData | undefined = React.useMemo(() => {
        const raw = dashboardResponse as any;
        return raw?.data?.data ?? raw?.data ?? raw;
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

                {/* SECTION 3: Quick Stats */}
                <QuickStatsRow data={data} />

                {/* SECTION 4: Quick Actions */}
                <QuickActionsGrid permissions={permissions} />

                {/* SECTION 5: Leave Balance */}
                <LeaveBalanceSection balances={data.leaveBalances} />

                {/* SECTION 5b: Recent Attendance */}
                <RecentAttendanceSection records={data.recentAttendance} />

                {/* SECTION 6: Manager Section */}
                {showManagerRow && hasTeamData && (
                    <TeamSummaryCard summary={data.teamSummary!} />
                )}
                {showManagerRow && hasPendingApprovals && (
                    <PendingApprovalsCard approvals={data.pendingApprovals} />
                )}

                {/* SECTION 7: Upcoming Holidays */}
                <UpcomingHolidaysList holidays={data.upcomingHolidays} />
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

    // Card Shell
    cardShell: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary[950],
        marginBottom: 14,
    },
    cardTitleRow: {
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
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 12,
        justifyContent: 'center',
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },

    // Shift Hero
    shiftCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    shiftGradient: {
        padding: 24,
        alignItems: 'center',
    },
    shiftClock: {
        fontSize: 42,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
    elapsedBox: {
        marginTop: 14,
        backgroundColor: colors.success[50],
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    workedBox: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    // Badge
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    smallBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    smallBadgeText: {
        fontSize: 10,
        fontWeight: '700',
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
        alignItems: 'center',
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
        marginBottom: 10,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.neutral[900],
        fontVariant: ['tabular-nums'],
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

    // Quick Actions
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
        padding: 16,
        minHeight: 90,
        justifyContent: 'flex-end',
    },
    actionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    actionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
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
    attendanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    attendanceRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    attendanceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
    },
    attendanceRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    // Team Summary
    teamGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    teamItem: {
        borderRadius: 14,
        padding: 12,
    },
    teamItemLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.neutral[400],
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },

    // Pending Approvals
    approvalItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        backgroundColor: colors.neutral[50],
        borderRadius: 14,
    },
    approvalIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.warning[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    approvalTypeBadge: {
        backgroundColor: colors.accent[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    approvalTypeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.accent[700],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    viewAllButton: {
        marginTop: 14,
        paddingVertical: 10,
        backgroundColor: colors.primary[50],
        borderRadius: 14,
        alignItems: 'center',
    },

    // Holidays
    holidayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    holidayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    holidayIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty
    emptyText: {
        fontSize: 13,
        color: colors.neutral[400],
        paddingVertical: 8,
    },
});
