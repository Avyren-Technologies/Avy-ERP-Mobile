/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { DateTime } from 'luxon';

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
import { FlashList } from '@shopify/flash-list';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateAttendanceOverride,
    useUpdateAttendanceOverride,
} from '@/features/company-admin/api/use-attendance-mutations';
import { useAttendanceOverrides } from '@/features/company-admin/api/use-attendance-queries';
import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import { attendanceApi } from '@/lib/api/attendance';
import { hrApi } from '@/lib/api/hr';

// ============ TYPES ============

type OverrideStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type IssueType = 'MISSING_PUNCH_IN' | 'MISSING_PUNCH_OUT' | 'ABSENT_OVERRIDE' | 'LATE_OVERRIDE' | 'NO_PUNCH';

const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
    { value: 'MISSING_PUNCH_IN', label: 'Missing Punch-In' },
    { value: 'MISSING_PUNCH_OUT', label: 'Missing Punch-Out' },
    { value: 'ABSENT_OVERRIDE', label: 'Absent Override' },
    { value: 'LATE_OVERRIDE', label: 'Late Override' },
    { value: 'NO_PUNCH', label: 'No Punch' },
];

const ISSUE_TYPE_LABEL_MAP: Record<IssueType, string> = {
    MISSING_PUNCH_IN: 'Missing Punch-In',
    MISSING_PUNCH_OUT: 'Missing Punch-Out',
    ABSENT_OVERRIDE: 'Absent Override',
    LATE_OVERRIDE: 'Late Override',
    NO_PUNCH: 'No Punch',
};

const FILTER_TABS: { label: string; value: string }[] = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
];

interface OverrideItem {
    id: string;
    employeeName: string;
    employeeCode: string;
    date: string;
    issueType: IssueType;
    correctedPunchIn: string;
    correctedPunchOut: string;
    reason: string;
    status: OverrideStatus;
}

interface SelectedEmployee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentName: string;
}

interface SelectedRecord {
    id: string;
    date: string;
    status: string;
    punchIn: string;
    punchOut: string;
    workedHours: number | null;
}

interface TimeSelection {
    hour: number;   // 1-12
    minute: number; // 0,5,10,...55
    period: 'AM' | 'PM';
}

const STATUS_COLORS: Record<OverrideStatus, { bg: string; text: string }> = {
    PENDING: { bg: colors.warning[50], text: 'text-warning-700' },
    APPROVED: { bg: colors.success[50], text: 'text-success-700' },
    REJECTED: { bg: colors.danger[50], text: 'text-danger-600' },
};

const ISSUE_COLORS: Record<IssueType, { bg: string; text: string }> = {
    MISSING_PUNCH_IN: { bg: colors.info[50], text: 'text-info-700' },
    MISSING_PUNCH_OUT: { bg: colors.info[50], text: 'text-info-700' },
    ABSENT_OVERRIDE: { bg: colors.danger[50], text: 'text-danger-600' },
    LATE_OVERRIDE: { bg: colors.warning[50], text: 'text-warning-700' },
    NO_PUNCH: { bg: colors.neutral[100], text: 'text-neutral-600 dark:text-neutral-400' },
};

const RECORD_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PRESENT: { bg: colors.success[50], text: 'text-success-700' },
    ABSENT: { bg: colors.danger[50], text: 'text-danger-600' },
    LATE: { bg: colors.warning[50], text: 'text-warning-700' },
    HALF_DAY: { bg: colors.warning[50], text: 'text-warning-700' },
    ON_LEAVE: { bg: colors.info[50], text: 'text-info-700' },
    WEEK_OFF: { bg: colors.neutral[100], text: 'text-neutral-600 dark:text-neutral-400' },
    HOLIDAY: { bg: colors.accent[50], text: 'text-accent-700' },
};

// ============ HELPERS ============

function needsCorrectedPunchIn(issueType: IssueType): boolean {
    return issueType === 'MISSING_PUNCH_IN' || issueType === 'NO_PUNCH';
}

function needsCorrectedPunchOut(issueType: IssueType): boolean {
    return issueType === 'MISSING_PUNCH_OUT' || issueType === 'NO_PUNCH';
}

function timeSelectionTo24h(ts: TimeSelection): { hour: number; minute: number } {
    let hour24 = ts.hour;
    if (ts.period === 'AM') {
        if (hour24 === 12) hour24 = 0;
    } else {
        if (hour24 !== 12) hour24 += 12;
    }
    return { hour: hour24, minute: ts.minute };
}

function formatTimeSelection(ts: TimeSelection | null): string {
    if (!ts) return 'Select Time';
    const hStr = String(ts.hour);
    const mStr = String(ts.minute).padStart(2, '0');
    return `${hStr}:${mStr} ${ts.period}`;
}

function convertToISO(ts: TimeSelection, recordDate: string, timezone: string): string {
    const { hour, minute } = timeSelectionTo24h(ts);
    const dateParts = recordDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);

    const dt = DateTime.fromObject(
        { year, month, day, hour, minute, second: 0 },
        { zone: timezone },
    );
    return dt.toUTC().toISO() ?? '';
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ============ BADGES ============

function OverrideStatusBadge({ status }: { status: OverrideStatus }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
    const label = status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : 'Rejected';
    return (
        <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{label}</Text>
        </View>
    );
}

function IssueTypeBadge({ type }: { type: IssueType }) {
    const c = ISSUE_COLORS[type] ?? ISSUE_COLORS.NO_PUNCH;
    const label = ISSUE_TYPE_LABEL_MAP[type] ?? type;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{label}</Text>
        </View>
    );
}

function RecordStatusBadge({ status }: { status: string }) {
    const c = RECORD_STATUS_COLORS[status] ?? RECORD_STATUS_COLORS.PRESENT;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});

// ============ CHIP SELECTOR (with label/value) ============

function ChipSelector({
    label,
    options,
    value,
    onSelect,
    isDark,
}: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
    isDark: boolean;
}) {
    return (
        <View style={fieldStyles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt.value === value;
                    return (
                        <Pressable
                            key={opt.value}
                            onPress={() => onSelect(opt.value)}
                            style={[
                                chipStylesStatic.chip,
                                { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
                                selected && chipStylesStatic.chipActive,
                            ]}
                        >
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const chipStylesStatic = StyleSheet.create({
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});

const fieldStyles = StyleSheet.create({
    fieldWrap: { marginBottom: 14 },
});

// ============ TIME PICKER MODAL ============

function TimePickerModal({
    visible,
    onClose,
    onConfirm,
    initialValue,
    title,
    isDark,
}: {
    visible: boolean;
    onClose: () => void;
    onConfirm: (ts: TimeSelection) => void;
    initialValue: TimeSelection | null;
    title: string;
    isDark: boolean;
}) {
    const [hour, setHour] = React.useState(initialValue?.hour ?? 9);
    const [minute, setMinute] = React.useState(initialValue?.minute ?? 0);
    const [period, setPeriod] = React.useState<'AM' | 'PM'>(initialValue?.period ?? 'AM');

    React.useEffect(() => {
        if (visible) {
            setHour(initialValue?.hour ?? 9);
            setMinute(initialValue?.minute ?? 0);
            setPeriod(initialValue?.period ?? 'AM');
        }
    }, [visible, initialValue?.hour, initialValue?.minute, initialValue?.period]);

    const bgColor = isDark ? '#1A1730' : colors.white;
    const itemBg = isDark ? '#1E1B4B' : colors.neutral[50];
    const selectedItemBg = colors.primary[600];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8, 15, 40, 0.5)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[timePickerStyles.container, { backgroundColor: bgColor }]}>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">{title}</Text>

                    <View style={timePickerStyles.pickersRow}>
                        {/* Hour picker */}
                        <View style={timePickerStyles.pickerColumn}>
                            <Text className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mb-2">HOUR</Text>
                            <ScrollView style={timePickerStyles.scrollCol} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                {HOURS.map(h => {
                                    const isSelected = h === hour;
                                    return (
                                        <Pressable
                                            key={h}
                                            onPress={() => setHour(h)}
                                            style={[timePickerStyles.pickerItem, { backgroundColor: isSelected ? selectedItemBg : itemBg }]}
                                        >
                                            <Text className={`font-inter text-sm font-semibold ${isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                {String(h)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Minute picker */}
                        <View style={timePickerStyles.pickerColumn}>
                            <Text className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mb-2">MIN</Text>
                            <ScrollView style={timePickerStyles.scrollCol} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                {MINUTES.map(m => {
                                    const isSelected = m === minute;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => setMinute(m)}
                                            style={[timePickerStyles.pickerItem, { backgroundColor: isSelected ? selectedItemBg : itemBg }]}
                                        >
                                            <Text className={`font-inter text-sm font-semibold ${isSelected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                                {String(m).padStart(2, '0')}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* AM/PM toggle */}
                        <View style={timePickerStyles.pickerColumn}>
                            <Text className="font-inter text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mb-2">PERIOD</Text>
                            <View style={{ gap: 8 }}>
                                <Pressable
                                    onPress={() => setPeriod('AM')}
                                    style={[timePickerStyles.periodBtn, { backgroundColor: period === 'AM' ? selectedItemBg : itemBg }]}
                                >
                                    <Text className={`font-inter text-sm font-bold ${period === 'AM' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>AM</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setPeriod('PM')}
                                    style={[timePickerStyles.periodBtn, { backgroundColor: period === 'PM' ? selectedItemBg : itemBg }]}
                                >
                                    <Text className={`font-inter text-sm font-bold ${period === 'PM' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>PM</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <Pressable
                            onPress={onClose}
                            style={[timePickerStyles.actionBtn, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                        >
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onConfirm({ hour, minute, period })}
                            style={[timePickerStyles.actionBtn, { backgroundColor: colors.primary[600] }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">Confirm</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const timePickerStyles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 24,
        width: '85%',
        maxWidth: 360,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    pickersRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
    pickerColumn: { alignItems: 'center', flex: 1 },
    scrollCol: { maxHeight: 200 },
    pickerItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 6,
        alignItems: 'center',
        minWidth: 56,
    },
    periodBtn: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 56,
    },
    actionBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// ============ FILTER TABS ============

function FilterTabs({ value, onSelect, isDark }: { value: string; onSelect: (v: string) => void; isDark: boolean }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {FILTER_TABS.map(tab => {
                const active = tab.value === value;
                const tabColor = tab.value === 'PENDING' ? colors.warning : tab.value === 'APPROVED' ? colors.success : tab.value === 'REJECTED' ? colors.danger : null;
                return (
                    <Pressable
                        key={tab.value}
                        onPress={() => onSelect(tab.value)}
                        style={[
                            filterTabStyles.filterTab,
                            { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
                            active && (tabColor
                                ? { backgroundColor: tabColor[50], borderColor: tabColor[200] }
                                : filterTabStyles.filterTabActive),
                        ]}
                    >
                        <Text
                            className={`font-inter text-xs font-semibold ${active ? (tabColor ? '' : 'text-white') : 'text-neutral-600 dark:text-neutral-400'}`}
                            style={active && tabColor ? { color: tabColor[700] } : undefined}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const filterTabStyles = StyleSheet.create({
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterTabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});

// ============ CREATE OVERRIDE MODAL ============

function CreateOverrideModal({
    visible,
    onClose,
    onSave,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const { data: settingsData } = useCompanySettings();
    const settingsRaw = (settingsData as any)?.data;
    const timezone = settingsRaw?.timezone ?? 'Asia/Kolkata';

    // Step state: 1=employee, 2=record, 3=issueType, 4=time+reason
    const [step, setStep] = React.useState(1);

    // Employee search
    const [searchTerm, setSearchTerm] = React.useState('');
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [selectedEmployee, setSelectedEmployee] = React.useState<SelectedEmployee | null>(null);

    // Attendance records
    const [records, setRecords] = React.useState<any[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = React.useState(false);
    const [selectedRecord, setSelectedRecord] = React.useState<SelectedRecord | null>(null);

    // Issue type
    const [issueType, setIssueType] = React.useState<IssueType | ''>('');

    // Corrected times
    const [punchInTime, setPunchInTime] = React.useState<TimeSelection | null>(null);
    const [punchOutTime, setPunchOutTime] = React.useState<TimeSelection | null>(null);
    const [showPunchInPicker, setShowPunchInPicker] = React.useState(false);
    const [showPunchOutPicker, setShowPunchOutPicker] = React.useState(false);

    // Reason
    const [reason, setReason] = React.useState('');

    // Reset on open
    React.useEffect(() => {
        if (visible) {
            setStep(1);
            setSearchTerm('');
            setEmployees([]);
            setSelectedEmployee(null);
            setRecords([]);
            setSelectedRecord(null);
            setIssueType('');
            setPunchInTime(null);
            setPunchOutTime(null);
            setReason('');
        }
    }, [visible]);

    // Debounced employee search
    const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    React.useEffect(() => {
        if (!searchTerm.trim() || searchTerm.trim().length < 2) {
            setEmployees([]);
            return;
        }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await hrApi.listEmployees({ search: searchTerm.trim(), limit: 10 });
                const data = (response as any)?.data?.data ?? (response as any)?.data ?? [];
                setEmployees(Array.isArray(data) ? data : []);
            } catch {
                setEmployees([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchTerm]);

    // Fetch records when employee selected
    const handleSelectEmployee = React.useCallback(async (emp: any) => {
        const selected: SelectedEmployee = {
            id: emp.id,
            employeeId: emp.employeeId ?? '',
            firstName: emp.firstName ?? '',
            lastName: emp.lastName ?? '',
            departmentName: emp.department?.name ?? '',
        };
        setSelectedEmployee(selected);
        setStep(2);
        setIsLoadingRecords(true);
        try {
            const response = await attendanceApi.listRecords({ employeeId: emp.id, limit: 20 });
            const data = (response as any)?.data?.data ?? (response as any)?.data ?? [];
            setRecords(Array.isArray(data) ? data : []);
        } catch {
            setRecords([]);
        } finally {
            setIsLoadingRecords(false);
        }
    }, []);

    // Select record
    const handleSelectRecord = React.useCallback((rec: any) => {
        setSelectedRecord({
            id: rec.id,
            date: rec.date ?? '',
            status: rec.status ?? '',
            punchIn: rec.punchIn ?? rec.checkIn ?? '',
            punchOut: rec.punchOut ?? rec.checkOut ?? '',
            workedHours: rec.workedHours ?? rec.totalWorkedHours ?? null,
        });
        setStep(3);
    }, []);

    // Select issue type
    const handleSelectIssueType = React.useCallback((val: string) => {
        const typed = val as IssueType;
        setIssueType(typed);
        setPunchInTime(null);
        setPunchOutTime(null);
        setStep(4);
    }, []);

    // Validation
    const isValid = React.useMemo(() => {
        if (!selectedRecord || !issueType || !reason.trim()) return false;
        if (needsCorrectedPunchIn(issueType as IssueType) && !punchInTime) return false;
        if (needsCorrectedPunchOut(issueType as IssueType) && !punchOutTime) return false;
        return true;
    }, [selectedRecord, issueType, reason, punchInTime, punchOutTime]);

    // Submit
    const handleSave = () => {
        if (!isValid || !selectedRecord || !issueType) return;
        const payload: Record<string, unknown> = {
            attendanceRecordId: selectedRecord.id,
            issueType,
            reason: reason.trim(),
        };
        if (needsCorrectedPunchIn(issueType as IssueType) && punchInTime) {
            payload.correctedPunchIn = convertToISO(punchInTime, selectedRecord.date, timezone);
        }
        if (needsCorrectedPunchOut(issueType as IssueType) && punchOutTime) {
            payload.correctedPunchOut = convertToISO(punchOutTime, selectedRecord.date, timezone);
        }
        onSave(payload);
    };

    const formBg = isDark ? '#1A1730' : colors.white;
    const inputBg = isDark ? '#1E1B4B' : colors.neutral[50];
    const inputBorder = isDark ? colors.neutral[700] : colors.neutral[200];
    const textColor = isDark ? colors.neutral[100] : colors.primary[950];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[createModalStyles.formSheet, { backgroundColor: formBg, paddingBottom: insets.bottom + 20 }]}>
                    <View style={createModalStyles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">New Override Request</Text>

                    {/* Step indicator */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                        {[1, 2, 3, 4].map(s => (
                            <View key={s} style={[createModalStyles.stepDot, { backgroundColor: step >= s ? colors.primary[600] : (isDark ? colors.neutral[700] : colors.neutral[200]) }]} />
                        ))}
                    </View>

                    <KeyboardAwareScrollView bottomOffset={20} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* ─── Selected Record Summary ─── */}
                        {selectedRecord && selectedEmployee && (
                            <Animated.View entering={FadeInDown.duration(300)}>
                                <View style={[createModalStyles.summaryCard, { backgroundColor: isDark ? '#1E1B4B' : colors.primary[50], borderColor: isDark ? colors.primary[800] : colors.primary[100] }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                                            </Text>
                                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                {selectedEmployee.employeeId}{selectedEmployee.departmentName ? ` \u2022 ${selectedEmployee.departmentName}` : ''}
                                            </Text>
                                        </View>
                                        <RecordStatusBadge status={selectedRecord.status} />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                        <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                            Date: {selectedRecord.date ? fmt.date(selectedRecord.date) : '\u2014'}
                                        </Text>
                                        {selectedRecord.punchIn ? (
                                            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                                In: {fmt.time(selectedRecord.punchIn)}
                                            </Text>
                                        ) : null}
                                        {selectedRecord.punchOut ? (
                                            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                                Out: {fmt.time(selectedRecord.punchOut)}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={() => { setSelectedRecord(null); setSelectedEmployee(null); setIssueType(''); setPunchInTime(null); setPunchOutTime(null); setReason(''); setStep(1); }}
                                        style={{ marginTop: 8 }}
                                    >
                                        <Text className="font-inter text-xs font-semibold text-primary-600">Change Selection</Text>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        )}

                        {/* ─── STEP 1: Employee Search ─── */}
                        {step === 1 && (
                            <Animated.View entering={FadeInDown.duration(300)}>
                                <View style={fieldStyles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        Search Employee <Text className="text-danger-500">*</Text>
                                    </Text>
                                    <View style={[createModalStyles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        <TextInput
                                            style={[createModalStyles.textInput, { color: textColor }]}
                                            placeholder="Type employee name or ID..."
                                            placeholderTextColor={colors.neutral[400]}
                                            value={searchTerm}
                                            onChangeText={setSearchTerm}
                                            autoFocus
                                        />
                                    </View>
                                </View>
                                {isSearching && (
                                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mb-2">Searching...</Text>
                                )}
                                {employees.length > 0 && (
                                    <View style={[createModalStyles.resultsList, { borderColor: inputBorder }]}>
                                        {employees.map((emp: any) => (
                                            <Pressable
                                                key={emp.id}
                                                onPress={() => handleSelectEmployee(emp)}
                                                style={[createModalStyles.resultItem, { borderBottomColor: inputBorder }]}
                                            >
                                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                                    {emp.employeeId} {'\u2014'} {emp.firstName} {emp.lastName}
                                                </Text>
                                                {emp.department?.name ? (
                                                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                        {emp.department.name}
                                                    </Text>
                                                ) : null}
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                {searchTerm.trim().length >= 2 && !isSearching && employees.length === 0 && (
                                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">No employees found</Text>
                                )}
                            </Animated.View>
                        )}

                        {/* ─── STEP 2: Attendance Record Selection ─── */}
                        {step === 2 && (
                            <Animated.View entering={FadeInDown.duration(300)}>
                                <View style={fieldStyles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        Select Attendance Record <Text className="text-danger-500">*</Text>
                                    </Text>
                                    {isLoadingRecords ? (
                                        <View style={{ paddingVertical: 16 }}>
                                            <SkeletonCard />
                                            <SkeletonCard />
                                        </View>
                                    ) : records.length === 0 ? (
                                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 py-4">
                                            No attendance records found for this employee
                                        </Text>
                                    ) : (
                                        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                            {records.map((rec: any) => {
                                                const recStatus = rec.status ?? '';
                                                const sc = RECORD_STATUS_COLORS[recStatus] ?? RECORD_STATUS_COLORS.PRESENT;
                                                return (
                                                    <Pressable
                                                        key={rec.id}
                                                        onPress={() => handleSelectRecord(rec)}
                                                        style={[
                                                            createModalStyles.recordCard,
                                                            { backgroundColor: isDark ? '#1E1B4B' : colors.white, borderColor: isDark ? colors.primary[800] : colors.neutral[200] },
                                                        ]}
                                                    >
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                                                {rec.date ? fmt.date(rec.date) : '\u2014'}
                                                            </Text>
                                                            <View style={[badgeStyles.badge, { backgroundColor: sc.bg }]}>
                                                                <Text className={`font-inter text-[10px] font-bold ${sc.text}`}>{recStatus}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                                                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                                                In: {rec.punchIn || rec.checkIn ? fmt.time(rec.punchIn || rec.checkIn) : '\u2014'}
                                                            </Text>
                                                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                                                Out: {rec.punchOut || rec.checkOut ? fmt.time(rec.punchOut || rec.checkOut) : '\u2014'}
                                                            </Text>
                                                            {(rec.workedHours ?? rec.totalWorkedHours) != null && (
                                                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                                                    {Number(rec.workedHours ?? rec.totalWorkedHours).toFixed(1)}h
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </Pressable>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>
                                <Pressable onPress={() => setStep(1)} style={{ marginTop: 4, marginBottom: 8 }}>
                                    <Text className="font-inter text-xs font-semibold text-primary-600">{'< Back to Employee Search'}</Text>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* ─── STEP 3: Issue Type ─── */}
                        {step === 3 && (
                            <Animated.View entering={FadeInDown.duration(300)}>
                                <ChipSelector
                                    label="Issue Type"
                                    options={ISSUE_TYPE_OPTIONS}
                                    value={issueType}
                                    onSelect={handleSelectIssueType}
                                    isDark={isDark}
                                />
                            </Animated.View>
                        )}

                        {/* ─── STEP 4: Corrected Times + Reason ─── */}
                        {step === 4 && issueType && (
                            <Animated.View entering={FadeInDown.duration(300)}>
                                {/* Issue type display */}
                                <View style={[fieldStyles.fieldWrap, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                    <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Issue:</Text>
                                    <IssueTypeBadge type={issueType as IssueType} />
                                    <Pressable onPress={() => { setStep(3); setIssueType(''); setPunchInTime(null); setPunchOutTime(null); }}>
                                        <Text className="font-inter text-xs font-semibold text-primary-600">Change</Text>
                                    </Pressable>
                                </View>

                                {/* Corrected Punch In */}
                                {needsCorrectedPunchIn(issueType as IssueType) && (
                                    <View style={fieldStyles.fieldWrap}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                            Corrected Punch-In <Text className="text-danger-500">*</Text>
                                        </Text>
                                        <Pressable
                                            onPress={() => setShowPunchInPicker(true)}
                                            style={[createModalStyles.timeBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                        >
                                            <Text className={`font-inter text-sm ${punchInTime ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                                                {formatTimeSelection(punchInTime)}
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                                {/* Corrected Punch Out */}
                                {needsCorrectedPunchOut(issueType as IssueType) && (
                                    <View style={fieldStyles.fieldWrap}>
                                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                            Corrected Punch-Out <Text className="text-danger-500">*</Text>
                                        </Text>
                                        <Pressable
                                            onPress={() => setShowPunchOutPicker(true)}
                                            style={[createModalStyles.timeBtn, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                        >
                                            <Text className={`font-inter text-sm ${punchOutTime ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
                                                {formatTimeSelection(punchOutTime)}
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                                {/* Reason */}
                                <View style={fieldStyles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        Reason <Text className="text-danger-500">*</Text>
                                    </Text>
                                    <View style={[createModalStyles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder, height: 80 }]}>
                                        <TextInput
                                            style={[createModalStyles.textInput, { textAlignVertical: 'top', color: textColor }]}
                                            placeholder="Reason for override..."
                                            placeholderTextColor={colors.neutral[400]}
                                            value={reason}
                                            onChangeText={setReason}
                                            multiline
                                        />
                                    </View>
                                </View>
                            </Animated.View>
                        )}
                    </KeyboardAwareScrollView>

                    {/* Action buttons - only show submit on step 4 */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable
                            onPress={onClose}
                            style={[createModalStyles.cancelBtn, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                        >
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        {step === 4 && (
                            <Pressable
                                onPress={handleSave}
                                disabled={!isValid || isSaving}
                                style={[createModalStyles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit Override'}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>

            {/* Time picker modals */}
            <TimePickerModal
                visible={showPunchInPicker}
                onClose={() => setShowPunchInPicker(false)}
                onConfirm={(ts) => { setPunchInTime(ts); setShowPunchInPicker(false); }}
                initialValue={punchInTime}
                title="Select Punch-In Time"
                isDark={isDark}
            />
            <TimePickerModal
                visible={showPunchOutPicker}
                onClose={() => setShowPunchOutPicker(false)}
                onConfirm={(ts) => { setPunchOutTime(ts); setShowPunchOutPicker(false); }}
                initialValue={punchOutTime}
                title="Select Punch-Out Time"
                isDark={isDark}
            />
        </Modal>
    );
}

const createModalStyles = StyleSheet.create({
    formSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        alignSelf: 'center',
        marginBottom: 16,
    },
    stepDot: {
        width: 32,
        height: 4,
        borderRadius: 2,
    },
    inputWrap: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: {
        fontFamily: 'Inter',
        fontSize: 14,
    },
    resultsList: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 8,
    },
    resultItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    recordCard: {
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
    },
    summaryCard: {
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
    },
    timeBtn: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    saveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

// ============ OVERRIDE CARD ============

function OverrideCard({
    item,
    index,
    onApprove,
    onReject,
    isDark,
    fmt,
}: {
    item: OverrideItem;
    index: number;
    onApprove: () => void;
    onReject: () => void;
    isDark: boolean;
    fmt: ReturnType<typeof useCompanyFormatter>;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 50)}>
            <View style={[
                cardStyles.card,
                {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[50],
                },
            ]}>
                <View style={cardStyles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-0.5 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {item.employeeCode} {'\u2022'} {item.date ? fmt.date(item.date) : item.date}
                        </Text>
                    </View>
                    <OverrideStatusBadge status={item.status} />
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <IssueTypeBadge type={item.issueType} />
                </View>

                {(item.correctedPunchIn || item.correctedPunchOut) && (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        {item.correctedPunchIn ? (
                            <View style={[cardStyles.metaChip, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50] }]}>
                                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.correctedPunchIn)}</Text>
                            </View>
                        ) : null}
                        {item.correctedPunchOut ? (
                            <View style={[cardStyles.metaChip, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50] }]}>
                                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {fmt.time(item.correctedPunchOut)}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                {item.reason ? (
                    <Text className="mt-2 font-inter text-xs text-neutral-600 dark:text-neutral-400" numberOfLines={2}>{item.reason}</Text>
                ) : null}

                {item.status === 'PENDING' && (
                    <View style={cardStyles.actionRow}>
                        <Pressable onPress={onReject} style={cardStyles.rejectBtn}>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                        <Pressable onPress={onApprove} style={cardStyles.approveBtn}>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    rejectBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.danger[50],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    approveBtn: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.success[600],
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// ============ MAIN COMPONENT ============

export function AttendanceOverrideScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const fmt = useCompanyFormatter();

    const [statusFilter, setStatusFilter] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);

    const { data: response, isLoading, error, refetch, isFetching } = useAttendanceOverrides(
        statusFilter ? { status: statusFilter } as any : undefined,
    );
    const createMutation = useCreateAttendanceOverride();
    const processMutation = useUpdateAttendanceOverride();

    const overrides: OverrideItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
            const emp = item.attendanceRecord?.employee;
            const empName = emp
                ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
                : '';
            return {
                id: item.id ?? '',
                employeeName: empName,
                employeeCode: emp?.employeeId ?? '',
                date: item.attendanceRecord?.date ?? item.date ?? '',
                issueType: (item.issueType ?? 'NO_PUNCH') as IssueType,
                correctedPunchIn: item.correctedPunchIn ?? '',
                correctedPunchOut: item.correctedPunchOut ?? '',
                reason: item.reason ?? '',
                status: (item.status ?? 'PENDING') as OverrideStatus,
            };
        });
    }, [response]);

    const handleApprove = (item: OverrideItem) => {
        showConfirm({
            title: 'Approve Override',
            message: `Approve the override request for ${item.employeeName}?`,
            confirmText: 'Approve',
            variant: 'primary',
            onConfirm: () => {
                processMutation.mutate({ id: item.id, data: { status: 'APPROVED' } });
            },
        });
    };

    const handleReject = (item: OverrideItem) => {
        showConfirm({
            title: 'Reject Override',
            message: `Reject the override request for ${item.employeeName}?`,
            confirmText: 'Reject',
            variant: 'danger',
            onConfirm: () => {
                processMutation.mutate({ id: item.id, data: { status: 'REJECTED' } });
            },
        });
    };

    const handleCreate = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: OverrideItem; index: number }) => (
        <OverrideCard item={item} index={index} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} isDark={isDark} fmt={fmt} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={mainStyles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Attendance Overrides</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{overrides.length} override{overrides.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}>
                <FilterTabs value={statusFilter} onSelect={setStatusFilter} isDark={isDark} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load overrides" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No overrides" message={statusFilter ? `No ${statusFilter.toLowerCase()} overrides found.` : 'No override requests yet.'} /></View>;
    };

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Attendance Overrides" onMenuPress={toggle} />
            <FlashList
                data={overrides}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[mainStyles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateOverrideModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleCreate} isSaving={createMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
    listContent: { paddingHorizontal: 24 },
});
