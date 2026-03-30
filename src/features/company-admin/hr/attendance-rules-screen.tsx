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

import { useAttendanceRules } from '@/features/company-admin/api/use-attendance-queries';
import { useUpdateAttendanceRules } from '@/features/company-admin/api/use-attendance-mutations';
import type { AttendanceRule, DeductionType, PunchMode, RoundingStrategy, PunchRounding, RoundingDirection } from '@/lib/api/attendance';

import { ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';

// ============ OPTIONS (same as web) ============

const DEDUCTION_TYPE_OPTIONS = ['NONE', 'HALF_DAY_AFTER_LIMIT', 'PERCENTAGE'];
const DEDUCTION_TYPE_LABELS: Record<string, string> = { NONE: 'None', HALF_DAY_AFTER_LIMIT: 'Half Day After Limit', PERCENTAGE: 'Percentage' };

const PUNCH_MODE_OPTIONS = ['FIRST_LAST', 'EVERY_PAIR', 'SHIFT_BASED'];
const PUNCH_MODE_LABELS: Record<string, string> = { FIRST_LAST: 'First In / Last Out', EVERY_PAIR: 'Every Pair (In/Out)', SHIFT_BASED: 'Shift Based' };

const ROUNDING_STRATEGY_OPTIONS = ['NONE', 'NEAREST_15', 'NEAREST_30', 'FLOOR_15', 'CEIL_15'];
const ROUNDING_STRATEGY_LABELS: Record<string, string> = { NONE: 'None', NEAREST_15: 'Nearest 15 min', NEAREST_30: 'Nearest 30 min', FLOOR_15: 'Floor 15 min', CEIL_15: 'Ceil 15 min' };

const PUNCH_ROUNDING_OPTIONS = ['NONE', 'NEAREST_5', 'NEAREST_15'];
const PUNCH_ROUNDING_LABELS: Record<string, string> = { NONE: 'None', NEAREST_5: 'Nearest 5 min', NEAREST_15: 'Nearest 15 min' };

const ROUNDING_DIRECTION_OPTIONS = ['NEAREST', 'UP', 'DOWN'];
const ROUNDING_DIRECTION_LABELS: Record<string, string> = { NEAREST: 'Nearest', UP: 'Round Up', DOWN: 'Round Down' };

// ============ DEFAULTS (26 fields -- same as web) ============

const DEFAULTS: AttendanceRule = {
    dayBoundaryTime: '00:00',
    gracePeriodMinutes: 15,
    earlyExitToleranceMinutes: 15,
    maxLateCheckInMinutes: 240,
    halfDayThresholdHours: 4,
    fullDayThresholdHours: 8,
    lateArrivalsAllowedPerMonth: 3,
    lopAutoDeduct: true,
    lateDeductionType: 'NONE',
    lateDeductionValue: null,
    earlyExitDeductionType: 'NONE',
    earlyExitDeductionValue: null,
    punchMode: 'FIRST_LAST',
    autoMarkAbsentIfNoPunch: true,
    autoHalfDayEnabled: true,
    autoAbsentAfterDays: 0,
    regularizationWindowDays: 7,
    workingHoursRounding: 'NONE',
    punchTimeRounding: 'NONE',
    punchTimeRoundingDirection: 'NEAREST',
    ignoreLateOnLeaveDay: true,
    ignoreLateOnHoliday: true,
    ignoreLateOnWeekOff: true,
    selfieRequired: false,
    gpsRequired: false,
    missingPunchAlert: true,
};

// ============ REUSABLE ============

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

function TimeRow({ label, subtitle, value, onChange }: { label: string; subtitle?: string; value: string; onChange: (v: string) => void }) {
    return (
        <View style={styles.numberRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
            </View>
            <View style={styles.numberInputWrap}>
                <TextInput style={styles.numberInput} value={value} onChangeText={onChange} placeholder="HH:MM" placeholderTextColor={colors.neutral[400]} />
            </View>
        </View>
    );
}

function NullableNumberRow({ label, subtitle, value, onChange, suffix }: { label: string; subtitle?: string; value: number | null; onChange: (v: number | null) => void; suffix?: string }) {
    const isNull = value === null;
    return (
        <View style={styles.numberRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
            </View>
            {isNull ? (
                <Pressable onPress={() => onChange(0)} style={styles.enableBtn}>
                    <Text className="font-inter text-xs font-semibold text-primary-600">Enable</Text>
                </Pressable>
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.numberInputWrap}>
                        <TextInput style={styles.numberInput} value={String(value)} onChangeText={(v) => onChange(Number(v) || 0)} keyboardType="decimal-pad" />
                    </View>
                    {suffix && <Text className="ml-1 font-inter text-xs text-neutral-400">{suffix}</Text>}
                    <Pressable onPress={() => onChange(null)} style={{ marginLeft: 6 }}>
                        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" /></Svg>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

// Helper to map chip label back to enum value
function chipSelect<T extends string>(
    labels: Record<string, string>,
    options: string[],
    currentValue: T,
    onUpdate: (v: T) => void,
    label: string,
    hint?: string,
) {
    return (
        <ChipSelector
            label={label}
            options={options.map((o) => labels[o] ?? o)}
            selected={labels[currentValue] ?? currentValue}
            onSelect={(v) => {
                const key = Object.entries(labels).find(([, lbl]) => lbl === v)?.[0] ?? v;
                onUpdate(key as T);
            }}
            hint={hint}
        />
    );
}

// ============ MAIN COMPONENT ============

export function AttendanceRulesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useAttendanceRules();
    const updateMutation = useUpdateAttendanceRules();

    const [rules, setRules] = React.useState<AttendanceRule>({ ...DEFAULTS });
    const [hasChanges, setHasChanges] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    const serverRules: AttendanceRule = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? {};
        return { ...DEFAULTS, ...raw };
    }, [response]);

    React.useEffect(() => {
        if (response) {
            setRules({ ...serverRules });
            setHasChanges(false);
        }
    }, [response]);

    const updateRule = <K extends keyof AttendanceRule>(key: K, value: AttendanceRule[K]) => {
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Attendance Rules</Text>
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Attendance Rules</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load rules" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Attendance Rules</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasChanges ? 120 : 40) }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Attendance Rules</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Configure time boundaries, thresholds, deductions, and processing rules</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* 1. Time & Boundary */}
                    <SectionCard title="Time & Boundary">
                        <TimeRow label="Day Boundary Time" subtitle="When the calendar day flips for night shifts" value={rules.dayBoundaryTime} onChange={(v) => updateRule('dayBoundaryTime', v)} />
                    </SectionCard>

                    {/* 2. Grace & Tolerance */}
                    <SectionCard title="Grace & Tolerance">
                        <NumberRow label="Grace Period" subtitle="Minutes allowed after shift start" value={rules.gracePeriodMinutes} onChange={(v) => updateRule('gracePeriodMinutes', v)} suffix="min" />
                        <NumberRow label="Early Exit Tolerance" subtitle="Minutes before shift end allowed" value={rules.earlyExitToleranceMinutes} onChange={(v) => updateRule('earlyExitToleranceMinutes', v)} suffix="min" />
                        <NumberRow label="Max Late Check-In" subtitle="Auto-absent if later than this" value={rules.maxLateCheckInMinutes} onChange={(v) => updateRule('maxLateCheckInMinutes', v)} suffix="min" />
                    </SectionCard>

                    {/* 3. Day Thresholds */}
                    <SectionCard title="Day Thresholds">
                        <NumberRow label="Half Day Threshold" subtitle="Minimum hours for half-day credit" value={rules.halfDayThresholdHours} onChange={(v) => updateRule('halfDayThresholdHours', v)} suffix="hrs" />
                        <NumberRow label="Full Day Threshold" subtitle="Minimum hours for full-day credit" value={rules.fullDayThresholdHours} onChange={(v) => updateRule('fullDayThresholdHours', v)} suffix="hrs" />
                    </SectionCard>

                    {/* 4. Late Tracking */}
                    <SectionCard title="Late Tracking">
                        <NumberRow label="Late Arrivals Allowed / Month" subtitle="Max late arrivals before penalty" value={rules.lateArrivalsAllowedPerMonth} onChange={(v) => updateRule('lateArrivalsAllowedPerMonth', v)} suffix="days" />
                    </SectionCard>

                    {/* 5. Deduction Rules */}
                    <SectionCard title="Deduction Rules">
                        <ToggleRow label="LOP Auto-Deduct" subtitle="Automatically deduct loss of pay" value={rules.lopAutoDeduct} onToggle={(v) => updateRule('lopAutoDeduct', v)} />
                        {chipSelect<DeductionType>(DEDUCTION_TYPE_LABELS, DEDUCTION_TYPE_OPTIONS, rules.lateDeductionType, (v) => updateRule('lateDeductionType', v), 'Late Deduction Type')}
                        {rules.lateDeductionType !== 'NONE' && (
                            <NullableNumberRow label="Late Deduction Value" subtitle={rules.lateDeductionType === 'PERCENTAGE' ? 'Percentage of daily pay' : 'Value'} value={rules.lateDeductionValue} onChange={(v) => updateRule('lateDeductionValue', v)} suffix={rules.lateDeductionType === 'PERCENTAGE' ? '%' : ''} />
                        )}
                        {chipSelect<DeductionType>(DEDUCTION_TYPE_LABELS, DEDUCTION_TYPE_OPTIONS, rules.earlyExitDeductionType, (v) => updateRule('earlyExitDeductionType', v), 'Early Exit Deduction Type')}
                        {rules.earlyExitDeductionType !== 'NONE' && (
                            <NullableNumberRow label="Early Exit Deduction Value" subtitle={rules.earlyExitDeductionType === 'PERCENTAGE' ? 'Percentage of daily pay' : 'Value'} value={rules.earlyExitDeductionValue} onChange={(v) => updateRule('earlyExitDeductionValue', v)} suffix={rules.earlyExitDeductionType === 'PERCENTAGE' ? '%' : ''} />
                        )}
                    </SectionCard>

                    {/* 6. Punch Interpretation */}
                    <SectionCard title="Punch Interpretation">
                        {chipSelect<PunchMode>(PUNCH_MODE_LABELS, PUNCH_MODE_OPTIONS, rules.punchMode, (v) => updateRule('punchMode', v), 'Punch Mode', 'How punch records are interpreted')}
                    </SectionCard>

                    {/* 7. Auto-Processing */}
                    <SectionCard title="Auto-Processing">
                        <ToggleRow label="Auto Mark Absent" subtitle="Mark absent if no punch for the day" value={rules.autoMarkAbsentIfNoPunch} onToggle={(v) => updateRule('autoMarkAbsentIfNoPunch', v)} />
                        <ToggleRow label="Auto Half-Day" subtitle="Auto classify based on threshold hours" value={rules.autoHalfDayEnabled} onToggle={(v) => updateRule('autoHalfDayEnabled', v)} />
                        <NumberRow label="Auto Absent After Days" subtitle="Mark absent after N days no punch (0 = disabled)" value={rules.autoAbsentAfterDays} onChange={(v) => updateRule('autoAbsentAfterDays', v)} suffix="days" />
                        <NumberRow label="Regularization Window" subtitle="Days after which regularization is locked" value={rules.regularizationWindowDays} onChange={(v) => updateRule('regularizationWindowDays', v)} suffix="days" />
                    </SectionCard>

                    {/* 8. Rounding */}
                    <SectionCard title="Rounding">
                        {chipSelect<RoundingStrategy>(ROUNDING_STRATEGY_LABELS, ROUNDING_STRATEGY_OPTIONS, rules.workingHoursRounding, (v) => updateRule('workingHoursRounding', v), 'Working Hours Rounding')}
                        {chipSelect<PunchRounding>(PUNCH_ROUNDING_LABELS, PUNCH_ROUNDING_OPTIONS, rules.punchTimeRounding, (v) => updateRule('punchTimeRounding', v), 'Punch Time Rounding')}
                        {chipSelect<RoundingDirection>(ROUNDING_DIRECTION_LABELS, ROUNDING_DIRECTION_OPTIONS, rules.punchTimeRoundingDirection, (v) => updateRule('punchTimeRoundingDirection', v), 'Rounding Direction')}
                    </SectionCard>

                    {/* 9. Exception Handling */}
                    <SectionCard title="Exception Handling">
                        <ToggleRow label="Ignore Late on Leave Day" subtitle="Don't flag late if employee has partial leave" value={rules.ignoreLateOnLeaveDay} onToggle={(v) => updateRule('ignoreLateOnLeaveDay', v)} />
                        <ToggleRow label="Ignore Late on Holiday" subtitle="Working on holiday = no late flag" value={rules.ignoreLateOnHoliday} onToggle={(v) => updateRule('ignoreLateOnHoliday', v)} />
                        <ToggleRow label="Ignore Late on Week Off" subtitle="Working on week-off = no late flag" value={rules.ignoreLateOnWeekOff} onToggle={(v) => updateRule('ignoreLateOnWeekOff', v)} />
                    </SectionCard>

                    {/* 10. Capture */}
                    <SectionCard title="Capture">
                        <ToggleRow label="Selfie Required" subtitle="Require selfie for attendance punch" value={rules.selfieRequired} onToggle={(v) => updateRule('selfieRequired', v)} />
                        <ToggleRow label="GPS Required" subtitle="Require GPS location for attendance punch" value={rules.gpsRequired} onToggle={(v) => updateRule('gpsRequired', v)} />
                        <ToggleRow label="Missing Punch Alert" subtitle="Alert when employee has incomplete punches" value={rules.missingPunchAlert} onToggle={(v) => updateRule('missingPunchAlert', v)} />
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
                    <Text className="font-inter text-sm font-semibold text-success-700">Attendance rules saved</Text>
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
    numberInputWrap: {
        backgroundColor: colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 10, height: 38, minWidth: 60, justifyContent: 'center',
    },
    numberInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950], textAlign: 'right' },
    enableBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary[50] },
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
