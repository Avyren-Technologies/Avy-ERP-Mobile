/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useMyAttendance } from '@/features/company-admin/api/use-ess-queries';
import { useRegularizeAttendance } from '@/features/company-admin/api/use-ess-mutations';

// ============ TYPES ============

type DayStatus = 'present' | 'absent' | 'late' | 'leave' | 'weekend' | 'holiday' | 'none';

interface DayRecord {
    date: string;
    day: number;
    status: DayStatus;
    punchIn: string;
    punchOut: string;
    workedHours: number;
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

function formatTime(time: string): string {
    if (!time) return '--:--';
    try {
        const d = new Date(time);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return time; }
}

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
                            <Text className={`font-inter text-xs ${isSelected ? 'font-bold text-white' : 'text-primary-950'}`}>{cell.day}</Text>
                            {cell.status !== 'none' && <View style={[styles.dayDot, { backgroundColor: dotColor }]} />}
                        </Pressable>
                    );
                })}
            </View>
            {/* Legend */}
            <View style={styles.legend}>
                {(['present', 'absent', 'late', 'leave'] as DayStatus[]).map(s => (
                    <View key={s} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: DAY_STATUS_COLORS[s] }]} />
                        <Text className="font-inter text-[10px] text-neutral-500 capitalize">{s}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ============ REGULARIZE MODAL ============

function RegularizeModal({ visible, onClose, onSubmit, isSaving, date }: {
    visible: boolean; onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => void; isSaving: boolean;
    date: string;
}) {
    const insets = useSafeAreaInsets();
    const [punchIn, setPunchIn] = React.useState('');
    const [punchOut, setPunchOut] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) { setPunchIn(''); setPunchOut(''); setReason(''); }
    }, [visible]);

    const isValid = punchIn && punchOut && reason.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-1">Request Regularization</Text>
                    <Text className="font-inter text-xs text-neutral-500 mb-4">Date: {date}</Text>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Punch In Time <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="09:00 AM" placeholderTextColor={colors.neutral[400]} value={punchIn} onChangeText={setPunchIn} /></View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Punch Out Time <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="06:00 PM" placeholderTextColor={colors.neutral[400]} value={punchOut} onChangeText={setPunchOut} /></View>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Reason <Text className="text-danger-500">*</Text></Text>
                        <View style={[styles.inputWrap, { height: 80 }]}>
                            <TextInput style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]} placeholder="Reason for regularization..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => { if (isValid) onSubmit({ date, punchIn, punchOut, reason: reason.trim() }); }} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
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
    const insets = useSafeAreaInsets();
    const router = useRouter();

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
        const records: DayRecord[] = (raw.records ?? raw.days ?? []).map((r: any) => ({
            date: r.date ?? '', day: r.day ?? new Date(r.date).getDate(),
            status: (r.status ?? 'none').toLowerCase() as DayStatus,
            punchIn: r.punchIn ?? r.checkIn ?? '', punchOut: r.punchOut ?? r.checkOut ?? '',
            workedHours: r.workedHours ?? r.totalHours ?? 0,
        }));
        const summary: AttendanceSummary = {
            present: raw.present ?? records.filter((r: DayRecord) => r.status === 'present').length,
            absent: raw.absent ?? records.filter((r: DayRecord) => r.status === 'absent').length,
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">My Attendance</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">My Attendance</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Monthly attendance overview</Text>
                </Animated.View>

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
                            <Text className="font-inter text-sm font-bold text-primary-950">{MONTH_NAMES[month]} {year}</Text>
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
                                    <Text className="mt-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500">{item.label}</Text>
                                </Animated.View>
                            ))}
                        </View>

                        {/* Selected Day Detail */}
                        {selectedRecord && (
                            <Animated.View entering={FadeInUp.duration(300)} style={styles.detailCard}>
                                <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                                    {selectedDateStr} - {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                                </Text>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500">Punch In</Text><Text className="font-inter text-sm font-semibold text-primary-950">{formatTime(selectedRecord.punchIn)}</Text></View>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500">Punch Out</Text><Text className="font-inter text-sm font-semibold text-primary-950">{formatTime(selectedRecord.punchOut)}</Text></View>
                                <View style={styles.detailRow}><Text className="font-inter text-xs text-neutral-500">Hours Worked</Text><Text className="font-inter text-sm font-semibold text-primary-950">{selectedRecord.workedHours > 0 ? `${selectedRecord.workedHours.toFixed(1)} hrs` : '--'}</Text></View>
                                {(selectedRecord.status === 'absent' || !selectedRecord.punchIn) && (
                                    <Pressable onPress={() => setRegVisible(true)} style={styles.regBtn}>
                                        <Text className="font-inter text-xs font-bold text-primary-600">Request Regularization</Text>
                                    </Pressable>
                                )}
                            </Animated.View>
                        )}
                    </>
                )}
            </ScrollView>
            <RegularizeModal visible={regVisible} onClose={() => setRegVisible(false)} onSubmit={handleRegularize} isSaving={regularizeMutation.isPending} date={selectedDateStr} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    monthNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.white, borderRadius: 16, padding: 12, marginBottom: 16,
        borderWidth: 1, borderColor: colors.primary[50],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    navArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    calendarCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
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
        flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    detailCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    regBtn: { marginTop: 10, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary[200], backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
