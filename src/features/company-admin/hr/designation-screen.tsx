/* eslint-disable better-tailwindcss/no-unknown-classes */
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
    useCreateDesignation,
    useDeleteDesignation,
    useUpdateDesignation,
} from '@/features/company-admin/api/use-hr-mutations';
import { useDepartments, useDesignations, useGrades } from '@/features/company-admin/api/use-hr-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface DesignationItem {
    id: string;
    name: string;
    code: string;
    departmentId: string;
    departmentName: string;
    gradeId: string;
    gradeName: string;
    jobLevel: string;
    isManagerial: boolean;
    reportsTo: string;
    probationDays: number;
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

const JOB_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

// ============ ATOMS ============

function StatusBadge({ status }: { readonly status: string }) {
    const isActive = status === 'Active';
    return (
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}>{status}</Text>
        </View>
    );
}

function Dropdown({
    label, value, options, onSelect, placeholder, required,
}: {
    readonly label: string; readonly value: string; readonly options: { readonly id: string; readonly label: string }[];
    readonly onSelect: (id: string) => void; readonly placeholder?: string; readonly required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        <Pressable onPress={() => { onSelect(''); setOpen(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                            <Text className="font-inter text-sm text-neutral-400">None</Text>
                        </Pressable>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {options.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: opt.id === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { readonly label: string; readonly options: string[]; readonly value: string; readonly onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">{label}</Text>
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

// ============ SEARCHABLE DESIGNATION PICKER ============

function SearchableDesignationPicker({
    label,
    value,
    onSelect,
    designations,
    excludeId,
}: {
    readonly label: string;
    readonly value: string;
    readonly onSelect: (designationName: string) => void;
    readonly designations: { readonly id: string; readonly name: string; readonly code: string }[];
    readonly excludeId?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    const available = React.useMemo(() => {
        let list = designations;
        if (excludeId) list = list.filter(d => d.id !== excludeId);
        if (!searchText.trim()) return list;
        const q = searchText.toLowerCase();
        return list.filter(d =>
            d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
        );
    }, [designations, searchText, excludeId]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">{label}</Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text
                    className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {value || 'Search designation...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Search by name or code..."
                                placeholderTextColor={colors.neutral[400]}
                                value={searchText}
                                onChangeText={setSearchText}
                                autoFocus
                            />
                        </View>
                        <Pressable
                            onPress={() => { onSelect(''); setOpen(false); }}
                            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}
                        >
                            <Text className="font-inter text-sm text-neutral-400">None</Text>
                        </Pressable>
                        <FlashList
                            data={available}
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: desig }) => (
                                <Pressable
                                    onPress={() => { onSelect(desig.name); setOpen(false); }}
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.neutral[100],
                                        backgroundColor: desig.name === value ? colors.primary[50] : undefined,
                                        paddingHorizontal: 4,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text className={`font-inter text-sm ${desig.name === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                        {desig.name}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-400">{desig.code}</Text>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text className="font-inter text-sm text-neutral-400">No designations found</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ FORM MODAL ============

function DesignationFormModal({
    visible, onClose, onSave, initialData, isSaving,
    departmentOptions, gradeOptions, allDesignations,
}: {
    readonly visible: boolean; readonly onClose: () => void;
    readonly onSave: (data: Omit<DesignationItem, 'id'>) => void;
    readonly initialData?: DesignationItem | null; readonly isSaving: boolean;
    readonly departmentOptions: { readonly id: string; readonly label: string }[];
    readonly gradeOptions: { readonly id: string; readonly label: string }[];
    readonly allDesignations: { readonly id: string; readonly name: string; readonly code: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(false);
    const [departmentId, setDepartmentId] = React.useState('');
    const [gradeId, setGradeId] = React.useState('');
    const [jobLevel, setJobLevel] = React.useState('L1');
    const [isManagerial, setIsManagerial] = React.useState(false);
    const [reportsTo, setReportsTo] = React.useState('');
    const [probationDays, setProbationDays] = React.useState('');
    const [status, setStatus] = React.useState<'Active' | 'Inactive'>('Active');

    // Validation state
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            setErrors({});
            if (initialData) {
                setName(initialData.name);
                setCode(initialData.code);
                setCodeManuallyEdited(true);
                setDepartmentId(initialData.departmentId);
                setGradeId(initialData.gradeId);
                setJobLevel(initialData.jobLevel || 'L1');
                setIsManagerial(initialData.isManagerial);
                setReportsTo(initialData.reportsTo);
                setProbationDays(initialData.probationDays ? String(initialData.probationDays) : '');
                setStatus(initialData.status);
            } else {
                setName(''); setCode(''); setCodeManuallyEdited(false);
                setDepartmentId(''); setGradeId('');
                setJobLevel('L1'); setIsManagerial(false); setReportsTo('');
                setProbationDays(''); setStatus('Active');
            }
        }
    }, [visible, initialData]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Designation Name is required';
        if (!code.trim()) newErrors.code = 'Designation Code is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        const payload: Record<string, unknown> = {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            departmentId: departmentId || undefined,
            gradeId: gradeId || undefined,
            jobLevel,
            managerialFlag: isManagerial,
            reportsTo: reportsTo.trim() || undefined,
            status,
        };

        const pDays = Number.parseInt(probationDays, 10);
        if (!Number.isNaN(pDays) && pDays > 0) {
            payload.probationDays = pDays;
        }

        onSave(payload as unknown as Omit<DesignationItem, 'id'>);
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
                
                {/* Full Page Header */}
                <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                            {initialData ? 'Edit Designation' : 'New Designation'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Define job role and hierarchy</Text>
                    </View>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        keyboardShouldPersistTaps="handled" 
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 120 }}
                    >
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Designation Name <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                                <TextInput 
                                    style={styles.textInput} 
                                    placeholder='e.g. "Senior Engineer"' 
                                    placeholderTextColor={colors.neutral[400]} 
                                    value={name} 
                                    onChangeText={(val) => { 
                                        setName(val); 
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                        if (!codeManuallyEdited) { setCode(generateCode(val)); } 
                                    }} 
                                    autoCapitalize="words" 
                                />
                            </View>
                            {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
                        </View>

                        {/* Code */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Designation Code <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                                <TextInput 
                                    style={styles.textInput} 
                                    placeholder='e.g. "SR-ENG"' 
                                    placeholderTextColor={colors.neutral[400]} 
                                    value={code} 
                                    onChangeText={(val) => { 
                                        setCode(val); 
                                        if (errors.code) setErrors(prev => ({ ...prev, code: '' }));
                                        setCodeManuallyEdited(true); 
                                    }} 
                                    autoCapitalize="characters" 
                                />
                            </View>
                            {!!errors.code && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>}
                        </View>

                        <Dropdown label="Department" value={departmentId} options={departmentOptions} onSelect={setDepartmentId} placeholder="Select department..." />
                        <Dropdown label="Grade" value={gradeId} options={gradeOptions} onSelect={setGradeId} placeholder="Select grade..." />
                        <ChipSelector label="Job Level" options={JOB_LEVELS} value={jobLevel} onSelect={setJobLevel} />

                        {/* Managerial Toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">Managerial Role</Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Has direct reports</Text>
                            </View>
                            <Switch value={isManagerial} onValueChange={setIsManagerial} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isManagerial ? colors.primary[600] : colors.neutral[300]} />
                        </View>

                        <SearchableDesignationPicker
                            label="Reports To"
                            value={reportsTo}
                            onSelect={setReportsTo}
                            designations={allDesignations}
                            excludeId={initialData?.id}
                        />

                        {/* Probation Days */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Probation Days</Text>
                            <View style={styles.inputWrap}>
                                <TextInput 
                                    style={styles.textInput} 
                                    placeholder="e.g. 90" 
                                    placeholderTextColor={colors.neutral[400]} 
                                    value={probationDays} 
                                    onChangeText={setProbationDays} 
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <ChipSelector label="Operational Status" options={['Active', 'Inactive']} value={status} onSelect={v => setStatus(v as 'Active' | 'Inactive')} />

                        <View style={{ height: 24 }} />

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <Pressable onPress={onClose} style={styles.cancelBtn}>
                                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
                            </Pressable>
                            <Pressable 
                                onPress={handleSave} 
                                disabled={isSaving} 
                                style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
                            >
                                <Text className="font-inter text-sm font-bold text-white">
                                    {isSaving ? 'Placing...' : initialData ? 'UPDATE' : 'CREATE'}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// ============ DESIGNATION CARD ============

function DesignationCard({ item, index, onEdit, onDelete }: { readonly item: DesignationItem; readonly index: number; readonly onEdit: () => void; readonly onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            {item.departmentName ? <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.departmentName}</Text> : null}
                            {item.departmentName && item.gradeName ? <Text className="font-inter text-xs text-neutral-300">|</Text> : null}
                            {item.gradeName ? <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.gradeName}</Text> : null}
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
                    <View style={[styles.metaChip, { backgroundColor: colors.accent[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">{item.jobLevel}</Text>
                    </View>
                    {item.isManagerial && (
                        <View style={[styles.metaChip, { backgroundColor: colors.warning[50] }]}>
                            <Text className="font-inter text-[10px] font-bold text-warning-700">Managerial</Text>
                        </View>
                    )}
                    {item.probationDays > 0 && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.probationDays}d probation</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function DesignationScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useDesignations();
    const { data: deptResponse } = useDepartments();
    const { data: gradeResponse } = useGrades();
    const createMutation = useCreateDesignation();
    const updateMutation = useUpdateDesignation();
    const deleteMutation = useDeleteDesignation();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<DesignationItem | null>(null);
    const [search, setSearch] = React.useState('');
    const [showToast, setShowToast] = React.useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

    const triggerToast = (message: string) => {
        setShowToast({ visible: true, message });
        setTimeout(() => setShowToast({ visible: false, message: '' }), 3000);
    };

    const designations: DesignationItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', code: item.code ?? '',
            departmentId: item.departmentId ?? '', departmentName: item.departmentName ?? '',
            gradeId: item.gradeId ?? '', gradeName: item.gradeName ?? '',
            jobLevel: item.jobLevel ?? 'L1', isManagerial: item.isManagerial ?? false,
            reportsTo: item.reportsTo ?? '', probationDays: item.probationDays ?? 0,
            status: item.status ?? 'Active',
        }));
    }, [response]);

    const departmentOptions = React.useMemo(() => {
        const raw = (deptResponse as any)?.data ?? deptResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((d: any) => ({ id: d.id ?? '', label: d.name ?? '' }));
    }, [deptResponse]);

    const gradeOptions = React.useMemo(() => {
        const raw = (gradeResponse as any)?.data ?? gradeResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((g: any) => ({ id: g.id ?? '', label: `${g.name ?? ''} (${g.code ?? ''})` }));
    }, [gradeResponse]);

    const allDesignationsList = React.useMemo(() =>
        designations.map(d => ({ id: d.id, name: d.name, code: d.code })),
        [designations],
    );

    const filtered = React.useMemo(() => {
        if (!search.trim()) return designations;
        const q = search.toLowerCase();
        return designations.filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
    }, [designations, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: DesignationItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: DesignationItem) => {
        showConfirm({
            title: 'Delete Designation', message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<DesignationItem, 'id'>) => {
        if (editingItem) {
            updateMutation.mutate(
                { id: editingItem.id, data: data as unknown as Record<string, unknown> },
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Designation updated successfully');
                    } 
                },
            );
        } else {
            createMutation.mutate(
                data as unknown as Record<string, unknown>,
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Designation created successfully');
                    } 
                },
            );
        }
    };

    const renderItem = ({ item, index }: { readonly item: DesignationItem; readonly index: number }) => (
        <DesignationCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Designations</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{designations.length} designation{designations.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load designations" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No designations match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No designations yet" message="Add your first designation to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Designation Management" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <DesignationFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending}
                departmentOptions={departmentOptions} gradeOptions={gradeOptions} allDesignations={allDesignationsList} />
            <ConfirmModal {...confirmModalProps} />

            {showToast.visible && (
                <Animated.View 
                    entering={FadeInDown.duration(300)} 
                    style={[styles.toast, { top: insets.top + 70 }]}
                >
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">{showToast.message}</Text>
                </Animated.View>
            )}
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
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
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    codeBadge: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 16 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 16 },
    cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    toast: {
        position: 'absolute', left: 20, right: 20, backgroundColor: colors.success[50], borderRadius: 12,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
        zIndex: 9999,
    },
});
const styles = createStyles(false);
