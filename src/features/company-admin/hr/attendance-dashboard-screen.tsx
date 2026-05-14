/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useAttendanceRecords, useAttendanceSummary, useWeeklyReview, useWeeklyReviewSummary } from '@/features/company-admin/api/use-attendance-queries';
import { useMarkReviewed } from '@/features/company-admin/api/use-attendance-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface SummaryItem {
    label: string;
    value: number;
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

// ============ HELPERS ============

function getInitials(name: string) {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

// formatTime and formatDate removed — use fmt.time() / fmt.date() from useCompanyFormatter inside components

// ============ STATUS BADGE ============

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
        <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{label}</Text>
        </View>
    );
}

function LateBadge() {
    return (
        <View style={[styles.statusBadge, { backgroundColor: colors.warning[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-warning-700">Late</Text>
        </View>
    );
}

// ============ KPI CARD ============

function KpiCard({ item, index }: { item: SummaryItem; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)} style={[styles.kpiCard, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-xl font-bold" style={{ color: item.color }}>{item.value}</Text>
            <Text className="mt-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</Text>
        </Animated.View>
    );
}

// ============ DEPARTMENT BAR ============

function DepartmentBar({ item }: { item: DepartmentBreakdown }) {
    const pct = item.total > 0 ? (item.present / item.total) * 100 : 0;
    return (
        <View style={styles.deptRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                <Text className="font-inter text-[10px] text-neutral-400">{item.present}/{item.total} present</Text>
            </View>
            <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` as any }]} />
            </View>
            <Text className="ml-2 font-inter text-xs font-bold text-primary-700" style={{ width: 36, textAlign: 'right' }}>{Math.round(pct)}%</Text>
        </View>
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
        <View style={styles.datePicker}>
            <Pressable onPress={goBack} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{fmt.date(value.toISOString())}</Text>
                {isToday && <Text className="font-inter text-[10px] text-primary-500">Today</Text>}
            </View>
            <Pressable onPress={goForward} style={styles.dateArrow}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
        </View>
    );
}

// ============ DEPARTMENT FILTER ============

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            <Pressable onPress={() => onSelect('')} style={[styles.filterChip, !selectedId && styles.filterChipActive]}>
                <Text className={`font-inter text-xs font-semibold ${!selectedId ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>All</Text>
            </Pressable>
            {departments.map(d => {
                const active = d.id === selectedId;
                return (
                    <Pressable key={d.id} onPress={() => onSelect(d.id)} style={[styles.filterChip, active && styles.filterChipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{d.name}</Text>
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

function RecordCard({ item, index, onPress }: { item: AttendanceRecord; index: number; onPress: (r: AttendanceRecord) => void }) {
    const fmt = useCompanyFormatter();
    const formatTime = (time: string) => !time ? '--:--' : fmt.time(time);
    const initials = getInitials(item.employeeName);
    const hrs = typeof item.workedHours === 'number' && Number.isFinite(item.workedHours) ? item.workedHours
        : typeof item.workedHours === 'string' ? parseFloat(item.workedHours) || 0 : 0;
    const otHrs = item.overtimeHours != null && item.overtimeHours > 0 ? item.overtimeHours : null;

    const firstHalf = item.halves?.find(h => h.half === 'FIRST_HALF');
    const secondHalf = item.halves?.find(h => h.half === 'SECOND_HALF');

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 40)}>
            <Pressable onPress={() => onPress(item)}>
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <View style={styles.avatar}>
                            <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                                {item.isLate && <LateBadge />}
                            </View>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                {item.employeeCode}{item.department ? ` \u2022 ${item.department}` : ''}
                            </Text>
                            {item.shiftName ? (
                                <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1}>
                                    {item.shiftName} ({item.shiftTime})
                                </Text>
                            ) : null}
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    {/* Half-day statuses */}
                    {(firstHalf || secondHalf) && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                            {firstHalf && (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text className="font-inter text-[9px] font-bold text-neutral-400">1st:</Text>
                                    <StatusBadge status={firstHalf.status} />
                                    {firstHalf.leaveType?.name ? (
                                        <Text className="font-inter text-[8px] text-primary-500" numberOfLines={1}>{firstHalf.leaveType.name}</Text>
                                    ) : null}
                                </View>
                            )}
                            {secondHalf && (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text className="font-inter text-[9px] font-bold text-neutral-400">2nd:</Text>
                                    <StatusBadge status={secondHalf.status} />
                                    {secondHalf.leaveType?.name ? (
                                        <Text className="font-inter text-[8px] text-primary-500" numberOfLines={1}>{secondHalf.leaveType.name}</Text>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.cardMeta}>
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {formatTime(item.punchIn)}</Text>
                        </View>
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {formatTime(item.punchOut)}</Text>
                        </View>
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{hrs > 0 ? `${hrs.toFixed(1)} hrs` : '--'}</Text>
                        </View>
                        {item.isLate && item.lateMinutes ? (
                            <View style={[styles.metaChip, { backgroundColor: colors.warning[50] }]}>
                                <Text className="font-inter text-[10px] font-semibold" style={{ color: colors.warning[700] }}>Late {formatMinutes(item.lateMinutes)}</Text>
                            </View>
                        ) : null}
                        {item.isEarlyExit && item.earlyMinutes ? (
                            <View style={[styles.metaChip, { backgroundColor: colors.danger[50] }]}>
                                <Text className="font-inter text-[10px] font-semibold" style={{ color: colors.danger[700] }}>Early -{item.earlyMinutes}m</Text>
                            </View>
                        ) : null}
                        {otHrs != null && (
                            <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                                <Text className="font-inter text-[10px] font-semibold" style={{ color: colors.success[700] }}>OT {otHrs.toFixed(1)}h</Text>
                            </View>
                        )}
                    </View>
                    {item.finalStatusReason ? (
                        <Text className="font-inter text-[9px] text-neutral-400" numberOfLines={1} style={{ marginTop: 4, paddingHorizontal: 2 }}>
                            {item.finalStatusReason}
                        </Text>
                    ) : null}
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
    const hrs = typeof record.workedHours === 'number' && Number.isFinite(record.workedHours) ? record.workedHours : 0;
    const firstHalf = record.halves?.find(h => h.half === 'FIRST_HALF');
    const secondHalf = record.halves?.find(h => h.half === 'SECOND_HALF');
    const otHrs = record.overtimeHours != null && record.overtimeHours > 0 ? record.overtimeHours : null;

    return (
        <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}
            onPress={onClose}
        >
            <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                    width: '90%', maxHeight: '80%', backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderRadius: 24, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
                }}
            >
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{record.employeeName}</Text>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {record.employeeCode}{record.department ? ` · ${record.department}` : ''}{record.designation ? ` · ${record.designation}` : ''}
                        </Text>
                    </View>

                    <View style={{ padding: 20, gap: 16 }}>
                        {/* Status + Regularized */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <StatusBadge status={record.status} />
                            {record.isRegularized && (
                                <View style={[styles.statusBadge, { backgroundColor: colors.success[50] }]}>
                                    <Text className="font-inter text-[9px] font-bold text-success-700">REGULARIZED</Text>
                                </View>
                            )}
                        </View>

                        {/* Half-Day Details */}
                        {(firstHalf || secondHalf) && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {firstHalf && (
                                    <View style={{ flex: 1, backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                        <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">1st Half</Text>
                                        <StatusBadge status={firstHalf.status} />
                                        {firstHalf.leaveType?.name ? (
                                            <Text className="font-inter text-[10px] text-primary-500 mt-1 font-semibold">{firstHalf.leaveType.name}</Text>
                                        ) : null}
                                    </View>
                                )}
                                {secondHalf && (
                                    <View style={{ flex: 1, backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                        <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">2nd Half</Text>
                                        <StatusBadge status={secondHalf.status} />
                                        {secondHalf.leaveType?.name ? (
                                            <Text className="font-inter text-[10px] text-primary-500 mt-1 font-semibold">{secondHalf.leaveType.name}</Text>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Punch Times Grid */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Punch In</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{formatTime(record.punchIn)}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Punch Out</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{formatTime(record.punchOut)}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Worked Hours</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{hrs > 0 ? `${hrs.toFixed(1)} hrs` : '—'}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: '45%', backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Source</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{SOURCE_LABELS[record.source] ?? record.source ?? '—'}</Text>
                            </View>
                        </View>

                        {/* Shift */}
                        {record.shiftName ? (
                            <View style={{ backgroundColor: isDark ? colors.primary[900] + '20' : colors.primary[50], borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isDark ? colors.primary[800] + '30' : colors.primary[100] }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-primary-500 mb-1">Shift</Text>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{record.shiftName} <Text className="font-inter text-xs text-neutral-400">{record.shiftTime}</Text></Text>
                            </View>
                        ) : null}

                        {/* Late / Early Exit / OT */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1, backgroundColor: record.isLate ? colors.warning[50] : (isDark ? '#13112B' : colors.neutral[50]), borderRadius: 14, padding: 12, borderWidth: record.isLate ? 1 : 0, borderColor: colors.warning[200] }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Late</Text>
                                <Text className={`font-inter text-sm font-bold ${record.isLate ? 'text-warning-700' : 'text-success-600'}`}>
                                    {record.isLate ? formatMinutes(record.lateMinutes!) : 'On Time'}
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: record.isEarlyExit ? colors.danger[50] : (isDark ? '#13112B' : colors.neutral[50]), borderRadius: 14, padding: 12, borderWidth: record.isEarlyExit ? 1 : 0, borderColor: colors.danger[200] }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Early Exit</Text>
                                <Text className={`font-inter text-sm font-bold ${record.isEarlyExit ? 'text-danger-700' : 'text-neutral-400'}`}>
                                    {record.isEarlyExit ? `${record.earlyMinutes} min` : '—'}
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: otHrs != null ? colors.success[50] : (isDark ? '#13112B' : colors.neutral[50]), borderRadius: 14, padding: 12, borderWidth: otHrs != null ? 1 : 0, borderColor: colors.success[200] }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">OT</Text>
                                <Text className={`font-inter text-sm font-bold ${otHrs != null ? 'text-success-700' : 'text-neutral-400'}`}>
                                    {otHrs != null ? `${otHrs.toFixed(1)} hrs` : '—'}
                                </Text>
                            </View>
                        </View>

                        {/* Location */}
                        {record.location ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Svg width={13} height={13} viewBox="0 0 24 24">
                                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" />
                                    <Path d="M12 13a3 3 0 100-6 3 3 0 000 6z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" />
                                </Svg>
                                <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">{record.location}</Text>
                            </View>
                        ) : null}

                        {/* Break Deduction */}
                        {record.appliedBreakDeductionMinutes != null && record.appliedBreakDeductionMinutes > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Break Deduction</Text>
                                <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{record.appliedBreakDeductionMinutes} min</Text>
                            </View>
                        )}

                        {/* Status Reason */}
                        {record.finalStatusReason ? (
                            <View style={{ backgroundColor: isDark ? '#13112B' : colors.neutral[50], borderRadius: 14, padding: 12 }}>
                                <Text className="font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Status Reason</Text>
                                <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300">{record.finalStatusReason}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Close Button */}
                    <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100] }}>
                        <Pressable
                            onPress={onClose}
                            style={{
                                paddingVertical: 12, borderRadius: 14, borderWidth: 1,
                                borderColor: isDark ? colors.neutral[600] : colors.neutral[200],
                                alignItems: 'center',
                            }}
                        >
                            <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300">Close</Text>
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
    return monday.toISOString().split('T')[0]!;
}

function getWeekEnd(): string {
    const start = getWeekStart();
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0]!;
}

function FlagBadge({ flag }: { flag: string }) {
    const c = FLAG_COLORS[flag] ?? { bg: colors.neutral[100], text: 'text-neutral-600' };
    return (
        <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[9px] font-bold ${c.text}`}>{FLAG_LABELS[flag] ?? flag}</Text>
        </View>
    );
}

function WeeklyKpiCard({ label, value, color, index }: { label: string; value: number; color: string; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)} style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-xl font-bold" style={{ color }}>{value}</Text>
            <Text className="mt-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400" numberOfLines={1}>{label}</Text>
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
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 30)}>
            <View style={[styles.card, item.isReviewed && { opacity: 0.55 }]}>
                <View style={styles.cardRow}>
                    <Pressable
                        onPress={() => !item.isReviewed && onToggle(item.id)}
                        style={[
                            {
                                width: 24, height: 24, borderRadius: 6,
                                borderWidth: 2, borderColor: isSelected ? colors.primary[600] : colors.neutral[300],
                                backgroundColor: isSelected ? colors.primary[600] : 'transparent',
                                justifyContent: 'center', alignItems: 'center', marginRight: 8,
                            },
                            item.isReviewed && { borderColor: colors.success[400], backgroundColor: colors.success[400] },
                        ]}
                    >
                        {(isSelected || item.isReviewed) && (
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        )}
                    </Pressable>
                    <View style={styles.avatar}>
                        <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {item.employeeCode}{item.department ? ` \u2022 ${item.department}` : ''}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.date ? fmt.date(item.date) : '--'}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {formatTime(item.punchIn)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {formatTime(item.punchOut)}</Text>
                    </View>
                </View>
                {item.reviewFlags && item.reviewFlags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {item.reviewFlags.map(f => <FlagBadge key={f} flag={f} />)}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

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

export function AttendanceDashboardScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const [activeTab, setActiveTab] = React.useState<'daily' | 'weekly'>('daily');
    const [detailRecord, setDetailRecord] = React.useState<AttendanceRecord | null>(null);

    // ── Daily tab state ──
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [selectedDeptId, setSelectedDeptId] = React.useState('');

    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data: summaryResponse, isLoading: summaryLoading } = useAttendanceSummary();
    const { data: recordsResponse, isLoading: recordsLoading, error, refetch, isFetching } = useAttendanceRecords({
        date: dateStr,
        departmentId: selectedDeptId || undefined,
    } as any);

    const isLoading = summaryLoading || recordsLoading;

    // Parse summary — backend wraps counts in a `summary` sub-object
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

    // Parse department breakdown — backend uses `departmentBreakdown` array
    const departments: DepartmentBreakdown[] = React.useMemo(() => {
        const summaryRaw = (summaryResponse as any)?.data ?? summaryResponse ?? {};
        const raw = summaryRaw.departmentBreakdown ?? summaryRaw.departments ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((d: any) => ({
            id: d.departmentId ?? d.id ?? '',
            name: d.departmentName ?? d.name ?? '',
            present: d.present ?? 0,
            total: d.total ?? 0,
        }));
    }, [summaryResponse]);

    // Parse records — map nested employee/shift objects to flat fields
    const records: AttendanceRecord[] = React.useMemo(() => {
        const raw = (recordsResponse as any)?.data ?? recordsResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((r: any) => {
            const emp = r.employee ?? {};
            return {
                id: r.id ?? '',
                employeeName: r.employeeName ?? ([emp.firstName, emp.lastName].filter(Boolean).join(' ') || '—'),
                employeeCode: r.employeeCode ?? emp.employeeId ?? '',
                department: r.department ?? emp.department?.name ?? '',
                departmentId: r.departmentId ?? emp.department?.id ?? '',
                designation: r.designation ?? emp.designation?.name ?? '',
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
                halves: Array.isArray(r.halves) ? r.halves.map((h: any) => ({
                    id: h.id ?? '',
                    half: h.half,
                    status: h.status,
                    leaveType: h.leaveType ?? null,
                })) : [],
                location: r.location?.name ?? '',
                isRegularized: r.isRegularized ?? false,
                appliedBreakDeductionMinutes: r.appliedBreakDeductionMinutes ?? 0,
            };
        });
    }, [recordsResponse]);

    // ── Weekly Review tab state ──
    const [weekStart, setWeekStart] = React.useState(getWeekStart);
    const [weekEnd, setWeekEnd] = React.useState(getWeekEnd);
    const [weeklyFlag, setWeeklyFlag] = React.useState('');
    const [selectedReviewIds, setSelectedReviewIds] = React.useState<Set<string>>(new Set());

    const { data: weeklyReviewResponse, isLoading: weeklyLoading, refetch: weeklyRefetch, isFetching: weeklyFetching } = useWeeklyReview({ weekStart, weekEnd, flag: weeklyFlag || undefined });
    const { data: weeklySummaryResponse, isLoading: weeklySummaryLoading } = useWeeklyReviewSummary({ weekStart, weekEnd });
    const markReviewedMutation = useMarkReviewed();

    const weeklySummary = React.useMemo(() => {
        const raw = (weeklySummaryResponse as any)?.data ?? weeklySummaryResponse ?? {};
        // Flatten flagCounts to top-level for easier access
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
                employeeName: r.employeeName ?? ([emp.firstName, emp.lastName].filter(Boolean).join(' ') || '\u2014'),
                employeeCode: r.employeeCode ?? emp.employeeId ?? '',
                department: r.department ?? emp.department?.name ?? '',
                date: r.date ?? '',
                punchIn: r.punchIn ?? '',
                punchOut: r.punchOut ?? '',
                status: r.status ?? 'PRESENT',
                shiftName: r.shift?.name ?? '',
                shiftTime: r.shift ? `${r.shift.startTime} \u2013 ${r.shift.endTime}` : '',
                reviewFlags: r.reviewFlags ?? [],
                isReviewed: r.isReviewed ?? false,
            };
        });
    }, [weeklyReviewResponse]);

    const toggleReviewId = React.useCallback((id: string) => {
        setSelectedReviewIds(prev => {
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
        } catch (_err) {
            // error is handled via React Query
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

    // Navigate week
    const goWeekBack = React.useCallback(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(d.toISOString().split('T')[0]!);
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        setWeekEnd(e.toISOString().split('T')[0]!);
        setSelectedReviewIds(new Set());
    }, [weekStart]);

    const goWeekForward = React.useCallback(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(d.toISOString().split('T')[0]!);
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        setWeekEnd(e.toISOString().split('T')[0]!);
        setSelectedReviewIds(new Set());
    }, [weekStart]);

    const renderItem = ({ item, index }: { item: AttendanceRecord; index: number }) => (
        <RecordCard item={item} index={index} onPress={setDetailRecord} />
    );

    const renderHeader = () => (
        <>
            {/* Date Picker */}
            <DatePicker value={selectedDate} onChange={setSelectedDate} />

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                {kpiItems.map((item, idx) => (
                    <KpiCard key={item.label} item={item} index={idx} />
                ))}
            </View>

            {/* Department Breakdown */}
            {departments.length > 0 && (
                <Animated.View entering={FadeInUp.duration(350).delay(450)} style={styles.sectionCard}>
                    <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Department Breakdown</Text>
                    {departments.map(d => (
                        <DepartmentBar key={d.id} item={d} />
                    ))}
                </Animated.View>
            )}

            {/* Department Filter */}
            {departments.length > 0 && (
                <DepartmentFilter departments={departments} selectedId={selectedDeptId} onSelect={setSelectedDeptId} />
            )}

            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Records</Text>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load attendance" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No records" message="No attendance records found for this date." /></View>;
    };

    // ── Weekly Review list helpers ──
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
            {/* Week Picker */}
            <View style={styles.datePicker}>
                <Pressable onPress={goWeekBack} style={styles.dateArrow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                        {fmt.date(weekStart + 'T00:00:00Z')} - {fmt.date(weekEnd + 'T00:00:00Z')}
                    </Text>
                    <Text className="font-inter text-[10px] text-primary-500">Weekly Review</Text>
                </View>
                <Pressable onPress={goWeekForward} style={styles.dateArrow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                {weeklyKpiItems.map((item, idx) => (
                    <WeeklyKpiCard key={item.label} label={item.label} value={item.value} color={item.color} index={idx} />
                ))}
            </View>

            {/* Flag Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                {weeklyFlagOptions.map(opt => {
                    const active = weeklyFlag === opt.value;
                    return (
                        <Pressable
                            key={opt.value}
                            onPress={() => { setWeeklyFlag(opt.value); setSelectedReviewIds(new Set()); }}
                            style={[styles.filterChip, active && styles.filterChipActive]}
                        >
                            <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">Flagged Records</Text>
        </>
    );

    const renderWeeklyEmpty = () => {
        if (weeklyLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No flagged records" message="No records requiring review for this week." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader title="Attendance Dashboard" onMenuPress={toggle} />

            {/* Tab Switcher */}
            <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 12, backgroundColor: isDark ? '#1A1730' : colors.neutral[100], borderRadius: 12, padding: 3 }}>
                <Pressable
                    onPress={() => setActiveTab('daily')}
                    style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                        backgroundColor: activeTab === 'daily' ? (isDark ? colors.primary[900] : colors.white) : 'transparent',
                    }}
                >
                    <Text className={`font-inter text-xs font-bold ${activeTab === 'daily' ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        Daily View
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('weekly')}
                    style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                        backgroundColor: activeTab === 'weekly' ? (isDark ? colors.primary[900] : colors.white) : 'transparent',
                    }}
                >
                    <Text className={`font-inter text-xs font-bold ${activeTab === 'weekly' ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        Weekly Review
                    </Text>
                </Pressable>
            </View>

            {/* Daily Tab */}
            {activeTab === 'daily' && (
                <FlashList
                    data={records}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
                    }
                />
            )}

            {/* Weekly Review Tab */}
            {activeTab === 'weekly' && (
                <>
                    <FlashList
                        data={weeklyRecords}
                        renderItem={renderWeeklyItem}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderWeeklyHeader}
                        ListEmptyComponent={renderWeeklyEmpty}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + (selectedReviewIds.size > 0 ? 100 : 40) }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl refreshing={weeklyFetching && !weeklyLoading} onRefresh={() => weeklyRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
                        }
                    />
                    {/* Floating Mark Reviewed Bar */}
                    {selectedReviewIds.size > 0 && (
                        <View style={{
                            position: 'absolute', bottom: insets.bottom + 16, left: 24, right: 24,
                            backgroundColor: colors.primary[600], borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
                        }}>
                            <Text className="font-inter text-sm font-bold text-white">{selectedReviewIds.size} selected</Text>
                            <Pressable
                                onPress={handleMarkReviewed}
                                disabled={markReviewedMutation.isPending}
                                style={{
                                    backgroundColor: colors.white, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16,
                                    opacity: markReviewedMutation.isPending ? 0.6 : 1,
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

            {/* Detail Modal */}
            {detailRecord && (
                <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
            )}
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    datePicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16,
        padding: 12, marginBottom: 16, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    kpiCard: {
        flex: 1, minWidth: '30%', backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 14, padding: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    sectionCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    deptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    barBg: { width: 80, height: 6, borderRadius: 3, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary[400] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 14, marginBottom: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
const styles = createStyles(false);
