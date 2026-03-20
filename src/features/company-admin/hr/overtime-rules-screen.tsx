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

// ============ TYPES ============

interface OvertimeRulesForm {
    // Eligibility
    eligibleEmployeeTypes: string[];
    // Rate
    otRateMultiplier: string;
    eligibilityThresholdMinutes: string;
    // Caps
    monthlyCapHours: string;
    weeklyCapHours: string;
    // Payroll
    autoIncludeInPayroll: boolean;
    approvalRequired: boolean;
}

const DEFAULT_FORM: OvertimeRulesForm = {
    eligibleEmployeeTypes: [],
    otRateMultiplier: '1.5',
    eligibilityThresholdMinutes: '30',
    monthlyCapHours: '40',
    weeklyCapHours: '12',
    autoIncludeInPayroll: false,
    approvalRequired: true,
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
                    keyboardType="decimal-pad"
                />
                {suffix && <Text className="ml-2 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
            {subtitle && <Text className="mt-1 font-inter text-[10px] text-neutral-400">{subtitle}</Text>}
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function OvertimeRulesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useOvertimeRules();
    const updateMutation = useUpdateOvertimeRules();

    const [form, setForm] = React.useState<OvertimeRulesForm>(DEFAULT_FORM);
    const [hasChanges, setHasChanges] = React.useState(false);

    React.useEffect(() => {
        if (response) {
            const data = (response as any)?.data ?? response;
            if (data && typeof data === 'object') {
                setForm({
                    eligibleEmployeeTypes: data.eligibleEmployeeTypes ?? DEFAULT_FORM.eligibleEmployeeTypes,
                    otRateMultiplier: String(data.otRateMultiplier ?? DEFAULT_FORM.otRateMultiplier),
                    eligibilityThresholdMinutes: String(data.eligibilityThresholdMinutes ?? DEFAULT_FORM.eligibilityThresholdMinutes),
                    monthlyCapHours: String(data.monthlyCapHours ?? DEFAULT_FORM.monthlyCapHours),
                    weeklyCapHours: String(data.weeklyCapHours ?? DEFAULT_FORM.weeklyCapHours),
                    autoIncludeInPayroll: data.autoIncludeInPayroll ?? DEFAULT_FORM.autoIncludeInPayroll,
                    approvalRequired: data.approvalRequired ?? DEFAULT_FORM.approvalRequired,
                });
                setHasChanges(false);
            }
        }
    }, [response]);

    const updateForm = (updates: Partial<OvertimeRulesForm>) => {
        setForm(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const handleSave = () => {
        const payload = {
            ...form,
            otRateMultiplier: Number(form.otRateMultiplier) || 1.5,
            eligibilityThresholdMinutes: Number(form.eligibilityThresholdMinutes) || 0,
            monthlyCapHours: Number(form.monthlyCapHours) || 0,
            weeklyCapHours: Number(form.weeklyCapHours) || 0,
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
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Overtime Rules</Text>
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
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">Overtime Rules</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">Overtime Rules</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Configure overtime eligibility and calculation rules</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Eligibility */}
                    <SectionCard title="Eligibility" subtitle="Define which employee types are eligible for overtime">
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Eligible Employee Types</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Comma-separated types (e.g. Permanent, Contract)"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.eligibleEmployeeTypes.join(', ')}
                                    onChangeText={v => updateForm({ eligibleEmployeeTypes: v.split(',').map(s => s.trim()).filter(Boolean) })}
                                />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">Leave empty to apply to all employee types</Text>
                        </View>
                    </SectionCard>

                    {/* Rate */}
                    <SectionCard title="Rate" subtitle="Overtime rate calculation settings">
                        <NumberField
                            label="OT Rate Multiplier"
                            subtitle="Multiplier applied to base hourly rate (e.g. 1.5 = time and a half)"
                            value={form.otRateMultiplier}
                            onChange={v => updateForm({ otRateMultiplier: v })}
                            placeholder="1.5"
                            suffix="x"
                        />
                        <NumberField
                            label="Eligibility Threshold"
                            subtitle="Minutes beyond shift end before OT starts counting"
                            value={form.eligibilityThresholdMinutes}
                            onChange={v => updateForm({ eligibilityThresholdMinutes: v })}
                            placeholder="30"
                            suffix="min"
                        />
                    </SectionCard>

                    {/* Caps */}
                    <SectionCard title="Caps" subtitle="Maximum overtime hours allowed">
                        <NumberField
                            label="Monthly Cap"
                            value={form.monthlyCapHours}
                            onChange={v => updateForm({ monthlyCapHours: v })}
                            placeholder="40"
                            suffix="hrs"
                        />
                        <NumberField
                            label="Weekly Cap"
                            value={form.weeklyCapHours}
                            onChange={v => updateForm({ weeklyCapHours: v })}
                            placeholder="12"
                            suffix="hrs"
                        />
                    </SectionCard>

                    {/* Payroll */}
                    <SectionCard title="Payroll" subtitle="Payroll integration settings">
                        <ToggleRow
                            label="Auto-Include in Payroll"
                            subtitle="Automatically add approved overtime to payroll calculations"
                            value={form.autoIncludeInPayroll}
                            onToggle={v => updateForm({ autoIncludeInPayroll: v })}
                        />
                        <ToggleRow
                            label="Approval Required"
                            subtitle="Require manager approval before overtime is counted"
                            value={form.approvalRequired}
                            onToggle={v => updateForm({ approvalRequired: v })}
                        />
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
