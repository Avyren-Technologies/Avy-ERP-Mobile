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

import {
    useDepartments,
    useDesignations,
    useEmployeeTypes,
    useGrades,
} from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateLeavePolicy,
    useDeleteLeavePolicy,
    useUpdateLeavePolicy,
} from '@/features/company-admin/api/use-leave-mutations';
import { useLeavePolicies, useLeaveTypes } from '@/features/company-admin/api/use-leave-queries';

// ============ TYPES ============

type AssignmentLevel = 'Company' | 'Department' | 'Designation' | 'Grade' | 'EmployeeType' | 'Individual';

interface LeavePolicyItem {
    id: string;
    leaveTypeId: string;
    leaveTypeName: string;
    assignmentLevel: AssignmentLevel;
    assignmentTargetId: string;
    assignmentTargetName: string;
    annualEntitlementOverride: number | null;
    carryForwardDaysOverride: number | null;
}

// ============ CONSTANTS ============

const ASSIGNMENT_LEVELS: AssignmentLevel[] = ['Company', 'Department', 'Designation', 'Grade', 'EmployeeType', 'Individual'];

const LEVEL_COLORS: Record<AssignmentLevel, { bg: string; text: string }> = {
    Company: { bg: colors.primary[50], text: colors.primary[700] },
    Department: { bg: colors.info[50], text: colors.info[700] },
    Designation: { bg: colors.accent[50], text: colors.accent[700] },
    Grade: { bg: colors.success[50], text: colors.success[700] },
    EmployeeType: { bg: colors.warning[50], text: colors.warning[700] },
    Individual: { bg: colors.danger[50], text: colors.danger[700] },
};

// ============ SHARED ATOMS ============

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

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
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
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {!required && (
                                <Pressable onPress={() => { onSelect(''); setOpen(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                    <Text className="font-inter text-sm text-neutral-400">None</Text>
                                </Pressable>
                            )}
                            {filteredOptions.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                            {filteredOptions.length === 0 && (
                                <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ FORM MODAL ============

function LeavePolicyFormModal({
    visible, onClose, onSave, initialData, isSaving,
    leaveTypeOptions, departmentOptions, designationOptions, gradeOptions, employeeTypeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<LeavePolicyItem, 'id' | 'leaveTypeName' | 'assignmentTargetName'>) => void;
    initialData?: LeavePolicyItem | null; isSaving: boolean;
    leaveTypeOptions: { id: string; label: string }[];
    departmentOptions: { id: string; label: string }[];
    designationOptions: { id: string; label: string }[];
    gradeOptions: { id: string; label: string }[];
    employeeTypeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [leaveTypeId, setLeaveTypeId] = React.useState('');
    const [assignmentLevel, setAssignmentLevel] = React.useState<AssignmentLevel>('Company');
    const [assignmentTargetId, setAssignmentTargetId] = React.useState('');
    const [annualOverride, setAnnualOverride] = React.useState('');
    const [cfOverride, setCfOverride] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setLeaveTypeId(initialData.leaveTypeId);
                setAssignmentLevel(initialData.assignmentLevel);
                setAssignmentTargetId(initialData.assignmentTargetId);
                setAnnualOverride(initialData.annualEntitlementOverride != null ? String(initialData.annualEntitlementOverride) : '');
                setCfOverride(initialData.carryForwardDaysOverride != null ? String(initialData.carryForwardDaysOverride) : '');
            } else {
                setLeaveTypeId('');
                setAssignmentLevel('Company');
                setAssignmentTargetId('');
                setAnnualOverride('');
                setCfOverride('');
            }
        }
    }, [visible, initialData]);

    // Reset target when level changes
    React.useEffect(() => {
        setAssignmentTargetId('');
    }, [assignmentLevel]);

    const targetOptions = React.useMemo(() => {
        switch (assignmentLevel) {
            case 'Department': return departmentOptions;
            case 'Designation': return designationOptions;
            case 'Grade': return gradeOptions;
            case 'EmployeeType': return employeeTypeOptions;
            default: return [];
        }
    }, [assignmentLevel, departmentOptions, designationOptions, gradeOptions, employeeTypeOptions]);

    const needsTarget = assignmentLevel !== 'Company' && assignmentLevel !== 'Individual';

    const handleSave = () => {
        if (!leaveTypeId) return;
        onSave({
            leaveTypeId,
            assignmentLevel,
            assignmentTargetId,
            annualEntitlementOverride: annualOverride ? Number(annualOverride) : null,
            carryForwardDaysOverride: cfOverride ? Number(cfOverride) : null,
        });
    };

    const isValid = leaveTypeId && (assignmentLevel === 'Company' || assignmentLevel === 'Individual' || assignmentTargetId);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Policy' : 'Add Policy'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <Dropdown label="Leave Type" value={leaveTypeId} options={leaveTypeOptions} onSelect={setLeaveTypeId} placeholder="Select leave type..." required />
                        <ChipSelector label="Assignment Level" options={ASSIGNMENT_LEVELS} value={assignmentLevel} onSelect={v => setAssignmentLevel(v as AssignmentLevel)} />
                        {needsTarget && (
                            <Dropdown label="Assignment Target" value={assignmentTargetId} options={targetOptions} onSelect={setAssignmentTargetId} placeholder="Select target..." required />
                        )}
                        <Text className="mb-2 mt-1 font-inter text-xs font-bold text-neutral-500">Overrides (leave blank for default)</Text>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Annual Entitlement Override</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Default" placeholderTextColor={colors.neutral[400]} value={annualOverride} onChangeText={setAnnualOverride} keyboardType="number-pad" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Carry Forward Days Override</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Default" placeholderTextColor={colors.neutral[400]} value={cfOverride} onChangeText={setCfOverride} keyboardType="number-pad" /></View>
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Policy'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ POLICY CARD ============

function PolicyCard({ item, index, onEdit, onDelete }: { item: LeavePolicyItem; index: number; onEdit: () => void; onDelete: () => void }) {
    const levelColor = LEVEL_COLORS[item.assignmentLevel] ?? LEVEL_COLORS.Company;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.leaveTypeName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <View style={[styles.levelBadge, { backgroundColor: levelColor.bg }]}>
                                <Text style={{ color: levelColor.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{item.assignmentLevel}</Text>
                            </View>
                            {item.assignmentTargetName ? (
                                <Text className="font-inter text-xs text-neutral-500">{item.assignmentTargetName}</Text>
                            ) : null}
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {(item.annualEntitlementOverride != null || item.carryForwardDaysOverride != null) && (
                    <View style={styles.cardMeta}>
                        {item.annualEntitlementOverride != null && (
                            <View style={styles.overrideBadge}><Text className="font-inter text-[10px] text-neutral-600">Entitlement: {item.annualEntitlementOverride}d</Text></View>
                        )}
                        {item.carryForwardDaysOverride != null && (
                            <View style={styles.overrideBadge}><Text className="font-inter text-[10px] text-neutral-600">CF: {item.carryForwardDaysOverride}d</Text></View>
                        )}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function LeavePolicyScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useLeavePolicies();
    const createMutation = useCreateLeavePolicy();
    const updateMutation = useUpdateLeavePolicy();
    const deleteMutation = useDeleteLeavePolicy();

    const { data: ltResponse } = useLeaveTypes();
    const { data: deptResponse } = useDepartments();
    const { data: desigResponse } = useDesignations();
    const { data: gradeResponse } = useGrades();
    const { data: empTypeResponse } = useEmployeeTypes();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<LeavePolicyItem | null>(null);
    const [search, setSearch] = React.useState('');

    const mapOptions = (resp: any) => {
        const raw = (resp as any)?.data ?? resp ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    };

    const leaveTypeOptions = React.useMemo(() => mapOptions(ltResponse), [ltResponse]);
    const departmentOptions = React.useMemo(() => mapOptions(deptResponse), [deptResponse]);
    const designationOptions = React.useMemo(() => mapOptions(desigResponse), [desigResponse]);
    const gradeOptions = React.useMemo(() => mapOptions(gradeResponse), [gradeResponse]);
    const employeeTypeOptions = React.useMemo(() => mapOptions(empTypeResponse), [empTypeResponse]);

    const policies: LeavePolicyItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            leaveTypeId: item.leaveTypeId ?? '',
            leaveTypeName: item.leaveTypeName ?? leaveTypeOptions.find((o: any) => o.id === item.leaveTypeId)?.label ?? '',
            assignmentLevel: item.assignmentLevel ?? 'Company',
            assignmentTargetId: item.assignmentTargetId ?? '',
            assignmentTargetName: item.assignmentTargetName ?? '',
            annualEntitlementOverride: item.annualEntitlementOverride ?? null,
            carryForwardDaysOverride: item.carryForwardDaysOverride ?? null,
        }));
    }, [response, leaveTypeOptions]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return policies;
        const q = search.toLowerCase();
        return policies.filter(p => p.leaveTypeName.toLowerCase().includes(q) || p.assignmentLevel.toLowerCase().includes(q) || p.assignmentTargetName.toLowerCase().includes(q));
    }, [policies, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: LeavePolicyItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: LeavePolicyItem) => {
        showConfirm({
            title: 'Delete Policy',
            message: `Are you sure you want to delete this policy for "${item.leaveTypeName}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<LeavePolicyItem, 'id' | 'leaveTypeName' | 'assignmentTargetName'>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: data as unknown as Record<string, unknown> }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(data as unknown as Record<string, unknown>, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: LeavePolicyItem; index: number }) => (
        <PolicyCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">Leave Policies</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">{policies.length} polic{policies.length !== 1 ? 'ies' : 'y'}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search policies..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load policies" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No policies match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No policies yet" message="Add your first leave policy to override defaults." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Leave Policy Management" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <LeavePolicyFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending}
                leaveTypeOptions={leaveTypeOptions} departmentOptions={departmentOptions} designationOptions={designationOptions} gradeOptions={gradeOptions} employeeTypeOptions={employeeTypeOptions}
            />
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
    levelBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    overrideBadge: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
