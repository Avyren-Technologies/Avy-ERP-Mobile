/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { showMessage } from 'react-native-flash-message';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { DatePickerField } from '@/components/ui/date-picker';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useCancelWfhRequest, useCreateWfhRequest } from '@/features/company-admin/api/use-ess-mutations';
import { useMyWfhRequests } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
        </View>
    );
}

// ── Create WFH Request Modal ─────────────────────────────────────

function CreateWfhModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { fromDate: string; toDate: string; days: number; reason: string }) => void;
    isSaving: boolean;
}) {
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) { setFromDate(''); setToDate(''); setReason(''); }
    }, [visible]);

    // Auto-calculate number of days between fromDate and toDate (inclusive)
    const calculatedDays = React.useMemo(() => {
        if (!fromDate || !toDate) return 0;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
        return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [fromDate, toDate]);

    const isValid = fromDate.trim() && toDate.trim() && calculatedDays > 0 && reason.trim().length >= 5;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView 
                style={{ flex: 1, justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-start', paddingTop: Platform.OS === 'ios' ? 0 : '15%', backgroundColor: 'rgba(8, 15, 40, 0.32)', paddingHorizontal: 20 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={styles.modalPopup}>
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">Request Work From Home</Text>

                    {/* Scrollable form fields */}
                    <KeyboardAwareScrollView
                        bottomOffset={20}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={{ flexGrow: 0, flexShrink: 1 }}
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        {/* From Date */}
                        <DatePickerField
                            label="From Date"
                            value={fromDate}
                            onChange={setFromDate}
                            required
                        />

                        {/* To Date */}
                        <DatePickerField
                            label="To Date"
                            value={toDate}
                            onChange={setToDate}
                            required
                        />

                        {/* Auto-calculated days badge */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Number of Days</Text>
                            <View style={[styles.inputWrap, { backgroundColor: calculatedDays > 0 ? colors.primary[50] : colors.neutral[50], borderColor: calculatedDays > 0 ? colors.primary[200] : colors.neutral[200] }]}>
                                <Text style={{ fontFamily: 'Inter', fontSize: 14, color: calculatedDays > 0 ? colors.primary[700] : colors.neutral[400], fontWeight: calculatedDays > 0 ? '700' : '400' }}>
                                    {calculatedDays > 0 ? `${calculatedDays} day${calculatedDays > 1 ? 's' : ''}` : 'Select dates above to calculate'}
                                </Text>
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start', paddingVertical: 10 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', width: '100%' }]}
                                    placeholder="Reason for WFH request (min 5 characters)..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>
                    </KeyboardAwareScrollView>

                    {/* Buttons always pinned at bottom */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSave({ fromDate: fromDate.trim(), toDate: toDate.trim(), days: calculatedDays, reason: reason.trim() })}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit Request'}</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function WfhRequestScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyWfhRequests();
    const createWfh = useCreateWfhRequest();
    const cancelWfh = useCancelWfhRequest();

    const [formVisible, setFormVisible] = React.useState(false);

    // Handle both { data: [] } and [] response shapes
    const requests = React.useMemo(() => {
        const raw = data as any;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        if (Array.isArray(raw?.requests)) return raw.requests;
        return [];
    }, [data]);

    const handleCreate = (formData: { fromDate: string; toDate: string; days: number; reason: string }) => {
        showConfirm({
            title: 'Submit WFH Request',
            message: 'Are you sure you want to submit this work from home request?',
            confirmText: 'Submit',
            variant: 'primary',
            onConfirm: () => {
                createWfh.mutate(formData, {
                    onSuccess: () => {
                        setFormVisible(false);
                        showMessage({ message: 'WFH request created successfully', type: 'success' });
                    },
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to submit WFH request'),
                });
            },
        });
    };

    const handleCancel = (id: string) => {
        showConfirm({
            title: 'Cancel Request',
            message: 'Are you sure you want to cancel this WFH request? This cannot be undone.',
            confirmText: 'Cancel Request',
            variant: 'danger',
            onConfirm: () => {
                cancelWfh.mutate(id, {
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to cancel WFH request'),
                });
            },
        });
    };

    // KPI summary computed from requests
    const kpiSummary = React.useMemo(() => {
        const total = requests.length;
        const approved = requests.filter((r: any) => r.status === 'APPROVED').length;
        const pending = requests.filter((r: any) => r.status === 'PENDING').length;
        const rejected = requests.filter((r: any) => r.status === 'REJECTED').length;
        return { total, approved, pending, rejected };
    }, [requests]);

    const kpiItems = [
        { label: 'Total', value: kpiSummary.total, color: colors.primary[500] },
        { label: 'Approved', value: kpiSummary.approved, color: colors.success[500] },
        { label: 'Pending', value: kpiSummary.pending, color: colors.warning[500] },
        { label: 'Rejected', value: kpiSummary.rejected, color: colors.danger[500] },
    ];

    // Strips ISO timestamp tail — shows only YYYY-MM-DD or DD MMM YYYY
    const fmtDate = (raw: string | undefined) => {
        if (!raw) return '--';
        const dateOnly = raw.split('T')[0]; // strip time part
        const d = new Date(dateOnly);
        if (Number.isNaN(d.getTime())) return dateOnly;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                        {fmtDate(item.fromDate)} → {fmtDate(item.toDate)}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-1">{item.days ?? '--'} day(s)</Text>
                </View>
                <StatusBadge status={item.status ?? 'PENDING'} />
            </View>
            {item.reason && <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400 mt-2" numberOfLines={2}>{item.reason}</Text>}
            {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Requested: {fmtDate(item.createdAt)}</Text>}
            {item.status === 'PENDING' && (
                <Pressable onPress={() => handleCancel(item.id)} style={styles.cancelActionBtn}>
                    <Text className="font-inter text-xs font-semibold text-danger-600">Cancel Request</Text>
                </Pressable>
            )}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <AppTopHeader title="WFH Requests" onMenuPress={open} />
            <FlashList
                data={requests}
                keyExtractor={(item) => item.id ?? String(Math.random())}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                ListHeaderComponent={
                    requests.length > 0 ? (
                        <View style={{ marginBottom: 16 }}>
                            {/* KPI Summary Cards */}
                            <View style={styles.kpiGrid}>
                                {kpiItems.map((item, idx) => (
                                    <Animated.View key={item.label} entering={FadeInUp.duration(350).delay(idx * 60)} style={[styles.kpiCard, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
                                        <Text className="font-inter text-xl font-bold" style={{ color: item.color }}>{item.value}</Text>
                                        <Text className="mt-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</Text>
                                    </Animated.View>
                                ))}
                            </View>
                            <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                                {requests.length} Request{requests.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={{ alignItems: 'center', paddingTop: 80 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 28 }}>🏠</Text>
                            </View>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-1">No WFH Requests Yet</Text>
                            <Text className="font-inter text-xs text-neutral-400 text-center" style={{ maxWidth: 220 }}>
                                Tap the + button below to submit your first work from home request.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ padding: 16 }}>
                            {[1, 2, 3].map((i) => (
                                <View key={i} style={{ height: 90, borderRadius: 16, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], marginBottom: 12, opacity: 1 - i * 0.2 }} />
                            ))}
                        </View>
                    )
                }
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateWfhModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleCreate}
                isSaving={createWfh.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    modalPopup: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 24, maxHeight: '85%' },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46 },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    cancelActionBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: colors.danger[200], backgroundColor: colors.danger[50] },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: {
        flex: 1, minWidth: '45%', backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, padding: 14,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
});
const styles = createStyles(false);
