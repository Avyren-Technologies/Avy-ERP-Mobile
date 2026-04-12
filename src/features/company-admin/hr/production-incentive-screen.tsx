/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useComputeIncentives,
    useCreateIncentiveConfig,
    useDeleteIncentiveConfig,
    useMergeIncentives,
    useUpdateIncentiveConfig,
} from '@/features/company-admin/api/use-production-incentive-mutations';
import {
    useIncentiveConfigs,
    useIncentiveRecords,
} from '@/features/company-admin/api/use-production-incentive-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface IncentiveConfig {
    id: string;
    name: string;
    basis: string;
    cycle: string;
    department: string;
    isActive: boolean;
    slabs: { minOutput: number; maxOutput: number; amount: number }[];
}

interface IncentiveRecord {
    id: string;
    employeeName: string;
    employeeId: string;
    outputUnits: number;
    amount: number;
    status: string;
    configName: string;
}

const BASES = ['PIECE_RATE', 'TARGET', 'SLAB'];
const CYCLES = ['DAILY', 'WEEKLY', 'MONTHLY'];

const BASIS_COLORS: Record<string, { bg: string; text: string }> = {
    PIECE_RATE: { bg: colors.primary[50], text: 'text-primary-700' },
    TARGET: { bg: colors.accent[50], text: 'text-accent-700' },
    SLAB: { bg: colors.warning[50], text: 'text-warning-700' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: colors.neutral[100], text: 'text-neutral-600 dark:text-neutral-400' },
    COMPUTED: { bg: colors.info[50], text: 'text-info-700' },
    MERGED: { bg: colors.success[50], text: 'text-success-700' },
    PENDING: { bg: colors.warning[50], text: 'text-warning-700' },
};

// ============ BADGES ============

function BasisBadge({ basis }: { basis: string }) {
    const c = BASIS_COLORS[basis?.toUpperCase()] ?? BASIS_COLORS.SLAB;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{basis}</Text>
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

function ActiveBadge({ active }: { active: boolean }) {
    return (
        <View style={[styles.typeBadge, { backgroundColor: active ? colors.success[50] : colors.neutral[100] }]}>
            <Text className={`font-inter text-[10px] font-bold ${active ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}>{active ? 'Active' : 'Inactive'}</Text>
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
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.replace('_', ' ')}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ TAB SELECTOR ============

function TabSelector({ tab, onSelect }: { tab: 'configs' | 'records'; onSelect: (t: 'configs' | 'records') => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['configs', 'records'] as const).map(t => {
                const active = t === tab;
                return (
                    <Pressable key={t} onPress={() => onSelect(t)} style={[styles.chip, active && styles.chipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{t === 'configs' ? 'Configurations' : 'Records'}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ============ CONFIG FORM MODAL ============

function ConfigFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: IncentiveConfig | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [basis, setBasis] = React.useState('SLAB');
    const [cycle, setCycle] = React.useState('MONTHLY');
    const [department, setDepartment] = React.useState('');
    const [isActive, setIsActive] = React.useState(true);
    const [slabs, setSlabs] = React.useState<{ minOutput: string; maxOutput: string; amount: string }[]>([]);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setBasis(initialData.basis);
                setCycle(initialData.cycle); setDepartment(initialData.department ?? '');
                setIsActive(initialData.isActive);
                setSlabs((initialData.slabs ?? []).map(s => ({
                    minOutput: String(s.minOutput), maxOutput: String(s.maxOutput), amount: String(s.amount),
                })));
            } else {
                setName(''); setBasis('SLAB'); setCycle('MONTHLY');
                setDepartment(''); setIsActive(true); setSlabs([]);
            }
        }
    }, [visible, initialData]);

    const addSlab = () => setSlabs(p => [...p, { minOutput: '', maxOutput: '', amount: '' }]);
    const removeSlab = (i: number) => setSlabs(p => p.filter((_, idx) => idx !== i));
    const updateSlab = (i: number, field: string, val: string) => setSlabs(p => p.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(), basis, cycle,
            department: department.trim() || undefined,
            isActive,
            slabs: slabs.map(s => ({
                minOutput: Number(s.minOutput), maxOutput: Number(s.maxOutput), amount: Number(s.amount),
            })),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">
                        {initialData ? 'Edit Config' : 'Add Config'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Assembly Line Incentive" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Basis" options={BASES} value={basis} onSelect={setBasis} />
                        <ChipSelector label="Cycle" options={CYCLES} value={cycle} onSelect={setCycle} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Department</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Optional" placeholderTextColor={colors.neutral[400]} value={department} onChangeText={setDepartment} /></View>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Active</Text>
                            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isActive ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        {/* Slabs */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Slabs</Text>
                            <Pressable onPress={addSlab}><Text className="font-inter text-xs font-bold text-primary-600">+ Add Slab</Text></Pressable>
                        </View>
                        {slabs.map((s, i) => (
                            <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                                <View style={[styles.inputWrap, { flex: 1, height: 40 }]}><TextInput style={[styles.textInput, { fontSize: 12 }]} placeholder="Min" placeholderTextColor={colors.neutral[400]} value={s.minOutput} onChangeText={v => updateSlab(i, 'minOutput', v)} keyboardType="numeric" /></View>
                                <View style={[styles.inputWrap, { flex: 1, height: 40 }]}><TextInput style={[styles.textInput, { fontSize: 12 }]} placeholder="Max" placeholderTextColor={colors.neutral[400]} value={s.maxOutput} onChangeText={v => updateSlab(i, 'maxOutput', v)} keyboardType="numeric" /></View>
                                <View style={[styles.inputWrap, { flex: 1, height: 40 }]}><TextInput style={[styles.textInput, { fontSize: 12 }]} placeholder="Amt" placeholderTextColor={colors.neutral[400]} value={s.amount} onChangeText={v => updateSlab(i, 'amount', v)} keyboardType="numeric" /></View>
                                <Pressable onPress={() => removeSlab(i)} style={{ justifyContent: 'center' }}>
                                    <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" strokeLinecap="round" /></Svg>
                                </Pressable>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!name.trim() || isSaving} style={[styles.saveBtn, (!name.trim() || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CONFIG CARD ============

function ConfigCard({ item, index, onEdit, onDelete }: { item: IncentiveConfig; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <BasisBadge basis={item.basis} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <ActiveBadge active={item.isActive} />
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Cycle: {item.cycle}</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Slabs: {item.slabs?.length ?? 0}</Text></View>
                    {item.department ? <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.department}</Text></View> : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ RECORD CARD ============

function RecordCard({ item, index }: { item: IncentiveRecord; index: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.employeeName ?? item.employeeId}</Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.configName}</Text>
                    </View>
                    <StatusBadge status={item.status ?? 'DRAFT'} />
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Output: {item.outputUnits ?? 0}</Text></View>
                    <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-success-700">{'₹'}{Number(item.amount ?? 0).toLocaleString('en-IN')}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ProductionIncentiveScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [tab, setTab] = React.useState<'configs' | 'records'>('configs');
    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<IncentiveConfig | null>(null);

    const { data: configResponse, isLoading: configLoading, error: configError, refetch: configRefetch, isFetching: configFetching } = useIncentiveConfigs();
    const { data: recordResponse, isLoading: recordLoading, error: recordError, refetch: recordRefetch, isFetching: recordFetching } = useIncentiveRecords();
    const createMutation = useCreateIncentiveConfig();
    const updateMutation = useUpdateIncentiveConfig();
    const deleteMutation = useDeleteIncentiveConfig();
    const computeMutation = useComputeIncentives();
    const mergeMutation = useMergeIncentives();

    const configs: IncentiveConfig[] = React.useMemo(() => {
        const raw = (configResponse as any)?.data ?? configResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [configResponse]);

    const records: IncentiveRecord[] = React.useMemo(() => {
        const raw = (recordResponse as any)?.data ?? recordResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [recordResponse]);

    const filteredConfigs = React.useMemo(() => {
        if (!search.trim()) return configs;
        const q = search.toLowerCase();
        return configs.filter(c => c.name.toLowerCase().includes(q) || c.basis?.toLowerCase().includes(q));
    }, [configs, search]);

    const filteredRecords = React.useMemo(() => {
        if (!search.trim()) return records;
        const q = search.toLowerCase();
        return records.filter(r => (r.employeeName ?? '').toLowerCase().includes(q) || (r.configName ?? '').toLowerCase().includes(q));
    }, [records, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: IncentiveConfig) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: IncentiveConfig) => {
        showConfirm({
            title: 'Delete Config', message: `Delete "${item.name}"?`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as any, { onSuccess: () => setFormVisible(false) });
        }
    };

    const handleCompute = () => { computeMutation.mutate({} as any); };
    const handleMerge = () => { mergeMutation.mutate({} as any); };

    const isLoading = tab === 'configs' ? configLoading : recordLoading;
    const isFetching = tab === 'configs' ? configFetching : recordFetching;
    const errored = tab === 'configs' ? configError : recordError;
    const doRefetch = tab === 'configs' ? configRefetch : recordRefetch;

    const renderConfigItem = ({ item, index }: { item: IncentiveConfig; index: number }) => (
        <ConfigCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderRecordItem = ({ item, index }: { item: IncentiveRecord; index: number }) => (
        <RecordCard item={item} index={index} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Production Incentives</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                    {tab === 'configs' ? `${configs.length} config${configs.length !== 1 ? 's' : ''}` : `${records.length} record${records.length !== 1 ? 's' : ''}`}
                </Text>
            </View>
            <View style={{ marginTop: 16 }}>
                <TabSelector tab={tab} onSelect={setTab} />
                {tab === 'records' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <Pressable onPress={handleCompute} disabled={computeMutation.isPending} style={[styles.actionBtn, { backgroundColor: colors.accent[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-accent-700">{computeMutation.isPending ? 'Computing...' : 'Compute'}</Text>
                        </Pressable>
                        <Pressable onPress={handleMerge} disabled={mergeMutation.isPending} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-success-700">{mergeMutation.isPending ? 'Merging...' : 'Merge to Payroll'}</Text>
                        </Pressable>
                    </View>
                )}
                <SearchBar value={search} onChangeText={setSearch} placeholder={tab === 'configs' ? 'Search configs...' : 'Search records...'} />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (errored) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load data" message="Check your connection." action={{ label: 'Retry', onPress: () => doRefetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No matches for "${search}".`} /></View>;
        if (tab === 'configs') return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No configs yet" message="Create an incentive config to get started." /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No records yet" message="Compute incentives to generate records." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Production Incentives" onMenuPress={toggle} />
            {tab === 'configs' ? (
                <FlashList<IncentiveConfig>
                   
                    data={filteredConfigs}
                    renderItem={renderConfigItem}
                    keyExtractor={(item) => item.id ?? String(Math.random())}
                    ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => doRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            ) : (
                <FlashList<IncentiveRecord>
                   
                    data={filteredRecords}
                    renderItem={renderRecordItem}
                    keyExtractor={(item) => item.id ?? String(Math.random())}
                    ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => doRefetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
                />
            )}
            {tab === 'configs' && <FAB onPress={handleAdd} />}
            <ConfigFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
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
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
