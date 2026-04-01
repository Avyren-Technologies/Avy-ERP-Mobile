/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
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

import { useAttendanceRecords, useAttendanceSummary } from '@/features/company-admin/api/use-attendance-queries';

// ============ TYPES ============

interface SummaryItem {
    label: string;
    value: number;
    color: string;
    bgColor: string;
    icon: string;
}

interface AttendanceRecord {
    id: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    departmentId: string;
    punchIn: string;
    punchOut: string;
    workedHours: number;
    status: string;
    isLate: boolean;
    lateMinutes: number | null;
    shiftName: string;
    shiftTime: string;
    finalStatusReason: string;
    source: string;
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

function formatTime(time: string) {
    if (!time) return '--:--';
    try {
        const d = new Date(time);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return time;
    }
}

function formatDate(date: Date) {
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

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
        WEEK_OFF: { bg: colors.neutral[100], text: 'text-neutral-600' },
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
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 80)} style={[styles.kpiCard, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
            <Text className="font-inter text-2xl font-bold" style={{ color: item.color }}>{item.value}</Text>
            <Text className="mt-1 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.label}</Text>
        </Animated.View>
    );
}

// ============ DEPARTMENT BAR ============

function DepartmentBar({ item }: { item: DepartmentBreakdown }) {
    const pct = item.total > 0 ? (item.present / item.total) * 100 : 0;
    return (
        <View style={styles.deptRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-xs font-semibold text-primary-950" numberOfLines={1}>{item.name}</Text>
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
                <Text className="font-inter text-sm font-bold text-primary-950">{formatDate(value)}</Text>
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
                <Text className={`font-inter text-xs font-semibold ${!selectedId ? 'text-white' : 'text-neutral-600'}`}>All</Text>
            </Pressable>
            {departments.map(d => {
                const active = d.id === selectedId;
                return (
                    <Pressable key={d.id} onPress={() => onSelect(d.id)} style={[styles.filterChip, active && styles.filterChipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{d.name}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ ATTENDANCE RECORD CARD ============

function RecordCard({ item, index }: { item: AttendanceRecord; index: number }) {
    const initials = getInitials(item.employeeName);
    const hrs = typeof item.workedHours === 'number' && Number.isFinite(item.workedHours) ? item.workedHours
        : typeof item.workedHours === 'string' ? parseFloat(item.workedHours) || 0 : 0;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 40)}>
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <View style={styles.avatar}>
                        <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
                            {item.isLate && <LateBadge />}
                        </View>
                        <Text className="font-inter text-[10px] text-neutral-500">
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
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">In: {formatTime(item.punchIn)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Out: {formatTime(item.punchOut)}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">{hrs > 0 ? `${hrs.toFixed(1)} hrs` : '--'}</Text>
                    </View>
                    {item.isLate && item.lateMinutes ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.warning[50] }]}>
                            <Text className="font-inter text-[10px] font-semibold" style={{ color: colors.warning[700] }}>Late {item.lateMinutes}m</Text>
                        </View>
                    ) : null}
                </View>
                {item.finalStatusReason ? (
                    <Text className="font-inter text-[9px] text-neutral-400" numberOfLines={1} style={{ marginTop: 4, paddingHorizontal: 2 }}>
                        {item.finalStatusReason}
                    </Text>
                ) : null}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function AttendanceDashboardScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
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
            present: s.present ?? 0,
            absent: s.absent ?? 0,
            late: s.late ?? 0,
            onLeave: s.onLeave ?? 0,
        };
    }, [summaryResponse]);

    const kpiItems: SummaryItem[] = [
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
                punchIn: r.punchIn ?? '',
                punchOut: r.punchOut ?? '',
                workedHours: r.workedHours ?? 0,
                status: r.status ?? 'PRESENT',
                isLate: r.isLate ?? false,
                lateMinutes: r.lateMinutes ?? null,
                shiftName: r.shift?.name ?? '',
                shiftTime: r.shift ? `${r.shift.startTime} – ${r.shift.endTime}` : '',
                finalStatusReason: r.finalStatusReason ?? '',
                source: r.source ?? '',
            };
        });
    }, [recordsResponse]);

    const renderItem = ({ item, index }: { item: AttendanceRecord; index: number }) => (
        <RecordCard item={item} index={index} />
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

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader title="Attendance Dashboard" onMenuPress={toggle} />

            <FlatList
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
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    datePicker: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16,
        padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    dateArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: {
        flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    deptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    barBg: { width: 80, height: 6, borderRadius: 3, backgroundColor: colors.neutral[100], overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary[400] },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 14, marginBottom: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
