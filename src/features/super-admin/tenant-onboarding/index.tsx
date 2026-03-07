/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInRight,
    SlideOutLeft,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';

import { StepIndicator } from './step-indicator';
import { S } from './shared-styles';
import { STEP_META, TOTAL_STEPS } from './constants';
import {
    type StepErrors,
    validateStep,
    validateArrayStep,
    step11ShiftsSchema,
} from './schemas';
import type {
    Contact,
    IOTReason,
    NoSeriesItem,
    PlantBranch,
    Shift,
    Step1Form,
    Step2Form,
    Step3Form,
    Step4Form,
    Step5Form,
    Step6EndpointForm,
    Step7ModulesForm,
    Step8TierForm,
    Step7Form,
    Step8Form,
    Step11Form,
    UserItem,
} from './types';

import { Step1Identity } from './steps/step01-identity';
import { Step2Statutory } from './steps/step02-statutory';
import { Step3Address } from './steps/step03-address';
import { Step4Fiscal } from './steps/step04-fiscal';
import { Step5Preferences } from './steps/step05-preferences';
import { Step6Endpoint } from './steps/step06-endpoint';
import { Step7Modules } from './steps/step07-modules';
import { Step8UserTier } from './steps/step08-user-tier';
import { Step6Contacts } from './steps/step06-contacts';
import { Step7PlantsBranches } from './steps/step07-plants-branches';
import { Step8Shifts } from './steps/step08-shifts';
import { Step9NoSeries } from './steps/step09-no-series';
import { Step10IOTReasons } from './steps/step10-iot-reasons';
import { Step11Controls } from './steps/step11-controls';
import { Step12Users } from './steps/step12-users';
import { Step13Activation } from './steps/step13-activation';

export function TenantOnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const [step, setStep] = React.useState(1);
    const [stepErrors, setStepErrors] = React.useState<StepErrors>({});

    // Clear errors whenever the step changes
    React.useEffect(() => {
        setStepErrors({});
    }, [step]);

    // ---- Step form states ----
    const [step1, setStep1] = React.useState<Step1Form>({
        logoUri: '',
        displayName: '', legalName: '', businessType: '', industry: '',
        companyCode: '', shortName: '', incorporationDate: '', employees: '',
        cin: '', website: '', emailDomain: '', status: 'Draft',
    });

    const [step2, setStep2] = React.useState<Step2Form>({
        pan: '', tan: '', gstin: '', pfRegNo: '', esiCode: '', ptReg: '', lwfrNo: '', rocState: '',
    });

    const [step3, setStep3] = React.useState<Step3Form>({
        regLine1: '', regLine2: '', regCity: '', regDistrict: '', regState: '',
        regCountry: 'India', regPin: '', regStdCode: '',
        sameAsRegistered: true, corpLine1: '', corpCity: '', corpState: '', corpPin: '',
    });

    const [step4, setStep4] = React.useState<Step4Form>({
        fyType: 'apr-mar', fyCustomStartMonth: '', fyCustomEndMonth: '',
        payrollFreq: 'Monthly', cutoffDay: 'Last Working Day',
        disbursementDay: '1st', weekStart: 'Monday',
        timezone: 'IST UTC+5:30',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    });

    const [step5, setStep5] = React.useState<Step5Form>({
        currency: 'INR — ₹', language: 'English', dateFormat: 'DD/MM/YYYY',
        numberFormat: 'Indian (2,00,000)', timeFormat: '12-hour (AM/PM)',
        indiaCompliance: true, multiCurrency: false, ess: true, mobileApp: true,
        aiChatbot: false, eSign: false, biometric: false,
        bankIntegration: false,
        razorpayEnabled: false, razorpayKeyId: '', razorpayKeySecret: '',
        razorpayWebhookSecret: '', razorpayAccountNumber: '',
        razorpayAutoDisbursement: false, razorpayTestMode: true,
        emailNotif: false, whatsapp: false,
    });

    const [step6, setStep6] = React.useState<Step6EndpointForm>({
        endpointType: 'default',
        customBaseUrl: '',
    });

    const [step7Modules, setStep7Modules] = React.useState<Step7ModulesForm>({
        selectedModuleIds: [],
        customModulePricing: {},
    });

    const [step8Tier, setStep8Tier] = React.useState<Step8TierForm>({
        userTier: 'starter',
        customUserLimit: '',
        customTierPrice: '',
        billingCycle: 'monthly',
        trialDays: '14',
    });

    const [contacts, setContacts] = React.useState<Contact[]>([
        { id: '1', name: '', designation: '', department: '', countryCode: '+91', mobile: '', email: '', type: 'Primary', linkedin: '' },
    ]);

    const [plantsStep, setPlantsStep] = React.useState<Step7Form>({
        multiLocationMode: false,
        locationConfig: 'common',
    });
    const [locations, setLocations] = React.useState<PlantBranch[]>([]);

    const [shiftsStep, setShiftsStep] = React.useState<Step8Form>({
        dayStartTime: '', dayEndTime: '', weeklyOffs: ['Sunday'],
    });
    const [shifts, setShifts] = React.useState<Shift[]>([]);

    const [noSeries, setNoSeries] = React.useState<NoSeriesItem[]>([]);
    const [iotReasons, setIotReasons] = React.useState<IOTReason[]>([]);

    const [step11, setStep11] = React.useState<Step11Form>({
        ncEditMode: false, loadUnload: false, cycleTime: false,
        payrollLock: true, leaveCarryForward: true, overtimeApproval: false,
        mfa: false, backdatedEntry: false, docNumberLock: true,
    });

    const [users, setUsers] = React.useState<UserItem[]>([
        { id: '1', fullName: '', username: '', password: '', role: 'Company Admin', email: '', mobile: '', department: '' },
    ]);

    // ---- Merge helpers ----
    const merge1 = (u: Partial<Step1Form>) => setStep1((p) => ({ ...p, ...u }));
    const merge2 = (u: Partial<Step2Form>) => setStep2((p) => ({ ...p, ...u }));
    const merge3 = (u: Partial<Step3Form>) => setStep3((p) => ({ ...p, ...u }));
    const merge4 = (u: Partial<Step4Form>) => setStep4((p) => ({ ...p, ...u }));
    const merge5 = (u: Partial<Step5Form>) => setStep5((p) => ({ ...p, ...u }));
    const merge6 = (u: Partial<Step6EndpointForm>) => setStep6((p) => ({ ...p, ...u }));
    const merge7Modules = (u: Partial<Step7ModulesForm>) => setStep7Modules((p) => ({ ...p, ...u }));
    const merge8Tier = (u: Partial<Step8TierForm>) => setStep8Tier((p) => ({ ...p, ...u }));
    const mergePlants = (u: Partial<Step7Form>) => setPlantsStep((p) => ({ ...p, ...u }));
    const mergeShifts = (u: Partial<Step8Form>) => setShiftsStep((p) => ({ ...p, ...u }));
    const merge11 = (u: Partial<Step11Form>) => setStep11((p) => ({ ...p, ...u }));

    // ---- Validation ----
    const validateCurrentStep = (): StepErrors => {
        switch (step) {
            case 1: return validateStep(1, step1 as Record<string, unknown>);
            case 2: return validateStep(2, step2 as Record<string, unknown>);
            case 3: return validateStep(3, step3 as Record<string, unknown>);
            case 4: return validateStep(4, step4 as Record<string, unknown>);
            case 5: return validateStep(5, step5 as Record<string, unknown>);
            case 6: return validateStep(6, step6 as Record<string, unknown>);
            case 7: return validateStep(7, step7Modules as Record<string, unknown>);
            case 8: return validateStep(8, step8Tier as Record<string, unknown>);
            case 9: return validateArrayStep(9, contacts);
            case 10: return validateArrayStep(10, locations);
            case 11: {
                const result = step11ShiftsSchema.safeParse({ ...shiftsStep, shifts });
                if (result.success) return {};
                const errors: StepErrors = {};
                for (const issue of result.error.issues) {
                    const path = issue.path;
                    if (path.length === 0) {
                        errors['_root'] = issue.message;
                    } else if (path[0] === 'shifts' && path.length >= 3) {
                        const key = `${String(path[2])}_${String(path[1])}`;
                        if (!errors[key]) errors[key] = issue.message;
                    } else {
                        const key = String(path[0]);
                        if (!errors[key]) errors[key] = issue.message;
                    }
                }
                return errors;
            }
            case 12: return validateArrayStep(12, noSeries);
            case 13: return validateArrayStep(13, iotReasons);
            case 15: return validateArrayStep(15, users);
            default: return {};
        }
    };

    // ---- Navigation ----
    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            showConfirm({
                title: 'Discard Changes?',
                message: 'All unsaved onboarding data will be lost.',
                variant: 'warning',
                confirmText: 'Discard',
                onConfirm: () => router.back(),
            });
        }
    };

    const handleNext = () => {
        const errors = validateCurrentStep();
        if (Object.keys(errors).length > 0) {
            setStepErrors(errors);
            return;
        }
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleCreateCompany = () => {
        showConfirm({
            title: 'Create Company',
            message: `Create "${step1.displayName || 'new company'}" with status "${step1.status}"? The tenant will be provisioned on the platform.`,
            variant: 'primary',
            confirmText: 'Create',
            onConfirm: () => {
                // TODO: API call with all form data
                router.back();
            },
        });
    };

    const handleSaveDraft = () => {
        // TODO: Persist draft to API
    };

    const isLastStep = step === TOTAL_STEPS;
    const meta = STEP_META[step - 1];

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1Identity form={step1} setForm={merge1} errors={stepErrors} />;
            case 2: return <Step2Statutory form={step2} setForm={merge2} errors={stepErrors} />;
            case 3: return <Step3Address form={step3} setForm={merge3} errors={stepErrors} />;
            case 4: return <Step4Fiscal form={step4} setForm={merge4} errors={stepErrors} />;
            case 5: return <Step5Preferences form={step5} setForm={merge5} errors={stepErrors} />;
            case 6: return <Step6Endpoint form={step6} setForm={merge6} errors={stepErrors} />;
            case 7: return (
                <Step7Modules
                    form={step7Modules}
                    setForm={merge7Modules}
                    errors={stepErrors}
                />
            );
            case 8: return (
                <Step8UserTier
                    form={step8Tier}
                    setForm={merge8Tier}
                    modules={step7Modules}
                    errors={stepErrors}
                />
            );
            case 9: return <Step6Contacts contacts={contacts} setContacts={setContacts} errors={stepErrors} />;
            case 10: return (
                <Step7PlantsBranches
                    form={plantsStep}
                    setForm={mergePlants}
                    locations={locations}
                    setLocations={setLocations}
                    errors={stepErrors}
                />
            );
            case 11: return (
                <Step8Shifts
                    form={shiftsStep}
                    setForm={mergeShifts}
                    shifts={shifts}
                    setShifts={setShifts}
                    errors={stepErrors}
                />
            );
            case 12: return <Step9NoSeries noSeries={noSeries} setNoSeries={setNoSeries} errors={stepErrors} />;
            case 13: return <Step10IOTReasons reasons={iotReasons} setReasons={setIotReasons} errors={stepErrors} />;
            case 14: return <Step11Controls form={step11} setForm={merge11} />;
            case 15: return <Step12Users users={users} setUsers={setUsers} errors={stepErrors} />;
            case 16: return (
                <Step13Activation
                    companyName={step1.displayName}
                    currentStatus={step1.status}
                    onStatusChange={(s) => merge1({ status: s })}
                />
            );
            default: return null;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.gradient.surface }}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* ---- Header ---- */}
                <Animated.View
                    entering={FadeInDown.duration(350)}
                    style={[S.header, { paddingTop: insets.top + 8 }]}
                >
                    <Pressable onPress={handleBack} style={S.headerBackBtn}>
                        <ChevronLeft size={20} color={colors.primary[600]} strokeWidth={2} />
                    </Pressable>

                    <View style={S.headerCenter}>
                        <Text className="font-inter text-base font-bold text-primary-950">
                            {meta.title}
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500">
                            Step {step} of {TOTAL_STEPS} · {meta.subtitle}
                        </Text>
                    </View>

                    <Pressable onPress={handleSaveDraft} style={S.saveDraftBtn}>
                        <Text className="font-inter text-xs font-semibold text-primary-500">
                            Save Draft
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* ---- Step Indicator ---- */}
                <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

                {/* ---- Content ---- */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        S.scrollContent,
                        { paddingBottom: insets.bottom + 120 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <Animated.View
                        key={step}
                        entering={SlideInRight.duration(280)}
                        exiting={SlideOutLeft.duration(200)}
                    >
                        {renderStep()}
                    </Animated.View>
                </ScrollView>

                {/* ---- Bottom CTA ---- */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={[
                        S.bottomCTA,
                        {
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            paddingBottom: insets.bottom + 12,
                        },
                    ]}
                >
                    {step > 1 && (
                        <Pressable onPress={handleBack} style={S.prevButton}>
                            <ChevronLeft size={18} color={colors.primary[600]} strokeWidth={2} />
                        </Pressable>
                    )}

                    <Pressable
                        onPress={isLastStep ? handleCreateCompany : handleNext}
                        style={S.nextBtnWrapper}
                    >
                        <LinearGradient
                            colors={[colors.gradient.start, colors.gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={S.nextBtn}
                        >
                            <Text className="font-inter text-base font-bold text-white">
                                {isLastStep ? 'Create Company' : 'Continue'}
                            </Text>
                            {!isLastStep && (
                                <ChevronRight size={18} color="#fff" strokeWidth={2} />
                            )}
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </KeyboardAvoidingView>

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}
