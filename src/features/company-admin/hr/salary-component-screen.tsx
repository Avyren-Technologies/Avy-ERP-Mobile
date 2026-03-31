/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
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

import {
    useCreateSalaryComponent,
    useDeleteSalaryComponent,
    useUpdateSalaryComponent,
} from '@/features/company-admin/api/use-payroll-mutations';
import { useSalaryComponents } from '@/features/company-admin/api/use-payroll-queries';

// ============ TYPES ============

type ComponentType = 'Earning' | 'Deduction' | 'Employer Contribution';
type CalcMethod = 'Fixed' | '% of Basic' | '% of Gross' | 'Formula';
type TaxTreatment = 'Fully Taxable' | 'Partially Exempt' | 'Fully Exempt';

interface SalaryComponentItem {
    id: string;
    name: string;
    code: string;
    type: ComponentType;
    calculationMethod: CalcMethod;
    formulaValue: number;
    formula: string;
    taxTreatment: TaxTreatment;
    exemptionSection: string;
    exemptionLimit: number;
    pfInclusion: boolean;
    esiInclusion: boolean;
    bonusInclusion: boolean;
    gratuityInclusion: boolean;
    showOnPayslip: boolean;
    payslipOrder: number;
}

// ============ CONSTANTS ============

const COMPONENT_TYPES: ComponentType[] = ['Earning', 'Deduction', 'Employer Contribution'];
const CALC_METHODS: CalcMethod[] = ['Fixed', '% of Basic', '% of Gross', 'Formula'];
const TAX_TREATMENTS: TaxTreatment[] = ['Fully Taxable', 'Partially Exempt', 'Fully Exempt'];

const TYPE_COLORS: Record<ComponentType, { bg: string; text: string }> = {
    Earning: { bg: colors.success[50], text: colors.success[700] },
    Deduction: { bg: colors.danger[50], text: colors.danger[700] },
    'Employer Contribution': { bg: colors.info[50], text: colors.info[700] },
};

// ============ SHARED ATOMS ============

function TypeBadge({ type }: { type: ComponentType }) {
    const scheme = TYPE_COLORS[type] ?? TYPE_COLORS.Earning;
    return (
        <View style={[styles.typeBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{type}</Text>
        </View>
    );
}

function TaxBadge({ treatment }: { treatment: TaxTreatment }) {
    const isExempt = treatment !== 'Fully Taxable';
    return (
        <View style={[styles.typeBadge, { backgroundColor: isExempt ? colors.warning[50] : colors.neutral[100] }]}>
            <Text style={{ color: isExempt ? colors.warning[700] : colors.neutral[600], fontFamily: 'Inter', fontSize: 9, fontWeight: '700' }}>{treatment}</Text>
        </View>
    );
}

function InclusionChip({ label, enabled }: { label: string; enabled: boolean }) {
    if (!enabled) return null;
    return (
        <View style={[styles.inclusionChip, { backgroundColor: colors.primary[50] }]}>
            <Text className="font-inter text-[9px] font-bold text-primary-600">{label}</Text>
        </View>
    );
}

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

function ToggleRow({ label, subtitle, value, onChange }: { label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500">{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

// ============ FORM MODAL ============

const EMPTY_FORM: Omit<SalaryComponentItem, 'id'> = {
    name: '', code: '', type: 'Earning', calculationMethod: 'Fixed',
    formulaValue: 0, formula: '', taxTreatment: 'Fully Taxable',
    exemptionSection: '', exemptionLimit: 0,
    pfInclusion: false, esiInclusion: false, bonusInclusion: false, gratuityInclusion: false,
    showOnPayslip: true, payslipOrder: 0,
};

function SalaryComponentFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<SalaryComponentItem, 'id'>) => void;
    initialData?: SalaryComponentItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<Omit<SalaryComponentItem, 'id'>>(EMPTY_FORM);

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

    const update = <K extends keyof Omit<SalaryComponentItem, 'id'>>(key: K, val: Omit<SalaryComponentItem, 'id'>[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = () => {
        if (!form.name.trim() || !form.code.trim()) return;
        onSave({ ...form, name: form.name.trim(), code: form.code.trim().toUpperCase() });
    };

    const isValid = form.name.trim() && form.code.trim();
    const showFormulaValue = form.calculationMethod === '% of Basic' || form.calculationMethod === '% of Gross';
    const showFormula = form.calculationMethod === 'Formula';
    const showExemption = form.taxTreatment === 'Partially Exempt' || form.taxTreatment === 'Fully Exempt';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">
                        {initialData ? 'Edit Component' : 'Add Component'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Basic */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Basic Salary"' placeholderTextColor={colors.neutral[400]} value={form.name} onChangeText={v => update('name', v)} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "BASIC"' placeholderTextColor={colors.neutral[400]} value={form.code} onChangeText={v => update('code', v)} autoCapitalize="characters" /></View>
                        </View>
                        <ChipSelector label="Type" options={COMPONENT_TYPES} value={form.type} onSelect={v => update('type', v as ComponentType)} />
                        <ChipSelector label="Calculation Method" options={CALC_METHODS} value={form.calculationMethod} onSelect={v => update('calculationMethod', v as CalcMethod)} />
                        {showFormulaValue && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Percentage Value (%)</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="40" placeholderTextColor={colors.neutral[400]} value={form.formulaValue ? String(form.formulaValue) : ''} onChangeText={v => update('formulaValue', Number(v) || 0)} keyboardType="decimal-pad" /></View>
                            </View>
                        )}
                        {showFormula && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Formula</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "BASIC * 0.12"' placeholderTextColor={colors.neutral[400]} value={form.formula} onChangeText={v => update('formula', v)} /></View>
                            </View>
                        )}

                        {/* Tax */}
                        <ChipSelector label="Tax Treatment" options={TAX_TREATMENTS} value={form.taxTreatment} onSelect={v => update('taxTreatment', v as TaxTreatment)} />
                        {showExemption && (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Exemption Section</Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "10(13A)"' placeholderTextColor={colors.neutral[400]} value={form.exemptionSection} onChangeText={v => update('exemptionSection', v)} /></View>
                                </View>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Exemption Limit</Text>
                                    <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                        <Text className="mr-1 font-inter text-sm text-neutral-500">&#8377;</Text>
                                        <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.neutral[400]} value={form.exemptionLimit ? String(form.exemptionLimit) : ''} onChangeText={v => update('exemptionLimit', Number(v) || 0)} keyboardType="number-pad" />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Inclusions */}
                        <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500">Statutory Inclusions</Text>
                        <ToggleRow label="PF Inclusion" subtitle="Include in PF wage calculation" value={form.pfInclusion} onChange={v => update('pfInclusion', v)} />
                        <ToggleRow label="ESI Inclusion" subtitle="Include in ESI wage calculation" value={form.esiInclusion} onChange={v => update('esiInclusion', v)} />
                        <ToggleRow label="Bonus Inclusion" subtitle="Include in bonus calculation" value={form.bonusInclusion} onChange={v => update('bonusInclusion', v)} />
                        <ToggleRow label="Gratuity Inclusion" subtitle="Include in gratuity calculation" value={form.gratuityInclusion} onChange={v => update('gratuityInclusion', v)} />

                        {/* Payslip */}
                        <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500">Payslip</Text>
                        <ToggleRow label="Show on Payslip" value={form.showOnPayslip} onChange={v => update('showOnPayslip', v)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Payslip Order</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={form.payslipOrder ? String(form.payslipOrder) : ''} onChangeText={v => update('payslipOrder', Number(v) || 0)} keyboardType="number-pad" /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Component'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD ============

function SalaryComponentCard({ item, index, onEdit, onDelete }: { item: SalaryComponentItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <TypeBadge type={item.type} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            {item.calculationMethod}{item.calculationMethod.includes('%') ? ` (${item.formulaValue}%)` : ''}  {'\u00B7'}  Order: {item.payslipOrder}
                        </Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <TaxBadge treatment={item.taxTreatment} />
                    <InclusionChip label="PF" enabled={item.pfInclusion} />
                    <InclusionChip label="ESI" enabled={item.esiInclusion} />
                    <InclusionChip label="Bonus" enabled={item.bonusInclusion} />
                    <InclusionChip label="Gratuity" enabled={item.gratuityInclusion} />
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function SalaryComponentScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useSalaryComponents();
    const createMutation = useCreateSalaryComponent();
    const updateMutation = useUpdateSalaryComponent();
    const deleteMutation = useDeleteSalaryComponent();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<SalaryComponentItem | null>(null);
    const [search, setSearch] = React.useState('');

    const items: SalaryComponentItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            code: item.code ?? '',
            type: item.type ?? 'Earning',
            calculationMethod: item.calculationMethod ?? 'Fixed',
            formulaValue: item.formulaValue ?? 0,
            formula: item.formula ?? '',
            taxTreatment: item.taxTreatment ?? 'Fully Taxable',
            exemptionSection: item.exemptionSection ?? '',
            exemptionLimit: item.exemptionLimit ?? 0,
            pfInclusion: item.pfInclusion ?? false,
            esiInclusion: item.esiInclusion ?? false,
            bonusInclusion: item.bonusInclusion ?? false,
            gratuityInclusion: item.gratuityInclusion ?? false,
            showOnPayslip: item.showOnPayslip ?? true,
            payslipOrder: item.payslipOrder ?? 0,
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    }, [items, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: SalaryComponentItem) => { setEditingItem(item); setFormVisible(true); };
    const handleDelete = (item: SalaryComponentItem) => {
        showConfirm({
            title: 'Delete Component',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };
    const handleSave = (data: Omit<SalaryComponentItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: SalaryComponentItem; index: number }) => (
        <SalaryComponentCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Salary Components</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{items.length} component{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load components" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No components match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No salary components yet" message="Add your first salary component to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Salary Components" onMenuPress={toggle} />
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <SalaryComponentFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    inclusionChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
