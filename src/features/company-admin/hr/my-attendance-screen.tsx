/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
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

import { useRegularizeAttendance } from '@/features/company-admin/api/use-ess-mutations';
import { useMyAttendance } from '@/features/company-admin/api/use-ess-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type DayStatus = 'present' | 'absent' | 'late' | 'leave' | 'weekend' | 'holiday' | 'half_day' | 'early_exit' | 'incomplete' | 'regularized' | 'lop' | 'none';

interface DayRecord {
    date: string;
    day: number;
    status: DayStatus;
    punchIn: string;
    punchOut: string;
    workedHours: number;
    geoStatus?: string;
    appliedBreakDeductionMinutes?: number;
}

interface AttendanceSummary {
    present: number;
    absent: number;
    late: number;
    leave: number;
}

// ============ CONSTANTS ============

const DAY_STATUS_COLORS: Record<DayStatus, string> = {
    present: colors.success[500],
    absent: colors.danger[500],
    late: colors.warning[500],
    leave: colors.info[500],
    weekend: colors.neutral[300],
    holiday: colors.accent[400],
    half_day: colors.warning[400],
    early_exit: colors.warning[600],
    incomplete: colors.danger[400],
    regularized: colors.success[400],
    lop: colors.danger[600],
    none: 'transparent',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ============ HELPERS ============

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

// formatTime removed — use fmt.time() from useCompanyFormatter inside components

// ============ CALENDAR VIEW ============

function MonthCalendar({ year, month, records, selectedDay, onSelectDay }: {
    year: number; month: number; records: DayRecord[];
    selectedDay: number | null; onSelectDay: (day: number) => void;
}) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const cells: (DayRecord | null)[] = [];

    // Pad start
    for (let i = 0; i < firstDay; i++) cells.push(null);
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const rec = records.find(r => r.day === d);
        cells.push(rec ?? { date: '', day: d, status: 'none', punchIn: '', punchOut: '', workedHours: 0 });
    }

    return (
        <View style={styles.calendarCard}>
            {/* Weekday headers */}
            <View style={styles.weekRow}>
                {WEEKDAYS.map(w => (
                    <View key={w} style={styles.weekCell}><Text className="font-inter text-[10px] font-bold text-neutral-400">{w}</Text></View>
                ))}
            </View>
            {/* Day cells */}
            <View style={styles.daysGrid}>
                {cells.map((cell, idx) => {
                    if (!cell) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                    const isSelected = cell.day === selectedDay;
                    const dotColor = DAY_STATUS_COLORS[cell.status];
                    return (
                        <Pressable key={cell.day} onPress={() => onSelectDay(cell.day)} style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
                            <Text className={`font-inter text-xs ${isSelected ? 'font-bold text-white' : 'text-primary-950 dark:text-white'}`}>{cell.day}</Text>
                            {cell.status !== 'none' && <View style={[styles.dayDot, { backgroundColor: dotColor }]} />}
                        </Pressable>
                    );
                })}
            </View>
            {/* Legend */}
            <View style={styles.legend}>
                {([
                    { key: 'present' as DayStatus, label: 'Present' },
                    { key: 'absent' as DayStatus, label: 'Absent' },
                    { key: 'late' as DayStatus, label: 'Late' },
                    { key: 'leave' as DayStatus, label: 'Leave' },
                    { key: 'half_day' as DayStatus, label: 'Half Day' },
                    { key: 'regularized' as DayStatus, label: 'Regularized' },
                ]).map(s => (
                    <View key={s.key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: DAY_STATUS_COLORS[s.key] }]} />
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{s.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ============ REGULARIZE MODAL ============

const ISSUE_TYPES = [
    { value: 'MISSING_PUNCH_IN', label: 'Missing Punch In' },
    { value: 'MISSING_PUNCH_OUT', label: 'Missing Punch Out' },
    { value: 'ABSENT_OVERRIDE', label: 'Absent Override' },
    { value: 'LATE_OVERRIDE', label: 'Late Override' },
    { value: 'NO_PUNCH', label: 'No Punch Record' },
];

function RegularizeModal({ visible, onClose, onSubmit, isSaving, date, record }: {
    visible: boolean; onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => void; isSaving: boolean;
    date: string; record?: any;
}) {
    const insets = useSafeAreaInsets();
    const [issueType, setIssueType] = React.useState('ABSENT_OVERRIDE');
    const [punchIn, setPunchIn] = React.useState('');
    const [punchOut, setPunchOut] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setPunchIn(''); setPunchOut(''); setReason('');
            // Auto-detect issue type from record
            if (record) {
                if (!record.punchIn && !record.punchOut) setIssueType('NO_PUNCH');
                else if (!record.punchIn) setIssueType('MISSING_PUNCH_IN');
                else if (!record.punchOut) setIssueType('MISSING_PUNCH_OUT');
                else if (record.isLate) setIssueType('LATE_OVERRIDE');
                else if (record.status === 'ABSENT') setIssueType('ABSENT_OVERRIDE');
                else setIssueType('NO_PUNCH');
            } else {
                setIssueType('ABSENT_OVERRIDE');
            }
        }
    }, [visible, record]);

    const showPunchIn = ['MISSING_PUNCH_IN', 'NO_PUNCH', 'ABSENT_OVERRIDE'].includes(issueType);
    const showPunchOut = ['MISSING_PUNCH_OUT', 'NO_PUNCH', 'ABSENT_OVERRIDE'].includes(issueType);
    const isValid = reason.trim() && (issueType === 'LATE_OVERRIDE' || (showPunchIn ? punchIn : true) && (showPunchOut ? punchOut : true));

    const handleSubmit = () => {
        if (!isValid) return;
        const payload: Record<string, unknown> = {
            issueType,
            reason: reason.trim(),
        };
        // Send record ID if exists, otherwise send date for absent days
        if (record?.id) {
            payload.attendanceRecordId = record.id;
        } else {
            payload.date = date;
        }
        if (punchIn && showPunchIn) payload.correctedPunchIn = `${date}T${punchIn}:00`;
        if (punchOut && showPunchOut) payload.correctedPunchOut = `${date}T${punchOut}:00`;
        onSubmit(payload);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-1">Request Regularization</Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-4">Date: {date}</Text>

                    {/* Issue Type */}
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Issue Type <Text className="text-danger-500">*</Text></Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                            <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                                {ISSUE_TYPES.map((t) => (
                                    <Pressable
                                        key={t.value}
                                        onPress={() => setIssueType(t.value)}
                                        style={[styles.chip, issueType === t.value && styles.chipActive]}
                                    >
                                        <Text className={`font-inter text-[11px] font-bold ${issueType === t.value ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{t.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Conditional time fields */}
                    {showPunchIn && (
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Corrected Punch In</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="09:00" placeholderTextColor={colors.neutral[400]} value={punchIn} onChangeText={setPunchIn} /></View>
                        </View>
                    )}
                    {showPunchOut && (
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Corrected Punch Out</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="18:00" placeholderTextColor={colors.neutral[400]} value={punchOut} onChangeText={setPunchOut} /></View>
                        </View>
                    )}
                    {issueType === 'LATE_OVERRIDE' && (
                        <View style={[styles.fieldWrap, { backgroundColor: colors.info[50], padding: 10, borderRadius: 8 }]}>
                            <Text className="font-inter text-xs text-info-700">Late override will clear the late flag without changing punch times.</Text>
                        </View>
                    )}

                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                        <View style={[styles.inputWrap, { height: 80 }]}>
                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for regularization..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSubmit} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function MyAttendanceScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const fmt = useCompanyFormatter();
    const formatTime = (time: string) => !time ? '--:--' : fmt.time(time);
    const now = new Date();
    const [year, setYear] = React.useState(now.getFullYear());
    const [month, setMonth] = React.useState(now.getMonth());
    const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
    const [regVisible, setRegVisible] = React.useState(false);

    const params = React.useMemo(() => ({ year: String(year), month: String(month + 1) }), [year, month]);
    const { data: response, isLoading, error, refetch, isFetching } = useMyAttendance(params as any);
    const regularizeMutation = useRegularizeAttendance();

    const goBack = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); } setSelectedDay(null); };
    const goForward = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); } setSelectedDay(null); };

    const data = React.useMemo(() => {
        const raw: any = (response as any)?.data ?? response ?? {};
        const mapStatus = (s: string): DayStatus => {
            switch ((s ?? '').toUpperCase()) {
                case 'PRESENT': return 'present';
                case 'ABSENT': return 'absent';
                case 'LATE': return 'late';
                case 'ON_LEAVE': return 'leave';
                case 'HALF_DAY': return 'half_day';
                case 'EARLY_EXIT': return 'early_exit';
                case 'INCOMPLETE': return 'incomplete';
                case 'HOLIDAY': return 'holiday';
                case 'WEEK_OFF': return 'weekend';
                case 'REGULARIZED': return 'regularized';
                case 'LOP': return 'lop';
                default: return (s ?? 'none').toLowerCase() as DayStatus;
            }
        };
        const recordsArr = Array.isArray(raw) ? raw : (raw.records ?? raw.days ?? []);
        const records: DayRecord[] = recordsArr.map((r: any) => ({
            date: r.date ?? '', day: r.day ?? new Date(r.date).getDate(),
            status: mapStatus(r.status),
            punchIn: r.punchIn ?? r.checkIn ?? '', punchOut: r.punchOut ?? r.checkOut ?? '',
            workedHours: Number(r.workedHours ?? r.totalHours ?? 0),
        }));
        const summary: AttendanceSummary = {
            present: raw.present ?? records.filter((r: DayRecord) => r.status === 'present' || r.status === 'regularized').length,
            absent: raw.absent ?? records.filter((r: DayRecord) => r.status === 'absent' || r.status === 'lop').length,
            late: raw.late ?? records.filter((r: DayRecord) => r.status === 'late').length,
            leave: raw.leave ?? raw.onLeave ?? records.filter((r: DayRecord) => r.status === 'leave').length,
        };
        return { records, summary };
    }, [response]);

    const selectedRecord = React.useMemo(() => {
        if (!selectedDay) return null;
        return data.records.find(r => r.day === selectedDay) ?? null;
    }, [selectedDay, data.records]);

    const selectedDateStr = selectedDay ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : '';

    const handleRegularize = (formData: Record<string, unknown>) => {
        regularizeMutation.mutate(formData, { onSuccess: () => setRegVisible(false) });
    };

    const kpiItems = [
        { label: 'Present', value: data.summary.present, color: colors.success[500] },
        { label: 'Absent', value: data.summary.absent, color: colors.danger[500] },
        { label: 'Late', value: data.summary.late, color: colors.warning[500] },
        { label: 'Leave', value: data.summary.leave, color: colors.info[500] },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="My Attendance" onMenuPress={toggle} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                {isLoading ? (
                    <View><SkeletonCard /><SkeletonCard /></View>
                ) : error ? (
                    <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
                ) : (
                    <>
                        {/* Month Navigator */}
                        <View style={styles.monthNav}>
                            <Pressable onPress={goBack} style={styles.navArrow}>
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{MONTH_NAMES[month]} {year}</Text>
                            <Pressable onPress={goForward} style={styles.navArrow}>
                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </Pressable>
                        </View>

                        {/* Calendar */}
                        <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                            <MonthCalendar year={year} month={month} records={data.records} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
                        </Animated.View>

                        {/* Summary KPIs */}
                        <View style={styles.kpiGrid}>
                            {kpiItems.map((item, idx) => (
                                <Animated.View key={item.label} entering={FadeInUp.duration(350).delay(200 + idx * 60)} style={[styles.kpiCard, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
                                    <Text className="font-inter text-xl font-bold" style={{ color: item.color }}>{item.value}</Text>
                                    <Text className="mt-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</Text>
                                </Animated.View>
                            ))}
                        </View>

                        {/* Selected Day Detail */}
                        {selectedRecord && (
                            <Animated.View entering={FadeInUp.duration(300)} style={styles.detailCard}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                                    {selectedDateStr} - {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                                </Text>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Punch In</Text><Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{formatTime(selectedRecord.punchIn)}</Text></View>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Punch Out</Text><Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{formatTime(selectedRecord.punchOut)}</Text></View>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Hours Worked</Text><Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{selectedRecord.workedHours > 0 ? `${selectedRecord.workedHours.toFixed(1)} hrs` : '--'}</Text></View>
                                {selectedRecord.geoStatus && (
                                    <View style={styles.detailRow}>
                                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Geofence</Text>
                                        <Text className={`font-inter text-xs font-bold ${
                                            selectedRecord.geoStatus === 'INSIDE_GEOFENCE' ? 'text-success-600' :
                                            selectedRecord.geoStatus === 'OUTSIDE_GEOFENCE' ? 'text-danger-600' : 'text-neutral-400'
                                        }`}>
                                            {selectedRecord.geoStatus === 'INSIDE_GEOFENCE' ? 'Inside' :
                                             selectedRecord.geoStatus === 'OUTSIDE_GEOFENCE' ? 'Outside' : 'N/A'}
                                        </Text>
                                    </View>
                                )}
                                {(selectedRecord.appliedBreakDeductionMinutes ?? 0) > 0 && (
                                    <View style={styles.detailRow}>
                                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Break Deducted</Text>
                                        <Text className="font-inter text-xs text-neutral-700 dark:text-neutral-300">
                                            {selectedRecord.appliedBreakDeductionMinutes} min
                                        </Text>
                                    </View>
                                )}
                                {(['absent', 'late', 'half_day', 'early_exit', 'incomplete', 'lop'].includes(selectedRecord.status) || !selectedRecord.punchIn || !selectedRecord.punchOut) && (
                                    <Pressable onPress={() => setRegVisible(true)} style={styles.regBtn}>
                                        <Text className="font-inter text-xs font-bold text-primary-600">Request Regularization</Text>
                                    </Pressable>
                                )}
                            </Animated.View>
                        )}
                    </>
                )}
            </ScrollView>
            <RegularizeModal visible={regVisible} onClose={() => setRegVisible(false)} onSubmit={handleRegularize} isSaving={regularizeMutation.isPending} date={selectedDateStr} record={selectedRecord} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    monthNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 12, marginBottom: 16,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    navArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    calendarCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    weekRow: { flexDirection: 'row', marginBottom: 8 },
    weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    dayCellSelected: { backgroundColor: colors.primary[600], borderRadius: 10 },
    dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: {
        flex: 1, minWidth: '45%', backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    detailCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    regBtn: { marginTop: 10, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
const styles = createStyles(false);
