/* eslint-disable better-tailwindcss/no-unknown-classes */
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as React from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import AnimatedRN, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Line } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';

import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { client } from '@/lib/api/client';
import { enqueuePunch, getQueueLength, syncQueue } from '@/lib/offline-punch-queue';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_H = 64;
const THUMB_SIZE = 52;
const TRACK_W = SCREEN_WIDTH - 64;
const MAX_SLIDE = TRACK_W - THUMB_SIZE - 8;

/* ── Types ── */

interface ShiftBreakInfo {
    id: string;
    name: string;
    startTime: string | null;
    duration: number;
    type: string;
    isPaid: boolean;
}

interface AttendanceRecord {
    id: string;
    punchIn: string | null;
    punchOut: string | null;
    workedHours: number | string | null;
    status: string;
    geoStatus: string | null;
    shift?: { name: string; startTime?: string; endTime?: string; breaks?: ShiftBreakInfo[] } | null;
    location?: { name: string } | null;
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
}

interface RecentAttendanceRecord {
    id: string;
    date: string;
    punchIn: string | null;
    punchOut: string | null;
    workedHours: number | null;
    status: string;
    overtimeHours: number | null;
    geoStatus: string | null;
    source: string | null;
    shiftName: string | null;
}

type AttStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NOT_LINKED';

/* ── Status Colors for attendance records ── */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PRESENT: { bg: colors.success[50], text: colors.success[700] },
    ABSENT: { bg: colors.danger[50], text: colors.danger[700] },
    LATE: { bg: colors.warning[50], text: colors.warning[700] },
    HALF_DAY: { bg: colors.warning[50], text: colors.warning[600] },
    EARLY_EXIT: { bg: colors.warning[50], text: colors.warning[700] },
    ON_LEAVE: { bg: colors.primary[50], text: colors.primary[700] },
    HOLIDAY: { bg: colors.accent[50], text: colors.accent[700] },
    WEEK_OFF: { bg: colors.neutral[100], text: colors.neutral[600] },
    INCOMPLETE: { bg: colors.danger[50], text: colors.danger[600] },
    LOP: { bg: colors.danger[50], text: colors.danger[700] },
};

/* ── Helpers ── */

// fmtTime removed — use fmt.time() from useCompanyFormatter inside components

const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const parseWorkedHours = (value: number | string | null | undefined): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

/* ── Icons ── */

const svgProps = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ClockIcon = ({ s = 20, c = '#fff' }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>
);
const CheckIcon = ({ s = 20, c = '#fff' }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" /></Svg>
);
const ArrowIcon = ({ s = 22, c = '#fff' }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none"><Path d="M13 5l7 7-7 7" /><Path d="M6 12h14" /></Svg>
);
const MapPinIcon = ({ s = 16, c = colors.primary[500] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><Circle cx="12" cy="10" r="3" /></Svg>
);
const ShieldIcon = ({ s = 14, c = colors.success[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
);
const WarnIcon = ({ s = 14, c = colors.warning[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><Line x1="12" y1="9" x2="12" y2="13" /><Line x1="12" y1="17" x2="12.01" y2="17" /></Svg>
);
const BriefIcon = ({ s = 16, c = colors.primary[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><Path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></Svg>
);
const ActivityIcon = ({ s = 16, c = colors.success[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
);
const CalendarIcon = ({ s = 16, c = colors.primary[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" /></Svg>
);
const TimerIcon = ({ s = 16, c = colors.success[600] }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} {...svgProps}><Circle cx="12" cy="13" r="8" /><Path d="M12 9v4l2 2" /><Path d="M5 3L2 6" /><Path d="M22 6l-3-3" /><Line x1="12" y1="1" x2="12" y2="3" /></Svg>
);

/* ── Status Badge ── */

function StatusBadge({ status }: { status: AttStatus }) {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
        NOT_CHECKED_IN: { bg: colors.neutral[100], fg: colors.neutral[600], label: 'Not Checked In' },
        CHECKED_IN: { bg: colors.success[50], fg: colors.success[700], label: 'Checked In' },
        CHECKED_OUT: { bg: colors.primary[50], fg: colors.primary[700], label: 'Checked Out' },
        NOT_LINKED: { bg: colors.warning[50], fg: colors.warning[700], label: 'Not Linked' },
    };
    const c = map[status] ?? map.NOT_CHECKED_IN;
    return (
        <View style={[$.badge, { backgroundColor: c.bg }]}>
            <Text className="font-inter text-xs font-bold" style={{ color: c.fg }}>{c.label}</Text>
        </View>
    );
}

/* ── Info Card ── */

function Card({ icon, title, children, delay = 0 }: { icon: React.ReactNode; title: string; children: React.ReactNode; delay?: number }) {
    return (
        <AnimatedRN.View entering={FadeInDown.duration(400).delay(delay)} style={$.card}>
            <View style={$.cardHead}>
                <View style={$.cardIcon}>{icon}</View>
                <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{title}</Text>
            </View>
            {children}
        </AnimatedRN.View>
    );
}

/* ── Slide-to-Action (stable PanResponder) ── */

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

    // Reset when mode changes
    React.useEffect(() => {
        pan.setValue(0);
        completedRef.current = false;
    }, [mode, pan]);

    const responder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
            onPanResponderGrant: () => {
                completedRef.current = false;
            },
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
    const label = isDone ? 'Shift Complete' : loading ? 'Processing...' : isCheckIn ? 'Slide to Check In →' : 'Slide to Check Out →';

    return (
        <AnimatedRN.View entering={FadeInDown.duration(400).delay(200)} style={{ alignItems: 'center' }}>
            <View style={[$.track, { backgroundColor: trackColor, width: TRACK_W }]}>
                <Text className="font-inter text-sm font-semibold" style={$.trackLabel}>{label}</Text>
                {!isDone && (
                    <Animated.View
                        {...responder.panHandlers}
                        style={[$.thumb, { transform: [{ translateX: pan }] }]}
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
                    <View style={[$.thumb, { position: 'absolute', left: MAX_SLIDE / 2 }]}>
                        <CheckIcon s={20} c={colors.neutral[500]} />
                    </View>
                )}
            </View>
        </AnimatedRN.View>
    );
}

/* ── Main ── */

export function ShiftCheckInScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const qc = useQueryClient();
    const fmt = useCompanyFormatter();
    const fmtTime = (iso?: string | null) => !iso ? '--:--' : fmt.time(iso);

    // Live clock — only updates the display string to avoid full re-renders
    const [clockStr, setClockStr] = React.useState(() => fmt.timeWithSeconds(new Date().toISOString()));
    const [dateStr] = React.useState(() => fmt.date(new Date().toISOString()));
    React.useEffect(() => {
        const id = setInterval(() => {
            setClockStr(fmt.timeWithSeconds(new Date().toISOString()));
        }, 1000);
        return () => clearInterval(id);
    }, [fmt]);

    // GPS with expo-location (proper permission handling)
    const [geo, setGeo] = React.useState<{ lat: number; lng: number } | null>(null);
    const [geoErr, setGeoErr] = React.useState<string | null>(null);
    const geoFetched = React.useRef(false);
    React.useEffect(() => {
        if (geoFetched.current) return;
        geoFetched.current = true;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setGeoErr('Location permission denied');
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setGeo({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            } catch (e: any) {
                setGeoErr(e?.message ?? 'Location unavailable');
            }
        })();
    }, []);

    // Offline punch queue
    const [offlineCount, setOfflineCount] = React.useState(getQueueLength);

    React.useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected && getQueueLength() > 0) {
                syncQueue((url, body) => client.post(url, body)).then(({ synced }) => {
                    if (synced > 0) {
                        setOfflineCount(getQueueLength());
                        qc.invalidateQueries({ queryKey: ['attendance', 'my-status'] });
                    }
                });
            }
        });
        return () => unsubscribe();
    }, [qc]);

    // Attendance status — background polling keeps previous data visible (no skeleton flash on refetch)
    const [pullRefreshing, setPullRefreshing] = React.useState(false);
    const { data: statusData, isPending, refetch } = useQuery({
        queryKey: ['attendance', 'my-status'],
        queryFn: async () => {
            const r = await client.get('/hr/attendance/my-status');
            return (r as any)?.data?.data ?? (r as any)?.data ?? r;
        },
        placeholderData: keepPreviousData,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
    });

    const onPullRefresh = React.useCallback(async () => {
        setPullRefreshing(true);
        try {
            await refetch();
        } finally {
            setPullRefreshing(false);
        }
    }, [refetch]);

    const attStatus: AttStatus = statusData?.status ?? 'NOT_CHECKED_IN';
    const record: AttendanceRecord | null = statusData?.record ?? null;
    const workedHours = parseWorkedHours(record?.workedHours);
    // Shift info: from the attendance record if checked in, or from currentShift if not yet checked in
    const shiftInfo = record?.shift ?? (statusData as any)?.currentShift ?? null;

    // Elapsed timer
    const [elapsed, setElapsed] = React.useState(0);
    React.useEffect(() => {
        if (attStatus !== 'CHECKED_IN' || !record?.punchIn) { setElapsed(0); return; }
        const base = statusData?.elapsedSeconds ?? Math.floor((Date.now() - new Date(record.punchIn).getTime()) / 1000);
        const start = Date.now();
        setElapsed(base);
        const id = setInterval(() => setElapsed(base + Math.floor((Date.now() - start) / 1000)), 1000);
        return () => clearInterval(id);
    }, [attStatus, record?.punchIn, statusData?.elapsedSeconds]);

    // Mutations
    const checkInMut = useMutation({
        mutationFn: async () => {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) {
                enqueuePunch({
                    type: 'check-in',
                    timestamp: new Date().toISOString(),
                    latitude: geo?.lat,
                    longitude: geo?.lng,
                });
                setOfflineCount(getQueueLength());
                return { offline: true };
            }
            const body: any = {};
            if (geo) { body.latitude = geo.lat; body.longitude = geo.lng; }
            return (await client.post('/hr/attendance/check-in', body) as any).data;
        },
        onSuccess: () => {
            showSuccess('Checked In', 'Attendance recorded successfully');
            qc.invalidateQueries({ queryKey: ['attendance', 'my-status'] });
            qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to check in. Please try again.';
            showErrorMessage(msg);
        },
    });
    const checkOutMut = useMutation({
        mutationFn: async () => {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) {
                enqueuePunch({
                    type: 'check-out',
                    timestamp: new Date().toISOString(),
                    latitude: geo?.lat,
                    longitude: geo?.lng,
                });
                setOfflineCount(getQueueLength());
                return { offline: true };
            }
            const body: any = {};
            if (geo) { body.latitude = geo.lat; body.longitude = geo.lng; }
            return (await client.post('/hr/attendance/check-out', body) as any).data;
        },
        onSuccess: () => {
            showSuccess('Checked Out', 'Have a great day!');
            qc.invalidateQueries({ queryKey: ['attendance', 'my-status'] });
            qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to check out. Please try again.';
            showErrorMessage(msg);
        },
    });

    const isBusy = checkInMut.isPending || checkOutMut.isPending;
    const slideMode = attStatus === 'CHECKED_OUT' ? 'done' : attStatus === 'CHECKED_IN' ? 'checkout' : 'checkin';

    const handleSlideComplete = React.useCallback(() => {
        if (slideMode === 'checkin') checkInMut.mutate();
        else if (slideMode === 'checkout') checkOutMut.mutate();
    }, [slideMode]);

    // Location & geofence info — available both before and after check-in
    const locationInfo = record?.location ?? (statusData as any)?.location ?? null;
    const assignedGeofence = (statusData as any)?.assignedGeofence ?? null;
    const locationGeofences: any[] = (statusData as any)?.location?.geofences ?? [];

    // Geo status
    const geoLabel = record?.geoStatus === 'INSIDE_GEOFENCE' ? 'Inside geofence'
        : record?.geoStatus === 'OUTSIDE_GEOFENCE' ? 'Outside geofence'
        : assignedGeofence ? `Geofence: ${assignedGeofence.name}`
        : locationGeofences.length > 0 ? `${locationGeofences.length} geofence(s)`
        : geo ? 'Location acquired' : 'No location';
    const geoColor = record?.geoStatus === 'INSIDE_GEOFENCE' ? colors.success[600]
        : record?.geoStatus === 'OUTSIDE_GEOFENCE' ? colors.warning[600]
        : (assignedGeofence || locationGeofences.length > 0) ? colors.primary[600]
        : colors.neutral[500];
    const geoBg = record?.geoStatus === 'INSIDE_GEOFENCE' ? colors.success[50]
        : record?.geoStatus === 'OUTSIDE_GEOFENCE' ? colors.warning[50]
        : (assignedGeofence || locationGeofences.length > 0) ? colors.primary[50]
        : colors.neutral[100];

    return (
        <View style={$.root}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[$.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={$.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text className="font-inter text-white text-lg font-bold">Attendance</Text>
                        <Text className="font-inter text-white/70 text-xs mt-0.5">{dateStr}</Text>
                    </View>
                </View>
            </LinearGradient>

            {isPending ? (
                <View style={{ padding: 20, gap: 16 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={$.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={pullRefreshing}
                            onRefresh={onPullRefresh}
                            tintColor={colors.primary[500]}
                        />
                    }
                >
                    {/* Clock Card */}
                    <AnimatedRN.View entering={FadeInDown.duration(400).delay(100)} style={$.clockCard}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={$.clockIconBg}><ClockIcon s={18} c={colors.primary[600]} /></View>
                            <Text className="font-inter text-center" style={$.clockText}>{clockStr}</Text>
                            <View style={{ marginTop: 10 }}><StatusBadge status={attStatus} /></View>
                            {offlineCount > 0 && (
                                <View style={$.offlineBadge}>
                                    <WarnIcon s={12} c={colors.warning[800]} />
                                    <Text className="font-inter text-xs" style={{ color: colors.warning[800] }}>
                                        {offlineCount} offline punch{offlineCount > 1 ? 'es' : ''} pending sync
                                    </Text>
                                </View>
                            )}
                        </View>
                        {attStatus === 'CHECKED_IN' && (
                            <View style={$.elapsedBox}>
                                <TimerIcon s={15} c={colors.success[600]} />
                                <Text className="font-inter text-lg font-bold" style={{ color: colors.success[700], fontVariant: ['tabular-nums'] }}>{fmtDur(elapsed)}</Text>
                                <Text className="font-inter text-xs" style={{ color: colors.success[500] }}>elapsed</Text>
                            </View>
                        )}
                    </AnimatedRN.View>

                    {/* Slider */}
                    <SlideAction mode={slideMode} onComplete={handleSlideComplete} loading={isBusy} />

                    {/* Schedule */}
                    <Card icon={<BriefIcon />} title="Today's Schedule" delay={300}>
                        {shiftInfo ? (
                            <View style={{ gap: 6 }}>
                                <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{shiftInfo.name}</Text>
                                <View style={$.cols}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Start</Text>
                                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{shiftInfo.startTime ? fmt.shiftTime(shiftInfo.startTime) : '--'}</Text>
                                    </View>
                                    <View style={$.vDiv} />
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>End</Text>
                                        <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{shiftInfo.endTime ? fmt.shiftTime(shiftInfo.endTime) : '--'}</Text>
                                    </View>
                                </View>
                                {shiftInfo.breaks && shiftInfo.breaks.length > 0 && (
                                    <View style={{ marginTop: 6, gap: 4 }}>
                                        <Text className="font-inter text-xs font-semibold" style={{ color: colors.neutral[500] }}>Breaks</Text>
                                        {shiftInfo.breaks.map((b: ShiftBreakInfo) => (
                                            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: b.isPaid ? colors.success[500] : colors.warning[500] }} />
                                                <Text className="font-inter text-xs" style={{ color: colors.neutral[600], flex: 1 }}>
                                                    {b.name}{b.startTime ? ` at ${fmt.shiftTime(b.startTime)}` : ''} — {b.duration}min{b.isPaid ? ' (paid)' : ''}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <Text className="font-inter text-xs" style={{ color: colors.neutral[400] }}>No shift assigned</Text>
                        )}
                    </Card>

                    {/* Location */}
                    <Card icon={<MapPinIcon s={16} c={colors.accent[600]} />} title="Location" delay={400}>
                        <View style={{ gap: 8 }}>
                            {locationInfo && (
                                <Text className="font-inter text-sm font-semibold" style={{ color: colors.primary[950] }}>{locationInfo.name}</Text>
                            )}
                            <View style={[$.geoPill, { backgroundColor: geoBg }]}>
                                {record?.geoStatus === 'INSIDE_GEOFENCE' ? <ShieldIcon /> : record?.geoStatus === 'OUTSIDE_GEOFENCE' ? <WarnIcon /> : <MapPinIcon s={14} c={geoColor} />}
                                <Text className="font-inter text-xs font-semibold" style={{ color: geoColor }}>{geoLabel}</Text>
                            </View>
                            {geo && (
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[400], fontVariant: ['tabular-nums'] }}>
                                    {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
                                </Text>
                            )}
                            {geoErr && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <WarnIcon s={12} c={colors.warning[600]} />
                                    <Text className="font-inter text-xs" style={{ color: colors.warning[600] }}>{geoErr}</Text>
                                </View>
                            )}
                        </View>
                    </Card>

                    {/* Summary */}
                    <Card icon={<ActivityIcon />} title="Work Summary" delay={500}>
                        <View style={$.sumGrid}>
                            <View style={$.sumItem}>
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Check In</Text>
                                <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{fmtTime(record?.punchIn)}</Text>
                            </View>
                            <View style={[$.sumItem, $.sumCenter]}>
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Duration</Text>
                                <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950], fontVariant: ['tabular-nums'] }}>
                                    {attStatus === 'CHECKED_IN' ? fmtDur(elapsed) : workedHours != null ? `${workedHours.toFixed(1)} hrs` : '--'}
                                </Text>
                            </View>
                            <View style={$.sumItem}>
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[500] }}>Check Out</Text>
                                <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>{fmtTime(record?.punchOut)}</Text>
                            </View>
                        </View>
                    </Card>

                    {/* Recent Attendance */}
                    {(statusData as any)?.recentAttendance && (statusData as any).recentAttendance.length > 0 && (
                        <AnimatedRN.View entering={FadeInUp.duration(350).delay(200)} style={$.recentCard}>
                            <View style={$.recentHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={$.cardIcon}><CalendarIcon /></View>
                                    <Text className="font-inter text-sm font-bold" style={{ color: colors.primary[950] }}>Recent Attendance</Text>
                                </View>
                                <Text className="font-inter text-xs" style={{ color: colors.neutral[400] }}>Last 7 days</Text>
                            </View>
                            {((statusData as any).recentAttendance as RecentAttendanceRecord[]).map((rec) => (
                                <View key={rec.id} style={$.recentRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs font-semibold" style={{ color: colors.primary[950] }}>
                                            {fmt.date(rec.date)}
                                        </Text>
                                        <Text className="font-inter text-[10px]" style={{ color: colors.neutral[400] }}>
                                            {rec.punchIn ? fmt.time(rec.punchIn) : '--:--'} → {rec.punchOut ? fmt.time(rec.punchOut) : '--:--'}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'center', minWidth: 50 }}>
                                        <Text className="font-inter text-xs" style={{ color: colors.neutral[600], fontVariant: ['tabular-nums'] }}>
                                            {rec.workedHours != null ? `${rec.workedHours.toFixed(1)}h` : '--'}
                                        </Text>
                                    </View>
                                    <View style={[$.recentStatusBadge, { backgroundColor: STATUS_COLORS[rec.status]?.bg ?? colors.neutral[100] }]}>
                                        <Text className="font-inter" style={{ color: STATUS_COLORS[rec.status]?.text ?? colors.neutral[600], fontSize: 10, fontWeight: '700' }}>
                                            {rec.status?.replace(/_/g, ' ')}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </AnimatedRN.View>
                    )}

                    <View style={{ height: insets.bottom + 24 }} />
                </ScrollView>
            )}
        </View>
    );
}

/* ── Styles ── */

const $ = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.gradient.surface },
    header: { paddingHorizontal: 20, paddingBottom: 18 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    content: { padding: 20, gap: 16 },

    clockCard: {
        backgroundColor: colors.white, borderRadius: 16, padding: 24,
        borderWidth: 1, borderColor: colors.neutral[100],
        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
    },
    clockIconBg: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50],
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    clockText: {
        fontSize: 40, fontWeight: '800', color: colors.primary[950],
        fontVariant: ['tabular-nums'], letterSpacing: 2, lineHeight: 48,
    },
    elapsedBox: {
        marginTop: 16, backgroundColor: colors.success[50], borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },

    track: {
        height: TRACK_H, borderRadius: 16, justifyContent: 'center', alignSelf: 'center', overflow: 'hidden',
    },
    trackLabel: {
        position: 'absolute', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.85)',
    },
    thumb: {
        width: THUMB_SIZE, height: THUMB_SIZE - 8, borderRadius: 12, marginLeft: 4,
        backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4,
    },

    card: {
        backgroundColor: colors.white, borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: colors.neutral[100],
        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    cardIcon: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary[50],
        alignItems: 'center', justifyContent: 'center',
    },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    geoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },

    cols: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    vDiv: { width: 1, height: 28, backgroundColor: colors.neutral[200] },

    sumGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    sumItem: { alignItems: 'center', flex: 1 },
    sumCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.neutral[100] },

    offlineBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.warning[50], borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 6, marginTop: 8,
    },

    recentCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.neutral[100],
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    recentStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
});
