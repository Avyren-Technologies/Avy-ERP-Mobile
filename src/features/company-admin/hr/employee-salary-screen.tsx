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
import { useEmployeeSalaries, useSalaryStructures, useSalaryComponents, usePFConfig, useESIConfig, useGratuityConfig } from '@/features/company-admin/api/use-payroll-queries';
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
        const comps = struct.components as any[];

        // Normalize calculation method to uppercase enum form
        const getMethod = (c: any) => {
            const m = (c.calculationMethod ?? c.method ?? '').toString();
            // Handle both display strings and enum values
            if (m === 'Fixed' || m === 'FIXED') return 'FIXED';
            if (m === '% of Gross' || m === 'PERCENT_OF_GROSS' || m === 'PERCENTAGE_OF_CTC') return 'PERCENT_OF_GROSS';
            if (m === '% of Basic' || m === 'PERCENT_OF_BASIC' || m === 'PERCENTAGE_OF_BASIC') return 'PERCENT_OF_BASIC';
            if (m === 'Formula' || m === 'FORMULA') return 'FORMULA';
            if (m === 'Balance' || m === 'BALANCE' || m === 'Balance (Auto)') return 'BALANCE';
            return m.toUpperCase();
        };

        // First pass: find basic amount
        let basicAmt = 0;
        for (const c of comps) {
            const name = (c.componentName ?? '').toLowerCase();
            const code = (c.componentCode ?? '').toUpperCase();
            const isBasic = code === 'BASIC' || name.includes('basic');
            if (isBasic) {
                const m = getMethod(c);
                if (m === 'FIXED') basicAmt = c.value ?? 0;
                else if (m === 'PERCENT_OF_GROSS') basicAmt = Math.round(monthlyGross * ((c.value ?? 0) / 100));
            }
        }
        if (!basicAmt) basicAmt = Math.round(monthlyGross * 0.4);

        // Second pass: compute all non-BALANCE components
        const rows = comps.map((c: any) => {
            const m = getMethod(c);
            const val = Number(c.value) || 0;
            const isBalance = m === 'BALANCE';
            let monthly = 0;
            if (m === 'FIXED') monthly = val;
            else if (m === 'PERCENT_OF_GROSS') monthly = Math.round(monthlyGross * (val / 100));
            else if (m === 'PERCENT_OF_BASIC') monthly = Math.round(basicAmt * (val / 100));
            else if (m === 'FORMULA') {
                const formula = (c.formula ?? c.formulaValue ?? '').toString().toLowerCase();
                const match = formula.match(/([\d.]+)%?\s*of\s*(gross|basic)/);
                if (match) {
                    const pct = parseFloat(match[1]);
                    monthly = match[2] === 'basic' ? Math.round(basicAmt * pct / 100) : Math.round(monthlyGross * pct / 100);
                }
            }
            return { name: c.componentName ?? 'Component', monthly, isBalance, componentId: c.componentId };
        });

        // Third pass: fill BALANCE components with remainder
        const totalBeforeBalance = rows.filter(r => !r.isBalance).reduce((s, r) => s + r.monthly, 0);
        let balanceFilled = false;
        for (const row of rows) {
            if (row.isBalance && !balanceFilled) {
                row.monthly = Math.max(0, Math.round(monthlyGross - totalBeforeBalance));
                balanceFilled = true;
            }
        }

        return rows;
    }, [structureId, ctcNum, structureData, monthlyGross]);

    // Statutory estimates
    const { data: compResponse } = useSalaryComponents();
    const allComps: any[] = (compResponse as any)?.data ?? [];
    const { data: pfCfgData } = usePFConfig();
    const pfCfg = (pfCfgData as any)?.data;
    const { data: esiCfgData } = useESIConfig();
    const esiCfg = (esiCfgData as any)?.data;
    const { data: gratCfgData } = useGratuityConfig();
    const gratCfg = (gratCfgData as any)?.data;

    const statutoryEstimates = React.useMemo(() => {
        if (breakup.length === 0 || !structureId) return null;
        const struct = structureData.find((s: any) => (s.id ?? '') === structureId);
        if (!struct?.components) return null;
        const estimates: { label: string; monthly: number; category: 'deduction' | 'employer' }[] = [];
        const grossSalary = breakup.reduce((s, r) => s + r.monthly, 0);
        let pfBase = 0; let esiBase = 0; let gratBase = 0;
        for (const c of struct.components as any[]) {
            const master = allComps.find((mc: any) => mc.id === c.componentId || mc.code === c.componentCode);
            if (!master) continue;
            const row = breakup.find(b => b.name === (c.componentName || master.name));
            const val = row?.monthly ?? 0;
            if (master.pfInclusion) pfBase += val;
            if (master.esiInclusion) esiBase += val;
            if (master.gratuityInclusion) gratBase += val;
        }
        if (pfCfg && pfBase > 0) {
            const capped = Math.min(pfBase, Number(pfCfg.wageCeiling ?? 15000));
            const pfEmp = Math.round(capped * Number(pfCfg.employeeRate ?? 12) / 100);
            const pfErEpf = Math.round(capped * Number(pfCfg.employerEpfRate ?? 3.67) / 100);
            const pfErEps = Math.round(capped * Number(pfCfg.employerEpsRate ?? 8.33) / 100);
            estimates.push({ label: 'PF (Employee)', monthly: pfEmp, category: 'deduction' });
            estimates.push({ label: 'PF (Employer)', monthly: pfErEpf + pfErEps, category: 'employer' });
        }
        if (esiCfg) {
            const base = esiBase > 0 ? esiBase : grossSalary;
            if (base <= Number(esiCfg.wageCeiling ?? 21000)) {
                const esiEmp = Math.round(base * Number(esiCfg.employeeRate ?? 0.75) / 100);
                const esiEr = Math.round(base * Number(esiCfg.employerRate ?? 3.25) / 100);
                estimates.push({ label: 'ESI (Employee)', monthly: esiEmp, category: 'deduction' });
                estimates.push({ label: 'ESI (Employer)', monthly: esiEr, category: 'employer' });
            }
        }
        if (gratCfg?.provisionMethod === 'MONTHLY' && gratBase > 0) {
            const annual = (gratBase * 15 * 1) / 26;
            const capped = Math.min(annual, Number(gratCfg.maxAmount ?? 2000000));
            estimates.push({ label: 'Gratuity (Employer)', monthly: Math.round(capped / 12), category: 'employer' });
        }
        if (estimates.length === 0) return null;

        const deductions = estimates.filter(e => e.category === 'deduction');
        const employer = estimates.filter(e => e.category === 'employer');
        const totalDeductions = deductions.reduce((s, e) => s + e.monthly, 0);
        const totalEmployer = employer.reduce((s, e) => s + e.monthly, 0);
        const netTakeHome = grossSalary - totalDeductions;
        const totalCtc = grossSalary + totalEmployer;

        return { deductions, employer, totalDeductions, totalEmployer, netTakeHome, totalCtc, grossSalary };
    }, [breakup, structureId, structureData, allComps, pfCfg, esiCfg, gratCfg]);

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
                                        <Text className="font-inter text-xs font-bold text-primary-800">Gross Salary</Text>
                                        <Text className="font-inter text-xs font-bold text-primary-800">{formatCurrency(breakup.reduce((s, r) => s + r.monthly, 0))}</Text>
                                    </View>
                                </View>

                                {/* Statutory Estimates */}
                                {statutoryEstimates && (
                                    <>
                                        {/* Employee Deductions */}
                                        {statutoryEstimates.deductions.length > 0 && (
                                            <View style={[styles.previewCard, { backgroundColor: colors.warning[50], borderColor: colors.warning[200], borderWidth: 1, marginTop: 10 }]}>
                                                <Text className="mb-2 font-inter text-[10px] font-bold uppercase tracking-wider text-warning-600">Employee Deductions (Estimated)</Text>
                                                {statutoryEstimates.deductions.map((row, idx) => (
                                                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.warning[200] }}>
                                                        <Text className="font-inter text-xs text-warning-800">{row.label}</Text>
                                                        <Text className="font-inter text-xs font-semibold text-warning-700">{formatCurrency(row.monthly)}</Text>
                                                    </View>
                                                ))}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.warning[200] }}>
                                                    <Text className="font-inter text-xs font-bold text-warning-800">Est. Take-Home</Text>
                                                    <Text className="font-inter text-xs font-bold text-warning-700">{formatCurrency(statutoryEstimates.netTakeHome)}</Text>
                                                </View>
                                            </View>
                                        )}
                                        {/* Employer Contributions */}
                                        {statutoryEstimates.employer.length > 0 && (
                                            <View style={[styles.previewCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, marginTop: 10 }]}>
                                                <Text className="mb-2 font-inter text-[10px] font-bold uppercase tracking-wider text-blue-600">Employer Contributions (Estimated)</Text>
                                                {statutoryEstimates.employer.map((row, idx) => (
                                                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#bfdbfe' }}>
                                                        <Text className="font-inter text-xs text-blue-800">{row.label}</Text>
                                                        <Text className="font-inter text-xs font-semibold text-blue-700">{formatCurrency(row.monthly)}</Text>
                                                    </View>
                                                ))}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#bfdbfe' }}>
                                                    <Text className="font-inter text-xs font-bold text-blue-800">Total CTC</Text>
                                                    <Text className="font-inter text-xs font-bold text-blue-700">{formatCurrency(statutoryEstimates.totalCtc)}</Text>
                                                </View>
                                            </View>
                                        )}
                                        <Text className="mt-2 font-inter text-[9px] text-neutral-400">Based on current statutory config. Actual amounts vary with attendance and CTC.</Text>
                                    </>
                                )}
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
