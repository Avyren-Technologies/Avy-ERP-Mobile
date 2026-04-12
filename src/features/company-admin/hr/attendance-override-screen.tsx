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
import { FlashList } from '@shopify/flash-list';
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
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type OverrideStatus = 'Pending' | 'Approved' | 'Rejected';
type IssueType = 'Missing Punch In' | 'Missing Punch Out' | 'Absent Override' | 'Late Override' | 'No Punch';

const ISSUE_TYPES: IssueType[] = ['Missing Punch In', 'Missing Punch Out', 'Absent Override', 'Late Override', 'No Punch'];
const FILTER_TABS: { label: string; value: string }[] = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
];

interface OverrideItem {
    id: string;
    employeeName: string;
    employeeCode: string;
    date: string;
    issueType: IssueType;
    correctedIn: string;
    correctedOut: string;
    reason: string;
    status: OverrideStatus;
}

const STATUS_COLORS: Record<OverrideStatus, { bg: string; text: string }> = {
    Pending: { bg: colors.warning[50], text: 'text-warning-700' },
    Approved: { bg: colors.success[50], text: 'text-success-700' },
    Rejected: { bg: colors.danger[50], text: 'text-danger-600' },
};

const ISSUE_COLORS: Record<string, { bg: string; text: string }> = {
    'Missing Punch In': { bg: colors.info[50], text: 'text-info-700' },
    'Missing Punch Out': { bg: colors.info[50], text: 'text-info-700' },
    'Absent Override': { bg: colors.danger[50], text: 'text-danger-600' },
    'Late Override': { bg: colors.warning[50], text: 'text-warning-700' },
    'No Punch': { bg: colors.neutral[100], text: 'text-neutral-600 dark:text-neutral-400' },
};

// ============ BADGES ============

function OverrideStatusBadge({ status }: { status: OverrideStatus }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

function IssueTypeBadge({ type }: { type: string }) {
    const c = ISSUE_COLORS[type] ?? ISSUE_COLORS['No Punch'];
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{type}</Text>
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ FILTER TABS ============

function FilterTabs({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {FILTER_TABS.map(tab => {
                const active = tab.value === value;
                const tabColor = tab.value === 'Pending' ? colors.warning : tab.value === 'Approved' ? colors.success : tab.value === 'Rejected' ? colors.danger : null;
                return (
                    <Pressable key={tab.value} onPress={() => onSelect(tab.value)} style={[styles.filterTab, active && (tabColor ? { backgroundColor: tabColor[50], borderColor: tabColor[200] } : styles.filterTabActive)]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? (tabColor ? '' : 'text-white') : 'text-neutral-600 dark:text-neutral-400'}`} style={active && tabColor ? { color: tabColor[700] } : undefined}>{tab.label}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ============ CREATE MODAL ============

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
    const [employeeName, setEmployeeName] = React.useState('');
    const [date, setDate] = React.useState('');
    const [issueType, setIssueType] = React.useState<IssueType>('Missing Punch In');
    const [correctedIn, setCorrectedIn] = React.useState('');
    const [correctedOut, setCorrectedOut] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setEmployeeName(''); setDate(''); setIssueType('Missing Punch In');
            setCorrectedIn(''); setCorrectedOut(''); setReason('');
        }
    }, [visible]);

    const handleSave = () => {
        if (!employeeName.trim() || !date.trim() || !reason.trim()) return;
        onSave({
            employeeName: employeeName.trim(),
            date: date.trim(),
            issueType,
            correctedIn: correctedIn.trim(),
            correctedOut: correctedOut.trim(),
            reason: reason.trim(),
        });
    };

    const isValid = employeeName.trim() && date.trim() && reason.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">New Override Request</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        {/* Employee */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Employee <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Search employee..." placeholderTextColor={colors.neutral[400]} value={employeeName} onChangeText={setEmployeeName} /></View>
                        </View>
                        {/* Date */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Date <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={date} onChangeText={setDate} /></View>
                        </View>
                        {/* Issue Type */}
                        <ChipSelector label="Issue Type" options={ISSUE_TYPES} value={issueType} onSelect={v => setIssueType(v as IssueType)} />
                        {/* Corrected In */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Corrected Punch In</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="HH:MM (24h)" placeholderTextColor={colors.neutral[400]} value={correctedIn} onChangeText={setCorrectedIn} /></View>
                        </View>
                        {/* Corrected Out */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Corrected Punch Out</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="HH:MM (24h)" placeholderTextColor={colors.neutral[400]} value={correctedOut} onChangeText={setCorrectedOut} /></View>
                        </View>
                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Reason <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}><TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Reason for override..." placeholderTextColor={colors.neutral[400]} value={reason} onChangeText={setReason} multiline /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit Override'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ OVERRIDE CARD ============

function OverrideCard({
    item,
    index,
    onApprove,
    onReject,
}: {
    item: OverrideItem;
    index: number;
    onApprove: () => void;
    onReject: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 50)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                        <Text className="mt-0.5 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.employeeCode} {'\u2022'} {item.date}</Text>
                    </View>
                    <OverrideStatusBadge status={item.status} />
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <IssueTypeBadge type={item.issueType} />
                </View>

                {(item.correctedIn || item.correctedOut) && (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        {item.correctedIn ? (
                            <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {item.correctedIn}</Text></View>
                        ) : null}
                        {item.correctedOut ? (
                            <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {item.correctedOut}</Text></View>
                        ) : null}
                    </View>
                )}

                {item.reason ? (
                    <Text className="mt-2 font-inter text-xs text-neutral-600 dark:text-neutral-400" numberOfLines={2}>{item.reason}</Text>
                ) : null}

                {item.status === 'Pending' && (
                    <View style={styles.actionRow}>
                        <Pressable onPress={onReject} style={styles.rejectBtn}>
                            <Text className="font-inter text-xs font-bold text-danger-600">Reject</Text>
                        </Pressable>
                        <Pressable onPress={onApprove} style={styles.approveBtn}>
                            <Text className="font-inter text-xs font-bold text-white">Approve</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function AttendanceOverrideScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

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
                issueType: item.issueType ?? 'No Punch',
                correctedIn: item.correctedPunchIn ?? item.correctedIn ?? '',
                correctedOut: item.correctedPunchOut ?? item.correctedOut ?? '',
                reason: item.reason ?? '',
                status: item.status ?? 'Pending',
            };
        });
    }, [response]);

    const handleApprove = (item: OverrideItem) => {
        showConfirm({
            title: 'Approve Override',
            message: `Approve the override request for ${item.employeeName} on ${item.date}?`,
            confirmText: 'Approve',
            variant: 'primary',
            onConfirm: () => {
                processMutation.mutate({ id: item.id, data: { status: 'Approved' } });
            },
        });
    };

    const handleReject = (item: OverrideItem) => {
        showConfirm({
            title: 'Reject Override',
            message: `Reject the override request for ${item.employeeName} on ${item.date}?`,
            confirmText: 'Reject',
            variant: 'danger',
            onConfirm: () => {
                processMutation.mutate({ id: item.id, data: { status: 'Rejected' } });
            },
        });
    };

    const handleCreate = (data: Record<string, unknown>) => {
        createMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
    };

    const renderItem = ({ item, index }: { item: OverrideItem; index: number }) => (
        <OverrideCard item={item} index={index} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Attendance Overrides</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{overrides.length} override{overrides.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}>
                <FilterTabs value={statusFilter} onSelect={setStatusFilter} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load overrides" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No overrides" message={statusFilter ? `No ${statusFilter.toLowerCase()} overrides found.` : 'No override requests yet.'} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Attendance Overrides" onMenuPress={toggle} />
            <FlashList
                data={overrides}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
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

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    filterTabActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    rejectBtn: { flex: 1, height: 38, borderRadius: 10, backgroundColor: colors.danger[50], justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.danger[200] },
    approveBtn: { flex: 1, height: 38, borderRadius: 10, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center' },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
