/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { ESSConfig } from '@/lib/api/ess';
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
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoTooltip, SectionDescription } from '@/components/ui/info-tooltip';
import { useSidebar } from '@/components/ui/sidebar';

import { SkeletonCard } from '@/components/ui/skeleton';
import { useUpdateEssConfig } from '@/features/company-admin/api/use-ess-mutations';
import { useEssConfig } from '@/features/company-admin/api/use-ess-queries';

import { ChipSelector } from '@/features/super-admin/tenant-onboarding/atoms';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ OPTIONS (same as web) ============

const LOCATION_ACCURACY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const LOCATION_ACCURACY_LABELS: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

// ============ DEFAULTS (36 fields -- same as web) ============

const DEFAULTS: ESSConfig = {
    viewPayslips: true,
    downloadPayslips: true,
    downloadForm16: true,
    viewSalaryStructure: false,
    itDeclaration: true,
    leaveApplication: true,
    leaveBalanceView: true,
    leaveCancellation: false,
    attendanceView: true,
    attendanceRegularization: false,
    viewShiftSchedule: false,
    shiftSwapRequest: false,
    wfhRequest: false,
    profileUpdate: false,
    documentUpload: false,
    employeeDirectory: false,
    viewOrgChart: false,
    reimbursementClaims: false,
    loanApplication: false,
    assetView: false,
    performanceGoals: false,
    appraisalAccess: false,
    feedback360: false,
    trainingEnrollment: false,
    helpDesk: false,
    grievanceSubmission: false,
    holidayCalendar: true,
    policyDocuments: false,
    announcementBoard: false,
    mssViewTeam: false,
    mssApproveLeave: false,
    mssApproveAttendance: false,
    mssViewTeamAttendance: false,
    mobileOfflinePunch: false,
    mobileSyncRetryMinutes: 5,
    mobileLocationAccuracy: 'HIGH',
};

// ============ SECTION CONFIG (same 9 sections as web) ============

interface EssFieldDef {
    key: keyof ESSConfig;
    label: string;
    description?: string;
    tooltip?: string;
    type: 'toggle' | 'number' | 'select';
    suffix?: string;
    min?: number;
    max?: number;
}

interface EssSectionDef {
    title: string;
    sectionDescription?: string;
    fields: EssFieldDef[];
}

const SECTIONS: EssSectionDef[] = [
    {
        title: 'Payroll & Tax',
        sectionDescription: 'Control what payroll and tax information employees can view and download through the self-service portal.',
        fields: [
            { key: 'viewPayslips', label: 'View Payslips', description: 'Access monthly salary slips', type: 'toggle' },
            { key: 'downloadPayslips', label: 'Download Payslips', description: 'Allow PDF download of payslips', type: 'toggle' },
            { key: 'downloadForm16', label: 'Download Form 16', description: 'Access Form 16 / TDS certificate', type: 'toggle' },
            { key: 'viewSalaryStructure', label: 'View Salary Structure', description: 'Show salary component breakdown', type: 'toggle' },
            { key: 'itDeclaration', label: 'IT Declaration', description: 'Submit investment declarations for tax saving', type: 'toggle' },
        ],
    },
    {
        title: 'Leave',
        sectionDescription: 'Configure which leave-related actions employees can perform on their own.',
        fields: [
            { key: 'leaveApplication', label: 'Leave Application', description: 'Allow leave application through ESS', type: 'toggle' },
            { key: 'leaveBalanceView', label: 'Leave Balance View', description: 'Show available leave balances', type: 'toggle' },
            { key: 'leaveCancellation', label: 'Leave Cancellation', description: 'Allow cancelling pending/approved leave', type: 'toggle' },
        ],
    },
    {
        title: 'Attendance',
        sectionDescription: 'Define which attendance features are available to employees in the self-service portal.',
        fields: [
            { key: 'attendanceView', label: 'Attendance View', description: 'Show daily attendance records', type: 'toggle' },
            { key: 'attendanceRegularization', label: 'Attendance Regularization', description: 'Request attendance corrections', type: 'toggle' },
            { key: 'viewShiftSchedule', label: 'View Shift Schedule', description: 'Display assigned shift roster', type: 'toggle' },
            { key: 'shiftSwapRequest', label: 'Shift Swap Request', description: 'Allow requesting shift swaps', type: 'toggle', tooltip: 'Allow employees to request swapping shifts with colleagues.' },
            { key: 'wfhRequest', label: 'WFH Request', description: 'Allow work from home requests', type: 'toggle', tooltip: 'Allow employees to request work-from-home days.' },
        ],
    },
    {
        title: 'Profile & Documents',
        sectionDescription: 'Manage employee access to profile editing, document uploads, and organizational information.',
        fields: [
            { key: 'profileUpdate', label: 'Profile Update', description: 'Allow employees to request profile changes', type: 'toggle' },
            { key: 'documentUpload', label: 'Document Upload', description: 'Allow employees to upload documents', type: 'toggle' },
            { key: 'employeeDirectory', label: 'Employee Directory', description: 'Access company employee directory', type: 'toggle' },
            { key: 'viewOrgChart', label: 'View Org Chart', description: 'Display organisation hierarchy', type: 'toggle' },
        ],
    },
    {
        title: 'Financial',
        sectionDescription: 'Control access to financial self-service features like reimbursements, loans, and asset tracking.',
        fields: [
            { key: 'reimbursementClaims', label: 'Reimbursement Claims', description: 'Submit expense reimbursements', type: 'toggle' },
            { key: 'loanApplication', label: 'Loan Application', description: 'Apply for company loans', type: 'toggle' },
            { key: 'assetView', label: 'Asset View', description: 'View assigned company assets', type: 'toggle' },
        ],
    },
    {
        title: 'Performance',
        sectionDescription: 'Enable performance management features employees can access through self-service.',
        fields: [
            { key: 'performanceGoals', label: 'Performance Goals', description: 'View and manage performance goals', type: 'toggle' },
            { key: 'appraisalAccess', label: 'Appraisal Access', description: 'Access appraisal forms and history', type: 'toggle' },
            { key: 'feedback360', label: '360 Feedback', description: 'Participate in 360-degree feedback', type: 'toggle' },
            { key: 'trainingEnrollment', label: 'Training Enrollment', description: 'Enroll in training programs', type: 'toggle' },
        ],
    },
    {
        title: 'Support & Communication',
        sectionDescription: 'Configure employee access to help desk, grievance submission, and company communications.',
        fields: [
            { key: 'helpDesk', label: 'Help Desk', description: 'Access IT / HR help desk', type: 'toggle' },
            { key: 'grievanceSubmission', label: 'Grievance Submission', description: 'Submit workplace grievances', type: 'toggle' },
            { key: 'holidayCalendar', label: 'Holiday Calendar', description: 'View company holiday calendar', type: 'toggle' },
            { key: 'policyDocuments', label: 'Policy Documents', description: 'Access company policy documents', type: 'toggle' },
            { key: 'announcementBoard', label: 'Announcement Board', description: 'View company announcements', type: 'toggle' },
        ],
    },
    {
        title: 'Manager Self-Service',
        sectionDescription: 'Control what managers can do for their direct reports through the portal.',
        fields: [
            { key: 'mssViewTeam', label: 'View Team Members', description: 'Show direct reportees list', type: 'toggle' },
            { key: 'mssApproveLeave', label: 'Approve/Reject Leave', description: 'Allow leave approvals for team', type: 'toggle' },
            { key: 'mssApproveAttendance', label: 'Approve Attendance', description: 'Allow attendance regularization approvals', type: 'toggle', tooltip: 'Allow managers to approve or reject attendance regularization requests from their team.' },
            { key: 'mssViewTeamAttendance', label: 'View Team Attendance', description: 'Show team attendance summary', type: 'toggle' },
        ],
    },
    {
        title: 'Mobile Behavior',
        sectionDescription: 'Configure mobile app behavior for attendance capture, offline support, and location tracking.',
        fields: [
            { key: 'mobileOfflinePunch', label: 'Offline Punch', description: 'Allow offline attendance capture on mobile', type: 'toggle', tooltip: 'Allow attendance punches to be recorded offline on mobile and synced later.' },
            { key: 'mobileSyncRetryMinutes', label: 'Sync Retry Interval', description: 'Minutes between offline sync retries', type: 'number', suffix: 'min', min: 1, max: 60, tooltip: 'How often the mobile app retries syncing failed offline punches.' },
            { key: 'mobileLocationAccuracy', label: 'Location Accuracy', description: 'GPS accuracy level for mobile attendance', type: 'select' },
        ],
    },
];

// ============ REUSABLE ============

function SectionCard({ title, children, sectionDescription }: { title: string; children: React.ReactNode; sectionDescription?: string }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
            {sectionDescription && <SectionDescription>{sectionDescription}</SectionDescription>}
            {!sectionDescription && <View style={{ height: 8 }} />}
            {children}
        </View>
    );
}

function ToggleRow({ label, subtitle, value, onToggle, tooltip }: { label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void; tooltip?: string }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{label}</Text>
                    {tooltip && <InfoTooltip content={tooltip} />}
                </View>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>{subtitle}</Text>}
            </View>
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

function NumberRow({ label, subtitle, value, onChange, suffix, tooltip }: { label: string; subtitle?: string; value: number; onChange: (v: number) => void; suffix?: string; tooltip?: string }) {
    return (
        <View style={styles.numberRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{label}</Text>
                    {tooltip && <InfoTooltip content={tooltip} />}
                </View>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>{subtitle}</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.numberInputWrap}>
                    <TextInput style={styles.numberInput} value={String(value)} onChangeText={(v) => onChange(Number(v) || 0)} keyboardType="number-pad" />
                </View>
                {suffix && <Text className="ml-1 font-inter text-xs text-neutral-400">{suffix}</Text>}
            </View>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function EssConfigScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const { data: response, isLoading, error, refetch } = useEssConfig();
    const updateMutation = useUpdateEssConfig();

    const [config, setConfig] = React.useState<ESSConfig>({ ...DEFAULTS });
    const [hasChanges, setHasChanges] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    const serverConfig: ESSConfig = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? {};
        return { ...DEFAULTS, ...raw };
    }, [response]);

    React.useEffect(() => {
        if (response) {
            setConfig({ ...serverConfig });
            setHasChanges(false);
        }
    }, [response]);

    const updateField = <K extends keyof ESSConfig>(key: K, value: ESSConfig[K]) => {
        setConfig((p) => ({ ...p, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(config, {
            onSuccess: () => {
                setHasChanges(false);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
            },
        });
    };

    const handleReset = () => {
        setConfig({ ...serverConfig });
        setHasChanges(false);
    };

    // Count toggles
    const toggleCount = SECTIONS.reduce((sum, sec) => sum + sec.fields.filter((f) => f.type === 'toggle').length, 0);
    const enabledCount = SECTIONS.reduce((sum, sec) => sum + sec.fields.filter((f) => f.type === 'toggle' && config[f.key] === true).length, 0);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="ESS Configuration" onMenuPress={toggle} />
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <AppTopHeader title="ESS Configuration" onMenuPress={toggle} />
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load ESS config" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <AppTopHeader title="ESS Configuration" onMenuPress={toggle} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasChanges ? 120 : 40) }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {SECTIONS.map((section) => (
                        <SectionCard key={section.title} title={section.title} sectionDescription={section.sectionDescription}>
                            {section.fields.map((field) => {
                                if (field.type === 'toggle') {
                                    return (
                                        <ToggleRow
                                            key={field.key}
                                            label={field.label}
                                            subtitle={field.description}
                                            value={config[field.key] as boolean}
                                            onToggle={(v) => updateField(field.key, v as never)}
                                            tooltip={field.tooltip}
                                        />
                                    );
                                }
                                if (field.type === 'number') {
                                    return (
                                        <NumberRow
                                            key={field.key}
                                            label={field.label}
                                            subtitle={field.description}
                                            value={config[field.key] as number}
                                            onChange={(v) => updateField(field.key, v as never)}
                                            suffix={field.suffix}
                                            tooltip={field.tooltip}
                                        />
                                    );
                                }
                                if (field.type === 'select') {
                                    return (
                                        <ChipSelector
                                            key={field.key}
                                            label={field.label}
                                            options={LOCATION_ACCURACY_OPTIONS.map((o) => LOCATION_ACCURACY_LABELS[o])}
                                            selected={LOCATION_ACCURACY_LABELS[config[field.key] as string] ?? (config[field.key] as string)}
                                            onSelect={(v) => {
                                                const key = Object.entries(LOCATION_ACCURACY_LABELS).find(([, l]) => l === v)?.[0] ?? 'HIGH';
                                                updateField(field.key, key as never);
                                            }}
                                            hint={field.description}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </SectionCard>
                    ))}
                </Animated.View>
            </ScrollView>

            {/* Single Save Button (NOT per-section) */}
            {hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.saveRow}>
                        <Pressable onPress={handleReset} style={styles.resetBtn}><Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">Reset</Text></Pressable>
                        <Pressable onPress={handleSave} disabled={updateMutation.isPending} style={[styles.saveBtnFull, updateMutation.isPending && { opacity: 0.5 }]}>
                            {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Save Changes</Text>}
                        </Pressable>
                    </View>
                </Animated.View>
            )}

            {showToast && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { top: insets.top + 60 }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">ESS config saved</Text>
                </Animated.View>
            )}
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
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    numberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    numberInputWrap: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 10, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 10, height: 38, minWidth: 60, justifyContent: 'center',
    },
    numberInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950], textAlign: 'right' },
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)', borderTopWidth: 1, borderTopColor: colors.neutral[100],
    },
    saveRow: { flexDirection: 'row', gap: 12 },
    resetBtn: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
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
const styles = createStyles(false);
