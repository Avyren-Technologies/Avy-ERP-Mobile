/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
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
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useOvertimeRules } from '@/features/company-admin/api/use-attendance-queries';
import { useUpdateOvertimeRules } from '@/features/company-admin/api/use-attendance-mutations';
import type { OvertimeRule, OTCalculationBasis, RoundingStrategy } from '@/lib/api/attendance';

import { ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';

// ============ OPTIONS (same as web) ============

const CALCULATION_BASIS_OPTIONS = ['AFTER_SHIFT', 'TOTAL_HOURS'];
const CALCULATION_BASIS_LABELS: Record<string, string> = { AFTER_SHIFT: 'After Shift End', TOTAL_HOURS: 'Total Hours Worked' };

const ROUNDING_STRATEGY_OPTIONS = ['NONE', 'NEAREST_15', 'NEAREST_30', 'FLOOR_15', 'CEIL_15'];
const ROUNDING_STRATEGY_LABELS: Record<string, string> = { NONE: 'None', NEAREST_15: 'Nearest 15 min', NEAREST_30: 'Nearest 30 min', FLOOR_15: 'Floor 15 min', CEIL_15: 'Ceil 15 min' };

// ============ DEFAULTS (20 fields -- same as web) ============

const DEFAULTS: OvertimeRule = {
    eligibleTypeIds: null,
    calculationBasis: 'AFTER_SHIFT',
    thresholdMinutes: 30,
    minimumOtMinutes: 30,
    includeBreaksInOT: false,
    weekdayMultiplier: 1.5,
    weekendMultiplier: null,
    holidayMultiplier: null,
    nightShiftMultiplier: null,
    dailyCapHours: null,
    weeklyCapHours: null,
    monthlyCapHours: null,
    enforceCaps: false,
    maxContinuousOtHours: null,
    approvalRequired: true,
    autoIncludePayroll: false,
    compOffEnabled: false,
    compOffExpiryDays: null,
    roundingStrategy: 'NONE',
};

// ============ REUSABLE ============

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
            {children}
        </View>
    );
}

function ToggleRow({ label, subtitle, value, onToggle }: { label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

function NumberRow({ label, subtitle, value, onChange, suffix }: { label: string; subtitle?: string; value: number; onChange: (v: number) => void; suffix?: string }) {
    return (
        <View style={styles.numberRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.numberInputWrap}>
                    <TextInput style={styles.numberInput} value={String(value)} onChangeText={(v) => onChange(Number(v) || 0)} keyboardType="decimal-pad" />
                </View>
                {suffix && <Text className="ml-1 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
        </View>
    );
}

function NullableNumberRow({ label, subtitle, value, onChange, suffix, nullLabel }: { label: string; subtitle?: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; nullLabel?: string }) {
    const isNull = value === null;
    return (
        <View style={styles.numberRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Pressable onPress={() => onChange(isNull ? 0 : null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.checkBox, !isNull && styles.checkBoxActive]}>
                        {!isNull && <Svg width={10} height={10} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    </View>
                    <View style={{ marginLeft: 8 }}>
                        <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                        {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
                    </View>
                </Pressable>
            </View>
            {isNull ? (
                <Text className="font-inter text-xs font-medium text-primary-500">{nullLabel ?? 'Use Weekday Rate'}</Text>
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.numberInputWrap}>
                        <TextInput style={styles.numberInput} value={String(value)} onChangeText={(v) => onChange(Number(v) || 0)} keyboardType="decimal-pad" />
                    </View>
                    {suffix && <Text className="ml-1 font-inter text-xs text-neutral-400">{suffix}</Text>}
                </View>
            )}
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function OvertimeRulesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useOvertimeRules();
    const updateMutation = useUpdateOvertimeRules();

    const [rules, setRules] = React.useState<OvertimeRule>({ ...DEFAULTS });
    const [hasChanges, setHasChanges] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    const serverRules: OvertimeRule = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? {};
        return { ...DEFAULTS, ...raw };
    }, [response]);

    React.useEffect(() => {
        if (response) {
            setRules({ ...serverRules });
            setHasChanges(false);
        }
    }, [response]);

    const updateRule = <K extends keyof OvertimeRule>(key: K, value: OvertimeRule[K]) => {
        setRules((p) => ({ ...p, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(rules, {
            onSuccess: () => {
                setHasChanges(false);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
            },
        });
    };

    const handleReset = () => {
        setRules({ ...serverRules });
        setHasChanges(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Overtime Rules</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Overtime Rules</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load overtime rules" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Overtime Rules</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasChanges ? 120 : 40) }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Overtime Rules</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Configure eligibility, calculation, rates, caps, and approval</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* 1. Eligibility */}
                    <SectionCard title="Eligibility">
                        <View style={styles.infoRow}>
                            <Text className="font-inter text-sm font-semibold text-neutral-700">Eligible Employee Types</Text>
                            <Text className="mt-0.5 font-inter text-xs text-neutral-400">
                                {rules.eligibleTypeIds === null ? 'All employee types are eligible' : `${rules.eligibleTypeIds.length} type(s) selected`}
                            </Text>
                        </View>
                    </SectionCard>

                    {/* 2. Calculation */}
                    <SectionCard title="Calculation">
                        <ChipSelector
                            label="Calculation Basis"
                            options={CALCULATION_BASIS_OPTIONS.map((o) => CALCULATION_BASIS_LABELS[o])}
                            selected={CALCULATION_BASIS_LABELS[rules.calculationBasis]}
                            onSelect={(v) => {
                                const key = Object.entries(CALCULATION_BASIS_LABELS).find(([, l]) => l === v)?.[0] ?? 'AFTER_SHIFT';
                                updateRule('calculationBasis', key as OTCalculationBasis);
                            }}
                            hint="How overtime is calculated"
                        />
                        <NumberRow label="Threshold Minutes" subtitle="Extra minutes before OT counts" value={rules.thresholdMinutes} onChange={(v) => updateRule('thresholdMinutes', v)} suffix="min" />
                        <NumberRow label="Minimum OT Minutes" subtitle="Min OT minutes to be recorded" value={rules.minimumOtMinutes} onChange={(v) => updateRule('minimumOtMinutes', v)} suffix="min" />
                        <ToggleRow label="Include Breaks in OT" subtitle="Count break time within OT hours" value={rules.includeBreaksInOT} onToggle={(v) => updateRule('includeBreaksInOT', v)} />
                    </SectionCard>

                    {/* 3. Rate Multipliers */}
                    <SectionCard title="Rate Multipliers">
                        <NumberRow label="Weekday Multiplier" value={rules.weekdayMultiplier} onChange={(v) => updateRule('weekdayMultiplier', v)} suffix="x" />
                        <NullableNumberRow label="Weekend Multiplier" value={rules.weekendMultiplier} onChange={(v) => updateRule('weekendMultiplier', v)} suffix="x" nullLabel="Use Weekday Rate" />
                        <NullableNumberRow label="Holiday Multiplier" value={rules.holidayMultiplier} onChange={(v) => updateRule('holidayMultiplier', v)} suffix="x" nullLabel="Use Weekday Rate" />
                        <NullableNumberRow label="Night Shift Multiplier" value={rules.nightShiftMultiplier} onChange={(v) => updateRule('nightShiftMultiplier', v)} suffix="x" nullLabel="Use Weekday Rate" />
                    </SectionCard>

                    {/* 4. Caps */}
                    <SectionCard title="Caps">
                        <NullableNumberRow label="Daily Cap" value={rules.dailyCapHours} onChange={(v) => updateRule('dailyCapHours', v)} suffix="hrs" nullLabel="No Limit" />
                        <NullableNumberRow label="Weekly Cap" value={rules.weeklyCapHours} onChange={(v) => updateRule('weeklyCapHours', v)} suffix="hrs" nullLabel="No Limit" />
                        <NullableNumberRow label="Monthly Cap" value={rules.monthlyCapHours} onChange={(v) => updateRule('monthlyCapHours', v)} suffix="hrs" nullLabel="No Limit" />
                        <ToggleRow label="Enforce Caps" subtitle="Hard block OT entries exceeding limits" value={rules.enforceCaps} onToggle={(v) => updateRule('enforceCaps', v)} />
                        <NullableNumberRow label="Max Continuous OT" subtitle="Safety/compliance limit" value={rules.maxContinuousOtHours} onChange={(v) => updateRule('maxContinuousOtHours', v)} suffix="hrs" nullLabel="No Limit" />
                    </SectionCard>

                    {/* 5. Approval & Payroll */}
                    <SectionCard title="Approval & Payroll">
                        <ToggleRow label="Approval Required" subtitle="Manager must approve overtime before payroll" value={rules.approvalRequired} onToggle={(v) => updateRule('approvalRequired', v)} />
                        <ToggleRow label="Auto Include in Payroll" subtitle="Automatically add approved OT to payroll" value={rules.autoIncludePayroll} onToggle={(v) => updateRule('autoIncludePayroll', v)} />
                    </SectionCard>

                    {/* 6. Comp-Off */}
                    <SectionCard title="Comp-Off">
                        <ToggleRow label="Comp-Off Enabled" subtitle="Allow employees to choose comp-off instead of pay" value={rules.compOffEnabled} onToggle={(v) => updateRule('compOffEnabled', v)} />
                        <NullableNumberRow label="Comp-Off Expiry" subtitle="Days before comp-off lapses" value={rules.compOffExpiryDays} onChange={(v) => updateRule('compOffExpiryDays', v)} suffix="days" nullLabel="No Expiry" />
                    </SectionCard>

                    {/* 7. Rounding */}
                    <SectionCard title="Rounding">
                        <ChipSelector
                            label="Rounding Strategy"
                            options={ROUNDING_STRATEGY_OPTIONS.map((o) => ROUNDING_STRATEGY_LABELS[o])}
                            selected={ROUNDING_STRATEGY_LABELS[rules.roundingStrategy]}
                            onSelect={(v) => {
                                const key = Object.entries(ROUNDING_STRATEGY_LABELS).find(([, l]) => l === v)?.[0] ?? 'NONE';
                                updateRule('roundingStrategy', key as RoundingStrategy);
                            }}
                            hint="How OT hours are rounded"
                        />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Bar */}
            {hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.saveRow}>
                        <Pressable onPress={handleReset} style={styles.resetBtn}><Text className="font-inter text-sm font-bold text-neutral-600">Reset</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={updateMutation.isPending} style={[styles.saveBtnFull, updateMutation.isPending && { opacity: 0.5 }]}>
                            {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Save Changes</Text>}
                        </Pressable>
                    </View>
                </Animated.View>
            )}

            {showToast && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { top: insets.top + 60 }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">Overtime rules saved</Text>
                </Animated.View>
            )}
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
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    numberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    infoRow: { paddingVertical: 12 },
    numberInputWrap: {
        backgroundColor: colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 10, height: 38, minWidth: 60, justifyContent: 'center',
    },
    numberInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950], textAlign: 'right' },
    checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
    checkBoxActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveRow: { flexDirection: 'row', gap: 12 },
    resetBtn: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    saveBtnFull: {
        flex: 1, height: 52, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    toast: {
        position: 'absolute', left: 20, right: 20, backgroundColor: colors.success[50], borderRadius: 12,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
});
