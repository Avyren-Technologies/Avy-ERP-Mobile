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
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type AssignmentLevel = 'company' | 'department' | 'designation' | 'grade' | 'employeeType' | 'individual';

interface SavePolicyPayload {
    leaveTypeId: string;
    assignmentLevel: AssignmentLevel;
    assignmentIds: string[];
    annualEntitlementOverride: number | null;
    carryForwardDaysOverride: number | null;
}

interface LeavePolicyGroup {
    groupKey: string;
    leaveTypeId: string;
    leaveTypeName: string;
    assignmentLevel: AssignmentLevel;
    overrides: Record<string, any> | null;
    annualEntitlementOverride: number | null;
    carryForwardDaysOverride: number | null;
    policyIds: string[];
    assignmentIds: string[];
    assignmentTargetNames: string[];
}

// ============ CONSTANTS ============

const ASSIGNMENT_LEVELS: AssignmentLevel[] = ['company', 'department', 'designation', 'grade', 'employeeType', 'individual'];
const LEVEL_LABELS: Record<AssignmentLevel, string> = {
    company: 'Company',
    department: 'Department',
    designation: 'Designation',
    grade: 'Grade',
    employeeType: 'Employee Type',
    individual: 'Individual',
};

const LEVEL_COLORS: Record<AssignmentLevel, { bg: string; text: string }> = {
    company: { bg: colors.primary[50], text: colors.primary[700] },
    department: { bg: colors.info[50], text: colors.info[700] },
    designation: { bg: colors.accent[50], text: colors.accent[700] },
    grade: { bg: colors.success[50], text: colors.success[700] },
    employeeType: { bg: colors.warning[50], text: colors.warning[700] },
    individual: { bg: colors.danger[50], text: colors.danger[700] },
};

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
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{LEVEL_LABELS[opt as AssignmentLevel]?.toUpperCase() || opt.toUpperCase()}</Text>
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
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
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
                                    <Text className={`font-inter text-sm ${opt.id === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{opt.label}</Text>
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

function MultiDropdown({
    label, values, options, onChange, placeholder, required,
}: {
    label: string;
    values: string[];
    options: { id: string; label: string }[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
    required?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    const filteredOptions = React.useMemo(() => {
        if (!searchText.trim()) return options;
        const q = searchText.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchText]);

    const toggle = (id: string) => {
        if (values.includes(id)) {
            onChange(values.filter(v => v !== id));
        } else {
            onChange([...values, id]);
        }
    };

    const selectedLabels = values
        .map(v => options.find(o => o.id === v)?.label)
        .filter(Boolean) as string[];

    const summary =
        values.length === 0
            ? placeholder || 'Select one or more...'
            : values.length === 1
                ? (selectedLabels[0] ?? `${values.length} selected`)
                : `${values.length} targets selected`;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                {label} {required && <Text className="text-danger-500">*</Text>}
            </Text>
            <Pressable onPress={() => { setOpen(true); setSearchText(''); }} style={styles.dropdownBtn}>
                <Text
                    className={`font-inter text-sm ${values.length > 0 ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                >
                    {summary}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>

            {values.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {values.map(id => {
                        const lbl = options.find(o => o.id === id)?.label ?? id;
                        return (
                            <View key={id} style={styles.chipSelected}>
                                <Text className="font-inter text-[11px] font-semibold text-primary-700 dark:text-primary-300">{lbl}</Text>
                                <Pressable onPress={() => toggle(id)} hitSlop={6} style={{ marginLeft: 6 }}>
                                    <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" /></Svg>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            )}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{label}</Text>
                            <Text className="font-inter text-xs font-bold text-primary-600">{values.length} selected</Text>
                        </View>
                        <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                            <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filteredOptions.map(opt => {
                                const selected = values.includes(opt.id);
                                return (
                                    <Pressable
                                        key={opt.id}
                                        onPress={() => toggle(opt.id)}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
                                            borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
                                            backgroundColor: selected ? colors.primary[50] : undefined, borderRadius: 8,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 18, height: 18, borderRadius: 4, marginRight: 10,
                                                borderWidth: 1.5,
                                                borderColor: selected ? colors.primary[600] : colors.neutral[300],
                                                backgroundColor: selected ? colors.primary[600] : 'transparent',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            {selected && (
                                                <Svg width={11} height={11} viewBox="0 0 24 24"><Path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                            )}
                                        </View>
                                        <Text className={`flex-1 font-inter text-sm ${selected ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                            {filteredOptions.length === 0 && (
                                <Text className="py-4 text-center font-inter text-sm text-neutral-400">No options found</Text>
                            )}
                        </ScrollView>
                        <Pressable onPress={() => setOpen(false)} style={[styles.saveBtn, { marginTop: 12 }]}>
                            <Text className="font-inter text-sm font-bold text-white uppercase">
                                Done ({values.length} selected)
                            </Text>
                        </Pressable>
                    </View>
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

function LeavePolicyFormModal({
    visible, onClose, onSave, initialData, isSaving,
    leaveTypeOptions, departmentOptions, designationOptions, gradeOptions, employeeTypeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: SavePolicyPayload) => void;
    initialData?: LeavePolicyGroup | null; isSaving: boolean;
    leaveTypeOptions: { id: string; label: string }[];
    departmentOptions: { id: string; label: string }[];
    designationOptions: { id: string; label: string }[];
    gradeOptions: { id: string; label: string }[];
    employeeTypeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [leaveTypeId, setLeaveTypeId] = React.useState('');
    const [assignmentLevel, setAssignmentLevel] = React.useState<AssignmentLevel>('company');
    const [assignmentTargetIds, setAssignmentTargetIds] = React.useState<string[]>([]);
    const [individualTargetId, setIndividualTargetId] = React.useState('');
    const [annualOverride, setAnnualOverride] = React.useState('');
    const [cfOverride, setCfOverride] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setLeaveTypeId(initialData.leaveTypeId || '');
                const level = (initialData.assignmentLevel || 'company') as AssignmentLevel;
                setAssignmentLevel(ASSIGNMENT_LEVELS.includes(level) ? level : 'company');
                setAssignmentTargetIds([...initialData.assignmentIds]);
                setIndividualTargetId(initialData.assignmentIds[0] ?? '');
                setAnnualOverride(initialData.annualEntitlementOverride != null ? String(initialData.annualEntitlementOverride) : '');
                setCfOverride(initialData.carryForwardDaysOverride != null ? String(initialData.carryForwardDaysOverride) : '');
            } else {
                setLeaveTypeId('');
                setAssignmentLevel('company');
                setAssignmentTargetIds([]);
                setIndividualTargetId('');
                setAnnualOverride('');
                setCfOverride('');
            }
        }
    }, [visible, initialData]);

    // Reset target when level changes
    React.useEffect(() => {
        setAssignmentTargetIds([]);
        setIndividualTargetId('');
    }, [assignmentLevel]);

    const targetOptions = React.useMemo(() => {
        switch (assignmentLevel) {
            case 'department': return departmentOptions;
            case 'designation': return designationOptions;
            case 'grade': return gradeOptions;
            case 'employeeType': return employeeTypeOptions;
            default: return [];
        }
    }, [assignmentLevel, departmentOptions, designationOptions, gradeOptions, employeeTypeOptions]);

    const needsMultiTarget = assignmentLevel === 'department' || assignmentLevel === 'designation' || assignmentLevel === 'grade' || assignmentLevel === 'employeeType';

    const handleSave = () => {
        if (!leaveTypeId) return;
        let ids: string[] = [];
        if (needsMultiTarget) ids = assignmentTargetIds;
        else if (assignmentLevel === 'individual') ids = individualTargetId ? [individualTargetId] : [];
        onSave({
            leaveTypeId,
            assignmentLevel,
            assignmentIds: ids,
            annualEntitlementOverride: annualOverride ? Number(annualOverride) : null,
            carryForwardDaysOverride: cfOverride ? Number(cfOverride) : null,
        });
    };

    const isValid =
        !!leaveTypeId &&
        (assignmentLevel === 'company' ||
            (needsMultiTarget && assignmentTargetIds.length > 0) ||
            (assignmentLevel === 'individual' && individualTargetId.length > 0));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                    <View style={[styles.formSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4 uppercase tracking-tighter">
                            {initialData ? 'Edit Leave Policy' : 'Create New Policy'}
                        </Text>
                        
                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled" 
                            style={{ flexShrink: 1, maxHeight: 550 }}
                            contentContainerStyle={{ paddingBottom: 250 }}
                        >
                            <Dropdown label="LEAVE TYPE" value={leaveTypeId} options={leaveTypeOptions} onSelect={setLeaveTypeId} placeholder="Select type..." required />
                            
                            <ChipSelector label="ASSIGNMENT LEVEL" options={ASSIGNMENT_LEVELS} value={assignmentLevel} onSelect={v => setAssignmentLevel(v as AssignmentLevel)} />

                            {needsMultiTarget && (
                                <MultiDropdown
                                    label="ASSIGNMENT TARGETS"
                                    values={assignmentTargetIds}
                                    options={targetOptions}
                                    onChange={setAssignmentTargetIds}
                                    placeholder="Select one or more targets..."
                                    required
                                />
                            )}

                            {assignmentLevel === 'individual' && (
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                        EMPLOYEE ID <Text className="text-danger-500">*</Text>
                                    </Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter employee ID..."
                                            placeholderTextColor={colors.neutral[400]}
                                            value={individualTargetId}
                                            onChangeText={setIndividualTargetId}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                            )}
                            
                            <Text className="mb-3 mt-2 font-inter text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Override Configuration</Text>
                            
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Annual Entitlement</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.textInput} placeholder="DEFAULT" placeholderTextColor={colors.neutral[400]} value={annualOverride} onChangeText={setAnnualOverride} keyboardType="number-pad" />
                                </View>
                            </View>
                            
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase">Carry Forward Days</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.textInput} placeholder="DEFAULT" placeholderTextColor={colors.neutral[400]} value={cfOverride} onChangeText={setCfOverride} keyboardType="number-pad" />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 8 }}>
                            <Pressable onPress={onClose} style={styles.cancelBtn}>
                                <Text className="font-inter text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase">Discard</Text>
                            </Pressable>
                            <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                                <Text className="font-inter text-sm font-bold text-white uppercase">{isSaving ? 'Saving...' : initialData ? 'Update Policy' : 'Create Policy'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============ POLICY CARD ============

function PolicyCard({ group, index, onEdit, onDelete }: { group: LeavePolicyGroup; index: number; onEdit: () => void; onDelete: () => void }) {
    const levelColor = LEVEL_COLORS[group.assignmentLevel] ?? LEVEL_COLORS.company;
    const targetNames = group.assignmentTargetNames.filter(Boolean);
    const visibleNames = targetNames.slice(0, 3);
    const extra = targetNames.length - visibleNames.length;
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{group.leaveTypeName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <View style={[styles.levelBadge, { backgroundColor: levelColor.bg }]}>
                                <Text style={{ color: levelColor.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{LEVEL_LABELS[group.assignmentLevel]?.toUpperCase() || group.assignmentLevel.toUpperCase()}</Text>
                            </View>
                            {group.assignmentLevel === 'company' && (
                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">All Employees</Text>
                            )}
                            {group.assignmentLevel !== 'company' && targetNames.length === 0 && (
                                <Text className="font-inter text-xs text-neutral-400">—</Text>
                            )}
                        </View>
                        {group.assignmentLevel !== 'company' && targetNames.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                {visibleNames.map((n) => (
                                    <View key={n} style={styles.targetChip}>
                                        <Text className="font-inter text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">{n}</Text>
                                    </View>
                                ))}
                                {extra > 0 && (
                                    <View style={styles.targetChipMore}>
                                        <Text className="font-inter text-[10px] font-bold text-primary-700 dark:text-primary-300">+{extra} more</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                {(group.annualEntitlementOverride != null || group.carryForwardDaysOverride != null) && (
                    <View style={styles.cardMeta}>
                        {group.annualEntitlementOverride != null && (
                            <View style={styles.overrideBadge}><Text className="font-inter text-[10px] text-neutral-600 dark:text-neutral-400">Entitlement: {group.annualEntitlementOverride}d</Text></View>
                        )}
                        {group.carryForwardDaysOverride != null && (
                            <View style={styles.overrideBadge}><Text className="font-inter text-[10px] text-neutral-600 dark:text-neutral-400">CF: {group.carryForwardDaysOverride}d</Text></View>
                        )}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function LeavePolicyScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

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
    const [editingGroup, setEditingGroup] = React.useState<LeavePolicyGroup | null>(null);
    const [search, setSearch] = React.useState('');
    const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

    const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

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

    /* Group raw policies by (leaveType, level, overrides) so multiple targets
       sharing the same override profile collapse into a single card. */
    const groups: LeavePolicyGroup[] = React.useMemo(() => {
        const stableStringify = (val: any): string => {
            if (val === null || val === undefined) return 'null';
            if (typeof val !== 'object') return JSON.stringify(val);
            if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`;
            const keys = Object.keys(val).sort();
            return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(val[k])}`).join(',')}}`;
        };
        const resolveName = (level: string, targetId: string | null | undefined): string => {
            if (!targetId) return '';
            const lookup: Record<string, { id: string; label: string }[]> = {
                department: departmentOptions,
                designation: designationOptions,
                grade: gradeOptions,
                employeeType: employeeTypeOptions,
            };
            return (lookup[level] ?? []).find(o => o.id === targetId)?.label ?? '';
        };
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];

        const map = new Map<string, LeavePolicyGroup>();
        for (const item of raw as any[]) {
            const lvlRaw = item.assignmentLevel || 'company';
            const lvl = (lvlRaw === 'employeeType' || lvlRaw === 'individual' ? lvlRaw : String(lvlRaw).toLowerCase()) as AssignmentLevel;
            const lvlNormalised = ASSIGNMENT_LEVELS.includes(lvl) ? lvl : 'company';
            const overrides = (item.overrides ?? null) as Record<string, any> | null;
            const key = `${item.leaveTypeId}::${lvlNormalised}::${stableStringify(overrides)}`;
            const targetId = item.assignmentId ?? item.assignmentTargetId ?? '';
            const targetName = resolveName(lvlNormalised, targetId);

            const existing = map.get(key);
            if (existing) {
                existing.policyIds.push(item.id);
                if (targetId) existing.assignmentIds.push(targetId);
                if (targetName) existing.assignmentTargetNames.push(targetName);
            } else {
                map.set(key, {
                    groupKey: key,
                    leaveTypeId: item.leaveTypeId ?? '',
                    leaveTypeName: item.leaveType?.name ?? item.leaveTypeName ?? leaveTypeOptions.find((o: any) => o.id === item.leaveTypeId)?.label ?? '',
                    assignmentLevel: lvlNormalised,
                    overrides,
                    annualEntitlementOverride: overrides?.annualEntitlement != null ? Number(overrides.annualEntitlement) : null,
                    carryForwardDaysOverride: overrides?.maxCarryForwardDays != null ? Number(overrides.maxCarryForwardDays) : null,
                    policyIds: [item.id],
                    assignmentIds: targetId ? [targetId] : [],
                    assignmentTargetNames: targetName ? [targetName] : [],
                });
            }
        }
        return Array.from(map.values());
    }, [response, leaveTypeOptions, departmentOptions, designationOptions, gradeOptions, employeeTypeOptions]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return groups;
        const q = search.toLowerCase();
        return groups.filter(g =>
            g.leaveTypeName.toLowerCase().includes(q) ||
            g.assignmentLevel.toLowerCase().includes(q) ||
            g.assignmentTargetNames.some(n => n.toLowerCase().includes(q)),
        );
    }, [groups, search]);

    const handleAdd = () => { setEditingGroup(null); setFormVisible(true); };
    const handleEdit = (group: LeavePolicyGroup) => { setEditingGroup(group); setFormVisible(true); };

    const handleDelete = (group: LeavePolicyGroup) => {
        const targetCount = group.policyIds.length;
        showConfirm({
            title: 'Delete Policy',
            message: targetCount > 1
                ? `Delete this leave policy from all ${targetCount} targets? This action cannot be undone.`
                : `Are you sure you want to delete this policy for "${group.leaveTypeName}"? This action cannot be undone.`,
            confirmText: 'Delete', variant: 'danger',
            onConfirm: async () => {
                for (const pid of group.policyIds) {
                    // Sequential delete keeps backend transactions simple.
                    // eslint-disable-next-line no-await-in-loop
                    await deleteMutation.mutateAsync(pid).catch(() => undefined);
                }
            },
        });
    };

    const handleSave = (data: SavePolicyPayload) => {
        const overrides: Record<string, any> = {};
        if (data.annualEntitlementOverride != null) overrides.annualEntitlement = data.annualEntitlementOverride;
        if (data.carryForwardDaysOverride != null) overrides.maxCarryForwardDays = data.carryForwardDaysOverride;

        const basePayload: Record<string, any> = {
            leaveTypeId: data.leaveTypeId,
            assignmentLevel: data.assignmentLevel,
            overrides: Object.keys(overrides).length > 0 ? overrides : null,
        };
        if (data.assignmentLevel !== 'company') {
            basePayload.assignmentIds = data.assignmentIds;
        }
        const count = data.assignmentIds.length;
        const multiSuffix = count > 1 ? ` for ${count} targets` : '';

        if (editingGroup) {
            // Pass all policyIds so the backend can delete removed targets.
            basePayload.policyIds = editingGroup.policyIds;
            const anchorId = editingGroup.policyIds[0]!;
            updateMutation.mutate({ id: anchorId, data: basePayload }, {
                onSuccess: () => { setFormVisible(false); triggerToast(`Policy updated successfully${multiSuffix}`); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to update policy', 'error'),
            });
        } else {
            createMutation.mutate(basePayload, {
                onSuccess: () => { setFormVisible(false); triggerToast(`Policy created successfully${multiSuffix}`); },
                onError: (err: any) => triggerToast(err.response?.data?.message || 'Failed to create policy', 'error'),
            });
        }
    };

    const renderItem = ({ item, index }: { item: LeavePolicyGroup; index: number }) => (
        <PolicyCard group={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={{ marginTop: 0 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search policies..." /></View>
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
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.groupKey} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <LeavePolicyFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingGroup} isSaving={createMutation.isPending || updateMutation.isPending}
                leaveTypeOptions={leaveTypeOptions} departmentOptions={departmentOptions} designationOptions={designationOptions} gradeOptions={gradeOptions} employeeTypeOptions={employeeTypeOptions}
            />
            <ConfirmModal {...confirmModalProps} />
            <StatusToast {...toast} />
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
    levelBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    overrideBadge: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 14, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950], fontWeight: '600' },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 14, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    chipSelected: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
    targetChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100] },
    targetChipMore: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    toastContainer: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999, alignItems: 'center' },
    toastGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, shadowColor: colors.primary[950], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
});
const styles = createStyles(false);
