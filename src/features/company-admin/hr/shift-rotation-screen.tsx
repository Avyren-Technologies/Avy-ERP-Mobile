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

import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
    useAssignShiftSchedule,
    useCreateShiftSchedule,
    useDeleteShiftSchedule,
    useExecuteShiftRotation,
    useRemoveShiftSchedule,
    useUpdateShiftSchedule,
} from '@/features/company-admin/api/use-shift-rotation-mutations';
import { useShiftSchedules } from '@/features/company-admin/api/use-shift-rotation-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

// ============ TYPES ============

interface ShiftSchedule {
    id: string;
    name: string;
    pattern: string;
    shiftCount: number;
    employeeCount: number;
    effectiveFrom: string;
    effectiveTo: string;
    description: string;
    isActive: boolean;
    shifts: { shiftId: string; shiftName: string; weekNumber: number }[];
    assignedEmployees: { id: string; name: string }[];
}

interface CompanyShift {
    id: string;
    name: string;
    fromTime: string;
    toTime: string;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
}

const PATTERNS = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'];

const PATTERN_COLORS: Record<string, { bg: string; text: string }> = {
    WEEKLY: { bg: colors.primary[50], text: 'text-primary-700' },
    FORTNIGHTLY: { bg: colors.accent[50], text: 'text-accent-700' },
    MONTHLY: { bg: colors.warning[50], text: 'text-warning-700' },
};

// ============ BADGES ============

function PatternBadge({ pattern }: { pattern: string }) {
    const c = PATTERN_COLORS[pattern?.toUpperCase()] ?? PATTERN_COLORS.WEEKLY;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{pattern}</Text>
        </View>
    );
}

function ActiveBadge({ active }: { active: boolean }) {
    return (
        <View style={[styles.typeBadge, { backgroundColor: active ? colors.success[50] : colors.neutral[100] }]}>
            <Text className={`font-inter text-[10px] font-bold ${active ? 'text-success-700' : 'text-neutral-500'}`}>{active ? 'Active' : 'Inactive'}</Text>
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

// ============ SHIFT PICKER MODAL ============

function ShiftPickerModal({ visible, onClose, onSelect, availableShifts, searchText, setSearchText }: {
    visible: boolean; onClose: () => void; onSelect: (shift: CompanyShift) => void;
    availableShifts: CompanyShift[]; searchText: string; setSearchText: (v: string) => void;
}) {
    const insets = useSafeAreaInsets();
    const filtered = React.useMemo(() => {
        if (!searchText.trim()) return availableShifts;
        const q = searchText.toLowerCase();
        return availableShifts.filter(s => s.name.toLowerCase().includes(q));
    }, [availableShifts, searchText]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '70%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-3">Select Shift</Text>
                    <View style={[styles.inputWrap, { marginBottom: 12, height: 42 }]}>
                        <TextInput
                            style={[styles.textInput, { fontSize: 13 }]}
                            placeholder="Search shifts..."
                            placeholderTextColor={colors.neutral[400]}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <FlashList
                        data={filtered}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => { onSelect(item); onClose(); }}
                                style={({ pressed }) => [styles.pickerRow, pressed && { backgroundColor: colors.primary[50] }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950">{item.name}</Text>
                                    <Text className="font-inter text-xs text-neutral-500">{item.fromTime} — {item.toTime}</Text>
                                </View>
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </Pressable>
                        )}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <Text className="font-inter text-sm text-neutral-400">No shifts found.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
        </Modal>
    );
}

// ============ FORM MODAL ============

function ScheduleFormModal({
    visible, onClose, onSave, initialData, isSaving, availableShifts,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: ShiftSchedule | null; isSaving: boolean;
    availableShifts: CompanyShift[];
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = React.useState('');
    const [pattern, setPattern] = React.useState('WEEKLY');
    const [effectiveFrom, setEffectiveFrom] = React.useState('');
    const [effectiveTo, setEffectiveTo] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [isActive, setIsActive] = React.useState(true);
    const [shifts, setShifts] = React.useState<{ shiftId: string; shiftName: string; weekNumber: number }[]>([]);
    const [shiftPickerVisible, setShiftPickerVisible] = React.useState(false);
    const [shiftPickerIndex, setShiftPickerIndex] = React.useState(-1);
    const [shiftSearchText, setShiftSearchText] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name); setPattern(initialData.pattern);
                setEffectiveFrom(initialData.effectiveFrom ? initialData.effectiveFrom.substring(0, 10) : '');
                setEffectiveTo(initialData.effectiveTo ? initialData.effectiveTo.substring(0, 10) : '');
                setDescription(initialData.description ?? '');
                setIsActive(initialData.isActive);
                setShifts((initialData.shifts ?? []).map((s, i) => ({
                    shiftId: s.shiftId ?? '',
                    shiftName: s.shiftName ?? availableShifts.find(sh => sh.id === s.shiftId)?.name ?? '',
                    weekNumber: s.weekNumber ?? i + 1,
                })));
            } else {
                setName(''); setPattern('WEEKLY'); setEffectiveFrom(''); setEffectiveTo('');
                setDescription(''); setIsActive(true); setShifts([]);
            }
        }
    }, [visible, initialData]);

    const addShift = () => setShifts(p => [...p, { shiftId: '', shiftName: '', weekNumber: p.length + 1 }]);
    const removeShift = (i: number) => setShifts(p => p.filter((_, idx) => idx !== i));

    const openShiftPicker = (index: number) => {
        setShiftPickerIndex(index);
        setShiftSearchText('');
        setShiftPickerVisible(true);
    };

    const handleShiftSelected = (shift: CompanyShift) => {
        setShifts(p => p.map((s, idx) => idx === shiftPickerIndex ? { ...s, shiftId: shift.id, shiftName: shift.name } : s));
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(), rotationPattern: pattern, effectiveFrom, isActive,
            effectiveTo: effectiveTo || undefined,
            description: description || undefined,
            shifts: shifts.map((s, i) => ({ shiftId: s.shiftId, weekNumber: i + 1 })),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-4">
                        {initialData ? 'Edit Schedule' : 'Add Schedule'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. Weekly A-B-C" placeholderTextColor={colors.neutral[400]} value={name} onChangeText={setName} /></View>
                        </View>
                        <ChipSelector label="Pattern" options={PATTERNS} value={pattern} onSelect={setPattern} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective From</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveFrom} onChangeText={setEffectiveFrom} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Effective To</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD (optional)" placeholderTextColor={colors.neutral[400]} value={effectiveTo} onChangeText={setEffectiveTo} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Description</Text>
                            <View style={[styles.inputWrap, { height: 70 }]}>
                                <TextInput style={[styles.textInput, { textAlignVertical: 'top' }]} placeholder="Notes about this schedule..." placeholderTextColor={colors.neutral[400]} value={description} onChangeText={setDescription} multiline />
                            </View>
                        </View>
                        <View style={styles.toggleRow}>
                            <Text className="font-inter text-sm font-semibold text-primary-950">Active</Text>
                            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={isActive ? colors.primary[600] : colors.neutral[300]} />
                        </View>
                        {/* Shifts */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text className="font-inter text-xs font-bold text-primary-900">Shifts</Text>
                            <Pressable onPress={addShift}><Text className="font-inter text-xs font-bold text-primary-600">+ Add</Text></Pressable>
                        </View>
                        {shifts.map((s, i) => {
                            const shiftInfo = availableShifts.find(sh => sh.id === s.shiftId);
                            return (
                                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                    <Pressable
                                        onPress={() => openShiftPicker(i)}
                                        style={[styles.inputWrap, { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }]}
                                    >
                                        {s.shiftId ? (
                                            <View style={{ flex: 1 }}>
                                                <Text className="font-inter text-xs font-semibold text-primary-950" numberOfLines={1}>{s.shiftName || 'Unknown Shift'}</Text>
                                                {shiftInfo && <Text className="font-inter text-[10px] text-neutral-500">{shiftInfo.fromTime} — {shiftInfo.toTime}</Text>}
                                            </View>
                                        ) : (
                                            <Text className="font-inter text-xs text-neutral-400">Select shift...</Text>
                                        )}
                                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                    </Pressable>
                                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' }}>
                                        <Text className="font-inter text-xs font-bold text-neutral-600">#{i + 1}</Text>
                                    </View>
                                    <Pressable onPress={() => removeShift(i)} style={{ justifyContent: 'center' }}>
                                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" strokeLinecap="round" /></Svg>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!name.trim() || isSaving} style={[styles.saveBtn, (!name.trim() || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
            <ShiftPickerModal
                visible={shiftPickerVisible}
                onClose={() => setShiftPickerVisible(false)}
                onSelect={handleShiftSelected}
                availableShifts={availableShifts}
                searchText={shiftSearchText}
                setSearchText={setShiftSearchText}
            />
        </Modal>
    );
}

// ============ ASSIGN MODAL (Multi-select Employee Picker) ============

function AssignModal({ visible, onClose, onAssign, isAssigning, allEmployees }: {
    visible: boolean; onClose: () => void; onAssign: (ids: string[]) => void; isAssigning: boolean;
    allEmployees: Employee[];
}) {
    const insets = useSafeAreaInsets();
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [searchText, setSearchText] = React.useState('');

    React.useEffect(() => {
        if (visible) { setSelectedIds([]); setSearchText(''); }
    }, [visible]);

    const filtered = React.useMemo(() => {
        if (!searchText.trim()) return allEmployees;
        const q = searchText.toLowerCase();
        return allEmployees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            e.employeeId?.toLowerCase().includes(q)
        );
    }, [allEmployees, searchText]);

    const toggleEmployee = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 mb-2">Assign Employees</Text>
                    <Text className="font-inter text-sm text-neutral-500 mb-3">Select employees to assign to this schedule.</Text>
                    <View style={[styles.inputWrap, { marginBottom: 12, height: 42 }]}>
                        <TextInput
                            style={[styles.textInput, { fontSize: 13 }]}
                            placeholder="Search employees..."
                            placeholderTextColor={colors.neutral[400]}
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <FlashList
                        data={filtered}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <Pressable
                                    onPress={() => toggleEmployee(item.id)}
                                    style={[styles.pickerRow, isSelected && { backgroundColor: colors.primary[50] }]}
                                >
                                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                        {isSelected && (
                                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                                <Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">{item.firstName} {item.lastName}</Text>
                                        <Text className="font-inter text-xs text-neutral-500">{item.employeeId}</Text>
                                    </View>
                                </Pressable>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <Text className="font-inter text-sm text-neutral-400">No employees found.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 300 }}
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text></Pressable>
                        <Pressable
                            onPress={() => onAssign(selectedIds)}
                            disabled={selectedIds.length === 0 || isAssigning}
                            style={[styles.saveBtn, (selectedIds.length === 0 || isAssigning) && { opacity: 0.5 }]}
                        >
                            <Text className="font-inter text-sm font-bold text-white">{isAssigning ? 'Assigning...' : `Assign (${selectedIds.length})`}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ SCHEDULE CARD ============

function ScheduleCard({ item, index, onEdit, onDelete, onExecute, onDetail, isExecuting }: {
    item: ShiftSchedule; index: number; onEdit: () => void; onDelete: () => void;
    onExecute: () => void; onDetail: () => void; isExecuting: boolean;
}) {
    const fmt = useCompanyFormatter();
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onDetail} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.name}</Text>
                            <PatternBadge pattern={item.pattern} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <ActiveBadge active={item.isActive} />
                        </View>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Shifts: {item.shifts?.length ?? item.shiftCount ?? 0}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">Employees: {item.assignedEmployees?.length ?? item.employeeCount ?? 0}</Text>
                    </View>
                    {item.effectiveFrom && (
                        <View style={styles.metaChip}>
                            <Text className="font-inter text-[10px] text-neutral-500">From: {fmt.date(item.effectiveFrom)}</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable onPress={onExecute} disabled={isExecuting} style={[styles.actionBtn, { backgroundColor: colors.success[50] }]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 3l14 9-14 9V3z" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-[10px] font-bold text-success-700">{isExecuting ? 'Running...' : 'Execute'}</Text>
                    </Pressable>
                    <Pressable onPress={onEdit} style={[styles.actionBtn, { backgroundColor: colors.primary[50] }]}>
                        <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        <Text className="font-inter text-[10px] font-bold text-primary-700">Edit</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ShiftRotationScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [search, setSearch] = React.useState('');
    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<ShiftSchedule | null>(null);
    const [assignVisible, setAssignVisible] = React.useState(false);
    const [detailItem, setDetailItem] = React.useState<ShiftSchedule | null>(null);
    const [executingId, setExecutingId] = React.useState<string | null>(null);
    const [executeResult, setExecuteResult] = React.useState<{ name: string; count: number } | null>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useShiftSchedules();
    const createMutation = useCreateShiftSchedule();
    const updateMutation = useUpdateShiftSchedule();
    const deleteMutation = useDeleteShiftSchedule();
    const assignMutation = useAssignShiftSchedule();
    const removeMutation = useRemoveShiftSchedule();
    const executeMutation = useExecuteShiftRotation();

    // Fetch available shifts and employees for pickers
    const { data: shiftsResponse } = useCompanyShifts();
    const availableShifts: CompanyShift[] = React.useMemo(() => {
        const raw = (shiftsResponse as any)?.data ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((s: any) => ({ id: s.id, name: s.name, fromTime: s.fromTime ?? '', toTime: s.toTime ?? '' }));
    }, [shiftsResponse]);

    const { data: empResponse } = useEmployees();
    const allEmployees: Employee[] = React.useMemo(() => {
        const raw = (empResponse as any)?.data ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((e: any) => ({ id: e.id, firstName: e.firstName ?? '', lastName: e.lastName ?? '', employeeId: e.employeeId ?? '' }));
    }, [empResponse]);

    // Build lookup map for employee display in detail panel
    const employeeMap = React.useMemo(() => new Map(allEmployees.map(e => [e.id, `${e.firstName} ${e.lastName} (${e.employeeId})`])), [allEmployees]);

    const schedules: ShiftSchedule[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', name: item.name ?? '', pattern: item.pattern ?? 'WEEKLY',
            shiftCount: item.shiftCount ?? item.shifts?.length ?? 0,
            employeeCount: item.employeeCount ?? item.assignedEmployees?.length ?? 0,
            effectiveFrom: item.effectiveFrom ?? '',
            effectiveTo: item.effectiveTo ?? '',
            description: item.description ?? '',
            isActive: item.isActive ?? true,
            shifts: item.shifts ?? [],
            assignedEmployees: item.assignedEmployees ?? [],
        }));
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return schedules;
        const q = search.toLowerCase();
        return schedules.filter(s => s.name.toLowerCase().includes(q) || s.pattern.toLowerCase().includes(q));
    }, [schedules, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: ShiftSchedule) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: ShiftSchedule) => {
        showConfirm({
            title: 'Delete Schedule',
            message: `Are you sure you want to delete "${item.name}"?`,
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

    const handleExecute = (item: ShiftSchedule) => {
        setExecutingId(item.id);
        executeMutation.mutate(item.id, {
            onSuccess: (result: any) => {
                const count = result?.data?.rotatedCount ?? result?.rotatedCount ?? 0;
                setExecuteResult({ name: item.name, count });
                setExecutingId(null);
            },
            onError: () => setExecutingId(null),
        });
    };

    const handleAssign = (ids: string[]) => {
        if (!detailItem) return;
        assignMutation.mutate({ id: detailItem.id, data: { employeeIds: ids } }, { onSuccess: () => setAssignVisible(false) });
    };

    const handleRemoveEmployee = (employeeId: string) => {
        if (!detailItem) return;
        removeMutation.mutate({ id: detailItem.id, data: { employeeIds: [employeeId] } });
    };

    const renderItem = ({ item, index }: { item: ShiftSchedule; index: number }) => (
        <ScheduleCard
            item={item} index={index}
            onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
            onExecute={() => handleExecute(item)} onDetail={() => setDetailItem(item)}
            isExecuting={executingId === item.id}
        />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View>
                <Text className="font-inter text-2xl font-bold text-primary-950">Shift Rotations</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500">{schedules.length} schedule{schedules.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search schedules..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load schedules" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No schedules match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No schedules yet" message="Create a shift rotation schedule to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Shift Rotations" onMenuPress={toggle} />
            <FlashList
                data={filtered} renderItem={renderItem} keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <ScheduleFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} availableShifts={availableShifts} />
            <AssignModal visible={assignVisible} onClose={() => setAssignVisible(false)} onAssign={handleAssign} isAssigning={assignMutation.isPending} allEmployees={allEmployees} />

            {/* Detail Modal */}
            {detailItem && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDetailItem(null)} />
                        <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                            <View style={styles.sheetHandle} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text className="font-inter text-lg font-bold text-primary-950">{detailItem.name}</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}><PatternBadge pattern={detailItem.pattern} /><ActiveBadge active={detailItem.isActive} /></View>
                            </View>
                            <Text className="font-inter text-xs text-neutral-500 mb-4">Assigned Employees</Text>
                            <ScrollView style={{ maxHeight: 250 }}>
                                {(detailItem.assignedEmployees ?? []).length === 0 ? (
                                    <Text className="font-inter text-sm text-neutral-400">No employees assigned.</Text>
                                ) : (
                                    (detailItem.assignedEmployees ?? []).map(emp => (
                                        <View key={emp.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                            <Text className="font-inter text-sm font-medium text-primary-950">{emp.name ?? employeeMap.get(emp.id) ?? emp.id}</Text>
                                            <Pressable onPress={() => handleRemoveEmployee(emp.id)} hitSlop={8}>
                                                <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[400]} strokeWidth="2" strokeLinecap="round" /></Svg>
                                            </Pressable>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <Pressable onPress={() => setDetailItem(null)} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600">Close</Text></Pressable>
                                <Pressable onPress={() => setAssignVisible(true)} style={styles.saveBtn}><Text className="font-inter text-sm font-bold text-white">Assign</Text></Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Execute Result */}
            {executeResult && (
                <Modal visible transparent animationType="fade">
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                        <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 28, width: '80%', alignItems: 'center' }}>
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                <Svg width={28} height={28} viewBox="0 0 24 24"><Path d="M5 3l14 9-14 9V3z" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            </View>
                            <Text className="font-inter text-lg font-bold text-primary-950 mb-2">Rotation Executed</Text>
                            <Text className="font-inter text-sm text-neutral-500 mb-1">{executeResult.name}</Text>
                            <Text className="font-inter text-2xl font-bold text-success-600">{executeResult.count} rotated</Text>
                            <Pressable onPress={() => setExecuteResult(null)} style={[styles.saveBtn, { marginTop: 20, width: '100%' }]}>
                                <Text className="font-inter text-sm font-bold text-white">Done</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            )}

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
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
