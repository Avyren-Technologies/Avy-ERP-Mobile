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
    useCreateEmployeeType,
    useDeleteEmployeeType,
    useUpdateEmployeeType,
} from '@/features/company-admin/api/use-hr-mutations';
import { useEmployeeTypes } from '@/features/company-admin/api/use-hr-queries';

// ============ HELPERS ============

function generateCode(name: string): string {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/);
    const abbr = words.length >= 2
        ? words.map(w => w[0]!.toUpperCase()).join('').slice(0, 4)
        : name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    return `${abbr}-001`;
}

// ============ TYPES ============

interface EmployeeTypeItem {
    id: string;
    name: string;
    code: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    ptApplicable: boolean;
    gratuityEligible: boolean;
    bonusEligible: boolean;
    status: 'Active' | 'Inactive';
}

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: string }) {
    const isActive = status === 'Active';
    return (
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500'}`}>{status}</Text>
        </View>
    );
}

function StatutoryChip({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <View style={[styles.statutoryChip, { backgroundColor: enabled ? colors.success[50] : colors.danger[50] }]}>
            <Text className={`font-inter text-[10px] font-bold ${enabled ? 'text-success-700' : 'text-danger-600'}`}>
                {label} {enabled ? '\u2713' : '\u2717'}
            </Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
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

function EmployeeTypeFormModal({
    visible, onClose, onSave, initialData, isSaving,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<EmployeeTypeItem, 'id'>) => void;
    initialData?: EmployeeTypeItem | null; isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(false);
    const [pfApplicable, setPfApplicable] = React.useState(true);
    const [esiApplicable, setEsiApplicable] = React.useState(true);
    const [ptApplicable, setPtApplicable] = React.useState(true);
    const [gratuityEligible, setGratuityEligible] = React.useState(true);
    const [bonusEligible, setBonusEligible] = React.useState(true);
    const [status, setStatus] = React.useState<'Active' | 'Inactive'>('Active');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setCode(initialData.code);
                setCodeManuallyEdited(true);
                setPfApplicable(initialData.pfApplicable); setEsiApplicable(initialData.esiApplicable);
                setPtApplicable(initialData.ptApplicable); setGratuityEligible(initialData.gratuityEligible);
                setBonusEligible(initialData.bonusEligible); setStatus(initialData.status);
            } else {
                setName(''); setCode(''); setCodeManuallyEdited(false);
                setPfApplicable(true); setEsiApplicable(true);
                setPtApplicable(true); setGratuityEligible(true); setBonusEligible(true);
                setStatus('Active');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!name.trim() || !code.trim()) return;
        onSave({
            name: name.trim(), code: code.trim().toUpperCase(),
            pfApplicable, esiApplicable, ptApplicable,
            gratuityEligible, bonusEligible, status,
        });
    };

    const isValid = name.trim() && code.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Employee Type' : 'Add Employee Type'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Permanent"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(val) => { setName(val); if (!codeManuallyEdited) { setCode(generateCode(val)); } }} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "PERM"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(val) => { setCode(val); setCodeManuallyEdited(true); }} autoCapitalize="characters" /></View>
                        </View>

                        <Text className="mb-2 mt-1 font-inter text-xs font-bold text-neutral-500">Statutory Applicability</Text>
                        <ToggleRow label="PF Applicable" subtitle="Provident Fund deduction" value={pfApplicable} onChange={setPfApplicable} />
                        <ToggleRow label="ESI Applicable" subtitle="Employee State Insurance" value={esiApplicable} onChange={setEsiApplicable} />
                        <ToggleRow label="PT Applicable" subtitle="Professional Tax" value={ptApplicable} onChange={setPtApplicable} />
                        <ToggleRow label="Gratuity Eligible" subtitle="Gratuity payment eligibility" value={gratuityEligible} onChange={setGratuityEligible} />
                        <ToggleRow label="Bonus Eligible" subtitle="Statutory bonus eligibility" value={bonusEligible} onChange={setBonusEligible} />

                        <View style={{ marginTop: 8 }} />
                        <ChipSelector label="Status" options={['Active', 'Inactive']} value={status} onSelect={v => setStatus(v as 'Active' | 'Inactive')} />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Type'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ EMPLOYEE TYPE CARD ============

function EmployeeTypeCard({ item, index, onEdit, onDelete }: { item: EmployeeTypeItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={item.status} />
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    <StatutoryChip label="PF" enabled={item.pfApplicable} />
                    <StatutoryChip label="ESI" enabled={item.esiApplicable} />
                    <StatutoryChip label="PT" enabled={item.ptApplicable} />
                    <StatutoryChip label="Gratuity" enabled={item.gratuityEligible} />
                    <StatutoryChip label="Bonus" enabled={item.bonusEligible} />
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function EmployeeTypeScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useEmployeeTypes();
    const createMutation = useCreateEmployeeType();
    const updateMutation = useUpdateEmployeeType();
    const deleteMutation = useDeleteEmployeeType();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<EmployeeTypeItem | null>(null);
    const [search, setSearch] = React.useState('');

    const employeeTypes: EmployeeTypeItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', code: item.code ?? '',
            pfApplicable: item.pfApplicable ?? false, esiApplicable: item.esiApplicable ?? false,
            ptApplicable: item.ptApplicable ?? false, gratuityEligible: item.gratuityEligible ?? false,
            bonusEligible: item.bonusEligible ?? false, status: item.status ?? 'Active',
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return employeeTypes;
        const q = search.toLowerCase();
        return employeeTypes.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }, [employeeTypes, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: EmployeeTypeItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: EmployeeTypeItem) => {
        showConfirm({
            title: 'Delete Employee Type', message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<EmployeeTypeItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: EmployeeTypeItem; index: number }) => (
        <EmployeeTypeCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Employee Types</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{employeeTypes.length} type{employeeTypes.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load employee types" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No employee types match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No employee types yet" message="Add your first employee type to define statutory rules." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Employee Type Management" onMenuPress={toggle} />
            <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <EmployeeTypeFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />
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
    statutoryChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
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
