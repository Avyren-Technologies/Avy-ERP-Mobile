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
    useCreateDepartment,
    useDeleteDepartment,
    useUpdateDepartment,
} from '@/features/company-admin/api/use-hr-mutations';
import { useCostCentres, useDepartments, useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useIsDark } from '@/hooks/use-is-dark';

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

interface DepartmentItem {
    id: string;
    name: string;
    code: string;
    parentDepartment: string;
    parentId: string;
    headEmployee: string;
    headEmployeeId: string;
    costCentreCode: string;
    status: 'Active' | 'Inactive';
    employeeCount: number;
}

// ============ STATUS BADGE ============

function StatusBadge({ status }: { readonly status: string }) {
    const isActive = status === 'Active';
    return (
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success[50] : colors.neutral[100] }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success[500] : colors.neutral[400] }]} />
            <Text className={`font-inter text-[10px] font-bold ${isActive ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {status}
            </Text>
        </View>
    );
}

// ============ DROPDOWN ============

function Dropdown({
    label,
    value,
    options,
    onSelect,
    placeholder,
    required,
}: {
    readonly label: string;
    readonly value: string;
    readonly options: { readonly id: string; readonly label: string }[];
    readonly onSelect: (id: string) => void;
    readonly placeholder?: string;
    readonly required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    const filtered = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable
                onPress={() => { setOpen(true); setSearchText(''); }}
                style={styles.dropdownBtn}
            >
                <Text
                    className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '60%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        {options.length > 5 && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Search..."
                                    placeholderTextColor={colors.neutral[400]}
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    autoFocus
                                />
                            </View>
                        )}
                        <Pressable
                            onPress={() => { onSelect(''); setOpen(false); }}
                            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}
                        >
                            <Text className="font-inter text-sm text-neutral-400">None</Text>
                        </Pressable>
                        <FlatList
                            data={filtered}
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: opt }) => (
                                <Pressable
                                    onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.neutral[100],
                                        backgroundColor: opt.id === value ? colors.primary[50] : undefined,
                                        paddingHorizontal: 4,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text className="font-inter text-sm text-neutral-400">No results found</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ CHIP SELECTOR ============

function ChipSelector({
    label,
    options,
    value,
    onSelect,
}: {
    readonly label: string;
    readonly options: string[];
    readonly value: string;
    readonly onSelect: (v: string) => void;
}) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">{label}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {options.map(opt => {
                    const selected = opt === value;
                    return (
                        <Pressable
                            key={opt}
                            onPress={() => onSelect(opt)}
                            style={[styles.chip, selected && styles.chipActive]}
                        >
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                {opt}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ SEARCHABLE EMPLOYEE PICKER ============

function SearchableEmployeePicker({
    label,
    value,
    displayValue,
    onSelect,
    employees,
}: {
    readonly label: string;
    readonly value: string;
    readonly displayValue: string;
    readonly onSelect: (id: string, name: string) => void;
    readonly employees: { readonly id: string; readonly name: string; readonly code: string }[];
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    const filtered = React.useMemo(() => {
        if (!searchText.trim()) return employees;
        const q = searchText.toLowerCase();
        return employees.filter(e =>
            e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q),
        );
    }, [employees, searchText]);

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">{label}</Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text
                    className={`font-inter text-sm ${displayValue ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {displayValue || 'Search employee...'}
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
                            onPress={() => { onSelect('', ''); setOpen(false); }}
                            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}
                        >
                            <Text className="font-inter text-sm text-neutral-400">None</Text>
                        </Pressable>
                        <FlashList
                            data={filtered}
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: emp }) => (
                                <Pressable
                                    onPress={() => { onSelect(emp.id, emp.name); setOpen(false); }}
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.neutral[100],
                                        backgroundColor: emp.id === value ? colors.primary[50] : undefined,
                                        paddingHorizontal: 4,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text className={`font-inter text-sm ${emp.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                        {emp.name}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-400">{emp.code}</Text>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text className="font-inter text-sm text-neutral-400">No employees found</Text>
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

function DepartmentFormModal({
    visible,
    onClose,
    onSave,
    initialData,
    isSaving,
    departments,
    employeeList,
    costCentreOptions,
}: {
    readonly visible: boolean;
    readonly onClose: () => void;
    readonly onSave: (data: Omit<DepartmentItem, 'id' | 'employeeCount'>) => void;
    readonly initialData?: DepartmentItem | null;
    readonly isSaving: boolean;
    readonly departments: DepartmentItem[];
    readonly employeeList: { readonly id: string; readonly name: string; readonly code: string }[];
    readonly costCentreOptions: { readonly id: string; readonly label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [codeManuallyEdited, setCodeManuallyEdited] = React.useState(false);
    const [parentId, setParentId] = React.useState('');
    const [headEmployeeId, setHeadEmployeeId] = React.useState('');
    const [headEmployeeDisplay, setHeadEmployeeDisplay] = React.useState('');
    const [costCentreCode, setCostCentreCode] = React.useState('');
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
                setParentId(initialData.parentId);
                setHeadEmployeeId(initialData.headEmployeeId);
                setHeadEmployeeDisplay(initialData.headEmployee);
                setCostCentreCode(initialData.costCentreCode);
                setStatus(initialData.status);
            } else {
                setName('');
                setCode('');
                setCodeManuallyEdited(false);
                setParentId('');
                setHeadEmployeeId('');
                setHeadEmployeeDisplay('');
                setCostCentreCode('');
                setStatus('Active');
            }
        }
    }, [visible, initialData]);

    const parentOptions = React.useMemo(() =>
        departments
            .filter(d => d.id !== initialData?.id)
            .map(d => ({ id: d.id, label: `${d.name} (${d.code})` })),
        [departments, initialData],
    );

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Department Name is required';
        if (!code.trim()) newErrors.code = 'Department Code is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const parentDept = departments.find(d => d.id === parentId);
        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            parentId,
            parentDepartment: parentDept?.name ?? '',
            headEmployeeId,
            headEmployee: headEmployeeDisplay.trim(),
            costCentreCode: costCentreCode.trim(),
            status,
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
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white]}
                    style={StyleSheet.absoluteFill}
                />
                
                {/* Full Page Header */}
                <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                            {initialData ? 'Edit Department' : 'New Department'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            Configure administrative unit details
                        </Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        keyboardShouldPersistTaps="handled" 
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}
                    >
                        {/* Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                                Department Name <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder='e.g. "ENGINEERING"'
                                    placeholderTextColor={colors.neutral[400]}
                                    value={name}
                                    onChangeText={(val) => {
                                        setName(val);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                        if (!codeManuallyEdited) {
                                            setCode(generateCode(val));
                                        }
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                            {!!errors.name && (
                                <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>
                            )}
                        </View>

                        {/* Code */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                                Department Code <Text className="text-danger-500">*</Text>
                            </Text>
                            <View style={[styles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder='e.g. "ENG-01"'
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
                            {!!errors.code && (
                                <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>
                            )}
                        </View>

                        {/* Parent Department */}
                        <Dropdown
                            label="Parent Department"
                            value={parentId}
                            options={parentOptions}
                            onSelect={setParentId}
                            placeholder="Select parent department..."
                        />
                        
                        <SearchableEmployeePicker
                            label="Department Head"
                            value={headEmployeeId}
                            displayValue={headEmployeeDisplay}
                            onSelect={(id, name) => {
                                setHeadEmployeeId(id);
                                setHeadEmployeeDisplay(name);
                            }}
                            employees={employeeList}
                        />

                        {/* Cost Centre */}
                        <Dropdown
                            label="Cost Centre"
                            value={costCentreCode}
                            options={costCentreOptions}
                            onSelect={setCostCentreCode}
                            placeholder="Select cost centre..."
                        />

                        {/* Status */}
                        <ChipSelector
                            label="Operational Status"
                            options={['Active', 'Inactive']}
                            value={status}
                            onSelect={v => setStatus(v as 'Active' | 'Inactive')}
                        />

                        <View style={{ height: 24 }} />

                        {/* Footer Actions */}
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

// ============ DEPARTMENT CARD ============

function DepartmentCard({
    item,
    index,
    onEdit,
    onDelete,
}: {
    readonly item: DepartmentItem;
    readonly index: number;
    readonly onEdit: () => void;
    readonly onDelete: () => void;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.codeBadge}>
                                <Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text>
                            </View>
                        </View>
                        {item.headEmployee ? (
                            <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                Head: {item.headEmployee}
                            </Text>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={item.status} />
                        <Pressable onPress={onDelete} hitSlop={8}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.cardMeta}>
                    {item.parentDepartment ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Parent: {item.parentDepartment}</Text>
                        </View>
                    ) : null}
                    {item.costCentreCode ? (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">CC: {item.costCentreCode}</Text>
                        </View>
                    ) : null}
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                            {item.employeeCount} employee{item.employeeCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function DepartmentScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useDepartments();
    const { data: empResponse } = useEmployees();
    const { data: costCentresResponse } = useCostCentres();
    const createMutation = useCreateDepartment();
    const updateMutation = useUpdateDepartment();
    const deleteMutation = useDeleteDepartment();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<DepartmentItem | null>(null);
    const [search, setSearch] = React.useState('');
    const [showToast, setShowToast] = React.useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

    const triggerToast = (message: string) => {
        setShowToast({ visible: true, message });
        setTimeout(() => setShowToast({ visible: false, message: '' }), 3000);
    };

    const employeeList = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? empResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((e: any) => ({
            id: e.id ?? '',
            name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.name || '',
            code: e.employeeId ?? e.code ?? '',
        }));
    }, [empResponse]);

    const costCentreOptions = React.useMemo(() => {
        const raw = (costCentresResponse as any)?.data ?? costCentresResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((c: any) => ({
            id: c.code ?? c.id ?? '',
            label: `${c.code ?? ''} - ${c.name ?? ''}`,
        }));
    }, [costCentresResponse]);

    const departments: DepartmentItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '',
            name: item.name ?? '',
            code: item.code ?? '',
            parentId: item.parentId ?? '',
            parentDepartment: item.parent?.name ?? '',
            headEmployeeId: item.headEmployeeId ?? '',
            headEmployee: item.headEmployee?.name ?? item.headEmployeeName ?? '',
            costCentreCode: item.costCentreCode ?? '',
            status: item.status ?? 'Active',
            employeeCount: item._count?.employees ?? item.employeeCount ?? 0,
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return departments;
        const q = search.toLowerCase();
        return departments.filter(d =>
            d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
        );
    }, [departments, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: DepartmentItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: DepartmentItem) => {
        if (item.employeeCount > 0) {
            showConfirm({
                title: 'Cannot Delete',
                message: `"${item.name}" has ${item.employeeCount} employee(s) assigned. Please reassign them before deleting.`,
                confirmText: 'OK',
                variant: 'warning',
                onConfirm: () => {},
            });
            return;
        }
        showConfirm({
            title: 'Delete Department',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<DepartmentItem, 'id' | 'employeeCount'>) => {
        const sanitizedData = {
            ...data,
            parentId: data.parentId || undefined,
            headEmployeeId: data.headEmployeeId || undefined,
            costCentreCode: data.costCentreCode || undefined,
        };

        if (editingItem) {
            updateMutation.mutate(
                { id: editingItem.id, data: sanitizedData as unknown as Record<string, unknown> },
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Department updated successfully');
                    }
                },
            );
        } else {
            createMutation.mutate(
                sanitizedData as unknown as Record<string, unknown>,
                { 
                    onSuccess: () => {
                        setFormVisible(false);
                        triggerToast('Department created successfully');
                    }
                },
            );
        }
    };

    const renderItem = ({ item, index }: { readonly item: DepartmentItem; readonly index: number }) => (
        <DepartmentCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Departments</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
                {departments.length} department{departments.length !== 1 ? 's' : ''}
            </Text>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load departments" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No departments match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No departments yet" message="Add your first department to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader title="Department Management" onMenuPress={toggle} />

            <FlashList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
                }
            />

            <FAB onPress={handleAdd} />

            <DepartmentFormModal
                visible={formVisible}
                onClose={() => setFormVisible(false)}
                onSave={handleSave}
                initialData={editingItem}
                isSaving={createMutation.isPending || updateMutation.isPending}
                departments={departments}
                employeeList={employeeList}
                costCentreOptions={costCentreOptions}
            />

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
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: {
        flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    toast: {
        position: 'absolute', left: 20, right: 20, backgroundColor: colors.success[50], borderRadius: 12,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
        zIndex: 9999,
    },
});
const styles = createStyles(false);
