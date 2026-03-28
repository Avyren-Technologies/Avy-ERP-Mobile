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

import { useBonusBatches, useBonusBatch } from '@/features/company-admin/api/use-bonus-batch-queries';
import { useCreateBonusBatch, useApproveBonusBatch, useMergeBonusBatch } from '@/features/company-admin/api/use-bonus-batch-mutations';

// ============ TYPES ============

type BonusType = 'PERFORMANCE' | 'FESTIVE' | 'SPOT' | 'REFERRAL' | 'RETENTION' | 'STATUTORY';

interface BonusBatchItem {
    id: string;
    name: string;
    type: BonusType;
    employeeCount: number;
    totalAmount: number;
    status: string;
    createdAt: string;
}

interface BonusLineItem {
    employeeId: string;
    employeeName: string;
    amount: number;
    remarks: string;
}

const BONUS_TYPES: BonusType[] = ['PERFORMANCE', 'FESTIVE', 'SPOT', 'REFERRAL', 'RETENTION', 'STATUTORY'];

const TYPE_COLORS: Record<BonusType, { bg: string; text: string }> = {
    PERFORMANCE: { bg: colors.primary[50], text: 'text-primary-700' },
    FESTIVE: { bg: colors.accent[50], text: 'text-accent-700' },
    SPOT: { bg: colors.success[50], text: 'text-success-700' },
    REFERRAL: { bg: colors.info[50], text: 'text-info-700' },
    RETENTION: { bg: colors.warning[50], text: 'text-warning-700' },
    STATUTORY: { bg: colors.neutral[100], text: 'text-neutral-600' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: colors.neutral[100], text: 'text-neutral-600' },
    APPROVED: { bg: colors.success[50], text: 'text-success-700' },
    MERGED: { bg: colors.primary[50], text: 'text-primary-700' },
};

// ============ BADGES ============

function TypeBadge({ type }: { type: BonusType }) {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.PERFORMANCE;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{type}</Text>
        </View>
    );
}

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.DRAFT;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable key={opt} onPress={() => onSelect(opt)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ DETAIL MODAL ============

function DetailModal({
    visible,
    onClose,
    batchId,
    onApprove,
    onMerge,
    isApproving,
}: {
    visible: boolean;
    onClose: () => void;
    batchId: string | null;
    onApprove: (id: string) => void;
    onMerge: (batch: any) => void;
    isApproving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const { data: detailData, isLoading } = useBonusBatch(batchId ?? '');
    const detail: any = (detailData as any)?.data ?? null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Batch Details</Text>
                    {isLoading ? (
                        <View style={{ paddingTop: 20 }}><SkeletonCard /><SkeletonCard /></View>
                    ) : detail ? (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Info Row */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                <View style={styles.infoCard}>
                                    <Text className="font-inter text-[10px] text-neutral-500 uppercase">Name</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950 mt-1">{detail.name}</Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text className="font-inter text-[10px] text-neutral-500 uppercase">Type</Text>
                                    <View style={{ marginTop: 4 }}><TypeBadge type={detail.type} /></View>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text className="font-inter text-[10px] text-neutral-500 uppercase">Status</Text>
                                    <View style={{ marginTop: 4 }}><StatusBadge status={detail.status} /></View>
                                </View>
                            </View>
                            {/* Items */}
                            <Text className="font-inter text-xs font-bold text-neutral-500 uppercase mb-2">Items</Text>
                            {(detail.items ?? []).map((item: any, idx: number) => (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">{item.employeeName ?? item.employeeId}</Text>
                                        {item.remarks ? <Text className="font-inter text-[10px] text-neutral-500 mt-0.5">{item.remarks}</Text> : null}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">{'\u20B9'}{(item.amount ?? 0).toLocaleString('en-IN')}</Text>
                                        {item.tds ? <Text className="font-inter text-[10px] text-danger-500">TDS: {'\u20B9'}{item.tds.toLocaleString('en-IN')}</Text> : null}
                                        <Text className="font-inter text-[10px] font-bold text-success-600">Net: {'\u20B9'}{(item.netAmount ?? item.amount ?? 0).toLocaleString('en-IN')}</Text>
                                    </View>
                                </View>
                            ))}
                            {/* Actions */}
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                {detail.status === 'DRAFT' && (
                                    <Pressable onPress={() => onApprove(detail.id)} disabled={isApproving} style={[styles.saveBtn, { flex: 1, backgroundColor: colors.success[600] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">{isApproving ? 'Approving...' : 'Approve'}</Text>
                                    </Pressable>
                                )}
                                {detail.status === 'APPROVED' && (
                                    <Pressable onPress={() => onMerge(detail)} style={[styles.saveBtn, { flex: 1, backgroundColor: colors.accent[600] }]}>
                                        <Text className="font-inter text-sm font-bold text-white">Merge to Payroll</Text>
                                    </Pressable>
                                )}
                                <Pressable onPress={onClose} style={[styles.cancelBtn, { flex: 1 }]}>
                                    <Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    ) : (
                        <Text className="font-inter text-sm text-neutral-500 text-center py-8">No details available.</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ============ CREATE MODAL ============

function CreateModal({
    visible,
    onClose,
    onSave,
    isSaving,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: { name: string; type: string; items: BonusLineItem[] }) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [type, setType] = React.useState('PERFORMANCE');
    const [items, setItems] = React.useState<BonusLineItem[]>([{ employeeId: '', employeeName: '', amount: 0, remarks: '' }]);

    React.useEffect(() => {
        if (visible) {
            setName('');
            setType('PERFORMANCE');
            setItems([{ employeeId: '', employeeName: '', amount: 0, remarks: '' }]);
        }
    }, [visible]);

    const addItem = () => setItems(p => [...p, { employeeId: '', employeeName: '', amount: 0, remarks: '' }]);
    const updateItem = (idx: number, key: keyof BonusLineItem, val: any) =>
        setItems(p => p.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));
    const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Create Bonus Batch</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Batch Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="e.g. Q1 Performance Bonus" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Bonus Type" options={BONUS_TYPES} value={type} onSelect={setType} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text className="font-inter text-xs font-bold text-neutral-500 uppercase">Items</Text>
                            <Pressable onPress={addItem}>
                                <Text className="font-inter text-xs font-bold text-primary-600">+ Add Row</Text>
                            </Pressable>
                        </View>

                        {items.map((item, idx) => (
                            <View key={idx} style={styles.itemFormCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text className="font-inter text-[10px] font-bold text-neutral-500">#{idx + 1}</Text>
                                    {items.length > 1 && (
                                        <Pressable onPress={() => removeItem(idx)} hitSlop={8}>
                                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                        </Pressable>
                                    )}
                                </View>
                                <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="Employee ID" placeholderTextColor={colors.neutral[400]} value={item.employeeId} onChangeText={v => updateItem(idx, 'employeeId', v)} /></View>
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    <View style={[styles.inputWrapStyle, { flex: 1 }]}><TextInput style={styles.textInput} placeholder="Amount" placeholderTextColor={colors.neutral[400]} value={item.amount ? String(item.amount) : ''} onChangeText={v => updateItem(idx, 'amount', Number(v) || 0)} keyboardType="numeric" /></View>
                                    <View style={[styles.inputWrapStyle, { flex: 1 }]}><TextInput style={styles.textInput} placeholder="Remarks" placeholderTextColor={colors.neutral[400]} value={item.remarks} onChangeText={v => updateItem(idx, 'remarks', v)} /></View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name, type, items: items.filter(i => i.employeeId && i.amount > 0) })} disabled={!name.trim() || !type || isSaving} style={[styles.saveBtn, (!name.trim() || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'Create Batch'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MERGE MODAL ============

function MergeModal({
    visible,
    onClose,
    batch,
    onMerge,
    isMerging,
}: {
    visible: boolean;
    onClose: () => void;
    batch: any;
    onMerge: (payrollRunId: string) => void;
    isMerging: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [payrollRunId, setPayrollRunId] = React.useState('');

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">Merge to Payroll</Text>
                    <Text className="font-inter text-sm text-neutral-500 mb-4">Merge "{batch?.name}" into a payroll run.</Text>
                    <View style={styles.fieldWrap}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Payroll Run ID <Text className="text-danger-500">*</Text></Text>
                        <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="Enter payroll run ID" placeholderTextColor={colors.neutral[400]} value={payrollRunId} onChangeText={setPayrollRunId} /></View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onMerge(payrollRunId)} disabled={!payrollRunId.trim() || isMerging} style={[styles.saveBtn, (!payrollRunId.trim() || isMerging) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isMerging ? 'Merging...' : 'Merge'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ BATCH CARD ============

function BatchCard({ item, index, onPress }: { item: BonusBatchItem; index: number; onPress: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <TypeBadge type={item.type} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">{item.employeeCount ?? 0} employees</Text>
                    </View>
                    <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-success-700">{'\u20B9'}{(item.totalAmount ?? 0).toLocaleString('en-IN')}</Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function BonusBatchScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [createVisible, setCreateVisible] = React.useState(false);
    const [detailId, setDetailId] = React.useState<string | null>(null);
    const [detailVisible, setDetailVisible] = React.useState(false);
    const [mergeVisible, setMergeVisible] = React.useState(false);
    const [mergeTarget, setMergeTarget] = React.useState<any>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useBonusBatches();
    const createMutation = useCreateBonusBatch();
    const approveMutation = useApproveBonusBatch();
    const mergeMutation = useMergeBonusBatch();

    const batches: BonusBatchItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return batches;
        const q = search.toLowerCase();
        return batches.filter(b => b.name?.toLowerCase().includes(q) || b.type?.toLowerCase().includes(q) || b.status?.toLowerCase().includes(q));
    }, [batches, search]);

    const handleCreate = (data: { name: string; type: string; items: BonusLineItem[] }) => {
        createMutation.mutate(data as any, { onSuccess: () => setCreateVisible(false) });
    };

    const handleApprove = (id: string) => {
        showConfirm({
            title: 'Approve Batch',
            message: 'Are you sure you want to approve this bonus batch?',
            confirmText: 'Approve',
            variant: 'primary',
            onConfirm: () => { approveMutation.mutate({ id } as any); },
        });
    };

    const handleOpenMerge = (batch: any) => {
        setMergeTarget(batch);
        setDetailVisible(false);
        setMergeVisible(true);
    };

    const handleMerge = (payrollRunId: string) => {
        if (!mergeTarget) return;
        mergeMutation.mutate({ id: mergeTarget.id, payrollRunId } as any, { onSuccess: () => { setMergeVisible(false); setMergeTarget(null); } });
    };

    const handleViewDetail = (item: BonusBatchItem) => {
        setDetailId(item.id);
        setDetailVisible(true);
    };

    const renderItem = ({ item, index }: { item: BonusBatchItem; index: number }) => (
        <BatchCard item={item} index={index} onPress={() => handleViewDetail(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Bonus Batches</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</Text>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search batches..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No bonus batches" message="Create a batch to get started." /></View>;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Bonus Batches</Text>
                <View style={{ width: 36 }} />
            </View>
            <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={() => setCreateVisible(true)} />
            <CreateModal visible={createVisible} onClose={() => setCreateVisible(false)} onSave={handleCreate} isSaving={createMutation.isPending} />
            <DetailModal visible={detailVisible} onClose={() => setDetailVisible(false)} batchId={detailId} onApprove={handleApprove} onMerge={handleOpenMerge} isApproving={approveMutation.isPending} />
            <MergeModal visible={mergeVisible} onClose={() => setMergeVisible(false)} batch={mergeTarget} onMerge={handleMerge} isMerging={mergeMutation.isPending} />
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
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrapStyle: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    infoCard: { flex: 1, backgroundColor: colors.neutral[50], borderRadius: 12, padding: 10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    itemFormCard: { backgroundColor: colors.neutral[50], borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.neutral[100] },
});
