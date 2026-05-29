/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
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
import { HelpDrawer } from '@/components/ui/help-drawer';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { configHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useUpdateMaintenanceConfig } from '@/features/maintenance/api/use-maintenance-mutations';
import { useMaintenanceConfig } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const NON_WORKING_DAY_OPTIONS = [
    { value: 'MOVE_EARLIER', label: 'Move Earlier' },
    { value: 'MOVE_LATER', label: 'Move Later' },
    { value: 'KEEP_DATE', label: 'Keep Date' },
];

const AUTO_ASSIGN_OPTIONS = [
    { value: 'PRIMARY_TECHNICIAN', label: 'Primary Technician' },
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'SKILL_BASED', label: 'Skill Based' },
];

// ============ FORM COMPONENTS ============

function SectionHeader({ title, icon }: { title: string; icon: string }) {
    return (
        <View style={sectionStyles.header}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d={icon} stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{title}</Text>
        </View>
    );
}

function NumberField({
    label,
    value,
    onChangeText,
    isDark,
    suffix,
    tooltip,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    isDark: boolean;
    suffix?: string;
    tooltip?: string;
}) {
    return (
        <View style={fieldStyles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text className="font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">{label}</Text>
                {tooltip ? <InfoTooltip content={tooltip} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                    style={[
                        fieldStyles.numberInput,
                        {
                            backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                            borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                            color: isDark ? colors.white : colors.primary[950],
                        },
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.neutral[400]}
                />
                {suffix ? <Text className="font-inter text-[10px] text-neutral-400">{suffix}</Text> : null}
            </View>
        </View>
    );
}

function ToggleField({
    label,
    value,
    onValueChange,
    tooltip,
}: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    tooltip?: string;
}) {
    return (
        <View style={fieldStyles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text className="font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">{label}</Text>
                {tooltip ? <InfoTooltip content={tooltip} /> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                thumbColor={value ? colors.primary[600] : colors.neutral[100]}
            />
        </View>
    );
}

function PickerField({
    label,
    value,
    options,
    onSelect,
    isDark,
    tooltip,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onSelect: (v: string) => void;
    isDark: boolean;
    tooltip?: string;
}) {
    return (
        <View style={fieldStyles.pickerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text className="font-inter text-xs font-semibold text-primary-900 dark:text-primary-100">{label}</Text>
                {tooltip ? <InfoTooltip content={tooltip} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {options.map((opt) => (
                    <Pressable
                        key={opt.value}
                        onPress={() => onSelect(opt.value)}
                        style={[
                            fieldStyles.pickerChip,
                            {
                                backgroundColor: value === opt.value ? colors.primary[600] : (isDark ? '#1E1B4B' : colors.neutral[50]),
                                borderColor: value === opt.value ? colors.primary[600] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                            },
                        ]}
                    >
                        <Text className={`font-inter text-[10px] font-bold ${value === opt.value ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                            {opt.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

// ============ MAIN ============

export function MaintenanceConfigScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    const { data: response, isLoading, error, refetch } = useMaintenanceConfig();
    const updateMutation = useUpdateMaintenanceConfig();

    const config: any = (response as any)?.data ?? null;

    // Form state
    const [defaultLeadDays, setDefaultLeadDays] = React.useState('');
    const [defaultGracePeriodDays, setDefaultGracePeriodDays] = React.useState('');
    const [nonWorkingDayRule, setNonWorkingDayRule] = React.useState('MOVE_LATER');
    const [autoAssignRule, setAutoAssignRule] = React.useState('PRIMARY_TECHNICIAN');
    const [ackSlaCritical, setAckSlaCritical] = React.useState('');
    const [ackSlaHigh, setAckSlaHigh] = React.useState('');
    const [ackSlaMedium, setAckSlaMedium] = React.useState('');
    const [ackSlaLow, setAckSlaLow] = React.useState('');
    const [escalationL1Minutes, setEscalationL1Minutes] = React.useState('');
    const [escalationL2Minutes, setEscalationL2Minutes] = React.useState('');
    const [escalationL3Minutes, setEscalationL3Minutes] = React.useState('');
    const [bottleneckAlertMinutes, setBottleneckAlertMinutes] = React.useState('');
    const [repeatFailureThreshold, setRepeatFailureThreshold] = React.useState('');
    const [repeatFailureWindowDays, setRepeatFailureWindowDays] = React.useState('');
    const [repairVsReplacePercent, setRepairVsReplacePercent] = React.useState('');
    const [ptwEnabled, setPtwEnabled] = React.useState(false);
    const [shutdownPlanningEnabled, setShutdownPlanningEnabled] = React.useState(false);
    const [vendorPortalEnabled, setVendorPortalEnabled] = React.useState(false);
    const [conditionMonitoringEnabled, setConditionMonitoringEnabled] = React.useState(false);
    const [qrTaggingEnabled, setQrTaggingEnabled] = React.useState(false);
    const [qaReleaseEnabled, setQaReleaseEnabled] = React.useState(false);
    const [sanitationEnabled, setSanitationEnabled] = React.useState(false);
    const [calibrationBlockEnabled, setCalibrationBlockEnabled] = React.useState(false);

    // Populate from API
    React.useEffect(() => {
        if (config) {
            setDefaultLeadDays(config.defaultLeadDays != null ? String(config.defaultLeadDays) : '');
            setDefaultGracePeriodDays(config.defaultGracePeriodDays != null ? String(config.defaultGracePeriodDays) : '');
            setNonWorkingDayRule(config.nonWorkingDayRule ?? 'MOVE_LATER');
            setAutoAssignRule(config.autoAssignRule ?? 'PRIMARY_TECHNICIAN');
            setAckSlaCritical(config.ackSlaCritical != null ? String(config.ackSlaCritical) : '');
            setAckSlaHigh(config.ackSlaHigh != null ? String(config.ackSlaHigh) : '');
            setAckSlaMedium(config.ackSlaMedium != null ? String(config.ackSlaMedium) : '');
            setAckSlaLow(config.ackSlaLow != null ? String(config.ackSlaLow) : '');
            setEscalationL1Minutes(config.escalationL1Minutes != null ? String(config.escalationL1Minutes) : '');
            setEscalationL2Minutes(config.escalationL2Minutes != null ? String(config.escalationL2Minutes) : '');
            setEscalationL3Minutes(config.escalationL3Minutes != null ? String(config.escalationL3Minutes) : '');
            setBottleneckAlertMinutes(config.bottleneckAlertMinutes != null ? String(config.bottleneckAlertMinutes) : '');
            setRepeatFailureThreshold(config.repeatFailureThreshold != null ? String(config.repeatFailureThreshold) : '');
            setRepeatFailureWindowDays(config.repeatFailureWindowDays != null ? String(config.repeatFailureWindowDays) : '');
            setRepairVsReplacePercent(config.repairVsReplacePercent != null ? String(Number(config.repairVsReplacePercent)) : '');
            setPtwEnabled(config.ptwEnabled ?? false);
            setShutdownPlanningEnabled(config.shutdownPlanningEnabled ?? false);
            setVendorPortalEnabled(config.vendorPortalEnabled ?? false);
            setConditionMonitoringEnabled(config.conditionMonitoringEnabled ?? false);
            setQrTaggingEnabled(config.qrTaggingEnabled ?? false);
            setQaReleaseEnabled(config.qaReleaseEnabled ?? false);
            setSanitationEnabled(config.sanitationEnabled ?? false);
            setCalibrationBlockEnabled(config.calibrationBlockEnabled ?? false);
        }
    }, [config]);

    const handleSave = () => {
        const data: Record<string, unknown> = {
            nonWorkingDayRule,
            autoAssignRule,
            ptwEnabled,
            shutdownPlanningEnabled,
            vendorPortalEnabled,
            conditionMonitoringEnabled,
            qrTaggingEnabled,
            qaReleaseEnabled,
            sanitationEnabled,
            calibrationBlockEnabled,
        };

        const intFields: [string, string][] = [
            ['defaultLeadDays', defaultLeadDays],
            ['defaultGracePeriodDays', defaultGracePeriodDays],
            ['ackSlaCritical', ackSlaCritical],
            ['ackSlaHigh', ackSlaHigh],
            ['ackSlaMedium', ackSlaMedium],
            ['ackSlaLow', ackSlaLow],
            ['escalationL1Minutes', escalationL1Minutes],
            ['escalationL2Minutes', escalationL2Minutes],
            ['escalationL3Minutes', escalationL3Minutes],
            ['bottleneckAlertMinutes', bottleneckAlertMinutes],
            ['repeatFailureThreshold', repeatFailureThreshold],
            ['repeatFailureWindowDays', repeatFailureWindowDays],
        ];

        intFields.forEach(([key, val]) => {
            if (val.trim()) data[key] = parseInt(val, 10);
        });

        if (repairVsReplacePercent.trim()) data.repairVsReplacePercent = parseFloat(repairVsReplacePercent);

        updateMutation.mutate(data, {
            onSuccess: () => { showSuccess('Config saved'); refetch(); },
            onError: () => showErrorMessage('Failed to save config'),
        });
    };

    if (isLoading) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <AppTopHeader title="Maintenance Config" onMenuPress={toggle} rightSlot={<HelpDrawer help={configHelp} />} />
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <AppTopHeader title="Maintenance Config" onMenuPress={toggle} rightSlot={<HelpDrawer help={configHelp} />} />
                <View style={{ paddingTop: 60 }}>
                    <EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} />
                </View>
            </View>
        );
    }

    return (
        <View style={[mainStyles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="Maintenance Config" onMenuPress={toggle} rightSlot={<HelpDrawer help={configHelp} />} />
            </Animated.View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    {/* General */}
                    <Animated.View entering={FadeInUp.duration(300).delay(50)}>
                        <View style={[sectionStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <SectionHeader title="General" icon="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                            <NumberField label="Default Lead Days" value={defaultLeadDays} onChangeText={setDefaultLeadDays} isDark={isDark} suffix="days" tooltip={configHelp.fields!.defaultLeadDays} />
                            <NumberField label="Grace Period Days" value={defaultGracePeriodDays} onChangeText={setDefaultGracePeriodDays} isDark={isDark} suffix="days" tooltip={configHelp.fields!.defaultGracePeriodDays} />
                            <PickerField label="Non-Working Day Rule" value={nonWorkingDayRule} options={NON_WORKING_DAY_OPTIONS} onSelect={setNonWorkingDayRule} isDark={isDark} tooltip={configHelp.fields!.nonWorkingDayRule} />
                            <PickerField label="Auto-Assign Rule" value={autoAssignRule} options={AUTO_ASSIGN_OPTIONS} onSelect={setAutoAssignRule} isDark={isDark} tooltip={configHelp.fields!.autoAssignRule} />
                        </View>
                    </Animated.View>

                    {/* SLA */}
                    <Animated.View entering={FadeInUp.duration(300).delay(150)}>
                        <View style={[sectionStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <SectionHeader title="SLA (Acknowledgement)" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <NumberField label="Critical" value={ackSlaCritical} onChangeText={setAckSlaCritical} isDark={isDark} suffix="min" />
                            <NumberField label="High" value={ackSlaHigh} onChangeText={setAckSlaHigh} isDark={isDark} suffix="min" />
                            <NumberField label="Medium" value={ackSlaMedium} onChangeText={setAckSlaMedium} isDark={isDark} suffix="min" />
                            <NumberField label="Low" value={ackSlaLow} onChangeText={setAckSlaLow} isDark={isDark} suffix="min" />
                        </View>
                    </Animated.View>

                    {/* Escalation */}
                    <Animated.View entering={FadeInUp.duration(300).delay(250)}>
                        <View style={[sectionStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <SectionHeader title="Escalation" icon="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            <NumberField label="L1 Escalation" value={escalationL1Minutes} onChangeText={setEscalationL1Minutes} isDark={isDark} suffix="min" />
                            <NumberField label="L2 Escalation" value={escalationL2Minutes} onChangeText={setEscalationL2Minutes} isDark={isDark} suffix="min" />
                            <NumberField label="L3 Escalation" value={escalationL3Minutes} onChangeText={setEscalationL3Minutes} isDark={isDark} suffix="min" />
                            <NumberField label="Bottleneck Alert" value={bottleneckAlertMinutes} onChangeText={setBottleneckAlertMinutes} isDark={isDark} suffix="min" tooltip={configHelp.fields!.bottleneckAlertMinutes} />
                            <NumberField label="Repeat Failure Threshold" value={repeatFailureThreshold} onChangeText={setRepeatFailureThreshold} isDark={isDark} tooltip={configHelp.fields!.repeatFailureThreshold} />
                            <NumberField label="Repeat Failure Window" value={repeatFailureWindowDays} onChangeText={setRepeatFailureWindowDays} isDark={isDark} suffix="days" tooltip={configHelp.fields!.repeatFailureWindowDays} />
                            <NumberField label="Repair vs Replace %" value={repairVsReplacePercent} onChangeText={setRepairVsReplacePercent} isDark={isDark} suffix="%" tooltip={configHelp.fields!.repairVsReplacePercent} />
                        </View>
                    </Animated.View>

                    {/* Features */}
                    <Animated.View entering={FadeInUp.duration(300).delay(350)}>
                        <View style={[sectionStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                            <SectionHeader title="Features" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            <ToggleField label="Permit to Work (PTW)" value={ptwEnabled} onValueChange={setPtwEnabled} tooltip={configHelp.fields!.ptwEnabled} />
                            <ToggleField label="Shutdown Planning" value={shutdownPlanningEnabled} onValueChange={setShutdownPlanningEnabled} tooltip={configHelp.fields!.shutdownPlanningEnabled} />
                            <ToggleField label="Vendor Portal" value={vendorPortalEnabled} onValueChange={setVendorPortalEnabled} />
                            <ToggleField label="Condition Monitoring" value={conditionMonitoringEnabled} onValueChange={setConditionMonitoringEnabled} />
                            <ToggleField label="QR Tagging" value={qrTaggingEnabled} onValueChange={setQrTaggingEnabled} tooltip={configHelp.fields!.qrTaggingEnabled} />
                            <ToggleField label="QA Release" value={qaReleaseEnabled} onValueChange={setQaReleaseEnabled} tooltip={configHelp.fields!.qaReleaseEnabled} />
                            <ToggleField label="Sanitation" value={sanitationEnabled} onValueChange={setSanitationEnabled} tooltip={configHelp.fields!.sanitationEnabled} />
                            <ToggleField label="Calibration Block" value={calibrationBlockEnabled} onValueChange={setCalibrationBlockEnabled} tooltip={configHelp.fields!.calibrationBlockEnabled} />
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Save button */}
            <View style={[mainStyles.saveContainer, { paddingBottom: insets.bottom + 16, backgroundColor: isDark ? '#1A1730' : colors.white, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100] }]}>
                <Pressable
                    style={({ pressed }) => [mainStyles.saveBtn, pressed && { opacity: 0.85 }, updateMutation.isPending && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                        <Text className="font-inter text-base font-bold text-white">Save Configuration</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

// ============ STYLES ============

const mainStyles = StyleSheet.create({
    container: { flex: 1 },
    saveContainer: {
        paddingHorizontal: 24,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    saveBtn: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});

const sectionStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
});

const fieldStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    pickerRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    numberInput: {
        width: 70,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    pickerChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
});
