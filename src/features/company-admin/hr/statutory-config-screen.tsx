/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
    useCreateLWFConfig,
    useCreatePTConfig,
    useDeleteLWFConfig,
    useDeletePTConfig,
    useUpdateBonusConfig,
    useUpdateESIConfig,
    useUpdateGratuityConfig,
    useUpdatePFConfig,
} from '@/features/company-admin/api/use-payroll-mutations';
import {
    useBonusConfig,
    useESIConfig,
    useGratuityConfig,
    useLWFConfigs,
    usePFConfig,
    usePTConfigs,
} from '@/features/company-admin/api/use-payroll-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface PFForm {
    employeeRate: string; employerEPFRate: string; epsRate: string; edliRate: string; adminChargeRate: string;
    wageCeiling: string; vpfEnabled: boolean; vpfMaxRate: string; excludedComponents: string;
}

interface ESIForm { employeeRate: string; employerRate: string; wageCeiling: string; }

interface PTConfigItem { id: string; state: string; slabs: { from: number; to: number; tax: number }[]; frequency: string; registrationNumber: string; financialYear?: string; monthlyOverrides?: Record<string, number>; }

interface GratuityForm { formula: string; baseSalary: string; maxAmount: string; provisionMethod: string; trustEnabled: boolean; }

interface BonusForm { wageCeiling: string; minBonusPercent: string; maxBonusPercent: string; eligibilityDays: string; calculationPeriod: string; }

interface LWFItem { id: string; state: string; employeeAmount: string; employerAmount: string; frequency: string; }

// ============ INDIAN STATES ============

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const PT_FREQUENCIES = ['Monthly', 'Half-Yearly', 'Annual'];
const LWF_FREQUENCIES = ['Monthly', 'Half-Yearly', 'Annual'];

// ============ SHARED ATOMS ============

function SectionCard({ title, subtitle, collapsed, onToggle, children }: { title: string; subtitle?: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Pressable onPress={onToggle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
                    {subtitle && <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">{subtitle}</Text>}
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d={collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {!collapsed && <View style={{ marginTop: 12 }}>{children}</View>}
        </View>
    );
}

function NumberField({ label, value, onChange, placeholder, suffix }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">{label}</Text>
            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder={placeholder} placeholderTextColor={colors.neutral[400]} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
                {suffix && <Text className="ml-2 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
        </View>
    );
}

function ToggleRow({ label, subtitle, value, onToggle }: { label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
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

function SaveSectionBtn({ onPress, isPending, hasChanges }: { onPress: () => void; isPending: boolean; hasChanges: boolean }) {
    return (
        <Pressable onPress={onPress} disabled={!hasChanges || isPending} style={[styles.sectionSaveBtn, (!hasChanges || isPending) && { opacity: 0.5 }]}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-xs font-bold text-white">{hasChanges ? 'Save' : 'Saved'}</Text>}
        </Pressable>
    );
}

function StateDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
    const [open, setOpen] = React.useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">State</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.dropdownBtn}>
                <Text className={`font-inter text-sm ${value ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>{value || 'Select state...'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
                    <View style={[styles.formSheet, { paddingBottom: 40, maxHeight: '70%' }]}>
                        <View style={styles.sheetHandle} />
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Select State</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {INDIAN_STATES.map(state => (
                                <Pressable key={state} onPress={() => { onSelect(state); setOpen(false); }}
                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], backgroundColor: state === value ? colors.primary[50] : undefined, paddingHorizontal: 4, borderRadius: 8 }}>
                                    <Text className={`font-inter text-sm ${state === value ? 'font-bold text-primary-700' : 'text-primary-950 dark:text-white'}`}>{state}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============ PT FORM MODAL ============

function PTFormModal({ visible, onClose, onSave, isSaving }: { visible: boolean; onClose: () => void; onSave: (data: Record<string, unknown>) => void; isSaving: boolean }) {
    const insets = useSafeAreaInsets();
    const [state, setState] = React.useState('');
    const [slabs, setSlabs] = React.useState<{ from: string; to: string; tax: string }[]>([{ from: '0', to: '15000', tax: '0' }]);
    const [frequency, setFrequency] = React.useState('Monthly');
    const [regNumber, setRegNumber] = React.useState('');
    const [financialYear, setFinancialYear] = React.useState('');
    const [monthlyOverrides, setMonthlyOverrides] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) { setState(''); setSlabs([{ from: '0', to: '15000', tax: '0' }]); setFrequency('Monthly'); setRegNumber(''); setFinancialYear(''); setMonthlyOverrides({}); }
    }, [visible]);

    const addSlab = () => setSlabs(prev => [...prev, { from: '', to: '', tax: '' }]);
    const removeSlab = (idx: number) => setSlabs(prev => prev.filter((_, i) => i !== idx));
    const updateSlab = (idx: number, key: string, val: string) => setSlabs(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));

    const handleSave = () => {
        if (!state) return;
        const overridesPayload: Record<string, number> = {};
        Object.entries(monthlyOverrides).forEach(([k, v]) => { if (v !== '') overridesPayload[k] = Number(v) || 0; });
        onSave({
            state, frequency, registrationNumber: regNumber,
            financialYear: financialYear || undefined,
            monthlyOverrides: Object.keys(overridesPayload).length > 0 ? overridesPayload : undefined,
            slabs: slabs.map(s => ({ from: Number(s.from) || 0, to: Number(s.to) || 0, tax: Number(s.tax) || 0 })),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20, maxHeight: '85%' }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">Add PT Config</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <StateDropdown value={state} onSelect={setState} />
                        <ChipSelector label="Frequency" options={PT_FREQUENCIES} value={frequency} onSelect={setFrequency} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Registration Number</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="PT Registration No." placeholderTextColor={colors.neutral[400]} value={regNumber} onChangeText={setRegNumber} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Financial Year</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="e.g. 2025-26" placeholderTextColor={colors.neutral[400]} value={financialYear} onChangeText={setFinancialYear} /></View>
                        </View>
                        <Text className="mb-2 mt-2 font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400">Tax Slabs</Text>
                        {slabs.map((slab, idx) => (
                            <View key={idx} style={styles.slabRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text className="mb-1 font-inter text-[10px] text-neutral-400">From</Text>
                                            <View style={styles.inputWrapSmall}><TextInput style={styles.textInputSmall} value={slab.from} onChangeText={v => updateSlab(idx, 'from', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} /></View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text className="mb-1 font-inter text-[10px] text-neutral-400">To</Text>
                                            <View style={styles.inputWrapSmall}><TextInput style={styles.textInputSmall} value={slab.to} onChangeText={v => updateSlab(idx, 'to', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} /></View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text className="mb-1 font-inter text-[10px] text-neutral-400">Tax</Text>
                                            <View style={styles.inputWrapSmall}><TextInput style={styles.textInputSmall} value={slab.tax} onChangeText={v => updateSlab(idx, 'tax', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} /></View>
                                        </View>
                                    </View>
                                </View>
                                {slabs.length > 1 && (
                                    <Pressable onPress={() => removeSlab(idx)} hitSlop={8} style={{ marginLeft: 8, marginTop: 16 }}>
                                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                        <Pressable onPress={addSlab} style={styles.addBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add Slab</Text>
                        </Pressable>
                        <Text className="mb-1 mt-4 font-inter text-xs font-bold text-neutral-500 dark:text-neutral-400">Monthly Overrides</Text>
                        <Text className="mb-2 font-inter text-[10px] text-neutral-400">Override PT amount for specific months</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const).map((label, i) => {
                                const month = String(i + 1);
                                return (
                                    <View key={month} style={{ width: '22%' }}>
                                        <Text className="mb-1 font-inter text-[10px] text-neutral-400">{label}</Text>
                                        <View style={styles.inputWrapSmall}>
                                            <TextInput style={styles.textInputSmall} value={monthlyOverrides[month] ?? ''} onChangeText={v => setMonthlyOverrides(prev => {
                                                const next = { ...prev };
                                                if (v === '') { delete next[month]; } else { next[month] = v; }
                                                return next;
                                            })} keyboardType="number-pad" placeholder="-" placeholderTextColor={colors.neutral[300]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!state || isSaving} style={[styles.saveBtn, (!state || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Add Config'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ LWF FORM MODAL ============

function LWFFormModal({ visible, onClose, onSave, isSaving }: { visible: boolean; onClose: () => void; onSave: (data: Record<string, unknown>) => void; isSaving: boolean }) {
    const insets = useSafeAreaInsets();
    const [state, setState] = React.useState('');
    const [empAmount, setEmpAmount] = React.useState('');
    const [erAmount, setErAmount] = React.useState('');
    const [frequency, setFrequency] = React.useState('Half-Yearly');

    React.useEffect(() => {
        if (visible) { setState(''); setEmpAmount(''); setErAmount(''); setFrequency('Half-Yearly'); }
    }, [visible]);

    const handleSave = () => {
        if (!state) return;
        onSave({ state, employeeAmount: Number(empAmount) || 0, employerAmount: Number(erAmount) || 0, frequency });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[styles.formSheet, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.sheetHandle} />
                    <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-2">Add LWF Config</Text>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <StateDropdown value={state} onSelect={setState} />
                        <NumberField label="Employee Amount" value={empAmount} onChange={setEmpAmount} placeholder="0" suffix="₹" />
                        <NumberField label="Employer Amount" value={erAmount} onChange={setErAmount} placeholder="0" suffix="₹" />
                        <ChipSelector label="Frequency" options={LWF_FREQUENCIES} value={frequency} onSelect={setFrequency} />
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}><Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={!state || isSaving} style={[styles.saveBtn, (!state || isSaving) && { opacity: 0.5 }]}>
                            <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : 'Add Config'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============ MAIN ============

export function StatutoryConfigScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    // Queries
    const { data: pfResponse, isLoading: pfLoading, error: pfError, refetch: pfRefetch } = usePFConfig();
    const { data: esiResponse } = useESIConfig();
    const { data: ptResponse } = usePTConfigs();
    const { data: gratuityResponse } = useGratuityConfig();
    const { data: bonusResponse } = useBonusConfig();
    const { data: lwfResponse } = useLWFConfigs();

    // Mutations
    const updatePF = useUpdatePFConfig();
    const updateESI = useUpdateESIConfig();
    const createPT = useCreatePTConfig();
    const deletePT = useDeletePTConfig();
    const updateGratuity = useUpdateGratuityConfig();
    const updateBonus = useUpdateBonusConfig();
    const createLWF = useCreateLWFConfig();
    const deleteLWF = useDeleteLWFConfig();

    // Section collapse state
    const [collapsed, setCollapsed] = React.useState({ pf: false, esi: true, pt: true, gratuity: true, bonus: true, lwf: true });
    const toggleSection = (key: keyof typeof collapsed) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // PF form
    const [pfForm, setPFForm] = React.useState<PFForm>({ employeeRate: '12', employerEPFRate: '3.67', epsRate: '8.33', edliRate: '0.5', adminChargeRate: '0.5', wageCeiling: '15000', vpfEnabled: false, vpfMaxRate: '', excludedComponents: '' });
    const [pfDirty, setPFDirty] = React.useState(false);
    React.useEffect(() => {
        if (pfResponse) {
            const d = (pfResponse as any)?.data ?? pfResponse;
            if (d && typeof d === 'object') {
                setPFForm({
                    employeeRate: String(d.employeeRate ?? '12'), employerEPFRate: String(d.employerEPFRate ?? '3.67'),
                    epsRate: String(d.epsRate ?? '8.33'), edliRate: String(d.edliRate ?? '0.5'), adminChargeRate: String(d.adminChargeRate ?? '0.5'),
                    wageCeiling: String(d.wageCeiling ?? '15000'), vpfEnabled: d.vpfEnabled ?? false,
                    vpfMaxRate: d.vpfMaxRate ? String(d.vpfMaxRate) : '',
                    excludedComponents: d.excludedComponents ?? '',
                });
                setPFDirty(false);
            }
        }
    }, [pfResponse]);

    // ESI form
    const [esiForm, setESIForm] = React.useState<ESIForm>({ employeeRate: '0.75', employerRate: '3.25', wageCeiling: '21000' });
    const [esiDirty, setESIDirty] = React.useState(false);
    React.useEffect(() => {
        if (esiResponse) {
            const d = (esiResponse as any)?.data ?? esiResponse;
            if (d && typeof d === 'object') {
                setESIForm({ employeeRate: String(d.employeeRate ?? '0.75'), employerRate: String(d.employerRate ?? '3.25'), wageCeiling: String(d.wageCeiling ?? '21000') });
                setESIDirty(false);
            }
        }
    }, [esiResponse]);

    // PT list
    const ptConfigs: PTConfigItem[] = React.useMemo(() => {
        const raw = (ptResponse as any)?.data ?? ptResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', state: item.state ?? '', slabs: item.slabs ?? [], frequency: item.frequency ?? 'Monthly', registrationNumber: item.registrationNumber ?? '',
            financialYear: item.financialYear ?? '', monthlyOverrides: item.monthlyOverrides ?? {},
        }));
    }, [ptResponse]);
    const [ptFormVisible, setPTFormVisible] = React.useState(false);

    // Gratuity form
    const [gratuityForm, setGratuityForm] = React.useState<GratuityForm>({ formula: '(Basic * 15 * Years) / 26', baseSalary: 'Basic', maxAmount: '2000000', provisionMethod: 'Monthly', trustEnabled: false });
    const [gratuityDirty, setGratuityDirty] = React.useState(false);
    React.useEffect(() => {
        if (gratuityResponse) {
            const d = (gratuityResponse as any)?.data ?? gratuityResponse;
            if (d && typeof d === 'object') {
                setGratuityForm({
                    formula: d.formula ?? '(Basic * 15 * Years) / 26', baseSalary: d.baseSalary ?? 'Basic',
                    maxAmount: String(d.maxAmount ?? '2000000'), provisionMethod: d.provisionMethod ?? 'Monthly', trustEnabled: d.trustEnabled ?? false,
                });
                setGratuityDirty(false);
            }
        }
    }, [gratuityResponse]);

    // Bonus form
    const [bonusForm, setBonusForm] = React.useState<BonusForm>({ wageCeiling: '21000', minBonusPercent: '8.33', maxBonusPercent: '20', eligibilityDays: '30', calculationPeriod: 'April-March' });
    const [bonusDirty, setBonusDirty] = React.useState(false);
    React.useEffect(() => {
        if (bonusResponse) {
            const d = (bonusResponse as any)?.data ?? bonusResponse;
            if (d && typeof d === 'object') {
                setBonusForm({
                    wageCeiling: String(d.wageCeiling ?? '21000'), minBonusPercent: String(d.minBonusPercent ?? '8.33'),
                    maxBonusPercent: String(d.maxBonusPercent ?? '20'), eligibilityDays: String(d.eligibilityDays ?? '30'),
                    calculationPeriod: d.calculationPeriod ?? 'April-March',
                });
                setBonusDirty(false);
            }
        }
    }, [bonusResponse]);

    // LWF list
    const lwfConfigs: LWFItem[] = React.useMemo(() => {
        const raw = (lwfResponse as any)?.data ?? lwfResponse ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id ?? '', state: item.state ?? '', employeeAmount: String(item.employeeAmount ?? 0),
            employerAmount: String(item.employerAmount ?? 0), frequency: item.frequency ?? 'Half-Yearly',
        }));
    }, [lwfResponse]);
    const [lwfFormVisible, setLWFFormVisible] = React.useState(false);

    // Save handlers
    const handleSavePF = () => {
        updatePF.mutate({
            ...pfForm, employeeRate: Number(pfForm.employeeRate), employerEPFRate: Number(pfForm.employerEPFRate),
            epsRate: Number(pfForm.epsRate), edliRate: Number(pfForm.edliRate), adminChargeRate: Number(pfForm.adminChargeRate),
            wageCeiling: Number(pfForm.wageCeiling),
            vpfMaxRate: pfForm.vpfMaxRate ? Number(pfForm.vpfMaxRate) : null,
        } as unknown as Record<string, unknown>, { onSuccess: () => setPFDirty(false) });
    };

    const handleSaveESI = () => {
        updateESI.mutate({
            employeeRate: Number(esiForm.employeeRate), employerRate: Number(esiForm.employerRate), wageCeiling: Number(esiForm.wageCeiling),
        } as unknown as Record<string, unknown>, { onSuccess: () => setESIDirty(false) });
    };

    const handleSaveGratuity = () => {
        updateGratuity.mutate({
            ...gratuityForm, maxAmount: Number(gratuityForm.maxAmount),
        } as unknown as Record<string, unknown>, { onSuccess: () => setGratuityDirty(false) });
    };

    const handleSaveBonus = () => {
        updateBonus.mutate({
            wageCeiling: Number(bonusForm.wageCeiling), minBonusPercent: Number(bonusForm.minBonusPercent),
            maxBonusPercent: Number(bonusForm.maxBonusPercent), eligibilityDays: Number(bonusForm.eligibilityDays),
            calculationPeriod: bonusForm.calculationPeriod,
        } as unknown as Record<string, unknown>, { onSuccess: () => setBonusDirty(false) });
    };

    const handleDeletePT = (item: PTConfigItem) => {
        showConfirm({
            title: 'Delete PT Config', message: `Remove PT configuration for ${item.state}?`,
            confirmText: 'Delete', variant: 'danger', onConfirm: () => deletePT.mutate(item.id),
        });
    };

    const handleDeleteLWF = (item: LWFItem) => {
        showConfirm({
            title: 'Delete LWF Config', message: `Remove LWF configuration for ${item.state}?`,
            confirmText: 'Delete', variant: 'danger', onConfirm: () => deleteLWF.mutate(item.id),
        });
    };

    if (pfLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Statutory Config" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (pfError) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Statutory Config" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => pfRefetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Statutory Config" onMenuPress={toggle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Statutory Configuration</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">PF, ESI, PT, Gratuity, Bonus, LWF</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* PF */}
                    <SectionCard title="PF Configuration" subtitle="Provident Fund rates and limits" collapsed={collapsed.pf} onToggle={() => toggleSection('pf')}>
                        <NumberField label="Employee Rate" value={pfForm.employeeRate} onChange={v => { setPFForm(p => ({ ...p, employeeRate: v })); setPFDirty(true); }} placeholder="12" suffix="%" />
                        <NumberField label="Employer EPF Rate" value={pfForm.employerEPFRate} onChange={v => { setPFForm(p => ({ ...p, employerEPFRate: v })); setPFDirty(true); }} placeholder="3.67" suffix="%" />
                        <NumberField label="EPS Rate" value={pfForm.epsRate} onChange={v => { setPFForm(p => ({ ...p, epsRate: v })); setPFDirty(true); }} placeholder="8.33" suffix="%" />
                        <NumberField label="EDLI Rate" value={pfForm.edliRate} onChange={v => { setPFForm(p => ({ ...p, edliRate: v })); setPFDirty(true); }} placeholder="0.5" suffix="%" />
                        <NumberField label="Admin Charge Rate" value={pfForm.adminChargeRate} onChange={v => { setPFForm(p => ({ ...p, adminChargeRate: v })); setPFDirty(true); }} placeholder="0.5" suffix="%" />
                        <NumberField label="Wage Ceiling" value={pfForm.wageCeiling} onChange={v => { setPFForm(p => ({ ...p, wageCeiling: v })); setPFDirty(true); }} placeholder="15000" suffix="₹" />
                        <ToggleRow label="VPF Enabled" subtitle="Allow Voluntary Provident Fund" value={pfForm.vpfEnabled} onToggle={v => { setPFForm(p => ({ ...p, vpfEnabled: v })); setPFDirty(true); }} />
                        {pfForm.vpfEnabled && (
                            <View>
                                <NumberField label="Maximum VPF Rate (%)" value={pfForm.vpfMaxRate} onChange={v => { setPFForm(p => ({ ...p, vpfMaxRate: v })); setPFDirty(true); }} placeholder="0" suffix="%" />
                                <Text className="mt-0.5 ml-1 font-inter text-[10px] text-neutral-400">Leave empty for no cap</Text>
                            </View>
                        )}
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Excluded Components</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Comma-separated" placeholderTextColor={colors.neutral[400]} value={pfForm.excludedComponents} onChangeText={v => { setPFForm(p => ({ ...p, excludedComponents: v })); setPFDirty(true); }} /></View>
                        </View>
                        <SaveSectionBtn onPress={handleSavePF} isPending={updatePF.isPending} hasChanges={pfDirty} />
                    </SectionCard>

                    {/* ESI */}
                    <SectionCard title="ESI Configuration" subtitle="Employee State Insurance rates" collapsed={collapsed.esi} onToggle={() => toggleSection('esi')}>
                        <NumberField label="Employee Rate" value={esiForm.employeeRate} onChange={v => { setESIForm(p => ({ ...p, employeeRate: v })); setESIDirty(true); }} placeholder="0.75" suffix="%" />
                        <NumberField label="Employer Rate" value={esiForm.employerRate} onChange={v => { setESIForm(p => ({ ...p, employerRate: v })); setESIDirty(true); }} placeholder="3.25" suffix="%" />
                        <NumberField label="Wage Ceiling" value={esiForm.wageCeiling} onChange={v => { setESIForm(p => ({ ...p, wageCeiling: v })); setESIDirty(true); }} placeholder="21000" suffix="₹" />
                        <SaveSectionBtn onPress={handleSaveESI} isPending={updateESI.isPending} hasChanges={esiDirty} />
                    </SectionCard>

                    {/* PT */}
                    <SectionCard title="Professional Tax" subtitle="State-wise PT configuration" collapsed={collapsed.pt} onToggle={() => toggleSection('pt')}>
                        {ptConfigs.map(pt => (
                            <View key={pt.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{pt.state}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{pt.slabs.length} slab{pt.slabs.length !== 1 ? 's' : ''}  {'\u00B7'}  {pt.frequency}{pt.financialYear ? `  \u00B7  FY ${pt.financialYear}` : ''}</Text>
                                </View>
                                <Pressable onPress={() => handleDeletePT(pt)} hitSlop={8}>
                                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={() => setPTFormVisible(true)} style={styles.addBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add State</Text>
                        </Pressable>
                    </SectionCard>

                    {/* Gratuity */}
                    <SectionCard title="Gratuity" subtitle="Gratuity calculation settings" collapsed={collapsed.gratuity} onToggle={() => toggleSection('gratuity')}>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Formula</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="(Basic * 15 * Years) / 26" placeholderTextColor={colors.neutral[400]} value={gratuityForm.formula} onChangeText={v => { setGratuityForm(p => ({ ...p, formula: v })); setGratuityDirty(true); }} /></View>
                        </View>
                        <ChipSelector label="Base Salary" options={['Basic', 'Basic+DA']} value={gratuityForm.baseSalary} onSelect={v => { setGratuityForm(p => ({ ...p, baseSalary: v })); setGratuityDirty(true); }} />
                        <NumberField label="Max Amount" value={gratuityForm.maxAmount} onChange={v => { setGratuityForm(p => ({ ...p, maxAmount: v })); setGratuityDirty(true); }} placeholder="2000000" suffix="₹" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Provision Method</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="Monthly" placeholderTextColor={colors.neutral[400]} value={gratuityForm.provisionMethod} onChangeText={v => { setGratuityForm(p => ({ ...p, provisionMethod: v })); setGratuityDirty(true); }} /></View>
                        </View>
                        <ToggleRow label="Gratuity Trust" subtitle="Company-managed gratuity trust" value={gratuityForm.trustEnabled} onToggle={v => { setGratuityForm(p => ({ ...p, trustEnabled: v })); setGratuityDirty(true); }} />
                        <SaveSectionBtn onPress={handleSaveGratuity} isPending={updateGratuity.isPending} hasChanges={gratuityDirty} />
                    </SectionCard>

                    {/* Bonus */}
                    <SectionCard title="Bonus" subtitle="Statutory bonus calculation" collapsed={collapsed.bonus} onToggle={() => toggleSection('bonus')}>
                        <NumberField label="Wage Ceiling" value={bonusForm.wageCeiling} onChange={v => { setBonusForm(p => ({ ...p, wageCeiling: v })); setBonusDirty(true); }} placeholder="21000" suffix="₹" />
                        <NumberField label="Min Bonus %" value={bonusForm.minBonusPercent} onChange={v => { setBonusForm(p => ({ ...p, minBonusPercent: v })); setBonusDirty(true); }} placeholder="8.33" suffix="%" />
                        <NumberField label="Max Bonus %" value={bonusForm.maxBonusPercent} onChange={v => { setBonusForm(p => ({ ...p, maxBonusPercent: v })); setBonusDirty(true); }} placeholder="20" suffix="%" />
                        <NumberField label="Eligibility Days" value={bonusForm.eligibilityDays} onChange={v => { setBonusForm(p => ({ ...p, eligibilityDays: v })); setBonusDirty(true); }} placeholder="30" />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Calculation Period</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="April-March" placeholderTextColor={colors.neutral[400]} value={bonusForm.calculationPeriod} onChangeText={v => { setBonusForm(p => ({ ...p, calculationPeriod: v })); setBonusDirty(true); }} /></View>
                        </View>
                        <SaveSectionBtn onPress={handleSaveBonus} isPending={updateBonus.isPending} hasChanges={bonusDirty} />
                    </SectionCard>

                    {/* LWF */}
                    <SectionCard title="Labour Welfare Fund" subtitle="State-wise LWF contributions" collapsed={collapsed.lwf} onToggle={() => toggleSection('lwf')}>
                        {lwfConfigs.map(lwf => (
                            <View key={lwf.id} style={styles.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{lwf.state}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Emp: ₹{lwf.employeeAmount}  {'\u00B7'}  Er: ₹{lwf.employerAmount}  {'\u00B7'}  {lwf.frequency}</Text>
                                </View>
                                <Pressable onPress={() => handleDeleteLWF(lwf)} hitSlop={8}>
                                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={() => setLWFFormVisible(true)} style={styles.addBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add State</Text>
                        </Pressable>
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            <PTFormModal visible={ptFormVisible} onClose={() => setPTFormVisible(false)}
                onSave={data => { createPT.mutate(data as Record<string, unknown>, { onSuccess: () => setPTFormVisible(false) }); }}
                isSaving={createPT.isPending}
            />
            <LWFFormModal visible={lwfFormVisible} onClose={() => setLWFFormVisible(false)}
                onSave={data => { createLWF.mutate(data as Record<string, unknown>, { onSuccess: () => setLWFFormVisible(false) }); }}
                isSaving={createLWF.isPending}
            />
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    sectionCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    fieldWrap: { marginTop: 12, marginBottom: 4 },
    inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    inputWrapSmall: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 8, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 10, height: 38, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    textInputSmall: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', marginTop: 8,
    },
    slabRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    sectionSaveBtn: {
        marginTop: 12, height: 40, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
    },
    dropdownBtn: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    formSheet: { backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
    cancelBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
    saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
const styles = createStyles(false);
