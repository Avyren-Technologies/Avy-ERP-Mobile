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

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useCreateCostCentre,
    useDeleteCostCentre,
    useUpdateCostCentre,
} from '@/features/company-admin/api/use-hr-mutations';
import { useCostCentres, useDepartments } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

interface CostCentreItem {
    id: string;
    code: string;
    name: string;
    departmentId: string;
    departmentName: string;
    locationId: string;
    locationName: string;
    annualBudget: number;
    glAccountCode: string;
    status: 'Active' | 'Inactive';
}

// ============ HELPERS ============

function generateCode(name: string): string {
    if (!name.trim()) return '';
    const words = name.trim().split(/\s+/);
    const abbr = words.length >= 2
        ? words.map(w => w[0]!.toUpperCase()).join('').slice(0, 4)
        : name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    return `${abbr}-001`;
}

function formatCurrency(n: number): string {
    if (!n) return '-';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
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

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 mb-3">{label}</Text>
                        <Pressable onPress={() => { onSelect(''); setOpen(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                            <Text className="font-inter text-sm text-neutral-400">None</Text>
                        </Pressable>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ FORM MODAL ============

function CostCentreFormModal({
    visible, onClose, onSave, initialData, isSaving,
    departmentOptions, locationOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<CostCentreItem, 'id'>) => void;
    initialData?: CostCentreItem | null; isSaving: boolean;
    departmentOptions: { id: string; label: string }[];
    locationOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [code, setCode] = React.useState('');
    const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(false);
    const [name, setName] = React.useState('');
    const [departmentId, setDepartmentId] = React.useState('');
    const [locationId, setLocationId] = React.useState('');
    const [annualBudget, setAnnualBudget] = React.useState('');
    const [glAccountCode, setGlAccountCode] = React.useState('');
    const [status, setStatus] = React.useState<'Active' | 'Inactive'>('Active');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setCode(initialData.code); setCodeManuallyEdited(true);
                setName(initialData.name);
                setDepartmentId(initialData.departmentId); setLocationId(initialData.locationId);
                setAnnualBudget(initialData.annualBudget ? String(initialData.annualBudget) : '');
                setGlAccountCode(initialData.glAccountCode); setStatus(initialData.status);
            } else {
                setCode(''); setCodeManuallyEdited(false); setName('');
                setDepartmentId(''); setLocationId('');
                setAnnualBudget(''); setGlAccountCode(''); setStatus('Active');
            }
        }
    }, [visible, initialData]);

    const handleSave = () => {
        if (!code.trim() || !name.trim()) return;
        onSave({
            code: code.trim().toUpperCase(), name: name.trim(),
            departmentId, departmentName: departmentOptions.find(d => d.id === departmentId)?.label ?? '',
            locationId, locationName: locationOptions.find(l => l.id === locationId)?.label ?? '',
            annualBudget: Number.parseFloat(annualBudget) || 0,
            glAccountCode: glAccountCode.trim(), status,
        });
    };

    const isValid = code.trim() && name.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Cost Centre' : 'Add Cost Centre'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Engineering Cost Centre"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(val) => { setName(val); if (!codeManuallyEdited) { setCode(generateCode(val)); } }} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "CC-ENG-01"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(val) => { setCode(val); setCodeManuallyEdited(true); }} autoCapitalize="characters" /></View>
                        </View>
                        <Dropdown label="Department" value={departmentId} options={departmentOptions} onSelect={setDepartmentId} placeholder="Select department..." />
                        <Dropdown label="Location" value={locationId} options={locationOptions} onSelect={setLocationId} placeholder="Select location..." />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Annual Budget</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'₹'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="e.g. 5000000" placeholderTextColor={colors.neutral[400]} value={annualBudget} onChangeText={setAnnualBudget} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                GL Account Code <Text className="font-inter text-[10px] font-normal text-neutral-400">(Coming soon)</Text>
                            </Text>
                            <View style={[styles.inputWrap, { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] }]}>
                                <TextInput style={[styles.textInput, { color: colors.neutral[400] }]} placeholder='e.g. "4100-01"' placeholderTextColor={colors.neutral[300]} value={glAccountCode} editable={false} />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">GL mapping will be available once the Accounting module is enabled.</Text>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Cost Centre'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ COST CENTRE CARD ============

function CostCentreCard({ item, index, onEdit, onDelete }: { item: CostCentreItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
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
                    {item.departmentName ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">Dept: {item.departmentName}</Text></View>
                    ) : null}
                    {item.locationName ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">Loc: {item.locationName}</Text></View>
                    ) : null}
                    {item.annualBudget > 0 && (
                        <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-success-700">Budget: {formatCurrency(item.annualBudget)}</Text>
                        </View>
                    )}
                    {item.glAccountCode ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500">GL: {item.glAccountCode}</Text></View>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CostCentreScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useCostCentres();
    const { data: deptResponse } = useDepartments();
    const { data: locResponse } = useCompanyLocations();
    const createMutation = useCreateCostCentre();
    const updateMutation = useUpdateCostCentre();
    const deleteMutation = useDeleteCostCentre();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<CostCentreItem | null>(null);
    const [search, setSearch] = React.useState('');

    const costCentres: CostCentreItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', code: item.code ?? '', name: item.name ?? '',
            departmentId: item.departmentId ?? '', departmentName: item.departmentName ?? '',
            locationId: item.locationId ?? '', locationName: item.locationName ?? '',
            annualBudget: item.annualBudget ?? 0, glAccountCode: item.glAccountCode ?? '',
            status: item.status ?? 'Active',
        }));
    }, [response]);

    const departmentOptions = React.useMemo(() => {
        const raw = (deptResponse as any)?.data ?? deptResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((d: any) => ({ id: d.id ?? '', label: d.name ?? '' }));
    }, [deptResponse]);

    const locationOptions = React.useMemo(() => {
        const raw = (locResponse as any)?.data ?? locResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((l: any) => ({ id: l.id ?? '', label: l.name ?? l.locationName ?? '' }));
    }, [locResponse]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return costCentres;
        const q = search.toLowerCase();
        return costCentres.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }, [costCentres, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: CostCentreItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: CostCentreItem) => {
        showConfirm({
            title: 'Delete Cost Centre', message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<CostCentreItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: CostCentreItem; index: number }) => (
        <CostCentreCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Cost Centres</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{costCentres.length} cost centre{costCentres.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by code or name..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load cost centres" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No cost centres match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No cost centres yet" message="Add your first cost centre for budgeting and tracking." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Cost Centre Management" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <CostCentreFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending}
                departmentOptions={departmentOptions} locationOptions={locationOptions} />
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
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
