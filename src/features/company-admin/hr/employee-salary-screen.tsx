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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useAssignEmployeeSalary, useUpdateEmployeeSalary } from '@/features/company-admin/api/use-payroll-mutations';
import { useEmployeeSalaries, useSalaryStructures } from '@/features/company-admin/api/use-payroll-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface EmployeeSalaryItem {
    id: string;
    employeeId: string;
    employeeName: string;
    structureId: string;
    structureName: string;
    annualCTC: number;
    monthlyGross: number;
    effectiveFrom: string;
    isCurrent: boolean;
    components: { name: string; monthly: number }[];
}

// ============ HELPERS ============

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ============ SHARED ATOMS ============

function Dropdown({ label, value, options, onSelect, placeholder, searchable }: {
    label: string; value: string; options: { id: string; label: string }[];
    onSelect: (id: string) => void; placeholder?: string; searchable?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');
    const filtered = searchable && q.trim()
        ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
        : options;

    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
                    {options.find(o => o.id === value)?.label || placeholder || 'Select...'}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{label}</Text>
                        {searchable && (
                            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                                <TextInput style={styles.textInput} placeholder="Search..." placeholderTextColor={colors.neutral[400]} value={q} onChangeText={setQ} />
                            </View>
                        )}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {filtered.map(opt => (
                                <Pressable key={opt.id} onPress={() => { onSelect(opt.id); setOpen(false); setQ(''); }}
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

// ============ FORM MODAL ============

function AssignSalaryModal({
    visible, onClose, onSave, initialData, isSaving, employeeOptions, structureOptions, structureData,
}: {
    visible: boolean; onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialData?: EmployeeSalaryItem | null; isSaving: boolean;
    employeeOptions: { id: string; label: string }[];
    structureOptions: { id: string; label: string }[];
    structureData: any[];
}) {
    const insets = useSafeAreaInsets();
    const [employeeId, setEmployeeId] = React.useState('');
    const [structureId, setStructureId] = React.useState('');
    const [annualCTC, setAnnualCTC] = React.useState('');
    const [effectiveFrom, setEffectiveFrom] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                setEmployeeId(initialData.employeeId);
                setStructureId(initialData.structureId);
                setAnnualCTC(String(initialData.annualCTC));
                setEffectiveFrom(initialData.effectiveFrom);
            } else {
                setEmployeeId(''); setStructureId(''); setAnnualCTC(''); setEffectiveFrom('');
            }
        }
    }, [visible, initialData]);

    const ctcNum = Number(annualCTC) || 0;
    const monthlyGross = Math.round(ctcNum / 12);

    // Compute breakup from structure
    const breakup = React.useMemo(() => {
        if (!structureId || ctcNum <= 0) return [];
        const struct = structureData.find((s: any) => (s.id ?? '') === structureId);
        if (!struct?.components) return [];
        return (struct.components as any[]).map((c: any) => {
            let monthly = 0;
            if (c.calculationMethod === 'Fixed') monthly = c.value ?? 0;
            else if (c.calculationMethod === '% of Gross') monthly = Math.round(monthlyGross * ((c.value ?? 0) / 100));
            else if (c.calculationMethod === '% of Basic') {
                const basicComp = (struct.components as any[]).find((cc: any) => (cc.componentName ?? '').toLowerCase().includes('basic'));
                const basicVal = basicComp?.calculationMethod === 'Fixed' ? (basicComp.value ?? 0) : Math.round(monthlyGross * 0.4);
                monthly = Math.round(basicVal * ((c.value ?? 0) / 100));
            }
            return { name: c.componentName ?? 'Component', monthly };
        });
    }, [structureId, ctcNum, structureData, monthlyGross]);

    const handleSave = () => {
        if (!employeeId || !structureId || ctcNum <= 0) return;
        onSave({ employeeId, structureId, annualCTC: ctcNum, effectiveFrom, components: breakup });
    };

    const isValid = employeeId && structureId && ctcNum > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '92%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">
                        {initialData ? 'Edit Salary' : 'Assign Salary'}
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Dropdown label="Employee" value={employeeId} options={employeeOptions} onSelect={setEmployeeId} placeholder="Search employee..." searchable />
                        <Dropdown label="Salary Structure" value={structureId} options={structureOptions} onSelect={setStructureId} placeholder="Select structure..." />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Annual CTC <Text className="text-danger-500">*</Text></Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <Text className="mr-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">&#8377;</Text>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="1000000" placeholderTextColor={colors.neutral[400]} value={annualCTC} onChangeText={setAnnualCTC} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Effective From</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={effectiveFrom} onChangeText={setEffectiveFrom} /></View>
                        </View>

                        {breakup.length > 0 && (
                            <>
                                <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400">Monthly Breakup Preview</Text>
                                <View style={styles.previewCard}>
                                    {breakup.map((row, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                                            <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">{row.name}</Text>
                                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{formatCurrency(row.monthly)}</Text>
                                        </View>
                                    ))}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
                                        <Text className="font-inter text-xs font-bold text-primary-800">Monthly Gross</Text>
                                        <Text className="font-inter text-xs font-bold text-primary-800">{formatCurrency(monthlyGross)}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!isValid || isSaving} style={[styles.saveBtn, (!isValid || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'Update' : 'Assign Salary'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ CARD ============

function EmployeeSalaryCard({ item, index, onEdit }: { item: EmployeeSalaryItem; index: number; onEdit: () => void }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.employeeName}</Text>
                            {item.isCurrent && (
                                <View style={[styles.currentBadge]}>
                                    <Text style={{ color: colors.success[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>Current</Text>
                                </View>
                            )}
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.structureName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-sm font-bold text-primary-800">{formatCurrency(item.annualCTC)}</Text>
                        <Text className="font-inter text-[10px] text-neutral-400">per annum</Text>
                    </View>
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Monthly: {formatCurrency(item.monthlyGross)}</Text></View>
                    <View style={styles.metaChip}><Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">From: {item.effectiveFrom}</Text></View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function EmployeeSalaryScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch, isFetching } = useEmployeeSalaries();
    const assignMutation = useAssignEmployeeSalary();
    const updateMutation = useUpdateEmployeeSalary();

    const { data: empResponse } = useEmployees();
    const { data: structResponse } = useSalaryStructures();

    const [formVisible, setFormVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<EmployeeSalaryItem | null>(null);
    const [search, setSearch] = React.useState('');

    const toOptions = (res: any) => {
        const raw = (res as any)?.data ?? res ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({ id: item.id ?? '', label: item.name ?? '' }));
    };

    const employeeOptions = React.useMemo(() => toOptions(empResponse), [empResponse]);
    const structureOptions = React.useMemo(() => toOptions(structResponse), [structResponse]);
    const structureData = React.useMemo(() => {
        const raw = (structResponse as any)?.data ?? structResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [structResponse]);

    const items: EmployeeSalaryItem[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
            const emp = item.employee;
            const empName = emp
                ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
                : '';
            const ctc = item.annualCtc ?? item.annualCTC ?? 0;
            return {
                id: item.id ?? '',
                employeeId: item.employeeId ?? emp?.employeeId ?? '',
                employeeName: empName,
                structureId: item.structureId ?? '',
                structureName: item.structure?.name ?? '',
                annualCTC: ctc,
                monthlyGross: Math.round(ctc / 12),
                effectiveFrom: item.effectiveFrom ?? '',
                isCurrent: item.isCurrent ?? true,
                components: item.components ?? [],
            };
        });
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i => i.employeeName.toLowerCase().includes(q));
    }, [items, search]);

    const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
    const handleEdit = (item: EmployeeSalaryItem) => { setEditingItem(item); setFormVisible(true); };
    const handleSave = (data: Record<string, unknown>) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => setFormVisible(false) });
        } else {
            assignMutation.mutate(data, { onSuccess: () => setFormVisible(false) });
        }
    };

    const renderItem = ({ item, index }: { item: EmployeeSalaryItem; index: number }) => (
        <EmployeeSalaryCard item={item} index={index} onEdit={() => handleEdit(item)} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Employee Salaries</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} record{items.length !== 1 ? 's' : ''}</Text>
            <View style={{ marginTop: 16 }}><SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee name..." /></View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load salaries" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No records match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No salary records yet" message="Assign salary to an employee to get started." /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Employee Salaries" onMenuPress={toggle} />
            <FlashList data={filtered} renderItem={renderItem} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
            <FAB onPress={handleAdd} />
            <AssignSalaryModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave}
                initialData={editingItem} isSaving={assignMutation.isPending || updateMutation.isPending}
                employeeOptions={employeeOptions} structureOptions={structureOptions} structureData={structureData}
            />
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
    metaChip: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    currentBadge: { backgroundColor: colors.success[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    previewCard: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, padding: 12, marginBottom: 12,
        borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    fieldWrap: { marginBottom: 14 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
