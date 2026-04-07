/* eslint-disable better-tailwindcss/no-unknown-classes */
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useCancelShiftSwap, useCreateShiftSwap } from '@/features/company-admin/api/use-ess-mutations';
import { useMyShiftSwaps } from '@/features/company-admin/api/use-ess-queries';

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

// ── Create Shift Swap Modal ──────────────────────────────────────

function CreateShiftSwapModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: { currentShiftId: string; requestedShiftId: string; swapDate: string; reason: string }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [currentShiftId, setCurrentShiftId] = React.useState('');
    const [requestedShiftId, setRequestedShiftId] = React.useState('');
    const [swapDate, setSwapDate] = React.useState('');
    const [reason, setReason] = React.useState('');

    React.useEffect(() => {
        if (visible) { setCurrentShiftId(''); setRequestedShiftId(''); setSwapDate(''); setReason(''); }
    }, [visible]);

    const isValid = currentShiftId.trim() && requestedShiftId.trim() && swapDate.trim() && reason.trim().length >= 5;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Request Shift Swap</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        {/* Current Shift ID */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Current Shift ID <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter current shift ID..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={currentShiftId}
                                    onChangeText={setCurrentShiftId}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Requested Shift ID */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Requested Shift ID <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter requested shift ID..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={requestedShiftId}
                                    onChangeText={setRequestedShiftId}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Swap Date */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Swap Date <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={swapDate}
                                    onChangeText={setSwapDate}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Reason <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, { height: 100 }]}>
                                <TextInput
                                    style={[styles.textInput, { textAlignVertical: 'top', paddingTop: 10 }]}
                                    placeholder="Reason for shift swap (min 5 characters)..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSave({ currentShiftId: currentShiftId.trim(), requestedShiftId: requestedShiftId.trim(), swapDate: swapDate.trim(), reason: reason.trim() })}
                            disabled={!isValid || isSaving}
                            style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Submitting...' : 'Submit Request'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Screen ──────────────────────────────────────────────────

export function ShiftSwapScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data, isLoading, refetch } = useMyShiftSwaps();
    const createSwap = useCreateShiftSwap();
    const cancelSwap = useCancelShiftSwap();

    const [formVisible, setFormVisible] = React.useState(false);

    const swaps = (data as any)?.data ?? [];

    const handleCreate = (formData: { currentShiftId: string; requestedShiftId: string; swapDate: string; reason: string }) => {
        showConfirm({
            title: 'Submit Shift Swap',
            message: 'Are you sure you want to submit this shift swap request?',
            confirmText: 'Submit',
            variant: 'primary',
            onConfirm: () => {
                createSwap.mutate(formData, {
                    onSuccess: () => setFormVisible(false),
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to submit shift swap request'),
                });
            },
        });
    };

    const handleCancel = (id: string) => {
        showConfirm({
            title: 'Cancel Request',
            message: 'Are you sure you want to cancel this shift swap request? This cannot be undone.',
            confirmText: 'Cancel Request',
            variant: 'danger',
            onConfirm: () => {
                cancelSwap.mutate(id, {
                    onError: (err: any) => showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to cancel shift swap request'),
                });
            },
        });
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-950">Swap Date: {item.swapDate ?? '--'}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mt-1">Current: {item.currentShiftName ?? item.currentShiftId ?? '--'}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mt-0.5">Requested: {item.requestedShiftName ?? item.requestedShiftId ?? '--'}</Text>
                </View>
                <StatusBadge status={item.status ?? 'PENDING'} />
            </View>
            {item.reason && <Text className="font-inter text-xs text-neutral-600 mt-2" numberOfLines={2}>{item.reason}</Text>}
            {item.createdAt && <Text className="font-inter text-[10px] text-neutral-400 mt-1">Requested: {item.createdAt}</Text>}
            {item.status === 'PENDING' && (
                <Pressable onPress={() => handleCancel(item.id)} style={styles.cancelActionBtn}>
                    <Text className="font-inter text-xs font-semibold text-danger-600">Cancel Request</Text>
                </Pressable>
            )}
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <AppTopHeader title="Shift Swap Requests" onMenuPress={open} />
            <FlashList
                data={swaps}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No shift swap requests</Text></View> : null}
            />
            <FAB onPress={() => setFormVisible(true)} />
            <CreateShiftSwapModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleCreate}
                isSaving={createSwap.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    empty: { alignItems: 'center', paddingTop: 60 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    cancelActionBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: colors.danger[200], backgroundColor: colors.danger[50] },
});
