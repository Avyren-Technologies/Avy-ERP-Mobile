/* eslint-disable better-tailwindcss/no-unknown-classes */
/* eslint-disable react-hooks/exhaustive-deps */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
import { useIsDark } from '@/hooks/use-is-dark';

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
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}>{status}</Text>
        </View>
    );
}

function Dropdown({
    label, value, options, onSelect, placeholder, required, error,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean; error?: string;
}) {
    const [open, setOpen] = React.useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => setOpen(true)} style={[styles.dropdownBtn, !!error && { borderColor: colors.danger[300] }]}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {!!error && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{error}</Text>}
            
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <Animated.View entering={FadeInUp} style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        <Pressable onPress={() => { onSelect(''); setOpen(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                            <Text className="font-inter text-sm text-neutral-400">NONE</Text>
                        </Pressable>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label.toUpperCase()}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

// ============ TOAST COMPONENT ============

function StatusToast({ message, visible, type = 'success' }: { readonly message: string; readonly visible: boolean; readonly type?: 'success' | 'error' }) {
    if (!visible) return null;
    const isError = type === 'error';
    const bgColors: [string, string] = isError ? [colors.danger[500], colors.danger[600]] : [colors.success[500], colors.success[600]];

    return (
        <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeInDown} style={styles.toastContainer}>
            <LinearGradient colors={bgColors} style={styles.toastGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    {isError ? (
                        <Path d="M12 8v4m0 4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                        <Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </Svg>
                <Text className="ml-2 font-inter text-sm font-bold text-white">{message}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============ FORM MODAL ============

function CostCentreFormModal({
    visible, onClose, onSave, initialData, isSaving,
    departmentOptions, locationOptions,
}: {
    readonly visible: boolean; readonly onClose: () => void;
    readonly onSave: (data: Omit<CostCentreItem, 'id'>) => void;
    readonly initialData?: CostCentreItem | null; readonly isSaving: boolean;
    readonly departmentOptions: { id: string; label: string }[];
    readonly locationOptions: { id: string; label: string }[];
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
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const resetForm = React.useCallback(() => {
        setCode(''); setCodeManuallyEdited(false); setName('');
        setDepartmentId(''); setLocationId('');
        setAnnualBudget(''); setGlAccountCode(''); setStatus('Active');
        setErrors({});
    }, []);

    const populateForm = React.useCallback((data: CostCentreItem) => {
        setCode(data.code); setCodeManuallyEdited(true);
        setName(data.name);
        setDepartmentId(data.departmentId); setLocationId(data.locationId);
        setAnnualBudget(data.annualBudget ? String(data.annualBudget) : '');
        setGlAccountCode(data.glAccountCode); setStatus(data.status);
    }, []);

    React.useEffect(() => {
        if (visible) {
            setErrors({});
            if (initialData) {
                populateForm(initialData);
            } else {
                resetForm();
            }
        }
    }, [visible, initialData, populateForm, resetForm]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Cost Centre Name is required';
        if (!code.trim()) newErrors.code = 'Cost Centre Code is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            code: code.trim().toUpperCase(), name: name.trim(),
            departmentId, departmentName: departmentOptions.find(d => d.id === departmentId)?.label ?? '',
            locationId, locationName: locationOptions.find(l => l.id === locationId)?.label ?? '',
            annualBudget: Number.parseFloat(annualBudget) || 0,
            glAccountCode: glAccountCode.trim(), status,
        });
    };

    return (
        <Modal 
            visible={visible} 
            transparent={false} 
            animationType="slide" 
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: colors.white }}>
                <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />
                
                {/* Header */}
                <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                            {initialData ? 'Edit Cost Centre' : 'New Cost Centre'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400"> Manage budgeting and resource allocation </Text>
                    </View>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                                <TextInput style={styles.textInput} placeholder='E.G. "ENGINEERING COST CENTRE"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(val) => { setName(val); if (!codeManuallyEdited) { setCode(generateCode(val)); } if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} autoCapitalize="words" />
                            </View>
                            {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                                <TextInput style={styles.textInput} placeholder='E.G. "CC-ENG-01"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(val) => { setCode(val); setCodeManuallyEdited(true); if (errors.code) setErrors(prev => ({ ...prev, code: '' })); }} autoCapitalize="characters" />
                            </View>
                            {!!errors.code && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>}
                        </View>

                        <Dropdown label="Department" value={departmentId} options={departmentOptions} onSelect={setDepartmentId} placeholder="Select Department..." />
                        <Dropdown label="Location" value={locationId} options={locationOptions} onSelect={setLocationId} placeholder="Select Location..." />

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Annual Budget</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'₹'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="e.g. 5000000" placeholderTextColor={colors.neutral[400]} value={annualBudget} onChangeText={setAnnualBudget} keyboardType="numeric" />
                                <Text className="font-inter text-sm font-bold text-neutral-400 mr-1">{'\u20B9'}</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder='E.G. "5000000"' placeholderTextColor={colors.neutral[400]} value={annualBudget} onChangeText={setAnnualBudget} keyboardType="numeric" />
                            </View>
                        </View>
                        
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                                GL Account Code <Text className="font-inter text-[10px] font-normal text-neutral-400">(COMING SOON)</Text>
                            </Text>
                            <View style={[styles.inputWrap, { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] }]}>
                                <TextInput style={[styles.textInput, { color: colors.neutral[400] }]} placeholder='E.G. "4100-01"' placeholderTextColor={colors.neutral[300]} value={glAccountCode} editable={false} />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">GL mapping will be available once the Accounting module is enabled.</Text>
                        </View>

                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Status</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {(['Active', 'Inactive'] as const).map(opt => {
                                    const selected = opt === status;
                                    return (
                                        <Pressable key={opt} onPress={() => setStatus(opt)} style={[styles.chip, selected && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.toUpperCase()}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer */}
                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    <Pressable onPress={onClose} style={styles.discardBtn} hitSlop={8}>
                        <Text className="font-inter text-sm font-bold text-neutral-500 dark:text-neutral-400">DISCARD</Text>
                    </Pressable>
                    <Pressable onPress={handleSave} disabled={isSaving} style={({ pressed }) => [styles.primaryBtn, isSaving && { opacity: 0.7 }, pressed && { transform: [{ scale: 0.98 }] }]}>
                        <Text className="font-inter text-sm font-bold text-white uppercase">{isSaving ? 'Saving...' : initialData ? 'Update CC' : 'Save CC'}</Text>
                        {!isSaving && <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}><Path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============ COST CENTRE CARD ============

function CostCentreCard({ item, index, onEdit, onDelete }: { readonly item: CostCentreItem; readonly index: number; readonly onEdit: () => void; readonly onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteIconBtn}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    <StatusBadge status={item.status} />
                    {item.departmentName ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">DEPT: {item.departmentName.toUpperCase()}</Text></View>
                    ) : null}
                    {item.locationName ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">LOC: {item.locationName.toUpperCase()}</Text></View>
                    ) : null}
                    {item.annualBudget > 0 && (
                        <View style={[styles.metaChip, { backgroundColor: colors.success[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-success-700">BUDGET: {formatCurrency(item.annualBudget)}</Text>
                        </View>
                    )}
                    {item.glAccountCode ? (
                        <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">GL: {item.glAccountCode}</Text></View>
                    ) : null}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CostCentreScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

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
    
    const [toastVisible, setToastVisible] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
    const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage(msg); setToastType(type); setToastVisible(true);
        toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
    };

    const costCentres: CostCentreItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', code: item.code ?? '', name: item.name ?? '',
            departmentId: item.departmentId ?? '', 
            departmentName: item.department?.name ?? item.departmentName ?? '',
            locationId: item.locationId ?? '', 
            locationName: item.location?.name ?? item.location?.locationName ?? item.locationName ?? '',
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
            onConfirm: () => { 
                deleteMutation.mutate(item.id, {
                    onSuccess: () => triggerToast('Cost Centre deleted successfully'),
                    onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to delete CC', 'error'),
                }); 
            },
        });
    };

    const handleSave = (data: Omit<CostCentreItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { 
                onSuccess: () => { setFormVisible(false); triggerToast('Cost Centre updated successfully'); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to update CC', 'error'),
            });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { 
                onSuccess: () => { setFormVisible(false); triggerToast('Cost Centre created successfully'); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to create CC', 'error'),
            });
        }
    };

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search by code or name..." />
        </Animated.View>
    );

    const renderItem = ({ item, index }: { item: CostCentreItem; index: number }) => (
        <CostCentreCard
            item={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24, paddingHorizontal: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load cost centres" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No cost centres match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No cost centres yet" message="Add your first cost centre for budgeting and tracking." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={isDark ? ['#0F0D1A', '#1A1730'] : [colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />
            <AppTopHeader title="Cost Centre Management" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <CostCentreFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending}
                departmentOptions={departmentOptions} locationOptions={locationOptions} />
            <StatusToast message={toastMessage} visible={toastVisible} type={toastType} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white },
    headerContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 24, padding: 20, marginBottom: 16,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardPressed: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[50] },
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    codeBadge: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    deleteIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger[50], justifyContent: 'center', alignItems: 'center' },
    
    toastContainer: { position: 'absolute', top: 100, left: 24, right: 24, zIndex: 9999 },
    toastGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    
    modalFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.neutral[100], backgroundColor: isDark ? '#1A1730' : colors.white },
    discardBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    primaryBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[600], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
