/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
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
import type { AxiosError } from 'axios';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { showSuccess } from '@/components/ui/utils';

import { useOnboardTenant } from '@/features/super-admin/api/use-tenant-queries';

import { StepIndicator } from './step-indicator';
import { S } from './shared-styles';
import { STEP_META, TOTAL_STEPS } from './constants';
import {
    type StepErrors,
    validateStep,
    validateArrayStep,
    step11ShiftsSchema,
    getStep2Schema,
} from './schemas';
import type {
    Contact,
    IOTReason,
    LocationCommercialEntry,
    NoSeriesItem,
    PlantBranch,
    Shift,
    Step1Form,
    Step2Form,
    Step3Form,
    Step4Form,
    Step5Form,
    Step6EndpointForm,
    Step7Form,
    Step8Form,
    Step11Form,
    StrategyConfig,
    UserItem,
} from './types';

import { Step1Identity } from './steps/step01-identity';
import { Step2Statutory } from './steps/step02-statutory';
import { Step3Address } from './steps/step03-address';
import { Step4Fiscal } from './steps/step04-fiscal';
import { Step5Preferences } from './steps/step05-preferences';
import { Step6Endpoint } from './steps/step06-endpoint';
import { Step7Strategy } from './steps/step07-strategy';
import { Step8Locations } from './steps/step08-locations';
import { Step9PerLocationModules } from './steps/step09-per-location-modules';
import { Step10PerLocationTier } from './steps/step10-per-location-tier';
import { Step11Contacts } from './steps/step11-contacts';
import { Step12Shifts } from './steps/step12-shifts';
import { Step13NoSeries } from './steps/step13-no-series';
import { Step14IOTReasons } from './steps/step14-iot-reasons';
import { Step15Controls } from './steps/step15-controls';
import { Step16Users } from './steps/step16-users';
import { Step17Activation } from './steps/step17-activation';

export function TenantOnboardingScreen() {
    // Toggle this to quickly enable/disable step validation during onboarding testing.
    const SKIP_STEP_VALIDATION = false;

    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const onboardMutation = useOnboardTenant();

    const [step, setStep] = React.useState(1);
    const [stepErrors, setStepErrors] = React.useState<StepErrors>({});

    // Clear errors whenever the step changes
    React.useEffect(() => {
        setStepErrors({});
    }, [step]);

    // ---- Step form states ----
    const [step1, setStep1] = React.useState<Step1Form>({
        logoUri: '',
        logoR2Key: '',
        displayName: '', slug: '', legalName: '', businessType: '', industry: '',
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
        corpLine2: '', corpDistrict: '', corpStdCode: '', corpCountry: 'India',
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
        indiaCompliance: true, multiCurrency: false, ess: true, mobileApp: true, webApp: true,
        systemApp: false,
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

    const [strategyConfig, setStrategyConfig] = React.useState<StrategyConfig>({
        multiLocationMode: false,
        locationConfig: 'common',
        billingScope: 'per-location',
    });

    const [locationCommercial, setLocationCommercial] = React.useState<Record<string, LocationCommercialEntry>>({});

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
        mfa: false,
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
    const mergeStrategy = (u: Partial<StrategyConfig>) => setStrategyConfig((p) => ({ ...p, ...u }));
    const updateLocationCommercial = (locationId: string, u: Partial<LocationCommercialEntry>) => {
        setLocationCommercial((p) => ({
            ...p,
            [locationId]: { ...(p[locationId] ?? {
                moduleIds: [],
                customModulePricing: {},
                userTier: 'starter',
                customUserLimit: '',
                customTierPrice: '',
                billingType: 'monthly',
                trialDays: '14',
            }), ...u },
        }));
    };
    const mergePlants = (u: Partial<Step7Form>) => setPlantsStep((p) => ({ ...p, ...u }));
    const mergeShifts = (u: Partial<Step8Form>) => setShiftsStep((p) => ({ ...p, ...u }));
    const merge11 = (u: Partial<Step11Form>) => setStep11((p) => ({ ...p, ...u }));

    // ---- Validation ----
    const validateCurrentStep = (): StepErrors => {
        switch (step) {
            case 1: return validateStep(1, step1 as unknown as Record<string, unknown>);
            case 2: {
                const schema = getStep2Schema(step1.businessType);
                const result = schema.safeParse(step2);
                if (result.success) return {};
                const errs: StepErrors = {};
                for (const issue of result.error.issues) {
                    const key = issue.path.join('_') || '_root';
                    if (!errs[key]) errs[key] = issue.message;
                }
                return errs;
            }
            case 3: return validateStep(3, step3 as unknown as Record<string, unknown>);
            case 4: return validateStep(4, step4 as unknown as Record<string, unknown>);
            case 5: return validateStep(5, step5 as unknown as Record<string, unknown>);
            case 6: return validateStep(6, step6 as unknown as Record<string, unknown>);
            case 7: return validateStep(7, strategyConfig as unknown as Record<string, unknown>);
            case 8: return validateArrayStep(8, locations);   // Locations Master
            case 9: return {};                                 // Per-location modules — validated inline
            case 10: return {};                               // Per-location tier — validated inline
            case 11: return validateArrayStep(11, contacts);  // Key Contacts
            case 12: {
                // Shifts & Time
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
            case 13: return validateArrayStep(13, noSeries);   // No. Series
            case 14: return validateArrayStep(14, iotReasons); // IOT Reasons
            case 16: return validateArrayStep(16, users);      // Users & Access
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
        if (!SKIP_STEP_VALIDATION) {
            const errors = validateCurrentStep();
            if (Object.keys(errors).length > 0) {
                setStepErrors(errors);
                return;
            }
        }
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleCreateCompany = () => {
        showConfirm({
            title: 'Create Company',
            message: `Create "${step1.displayName || 'new company'}" with status "${step1.status}"? The tenant will be provisioned on the platform.`,
            variant: 'primary',
            confirmText: 'Create',
            onConfirm: async () => {
                try {
                    const payload = {
                        identity: {
                            logoUrl: step1.logoR2Key || step1.logoUri,
                            displayName: step1.displayName,
                            slug: step1.slug,
                            legalName: step1.legalName,
                            businessType: step1.businessType,
                            industry: step1.industry,
                            companyCode: step1.companyCode,
                            shortName: step1.shortName,
                            incorporationDate: step1.incorporationDate,
                            employeeCount: step1.employees,
                            cin: step1.cin,
                            website: step1.website,
                            emailDomain: step1.emailDomain,
                            wizardStatus: step1.status,
                        },
                        statutory: { ...step2 },
                        address: {
                            registered: {
                                line1: step3.regLine1,
                                line2: step3.regLine2,
                                city: step3.regCity,
                                district: step3.regDistrict,
                                state: step3.regState,
                                country: step3.regCountry,
                                pin: step3.regPin,
                                stdCode: step3.regStdCode,
                            },
                            sameAsRegistered: step3.sameAsRegistered,
                            corporate: step3.sameAsRegistered ? undefined : {
                                line1: step3.corpLine1,
                                line2: step3.corpLine2,
                                city: step3.corpCity,
                                district: step3.corpDistrict,
                                state: step3.corpState,
                                country: step3.corpCountry,
                                pin: step3.corpPin,
                                stdCode: step3.corpStdCode,
                            },
                        },
                        fiscal: { ...step4 },
                        preferences: { ...step5 },
                        endpoint: {
                            endpointType: step6.endpointType,
                            customBaseUrl: step6.customBaseUrl,
                        },
                        strategy: {
                            multiLocationMode: strategyConfig.multiLocationMode,
                            locationConfig: strategyConfig.locationConfig,
                            billingScope: strategyConfig.billingScope,
                        },
                        locations: locations.map((loc) => ({
                            name: loc.name,
                            code: loc.code,
                            facilityType: loc.facilityType,
                            customFacilityType: loc.customFacilityType,
                            status: loc.status,
                            isHQ: loc.isHQ,
                            gstin: loc.gstin,
                            addressLine1: loc.addressLine1,
                            addressLine2: loc.addressLine2,
                            city: loc.city,
                            district: loc.district,
                            state: loc.state,
                            country: loc.country,
                            pin: loc.pin,
                            contactName: loc.contactName,
                            contactDesignation: loc.contactDesignation,
                            contactEmail: loc.contactEmail,
                            contactCountryCode: loc.contactCountryCode,
                            contactPhone: loc.contactPhone,
                            geoEnabled: loc.geoEnabled,
                            geoLocationName: loc.geoLocationName,
                            geoLat: loc.geoLat,
                            geoLng: loc.geoLng,
                            geoRadius: loc.geoRadius,
                            geoShape: loc.geoShape,
                        })),
                        contacts: contacts.map((c) => ({
                            name: c.name,
                            designation: c.designation,
                            department: c.department,
                            countryCode: c.countryCode,
                            mobile: c.mobile,
                            email: c.email,
                            type: c.type,
                            linkedin: c.linkedin,
                        })),
                        shifts: {
                            dayStartTime: shiftsStep.dayStartTime,
                            dayEndTime: shiftsStep.dayEndTime,
                            weeklyOffs: shiftsStep.weeklyOffs,
                            items: shifts.map((s) => ({
                                name: s.name,
                                fromTime: s.fromTime,
                                toTime: s.toTime,
                                noShuffle: s.noShuffle,
                                downtimeSlots: s.downtimeSlots,
                            })),
                        },
                        noSeries: noSeries.map((ns) => ({
                            code: ns.code,
                            description: ns.description,
                            linkedScreen: ns.linkedScreen,
                            prefix: ns.prefix,
                            suffix: ns.suffix,
                            numberCount: Number.parseInt(ns.numberCount, 10),
                            startNumber: Number.parseInt(ns.startNumber, 10),
                        })),
                        iotReasons: iotReasons.map((r) => ({
                            reasonType: r.reasonType,
                            reason: r.reason,
                            description: r.description,
                            department: r.department,
                            planned: r.planned,
                            duration: r.duration,
                        })),
                        controls: { ...step11 },
                        users: users.map((u) => ({
                            fullName: u.fullName,
                            username: u.username,
                            password: u.password,
                            role: u.role,
                            email: u.email,
                            mobile: u.mobile,
                            department: u.department,
                        })),
                        commercial: strategyConfig.locationConfig === 'common' ? locationCommercial : undefined,
                        locationCommercial: strategyConfig.locationConfig === 'per-location' ? locationCommercial : undefined,
                    };

                    await onboardMutation.mutateAsync(payload);
                    showSuccess('Company Created', 'Tenant onboarded successfully.');
                    router.back();
                } catch (err: any) {
                    const apiError = err as AxiosError<{ message?: string; error?: string }>;
                    const errorMessage = apiError.response?.data?.message
                        ?? apiError.response?.data?.error
                        ?? err?.message
                        ?? 'An error occurred while creating the company. Please try again.';
                    showConfirm({
                        title: 'Onboarding Failed',
                        message: errorMessage,
                        variant: 'danger',
                        confirmText: 'OK',
                        onConfirm: () => {},
                    });
                }
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
            case 2: return <Step2Statutory form={step2} setForm={merge2} errors={stepErrors} businessType={step1.businessType} />;
            case 3: return <Step3Address form={step3} setForm={merge3} errors={stepErrors} />;
            case 4: return <Step4Fiscal form={step4} setForm={merge4} errors={stepErrors} />;
            case 5: return <Step5Preferences form={step5} setForm={merge5} errors={stepErrors} />;
            case 6: return <Step6Endpoint form={step6} setForm={merge6} errors={stepErrors} />;
            case 7: return (
                <Step7Strategy
                    form={strategyConfig}
                    setForm={mergeStrategy}
                    errors={stepErrors}
                />
            );
            case 8: return (
                <Step8Locations
                    locations={locations}
                    setLocations={setLocations}
                    errors={stepErrors}
                />
            );
            case 9: return (
                <Step9PerLocationModules
                    strategyConfig={strategyConfig}
                    locations={locations}
                    locationCommercial={locationCommercial}
                    onUpdateLocationCommercial={updateLocationCommercial}
                    errors={stepErrors}
                />
            );
            case 10: return (
                <Step10PerLocationTier
                    strategyConfig={strategyConfig}
                    locations={locations}
                    locationCommercial={locationCommercial}
                    onUpdateLocationCommercial={updateLocationCommercial}
                    endpointType={step6.endpointType}
                    errors={stepErrors}
                />
            );
            case 11: return <Step11Contacts contacts={contacts} setContacts={setContacts} errors={stepErrors} />;
            case 12: return (
                <Step12Shifts
                    form={shiftsStep}
                    setForm={mergeShifts}
                    shifts={shifts}
                    setShifts={setShifts}
                    errors={stepErrors}
                />
            );
            case 13: return <Step13NoSeries noSeries={noSeries} setNoSeries={setNoSeries} errors={stepErrors} />;
            case 14: return <Step14IOTReasons reasons={iotReasons} setReasons={setIotReasons} errors={stepErrors} />;
            case 15: return <Step15Controls form={step11} setForm={merge11} />;
            case 16: return <Step16Users users={users} setUsers={setUsers} errors={stepErrors} />;
            case 17: return (
                <Step17Activation
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
                        <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                            {meta.title}
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
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
                        disabled={onboardMutation.isPending}
                    >
                        <LinearGradient
                            colors={[colors.gradient.start, colors.gradient.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[S.nextBtn, onboardMutation.isPending && { opacity: 0.7 }]}
                        >
                            {onboardMutation.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Text className="font-inter text-base font-bold text-white">
                                        {isLastStep ? 'Create Company' : 'Continue'}
                                    </Text>
                                    {!isLastStep && (
                                        <ChevronRight size={18} color="#fff" strokeWidth={2} />
                                    )}
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </KeyboardAvoidingView>

            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}
