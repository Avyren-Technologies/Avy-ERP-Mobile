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
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { useCompanyControls } from '@/features/company-admin/api/use-company-admin-queries';
import { useUpdateControls } from '@/features/company-admin/api/use-company-admin-mutations';
import type { SystemControls } from '@/lib/api/company-admin';

import { ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';

// ============ DEFAULTS (25 fields, 6 sections -- same as web) ============

const DEFAULTS: SystemControls = {
    attendanceEnabled: true,
    leaveEnabled: true,
    payrollEnabled: true,
    essEnabled: true,
    performanceEnabled: false,
    recruitmentEnabled: false,
    trainingEnabled: false,
    mobileAppEnabled: true,
    aiChatbotEnabled: false,
    ncEditMode: false,
    loadUnload: false,
    cycleTime: false,
    payrollLock: true,
    backdatedEntryControl: false,
    leaveCarryForward: true,
    compOffEnabled: false,
    halfDayLeaveEnabled: true,
    mfaRequired: false,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    passwordMinLength: 8,
    passwordComplexity: true,
    accountLockThreshold: 5,
    accountLockDurationMinutes: 30,
    auditLogRetentionDays: 365,
};

const AUDIT_RETENTION_OPTIONS = ['30', '90', '180', '365', '730'];
const AUDIT_RETENTION_LABELS: Record<string, string> = {
    '30': '30 days', '90': '90 days', '180': '180 days', '365': '1 year', '730': '2 years',
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
            <View style={styles.numberInputGroup}>
                <View style={styles.numberInputWrap}>
                    <TextInput
                        style={styles.numberInput}
                        value={String(value)}
                        onChangeText={(v) => onChange(Number(v) || 0)}
                        keyboardType="number-pad"
                    />
                </View>
                {suffix && <Text className="ml-1 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function SystemControlsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useCompanyControls();
    const updateMutation = useUpdateControls();

    const [controls, setControls] = React.useState<SystemControls>({ ...DEFAULTS });
    const [hasChanges, setHasChanges] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    const serverControls: SystemControls = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? {};
        return { ...DEFAULTS, ...raw };
    }, [response]);

    React.useEffect(() => {
        if (response) {
            setControls({ ...serverControls });
            setHasChanges(false);
        }
    }, [response]);

    const updateField = <K extends keyof SystemControls>(key: K, value: SystemControls[K]) => {
        setControls((p) => ({ ...p, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(controls, {
            onSuccess: () => {
                setHasChanges(false);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
            },
        });
    };

    const handleReset = () => {
        setControls({ ...serverControls });
        setHasChanges(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">System Controls</Text>
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">System Controls</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}>
                    <EmptyState icon="error" title="Failed to load controls" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} />
                </View>
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
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">System Controls</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasChanges ? 120 : 40) }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">System Controls</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Module enablement, security, and audit settings</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Section 1: Module Enablement (9 toggles) */}
                    <SectionCard title="Module Enablement">
                        <ToggleRow label="Attendance" subtitle="Enable attendance tracking module" value={controls.attendanceEnabled} onToggle={(v) => updateField('attendanceEnabled', v)} />
                        <ToggleRow label="Leave Management" subtitle="Enable leave management module" value={controls.leaveEnabled} onToggle={(v) => updateField('leaveEnabled', v)} />
                        <ToggleRow label="Payroll" subtitle="Enable payroll processing module" value={controls.payrollEnabled} onToggle={(v) => updateField('payrollEnabled', v)} />
                        <ToggleRow label="Employee Self-Service" subtitle="Enable ESS portal for employees" value={controls.essEnabled} onToggle={(v) => updateField('essEnabled', v)} />
                        <ToggleRow label="Performance" subtitle="Enable performance management module" value={controls.performanceEnabled} onToggle={(v) => updateField('performanceEnabled', v)} />
                        <ToggleRow label="Recruitment" subtitle="Enable recruitment and hiring module" value={controls.recruitmentEnabled} onToggle={(v) => updateField('recruitmentEnabled', v)} />
                        <ToggleRow label="Training" subtitle="Enable training and development module" value={controls.trainingEnabled} onToggle={(v) => updateField('trainingEnabled', v)} />
                        <ToggleRow label="Mobile App" subtitle="Enable mobile app access for employees" value={controls.mobileAppEnabled} onToggle={(v) => updateField('mobileAppEnabled', v)} />
                        <ToggleRow label="AI Chatbot" subtitle="Enable AI-powered chatbot assistant" value={controls.aiChatbotEnabled} onToggle={(v) => updateField('aiChatbotEnabled', v)} />
                    </SectionCard>

                    {/* Section 2: Production (3 toggles) */}
                    <SectionCard title="Production">
                        <ToggleRow label="NC Edit Mode" subtitle="Allow editing non-conformance records" value={controls.ncEditMode} onToggle={(v) => updateField('ncEditMode', v)} />
                        <ToggleRow label="Load / Unload Tracking" subtitle="Track machine loading and unloading events" value={controls.loadUnload} onToggle={(v) => updateField('loadUnload', v)} />
                        <ToggleRow label="Cycle Time Capture" subtitle="Record cycle times for production runs" value={controls.cycleTime} onToggle={(v) => updateField('cycleTime', v)} />
                    </SectionCard>

                    {/* Section 3: Payroll (2 toggles) */}
                    <SectionCard title="Payroll">
                        <ToggleRow label="Payroll Lock" subtitle="Lock payroll after processing" value={controls.payrollLock} onToggle={(v) => updateField('payrollLock', v)} />
                        <ToggleRow label="Backdated Entry Control" subtitle="Control backdated payroll entries" value={controls.backdatedEntryControl} onToggle={(v) => updateField('backdatedEntryControl', v)} />
                    </SectionCard>

                    {/* Section 4: Leave (3 toggles) */}
                    <SectionCard title="Leave">
                        <ToggleRow label="Leave Carry Forward" subtitle="Allow carrying forward unused leave" value={controls.leaveCarryForward} onToggle={(v) => updateField('leaveCarryForward', v)} />
                        <ToggleRow label="Compensatory Off" subtitle="Enable comp-off for working on holidays" value={controls.compOffEnabled} onToggle={(v) => updateField('compOffEnabled', v)} />
                        <ToggleRow label="Half-Day Leave" subtitle="Allow half-day leave applications" value={controls.halfDayLeaveEnabled} onToggle={(v) => updateField('halfDayLeaveEnabled', v)} />
                    </SectionCard>

                    {/* Section 5: Security & Access (7 fields) */}
                    <SectionCard title="Security & Access">
                        <ToggleRow label="MFA Required" subtitle="Enforce multi-factor authentication for all users" value={controls.mfaRequired} onToggle={(v) => updateField('mfaRequired', v)} />
                        <NumberRow label="Session Timeout" subtitle="Auto-logout after inactivity" value={controls.sessionTimeoutMinutes} onChange={(v) => updateField('sessionTimeoutMinutes', v)} suffix="min" />
                        <NumberRow label="Max Concurrent Sessions" subtitle="Maximum active sessions per user" value={controls.maxConcurrentSessions} onChange={(v) => updateField('maxConcurrentSessions', v)} suffix="sessions" />
                        <NumberRow label="Password Min Length" subtitle="Minimum password character count" value={controls.passwordMinLength} onChange={(v) => updateField('passwordMinLength', v)} suffix="chars" />
                        <ToggleRow label="Password Complexity" subtitle="Require uppercase, lowercase, number, and special character" value={controls.passwordComplexity} onToggle={(v) => updateField('passwordComplexity', v)} />
                        <NumberRow label="Account Lock Threshold" subtitle="Failed attempts before account lock" value={controls.accountLockThreshold} onChange={(v) => updateField('accountLockThreshold', v)} suffix="attempts" />
                        <NumberRow label="Account Lock Duration" subtitle="Auto-unlock after" value={controls.accountLockDurationMinutes} onChange={(v) => updateField('accountLockDurationMinutes', v)} suffix="min" />
                    </SectionCard>

                    {/* Section 6: Audit (1 field) */}
                    <SectionCard title="Audit">
                        <ChipSelector
                            label="Audit Log Retention"
                            options={AUDIT_RETENTION_OPTIONS.map((v) => AUDIT_RETENTION_LABELS[v] ?? v)}
                            selected={AUDIT_RETENTION_LABELS[String(controls.auditLogRetentionDays)] ?? String(controls.auditLogRetentionDays)}
                            onSelect={(v) => {
                                const key = Object.entries(AUDIT_RETENTION_LABELS).find(([, label]) => label === v)?.[0];
                                updateField('auditLogRetentionDays', Number(key) || 365);
                            }}
                            hint="How long to retain audit logs"
                        />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Bar */}
            {hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.saveRow}>
                        <Pressable onPress={handleReset} style={styles.resetBtn}>
                            <Text className="font-inter text-sm font-bold text-neutral-600">Reset</Text>
                        </Pressable>
                        <Pressable onPress={handleSave} disabled={updateMutation.isPending} style={[styles.saveBtnFull, updateMutation.isPending && { opacity: 0.5 }]}>
                            {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Save Changes</Text>}
                        </Pressable>
                    </View>
                </Animated.View>
            )}

            {showToast && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { top: insets.top + 60 }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">Controls saved successfully</Text>
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
    numberInputGroup: { flexDirection: 'row', alignItems: 'center' },
    numberInputWrap: {
        backgroundColor: colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200],
        paddingHorizontal: 10, height: 38, minWidth: 60, justifyContent: 'center',
    },
    numberInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950], textAlign: 'right' },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveRow: { flexDirection: 'row', gap: 12 },
    resetBtn: {
        height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200],
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
    },
    saveBtnFull: {
        flex: 1, height: 52, borderRadius: 16, backgroundColor: colors.primary[600],
        justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    toast: {
        position: 'absolute', left: 20, right: 20, backgroundColor: colors.success[50],
        borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
});
