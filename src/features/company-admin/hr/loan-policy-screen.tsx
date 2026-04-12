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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

import { useEmployeeTypes } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateLoanPolicy,
    useDeleteLoanPolicy,
    useUpdateLoanPolicy,
} from '@/features/company-admin/api/use-payroll-mutations';
import { useLoanPolicies } from '@/features/company-admin/api/use-payroll-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface LoanPolicyItem {
    id: string;
    name: string;
    code: string;
    maxAmount: number;
    maxTenure: number;
    interestRate: number;
    emiCap: number;
    eligibilityTenure: number;
    eligibleEmployeeTypes: string[];
    status: 'Active' | 'Inactive';
}

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ============ SHARED ATOMS ============

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

function MultiChipSelector({ label, options, value, onToggle }: { label: string; options: { id: string; label: string }[]; value: string[]; onToggle: (id: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = value.includes(opt.id);
                    return (
                        <Pressable key={opt.id} onPress={() => onToggle(opt.id)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isActive = status === 'Active';
    return (
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}>{status}</Text>
        </View>
    );
}

// ============ FORM MODAL ============

const EMPTY_FORM: Omit<LoanPolicyItem, 'id'> = {
    name: '', code: '', maxAmount: 0, maxTenure: 0, interestRate: 0, emiCap: 0,
    eligibilityTenure: 0, eligibleEmployeeTypes: [], status: 'Active',
};

function LoanPolicyFormModal({
    visible, onClose, onSave, initialData, isSaving, employeeTypeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<LoanPolicyItem, 'id'>) => void;
    initialData?: LoanPolicyItem | null; isSaving: boolean;
    employeeTypeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<Omit<LoanPolicyItem, 'id'>>(EMPTY_FORM);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                const { id: _, ...rest } = initialData;
                setForm(rest);
            } else {
                setForm(EMPTY_FORM);
            }
        }
    }, [visible, initialData]);

    const update = <K extends keyof Omit<LoanPolicyItem, 'id'>>(key: K, val: Omit<LoanPolicyItem, 'id'>[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const toggleEmpType = (id: string) => {
        setForm(prev => ({
            ...prev,
            eligibleEmployeeTypes: prev.eligibleEmployeeTypes.includes(id)
                ? prev.eligibleEmployeeTypes.filter(x => x !== id)
                : [...prev.eligibleEmployeeTypes, id],
        }));
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.code.trim()) return;
        onSave({ ...form, name: form.name.trim(), code: form.code.trim().toUpperCase() });
    };

    const isValid = form.name.trim() && form.code.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">
                        {initialData ? 'Edit Loan Policy' : 'Add Loan Policy'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Personal Loan"' placeholderTextColor={colors.neutral[400]} value={form.name} onChangeText={v => update('name', v)} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "PL"' placeholderTextColor={colors.neutral[400]} value={form.code} onChangeText={v => update('code', v)} autoCapitalize="characters" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Max Amount</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">&#8377;</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="500000" placeholderTextColor={colors.neutral[400]} value={form.maxAmount ? String(form.maxAmount) : ''} onChangeText={v => update('maxAmount', Number(v) || 0)} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Max Tenure (months)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="36" placeholderTextColor={colors.neutral[400]} value={form.maxTenure ? String(form.maxTenure) : ''} onChangeText={v => update('maxTenure', Number(v) || 0)} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Interest Rate (%)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="8" placeholderTextColor={colors.neutral[400]} value={form.interestRate ? String(form.interestRate) : ''} onChangeText={v => update('interestRate', Number(v) || 0)} keyboardType="decimal-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">EMI Cap (% of salary)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="50" placeholderTextColor={colors.neutral[400]} value={form.emiCap ? String(form.emiCap) : ''} onChangeText={v => update('emiCap', Number(v) || 0)} keyboardType="decimal-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Eligibility Tenure (days)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="180" placeholderTextColor={colors.neutral[400]} value={form.eligibilityTenure ? String(form.eligibilityTenure) : ''} onChangeText={v => update('eligibilityTenure', Number(v) || 0)} keyboardType="number-pad" /></View>
                        </View>
                        {employeeTypeOptions.length > 0 && (
                            <MultiChipSelector label="Eligible Employee Types" options={employeeTypeOptions} value={form.eligibleEmployeeTypes} onToggle={toggleEmpType} />
                        )}
                        <ChipSelector label="Status" options={['Active', 'Inactive']} value={form.status} onSelect={v => update('status', v as 'Active' | 'Inactive')} />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Policy'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD ============

function LoanPolicyCard({ item, index, onEdit, onDelete }: { item: LoanPolicyItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <StatusBadge status={item.status} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                            Max: {formatCurrency(item.maxAmount)}  {'\u00B7'}  {item.maxTenure} months  {'\u00B7'}  {item.interestRate}% p.a.
                        </Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">EMI Cap: {item.emiCap}%</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Eligibility: {item.eligibilityTenure} days</Text></View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function LoanPolicyScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useLoanPolicies();
    const createMutation = useCreateLoanPolicy();
    const updateMutation = useUpdateLoanPolicy();
    const deleteMutation = useDeleteLoanPolicy();

    const { data: empTypeResponse } = useEmployeeTypes();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<LoanPolicyItem | null>(null);
    const [search, setSearch] = React.useState('');

    const employeeTypeOptions = React.useMemo(() => {
        const raw = (empTypeResponse as any)?.data ?? empTypeResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [empTypeResponse]);

    const items: LoanPolicyItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            code: item.code ?? '',
            maxAmount: item.maxAmount ?? 0,
            maxTenure: item.maxTenure ?? 0,
            interestRate: item.interestRate ?? 0,
            emiCap: item.emiCap ?? 0,
            eligibilityTenure: item.eligibilityTenure ?? 0,
            eligibleEmployeeTypes: item.eligibleEmployeeTypes ?? [],
            status: item.status ?? 'Active',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    }, [items, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: LoanPolicyItem) => { setEditingItem(item); setFormVisible(true); };
    const handleDelete = (item: LoanPolicyItem) => {
        showConfirm({
            title: 'Delete Policy',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };
    const handleSave = (data: Omit<LoanPolicyItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: LoanPolicyItem; index: number }) => (
        <LoanPolicyCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Loan Policies</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} polic{items.length !== 1 ? 'ies' : 'y'}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load policies" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No policies match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No loan policies yet" message="Add your first loan policy to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Loan Policies" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <LoanPolicyFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending}
                employeeTypeOptions={employeeTypeOptions}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    codeBadge: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
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
