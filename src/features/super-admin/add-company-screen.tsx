/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

const TOTAL_STEPS = 5;

const INDUSTRIES = [
    'Automotive', 'Textiles', 'Steel & Metal', 'Plastics', 'Electronics',
    'Pharmaceuticals', 'Food Processing', 'Heavy Engineering', 'CNC Machining',
    'Paper & Packaging', 'Chemicals', 'Other',
];

const TIERS = [
    { key: 'starter', label: 'Starter', range: '50 – 100 users', maxUsers: 100 },
    { key: 'growth', label: 'Growth', range: '101 – 200 users', maxUsers: 200 },
    { key: 'scale', label: 'Scale', range: '201 – 500 users', maxUsers: 500 },
    { key: 'enterprise', label: 'Enterprise', range: '501 – 1,000 users', maxUsers: 1000 },
    { key: 'custom', label: 'Custom', range: '1,000+ users', maxUsers: 5000 },
];

const MODULES = [
    { key: 'masters', name: 'Masters', required: true, deps: [] },
    { key: 'security', name: 'Security', required: false, deps: ['masters'] },
    { key: 'hr', name: 'HR Management', required: false, deps: ['security'] },
    { key: 'production', name: 'Production', required: false, deps: ['machine-maint', 'masters'] },
    { key: 'machine-maint', name: 'Machine Maintenance', required: false, deps: ['masters'] },
    { key: 'inventory', name: 'Inventory', required: false, deps: ['masters'] },
    { key: 'vendor', name: 'Vendor Management', required: false, deps: ['inventory', 'masters'] },
    { key: 'sales', name: 'Sales & Invoicing', required: false, deps: ['finance', 'masters'] },
    { key: 'finance', name: 'Finance', required: false, deps: ['masters'] },
    { key: 'visitor', name: 'Visitor Management', required: false, deps: ['security'] },
];

// ============ STEP INDICATOR ============

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <View style={styles.stepIndicator}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                return (
                    <React.Fragment key={i}>
                        <View
                            style={[
                                styles.stepDot,
                                isActive && styles.stepDotActive,
                                isCompleted && styles.stepDotCompleted,
                            ]}
                        >
                            {isCompleted ? (
                                <Svg width={10} height={10} viewBox="0 0 24 24">
                                    <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            ) : (
                                <Text
                                    className={`font-inter text-[10px] font-bold ${isActive ? 'text-white' : 'text-neutral-400'
                                        }`}
                                >
                                    {stepNum}
                                </Text>
                            )}
                        </View>
                        {i < TOTAL_STEPS - 1 && (
                            <View
                                style={[
                                    styles.stepLine,
                                    isCompleted && styles.stepLineCompleted,
                                ]}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

// ============ FORM INPUT HELPER ============

function FormField({
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'url';
    autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
    return (
        <View style={styles.formField}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-200">
                {label}
            </Text>
            <View style={styles.fieldInput}>
                <TextInput
                    style={styles.textInput}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                />
            </View>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function AddCompanyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [step, setStep] = React.useState(1);

    // Step 1 — Company Info
    const [companyName, setCompanyName] = React.useState('');
    const [industry, setIndustry] = React.useState('');
    const [adminEmail, setAdminEmail] = React.useState('');
    const [adminPhone, setAdminPhone] = React.useState('');

    // Step 2 — Address & GST
    const [hqAddress, setHqAddress] = React.useState('');
    const [gstNumber, setGstNumber] = React.useState('');
    const [selectedTier, setSelectedTier] = React.useState('');

    // Step 3 — Server
    const [serverType, setServerType] = React.useState<'default' | 'custom'>('default');
    const [customUrl, setCustomUrl] = React.useState('');

    // Step 4 — User Limits
    const [maxUsers, setMaxUsers] = React.useState('');
    const [customPricing, setCustomPricing] = React.useState(false);

    // Step 5 — Modules
    const [selectedModules, setSelectedModules] = React.useState<string[]>(['masters']);

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
    };
    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else router.back();
    };

    const handleCreate = () => {
        // TODO: API call
        router.back();
    };

    const toggleModule = (key: string) => {
        if (key === 'masters') return; // Masters is always required
        const moduleInfo = MODULES.find(m => m.key === key);
        if (!moduleInfo) return;

        if (selectedModules.includes(key)) {
            setSelectedModules(prev => prev.filter(k => k !== key));
        } else {
            // Auto-include dependencies
            const toAdd = [key, ...moduleInfo.deps].filter(d => !selectedModules.includes(d));
            setSelectedModules(prev => [...prev, ...toAdd]);
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1: return 'Company Info';
            case 2: return 'Address & Tier';
            case 3: return 'Server Endpoint';
            case 4: return 'User Limits';
            case 5: return 'Select Modules';
            default: return '';
        }
    };

    const isStepValid = () => {
        switch (step) {
            case 1: return companyName.trim() && adminEmail.trim();
            case 2: return selectedTier;
            case 3: return serverType === 'default' || customUrl.trim();
            case 4: return maxUsers.trim();
            case 5: return selectedModules.length > 1; // More than just Masters
            default: return true;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown.duration(400)}
                    style={[styles.header, { paddingTop: insets.top + 12 }]}
                >
                    <Pressable onPress={handleBack} style={styles.headerBackBtn}>
                        <ChevronLeft size={20} color={colors.primary[600]} strokeWidth={2} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text className="font-inter text-base font-bold text-primary-950">
                            Add Company
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500">
                            Step {step} of {TOTAL_STEPS} — {getStepTitle()}
                        </Text>
                    </View>
                    <View style={{ width: 36 }} />
                </Animated.View>

                {/* Step Indicator */}
                <StepIndicator currentStep={step} />

                {/* Content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <Animated.View
                        key={step}
                        entering={FadeInUp.duration(300)}
                        style={styles.stepContent}
                    >
                        {step === 1 && (
                            <>
                                <FormField label="Company Name *" placeholder="e.g. Apex Manufacturing Pvt. Ltd" value={companyName} onChangeText={setCompanyName} autoCapitalize="words" />
                                <Text className="mb-2 mt-4 font-inter text-xs font-bold text-primary-900">Industry *</Text>
                                <View style={styles.chipsContainer}>
                                    {INDUSTRIES.map((ind) => (
                                        <Pressable key={ind} onPress={() => setIndustry(ind)} style={[styles.selectChip, industry === ind && styles.selectChipActive]}>
                                            <Text className={`font-inter text-xs font-semibold ${industry === ind ? 'text-white' : 'text-neutral-600'}`}>{ind}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <FormField label="Admin Email *" placeholder="admin@company.com" value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
                                <FormField label="Admin Phone" placeholder="+91 98765 43210" value={adminPhone} onChangeText={setAdminPhone} keyboardType="phone-pad" />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <FormField label="HQ Address" placeholder="Plot 45, MIDC, Pune, Maharashtra" value={hqAddress} onChangeText={setHqAddress} />
                                <FormField label="GST Number" placeholder="27AABCA1234H1Z5" value={gstNumber} onChangeText={setGstNumber} autoCapitalize="none" />
                                <Text className="mb-2 mt-4 font-inter text-xs font-bold text-primary-900">Employee Tier *</Text>
                                {TIERS.map((tier) => (
                                    <Pressable key={tier.key} onPress={() => { setSelectedTier(tier.key); if (!maxUsers) setMaxUsers(String(tier.maxUsers)); }} style={[styles.tierCard, selectedTier === tier.key && styles.tierCardActive]}>
                                        <View style={styles.tierRadio}>
                                            {selectedTier === tier.key && <View style={styles.tierRadioInner} />}
                                        </View>
                                        <View style={styles.tierInfo}>
                                            <Text className={`font-inter text-sm font-bold ${selectedTier === tier.key ? 'text-primary-700' : 'text-primary-950'}`}>{tier.label}</Text>
                                            <Text className="font-inter text-xs text-neutral-500">{tier.range}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Text className="mb-4 font-inter text-sm text-neutral-600">
                                    Choose whether this tenant connects to the Avyren-hosted server or their own self-hosted endpoint.
                                </Text>
                                <Pressable onPress={() => setServerType('default')} style={[styles.serverOption, serverType === 'default' && styles.serverOptionActive]}>
                                    <View style={styles.serverOptionHeader}>
                                        <View style={[styles.serverOptRadio, serverType === 'default' && styles.serverOptRadioActive]}>
                                            {serverType === 'default' && <View style={styles.serverOptRadioInner} />}
                                        </View>
                                        <View>
                                            <Text className="font-inter text-sm font-bold text-primary-950">Default (Avyren-hosted)</Text>
                                            <Text className="font-inter text-xs text-neutral-500">https://avy-erp-api.avyren.in</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.recommendedTag, serverType !== 'default' && { opacity: 0 }]}>
                                        <Text className="font-inter text-[10px] font-bold text-success-700">RECOMMENDED</Text>
                                    </View>
                                </Pressable>

                                <Pressable onPress={() => setServerType('custom')} style={[styles.serverOption, serverType === 'custom' && styles.serverOptionActive]}>
                                    <View style={styles.serverOptionHeader}>
                                        <View style={[styles.serverOptRadio, serverType === 'custom' && styles.serverOptRadioActive]}>
                                            {serverType === 'custom' && <View style={styles.serverOptRadioInner} />}
                                        </View>
                                        <View>
                                            <Text className="font-inter text-sm font-bold text-primary-950">Custom Self-Hosted</Text>
                                            <Text className="font-inter text-xs text-neutral-500">Client's own server URL</Text>
                                        </View>
                                    </View>
                                </Pressable>

                                {serverType === 'custom' && (
                                    <Animated.View entering={FadeIn.duration(200)}>
                                        <FormField label="Server URL *" placeholder="https://erp.clientdomain.com/api" value={customUrl} onChangeText={setCustomUrl} keyboardType="url" autoCapitalize="none" />
                                    </Animated.View>
                                )}
                            </>
                        )}

                        {step === 4 && (
                            <>
                                <Text className="mb-4 font-inter text-sm text-neutral-600">
                                    Set the maximum number of users this tenant can create, and toggle custom pricing if needed.
                                </Text>
                                <View style={styles.maxUserCard}>
                                    <Text className="font-inter text-xs font-bold text-primary-900">
                                        Maximum Users
                                    </Text>
                                    <View style={styles.maxUserRow}>
                                        <TextInput
                                            style={styles.largeNumberInput}
                                            value={maxUsers}
                                            onChangeText={setMaxUsers}
                                            keyboardType="number-pad"
                                            placeholder="200"
                                            placeholderTextColor={colors.neutral[300]}
                                        />
                                        <Text className="font-inter text-sm text-neutral-500">users</Text>
                                    </View>
                                    <Text className="mt-2 font-inter text-[10px] text-neutral-400">
                                        Based on {TIERS.find(t => t.key === selectedTier)?.label || 'selected'} tier. Override as needed.
                                    </Text>
                                </View>

                                {/* Custom Pricing Toggle */}
                                <Pressable onPress={() => setCustomPricing(!customPricing)} style={[styles.toggleRow, customPricing && styles.toggleRowActive]}>
                                    <View>
                                        <Text className="font-inter text-sm font-bold text-primary-950">Custom Pricing</Text>
                                        <Text className="font-inter text-xs text-neutral-500">Override standard tier pricing for this tenant</Text>
                                    </View>
                                    <View style={[styles.toggleTrack, customPricing && styles.toggleTrackActive]}>
                                        <View style={[styles.toggleThumb, customPricing && styles.toggleThumbActive]} />
                                    </View>
                                </Pressable>
                            </>
                        )}

                        {step === 5 && (
                            <>
                                <Text className="mb-2 font-inter text-sm text-neutral-600">
                                    Select modules for this tenant. Dependencies are auto-resolved.
                                </Text>
                                {MODULES.map((mod) => {
                                    const isSelected = selectedModules.includes(mod.key);
                                    const isDep = mod.deps.some(d => selectedModules.includes(d)) && !isSelected;
                                    return (
                                        <Pressable key={mod.key} onPress={() => toggleModule(mod.key)} style={[styles.moduleRow, isSelected && styles.moduleRowActive]}>
                                            <View style={[styles.moduleCheckbox, isSelected && styles.moduleCheckboxActive]}>
                                                {isSelected && (
                                                    <Svg width={12} height={12} viewBox="0 0 24 24">
                                                        <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                    </Svg>
                                                )}
                                            </View>
                                            <View style={styles.moduleInfo}>
                                                <Text className={`font-inter text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-primary-950'}`}>
                                                    {mod.name}
                                                </Text>
                                                {mod.required && <Text className="font-inter text-[10px] text-neutral-400">Required</Text>}
                                                {mod.deps.length > 0 && !mod.required && (
                                                    <Text className="font-inter text-[10px] text-neutral-400">
                                                        Requires: {mod.deps.map(d => MODULES.find(m => m.key === d)?.name).join(', ')}
                                                    </Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </>
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Bottom CTA */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={[styles.bottomCTA, { paddingBottom: insets.bottom + 16 }]}
                >
                    <Pressable
                        onPress={step === TOTAL_STEPS ? handleCreate : handleNext}
                        disabled={!isStepValid()}
                        style={styles.ctaWrapper}
                    >
                        <LinearGradient
                            colors={
                                !isStepValid()
                                    ? [colors.neutral[300], colors.neutral[300]]
                                    : [colors.gradient.start, colors.gradient.end]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaButton}
                        >
                            <Text className="font-inter text-base font-bold text-white">
                                {step === TOTAL_STEPS ? 'Create Company' : 'Continue'}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 12,
    },
    headerBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    // Step Indicator
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 12,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.neutral[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotActive: {
        backgroundColor: colors.primary[600],
    },
    stepDotCompleted: {
        backgroundColor: colors.success[500],
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.neutral[200],
        marginHorizontal: 4,
    },
    stepLineCompleted: {
        backgroundColor: colors.success[500],
    },
    // Content
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    stepContent: {
        paddingTop: 8,
    },
    // Form
    formField: {
        marginBottom: 16,
    },
    fieldInput: {
        backgroundColor: colors.white,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 48,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 14,
        color: colors.primary[950],
    },
    // Chips
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    selectChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    selectChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    // Tiers
    tierCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        marginBottom: 8,
        gap: 12,
    },
    tierCardActive: {
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
    },
    tierRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    tierRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary[600],
    },
    tierInfo: {
        flex: 1,
    },
    // Server
    serverOption: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        marginBottom: 10,
    },
    serverOptionActive: {
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
    },
    serverOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    serverOptRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    serverOptRadioActive: {
        borderColor: colors.primary[500],
    },
    serverOptRadioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary[600],
    },
    recommendedTag: {
        alignSelf: 'flex-start',
        marginTop: 8,
        marginLeft: 34,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.success[50],
    },
    // User Limits
    maxUserCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    maxUserRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginTop: 8,
    },
    largeNumberInput: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.primary[600],
        minWidth: 80,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    toggleRowActive: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    toggleTrack: {
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.neutral[300],
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleTrackActive: {
        backgroundColor: colors.primary[500],
    },
    toggleThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    // Module Select
    moduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        marginBottom: 8,
        gap: 12,
    },
    moduleRowActive: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    moduleCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleCheckboxActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    moduleInfo: {
        flex: 1,
    },
    // Bottom CTA
    bottomCTA: {
        paddingHorizontal: 24,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        backgroundColor: colors.white,
    },
    ctaWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
