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
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmployeeTypes } from '@/features/company-admin/api/use-hr-queries';
import {
    useCreateLeaveType,
    useDeleteLeaveType,
    useUpdateLeaveType,
} from '@/features/company-admin/api/use-leave-mutations';
import { useLeaveTypes } from '@/features/company-admin/api/use-leave-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

type LeaveCategory = 'Paid' | 'Unpaid' | 'Compensatory' | 'Statutory';
type AccrualFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'Pro-rata' | 'Upfront';
type EncashmentRate = 'Basic' | 'Gross';
type GenderApplicability = 'All' | 'Male' | 'Female';

interface LeaveTypeItem {
    id: string;
    name: string;
    code: string;
    category: LeaveCategory;
    annualEntitlement: number;
    accrualFrequency: AccrualFrequency;
    accrualDay: number;
    carryForwardEnabled: boolean;
    carryForwardMaxDays: number;
    encashmentEnabled: boolean;
    encashmentMaxDays: number;
    encashmentRate: EncashmentRate;
    applicableEmployeeTypes: string[];
    genderApplicability: GenderApplicability;
    probationRestricted: boolean;
    minAdvanceNotice: number;
    minDays: number;
    maxDays: number;
    allowHalfDay: boolean;
    weekendSandwich: boolean;
    holidaySandwich: boolean;
    documentRequired: boolean;
    documentAfterDays: number;
    lopOnExcess: boolean;
    status: 'Active' | 'Inactive';
}

// ============ CONSTANTS ============

const CATEGORIES: LeaveCategory[] = ['Paid', 'Unpaid', 'Compensatory', 'Statutory'];
const ACCRUAL_FREQUENCIES: AccrualFrequency[] = ['Monthly', 'Quarterly', 'Annual', 'Pro-rata', 'Upfront'];
const ENCASHMENT_RATES: EncashmentRate[] = ['Basic', 'Gross'];
const GENDERS: GenderApplicability[] = ['All', 'Male', 'Female'];

const CATEGORY_COLORS: Record<LeaveCategory, { bg: string; text: string }> = {
    Paid: { bg: colors.success[50], text: colors.success[700] },
    Unpaid: { bg: colors.danger[50], text: colors.danger[700] },
    Compensatory: { bg: colors.warning[50], text: colors.warning[700] },
    Statutory: { bg: colors.info[50], text: colors.info[700] },
};

// ============ SHARED ATOMS ============

function CategoryBadge({ category }: { category: LeaveCategory }) {
    const scheme = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Paid;
    return (
        <View style={[styles.categoryBadge, { backgroundColor: scheme.bg }]}>
            <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                {category}
            </Text>
        </View>
    );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
    if (!enabled) return null;
    return (
        <View style={[styles.featureBadge, { backgroundColor: colors.primary[50] }]}>
            <Text className="font-inter text-[9px] font-bold text-primary-600">{label}</Text>
        </View>
    );
}

function ChipSelector({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
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

function MultiChipSelector({ label, options, value, onToggle }: { label: string; options: { id: string; label: string }[]; value: string[]; onToggle: (id: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => {
                    const selected = value.includes(opt.id);
                    return (
                        <Pressable key={opt.id} onPress={() => onToggle(opt.id)} style={[styles.chip, selected && styles.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</Text>
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
                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400">{title}</Text>
    );
}

// ============ FORM MODAL ============

const EMPTY_FORM: Omit<LeaveTypeItem, 'id'> = {
    name: '', code: '', category: 'Paid', annualEntitlement: 12,
    accrualFrequency: 'Monthly', accrualDay: 1,
    carryForwardEnabled: false, carryForwardMaxDays: 0,
    encashmentEnabled: false, encashmentMaxDays: 0, encashmentRate: 'Basic',
    applicableEmployeeTypes: [], genderApplicability: 'All', probationRestricted: false,
    minAdvanceNotice: 0, minDays: 1, maxDays: 30,
    allowHalfDay: true, weekendSandwich: false, holidaySandwich: false,
    documentRequired: false, documentAfterDays: 3, lopOnExcess: true,
    status: 'Active',
};

function LeaveTypeFormModal({
    visible, onClose, onSave, initialData, isSaving, employeeTypeOptions,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Omit<LeaveTypeItem, 'id'>) => void;
    initialData?: LeaveTypeItem | null; isSaving: boolean;
    employeeTypeOptions: { id: string; label: string }[];
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<Omit<LeaveTypeItem, 'id'>>(EMPTY_FORM);

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

    const update = <K extends keyof Omit<LeaveTypeItem, 'id'>>(key: K, val: Omit<LeaveTypeItem, 'id'>[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const toggleEmployeeType = (id: string) => {
        setForm(prev => ({
            ...prev,
            applicableEmployeeTypes: prev.applicableEmployeeTypes.includes(id)
                ? prev.applicableEmployeeTypes.filter(x => x !== id)
                : [...prev.applicableEmployeeTypes, id],
        }));
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.code.trim()) return;
        onSave({ ...form, name: form.name.trim(), code: form.code.trim().toUpperCase() });
    };

    const isValid = form.name.trim() && form.code.trim();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">
                        {initialData ? 'Edit Leave Type' : 'Add Leave Type'}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* ── Basic ── */}
                        <SectionHeader title="Basic Information" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Name <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "Casual Leave"' placeholderTextColor={colors.neutral[400]} value={form.name} onChangeText={v => update('name', v)} autoCapitalize="words" /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Code <Text className="text-danger-500">*</Text></Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder='e.g. "CL"' placeholderTextColor={colors.neutral[400]} value={form.code} onChangeText={v => update('code', v)} autoCapitalize="characters" /></View>
                        </View>
                        <ChipSelector label="Category" options={CATEGORIES} value={form.category} onSelect={v => update('category', v as LeaveCategory)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Annual Entitlement (days)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="12" placeholderTextColor={colors.neutral[400]} value={String(form.annualEntitlement)} onChangeText={v => update('annualEntitlement', Number(v) || 0)} keyboardType="number-pad" /></View>
                        </View>

                        {/* ── Accrual ── */}
                        <SectionHeader title="Accrual Settings" />
                        <ChipSelector label="Accrual Frequency" options={ACCRUAL_FREQUENCIES} value={form.accrualFrequency} onSelect={v => update('accrualFrequency', v as AccrualFrequency)} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Accrual Day</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={String(form.accrualDay)} onChangeText={v => update('accrualDay', Number(v) || 1)} keyboardType="number-pad" /></View>
                        </View>

                        {/* ── Carry Forward ── */}
                        <SectionHeader title="Carry Forward" />
                        <ToggleRow label="Enable Carry Forward" subtitle="Allow unused leaves to carry over" value={form.carryForwardEnabled} onChange={v => update('carryForwardEnabled', v)} />
                        {form.carryForwardEnabled && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Max Carry Forward Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="5" placeholderTextColor={colors.neutral[400]} value={String(form.carryForwardMaxDays)} onChangeText={v => update('carryForwardMaxDays', Number(v) || 0)} keyboardType="number-pad" /></View>
                            </View>
                        )}

                        {/* ── Encashment ── */}
                        <SectionHeader title="Encashment" />
                        <ToggleRow label="Enable Encashment" subtitle="Allow leave encashment on separation/year-end" value={form.encashmentEnabled} onChange={v => update('encashmentEnabled', v)} />
                        {form.encashmentEnabled && (
                            <>
                                <View style={styles.fieldWrap}>
                                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Max Encashment Days</Text>
                                    <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="10" placeholderTextColor={colors.neutral[400]} value={String(form.encashmentMaxDays)} onChangeText={v => update('encashmentMaxDays', Number(v) || 0)} keyboardType="number-pad" /></View>
                                </View>
                                <ChipSelector label="Encashment Rate" options={ENCASHMENT_RATES} value={form.encashmentRate} onSelect={v => update('encashmentRate', v as EncashmentRate)} />
                            </>
                        )}

                        {/* ── Applicability ── */}
                        <SectionHeader title="Applicability" />
                        {employeeTypeOptions.length > 0 && (
                            <MultiChipSelector label="Employee Types" options={employeeTypeOptions} value={form.applicableEmployeeTypes} onToggle={toggleEmployeeType} />
                        )}
                        <ChipSelector label="Gender" options={GENDERS} value={form.genderApplicability} onSelect={v => update('genderApplicability', v as GenderApplicability)} />
                        <ToggleRow label="Probation Restricted" subtitle="Not available during probation period" value={form.probationRestricted} onChange={v => update('probationRestricted', v)} />

                        {/* ── Rules ── */}
                        <SectionHeader title="Leave Rules" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Min Advance Notice (days)</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="0" placeholderTextColor={colors.neutral[400]} value={String(form.minAdvanceNotice)} onChangeText={v => update('minAdvanceNotice', Number(v) || 0)} keyboardType="number-pad" /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Min Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="1" placeholderTextColor={colors.neutral[400]} value={String(form.minDays)} onChangeText={v => update('minDays', Number(v) || 1)} keyboardType="number-pad" /></View>
                            </View>
                            <View style={[styles.fieldWrap, { flex: 1 }]}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Max Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="30" placeholderTextColor={colors.neutral[400]} value={String(form.maxDays)} onChangeText={v => update('maxDays', Number(v) || 30)} keyboardType="number-pad" /></View>
                            </View>
                        </View>
                        <ToggleRow label="Allow Half-Day" value={form.allowHalfDay} onChange={v => update('allowHalfDay', v)} />
                        <ToggleRow label="Weekend Sandwich Rule" subtitle="Count weekends between leave days" value={form.weekendSandwich} onChange={v => update('weekendSandwich', v)} />
                        <ToggleRow label="Holiday Sandwich Rule" subtitle="Count holidays between leave days" value={form.holidaySandwich} onChange={v => update('holidaySandwich', v)} />
                        <ToggleRow label="Document Required" subtitle="Require supporting document" value={form.documentRequired} onChange={v => update('documentRequired', v)} />
                        {form.documentRequired && (
                            <View style={styles.fieldWrap}>
                                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Document Required After N Days</Text>
                                <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="3" placeholderTextColor={colors.neutral[400]} value={String(form.documentAfterDays)} onChangeText={v => update('documentAfterDays', Number(v) || 1)} keyboardType="number-pad" /></View>
                            </View>
                        )}
                        <ToggleRow label="LOP on Excess" subtitle="Loss of pay when balance exhausted" value={form.lopOnExcess} onChange={v => update('lopOnExcess', v)} />

                        <View style={{ marginTop: 8 }} />
                        <ChipSelector label="Status" options={['Active', 'Inactive']} value={form.status} onSelect={v => update('status', v as 'Active' | 'Inactive')} />
                    </ScrollView>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Add Leave Type'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ LEAVE TYPE CARD ============

function LeaveTypeCard({ item, index, onEdit, onDelete }: { item: LeaveTypeItem; index: number; onEdit: () => void; onDelete: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
                            <View style={styles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text></View>
                            <CategoryBadge category={item.category} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                            {item.annualEntitlement} days/year  {'\u00B7'}  {item.accrualFrequency}
                        </Text>
                    </View>
                    <Pressable onPress={onDelete} hitSlop={8}>
                        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                </View>
                <View style={styles.cardMeta}>
                    <FeatureBadge label="Carry Forward" enabled={item.carryForwardEnabled} />
                    <FeatureBadge label="Encashment" enabled={item.encashmentEnabled} />
                    {item.allowHalfDay && <FeatureBadge label="Half-Day" enabled />}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function LeaveTypeScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useLeaveTypes();
    const createMutation = useCreateLeaveType();
    const updateMutation = useUpdateLeaveType();
    const deleteMutation = useDeleteLeaveType();

    const { data: empTypeResponse } = useEmployeeTypes();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<LeaveTypeItem | null>(null);
    const [search, setSearch] = React.useState('');

    const employeeTypeOptions = React.useMemo(() => {
        const raw = (empTypeResponse as any)?.data ?? empTypeResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    }, [empTypeResponse]);

    const leaveTypes: LeaveTypeItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
            let cat = item.category ?? 'Paid';
            if (cat === 'PAID') cat = 'Paid';
            else if (cat === 'UNPAID') cat = 'Unpaid';
            else if (cat === 'COMPENSATORY') cat = 'Compensatory';
            else if (cat === 'STATUTORY') cat = 'Statutory';

            let freq = item.accrualFrequency ?? 'Monthly';
            if (freq === 'MONTHLY') freq = 'Monthly';
            else if (freq === 'QUARTERLY') freq = 'Quarterly';
            else if (freq === 'ANNUAL') freq = 'Annual';
            else if (freq === 'PRO_RATA') freq = 'Pro-rata';
            else if (freq === 'UPFRONT') freq = 'Upfront';

            let encRate = item.encashmentRate ?? 'Basic';
            if (encRate === 'BASIC') encRate = 'Basic';
            else if (encRate === 'GROSS') encRate = 'Gross';

            let gen = item.genderApplicability ?? 'All';
            if (gen === 'ALL') gen = 'All';
            else if (gen === 'MALE') gen = 'Male';
            else if (gen === 'FEMALE') gen = 'Female';

            return {
                id: item.id ?? '',
                name: item.name ?? '',
                code: item.code ?? '',
                category: cat,
                annualEntitlement: item.annualEntitlement ?? 0,
                accrualFrequency: freq,
                accrualDay: item.accrualDay ?? 1,
                carryForwardEnabled: item.carryForwardEnabled ?? item.carryForwardAllowed ?? false,
                carryForwardMaxDays: item.carryForwardMaxDays ?? item.maxCarryForwardDays ?? 0,
                encashmentEnabled: item.encashmentEnabled ?? item.encashmentAllowed ?? false,
                encashmentMaxDays: item.encashmentMaxDays ?? item.maxEncashableDays ?? 0,
                encashmentRate: encRate,
                applicableEmployeeTypes: item.applicableEmployeeTypes ?? item.applicableTypeIds ?? [],
                genderApplicability: gen,
                probationRestricted: item.probationRestricted ?? false,
                minAdvanceNotice: item.minAdvanceNotice ?? 0,
                minDays: item.minDays ?? item.minDaysPerApplication ?? 1,
                maxDays: item.maxDays ?? item.maxConsecutiveDays ?? 30,
                allowHalfDay: item.allowHalfDay ?? true,
                weekendSandwich: item.weekendSandwich ?? false,
                holidaySandwich: item.holidaySandwich ?? false,
                documentRequired: item.documentRequired ?? false,
                documentAfterDays: item.documentAfterDays ?? 3,
                lopOnExcess: item.lopOnExcess ?? true,
                status: item.status ?? 'Active',
            };
        });
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return leaveTypes;
        const q = search.toLowerCase();
        return leaveTypes.filter(lt => lt.name.toLowerCase().includes(q) || lt.code.toLowerCase().includes(q));
    }, [leaveTypes, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: LeaveTypeItem) => { setEditingItem(item); setFormVisible(true); };

    const handleDelete = (item: LeaveTypeItem) => {
        showConfirm({
            title: 'Delete Leave Type',
            message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => { deleteMutation.mutate(item.id); },
        });
    };

    const handleSave = (data: Omit<LeaveTypeItem, 'id'>) => {
        const payload = {
            name: data.name,
            code: data.code,
            category: data.category.toUpperCase(),
            annualEntitlement: data.annualEntitlement,
            accrualFrequency: data.accrualFrequency === 'Pro-rata' ? 'PRO_RATA' : data.accrualFrequency.toUpperCase(),
            accrualDay: data.accrualDay,
            carryForwardAllowed: data.carryForwardEnabled,
            maxCarryForwardDays: data.carryForwardMaxDays,
            encashmentAllowed: data.encashmentEnabled,
            maxEncashableDays: data.encashmentMaxDays,
            encashmentRate: data.encashmentRate.toUpperCase(),
            applicableTypeIds: data.applicableEmployeeTypes,
            applicableGender: data.genderApplicability.toUpperCase(),
            probationRestricted: data.probationRestricted,
            minAdvanceNotice: data.minAdvanceNotice,
            minDaysPerApplication: data.minDays,
            maxConsecutiveDays: data.maxDays,
            allowHalfDay: data.allowHalfDay,
            weekendSandwich: data.weekendSandwich,
            holidaySandwich: data.holidaySandwich,
            documentRequired: data.documentRequired,
            documentAfterDays: data.documentAfterDays,
            lopOnExcess: data.lopOnExcess,
            status: data.status,
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: payload }, { onSuccess: () => setFormVisible(false) });
        } else {
            createMutation.mutate(payload, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: LeaveTypeItem; index: number }) => (
        <LeaveTypeCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
                >
                    <View style={styles.headerDecor1} />
                    <View style={styles.headerDecor2} />
                    <View style={styles.headerRow}>
                        <View style={{ width: 36, alignItems: 'flex-start' }}>
                            <Pressable onPress={toggle} hitSlop={8}>
                                <Svg width={28} height={28} viewBox="0 0 24 24">
                                    <Path d="M4 7h16M4 12h16M4 17h16" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
                                </Svg>
                            </Pressable>
                        </View>
                        <Text className="font-inter text-lg font-bold text-white">Leave Type Management</Text>
                        <View style={styles.countBadge}>
                            <Text className="font-inter text-xs font-bold text-white">
                                {leaveTypes.length}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Leave Types</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{leaveTypes.length} leave type{leaveTypes.length !== 1 ? 's' : ''}</Text>
                <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." /></View>
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load leave types" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No leave types match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No leave types yet" message="Add your first leave type to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <LeaveTypeFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} employeeTypeOptions={employeeTypeOptions} />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerGradient: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        minWidth: 36,
        alignItems: 'center',
    },
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
    codeBadge: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    categoryBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    featureBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], marginBottom: 4 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
