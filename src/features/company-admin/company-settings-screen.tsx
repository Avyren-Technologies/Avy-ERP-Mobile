/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { useCompanySettings } from '@/features/company-admin/api/use-company-admin-queries';
import { useUpdateSettings } from '@/features/company-admin/api/use-company-admin-mutations';

import {
    ChipSelector,
    SectionCard,
    ToggleRow,
} from '@/features/super-admin/tenant-onboarding/atoms';

// ============ CONSTANTS ============

const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Kannada', 'Telugu'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const NUMBER_FORMATS = ['Indian 2,00,000', 'International 200,000'];
const TIME_FORMATS = ['12-hour', '24-hour'];

// ============ SETTINGS STATE ============

interface SettingsFormState {
    // Locale & Format
    currency: string;
    language: string;
    dateFormat: string;
    numberFormat: string;
    timeFormat: string;
    // Compliance
    indiaCompliance: boolean;
    multiCurrencyPayroll: boolean;
    internationalTaxCompliance: boolean;
    // Portal & App
    essPortal: boolean;
    mobileAppAccess: boolean;
    aiChatbot: boolean;
    eSignIntegration: boolean;
    // Integrations
    biometricSync: boolean;
    payrollBankIntegration: boolean;
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    thirdPartyHRMSSync: boolean;
}

const DEFAULT_SETTINGS: SettingsFormState = {
    currency: 'INR',
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'Indian 2,00,000',
    timeFormat: '12-hour',
    indiaCompliance: true,
    multiCurrencyPayroll: false,
    internationalTaxCompliance: false,
    essPortal: true,
    mobileAppAccess: true,
    aiChatbot: false,
    eSignIntegration: false,
    biometricSync: false,
    payrollBankIntegration: false,
    emailNotifications: true,
    whatsappNotifications: false,
    thirdPartyHRMSSync: false,
};

// ============ MAIN COMPONENT ============

export function CompanySettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // --- Data fetching ---
    const { data: settingsResponse, isLoading } = useCompanySettings();
    const updateSettings = useUpdateSettings();

    // --- Form state ---
    const [form, setForm] = React.useState<SettingsFormState>(DEFAULT_SETTINGS);
    const [initialForm, setInitialForm] = React.useState<SettingsFormState>(DEFAULT_SETTINGS);
    const [initialized, setInitialized] = React.useState(false);
    const [showToast, setShowToast] = React.useState(false);

    // Initialize form from server data
    React.useEffect(() => {
        if (settingsResponse && !initialized) {
            const raw: any = settingsResponse?.data ?? settingsResponse ?? {};
            const loaded: SettingsFormState = {
                currency: raw.currency ?? DEFAULT_SETTINGS.currency,
                language: raw.language ?? DEFAULT_SETTINGS.language,
                dateFormat: raw.dateFormat ?? DEFAULT_SETTINGS.dateFormat,
                numberFormat: raw.numberFormat ?? DEFAULT_SETTINGS.numberFormat,
                timeFormat: raw.timeFormat ?? DEFAULT_SETTINGS.timeFormat,
                indiaCompliance: raw.indiaCompliance ?? DEFAULT_SETTINGS.indiaCompliance,
                multiCurrencyPayroll: raw.multiCurrencyPayroll ?? DEFAULT_SETTINGS.multiCurrencyPayroll,
                internationalTaxCompliance: raw.internationalTaxCompliance ?? DEFAULT_SETTINGS.internationalTaxCompliance,
                essPortal: raw.essPortal ?? DEFAULT_SETTINGS.essPortal,
                mobileAppAccess: raw.mobileAppAccess ?? DEFAULT_SETTINGS.mobileAppAccess,
                aiChatbot: raw.aiChatbot ?? DEFAULT_SETTINGS.aiChatbot,
                eSignIntegration: raw.eSignIntegration ?? DEFAULT_SETTINGS.eSignIntegration,
                biometricSync: raw.biometricSync ?? DEFAULT_SETTINGS.biometricSync,
                payrollBankIntegration: raw.payrollBankIntegration ?? DEFAULT_SETTINGS.payrollBankIntegration,
                emailNotifications: raw.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
                whatsappNotifications: raw.whatsappNotifications ?? DEFAULT_SETTINGS.whatsappNotifications,
                thirdPartyHRMSSync: raw.thirdPartyHRMSSync ?? DEFAULT_SETTINGS.thirdPartyHRMSSync,
            };
            setForm(loaded);
            setInitialForm(loaded);
            setInitialized(true);
        }
    }, [settingsResponse, initialized]);

    // --- Dirty state ---
    const isDirty = React.useMemo(
        () => JSON.stringify(form) !== JSON.stringify(initialForm),
        [form, initialForm],
    );

    // --- Form update helper ---
    const update = React.useCallback(
        (patch: Partial<SettingsFormState>) => setForm((prev) => ({ ...prev, ...patch })),
        [],
    );

    // --- Save handler ---
    const handleSave = () => {
        updateSettings.mutate(form as unknown as Record<string, unknown>, {
            onSuccess: () => {
                setInitialForm(form);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2500);
            },
        });
    };

    // --- Loading state ---
    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
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
                                <Path
                                    d="M19 12H5M12 19l-7-7 7-7"
                                    stroke={colors.white}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
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
                    <Text className="mt-3 font-inter text-sm text-neutral-500">
                        Loading settings...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Background gradient */}
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
                            <Path
                                d="M19 12H5M12 19l-7-7 7-7"
                                stroke={colors.white}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
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
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + (isDirty ? 100 : 40) },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Locale & Format */}
                <Animated.View entering={FadeInUp.duration(350).delay(100)}>
                    <SectionCard title="Locale & Format">
                        <ChipSelector
                            label="Currency"
                            options={CURRENCIES}
                            selected={form.currency}
                            onSelect={(v) => update({ currency: v })}
                        />
                        <ChipSelector
                            label="Language"
                            options={LANGUAGES}
                            selected={form.language}
                            onSelect={(v) => update({ language: v })}
                        />
                        <ChipSelector
                            label="Date Format"
                            options={DATE_FORMATS}
                            selected={form.dateFormat}
                            onSelect={(v) => update({ dateFormat: v })}
                        />
                        <ChipSelector
                            label="Number Format"
                            options={NUMBER_FORMATS}
                            selected={form.numberFormat}
                            onSelect={(v) => update({ numberFormat: v })}
                        />
                        <ChipSelector
                            label="Time Format"
                            options={TIME_FORMATS}
                            selected={form.timeFormat}
                            onSelect={(v) => update({ timeFormat: v })}
                        />
                    </SectionCard>
                </Animated.View>

                {/* Compliance */}
                <Animated.View entering={FadeInUp.duration(350).delay(200)}>
                    <SectionCard title="Compliance">
                        <ToggleRow
                            label="India Statutory Compliance Mode"
                            subtitle="PF, ESI, PT, TDS, Form 16, Gratuity, Bonus Act"
                            value={form.indiaCompliance}
                            onToggle={(v) => update({ indiaCompliance: v })}
                        />
                        <ToggleRow
                            label="Multi-Currency Payroll"
                            subtitle="Process payroll in multiple currencies for global teams"
                            value={form.multiCurrencyPayroll}
                            onToggle={(v) => update({ multiCurrencyPayroll: v })}
                        />
                        <ToggleRow
                            label="International Tax Compliance"
                            subtitle="Tax compliance for international operations"
                            value={form.internationalTaxCompliance}
                            onToggle={(v) => update({ internationalTaxCompliance: v })}
                        />
                    </SectionCard>
                </Animated.View>

                {/* Portal & App */}
                <Animated.View entering={FadeInUp.duration(350).delay(300)}>
                    <SectionCard title="Portal & App">
                        <ToggleRow
                            label="Employee Self-Service (ESS) Portal"
                            subtitle="Allow employees to view payslips, request leave, update details"
                            value={form.essPortal}
                            onToggle={(v) => update({ essPortal: v })}
                        />
                        <ToggleRow
                            label="Mobile App Access"
                            subtitle="Avy ERP mobile app access for all employees"
                            value={form.mobileAppAccess}
                            onToggle={(v) => update({ mobileAppAccess: v })}
                        />
                        <ToggleRow
                            label="AI HR Assistant Chatbot"
                            subtitle="AI-powered chatbot for HR queries and policy lookups"
                            value={form.aiChatbot}
                            onToggle={(v) => update({ aiChatbot: v })}
                        />
                        <ToggleRow
                            label="e-Sign Integration"
                            subtitle="Digital signature integration for offer letters and contracts"
                            value={form.eSignIntegration}
                            onToggle={(v) => update({ eSignIntegration: v })}
                        />
                    </SectionCard>
                </Animated.View>

                {/* Integrations */}
                <Animated.View entering={FadeInUp.duration(350).delay(400)}>
                    <SectionCard title="Integrations">
                        {/* Biometric — Coming Soon */}
                        <View style={{ opacity: 0.55 }} pointerEvents="none">
                            <ToggleRow
                                label="Biometric / Device Sync"
                                subtitle="Auto-sync attendance from ZKTeco, ESSL devices"
                                value={form.biometricSync}
                                onToggle={() => {}}
                            />
                        </View>
                        <View style={styles.comingSoonRow}>
                            <View style={styles.comingSoonBadge}>
                                <Text className="font-inter text-[9px] font-bold text-warning-700">
                                    COMING SOON
                                </Text>
                            </View>
                        </View>

                        <ToggleRow
                            label="Payroll Bank Integration"
                            subtitle="NEFT/RTGS bank file generation for salary disbursement"
                            value={form.payrollBankIntegration}
                            onToggle={(v) => update({ payrollBankIntegration: v })}
                        />
                        <ToggleRow
                            label="Email Notifications"
                            subtitle="Automated emails for payslips, leave approvals, alerts"
                            value={form.emailNotifications}
                            onToggle={(v) => update({ emailNotifications: v })}
                        />

                        {/* WhatsApp — Coming Soon */}
                        <View style={{ opacity: 0.55 }} pointerEvents="none">
                            <ToggleRow
                                label="WhatsApp Notifications"
                                subtitle="Salary alerts, leave status via WhatsApp Business API"
                                value={form.whatsappNotifications}
                                onToggle={() => {}}
                            />
                        </View>
                        <View style={styles.comingSoonRow}>
                            <View style={styles.comingSoonBadge}>
                                <Text className="font-inter text-[9px] font-bold text-warning-700">
                                    COMING SOON
                                </Text>
                            </View>
                        </View>

                        <ToggleRow
                            label="Third-Party HRMS Sync"
                            subtitle="Sync data with external HRMS platforms"
                            value={form.thirdPartyHRMSSync}
                            onToggle={(v) => update({ thirdPartyHRMSSync: v })}
                        />
                    </SectionCard>
                </Animated.View>
            </ScrollView>

            {/* Save Button — visible only when dirty */}
            {isDirty && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={[styles.saveContainer, { paddingBottom: insets.bottom + 16 }]}
                >
                    <Pressable
                        onPress={handleSave}
                        disabled={updateSettings.isPending}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            pressed && { opacity: 0.85 },
                            updateSettings.isPending && { opacity: 0.6 },
                        ]}
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
                                <>
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path
                                            d="M5 12l5 5L20 7"
                                            stroke={colors.white}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                    <Text className="font-inter text-base font-bold text-white">
                                        Save Settings
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            )}

            {/* Success toast */}
            {showToast && (
                <Animated.View
                    entering={FadeInDown.duration(250)}
                    style={[styles.toast, { top: insets.top + 70 }]}
                >
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path
                            d="M5 12l5 5L20 7"
                            stroke={colors.success[600]}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    <Text className="font-inter text-sm font-semibold text-success-700">
                        Settings saved successfully
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerGradient: {
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonRow: {
        marginTop: -8,
        marginBottom: 4,
        alignSelf: 'flex-end',
    },
    comingSoonBadge: {
        backgroundColor: '#FEF3C7',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    saveContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    saveBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    saveBtnGradient: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    toast: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: colors.success[50],
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.success[200],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
});
