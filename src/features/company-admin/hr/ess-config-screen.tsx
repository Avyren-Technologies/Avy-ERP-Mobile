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

import { useEssConfig } from '@/features/company-admin/api/use-ess-queries';
import { useUpdateEssConfig } from '@/features/company-admin/api/use-ess-mutations';

// ============ TYPES ============

interface PortalAccessForm {
    loginMethod: string;
    passwordMinLength: string;
    passwordComplexity: boolean;
    sessionTimeout: string;
    mfaEnabled: boolean;
}

interface FeatureToggles {
    viewPayslips: boolean;
    downloadForm16: boolean;
    leaveApplication: boolean;
    leaveBalance: boolean;
    itDeclaration: boolean;
    attendanceView: boolean;
    regularization: boolean;
    reimbursements: boolean;
    profileUpdate: boolean;
    documentUpload: boolean;
    loanApplication: boolean;
    assetView: boolean;
    performanceGoals: boolean;
    appraisalAccess: boolean;
    feedback360: boolean;
    training: boolean;
    helpDesk: boolean;
    directory: boolean;
    holidayCalendar: boolean;
    policyDocs: boolean;
    grievance: boolean;
}

const FEATURE_LABELS: Record<keyof FeatureToggles, string> = {
    viewPayslips: 'View Payslips',
    downloadForm16: 'Download Form 16',
    leaveApplication: 'Leave Application',
    leaveBalance: 'Leave Balance',
    itDeclaration: 'IT Declaration',
    attendanceView: 'Attendance View',
    regularization: 'Regularization',
    reimbursements: 'Reimbursements',
    profileUpdate: 'Profile Update',
    documentUpload: 'Document Upload',
    loanApplication: 'Loan Application',
    assetView: 'Asset View',
    performanceGoals: 'Performance Goals',
    appraisalAccess: 'Appraisal Access',
    feedback360: '360 Feedback',
    training: 'Training',
    helpDesk: 'Help Desk',
    directory: 'Directory',
    holidayCalendar: 'Holiday Calendar',
    policyDocs: 'Policy Documents',
    grievance: 'Grievance',
};

const LOGIN_METHODS = ['Password', 'SSO', 'OTP'];

const DEFAULT_PORTAL: PortalAccessForm = {
    loginMethod: 'Password',
    passwordMinLength: '8',
    passwordComplexity: true,
    sessionTimeout: '30',
    mfaEnabled: false,
};

const DEFAULT_FEATURES: FeatureToggles = {
    viewPayslips: true, downloadForm16: true, leaveApplication: true, leaveBalance: true,
    itDeclaration: true, attendanceView: true, regularization: true, reimbursements: false,
    profileUpdate: true, documentUpload: true, loanApplication: false, assetView: false,
    performanceGoals: false, appraisalAccess: false, feedback360: false, training: false,
    helpDesk: false, directory: true, holidayCalendar: true, policyDocs: true, grievance: false,
};

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

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
            </View>
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.neutral[200], true: colors.primary[400] }} thumbColor={value ? colors.primary[600] : colors.neutral[300]} />
        </View>
    );
}

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

function SaveSectionBtn({ onPress, isPending, hasChanges }: { onPress: () => void; isPending: boolean; hasChanges: boolean }) {
    return (
        <Pressable onPress={onPress} disabled={!hasChanges || isPending} style={[styles.sectionSaveBtn, (!hasChanges || isPending) && { opacity: 0.5 }]}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-xs font-bold text-white">{hasChanges ? 'Save' : 'Saved'}</Text>}
        </Pressable>
    );
}

// ============ MAIN COMPONENT ============

export function EssConfigScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: configResponse, isLoading, error, refetch } = useEssConfig();
    const updateConfig = useUpdateEssConfig();

    const [collapsed, setCollapsed] = React.useState({ portal: false, features: true });
    const toggle = (key: keyof typeof collapsed) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // Portal Access form
    const [portal, setPortal] = React.useState<PortalAccessForm>(DEFAULT_PORTAL);
    const [portalDirty, setPortalDirty] = React.useState(false);

    // Feature toggles
    const [features, setFeatures] = React.useState<FeatureToggles>(DEFAULT_FEATURES);
    const [featuresDirty, setFeaturesDirty] = React.useState(false);

    React.useEffect(() => {
        if (configResponse) {
            const d: any = (configResponse as any)?.data ?? configResponse ?? {};
            setPortal({
                loginMethod: d.loginMethod ?? DEFAULT_PORTAL.loginMethod,
                passwordMinLength: String(d.passwordMinLength ?? DEFAULT_PORTAL.passwordMinLength),
                passwordComplexity: d.passwordComplexity ?? DEFAULT_PORTAL.passwordComplexity,
                sessionTimeout: String(d.sessionTimeout ?? DEFAULT_PORTAL.sessionTimeout),
                mfaEnabled: d.mfaEnabled ?? DEFAULT_PORTAL.mfaEnabled,
            });
            const ft = d.features ?? {};
            const loaded: FeatureToggles = { ...DEFAULT_FEATURES };
            for (const key of Object.keys(DEFAULT_FEATURES) as (keyof FeatureToggles)[]) {
                if (ft[key] !== undefined) loaded[key] = ft[key];
            }
            setFeatures(loaded);
            setPortalDirty(false);
            setFeaturesDirty(false);
        }
    }, [configResponse]);

    const handleSavePortal = () => {
        updateConfig.mutate({
            loginMethod: portal.loginMethod,
            passwordMinLength: Number(portal.passwordMinLength),
            passwordComplexity: portal.passwordComplexity,
            sessionTimeout: Number(portal.sessionTimeout),
            mfaEnabled: portal.mfaEnabled,
        }, { onSuccess: () => setPortalDirty(false) });
    };

    const handleSaveFeatures = () => {
        updateConfig.mutate({ features } as unknown as Record<string, unknown>, { onSuccess: () => setFeaturesDirty(false) });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">ESS Configuration</Text>
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">ESS Configuration</Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} /></View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">ESS Configuration</Text>
                <View style={{ width: 36 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">ESS Portal Configuration</Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">Portal access, features, and employee self-service settings</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Portal Access */}
                    <SectionCard title="Portal Access" subtitle="Login, security, and session settings" collapsed={collapsed.portal} onToggle={() => toggle('portal')}>
                        <ChipSelector label="Login Method" options={LOGIN_METHODS} value={portal.loginMethod} onSelect={v => { setPortal(p => ({ ...p, loginMethod: v })); setPortalDirty(true); }} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Password Min Length</Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="8" placeholderTextColor={colors.neutral[400]} value={portal.passwordMinLength} onChangeText={v => { setPortal(p => ({ ...p, passwordMinLength: v })); setPortalDirty(true); }} keyboardType="number-pad" />
                            </View>
                        </View>
                        <ToggleRow label="Password Complexity" value={portal.passwordComplexity} onToggle={v => { setPortal(p => ({ ...p, passwordComplexity: v })); setPortalDirty(true); }} />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Session Timeout (minutes)</Text>
                            <View style={styles.inputWrap}>
                                <TextInput style={styles.textInput} placeholder="30" placeholderTextColor={colors.neutral[400]} value={portal.sessionTimeout} onChangeText={v => { setPortal(p => ({ ...p, sessionTimeout: v })); setPortalDirty(true); }} keyboardType="number-pad" />
                            </View>
                        </View>
                        <ToggleRow label="Multi-Factor Authentication" value={portal.mfaEnabled} onToggle={v => { setPortal(p => ({ ...p, mfaEnabled: v })); setPortalDirty(true); }} />
                        <SaveSectionBtn onPress={handleSavePortal} isPending={updateConfig.isPending} hasChanges={portalDirty} />
                    </SectionCard>

                    {/* Employee Features */}
                    <SectionCard title="Employee Features" subtitle="Toggle ESS features available to employees" collapsed={collapsed.features} onToggle={() => toggle('features')}>
                        {(Object.keys(FEATURE_LABELS) as (keyof FeatureToggles)[]).map(key => (
                            <ToggleRow
                                key={key}
                                label={FEATURE_LABELS[key]}
                                value={features[key]}
                                onToggle={v => { setFeatures(p => ({ ...p, [key]: v })); setFeaturesDirty(true); }}
                            />
                        ))}
                        <SaveSectionBtn onPress={handleSaveFeatures} isPending={updateConfig.isPending} hasChanges={featuresDirty} />
                    </SectionCard>
                </Animated.View>
            </ScrollView>
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
    textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    sectionSaveBtn: {
        marginTop: 12, height: 40, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center',
        shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
    },
});
