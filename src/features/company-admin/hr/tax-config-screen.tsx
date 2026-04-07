/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useUpdateTaxConfig } from '@/features/company-admin/api/use-payroll-mutations';
import { useTaxConfig } from '@/features/company-admin/api/use-payroll-queries';

// ============ TYPES ============

type Regime = 'Old' | 'New';

interface TaxSlab { from: string; to: string; rate: string; }
interface SurchargeRate { threshold: string; rate: string; }

interface TaxConfigForm {
    defaultRegime: Regime;
    declarationDeadline: string;
    cessRate: string;
    oldSlabs: TaxSlab[];
    newSlabs: TaxSlab[];
    surchargeRates: SurchargeRate[];
}

// ============ CONSTANTS ============

const DEFAULT_OLD_SLABS: TaxSlab[] = [
    { from: '0', to: '250000', rate: '0' },
    { from: '250001', to: '500000', rate: '5' },
    { from: '500001', to: '1000000', rate: '20' },
    { from: '1000001', to: '999999999', rate: '30' },
];

const DEFAULT_NEW_SLABS: TaxSlab[] = [
    { from: '0', to: '300000', rate: '0' },
    { from: '300001', to: '700000', rate: '5' },
    { from: '700001', to: '1000000', rate: '10' },
    { from: '1000001', to: '1200000', rate: '15' },
    { from: '1200001', to: '1500000', rate: '20' },
    { from: '1500001', to: '999999999', rate: '30' },
];

const DEFAULT_FORM: TaxConfigForm = {
    defaultRegime: 'New',
    declarationDeadline: '',
    cessRate: '4',
    oldSlabs: DEFAULT_OLD_SLABS,
    newSlabs: DEFAULT_NEW_SLABS,
    surchargeRates: [],
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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
            {subtitle && <Text className="mb-3 font-inter text-xs text-neutral-500 leading-relaxed">{subtitle}</Text>}
            {!subtitle && <View style={{ height: 8 }} />}
            {children}
        </View>
    );
}

function SlabTable({ slabs, onUpdate, onAdd, onRemove }: {
    slabs: TaxSlab[];
    onUpdate: (idx: number, key: keyof TaxSlab, val: string) => void;
    onAdd: () => void; onRemove: (idx: number) => void;
}) {
    return (
        <View>
            {/* Header */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                <Text className="flex-1 font-inter text-[10px] font-bold text-neutral-400">From (₹)</Text>
                <Text className="flex-1 font-inter text-[10px] font-bold text-neutral-400">To (₹)</Text>
                <Text style={{ width: 60 }}><Text className="font-inter text-[10px] font-bold text-neutral-400">Rate %</Text></Text>
                <View style={{ width: 24 }} />
            </View>
            {slabs.map((slab, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <View style={[styles.inputWrapSmall, { flex: 1 }]}>
                        <TextInput style={styles.textInputSmall} value={slab.from} onChangeText={v => onUpdate(idx, 'from', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} />
                    </View>
                    <View style={[styles.inputWrapSmall, { flex: 1 }]}>
                        <TextInput style={styles.textInputSmall} value={slab.to} onChangeText={v => onUpdate(idx, 'to', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} />
                    </View>
                    <View style={[styles.inputWrapSmall, { width: 60 }]}>
                        <TextInput style={styles.textInputSmall} value={slab.rate} onChangeText={v => onUpdate(idx, 'rate', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} />
                    </View>
                    {slabs.length > 1 ? (
                        <Pressable onPress={() => onRemove(idx)} hitSlop={8} style={{ width: 24, alignItems: 'center' }}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                        </Pressable>
                    ) : <View style={{ width: 24 }} />}
                </View>
            ))}
            <Pressable onPress={onAdd} style={styles.addBtn}>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add Slab</Text>
            </Pressable>
        </View>
    );
}

// ============ MAIN ============

export function TaxConfigScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch } = useTaxConfig();
    const updateMutation = useUpdateTaxConfig();

    const [form, setForm] = React.useState<TaxConfigForm>(DEFAULT_FORM);
    const [hasChanges, setHasChanges] = React.useState(false);

    React.useEffect(() => {
        if (response) {
            const d = (response as any)?.data ?? response;
            if (d && typeof d === 'object') {
                setForm({
                    defaultRegime: d.defaultRegime ?? 'New',
                    declarationDeadline: d.declarationDeadline ?? '',
                    cessRate: String(d.cessRate ?? '4'),
                    oldSlabs: (d.oldSlabs ?? DEFAULT_OLD_SLABS).map((s: any) => ({ from: String(s.from ?? 0), to: String(s.to ?? 0), rate: String(s.rate ?? 0) })),
                    newSlabs: (d.newSlabs ?? DEFAULT_NEW_SLABS).map((s: any) => ({ from: String(s.from ?? 0), to: String(s.to ?? 0), rate: String(s.rate ?? 0) })),
                    surchargeRates: (d.surchargeRates ?? []).map((s: any) => ({ threshold: String(s.threshold ?? 0), rate: String(s.rate ?? 0) })),
                });
                setHasChanges(false);
            }
        }
    }, [response]);

    const updateForm = (updates: Partial<TaxConfigForm>) => { setForm(prev => ({ ...prev, ...updates })); setHasChanges(true); };

    const updateOldSlab = (idx: number, key: keyof TaxSlab, val: string) => {
        setForm(prev => ({ ...prev, oldSlabs: prev.oldSlabs.map((s, i) => i === idx ? { ...s, [key]: val } : s) }));
        setHasChanges(true);
    };
    const addOldSlab = () => { setForm(prev => ({ ...prev, oldSlabs: [...prev.oldSlabs, { from: '', to: '', rate: '' }] })); setHasChanges(true); };
    const removeOldSlab = (idx: number) => { setForm(prev => ({ ...prev, oldSlabs: prev.oldSlabs.filter((_, i) => i !== idx) })); setHasChanges(true); };

    const updateNewSlab = (idx: number, key: keyof TaxSlab, val: string) => {
        setForm(prev => ({ ...prev, newSlabs: prev.newSlabs.map((s, i) => i === idx ? { ...s, [key]: val } : s) }));
        setHasChanges(true);
    };
    const addNewSlab = () => { setForm(prev => ({ ...prev, newSlabs: [...prev.newSlabs, { from: '', to: '', rate: '' }] })); setHasChanges(true); };
    const removeNewSlab = (idx: number) => { setForm(prev => ({ ...prev, newSlabs: prev.newSlabs.filter((_, i) => i !== idx) })); setHasChanges(true); };

    const updateSurcharge = (idx: number, key: keyof SurchargeRate, val: string) => {
        setForm(prev => ({ ...prev, surchargeRates: prev.surchargeRates.map((s, i) => i === idx ? { ...s, [key]: val } : s) }));
        setHasChanges(true);
    };
    const addSurcharge = () => { setForm(prev => ({ ...prev, surchargeRates: [...prev.surchargeRates, { threshold: '', rate: '' }] })); setHasChanges(true); };
    const removeSurcharge = (idx: number) => { setForm(prev => ({ ...prev, surchargeRates: prev.surchargeRates.filter((_, i) => i !== idx) })); setHasChanges(true); };

    const handleSave = () => {
        const payload = {
            defaultRegime: form.defaultRegime,
            declarationDeadline: form.declarationDeadline,
            cessRate: Number(form.cessRate) || 0,
            oldSlabs: form.oldSlabs.map(s => ({ from: Number(s.from) || 0, to: Number(s.to) || 0, rate: Number(s.rate) || 0 })),
            newSlabs: form.newSlabs.map(s => ({ from: Number(s.from) || 0, to: Number(s.to) || 0, rate: Number(s.rate) || 0 })),
            surchargeRates: form.surchargeRates.map(s => ({ threshold: Number(s.threshold) || 0, rate: Number(s.rate) || 0 })),
        };
        updateMutation.mutate(payload as unknown as Record<string, unknown>, { onSuccess: () => setHasChanges(false) });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Tax & TDS" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="Tax & TDS" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Tax & TDS" onMenuPress={toggle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Tax Configuration</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Income tax slabs and TDS settings</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* General */}
                    <SectionCard title="General Settings">
                        <ChipSelector label="Default Regime" options={['Old', 'New']} value={form.defaultRegime} onSelect={v => updateForm({ defaultRegime: v as Regime })} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Declaration Deadline</Text>
                            <View style={styles.inputWrap}><TextInput style={styles.textInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={form.declarationDeadline} onChangeText={v => updateForm({ declarationDeadline: v })} /></View>
                        </View>
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Cess Rate</Text>
                            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                                <TextInput style={[styles.textInput, { flex: 1 }]} placeholder="4" placeholderTextColor={colors.neutral[400]} value={form.cessRate} onChangeText={v => updateForm({ cessRate: v })} keyboardType="decimal-pad" />
                                <Text className="ml-2 font-inter text-xs text-neutral-400">%</Text>
                            </View>
                        </View>
                    </SectionCard>

                    {/* Old Regime Slabs */}
                    <SectionCard title="Old Regime Slabs" subtitle="Income tax slabs for old regime">
                        <SlabTable slabs={form.oldSlabs} onUpdate={updateOldSlab} onAdd={addOldSlab} onRemove={removeOldSlab} />
                    </SectionCard>

                    {/* New Regime Slabs */}
                    <SectionCard title="New Regime Slabs" subtitle="Income tax slabs for new regime">
                        <SlabTable slabs={form.newSlabs} onUpdate={updateNewSlab} onAdd={addNewSlab} onRemove={removeNewSlab} />
                    </SectionCard>

                    {/* Surcharge */}
                    <SectionCard title="Surcharge Rates" subtitle="Optional surcharge thresholds">
                        {form.surchargeRates.length > 0 ? (
                            <>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                                    <Text className="flex-1 font-inter text-[10px] font-bold text-neutral-400">Threshold (₹)</Text>
                                    <Text style={{ width: 80 }}><Text className="font-inter text-[10px] font-bold text-neutral-400">Rate %</Text></Text>
                                    <View style={{ width: 24 }} />
                                </View>
                                {form.surchargeRates.map((sr, idx) => (
                                    <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <View style={[styles.inputWrapSmall, { flex: 1 }]}>
                                            <TextInput style={styles.textInputSmall} value={sr.threshold} onChangeText={v => updateSurcharge(idx, 'threshold', v)} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} />
                                        </View>
                                        <View style={[styles.inputWrapSmall, { width: 80 }]}>
                                            <TextInput style={styles.textInputSmall} value={sr.rate} onChangeText={v => updateSurcharge(idx, 'rate', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral[400]} />
                                        </View>
                                        <Pressable onPress={() => removeSurcharge(idx)} hitSlop={8} style={{ width: 24, alignItems: 'center' }}>
                                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                                        </Pressable>
                                    </View>
                                ))}
                            </>
                        ) : null}
                        <Pressable onPress={addSurcharge} style={styles.addBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" /></Svg>
                            <Text className="ml-2 font-inter text-xs font-semibold text-primary-600">Add Surcharge Rate</Text>
                        </Pressable>
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save bar */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable onPress={handleSave} disabled={!hasChanges || updateMutation.isPending} style={[styles.saveBtnFull, (!hasChanges || updateMutation.isPending) && { opacity: 0.5 }]}>
                    {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">{hasChanges ? 'Save Changes' : 'No Changes'}</Text>}
                </Pressable>
            </View>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    scrollContent: { paddingHorizontal: 24 },
    sectionCard: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    fieldWrap: { marginTop: 12, marginBottom: 4 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    inputWrapSmall: { backgroundColor: colors.neutral[50], borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 10, height: 38, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    textInputSmall: { fontFamily: 'Inter', fontSize: 12, color: colors.primary[950] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', marginTop: 8,
    },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveBtnFull: {
        height: 56, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
});
