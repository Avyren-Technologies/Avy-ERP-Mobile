/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import { FlashList } from '@shopify/flash-list';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Calendar as CalendarIcon, ChevronDown, List as ListIcon, SlidersHorizontal } from 'lucide-react-native';
import * as React from 'react';
import {
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useAttendanceCalendar,
    useAttendanceRangeSummary,
    useAttendanceRecords,
    useAttendanceSummary,
    useWeeklyReview,
    useWeeklyReviewSummary,
} from '@/features/company-admin/api/use-attendance-queries';
import { useMarkReviewed } from '@/features/company-admin/api/use-attendance-mutations';
import { useCompanyLocations, useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import { useDepartments, useDesignations, useEmployeeTypes } from '@/features/company-admin/api/use-hr-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import {
    AttendanceFilterSheet,
    type AttendanceFilterValues,
    type FilterOption,
} from './attendance-filter-sheet';

// ============ TYPES ============

type TabKey = 'daily' | 'weekly' | 'monthly' | 'custom';
type ViewMode = 'list' | 'calendar';

interface SummaryItem {
    label: string;
    value: number | string;
    color: string;
    bgColor: string;
    icon: string;
}

interface AttendanceHalf {
    id: string;
    half: 'FIRST_HALF' | 'SECOND_HALF';
    status: string;
    leaveType?: { id: string; name: string; code?: string } | null;
}

interface AttendanceRecord {
    id: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    departmentId: string;
    designation: string;
    date: string;
    punchIn: string;
    punchOut: string;
    workedHours: number;
    status: string;
    isLate: boolean;
    lateMinutes: number | null;
    isEarlyExit: boolean;
    earlyMinutes: number | null;
    overtimeHours: number | null;
    shiftName: string;
    shiftTime: string;
    finalStatusReason: string;
    source: string;
    halves: AttendanceHalf[];
    location?: string;
    isRegularized?: boolean;
    appliedBreakDeductionMinutes?: number;
}

interface DepartmentBreakdown {
    id: string;
    name: string;
    present: number;
    total: number;
}

interface DailyTrendEntry {
    date: string;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    holiday: number;
    weekOff: number;
    total: number;
}

interface CalendarDay {
    date: string;
    status: string;
    punchIn?: string;
    punchOut?: string;
    workedHours?: number;
    isLate?: boolean;
    lateMinutes?: number;
    overtimeHours?: number;
    leaveTypeName?: string;
    shiftName?: string;
    recordId?: string;
}

interface CalendarEmployee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentName?: string;
    designationName?: string;
    days: CalendarDay[];
    totals?: Record<string, number>;
}

// ============ HELPERS ============

function getInitials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
}

function toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(year: number, monthIdx0: number): Date {
    return new Date(year, monthIdx0, 1);
}

function endOfMonth(year: number, monthIdx0: number): Date {
    return new Date(year, monthIdx0 + 1, 0);
}

function daysBetween(from: string, to: string): number {
    const f = new Date(from);
    const t = new Date(to);
    return Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
}

function formatMinutes(mins: number): string {
    if (mins < 60) return `${mins} Min`;
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const remaining = mins % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} Hr`);
    if (remaining > 0) parts.push(`${remaining} Min`);
    return parts.join(' ');
}

const MONTH_NAMES_FULL = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============ STATUS BADGE ============

const STATUS_LETTER: Record<string, string> = {
    PRESENT: 'P',
    ABSENT: 'A',
    LOP: 'L',
    HALF_DAY: 'H',
    LATE: 'T',
    INCOMPLETE: 'I',
    ON_LEAVE: 'V',
    HOLIDAY: 'H',
    WEEK_OFF: 'W',
    EARLY_EXIT: 'E',
};

function statusColor(status: string): { bg: string; fg: string } {
    const key = status?.toUpperCase();
    switch (key) {
        case 'PRESENT':
            return { bg: colors.success[500], fg: colors.white };
        case 'ABSENT':
        case 'LOP':
            return { bg: colors.danger[500], fg: colors.white };
        case 'HALF_DAY':
        case 'LATE':
        case 'INCOMPLETE':
        case 'EARLY_EXIT':
            return { bg: colors.warning[500], fg: colors.white };
        case 'ON_LEAVE':
        case 'HOLIDAY':
            return { bg: colors.info[500], fg: colors.white };
        case 'WEEK_OFF':
            return { bg: colors.neutral[400], fg: colors.white };
        default:
            return { bg: colors.neutral[300], fg: colors.white };
    }
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string }> = {
        PRESENT: { bg: colors.success[50], text: 'text-success-700' },
        ABSENT: { bg: colors.danger[50], text: 'text-danger-700' },
        LOP: { bg: colors.danger[50], text: 'text-danger-700' },
        HALF_DAY: { bg: colors.warning[50], text: 'text-warning-700' },
        LATE: { bg: colors.warning[50], text: 'text-warning-700' },
        INCOMPLETE: { bg: colors.warning[50], text: 'text-warning-700' },
        ON_LEAVE: { bg: colors.info[50], text: 'text-info-700' },
        HOLIDAY: { bg: colors.info[50], text: 'text-info-700' },
        WEEK_OFF: { bg: colors.neutral[100], text: 'text-neutral-600 dark:text-neutral-400' },
        EARLY_EXIT: { bg: colors.warning[50], text: 'text-warning-700' },
    };
    const key = status?.toUpperCase();
    const c = config[key] ?? config.PRESENT;
    const label = status?.replace(/_/g, ' ');
    return (
        <View style={baseStyles.statusBadge as any} pointerEvents="none">
            <View style={[baseStyles.statusBadge, { backgroundColor: c.bg }]}>
                <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{label}</Text>
            </View>
        </View>
    );
}

function LateBadge() {
    return (
        <View style={[baseStyles.statusBadge, { backgroundColor: colors.warning[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-warning-700">Late</Text>
        </View>
    );
}

// ============ KPI CARD ============

function KpiCard({ item, index, isDark }: { item: SummaryItem; index: number; isDark: boolean }) {
    return (
        <Animated.View
            entering={FadeInUp.duration(300).delay(60 + index * 40)}
            style={[
                baseStyles.kpiCard,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    borderLeftColor: item.color,
                    borderLeftWidth: 3,
                },
            ]}
        >
            <Text className="font-inter text-xl font-bold" style={{ color: item.color }}>
                {item.value}
            </Text>
            <Text
                className="mt-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                numberOfLines={1}
            >
                {item.label}
            </Text>
        </Animated.View>
    );
}

// ============ DEPARTMENT BAR ============

function DepartmentBar({ item }: { item: DepartmentBreakdown }) {
    const pct = item.total > 0 ? (item.present / item.total) * 100 : 0;
    return (
        <View style={baseStyles.deptRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                    className="font-inter text-xs font-semibold text-primary-950 dark:text-white"
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400">
                    {item.present}/{item.total} present
                </Text>
            </View>
            <View style={baseStyles.barBg}>
                <View style={[baseStyles.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
            </View>
            <Text
                className="ml-2 font-inter text-xs font-bold text-primary-700"
                style={{ width: 36, textAlign: 'right' }}
            >
                {Math.round(pct)}%
            </Text>
        </View>
    );
}

// ============ DAILY TREND CHART ============

function DailyTrendChart({ trend, isDark }: { trend: DailyTrendEntry[]; isDark: boolean }) {
    const maxTotal = React.useMemo(() => {
        let max = 0;
        for (const t of trend) {
            if (t.total > max) max = t.total;
        }
        return Math.max(max, 1);
    }, [trend]);

    if (trend.length === 0) return null;

    const BAR_W = 24;
    const BAR_H = 80;

    return (
        <Animated.View
            entering={FadeInUp.duration(300).delay(180)}
            style={[
                baseStyles.sectionCard,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}
        >
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Daily Trend
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    {trend.map((t) => {
                        const presentH = (t.present / maxTotal) * BAR_H;
                        const absentH = (t.absent / maxTotal) * BAR_H;
                        const day = new Date(t.date).getDate();
                        return (
                            <View key={t.date} style={{ alignItems: 'center', width: BAR_W }}>
                                <View
                                    style={{
                                        width: BAR_W,
                                        height: BAR_H,
                                        justifyContent: 'flex-end',
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        backgroundColor: isDark ? '#13112B' : colors.neutral[100],
                                    }}
                                >
                                    <View
                                        style={{
                                            width: BAR_W,
                                            height: absentH,
                                            backgroundColor: colors.danger[400],
                                        }}
                                    />
                                    <View
                                        style={{
                                            width: BAR_W,
                                            height: presentH,
                                            backgroundColor: colors.success[500],
                                        }}
                                    />
                                </View>
                                <Text className="mt-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                    {day}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
            <View
                style={{
                    flexDirection: 'row',
                    gap: 12,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.success[500] }} />
                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                        Present
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.danger[400] }} />
                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                        Absent
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ DATE PICKER ============

function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const fmt = useCompanyFormatter();
    const goBack = () => {
        const d = new Date(value);
        d.setDate(d.getDate() - 1);
        onChange(d);
    };
    const goForward = () => {
        const d = new Date(value);
        d.setDate(d.getDate() + 1);
        onChange(d);
    };
    const isToday = new Date().toDateString() === value.toDateString();

    return (
        <View style={baseStyles.datePicker}>
            <Pressable onPress={goBack} style={baseStyles.dateArrow} hitSlop={8}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    {fmt.date(value.toISOString())}
                </Text>
                {isToday && <Text className="font-inter text-[10px] text-primary-500">Today</Text>}
            </View>
            <Pressable onPress={goForward} style={baseStyles.dateArrow} hitSlop={8}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
        </View>
    );
}

// ============ DEPARTMENT FILTER (Daily tab) ============

function DepartmentFilter({
    departments,
    selectedId,
    onSelect,
}: {
    departments: DepartmentBreakdown[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
        >
            <Pressable onPress={() => onSelect('')} style={[baseStyles.filterChip, !selectedId && baseStyles.filterChipActive]}>
                <Text className={`font-inter text-xs font-semibold ${!selectedId ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                    All
                </Text>
            </Pressable>
            {departments.map((d) => {
                const active = d.id === selectedId;
                return (
                    <Pressable
                        key={d.id}
                        onPress={() => onSelect(d.id)}
                        style={[baseStyles.filterChip, active && baseStyles.filterChipActive]}
                    >
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                            {d.name}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ SOURCE LABELS ============

const SOURCE_LABELS: Record<string, string> = {
    MOBILE_GPS: 'Mobile',
    WEB: 'Web',
    BIOMETRIC: 'Biometric',
    MANUAL: 'Manual',
    SYSTEM: 'System',
    HR_BOOK: 'HR Book',
    WEB_PORTAL: 'Web Portal',
    FACE_RECOGNITION: 'Face ID',
    IOT: 'IoT',
    SMART_CARD: 'Smart Card',
};

// ============ ATTENDANCE RECORD CARD ============

function RecordCard({
    item,
    index,
    onPress,
    showDate,
}: {
    item: AttendanceRecord;
    index: number;
    onPress: (r: AttendanceRecord) => void;
    showDate?: boolean;
}) {
    const fmt = useCompanyFormatter();
    const formatTime = (time: string) => (!time ? '--:--' : fmt.time(time));
    const initials = getInitials(item.employeeName);
    const hrs =
        typeof item.workedHours === 'number' && Number.isFinite(item.workedHours)
            ? item.workedHours
            : typeof item.workedHours === 'string'
                ? parseFloat(item.workedHours) || 0
                : 0;
    const otHrs = item.overtimeHours != null && item.overtimeHours > 0 ? item.overtimeHours : null;

    const firstHalf = item.halves?.find((h) => h.half === 'FIRST_HALF');
    const secondHalf = item.halves?.find((h) => h.half === 'SECOND_HALF');

    return (
        <Animated.View entering={FadeInUp.duration(300).delay(40 + index * 20)}>
            <Pressable onPress={() => onPress(item)}>
                <View style={baseStyles.card}>
                    <View style={baseStyles.cardRow}>
                        <View style={baseStyles.avatar}>
                            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text
                                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                    numberOfLines={1}
                                >
                                    {item.employeeName}
                                </Text>
                                {item.isLate && <LateBadge />}
                            </View>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                {item.employeeCode}
                                {item.department ? ` • ${item.department}` : ''}
                            </Text>
                            {item.shiftName ? (
                                <Text
                                    className="font-inter text-[10px] text-neutral-400"
                                    numberOfLines={1}
                                >
                                    {item.shiftName} ({item.shiftTime})
                                </Text>
                            ) : null}
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    {(firstHalf || secondHalf) && (
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                marginTop: 8,
                                paddingTop: 8,
                                borderTopWidth: 1,
                                borderTopColor: colors.neutral[100],
                            }}
                        >
                            {firstHalf && (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text className="font-inter text-[9px] font-bold text-neutral-400">1st:</Text>
                                    <StatusBadge status={firstHalf.status} />
                                </View>
                            )}
                            {secondHalf && (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text className="font-inter text-[9px] font-bold text-neutral-400">2nd:</Text>
                                    <StatusBadge status={secondHalf.status} />
                                </View>
                            )}
                        </View>
                    )}

                    <View style={baseStyles.cardMeta}>
                        {showDate && item.date ? (
                            <View style={baseStyles.metaChip}>
                                <Text className="font-inter text-[10px] font-semibold text-primary-700">
                                    {fmt.date(item.date)}
                                </Text>
                            </View>
                        ) : null}
                        <View style={baseStyles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                In: {formatTime(item.punchIn)}
                            </Text>
                        </View>
                        <View style={baseStyles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                Out: {formatTime(item.punchOut)}
                            </Text>
                        </View>
                        <View style={baseStyles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                {hrs > 0 ? `${hrs.toFixed(1)} hrs` : '--'}
                            </Text>
                        </View>
                        {item.isLate && item.lateMinutes ? (
                            <View style={[baseStyles.metaChip, { backgroundColor: colors.warning[50] }]}>
                                <Text
                                    className="font-inter text-[10px] font-semibold"
                                    style={{ color: colors.warning[700] }}
                                >
                                    Late {formatMinutes(item.lateMinutes)}
                                </Text>
                            </View>
                        ) : null}
                        {item.isEarlyExit && item.earlyMinutes ? (
                            <View style={[baseStyles.metaChip, { backgroundColor: colors.danger[50] }]}>
                                <Text
                                    className="font-inter text-[10px] font-semibold"
                                    style={{ color: colors.danger[700] }}
                                >
                                    Early -{item.earlyMinutes}m
                                </Text>
                            </View>
                        ) : null}
                        {otHrs != null && (
                            <View style={[baseStyles.metaChip, { backgroundColor: colors.success[50] }]}>
                                <Text
                                    className="font-inter text-[10px] font-semibold"
                                    style={{ color: colors.success[700] }}
                                >
                                    OT {otHrs.toFixed(1)}h
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ RECORD DETAIL MODAL ============

function RecordDetailModal({
    record,
    onClose,
}: {
    record: AttendanceRecord;
    onClose: () => void;
}) {
    const fmt = useCompanyFormatter();
    const isDark = useIsDark();
    const formatTime = (time: string) => (!time ? '—' : fmt.timeWithSeconds(time));
    const hrs =
        typeof record.workedHours === 'number' && Number.isFinite(record.workedHours)
            ? record.workedHours
            : 0;
    const firstHalf = record.halves?.find((h) => h.half === 'FIRST_HALF');
    const secondHalf = record.halves?.find((h) => h.half === 'SECOND_HALF');
    const otHrs = record.overtimeHours != null && record.overtimeHours > 0 ? record.overtimeHours : null;

    return (
        <Pressable
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 100,
            }}
            onPress={onClose}
        >
            <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                    width: '90%',
                    maxHeight: '80%',
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderRadius: 24,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 24,
                    elevation: 10,
                }}
            >
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    <View
                        style={{
                            padding: 20,
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100],
                        }}
                    >
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                            {record.employeeName}
                        </Text>
                        <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                            {record.employeeCode}
                            {record.department ? ` · ${record.department}` : ''}
                            {record.designation ? ` · ${record.designation}` : ''}
                        </Text>
                        {record.date ? (
                            <Text className="mt-0.5 font-inter text-xs font-semibold text-primary-500">
                                {fmt.date(record.date)}
                            </Text>
                        ) : null}
                    </View>

                    <View style={{ padding: 20, gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <StatusBadge status={record.status} />
                            {record.isRegularized && (
                                <View style={[baseStyles.statusBadge, { backgroundColor: colors.success[50] }]}>
                                    <Text className="font-inter text-[9px] font-bold text-success-700">REGULARIZED</Text>
                                </View>
                            )}
                        </View>

                        {(firstHalf || secondHalf) && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {firstHalf && (
                                    <View
                                        style={{
                                            flex: 1,
                                            backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                            borderRadius: 14,
                                            padding: 12,
                                        }}
                                    >
                                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                            1st Half
                                        </Text>
                                        <StatusBadge status={firstHalf.status} />
                                        {firstHalf.leaveType?.name ? (
                                            <Text className="mt-1 font-inter text-[10px] font-semibold text-primary-500">
                                                {firstHalf.leaveType.name}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                                {secondHalf && (
                                    <View
                                        style={{
                                            flex: 1,
                                            backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                            borderRadius: 14,
                                            padding: 12,
                                        }}
                                    >
                                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                            2nd Half
                                        </Text>
                                        <StatusBadge status={secondHalf.status} />
                                        {secondHalf.leaveType?.name ? (
                                            <Text className="mt-1 font-inter text-[10px] font-semibold text-primary-500">
                                                {secondHalf.leaveType.name}
                                            </Text>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <View
                                style={{
                                    flex: 1,
                                    minWidth: '45%',
                                    backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Punch In
                                </Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {formatTime(record.punchIn)}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    minWidth: '45%',
                                    backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Punch Out
                                </Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {formatTime(record.punchOut)}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    minWidth: '45%',
                                    backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Worked Hours
                                </Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {hrs > 0 ? `${hrs.toFixed(1)} hrs` : '—'}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    minWidth: '45%',
                                    backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Source
                                </Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {SOURCE_LABELS[record.source] ?? record.source ?? '—'}
                                </Text>
                            </View>
                        </View>

                        {record.shiftName ? (
                            <View
                                style={{
                                    backgroundColor: isDark ? colors.primary[900] + '20' : colors.primary[50],
                                    borderRadius: 14,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: isDark ? colors.primary[800] + '30' : colors.primary[100],
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-primary-500">
                                    Shift
                                </Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                    {record.shiftName}{' '}
                                    <Text className="font-inter text-xs text-neutral-400">{record.shiftTime}</Text>
                                </Text>
                            </View>
                        ) : null}

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: record.isLate ? colors.warning[50] : isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                    borderWidth: record.isLate ? 1 : 0,
                                    borderColor: colors.warning[200],
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Late
                                </Text>
                                <Text
                                    className={`font-inter text-sm font-bold ${record.isLate ? 'text-warning-700' : 'text-success-600'}`}
                                >
                                    {record.isLate ? formatMinutes(record.lateMinutes!) : 'On Time'}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: record.isEarlyExit ? colors.danger[50] : isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                    borderWidth: record.isEarlyExit ? 1 : 0,
                                    borderColor: colors.danger[200],
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Early Exit
                                </Text>
                                <Text
                                    className={`font-inter text-sm font-bold ${record.isEarlyExit ? 'text-danger-700' : 'text-neutral-400'}`}
                                >
                                    {record.isEarlyExit ? `${record.earlyMinutes} min` : '—'}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: otHrs != null ? colors.success[50] : isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                    borderWidth: otHrs != null ? 1 : 0,
                                    borderColor: colors.success[200],
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    OT
                                </Text>
                                <Text
                                    className={`font-inter text-sm font-bold ${otHrs != null ? 'text-success-700' : 'text-neutral-400'}`}
                                >
                                    {otHrs != null ? `${otHrs.toFixed(1)} hrs` : '—'}
                                </Text>
                            </View>
                        </View>

                        {record.location ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Svg width={13} height={13} viewBox="0 0 24 24">
                                    <Path
                                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                    <Path
                                        d="M12 13a3 3 0 100-6 3 3 0 000 6z"
                                        stroke={colors.neutral[400]}
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                </Svg>
                                <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    {record.location}
                                </Text>
                            </View>
                        ) : null}

                        {record.appliedBreakDeductionMinutes != null && record.appliedBreakDeductionMinutes > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                    Break Deduction
                                </Text>
                                <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">
                                    {record.appliedBreakDeductionMinutes} min
                                </Text>
                            </View>
                        )}

                        {record.finalStatusReason ? (
                            <View
                                style={{
                                    backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                    borderRadius: 14,
                                    padding: 12,
                                }}
                            >
                                <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                                    Status Reason
                                </Text>
                                <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300">
                                    {record.finalStatusReason}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View
                        style={{
                            padding: 20,
                            borderTopWidth: 1,
                            borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
                        }}
                    >
                        <Pressable
                            onPress={onClose}
                            style={{
                                paddingVertical: 12,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: isDark ? colors.neutral[600] : colors.neutral[200],
                                alignItems: 'center',
                                minHeight: 44,
                                justifyContent: 'center',
                            }}
                        >
                            <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                Close
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </Pressable>
        </Pressable>
    );
}

// ============ WEEKLY REVIEW HELPERS ============

const FLAG_LABELS: Record<string, string> = {
    MISSING_PUNCH: 'Missing Punch',
    AUTO_MAPPED: 'Auto-Mapped',
    WORKED_ON_LEAVE: 'On Leave',
    LATE_BEYOND_THRESHOLD: 'Late',
    MULTIPLE_SHIFT_ANOMALY: 'Multi-Shift',
    OT_ANOMALY: 'OT Anomaly',
};

const FLAG_COLORS: Record<string, { bg: string; text: string }> = {
    MISSING_PUNCH: { bg: colors.danger[50], text: 'text-danger-700' },
    AUTO_MAPPED: { bg: colors.info[50], text: 'text-info-700' },
    WORKED_ON_LEAVE: { bg: colors.warning[50], text: 'text-warning-700' },
    LATE_BEYOND_THRESHOLD: { bg: colors.warning[50], text: 'text-warning-700' },
    MULTIPLE_SHIFT_ANOMALY: { bg: colors.info[50], text: 'text-info-700' },
    OT_ANOMALY: { bg: colors.danger[50], text: 'text-danger-700' },
};

function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    return toIsoDate(monday);
}

function getWeekEnd(): string {
    const start = getWeekStart();
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    return toIsoDate(d);
}

function FlagBadge({ flag }: { flag: string }) {
    const c = FLAG_COLORS[flag] ?? { bg: colors.neutral[100], text: 'text-neutral-600' };
    return (
        <View style={[baseStyles.statusBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[9px] font-bold ${c.text}`}>{FLAG_LABELS[flag] ?? flag}</Text>
        </View>
    );
}

function WeeklyKpiCard({
    label,
    value,
    color,
    index,
    isDark,
}: {
    label: string;
    value: number;
    color: string;
    index: number;
    isDark: boolean;
}) {
    return (
        <Animated.View
            entering={FadeInUp.duration(300).delay(60 + index * 40)}
            style={[
                baseStyles.kpiCard,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    borderLeftColor: color,
                    borderLeftWidth: 3,
                },
            ]}
        >
            <Text className="font-inter text-xl font-bold" style={{ color }}>
                {value}
            </Text>
            <Text
                className="mt-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                numberOfLines={1}
            >
                {label}
            </Text>
        </Animated.View>
    );
}

interface WeeklyRecord {
    id: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    date: string;
    punchIn: string;
    punchOut: string;
    status: string;
    shiftName: string;
    shiftTime: string;
    reviewFlags: string[];
    isReviewed: boolean;
}

function WeeklyRecordCard({
    item,
    index,
    isSelected,
    onToggle,
}: {
    item: WeeklyRecord;
    index: number;
    isSelected: boolean;
    onToggle: (id: string) => void;
}) {
    const fmt = useCompanyFormatter();
    const formatTime = (time: string) => (!time ? '--:--' : fmt.time(time));
    const initials = getInitials(item.employeeName);
    return (
        <Animated.View entering={FadeInUp.duration(300).delay(40 + index * 20)}>
            <View style={[baseStyles.card, item.isReviewed && { opacity: 0.55 }]}>
                <View style={baseStyles.cardRow}>
                    <Pressable
                        onPress={() => !item.isReviewed && onToggle(item.id)}
                        hitSlop={4}
                        style={[
                            {
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                borderWidth: 2,
                                borderColor: isSelected ? colors.primary[600] : colors.neutral[300],
                                backgroundColor: isSelected ? colors.primary[600] : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 8,
                            },
                            item.isReviewed && {
                                borderColor: colors.success[400],
                                backgroundColor: colors.success[400],
                            },
                        ]}
                    >
                        {(isSelected || item.isReviewed) && (
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        )}
                    </Pressable>
                    <View style={baseStyles.avatar}>
                        <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                            {item.employeeName}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {item.employeeCode}
                            {item.department ? ` • ${item.department}` : ''}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={baseStyles.cardMeta}>
                    <View style={baseStyles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {item.date ? fmt.date(item.date) : '--'}
                        </Text>
                    </View>
                    <View style={baseStyles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            In: {formatTime(item.punchIn)}
                        </Text>
                    </View>
                    <View style={baseStyles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            Out: {formatTime(item.punchOut)}
                        </Text>
                    </View>
                </View>
                {item.reviewFlags && item.reviewFlags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {item.reviewFlags.map((f) => (
                            <FlagBadge key={f} flag={f} />
                        ))}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MONTH PICKER SHEET ============

function MonthPickerSheet({
    visible,
    year,
    monthIdx,
    onClose,
    onSelect,
}: {
    visible: boolean;
    year: number;
    monthIdx: number;
    onClose: () => void;
    onSelect: (year: number, monthIdx: number) => void;
}) {
    const isDark = useIsDark();
    const ref = React.useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['55%'], []);
    const [draftYear, setDraftYear] = React.useState(year);
    const [draftMonth, setDraftMonth] = React.useState(monthIdx);

    React.useEffect(() => {
        if (visible) {
            setDraftYear(year);
            setDraftMonth(monthIdx);
        }
    }, [visible, year, monthIdx]);

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
        ),
        [],
    );

    if (!visible) return null;
    return (
        <BottomSheet
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: colors.neutral[300], width: 40 }}
            backgroundStyle={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
            <View style={{ paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                <Text className="font-inter text-[18px] font-bold text-primary-950 dark:text-white">Select Month</Text>
            </View>
            <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                    <Pressable
                        onPress={() => setDraftYear((y) => y - 1)}
                        hitSlop={10}
                        style={{
                            width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
                        }}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white" style={{ minWidth: 80, textAlign: 'center' }}>
                        {draftYear}
                    </Text>
                    <Pressable
                        onPress={() => setDraftYear((y) => y + 1)}
                        hitSlop={10}
                        style={{
                            width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
                        }}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {MONTH_NAMES_SHORT.map((m, i) => {
                        const active = i === draftMonth;
                        return (
                            <Pressable
                                key={m}
                                onPress={() => {
                                    setDraftMonth(i);
                                    onSelect(draftYear, i);
                                    onClose();
                                }}
                                style={{
                                    width: `${(100 - 3 * 8 / 3) / 4 - 2}%`,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    backgroundColor: active ? colors.primary[600] : isDark ? '#13112B' : colors.neutral[100],
                                    minHeight: 48,
                                    justifyContent: 'center',
                                    flexBasis: '23%',
                                    flexGrow: 1,
                                }}
                            >
                                <Text className={`font-inter text-sm font-bold ${active ? 'text-white' : 'text-primary-950 dark:text-white'}`}>
                                    {m}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </BottomSheet>
    );
}

// ============ DATE PICKER SHEET ============

function SimpleDatePickerSheet({
    visible,
    initial,
    title,
    onClose,
    onSelect,
}: {
    visible: boolean;
    initial: Date;
    title: string;
    onClose: () => void;
    onSelect: (d: Date) => void;
}) {
    const isDark = useIsDark();
    const ref = React.useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['72%'], []);
    const [draftDate, setDraftDate] = React.useState(initial);

    React.useEffect(() => {
        if (visible) setDraftDate(initial);
    }, [visible, initial]);

    const year = draftDate.getFullYear();
    const monthIdx = draftDate.getMonth();
    const firstWeekday = new Date(year, monthIdx, 1).getDay();
    const lastDay = endOfMonth(year, monthIdx).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push(d);

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
        ),
        [],
    );

    if (!visible) return null;
    return (
        <BottomSheet
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: colors.neutral[300], width: 40 }}
            backgroundStyle={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
            <View style={{ paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                <Text className="font-inter text-[18px] font-bold text-primary-950 dark:text-white">{title}</Text>
            </View>
            <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Pressable
                        onPress={() => setDraftDate(new Date(year, monthIdx - 1, 1))}
                        hitSlop={8}
                        style={{ padding: 8, minWidth: 44, alignItems: 'center' }}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                        {MONTH_NAMES_FULL[monthIdx]} {year}
                    </Text>
                    <Pressable
                        onPress={() => setDraftDate(new Date(year, monthIdx + 1, 1))}
                        hitSlop={8}
                        style={{ padding: 8, minWidth: 44, alignItems: 'center' }}
                    >
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                            <Text className="font-inter text-[10px] font-bold text-neutral-400">{w}</Text>
                        </View>
                    ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {days.map((d, i) => {
                        const selected = d != null && d === draftDate.getDate();
                        return (
                            <Pressable
                                key={i}
                                disabled={d == null}
                                onPress={() => {
                                    if (d != null) setDraftDate(new Date(year, monthIdx, d));
                                }}
                                style={{
                                    width: `${100 / 7}%`,
                                    aspectRatio: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {d != null ? (
                                    <View
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: selected ? colors.primary[600] : 'transparent',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text
                                            className={`font-inter text-sm ${selected ? 'font-bold text-white' : 'text-primary-950 dark:text-white'}`}
                                        >
                                            {d}
                                        </Text>
                                    </View>
                                ) : null}
                            </Pressable>
                        );
                    })}
                </View>
                <Pressable
                    onPress={() => {
                        onSelect(draftDate);
                        onClose();
                    }}
                    style={{
                        marginTop: 20,
                        paddingVertical: 14,
                        borderRadius: 14,
                        backgroundColor: colors.primary[600],
                        alignItems: 'center',
                        minHeight: 48,
                        justifyContent: 'center',
                    }}
                >
                    <Text className="font-inter text-sm font-bold text-white">Done</Text>
                </Pressable>
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============ EMPLOYEE PICKER SHEET (Calendar view) ============

function EmployeePickerSheet({
    visible,
    employees,
    selectedId,
    onClose,
    onSelect,
}: {
    visible: boolean;
    employees: CalendarEmployee[];
    selectedId?: string;
    onClose: () => void;
    onSelect: (id: string) => void;
}) {
    const isDark = useIsDark();
    const ref = React.useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['80%'], []);
    const [search, setSearch] = React.useState('');

    React.useEffect(() => {
        if (visible) setSearch('');
    }, [visible]);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter((e) => {
            const name = `${e.firstName} ${e.lastName}`.toLowerCase();
            return name.includes(q) || e.employeeId.toLowerCase().includes(q);
        });
    }, [search, employees]);

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
        ),
        [],
    );

    if (!visible) return null;
    return (
        <BottomSheet
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: colors.neutral[300], width: 40 }}
            backgroundStyle={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
            <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                <Text className="font-inter text-[18px] font-bold text-primary-950 dark:text-white">Select Employee</Text>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                <BottomSheetTextInput
                    placeholder="Search employee or code…"
                    placeholderTextColor={colors.neutral[400]}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                    style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                        borderWidth: 1,
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: isDark ? colors.white : colors.primary[950],
                    }}
                />
            </View>
            <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, gap: 6 }}>
                {filtered.map((e) => {
                    const active = e.id === selectedId;
                    const name = `${e.firstName} ${e.lastName}`.trim();
                    return (
                        <Pressable
                            key={e.id}
                            onPress={() => {
                                onSelect(e.id);
                                onClose();
                            }}
                            style={{
                                paddingVertical: 14,
                                paddingHorizontal: 14,
                                borderRadius: 14,
                                backgroundColor: active ? colors.primary[600] : isDark ? '#13112B' : colors.neutral[50],
                                borderWidth: 1,
                                borderColor: active ? colors.primary[600] : isDark ? colors.neutral[700] : colors.neutral[100],
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                minHeight: 56,
                            }}
                        >
                            <View
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    backgroundColor: active ? colors.white : isDark ? colors.primary[900] : colors.primary[50],
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text className="font-inter text-xs font-bold" style={{ color: active ? colors.primary[700] : colors.primary[600] }}>
                                    {getInitials(name || e.employeeId)}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    className={`font-inter text-sm font-bold ${active ? 'text-white' : 'text-primary-950 dark:text-white'}`}
                                    numberOfLines={1}
                                >
                                    {name || e.employeeId}
                                </Text>
                                <Text
                                    className={`font-inter text-[11px] ${active ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                                    numberOfLines={1}
                                >
                                    {e.employeeId}
                                    {e.departmentName ? ` • ${e.departmentName}` : ''}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
                {filtered.length === 0 && (
                    <Text className="mt-8 text-center font-inter text-sm text-neutral-400">No employees</Text>
                )}
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============ CALENDAR DAY DETAIL SHEET ============

function CalendarDayDetailSheet({
    day,
    fmt,
    onClose,
}: {
    day: CalendarDay | null;
    fmt: ReturnType<typeof useCompanyFormatter>;
    onClose: () => void;
}) {
    const isDark = useIsDark();
    const ref = React.useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['50%'], []);

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
        ),
        [],
    );

    if (!day) return null;
    const stat = statusColor(day.status);
    const hrs = day.workedHours ?? 0;
    return (
        <BottomSheet
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: colors.neutral[300], width: 40 }}
            backgroundStyle={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
            <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                <Text className="font-inter text-[18px] font-bold text-primary-950 dark:text-white">{fmt.date(day.date)}</Text>
            </View>
            <BottomSheetScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: stat.bg,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text className="font-inter text-sm font-bold text-white">
                            {STATUS_LETTER[day.status?.toUpperCase()] ?? '?'}
                        </Text>
                    </View>
                    <StatusBadge status={day.status} />
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Punch In
                        </Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                            {day.punchIn ? fmt.time(day.punchIn) : '—'}
                        </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Punch Out
                        </Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                            {day.punchOut ? fmt.time(day.punchOut) : '—'}
                        </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Worked Hours
                        </Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                            {hrs > 0 ? `${hrs.toFixed(1)} hrs` : '—'}
                        </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            Overtime
                        </Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                            {day.overtimeHours && day.overtimeHours > 0 ? `${day.overtimeHours.toFixed(1)} hrs` : '—'}
                        </Text>
                    </View>
                </View>

                {day.isLate && day.lateMinutes ? (
                    <View style={{ backgroundColor: colors.warning[50], borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.warning[200] }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-warning-700">Late</Text>
                        <Text className="font-inter text-sm font-bold text-warning-700">{formatMinutes(day.lateMinutes)}</Text>
                    </View>
                ) : null}

                {day.leaveTypeName ? (
                    <View style={{ backgroundColor: colors.info[50], borderRadius: 14, padding: 12 }}>
                        <Text className="mb-1 font-inter text-[9px] font-bold uppercase tracking-wider text-info-700">Leave</Text>
                        <Text className="font-inter text-sm font-bold text-info-700">{day.leaveTypeName}</Text>
                    </View>
                ) : null}

                {day.shiftName ? (
                    <View>
                        <Text className="font-inter text-[10px] text-neutral-400">Shift</Text>
                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{day.shiftName}</Text>
                    </View>
                ) : null}
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============ TAB STRIP ============

function TabStrip({ active, onChange, isDark }: { active: TabKey; onChange: (k: TabKey) => void; isDark: boolean }) {
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'custom', label: 'Custom' },
    ];
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: 16, marginBottom: 12 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 8 }}
        >
            {tabs.map((t) => {
                const isActive = active === t.key;
                return (
                    <Pressable
                        key={t.key}
                        onPress={() => onChange(t.key)}
                        style={{
                            paddingHorizontal: 18,
                            paddingVertical: 10,
                            borderRadius: 22,
                            backgroundColor: isActive ? colors.primary[600] : isDark ? '#1A1730' : colors.white,
                            borderWidth: 1,
                            borderColor: isActive ? colors.primary[600] : isDark ? colors.neutral[700] : colors.neutral[200],
                            minHeight: 40,
                            minWidth: 88,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        hitSlop={4}
                    >
                        <Text
                            className={`font-inter text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                        >
                            {t.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ VIEW MODE TOGGLE ============

function ViewModeToggle({
    mode,
    onChange,
    isDark,
}: {
    mode: ViewMode;
    onChange: (m: ViewMode) => void;
    isDark: boolean;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#13112B' : colors.neutral[100],
                borderRadius: 10,
                padding: 3,
            }}
        >
            <Pressable
                onPress={() => onChange('list')}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: mode === 'list' ? (isDark ? colors.primary[900] : colors.white) : 'transparent',
                    minHeight: 36,
                }}
                hitSlop={4}
            >
                <ListIcon size={14} color={mode === 'list' ? colors.primary[600] : colors.neutral[500]} />
                <Text
                    className={`font-inter text-[11px] font-bold ${mode === 'list' ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-500'}`}
                >
                    List
                </Text>
            </Pressable>
            <Pressable
                onPress={() => onChange('calendar')}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: mode === 'calendar' ? (isDark ? colors.primary[900] : colors.white) : 'transparent',
                    minHeight: 36,
                }}
                hitSlop={4}
            >
                <CalendarIcon size={14} color={mode === 'calendar' ? colors.primary[600] : colors.neutral[500]} />
                <Text
                    className={`font-inter text-[11px] font-bold ${mode === 'calendar' ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-500'}`}
                >
                    Calendar
                </Text>
            </Pressable>
        </View>
    );
}

// ============ CALENDAR GRID ============

function EmployeeCalendarGrid({
    employee,
    monthStart,
    monthEnd,
    onDayPress,
}: {
    employee: CalendarEmployee | undefined;
    monthStart: Date;
    monthEnd: Date;
    onDayPress: (d: CalendarDay) => void;
}) {
    const isDark = useIsDark();
    const screenWidth = Dimensions.get('window').width;
    const cellSize = Math.max(40, Math.floor((screenWidth - 48 - 16) / 7) - 4);

    const year = monthStart.getFullYear();
    const monthIdx = monthStart.getMonth();
    const firstWeekday = new Date(year, monthIdx, 1).getDay();
    const totalDays = monthEnd.getDate();

    const dayByDate = React.useMemo(() => {
        const map = new Map<string, CalendarDay>();
        for (const d of employee?.days ?? []) {
            map.set(d.date.slice(0, 10), d);
        }
        return map;
    }, [employee]);

    const cells: { date: string | null; day?: CalendarDay; isWeekend?: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= totalDays; d++) {
        const iso = `${year}-${pad2(monthIdx + 1)}-${pad2(d)}`;
        const dow = new Date(year, monthIdx, d).getDay();
        cells.push({ date: iso, day: dayByDate.get(iso), isWeekend: dow === 0 || dow === 6 });
    }

    return (
        <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
                baseStyles.sectionCard,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}
        >
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {WEEKDAYS_SHORT.map((w, i) => (
                    <View key={w} style={{ flex: 1, alignItems: 'center' }}>
                        <Text
                            className={`font-inter text-[10px] font-bold uppercase ${i === 0 || i === 6 ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                        >
                            {w}
                        </Text>
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((cell, idx) => {
                    if (cell.date == null) {
                        return <View key={`empty-${idx}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                    }
                    const dayNum = parseInt(cell.date.slice(8, 10), 10);
                    const status = cell.day?.status ?? '';
                    const stat = status ? statusColor(status) : { bg: 'transparent', fg: colors.neutral[400] };
                    const letter = STATUS_LETTER[status?.toUpperCase()] ?? '';
                    return (
                        <Pressable
                            key={cell.date}
                            onPress={() => cell.day && onDayPress(cell.day)}
                            disabled={!cell.day}
                            android_ripple={{ color: colors.primary[100], borderless: true }}
                            style={({ pressed }) => ({
                                width: `${100 / 7}%`,
                                aspectRatio: 1,
                                padding: 3,
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                    backgroundColor: cell.isWeekend ? (isDark ? '#13112B' : colors.neutral[50]) : 'transparent',
                                    padding: 4,
                                    minWidth: cellSize,
                                    minHeight: cellSize,
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    className={`font-inter text-[11px] font-semibold ${cell.isWeekend ? 'text-neutral-400' : 'text-primary-950 dark:text-white'}`}
                                >
                                    {dayNum}
                                </Text>
                                {cell.day && status ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <View
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 11,
                                                backgroundColor: stat.bg,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text className="font-inter text-[10px] font-bold text-white">{letter}</Text>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </Animated.View>
    );
}

// ============ MONTHLY TOTALS CARD ============

function MonthlyTotalsCard({
    totals,
    isDark,
}: {
    totals: Record<string, number> | undefined;
    isDark: boolean;
}) {
    if (!totals) return null;
    const entries = [
        { label: 'Present', key: 'present', color: colors.success[600] },
        { label: 'Absent', key: 'absent', color: colors.danger[600] },
        { label: 'On Leave', key: 'onLeave', color: colors.info[600] },
        { label: 'Late', key: 'late', color: colors.warning[600] },
        { label: 'OT Hrs', key: 'overtimeHours', color: colors.primary[600] },
    ];
    return (
        <Animated.View
            entering={FadeInUp.duration(300)}
            style={[
                baseStyles.sectionCard,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}
        >
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Monthly Totals
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {entries.map((e) => {
                    const raw = totals[e.key] ?? 0;
                    const val = typeof raw === 'number' ? raw : Number(raw) || 0;
                    return (
                        <View
                            key={e.key}
                            style={{
                                flex: 1,
                                minWidth: '30%',
                                backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderLeftWidth: 3,
                                borderLeftColor: e.color,
                            }}
                        >
                            <Text className="font-inter text-lg font-bold" style={{ color: e.color }}>
                                {e.key === 'overtimeHours' ? val.toFixed(1) : val}
                            </Text>
                            <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                {e.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </Animated.View>
    );
}

// ============ HELPERS: parse records ============

function parseRecord(r: any): AttendanceRecord {
    const emp = r.employee ?? {};
    return {
        id: r.id ?? '',
        employeeName: r.employeeName ?? ([emp.firstName, emp.lastName].filter(Boolean).join(' ') || '—'),
        employeeCode: r.employeeCode ?? emp.employeeId ?? '',
        department: r.department ?? emp.department?.name ?? '',
        departmentId: r.departmentId ?? emp.department?.id ?? '',
        designation: r.designation ?? emp.designation?.name ?? '',
        date: r.date ?? '',
        punchIn: r.punchIn ?? '',
        punchOut: r.punchOut ?? '',
        workedHours: r.workedHours ?? 0,
        status: r.status ?? 'PRESENT',
        isLate: r.isLate ?? false,
        lateMinutes: r.lateMinutes ?? null,
        isEarlyExit: r.isEarlyExit ?? false,
        earlyMinutes: r.earlyMinutes ?? null,
        overtimeHours: r.overtimeHours != null ? Number(r.overtimeHours) : null,
        shiftName: r.shift?.name ?? '',
        shiftTime: r.shift ? `${r.shift.startTime} – ${r.shift.endTime}` : '',
        finalStatusReason: r.finalStatusReason ?? '',
        source: r.source ?? '',
        halves: Array.isArray(r.halves)
            ? r.halves.map((h: any) => ({
                id: h.id ?? '',
                half: h.half,
                status: h.status,
                leaveType: h.leaveType ?? null,
            }))
            : [],
        location: r.location?.name ?? '',
        isRegularized: r.isRegularized ?? false,
        appliedBreakDeductionMinutes: r.appliedBreakDeductionMinutes ?? 0,
    };
}

// ============ MAIN COMPONENT ============

export function AttendanceDashboardScreen() {
    const isDark = useIsDark();
    const styles = createStyles(isDark);
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();

    const [activeTab, setActiveTab] = React.useState<TabKey>('daily');
    const [detailRecord, setDetailRecord] = React.useState<AttendanceRecord | null>(null);

    // Filter sheet state
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [filters, setFilters] = React.useState<AttendanceFilterValues>({});

    // ── Daily tab state ──
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [selectedDeptId, setSelectedDeptId] = React.useState('');
    const dateStr = toIsoDate(selectedDate);

    // ── Weekly tab state ──
    const [weekStart, setWeekStart] = React.useState(getWeekStart);
    const [weekEnd, setWeekEnd] = React.useState(getWeekEnd);
    const [weeklyFlag, setWeeklyFlag] = React.useState('');
    const [selectedReviewIds, setSelectedReviewIds] = React.useState<Set<string>>(new Set());

    // ── Monthly tab state ──
    const now = new Date();
    const [monthYear, setMonthYear] = React.useState(now.getFullYear());
    const [monthIdx, setMonthIdx] = React.useState(now.getMonth());
    const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);
    const [monthlyViewMode, setMonthlyViewMode] = React.useState<ViewMode>('list');
    const [monthlyEmployeeId, setMonthlyEmployeeId] = React.useState<string | undefined>(undefined);
    const [monthlyEmployeePickerOpen, setMonthlyEmployeePickerOpen] = React.useState(false);
    const [monthlyCalendarDay, setMonthlyCalendarDay] = React.useState<CalendarDay | null>(null);

    // ── Custom tab state ──
    const defaultCustomTo = React.useMemo(() => new Date(), []);
    const defaultCustomFrom = React.useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return d;
    }, []);
    const [customFrom, setCustomFrom] = React.useState(defaultCustomFrom);
    const [customTo, setCustomTo] = React.useState(defaultCustomTo);
    const [customFromOpen, setCustomFromOpen] = React.useState(false);
    const [customToOpen, setCustomToOpen] = React.useState(false);
    const [customViewMode, setCustomViewMode] = React.useState<ViewMode>('list');
    const [customEmployeeId, setCustomEmployeeId] = React.useState<string | undefined>(undefined);
    const [customEmployeePickerOpen, setCustomEmployeePickerOpen] = React.useState(false);
    const [customCalendarDay, setCustomCalendarDay] = React.useState<CalendarDay | null>(null);

    // ── Lookup data for filters ──
    const { data: deptsResp } = useDepartments({ limit: 200 });
    const { data: locsResp } = useCompanyLocations();
    const { data: desigsResp } = useDesignations({ limit: 200 });
    const { data: empTypesResp } = useEmployeeTypes({ limit: 200 });
    const { data: shiftsResp } = useCompanyShifts();

    const departmentsOptions = React.useMemo<FilterOption[]>(() => {
        const raw = (deptsResp as any)?.data ?? (deptsResp as any) ?? [];
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        return (arr as any[]).map((d) => ({ value: d.id, label: d.name }));
    }, [deptsResp]);
    const locationsOptions = React.useMemo<FilterOption[]>(() => {
        const raw = (locsResp as any)?.data ?? (locsResp as any) ?? [];
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        return (arr as any[]).map((l) => ({ value: l.id, label: l.name }));
    }, [locsResp]);
    const designationsOptions = React.useMemo<FilterOption[]>(() => {
        const raw = (desigsResp as any)?.data ?? (desigsResp as any) ?? [];
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        return (arr as any[]).map((d) => ({ value: d.id, label: d.name }));
    }, [desigsResp]);
    const employeeTypesOptions = React.useMemo<FilterOption[]>(() => {
        const raw = (empTypesResp as any)?.data ?? (empTypesResp as any) ?? [];
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        return (arr as any[]).map((d) => ({ value: d.id, label: d.name }));
    }, [empTypesResp]);
    const shiftsOptions = React.useMemo<FilterOption[]>(() => {
        const raw = (shiftsResp as any)?.data ?? (shiftsResp as any) ?? [];
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        return (arr as any[]).map((s) => ({ value: s.id, label: s.name }));
    }, [shiftsResp]);

    // Filter param helpers
    const filterParams = React.useMemo(() => {
        return {
            departmentId: filters.departmentId,
            locationId: filters.locationId,
            designationId: filters.designationId,
            employeeTypeId: filters.employeeTypeId,
            shiftId: filters.shiftId,
            search: filters.search,
            status: filters.statuses?.[0],
            source: filters.sources?.[0],
        };
    }, [filters]);

    // ── Daily data ──
    const { data: summaryResponse, isLoading: summaryLoading } = useAttendanceSummary();
    const { data: recordsResponse, isLoading: recordsLoading, error, refetch, isFetching } =
        useAttendanceRecords({
            date: dateStr,
            departmentId: selectedDeptId || filterParams.departmentId,
            locationId: filterParams.locationId,
            designationId: filterParams.designationId,
            employeeTypeId: filterParams.employeeTypeId,
            shiftId: filterParams.shiftId,
            status: filterParams.status,
            source: filterParams.source,
            search: filterParams.search,
        });

    const isLoading = summaryLoading || recordsLoading;

    const summaryData = React.useMemo(() => {
        const raw = (summaryResponse as any)?.data ?? summaryResponse ?? {};
        const s = raw.summary ?? raw;
        return {
            total: s.total ?? 0,
            present: s.present ?? 0,
            absent: s.absent ?? 0,
            late: s.late ?? 0,
            onLeave: s.onLeave ?? 0,
        };
    }, [summaryResponse]);

    const kpiItems: SummaryItem[] = [
        { label: 'Total', value: summaryData.total, color: colors.accent[500], bgColor: colors.accent[50], icon: 'users' },
        { label: 'Present', value: summaryData.present, color: colors.success[500], bgColor: colors.success[50], icon: 'check' },
        { label: 'Absent', value: summaryData.absent, color: colors.danger[500], bgColor: colors.danger[50], icon: 'x' },
        { label: 'Late', value: summaryData.late, color: colors.warning[500], bgColor: colors.warning[50], icon: 'clock' },
        { label: 'On Leave', value: summaryData.onLeave, color: colors.info[500], bgColor: colors.info[50], icon: 'calendar' },
    ];

    const departments: DepartmentBreakdown[] = React.useMemo(() => {
        const raw = (summaryResponse as any)?.data ?? summaryResponse ?? {};
        const list = raw.departmentBreakdown ?? raw.departments ?? [];
        if (!Array.isArray(list)) return [];
        return list.map((d: any) => ({
            id: d.departmentId ?? d.id ?? '',
            name: d.departmentName ?? d.name ?? '',
            present: d.present ?? 0,
            total: d.total ?? 0,
        }));
    }, [summaryResponse]);

    const records: AttendanceRecord[] = React.useMemo(() => {
        const raw = (recordsResponse as any)?.data ?? recordsResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(parseRecord);
    }, [recordsResponse]);

    // ── Weekly data ──
    const { data: weeklyReviewResponse, isLoading: weeklyLoading, refetch: weeklyRefetch, isFetching: weeklyFetching } =
        useWeeklyReview({ weekStart, weekEnd, flag: weeklyFlag || undefined });
    const { data: weeklySummaryResponse } = useWeeklyReviewSummary({ weekStart, weekEnd });
    const markReviewedMutation = useMarkReviewed();

    const weeklySummary = React.useMemo(() => {
        const raw = (weeklySummaryResponse as any)?.data ?? weeklySummaryResponse ?? {};
        return { ...raw, ...(raw.flagCounts ?? {}) };
    }, [weeklySummaryResponse]);

    const weeklyRecords: WeeklyRecord[] = React.useMemo(() => {
        const envelope = (weeklyReviewResponse as any)?.data ?? weeklyReviewResponse ?? {};
        const raw = envelope?.records ?? envelope;
        if (!Array.isArray(raw)) return [];
        return raw.map((r: any) => {
            const emp = r.employee ?? {};
            return {
                id: r.id ?? '',
                employeeName: r.employeeName ?? ([emp.firstName, emp.lastName].filter(Boolean).join(' ') || '—'),
                employeeCode: r.employeeCode ?? emp.employeeId ?? '',
                department: r.department ?? emp.department?.name ?? '',
                date: r.date ?? '',
                punchIn: r.punchIn ?? '',
                punchOut: r.punchOut ?? '',
                status: r.status ?? 'PRESENT',
                shiftName: r.shift?.name ?? '',
                shiftTime: r.shift ? `${r.shift.startTime} – ${r.shift.endTime}` : '',
                reviewFlags: r.reviewFlags ?? [],
                isReviewed: r.isReviewed ?? false,
            };
        });
    }, [weeklyReviewResponse]);

    const toggleReviewId = React.useCallback((id: string) => {
        setSelectedReviewIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleMarkReviewed = React.useCallback(async () => {
        if (selectedReviewIds.size === 0) return;
        try {
            await markReviewedMutation.mutateAsync({ recordIds: Array.from(selectedReviewIds) });
            setSelectedReviewIds(new Set());
        } catch {
            // React Query surfaces error
        }
    }, [selectedReviewIds, markReviewedMutation]);

    const weeklyFlagOptions = [
        { value: '', label: 'All' },
        { value: 'MISSING_PUNCH', label: 'Missing' },
        { value: 'AUTO_MAPPED', label: 'Auto-Map' },
        { value: 'WORKED_ON_LEAVE', label: 'On Leave' },
        { value: 'LATE_BEYOND_THRESHOLD', label: 'Late' },
        { value: 'MULTIPLE_SHIFT_ANOMALY', label: 'Multi' },
        { value: 'OT_ANOMALY', label: 'OT' },
    ];

    const weeklyKpiItems = [
        { label: 'Total Flagged', value: weeklySummary.totalRecords ?? 0, color: colors.primary[500] },
        { label: 'Missing Punch', value: weeklySummary.MISSING_PUNCH ?? 0, color: colors.danger[500] },
        { label: 'Auto-Mapped', value: weeklySummary.AUTO_MAPPED ?? 0, color: colors.info[500] },
        { label: 'On Leave', value: weeklySummary.WORKED_ON_LEAVE ?? 0, color: colors.warning[500] },
        { label: 'Late', value: weeklySummary.LATE_BEYOND_THRESHOLD ?? 0, color: colors.warning[600] },
        { label: 'OT Anomaly', value: weeklySummary.OT_ANOMALY ?? 0, color: colors.danger[600] },
    ];

    const goWeekBack = React.useCallback(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(toIsoDate(d));
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        setWeekEnd(toIsoDate(e));
        setSelectedReviewIds(new Set());
    }, [weekStart]);

    const goWeekForward = React.useCallback(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(toIsoDate(d));
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        setWeekEnd(toIsoDate(e));
        setSelectedReviewIds(new Set());
    }, [weekStart]);

    // ── Monthly range ──
    const monthStart = React.useMemo(() => startOfMonth(monthYear, monthIdx), [monthYear, monthIdx]);
    const monthEnd = React.useMemo(() => endOfMonth(monthYear, monthIdx), [monthYear, monthIdx]);
    const monthlyDateFrom = toIsoDate(monthStart);
    const monthlyDateTo = toIsoDate(monthEnd);

    const monthlyRangeEnabled = activeTab === 'monthly';
    const { data: monthlySummaryResp, isLoading: monthlySummaryLoading, refetch: refetchMonthlySummary, isFetching: monthlySummaryFetching } =
        useAttendanceRangeSummary(
            monthlyRangeEnabled
                ? {
                    dateFrom: monthlyDateFrom,
                    dateTo: monthlyDateTo,
                    departmentId: filterParams.departmentId,
                    locationId: filterParams.locationId,
                    designationId: filterParams.designationId,
                    employeeTypeId: filterParams.employeeTypeId,
                    shiftId: filterParams.shiftId,
                }
                : {},
        );

    const { data: monthlyRecordsResp, isLoading: monthlyRecordsLoading, refetch: refetchMonthlyRecords } =
        useAttendanceRecords(
            monthlyRangeEnabled && monthlyViewMode === 'list'
                ? {
                    from: monthlyDateFrom,
                    to: monthlyDateTo,
                    limit: 25,
                    departmentId: filterParams.departmentId,
                    locationId: filterParams.locationId,
                    designationId: filterParams.designationId,
                    employeeTypeId: filterParams.employeeTypeId,
                    shiftId: filterParams.shiftId,
                    status: filterParams.status,
                    source: filterParams.source,
                    search: filterParams.search,
                }
                : undefined,
        );

    const { data: monthlyCalendarResp, isLoading: monthlyCalendarLoading } = useAttendanceCalendar(
        monthlyRangeEnabled && monthlyViewMode === 'calendar'
            ? {
                dateFrom: monthlyDateFrom,
                dateTo: monthlyDateTo,
                limit: 50,
                departmentId: filterParams.departmentId,
                locationId: filterParams.locationId,
                designationId: filterParams.designationId,
                employeeTypeId: filterParams.employeeTypeId,
                shiftId: filterParams.shiftId,
                search: filters.search,
            }
            : {},
    );

    // ── Custom range ──
    const customRangeEnabled = activeTab === 'custom';
    const customFromStr = toIsoDate(customFrom);
    const customToStr = toIsoDate(customTo);

    const { data: customSummaryResp, isLoading: customSummaryLoading, refetch: refetchCustomSummary, isFetching: customSummaryFetching } =
        useAttendanceRangeSummary(
            customRangeEnabled
                ? {
                    dateFrom: customFromStr,
                    dateTo: customToStr,
                    departmentId: filterParams.departmentId,
                    locationId: filterParams.locationId,
                    designationId: filterParams.designationId,
                    employeeTypeId: filterParams.employeeTypeId,
                    shiftId: filterParams.shiftId,
                }
                : {},
        );

    const { data: customRecordsResp, isLoading: customRecordsLoading, refetch: refetchCustomRecords } =
        useAttendanceRecords(
            customRangeEnabled && customViewMode === 'list'
                ? {
                    from: customFromStr,
                    to: customToStr,
                    limit: 25,
                    departmentId: filterParams.departmentId,
                    locationId: filterParams.locationId,
                    designationId: filterParams.designationId,
                    employeeTypeId: filterParams.employeeTypeId,
                    shiftId: filterParams.shiftId,
                    status: filterParams.status,
                    source: filterParams.source,
                    search: filterParams.search,
                }
                : undefined,
        );

    const { data: customCalendarResp, isLoading: customCalendarLoading } = useAttendanceCalendar(
        customRangeEnabled && customViewMode === 'calendar'
            ? {
                dateFrom: customFromStr,
                dateTo: customToStr,
                limit: 50,
                departmentId: filterParams.departmentId,
                locationId: filterParams.locationId,
                designationId: filterParams.designationId,
                employeeTypeId: filterParams.employeeTypeId,
                shiftId: filterParams.shiftId,
                search: filters.search,
            }
            : {},
    );

    // ── Range-summary parsing ──
    function parseRangeSummary(resp: any) {
        const raw = resp?.data ?? resp ?? {};
        const summary = raw.summary ?? {};
        const departmentBreakdown: DepartmentBreakdown[] = Array.isArray(raw.departmentBreakdown)
            ? raw.departmentBreakdown.map((d: any) => ({
                id: d.departmentId ?? d.id ?? '',
                name: d.departmentName ?? d.name ?? '',
                present: d.present ?? 0,
                total: d.total ?? 0,
            }))
            : [];
        const dailyTrend: DailyTrendEntry[] = Array.isArray(raw.dailyTrend)
            ? raw.dailyTrend.map((d: any) => ({
                date: d.date ?? '',
                present: Number(d.present ?? 0),
                absent: Number(d.absent ?? 0),
                late: Number(d.late ?? 0),
                onLeave: Number(d.onLeave ?? 0),
                holiday: Number(d.holiday ?? 0),
                weekOff: Number(d.weekOff ?? 0),
                total: Number(d.total ?? 0),
            }))
            : [];
        return { summary, departmentBreakdown, dailyTrend };
    }

    function parseCalendar(resp: any): CalendarEmployee[] {
        const raw = resp?.data ?? resp ?? {};
        const employees = raw.employees ?? [];
        if (!Array.isArray(employees)) return [];
        return employees.map((e: any) => ({
            id: e.id ?? '',
            employeeId: e.employeeId ?? '',
            firstName: e.firstName ?? '',
            lastName: e.lastName ?? '',
            departmentName: e.departmentName ?? '',
            designationName: e.designationName ?? '',
            days: Array.isArray(e.days)
                ? e.days.map((d: any) => ({
                    date: d.date ?? '',
                    status: d.status ?? '',
                    punchIn: d.punchIn ?? undefined,
                    punchOut: d.punchOut ?? undefined,
                    workedHours: d.workedHours != null ? Number(d.workedHours) : undefined,
                    isLate: d.isLate ?? false,
                    lateMinutes: d.lateMinutes ?? undefined,
                    overtimeHours: d.overtimeHours != null ? Number(d.overtimeHours) : undefined,
                    leaveTypeName: d.leaveTypeName ?? undefined,
                    shiftName: d.shiftName ?? undefined,
                    recordId: d.recordId ?? undefined,
                }))
                : [],
            totals: e.totals,
        }));
    }

    const monthlySummary = React.useMemo(() => parseRangeSummary(monthlySummaryResp), [monthlySummaryResp]);
    const customSummary = React.useMemo(() => parseRangeSummary(customSummaryResp), [customSummaryResp]);

    const monthlyListRecords = React.useMemo(() => {
        const raw = (monthlyRecordsResp as any)?.data ?? monthlyRecordsResp ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(parseRecord);
    }, [monthlyRecordsResp]);

    const customListRecords = React.useMemo(() => {
        const raw = (customRecordsResp as any)?.data ?? customRecordsResp ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(parseRecord);
    }, [customRecordsResp]);

    const monthlyCalendarEmployees = React.useMemo(() => parseCalendar(monthlyCalendarResp), [monthlyCalendarResp]);
    const customCalendarEmployees = React.useMemo(() => parseCalendar(customCalendarResp), [customCalendarResp]);

    // Pick default employee for calendar mode if not set
    React.useEffect(() => {
        if (monthlyViewMode === 'calendar' && !monthlyEmployeeId && monthlyCalendarEmployees.length > 0) {
            setMonthlyEmployeeId(monthlyCalendarEmployees[0]!.id);
        }
    }, [monthlyViewMode, monthlyEmployeeId, monthlyCalendarEmployees]);

    React.useEffect(() => {
        if (customViewMode === 'calendar' && !customEmployeeId && customCalendarEmployees.length > 0) {
            setCustomEmployeeId(customCalendarEmployees[0]!.id);
        }
    }, [customViewMode, customEmployeeId, customCalendarEmployees]);

    const monthlySelectedEmployee = React.useMemo(
        () => monthlyCalendarEmployees.find((e) => e.id === monthlyEmployeeId),
        [monthlyCalendarEmployees, monthlyEmployeeId],
    );
    const customSelectedEmployee = React.useMemo(
        () => customCalendarEmployees.find((e) => e.id === customEmployeeId),
        [customCalendarEmployees, customEmployeeId],
    );

    // ── Render: Daily tab content ──
    const renderItem = ({ item, index }: { item: AttendanceRecord; index: number }) => (
        <RecordCard item={item} index={index} onPress={setDetailRecord} />
    );

    const renderDailyHeader = () => (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Daily Attendance</Text>
                <Pressable onPress={() => setFilterOpen(true)} style={styles.iconBtn} hitSlop={8}>
                    <SlidersHorizontal size={16} color={colors.primary[600]} />
                </Pressable>
            </View>
            <DatePicker value={selectedDate} onChange={setSelectedDate} />

            <View style={styles.kpiGrid}>
                {kpiItems.map((item, idx) => (
                    <KpiCard key={item.label} item={item} index={idx} isDark={isDark} />
                ))}
            </View>

            {departments.length > 0 && (
                <Animated.View
                    entering={FadeInUp.duration(300).delay(220)}
                    style={[
                        styles.sectionCard,
                        {
                            backgroundColor: isDark ? '#1A1730' : colors.white,
                            borderColor: isDark ? colors.primary[900] : colors.primary[50],
                        },
                    ]}
                >
                    <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Department Breakdown
                    </Text>
                    {departments.map((d) => (
                        <DepartmentBar key={d.id} item={d} />
                    ))}
                </Animated.View>
            )}

            {departments.length > 0 && (
                <DepartmentFilter
                    departments={departments}
                    selectedId={selectedDeptId}
                    onSelect={setSelectedDeptId}
                />
            )}

            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Records
            </Text>
        </>
    );

    const renderEmpty = () => {
        if (isLoading)
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        if (error)
            return (
                <View style={{ paddingTop: 40, alignItems: 'center' }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load attendance"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        return (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <EmptyState icon="inbox" title="No records" message="No attendance records found for this date." />
            </View>
        );
    };

    // ── Render: Weekly tab content ──
    const renderWeeklyItem = ({ item, index }: { item: WeeklyRecord; index: number }) => (
        <WeeklyRecordCard
            item={item}
            index={index}
            isSelected={selectedReviewIds.has(item.id)}
            onToggle={toggleReviewId}
        />
    );

    const renderWeeklyHeader = () => (
        <>
            <View style={styles.datePicker}>
                <Pressable onPress={goWeekBack} style={styles.dateArrow} hitSlop={8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                        {fmt.date(`${weekStart}T00:00:00Z`)} - {fmt.date(`${weekEnd}T00:00:00Z`)}
                    </Text>
                    <Text className="font-inter text-[10px] text-primary-500">Weekly Review</Text>
                </View>
                <Pressable onPress={goWeekForward} style={styles.dateArrow} hitSlop={8}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
            </View>

            <View style={styles.kpiGrid}>
                {weeklyKpiItems.map((item, idx) => (
                    <WeeklyKpiCard
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        color={item.color}
                        index={idx}
                        isDark={isDark}
                    />
                ))}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
            >
                {weeklyFlagOptions.map((opt) => {
                    const active = weeklyFlag === opt.value;
                    return (
                        <Pressable
                            key={opt.value}
                            onPress={() => {
                                setWeeklyFlag(opt.value);
                                setSelectedReviewIds(new Set());
                            }}
                            style={[styles.filterChip, active && styles.filterChipActive]}
                        >
                            <Text
                                className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                            >
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Flagged Records
            </Text>
        </>
    );

    const renderWeeklyEmpty = () => {
        if (weeklyLoading)
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        return (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <EmptyState icon="inbox" title="No flagged records" message="No records requiring review for this week." />
            </View>
        );
    };

    // ── Render: Monthly tab content ──
    const monthlyKpiItems: SummaryItem[] = React.useMemo(() => {
        const s = monthlySummary.summary;
        const avgAtt = Number(s.avgAttendancePct ?? 0);
        const avgHrs = Number(s.avgWorkedHours ?? 0);
        const ot = Number(s.overtimeHours ?? 0);
        return [
            { label: 'Employees', value: s.totalEmployees ?? 0, color: colors.accent[500], bgColor: '', icon: '' },
            { label: 'Avg Att %', value: `${avgAtt.toFixed(1)}%`, color: colors.primary[500], bgColor: '', icon: '' },
            { label: 'Present', value: s.present ?? 0, color: colors.success[500], bgColor: '', icon: '' },
            { label: 'Absent', value: s.absent ?? 0, color: colors.danger[500], bgColor: '', icon: '' },
            { label: 'On Leave', value: s.onLeave ?? 0, color: colors.info[500], bgColor: '', icon: '' },
            { label: 'Late', value: s.late ?? 0, color: colors.warning[500], bgColor: '', icon: '' },
            { label: 'OT Hrs', value: ot.toFixed(1), color: colors.primary[600], bgColor: '', icon: '' },
            { label: 'Avg Hrs/Day', value: avgHrs.toFixed(1), color: colors.neutral[600], bgColor: '', icon: '' },
        ];
    }, [monthlySummary]);

    const customKpiItems: SummaryItem[] = React.useMemo(() => {
        const s = customSummary.summary;
        const avgAtt = Number(s.avgAttendancePct ?? 0);
        const avgHrs = Number(s.avgWorkedHours ?? 0);
        const ot = Number(s.overtimeHours ?? 0);
        return [
            { label: 'Employees', value: s.totalEmployees ?? 0, color: colors.accent[500], bgColor: '', icon: '' },
            { label: 'Avg Att %', value: `${avgAtt.toFixed(1)}%`, color: colors.primary[500], bgColor: '', icon: '' },
            { label: 'Present', value: s.present ?? 0, color: colors.success[500], bgColor: '', icon: '' },
            { label: 'Absent', value: s.absent ?? 0, color: colors.danger[500], bgColor: '', icon: '' },
            { label: 'On Leave', value: s.onLeave ?? 0, color: colors.info[500], bgColor: '', icon: '' },
            { label: 'Late', value: s.late ?? 0, color: colors.warning[500], bgColor: '', icon: '' },
            { label: 'OT Hrs', value: ot.toFixed(1), color: colors.primary[600], bgColor: '', icon: '' },
            { label: 'Avg Hrs/Day', value: avgHrs.toFixed(1), color: colors.neutral[600], bgColor: '', icon: '' },
        ];
    }, [customSummary]);

    const renderRangeHeader = (variant: 'monthly' | 'custom') => {
        const summary = variant === 'monthly' ? monthlySummary : customSummary;
        const viewMode = variant === 'monthly' ? monthlyViewMode : customViewMode;
        const setViewMode = variant === 'monthly' ? setMonthlyViewMode : setCustomViewMode;
        const kpis = variant === 'monthly' ? monthlyKpiItems : customKpiItems;
        const employees = variant === 'monthly' ? monthlyCalendarEmployees : customCalendarEmployees;
        const selectedEmployee = variant === 'monthly' ? monthlySelectedEmployee : customSelectedEmployee;
        const openEmployeePicker =
            variant === 'monthly' ? () => setMonthlyEmployeePickerOpen(true) : () => setCustomEmployeePickerOpen(true);
        const onDayPress = variant === 'monthly' ? setMonthlyCalendarDay : setCustomCalendarDay;
        const rangeStart = variant === 'monthly' ? monthStart : customFrom;
        const rangeEnd = variant === 'monthly' ? monthEnd : customTo;

        return (
            <>
                {/* Range picker row */}
                {variant === 'monthly' ? (
                    <View style={styles.datePicker}>
                        <Pressable
                            onPress={() => {
                                if (monthIdx === 0) {
                                    setMonthIdx(11);
                                    setMonthYear((y) => y - 1);
                                } else {
                                    setMonthIdx((m) => m - 1);
                                }
                            }}
                            style={styles.dateArrow}
                            hitSlop={8}
                        >
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        <Pressable
                            onPress={() => setMonthPickerOpen(true)}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            hitSlop={6}
                        >
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                {MONTH_NAMES_FULL[monthIdx]} {monthYear}
                            </Text>
                            <ChevronDown size={14} color={colors.primary[600]} />
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                if (monthIdx === 11) {
                                    setMonthIdx(0);
                                    setMonthYear((y) => y + 1);
                                } else {
                                    setMonthIdx((m) => m + 1);
                                }
                            }}
                            style={styles.dateArrow}
                            hitSlop={8}
                        >
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                ) : (
                    <View style={[styles.datePicker, { flexDirection: 'row', gap: 8 }]}>
                        <Pressable
                            onPress={() => setCustomFromOpen(true)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                borderRadius: 12,
                                backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                borderWidth: 1,
                                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                minHeight: 44,
                                justifyContent: 'center',
                            }}
                        >
                            <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">From</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                {fmt.date(customFrom.toISOString())}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setCustomToOpen(true)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                borderRadius: 12,
                                backgroundColor: isDark ? '#13112B' : colors.neutral[50],
                                borderWidth: 1,
                                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                minHeight: 44,
                                justifyContent: 'center',
                            }}
                        >
                            <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400">To</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                {fmt.date(customTo.toISOString())}
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* View toggle + filters */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <ViewModeToggle mode={viewMode} onChange={setViewMode} isDark={isDark} />
                    <Pressable onPress={() => setFilterOpen(true)} style={styles.iconBtn} hitSlop={8}>
                        <SlidersHorizontal size={16} color={colors.primary[600]} />
                    </Pressable>
                </View>

                {/* KPI grid */}
                <View style={styles.kpiGrid}>
                    {kpis.map((item, idx) => (
                        <KpiCard key={item.label} item={item} index={idx} isDark={isDark} />
                    ))}
                </View>

                {/* Department breakdown */}
                {summary.departmentBreakdown.length > 0 && (
                    <Animated.View
                        entering={FadeInUp.duration(300).delay(200)}
                        style={[
                            styles.sectionCard,
                            {
                                backgroundColor: isDark ? '#1A1730' : colors.white,
                                borderColor: isDark ? colors.primary[900] : colors.primary[50],
                            },
                        ]}
                    >
                        <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                            Department Breakdown
                        </Text>
                        {summary.departmentBreakdown.map((d) => (
                            <DepartmentBar key={d.id} item={d} />
                        ))}
                    </Animated.View>
                )}

                {/* Daily trend chart */}
                {summary.dailyTrend.length > 0 && <DailyTrendChart trend={summary.dailyTrend} isDark={isDark} />}

                {/* Calendar-mode employee picker + grid */}
                {viewMode === 'calendar' && (
                    <>
                        <Pressable
                            onPress={openEmployeePicker}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                padding: 12,
                                borderRadius: 14,
                                backgroundColor: isDark ? '#1A1730' : colors.white,
                                borderWidth: 1,
                                borderColor: isDark ? colors.primary[900] : colors.primary[50],
                                marginBottom: 12,
                                minHeight: 56,
                            }}
                            disabled={employees.length === 0}
                        >
                            <View
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Text className="font-inter text-xs font-bold text-primary-600">
                                    {selectedEmployee
                                        ? getInitials(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`)
                                        : 'EE'}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                    Employee
                                </Text>
                                <Text
                                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                    numberOfLines={1}
                                >
                                    {selectedEmployee
                                        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim() ||
                                        selectedEmployee.employeeId
                                        : 'Select employee'}
                                </Text>
                            </View>
                            <ChevronDown size={16} color={colors.primary[600]} />
                        </Pressable>

                        <EmployeeCalendarGrid
                            employee={selectedEmployee}
                            monthStart={rangeStart}
                            monthEnd={rangeEnd}
                            onDayPress={onDayPress}
                        />

                        <MonthlyTotalsCard totals={selectedEmployee?.totals} isDark={isDark} />
                    </>
                )}

                {viewMode === 'list' && (
                    <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Records
                    </Text>
                )}
            </>
        );
    };

    const monthlyListLoading = monthlySummaryLoading || monthlyRecordsLoading;
    const customListLoading = customSummaryLoading || customRecordsLoading;

    const renderRangeListEmpty = (variant: 'monthly' | 'custom') => {
        const loading = variant === 'monthly' ? monthlyListLoading : customListLoading;
        if (loading)
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        return (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <EmptyState icon="inbox" title="No records" message="No attendance records for this range." />
            </View>
        );
    };

    const renderRangeCalendarEmpty = (variant: 'monthly' | 'custom') => {
        const loading = variant === 'monthly' ? monthlyCalendarLoading : customCalendarLoading;
        if (loading)
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        const employees = variant === 'monthly' ? monthlyCalendarEmployees : customCalendarEmployees;
        if (employees.length === 0) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <EmptyState icon="inbox" title="No employees" message="No data for this range." />
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <AppTopHeader title="Attendance Dashboard" onMenuPress={toggle} />

            <TabStrip active={activeTab} onChange={setActiveTab} isDark={isDark} />

            {activeTab === 'daily' && (
                <FlashList
                    data={records}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderDailyHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={() => refetch()}
                            tintColor={colors.primary[500]}
                            colors={[colors.primary[500]]}
                        />
                    }
                />
            )}

            {activeTab === 'weekly' && (
                <>
                    <FlashList
                        data={weeklyRecords}
                        renderItem={renderWeeklyItem}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={renderWeeklyHeader}
                        ListEmptyComponent={renderWeeklyEmpty}
                        contentContainerStyle={{
                            paddingHorizontal: 24,
                            paddingBottom: insets.bottom + (selectedReviewIds.size > 0 ? 100 : 40),
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl
                                refreshing={weeklyFetching && !weeklyLoading}
                                onRefresh={() => weeklyRefetch()}
                                tintColor={colors.primary[500]}
                                colors={[colors.primary[500]]}
                            />
                        }
                    />
                    {selectedReviewIds.size > 0 && (
                        <View
                            style={{
                                position: 'absolute',
                                bottom: insets.bottom + 16,
                                left: 24,
                                right: 24,
                                backgroundColor: colors.primary[600],
                                borderRadius: 16,
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: colors.primary[900],
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {selectedReviewIds.size} selected
                            </Text>
                            <Pressable
                                onPress={handleMarkReviewed}
                                disabled={markReviewedMutation.isPending}
                                style={{
                                    backgroundColor: colors.white,
                                    borderRadius: 10,
                                    paddingVertical: 8,
                                    paddingHorizontal: 16,
                                    opacity: markReviewedMutation.isPending ? 0.6 : 1,
                                    minHeight: 44,
                                    justifyContent: 'center',
                                }}
                            >
                                <Text className="font-inter text-xs font-bold text-primary-700">
                                    {markReviewedMutation.isPending ? 'Processing...' : 'Mark Reviewed'}
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </>
            )}

            {activeTab === 'monthly' && (
                <FlashList
                    data={monthlyViewMode === 'list' ? monthlyListRecords : []}
                    renderItem={({ item, index }) => (
                        <RecordCard item={item} index={index} onPress={setDetailRecord} showDate />
                    )}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderRangeHeader('monthly')}
                    ListEmptyComponent={
                        monthlyViewMode === 'list'
                            ? renderRangeListEmpty('monthly')
                            : renderRangeCalendarEmpty('monthly')
                    }
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={monthlySummaryFetching && !monthlySummaryLoading}
                            onRefresh={() => {
                                refetchMonthlySummary();
                                if (monthlyViewMode === 'list') refetchMonthlyRecords();
                            }}
                            tintColor={colors.primary[500]}
                            colors={[colors.primary[500]]}
                        />
                    }
                />
            )}

            {activeTab === 'custom' && (
                <FlashList
                    data={customViewMode === 'list' ? customListRecords : []}
                    renderItem={({ item, index }) => (
                        <RecordCard item={item} index={index} onPress={setDetailRecord} showDate />
                    )}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderRangeHeader('custom')}
                    ListEmptyComponent={
                        customViewMode === 'list'
                            ? renderRangeListEmpty('custom')
                            : renderRangeCalendarEmpty('custom')
                    }
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={customSummaryFetching && !customSummaryLoading}
                            onRefresh={() => {
                                refetchCustomSummary();
                                if (customViewMode === 'list') refetchCustomRecords();
                            }}
                            tintColor={colors.primary[500]}
                            colors={[colors.primary[500]]}
                        />
                    }
                />
            )}

            {/* Detail modal */}
            {detailRecord && (
                <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
            )}

            {/* Bottom sheets */}
            <AttendanceFilterSheet
                visible={filterOpen}
                onClose={() => setFilterOpen(false)}
                initial={filters}
                onApply={setFilters}
                departments={departmentsOptions}
                locations={locationsOptions}
                designations={designationsOptions}
                employeeTypes={employeeTypesOptions}
                shifts={shiftsOptions}
                showStatus={activeTab === 'daily'}
                showSource={activeTab === 'daily'}
            />

            <MonthPickerSheet
                visible={monthPickerOpen}
                year={monthYear}
                monthIdx={monthIdx}
                onClose={() => setMonthPickerOpen(false)}
                onSelect={(y, m) => {
                    setMonthYear(y);
                    setMonthIdx(m);
                }}
            />

            <SimpleDatePickerSheet
                visible={customFromOpen}
                initial={customFrom}
                title="From Date"
                onClose={() => setCustomFromOpen(false)}
                onSelect={(d) => {
                    setCustomFrom(d);
                    if (d > customTo) setCustomTo(d);
                }}
            />
            <SimpleDatePickerSheet
                visible={customToOpen}
                initial={customTo}
                title="To Date"
                onClose={() => setCustomToOpen(false)}
                onSelect={(d) => {
                    setCustomTo(d);
                    if (d < customFrom) setCustomFrom(d);
                }}
            />

            <EmployeePickerSheet
                visible={monthlyEmployeePickerOpen}
                employees={monthlyCalendarEmployees}
                selectedId={monthlyEmployeeId}
                onClose={() => setMonthlyEmployeePickerOpen(false)}
                onSelect={setMonthlyEmployeeId}
            />
            <EmployeePickerSheet
                visible={customEmployeePickerOpen}
                employees={customCalendarEmployees}
                selectedId={customEmployeeId}
                onClose={() => setCustomEmployeePickerOpen(false)}
                onSelect={setCustomEmployeeId}
            />

            {monthlyCalendarDay && (
                <CalendarDayDetailSheet
                    day={monthlyCalendarDay}
                    fmt={fmt}
                    onClose={() => setMonthlyCalendarDay(null)}
                />
            )}
            {customCalendarDay && (
                <CalendarDayDetailSheet
                    day={customCalendarDay}
                    fmt={fmt}
                    onClose={() => setCustomCalendarDay(null)}
                />
            )}

            {/* Range parameter info — keeps `daysBetween` referenced for telemetry-style logging */}
            {false && <Text>{daysBetween(monthlyDateFrom, monthlyDateTo)}</Text>}
        </View>
    );
}

// ============ STYLES ============

const baseStyles = StyleSheet.create({
    datePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.primary[50],
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    dateArrow: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiCard: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 10,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    deptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    barBg: { width: 80, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary[400] },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        minHeight: 36,
        justifyContent: 'center',
    },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 14,
        marginBottom: 10,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});

const createStyles = (isDark: boolean) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
        kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
        datePicker: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderRadius: 16,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
            shadowColor: colors.primary[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 1,
        },
        dateArrow: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
        sectionCard: {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderRadius: 20,
            padding: 16,
            marginBottom: 16,
            shadowColor: colors.primary[900],
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
        },
        filterChip: {
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderWidth: 1,
            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
            minHeight: 36,
            justifyContent: 'center',
        },
        filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
        iconBtn: {
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
            justifyContent: 'center',
            alignItems: 'center',
        },
    });
