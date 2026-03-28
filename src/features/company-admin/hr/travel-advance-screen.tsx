/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useTravelAdvances } from '@/features/company-admin/api/use-payroll-queries';
import {
    useCreateTravelAdvance,
    useSettleTravelAdvance,
} from '@/features/company-admin/api/use-payroll-mutations';

// ============ TYPES ============

interface TravelAdvance {
    id: string;
    employeeName: string;
    employeeId: string;
    amount: number;
    tripPurpose: string;
    status: string;
    isSettled: boolean;
    estimatedDate: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: colors.warning[50], text: 'text-warning-700' },
    APPROVED: { bg: colors.info[50], text: 'text-info-700' },
    ACTIVE: { bg: colors.primary[50], text: 'text-primary-700' },
    CLOSED: { bg: colors.success[50], text: 'text-success-700' },
    SETTLED: { bg: colors.success[50], text: 'text-success-700' },
    REJECTED: { bg: colors.danger[50], text: 'text-danger-600' },
};

// ============ BADGES ============

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

function SettledBadge({ settled }: { settled: boolean }) {
    return (
        <View style={[styles.typeBadge, { backgroundColor: settled ? colors.success[50] : colors.neutral[100] }]}>
            <Text className={`font-inter text-[10px] font-bold ${settled ? 'text-success-700' : 'text-neutral-500'}`}>{settled ? 'Settled' : 'Unsettled'}</Text>
        </View>
    );
}

// ============ CREATE FORM MODAL ============

function CreateFormModal({
    visible, onClose, onSave, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [amount, setAmount] = React.useState('');
    const [tripPurpose, setTripPurpose] = React.useState('');
    const [estimatedDate, setEstimatedDate] = React.useState('');

    React.useEffect(() => {
        if (visible) { setEmployeeId(''); setAmount(''); setTripPurpose(''); setEstimatedDate(''); }
    }, [visible]);

    const handleSave = () => {
        if (!employeeId.trim() || !amount.trim() || !tripPurpose.trim()) return;
        onSave({
            employeeId: employeeId.trim(),
            amount: Number(amount),
            tripPurpose: tripPurpose.trim(),
            estimatedDate: estimatedDate.trim() || undefined,
        });
    };

    const isValid = employeeId.trim() && amount.trim() && tripPurpose.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">New Travel Advance</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Employee ID <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Enter employee ID" placeholderTextColor={colors.neutral[400]} value={employeeId} onChangeText={setEmployeeId} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Amount ({'\u20B9'}) <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="10000" placeholderTextColor={colors.neutral[400]} value={amount} onChangeText={setAmount} keyboardType="numeric" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Trip Purpose <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { height: 80 }]}><TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="e.g. Client meeting in Mumbai" placeholderTextColor={colors.neutral[400]} value={tripPurpose} onChangeText={setTripPurpose} multiline /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Estimated Travel Date</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={estimatedDate} onChangeText={setEstimatedDate} /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'Create Advance'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SETTLE MODAL ============

function SettleModal({
    visible, onClose, advance, onSettle, isSettling,
}: {
    visible: boolean; onClose: () => void;
    advance: TravelAdvance | null; onSettle: (claimId: string) => void; isSettling: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [claimId, setClaimId] = React.useState('');

    React.useEffect(() => { if (visible) setClaimId(''); }, [visible]);

    if (!advance) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Settle Advance</Text>
                    <View style={{ backgroundColor: colors.neutral[50], borderRadius: 14, padding: 16, marginBottom: 16 }}>
                        <Text className="font-inter text-xs text-neutral-500 mb-1">Employee</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950">{advance.employeeName ?? advance.employeeId}</Text>
                        <Text className="font-inter text-xs text-neutral-500 mt-3 mb-1">Advance Amount</Text>
                        <Text className="font-inter text-lg font-bold text-primary-600">{'\u20B9'}{Number(advance.amount ?? 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Expense Claim ID (optional)</Text>
                        <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Link to expense claim" placeholderTextColor={colors.neutral[400]} value={claimId} onChangeText={setClaimId} /></View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSettle(claimId)} disabled={isSettling} style={[styles.settleBtn, isSettling && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSettling ? 'Settling...' : 'Settle'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SETTLEMENT RESULT MODAL ============

function SettlementResultModal({
    visible, onClose, result,
}: {
    visible: boolean; onClose: () => void;
    result: { advanceAmount: number; claimAmount: number; difference: number; outcome: string } | null;
}) {
    if (!result) return null;

    const getOutcome = () => {
        const o = result.outcome?.toUpperCase();
        if (o === 'EMPLOYEE_OWES' || result.difference > 0)
            return { text: `Employee Owes \u20B9${Math.abs(result.difference).toLocaleString('en-IN')}`, color: 'text-warning-700' };
        if (o === 'COMPANY_OWES' || result.difference < 0)
            return { text: `Company Owes \u20B9${Math.abs(result.difference).toLocaleString('en-IN')}`, color: 'text-info-700' };
        return { text: 'Exact Match', color: 'text-success-700' };
    };

    const outcome = getOutcome();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 28, width: '85%', alignItems: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                        <Svg width={28} height={28} viewBox="0 0 24 24"><Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" /><Path d="M22 4L12 14.01l-3-3" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </View>
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Settlement Summary</Text>
                    <View style={{ backgroundColor: colors.neutral[50], borderRadius: 14, padding: 16, width: '100%', marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text className="font-inter text-xs text-neutral-500">Advance</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950">{'\u20B9'}{Number(result.advanceAmount).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text className="font-inter text-xs text-neutral-500">Expense Claim</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950">{'\u20B9'}{Number(result.claimAmount).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text className="font-inter text-xs text-neutral-500">Difference</Text>
                            <Text className="font-inter text-sm font-bold text-primary-950">{'\u20B9'}{Math.abs(result.difference).toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                    <Text className={`font-inter text-lg font-bold ${outcome.color} mb-4`}>{outcome.text}</Text>
                    <Pressable onPress={onClose} style={[styles.saveBtn, { width: '100%' }]}>
                        <Text className="font-inter text-sm font-bold text-white">Done</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ ADVANCE CARD ============

function AdvanceCard({ item, index, onSettle }: { item: TravelAdvance; index: number; onSettle: () => void }) {
    const canSettle = !(item.isSettled) && (item.status === 'ACTIVE' || item.status === 'APPROVED');

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName ?? item.employeeId}</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500" numberOfLines={1}>{item.tripPurpose || 'No purpose specified'}</Text>
                    </View>
                    <Text className="font-inter text-base font-bold text-primary-700">{'\u20B9'}{Number(item.amount ?? 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.cardMeta}>
                    <StatusBadge status={item.status ?? 'PENDING'} />
                    <SettledBadge settled={item.isSettled ?? false} />
                    {item.estimatedDate && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">
                                {new Date(item.estimatedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Text>
                        </View>
                    )}
                </View>
                {canSettle && (
                    <Pressable onPress={onSettle} style={[styles.actionBtn, { backgroundColor: colors.accent[50], marginTop: 10, alignSelf: 'flex-start' }]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke={colors.accent[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">Settle</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function TravelAdvanceScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [createVisible, setCreateVisible] = React.useState(false);
    const [settleTarget, setSettleTarget] = React.useState<TravelAdvance | null>(null);
    const [settlementResult, setSettlementResult] = React.useState<any>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useTravelAdvances();
    const createMutation = useCreateTravelAdvance();
    const settleMutation = useSettleTravelAdvance();

    const advances: TravelAdvance[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            employeeName: item.employeeName ?? '',
            employeeId: item.employeeId ?? '',
            amount: item.amount ?? 0,
            tripPurpose: item.tripPurpose ?? '',
            status: item.status ?? 'PENDING',
            isSettled: item.isSettled ?? item.settled ?? false,
            estimatedDate: item.estimatedDate ?? '',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return advances;
        const q = search.toLowerCase();
        return advances.filter(a =>
            (a.employeeName ?? '').toLowerCase().includes(q) ||
            (a.tripPurpose ?? '').toLowerCase().includes(q) ||
            (a.status ?? '').toLowerCase().includes(q)
        );
    }, [advances, search]);

    const handleCreate = (data: Record<string, unknown>) => {
        createMutation.mutate(data as any, { onSuccess: () => setCreateVisible(false) });
    };

    const handleSettle = (claimId: string) => {
        if (!settleTarget) return;
        settleMutation.mutate(
            { id: settleTarget.id, data: { expenseClaimId: claimId || undefined } } as any,
            {
                onSuccess: (result: any) => {
                    const settlement = result?.data ?? result;
                    setSettlementResult({
                        advanceAmount: settleTarget.amount,
                        claimAmount: settlement?.claimAmount ?? settlement?.expenseAmount ?? 0,
                        difference: settlement?.difference ?? settlement?.balance ?? 0,
                        outcome: settlement?.outcome ?? settlement?.settlementType ?? 'EXACT_MATCH',
                    });
                    setSettleTarget(null);
                },
            },
        );
    };

    const renderItem = ({ item, index }: { item: TravelAdvance; index: number }) => (
        <AdvanceCard item={item} index={index} onSettle={() => setSettleTarget(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950">Travel Advances</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">{advances.length} advance{advances.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search advances..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load advances" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No advances match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No advances yet" message="Create a travel advance to get started." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Travel Advances</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setCreateVisible(true)} />
            <CreateFormModal visible={createVisible} onClose={() => setCreateVisible(false)} onSave={handleCreate} isSaving={createMutation.isPending} />
            <SettleModal visible={!!settleTarget} onClose={() => setSettleTarget(null)} advance={settleTarget} onSettle={handleSettle} isSettling={settleMutation.isPending} />
            <SettlementResultModal visible={!!settlementResult} onClose={() => setSettlementResult(null)} result={settlementResult} />
            <ConfirmModal {...confirmModalProps} />
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
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    settleBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.accent[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.accent[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
