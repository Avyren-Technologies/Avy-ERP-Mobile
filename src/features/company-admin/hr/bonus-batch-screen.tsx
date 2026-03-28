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
import { useDepartments, useDesignations, useEmployees } from '@/features/company-admin/api/use-hr-queries';

// ============ TYPES ============

type BonusType = 'PERFORMANCE' | 'FESTIVE' | 'SPOT' | 'REFERRAL' | 'RETENTION' | 'STATUTORY';
type SelectionMode = 'department' | 'designation' | 'employee';

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

// ============ SEARCHABLE SELECT MODAL (Mobile) ============

function SearchableSelectModal({
    visible,
    onClose,
    options,
    onSelect,
    title,
    multiple,
    selectedValues,
}: {
    visible: boolean;
    onClose: () => void;
    options: { value: string; label: string; sublabel?: string }[];
    onSelect: (value: string) => void;
    title: string;
    multiple?: boolean;
    selectedValues?: string[];
}) {
    const insets = useSafeAreaInsets();
    const [searchText, setSearchText] = React.useState('');

    React.useEffect(() => { if (visible) setSearchText(''); }, [visible]);

    const filtered = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q));
    }, [options, searchText]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-3">{title}</Text>
                    <View style={[styles.inputWrapStyle, { marginBottom: 12 }]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Search..."
                            placeholderTextColor={colors.neutral[400]}
                            value={searchText}
                            onChangeText={setSearchText}
                            autoFocus
                        />
                    </View>
                    <FlatList
                        data={filtered}
                        keyExtractor={item => item.value}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 300 }}
                        renderItem={({ item }) => {
                            const isSelected = multiple ? selectedValues?.includes(item.value) : false;
                            return (
                                <Pressable
                                    onPress={() => onSelect(item.value)}
                                    style={[styles.selectOption, isSelected && { backgroundColor: colors.primary[50] }]}
                                >
                                    {multiple && (
                                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                            {isSelected && <Text className="font-inter text-[10px] font-bold text-white">{'✓'}</Text>}
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text className={`font-inter text-sm ${isSelected ? 'font-bold text-primary-700' : 'text-primary-950'}`}>{item.label}</Text>
                                        {item.sublabel && <Text className="font-inter text-[10px] text-neutral-500">{item.sublabel}</Text>}
                                    </View>
                                </Pressable>
                            );
                        }}
                        ListEmptyComponent={<Text className="font-inter text-sm text-neutral-500 text-center py-4">No results found</Text>}
                    />
                    {multiple && (
                        <Pressable onPress={onClose} style={[styles.saveBtn, { marginTop: 12 }]}>
                            <Text className="font-inter text-sm font-bold text-white">Done ({selectedValues?.length ?? 0} selected)</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
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
    const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('employee');
    const [selectedDepartmentId, setSelectedDepartmentId] = React.useState('');
    const [selectedDesignationId, setSelectedDesignationId] = React.useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([]);
    const [sameAmountForAll, setSameAmountForAll] = React.useState(true);
    const [bulkAmount, setBulkAmount] = React.useState('');
    const [individualAmounts, setIndividualAmounts] = React.useState<Record<string, string>>({});
    const [individualRemarks, setIndividualRemarks] = React.useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = React.useState(false);

    // Picker modals
    const [deptPickerVisible, setDeptPickerVisible] = React.useState(false);
    const [desigPickerVisible, setDesigPickerVisible] = React.useState(false);
    const [empPickerVisible, setEmpPickerVisible] = React.useState(false);

    // HR data
    const { data: deptData } = useDepartments();
    const { data: desigData } = useDesignations();
    const deptFilterParams = React.useMemo(() => (selectedDepartmentId ? { departmentId: selectedDepartmentId } : undefined), [selectedDepartmentId]);
    const desigFilterParams = React.useMemo(() => (selectedDesignationId ? { designationId: selectedDesignationId } as any : undefined), [selectedDesignationId]);
    const { data: empByDept } = useEmployees(selectionMode === 'department' && selectedDepartmentId ? deptFilterParams : undefined);
    const { data: empByDesig } = useEmployees(selectionMode === 'designation' && selectedDesignationId ? desigFilterParams : undefined);
    const { data: allEmpData } = useEmployees();

    const departments: any[] = React.useMemo(() => { const raw = (deptData as any)?.data ?? deptData; return Array.isArray(raw) ? raw : []; }, [deptData]);
    const designations: any[] = React.useMemo(() => { const raw = (desigData as any)?.data ?? desigData; return Array.isArray(raw) ? raw : []; }, [desigData]);
    const allEmployees: any[] = React.useMemo(() => { const raw = (allEmpData as any)?.data ?? allEmpData; return Array.isArray(raw) ? raw : []; }, [allEmpData]);
    const deptEmployees: any[] = React.useMemo(() => { const raw = (empByDept as any)?.data ?? empByDept; return Array.isArray(raw) ? raw : []; }, [empByDept]);
    const desigEmployees: any[] = React.useMemo(() => { const raw = (empByDesig as any)?.data ?? empByDesig; return Array.isArray(raw) ? raw : []; }, [empByDesig]);

    React.useEffect(() => {
        if (visible) {
            setName('');
            setType('PERFORMANCE');
            setSelectionMode('employee');
            setSelectedDepartmentId('');
            setSelectedDesignationId('');
            setSelectedEmployeeIds([]);
            setSameAmountForAll(true);
            setBulkAmount('');
            setIndividualAmounts({});
            setIndividualRemarks({});
            setShowPreview(false);
        }
    }, [visible]);

    const departmentOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));
    const designationOptions = designations.map((d: any) => ({ value: d.id, label: d.name }));
    const employeeOptions = allEmployees.map((e: any) => ({
        value: e.id,
        label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id,
        sublabel: e.employeeId ?? e.id,
    }));

    const getEmpName = (id: string) => {
        const e = allEmployees.find((emp: any) => emp.id === id);
        return e ? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeId || id : id;
    };

    const previewItems: BonusLineItem[] = React.useMemo(() => {
        if (selectionMode === 'department') {
            if (!selectedDepartmentId) return [];
            return deptEmployees.map((e: any) => ({
                employeeId: e.id,
                employeeName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeId || e.id,
                amount: Number(bulkAmount) || 0,
                remarks: individualRemarks[e.id] ?? '',
            }));
        }
        if (selectionMode === 'designation') {
            if (!selectedDesignationId) return [];
            return desigEmployees.map((e: any) => ({
                employeeId: e.id,
                employeeName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeId || e.id,
                amount: Number(bulkAmount) || 0,
                remarks: individualRemarks[e.id] ?? '',
            }));
        }
        return selectedEmployeeIds.map((id) => ({
            employeeId: id,
            employeeName: getEmpName(id),
            amount: sameAmountForAll ? (Number(bulkAmount) || 0) : (Number(individualAmounts[id]) || 0),
            remarks: individualRemarks[id] ?? '',
        }));
    }, [selectionMode, selectedDepartmentId, selectedDesignationId, selectedEmployeeIds, deptEmployees, desigEmployees, allEmployees, bulkAmount, sameAmountForAll, individualAmounts, individualRemarks]);

    const totalAmount = previewItems.reduce((sum, i) => sum + i.amount, 0);

    const resolvedEmployeeCount =
        selectionMode === 'department' ? deptEmployees.length :
        selectionMode === 'designation' ? desigEmployees.length :
        selectedEmployeeIds.length;

    const canSubmit = name.trim() && type && previewItems.some(i => i.amount > 0);

    const handleEmpSelect = (value: string) => {
        setSelectedEmployeeIds(prev => {
            const idx = prev.indexOf(value);
            if (idx >= 0) return prev.filter(v => v !== value);
            return [...prev, value];
        });
    };

    const selectedDeptName = departments.find((d: any) => d.id === selectedDepartmentId)?.name ?? '';
    const selectedDesigName = designations.find((d: any) => d.id === selectedDesignationId)?.name ?? '';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">Create Bonus Batch</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Batch Name */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Batch Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="e.g. Q1 Performance Bonus" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Bonus Type" options={BONUS_TYPES} value={type} onSelect={setType} />

                        {/* Selection Mode Tabs */}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Selection Mode</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {(['department', 'designation', 'employee'] as SelectionMode[]).map(mode => {
                                    const labels: Record<SelectionMode, string> = { department: 'By Dept', designation: 'By Desig', employee: 'By Employee' };
                                    const selected = selectionMode === mode;
                                    return (
                                        <Pressable key={mode} onPress={() => {
                                            setSelectionMode(mode);
                                            setSelectedDepartmentId('');
                                            setSelectedDesignationId('');
                                            setSelectedEmployeeIds([]);
                                            setBulkAmount('');
                                            setIndividualAmounts({});
                                            setIndividualRemarks({});
                                            setShowPreview(false);
                                        }} style={[styles.chip, selected && styles.chipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600'}`}>{labels[mode]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* By Department */}
                        {selectionMode === 'department' && (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Department <Text className="text-danger-500">*</Text></Text>
                                    <Pressable onPress={() => setDeptPickerVisible(true)} style={styles.inputWrapStyle}>
                                        <Text className={`font-inter text-sm ${selectedDepartmentId ? 'text-primary-950' : 'text-neutral-400'}`}>
                                            {selectedDeptName || 'Select department...'}
                                        </Text>
                                    </Pressable>
                                </View>
                                {selectedDepartmentId ? (
                                    <View style={[styles.infoBanner, { marginBottom: 14 }]}>
                                        <Text className="font-inter text-sm font-bold text-primary-700">{deptEmployees.length} employees found</Text>
                                    </View>
                                ) : null}
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Bonus Amount (for all)</Text>
                                    <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="Enter amount" placeholderTextColor={colors.neutral[400]} value={bulkAmount} onChangeText={setBulkAmount} keyboardType="numeric" /></View>
                                </View>
                            </>
                        )}

                        {/* By Designation */}
                        {selectionMode === 'designation' && (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Designation <Text className="text-danger-500">*</Text></Text>
                                    <Pressable onPress={() => setDesigPickerVisible(true)} style={styles.inputWrapStyle}>
                                        <Text className={`font-inter text-sm ${selectedDesignationId ? 'text-primary-950' : 'text-neutral-400'}`}>
                                            {selectedDesigName || 'Select designation...'}
                                        </Text>
                                    </Pressable>
                                </View>
                                {selectedDesignationId ? (
                                    <View style={[styles.infoBanner, { marginBottom: 14 }]}>
                                        <Text className="font-inter text-sm font-bold text-primary-700">{desigEmployees.length} employees found</Text>
                                    </View>
                                ) : null}
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Bonus Amount (for all)</Text>
                                    <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="Enter amount" placeholderTextColor={colors.neutral[400]} value={bulkAmount} onChangeText={setBulkAmount} keyboardType="numeric" /></View>
                                </View>
                            </>
                        )}

                        {/* By Employee */}
                        {selectionMode === 'employee' && (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Employees <Text className="text-danger-500">*</Text></Text>
                                    <Pressable onPress={() => setEmpPickerVisible(true)} style={styles.inputWrapStyle}>
                                        <Text className={`font-inter text-sm ${selectedEmployeeIds.length > 0 ? 'text-primary-950' : 'text-neutral-400'}`}>
                                            {selectedEmployeeIds.length > 0 ? `${selectedEmployeeIds.length} selected` : 'Select employees...'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Selected chips */}
                                {selectedEmployeeIds.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                                        {selectedEmployeeIds.map(id => (
                                            <Pressable key={id} onPress={() => setSelectedEmployeeIds(p => p.filter(v => v !== id))} style={styles.selectedChip}>
                                                <Text className="font-inter text-[10px] font-bold text-primary-700">{getEmpName(id)}</Text>
                                                <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" /></Svg>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                {selectedEmployeeIds.length > 0 && (
                                    <>
                                        {/* Same vs Individual toggle */}
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                                            <Pressable onPress={() => setSameAmountForAll(true)} style={[styles.chip, sameAmountForAll && styles.chipActive]}>
                                                <Text className={`font-inter text-[10px] font-bold ${sameAmountForAll ? 'text-white' : 'text-neutral-600'}`}>Same for All</Text>
                                            </Pressable>
                                            <Pressable onPress={() => setSameAmountForAll(false)} style={[styles.chip, !sameAmountForAll && styles.chipActive]}>
                                                <Text className={`font-inter text-[10px] font-bold ${!sameAmountForAll ? 'text-white' : 'text-neutral-600'}`}>Individual</Text>
                                            </Pressable>
                                        </View>

                                        {sameAmountForAll ? (
                                            <View style={styles.fieldWrap}>
                                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Bonus Amount (for all)</Text>
                                                <View style={styles.inputWrapStyle}><TextInput style={styles.textInput} placeholder="Enter amount" placeholderTextColor={colors.neutral[400]} value={bulkAmount} onChangeText={setBulkAmount} keyboardType="numeric" /></View>
                                            </View>
                                        ) : (
                                            <>
                                                {selectedEmployeeIds.map(id => (
                                                    <View key={id} style={styles.itemFormCard}>
                                                        <Text className="font-inter text-xs font-bold text-primary-950 mb-2">{getEmpName(id)}</Text>
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            <View style={[styles.inputWrapStyle, { flex: 1 }]}>
                                                                <TextInput style={styles.textInput} placeholder="Amount" placeholderTextColor={colors.neutral[400]} value={individualAmounts[id] ?? ''} onChangeText={v => setIndividualAmounts(p => ({ ...p, [id]: v }))} keyboardType="numeric" />
                                                            </View>
                                                            <View style={[styles.inputWrapStyle, { flex: 1 }]}>
                                                                <TextInput style={styles.textInput} placeholder="Remarks" placeholderTextColor={colors.neutral[400]} value={individualRemarks[id] ?? ''} onChangeText={v => setIndividualRemarks(p => ({ ...p, [id]: v }))} />
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Preview */}
                        {resolvedEmployeeCount > 0 && (
                            <View style={{ borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 12, marginTop: 4 }}>
                                <Pressable onPress={() => setShowPreview(!showPreview)}>
                                    <Text className="font-inter text-xs font-bold text-primary-600 mb-2">{showPreview ? 'Hide Preview' : 'Show Preview'}</Text>
                                </Pressable>
                                {showPreview && (
                                    <>
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                            <View style={[styles.infoBanner, { flex: 1 }]}>
                                                <Text className="font-inter text-[10px] text-neutral-500 uppercase">Employees</Text>
                                                <Text className="font-inter text-base font-bold text-primary-700">{previewItems.length}</Text>
                                            </View>
                                            <View style={[styles.infoBanner, { flex: 1, backgroundColor: colors.success[50] }]}>
                                                <Text className="font-inter text-[10px] text-neutral-500 uppercase">Total</Text>
                                                <Text className="font-inter text-base font-bold text-success-700">{'\u20B9'}{totalAmount.toLocaleString('en-IN')}</Text>
                                            </View>
                                        </View>
                                        {previewItems.slice(0, 10).map(item => (
                                            <View key={item.employeeId} style={styles.itemRow}>
                                                <Text className="font-inter text-xs font-semibold text-primary-950" style={{ flex: 1 }}>{item.employeeName}</Text>
                                                <Text className="font-inter text-xs font-bold text-primary-700">{'\u20B9'}{item.amount.toLocaleString('en-IN')}</Text>
                                            </View>
                                        ))}
                                        {previewItems.length > 10 && (
                                            <Text className="font-inter text-[10px] text-neutral-500 text-center py-2">...and {previewItems.length - 10} more</Text>
                                        )}
                                    </>
                                )}
                            </View>
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={() => onSave({ name, type, items: previewItems.filter(i => i.employeeId && i.amount > 0) })} disabled={!canSubmit || isSaving} style={[styles.saveBtn, (!canSubmit || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : `Create (${previewItems.length})`}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Picker Modals */}
            <SearchableSelectModal
                visible={deptPickerVisible}
                onClose={() => setDeptPickerVisible(false)}
                options={departmentOptions}
                onSelect={(v) => { setSelectedDepartmentId(v); setDeptPickerVisible(false); }}
                title="Select Department"
            />
            <SearchableSelectModal
                visible={desigPickerVisible}
                onClose={() => setDesigPickerVisible(false)}
                options={designationOptions}
                onSelect={(v) => { setSelectedDesignationId(v); setDesigPickerVisible(false); }}
                title="Select Designation"
            />
            <SearchableSelectModal
                visible={empPickerVisible}
                onClose={() => setEmpPickerVisible(false)}
                options={employeeOptions}
                onSelect={handleEmpSelect}
                title="Select Employees"
                multiple
                selectedValues={selectedEmployeeIds}
            />
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
    infoBanner: { backgroundColor: colors.primary[50], borderRadius: 12, padding: 10 },
    selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[50], borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.primary[200] },
    selectOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
