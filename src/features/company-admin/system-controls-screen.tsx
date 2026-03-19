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

// ============ TYPES ============

interface ControlsForm {
    // Production Controls
    ncEditMode: boolean;
    loadUnload: boolean;
    cycleTime: boolean;
    // Payroll Controls
    payrollLock: boolean;
    backdatedEntry: boolean;
    // Security Controls
    mfa: boolean;
    sessionTimeout: string;
    ipWhitelist: boolean;
    // Leave Controls
    leaveCarryForward: boolean;
    overtimeApproval: boolean;
    // Notification Controls
    emailNotifications: boolean;
    auditLogRetention: string;
}

const RETENTION_OPTIONS = ['30 days', '60 days', '90 days', '180 days', '1 year', '2 years'];

const DEFAULT_FORM: ControlsForm = {
    ncEditMode: false,
    loadUnload: false,
    cycleTime: false,
    payrollLock: false,
    backdatedEntry: false,
    mfa: false,
    sessionTimeout: '30',
    ipWhitelist: false,
    leaveCarryForward: false,
    overtimeApproval: false,
    emailNotifications: true,
    auditLogRetention: '90 days',
};

// ============ REUSABLE COMPONENTS ============

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text className="mb-1 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                {title}
            </Text>
            {subtitle && (
                <Text className="mb-3 font-inter text-xs text-neutral-500 leading-relaxed">{subtitle}</Text>
            )}
            {!subtitle && <View style={{ height: 8 }} />}
            {children}
        </View>
    );
}

function ToggleRow({
    label,
    subtitle,
    value,
    onToggle,
}: {
    label: string;
    subtitle?: string;
    value: boolean;
    onToggle: (v: boolean) => void;
}) {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && (
                    <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                thumbColor={value ? colors.primary[600] : colors.neutral[300]}
            />
        </View>
    );
}

function RetentionDropdown({
    value,
    onSelect,
}: {
    value: string;
    onSelect: (v: string) => void;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <View style={[styles.fieldWrap, { zIndex: open ? 1200 : 1, position: 'relative' }]}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">Audit Log Retention</Text>
            <Pressable
                onPress={() => setOpen(v => !v)}
                style={[styles.inputWrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, open && { borderColor: colors.primary[400] }]}
            >
                <Text className={`flex-1 font-inter text-sm ${value ? 'text-primary-950' : 'text-neutral-400'}`}>
                    {value || 'Select...'}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Pressable>
            {open && (
                <>
                    <Pressable onPress={() => setOpen(false)} style={{ position: 'absolute', top: -3000, left: -3000, right: -3000, bottom: -3000, zIndex: 1199 }} />
                    <View style={styles.dropdownList}>
                        <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                            {RETENTION_OPTIONS.map((item, idx) => (
                                <Pressable
                                    key={item}
                                    onPress={() => { onSelect(item); setOpen(false); }}
                                    style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: item === value ? colors.primary[50] : '#fff', borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.neutral[100] }}
                                >
                                    <Text className={`font-inter text-sm ${item === value ? 'font-semibold text-primary-700' : 'text-primary-950'}`}>
                                        {item}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function SystemControlsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: response, isLoading, error, refetch } = useCompanyControls();
    const updateMutation = useUpdateControls();

    const [form, setForm] = React.useState<ControlsForm>(DEFAULT_FORM);
    const [hasChanges, setHasChanges] = React.useState(false);

    // Map API data to form on load
    React.useEffect(() => {
        if (response) {
            const data = (response as any)?.data ?? response;
            if (data && typeof data === 'object') {
                setForm({
                    ncEditMode: data.ncEditMode ?? DEFAULT_FORM.ncEditMode,
                    loadUnload: data.loadUnload ?? DEFAULT_FORM.loadUnload,
                    cycleTime: data.cycleTime ?? DEFAULT_FORM.cycleTime,
                    payrollLock: data.payrollLock ?? DEFAULT_FORM.payrollLock,
                    backdatedEntry: data.backdatedEntry ?? DEFAULT_FORM.backdatedEntry,
                    mfa: data.mfa ?? DEFAULT_FORM.mfa,
                    sessionTimeout: String(data.sessionTimeout ?? DEFAULT_FORM.sessionTimeout),
                    ipWhitelist: data.ipWhitelist ?? DEFAULT_FORM.ipWhitelist,
                    leaveCarryForward: data.leaveCarryForward ?? DEFAULT_FORM.leaveCarryForward,
                    overtimeApproval: data.overtimeApproval ?? DEFAULT_FORM.overtimeApproval,
                    emailNotifications: data.emailNotifications ?? DEFAULT_FORM.emailNotifications,
                    auditLogRetention: data.auditLogRetention ?? DEFAULT_FORM.auditLogRetention,
                });
                setHasChanges(false);
            }
        }
    }, [response]);

    const updateForm = (updates: Partial<ControlsForm>) => {
        setForm(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(form as unknown as Record<string, unknown>, {
            onSuccess: () => setHasChanges(false),
        });
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                        System Controls
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                        System Controls
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
                <View style={{ paddingTop: 60, alignItems: 'center' }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load controls"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                    System Controls
                </Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
                    <Text className="font-inter text-2xl font-bold text-primary-950">
                        System Controls
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        Company-level settings that apply to all plants and locations
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    {/* Production Controls */}
                    <SectionCard title="Production Controls">
                        <ToggleRow
                            label="NC Edit Mode"
                            subtitle="Allows operators to edit or delete existing Non-Conformance entries"
                            value={form.ncEditMode}
                            onToggle={v => updateForm({ ncEditMode: v })}
                        />
                        <ToggleRow
                            label="Load / Unload Assignment"
                            subtitle="When enabled, Load & Unload time is tracked and assigned to a category"
                            value={form.loadUnload}
                            onToggle={v => updateForm({ loadUnload: v })}
                        />
                        <ToggleRow
                            label="Cycle Time Capture"
                            subtitle="Capture cycle time data and include in production analytics"
                            value={form.cycleTime}
                            onToggle={v => updateForm({ cycleTime: v })}
                        />
                    </SectionCard>

                    {/* Payroll Controls */}
                    <SectionCard title="Payroll Controls">
                        <ToggleRow
                            label="Payroll Lock"
                            subtitle="Prevent payroll modifications after lock date"
                            value={form.payrollLock}
                            onToggle={v => updateForm({ payrollLock: v })}
                        />
                        <ToggleRow
                            label="Backdated Entry Control"
                            subtitle="Block or flag backdated attendance and leave entries"
                            value={form.backdatedEntry}
                            onToggle={v => updateForm({ backdatedEntry: v })}
                        />
                    </SectionCard>

                    {/* Security Controls */}
                    <SectionCard title="Security Controls">
                        <ToggleRow
                            label="Multi-Factor Authentication (MFA)"
                            subtitle="Require OTP / Authenticator app for login"
                            value={form.mfa}
                            onToggle={v => updateForm({ mfa: v })}
                        />
                        <View style={styles.fieldWrap}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                                Session Timeout (minutes)
                            </Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="30"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={form.sessionTimeout}
                                    onChangeText={v => updateForm({ sessionTimeout: v })}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                Users will be logged out after this period of inactivity
                            </Text>
                        </View>
                        <ToggleRow
                            label="IP Whitelist"
                            subtitle="Restrict access to approved IP addresses only"
                            value={form.ipWhitelist}
                            onToggle={v => updateForm({ ipWhitelist: v })}
                        />
                    </SectionCard>

                    {/* Leave Controls */}
                    <SectionCard title="Leave Controls">
                        <ToggleRow
                            label="Leave Carry Forward"
                            subtitle="Enable automatic carry forward of unused leave at year end"
                            value={form.leaveCarryForward}
                            onToggle={v => updateForm({ leaveCarryForward: v })}
                        />
                        <ToggleRow
                            label="Overtime Approval"
                            subtitle="Require manager approval before overtime is paid"
                            value={form.overtimeApproval}
                            onToggle={v => updateForm({ overtimeApproval: v })}
                        />
                    </SectionCard>

                    {/* Notification Controls */}
                    <SectionCard title="Notification Controls">
                        <ToggleRow
                            label="Email Notifications"
                            subtitle="Send automated email notifications for key events"
                            value={form.emailNotifications}
                            onToggle={v => updateForm({ emailNotifications: v })}
                        />
                        <RetentionDropdown
                            value={form.auditLogRetention}
                            onSelect={v => updateForm({ auditLogRetention: v })}
                        />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                    onPress={handleSave}
                    disabled={!hasChanges || updateMutation.isPending}
                    style={[styles.saveBtn, (!hasChanges || updateMutation.isPending) && { opacity: 0.5 }]}
                >
                    {updateMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text className="font-inter text-base font-bold text-white">
                            {hasChanges ? 'Save Changes' : 'No Changes'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    fieldWrap: {
        marginTop: 12,
        marginBottom: 4,
    },
    inputWrap: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 46,
        justifyContent: 'center',
    },
    textInput: {
        fontFamily: 'Inter',
        fontSize: 14,
        color: colors.primary[950],
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 1200,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    saveBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        backgroundColor: 'rgba(248, 247, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    saveBtn: {
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});
