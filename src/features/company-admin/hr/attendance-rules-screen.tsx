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

// ============ TYPES ============

interface AttendanceRulesForm {
    // Time Rules
    dayBoundaryTime: string;
    gracePeriodMinutes: string;
    earlyExitTolerance: string;
    // Thresholds
    halfDayThresholdHours: string;
    fullDayThresholdHours: string;
    // Deduction Rules
    lateArrivalsAllowedPerMonth: string;
    lopAutoDeduct: boolean;
    // Alerts
    missingPunchAlert: boolean;
    // Mobile Attendance
    selfieRequired: boolean;
    gpsRequired: boolean;
}

const DEFAULT_FORM: AttendanceRulesForm = {
    dayBoundaryTime: '00:00',
    gracePeriodMinutes: '15',
    earlyExitTolerance: '10',
    halfDayThresholdHours: '4',
    fullDayThresholdHours: '8',
    lateArrivalsAllowedPerMonth: '3',
    lopAutoDeduct: false,
    missingPunchAlert: true,
    selfieRequired: false,
    gpsRequired: false,
};

// ============ REUSABLE COMPONENTS ============

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

function NumberField({ label, subtitle, value, onChange, placeholder, suffix }: { label: string; subtitle?: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                />
                {suffix && <Text className="ml-2 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
            {subtitle && <Text className="mt-1 font-inter text-[10px] text-neutral-400">{subtitle}</Text>}
        </View>
    );
}

function TimeField({ label, subtitle, value, onChange }: { label: string; subtitle?: string; value: string; onChange: (v: string) => void }) {
    return (
        <View style={styles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">{label}</Text>
            <View style={styles.inputWrap}>
                <TextInput
                    style={styles.textInput}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChange}
                />
            </View>
            {subtitle && <Text className="mt-1 font-inter text-[10px] text-neutral-400">{subtitle}</Text>}
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function AttendanceRulesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useAttendanceRules();
    const updateMutation = useUpdateAttendanceRules();

    const [form, setForm] = React.useState<AttendanceRulesForm>(DEFAULT_FORM);
    const [hasChanges, setHasChanges] = React.useState(false);

    React.useEffect(() => {
        if (response) {
            const data = (response as any)?.data ?? response;
            if (data && typeof data === 'object') {
                setForm({
                    dayBoundaryTime: data.dayBoundaryTime ?? DEFAULT_FORM.dayBoundaryTime,
                    gracePeriodMinutes: String(data.gracePeriodMinutes ?? DEFAULT_FORM.gracePeriodMinutes),
                    earlyExitTolerance: String(data.earlyExitTolerance ?? DEFAULT_FORM.earlyExitTolerance),
                    halfDayThresholdHours: String(data.halfDayThresholdHours ?? DEFAULT_FORM.halfDayThresholdHours),
                    fullDayThresholdHours: String(data.fullDayThresholdHours ?? DEFAULT_FORM.fullDayThresholdHours),
                    lateArrivalsAllowedPerMonth: String(data.lateArrivalsAllowedPerMonth ?? DEFAULT_FORM.lateArrivalsAllowedPerMonth),
                    lopAutoDeduct: data.lopAutoDeduct ?? DEFAULT_FORM.lopAutoDeduct,
                    missingPunchAlert: data.missingPunchAlert ?? DEFAULT_FORM.missingPunchAlert,
                    selfieRequired: data.selfieRequired ?? DEFAULT_FORM.selfieRequired,
                    gpsRequired: data.gpsRequired ?? DEFAULT_FORM.gpsRequired,
                });
                setHasChanges(false);
            }
        }
    }, [response]);

    const updateForm = (updates: Partial<AttendanceRulesForm>) => {
        setForm(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const handleSave = () => {
        const payload = {
            ...form,
            gracePeriodMinutes: Number(form.gracePeriodMinutes) || 0,
            earlyExitTolerance: Number(form.earlyExitTolerance) || 0,
            halfDayThresholdHours: Number(form.halfDayThresholdHours) || 0,
            fullDayThresholdHours: Number(form.fullDayThresholdHours) || 0,
            lateArrivalsAllowedPerMonth: Number(form.lateArrivalsAllowedPerMonth) || 0,
        };
        updateMutation.mutate(payload as unknown as Record<string, unknown>, {
            onSuccess: () => setHasChanges(false),
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
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
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
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
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Attendance Rules</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Attendance Rules</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Configure attendance policies for your company</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Time Rules */}
                    <SectionCard title="Time Rules" subtitle="Define day boundary and grace periods">
                        <TimeField label="Day Boundary Time" subtitle="Time when one attendance day ends and next begins" value={form.dayBoundaryTime} onChange={v => updateForm({ dayBoundaryTime: v })} />
                        <NumberField label="Grace Period" subtitle="Minutes after shift start before marking late" value={form.gracePeriodMinutes} onChange={v => updateForm({ gracePeriodMinutes: v })} placeholder="15" suffix="min" />
                        <NumberField label="Early Exit Tolerance" subtitle="Minutes before shift end allowed without penalty" value={form.earlyExitTolerance} onChange={v => updateForm({ earlyExitTolerance: v })} placeholder="10" suffix="min" />
                    </SectionCard>

                    {/* Thresholds */}
                    <SectionCard title="Thresholds" subtitle="Hours required for half-day and full-day credit">
                        <NumberField label="Half-Day Threshold" value={form.halfDayThresholdHours} onChange={v => updateForm({ halfDayThresholdHours: v })} placeholder="4" suffix="hrs" />
                        <NumberField label="Full-Day Threshold" value={form.fullDayThresholdHours} onChange={v => updateForm({ fullDayThresholdHours: v })} placeholder="8" suffix="hrs" />
                    </SectionCard>

                    {/* Deduction Rules */}
                    <SectionCard title="Deduction Rules" subtitle="Late arrival and loss-of-pay settings">
                        <NumberField label="Late Arrivals Allowed per Month" subtitle="After this count, penalties apply" value={form.lateArrivalsAllowedPerMonth} onChange={v => updateForm({ lateArrivalsAllowedPerMonth: v })} placeholder="3" />
                        <ToggleRow label="LOP Auto-Deduct" subtitle="Automatically deduct loss-of-pay for excess late days" value={form.lopAutoDeduct} onToggle={v => updateForm({ lopAutoDeduct: v })} />
                    </SectionCard>

                    {/* Alerts */}
                    <SectionCard title="Alerts">
                        <ToggleRow label="Missing Punch Alert" subtitle="Notify employees and managers about missing punch-in or punch-out" value={form.missingPunchAlert} onToggle={v => updateForm({ missingPunchAlert: v })} />
                    </SectionCard>

                    {/* Mobile Attendance */}
                    <SectionCard title="Mobile Attendance" subtitle="Requirements for mobile check-in">
                        <ToggleRow label="Selfie Required" subtitle="Employees must capture a selfie during mobile punch" value={form.selfieRequired} onToggle={v => updateForm({ selfieRequired: v })} />
                        <ToggleRow label="GPS Required" subtitle="Capture GPS coordinates during mobile punch" value={form.gpsRequired} onToggle={v => updateForm({ gpsRequired: v })} />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable onPress={handleSave} disabled={!hasChanges || updateMutation.isPending} style={[styles.saveBtnFull, (!hasChanges || updateMutation.isPending) && { opacity: 0.5 }]}>
                    {updateMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text className="font-inter text-base font-bold text-white">{hasChanges ? 'Save Changes' : 'No Changes'}</Text>
                    )}
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
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    fieldWrap: { marginTop: 12, marginBottom: 4 },
    inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 46, justifyContent: 'center' },
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveBtnFull: {
        height: 56, borderRadius: 16, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
});
