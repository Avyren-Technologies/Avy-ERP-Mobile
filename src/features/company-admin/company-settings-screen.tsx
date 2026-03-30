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
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { InfoTooltip, SectionDescription } from '@/components/ui/info-tooltip';

import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useUpdateSettings } from '@/features/company-admin/api/use-company-admin-mutations';
import type { CompanySettings, CurrencyCode, LanguageCode, TimeFormat } from '@/lib/api/company-admin';

import {
    ChipSelector,
    SectionCard,
} from '@/features/super-admin/tenant-onboarding/atoms';

// ============ OPTIONS (matching web exactly) ============

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const LANGUAGE_OPTIONS = ['en', 'hi', 'ta', 'te', 'mr', 'kn'];
const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', kn: 'Kannada',
};
const TIMEZONE_OPTIONS = [
    'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles',
    'Europe/London', 'Asia/Dubai', 'Asia/Singapore',
];
const DATE_FORMAT_OPTIONS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const TIME_FORMAT_OPTIONS = ['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'];
const TIME_FORMAT_LABELS: Record<string, string> = {
    TWELVE_HOUR: '12 Hour', TWENTY_FOUR_HOUR: '24 Hour',
};
const NUMBER_FORMAT_OPTIONS = ['en-IN', 'en-US'];
const NUMBER_FORMAT_LABELS: Record<string, string> = {
    'en-IN': 'Indian (1,00,000)', 'en-US': 'International (100,000)',
};

// ============ DEFAULTS (same 16 fields as web) ============

const DEFAULTS: CompanySettings = {
    currency: 'INR',
    language: 'en',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'TWELVE_HOUR',
    numberFormat: 'en-IN',
    indiaCompliance: true,
    gdprMode: false,
    auditTrail: true,
    bankIntegration: false,
    razorpayEnabled: false,
    emailNotifications: true,
    whatsappNotifications: false,
    biometricIntegration: false,
    eSignIntegration: false,
};

// ============ REUSABLE (with tooltip support) ============

function ToggleRow({ label, subtitle, value, onToggle, tooltip }: {
    label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void; tooltip?: string;
}) {
    return (
        <View style={localStyles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                    {tooltip && <InfoTooltip content={tooltip} />}
                </View>
                {subtitle && <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>{subtitle}</Text>}
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

// ============ MAIN COMPONENT ============

export function CompanySettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { data: settingsResponse, isLoading } = useCompanySettings();
    const updateSettings = useUpdateSettings();

    const [settings, setSettings] = React.useState<CompanySettings>({ ...DEFAULTS });
    const [hasChanges, setHasChanges] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    const serverSettings: CompanySettings = React.useMemo(() => {
        const raw = (settingsResponse as any)?.data ?? settingsResponse ?? {};
        return { ...DEFAULTS, ...raw };
    }, [settingsResponse]);

    React.useEffect(() => {
        if (settingsResponse) {
            setSettings({ ...serverSettings });
            setHasChanges(false);
        }
    }, [settingsResponse]);

    const updateField = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
        setSettings((p) => ({ ...p, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateSettings.mutate(settings, {
            onSuccess: () => {
                setHasChanges(false);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
            },
        });
    };

    const handleReset = () => {
        setSettings({ ...serverSettings });
        setHasChanges(false);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={{ height: insets.top }} />
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn}>
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </Pressable>
                        <Text className="flex-1 text-center font-inter text-lg font-bold text-white">
                            Company Settings
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                    <Text className="mt-3 font-inter text-sm text-neutral-500">Loading settings...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={{ height: insets.top }} />
                <Animated.View entering={FadeInDown.duration(400)} style={styles.headerRow}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-lg font-bold text-white">
                        Company Settings
                    </Text>
                    <View style={{ width: 36 }} />
                </Animated.View>
            </LinearGradient>

            {/* Scrollable content */}
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasChanges ? 100 : 40) }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Section 1: Locale (6 fields) */}
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    <SectionCard title="Locale">
                        <SectionDescription>Regional settings that affect date formatting, currency display, and language across the platform.</SectionDescription>
                        <ChipSelector
                            label="Currency"
                            options={CURRENCY_OPTIONS}
                            selected={settings.currency}
                            onSelect={(v) => updateField('currency', v as CurrencyCode)}
                        />
                        <ChipSelector
                            label="Language"
                            options={LANGUAGE_OPTIONS.map((l) => LANGUAGE_LABELS[l] ?? l)}
                            selected={LANGUAGE_LABELS[settings.language] ?? settings.language}
                            onSelect={(v) => {
                                const key = Object.entries(LANGUAGE_LABELS).find(([, label]) => label === v)?.[0] ?? v;
                                updateField('language', key as LanguageCode);
                            }}
                        />
                        <ChipSelector
                            label="Timezone"
                            options={TIMEZONE_OPTIONS}
                            selected={settings.timezone}
                            onSelect={(v) => updateField('timezone', v)}
                            hint="All attendance calculations use this timezone. Changing this affects how dates and times are interpreted."
                        />
                        <ChipSelector
                            label="Date Format"
                            options={DATE_FORMAT_OPTIONS}
                            selected={settings.dateFormat}
                            onSelect={(v) => updateField('dateFormat', v)}
                        />
                        <ChipSelector
                            label="Time Format"
                            options={TIME_FORMAT_OPTIONS.map((t) => TIME_FORMAT_LABELS[t] ?? t)}
                            selected={TIME_FORMAT_LABELS[settings.timeFormat] ?? settings.timeFormat}
                            onSelect={(v) => {
                                const key = Object.entries(TIME_FORMAT_LABELS).find(([, label]) => label === v)?.[0] ?? v;
                                updateField('timeFormat', key as TimeFormat);
                            }}
                        />
                        <ChipSelector
                            label="Number Format"
                            options={NUMBER_FORMAT_OPTIONS.map((n) => NUMBER_FORMAT_LABELS[n] ?? n)}
                            selected={NUMBER_FORMAT_LABELS[settings.numberFormat] ?? settings.numberFormat}
                            onSelect={(v) => {
                                const key = Object.entries(NUMBER_FORMAT_LABELS).find(([, label]) => label === v)?.[0] ?? v;
                                updateField('numberFormat', key);
                            }}
                        />
                    </SectionCard>
                </Animated.View>

                {/* Section 2: Compliance (3 fields) */}
                <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                    <SectionCard title="Compliance">
                        <SectionDescription>Enable region-specific compliance frameworks and data protection features.</SectionDescription>
                        <ToggleRow
                            label="India Compliance"
                            subtitle="Enable India-specific statutory compliance"
                            value={settings.indiaCompliance}
                            onToggle={(v) => updateField('indiaCompliance', v)}
                        />
                        <ToggleRow
                            label="GDPR Mode"
                            subtitle="Enable GDPR data protection features"
                            value={settings.gdprMode}
                            onToggle={(v) => updateField('gdprMode', v)}
                        />
                        <ToggleRow
                            label="Audit Trail"
                            subtitle="Maintain detailed audit trail for all changes"
                            value={settings.auditTrail}
                            onToggle={(v) => updateField('auditTrail', v)}
                            tooltip="When enabled, all configuration changes are logged with who made the change and when."
                        />
                    </SectionCard>
                </Animated.View>

                {/* Section 3: Integrations (6 fields) */}
                <Animated.View entering={FadeInUp.duration(350).delay(300)}>
                    <SectionCard title="Integrations">
                        <SectionDescription>Connect external services for payments, notifications, biometric devices, and e-signatures.</SectionDescription>
                        <ToggleRow
                            label="Bank Integration"
                            subtitle="Enable bank account integration"
                            value={settings.bankIntegration}
                            onToggle={(v) => updateField('bankIntegration', v)}
                        />
                        <ToggleRow
                            label="RazorpayX Payout"
                            subtitle="Enable RazorpayX for payroll disbursement"
                            value={settings.razorpayEnabled}
                            onToggle={(v) => updateField('razorpayEnabled', v)}
                        />
                        <ToggleRow
                            label="Email Notifications"
                            subtitle="Send email alerts for key events"
                            value={settings.emailNotifications}
                            onToggle={(v) => updateField('emailNotifications', v)}
                        />
                        <ToggleRow
                            label="WhatsApp Notifications"
                            subtitle="Send WhatsApp alerts"
                            value={settings.whatsappNotifications}
                            onToggle={(v) => updateField('whatsappNotifications', v)}
                        />
                        <ToggleRow
                            label="Biometric Integration"
                            subtitle="Enable biometric device integration"
                            value={settings.biometricIntegration}
                            onToggle={(v) => updateField('biometricIntegration', v)}
                        />
                        <ToggleRow
                            label="E-Sign Integration"
                            subtitle="Enable electronic signature workflows"
                            value={settings.eSignIntegration}
                            onToggle={(v) => updateField('eSignIntegration', v)}
                        />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Button */}
            {hasChanges && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={[styles.saveContainer, { paddingBottom: insets.bottom + 16 }]}
                >
                    <View style={styles.saveRow}>
                        <Pressable onPress={handleReset} style={styles.resetBtn}>
                            <Text className="font-inter text-sm font-bold text-neutral-600">Reset</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSave}
                            disabled={updateSettings.isPending}
                            style={[styles.saveBtn, updateSettings.isPending && { opacity: 0.6 }]}
                        >
                            <LinearGradient
                                colors={[colors.gradient.start, colors.gradient.end]}
                                style={styles.saveBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {updateSettings.isPending ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <Text className="font-inter text-base font-bold text-white">Save Changes</Text>
                                )}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </Animated.View>
            )}

            {/* Success toast */}
            {showToast && (
                <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { top: insets.top + 70 }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">Settings saved successfully</Text>
                </Animated.View>
            )}
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerGradient: { paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
    backBtn: {
        width: 36, height: 36, borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12,
        backgroundColor: colors.white,
        borderTopWidth: 1, borderTopColor: colors.neutral[100],
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
    },
    saveRow: { flexDirection: 'row', gap: 12 },
    resetBtn: {
        height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200],
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
    },
    saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveBtnGradient: {
        height: 52, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    toast: {
        position: 'absolute', left: 20, right: 20,
        backgroundColor: colors.success[50], borderRadius: 12,
        padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.success[200],
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
});

const localStyles = StyleSheet.create({
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
});
