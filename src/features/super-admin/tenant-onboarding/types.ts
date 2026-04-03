// ============ ENTITY TYPES ============

export interface PlantBranch {
    id: string;
    name: string;
    code: string;
    facilityType: string;
    customFacilityType: string;
    status: string;
    isHQ: boolean;
    // GST
    gstin: string;
    stateGST: string;
    // Address
    addressLine1: string;
    addressLine2: string;
    city: string;
    district: string;
    state: string;
    pin: string;
    country: string;
    // Contact Person
    contactName: string;
    contactDesignation: string;
    contactEmail: string;
    contactCountryCode: string;
    contactPhone: string;
    // Geo-fencing
    geoEnabled: boolean;
    geoLocationName: string;
    geoLat: string;
    geoLng: string;
    geoRadius: number;
    geoShape: 'circle' | 'freeform';
}

export interface Contact {
    id: string;
    name: string;
    designation: string;
    department: string;
    countryCode: string;
    mobile: string;
    email: string;
    type: string;
    linkedin: string;
}

export interface DowntimeSlot {
    id: string;
    type: string;
    duration: string;
}

export interface Shift {
    id: string;
    name: string;
    fromTime: string;
    toTime: string;
    noShuffle: boolean;
    downtimeSlots: DowntimeSlot[];
}

export interface NoSeriesItem {
    id: string;
    code: string;
    description: string;
    linkedScreen: string;
    prefix: string;
    suffix: string;
    numberCount: string;
    startNumber: string;
}

export interface IOTReason {
    id: string;
    reasonType: string;
    reason: string;
    description: string;
    department: string;
    planned: boolean;
    duration: string;
}

export interface UserItem {
    id: string;
    fullName: string;
    username: string;
    password: string;
    role: string;
    email: string;
    mobile: string;
    department: string;
}

// ============ STEP FORM TYPES ============

export interface Step1Form {
    logoUri: string;
    logoBase64?: string;
    displayName: string;
    slug: string;
    legalName: string;
    businessType: string;
    industry: string;
    companyCode: string;
    shortName: string;
    incorporationDate: string;
    employees: string;
    cin: string;
    website: string;
    emailDomain: string;
    status: string;
}

export interface Step2Form {
    pan: string;
    tan: string;
    gstin: string;
    pfRegNo: string;
    esiCode: string;
    ptReg: string;
    lwfrNo: string;
    rocState: string;
}

export interface Step3Form {
    regLine1: string;
    regLine2: string;
    regCity: string;
    regDistrict: string;
    regState: string;
    regCountry: string;
    regPin: string;
    regStdCode: string;
    sameAsRegistered: boolean;
    corpLine1: string;
    corpCity: string;
    corpState: string;
    corpPin: string;
    corpLine2: string;
    corpDistrict: string;
    corpStdCode: string;
    corpCountry: string;
}

export interface Step4Form {
    fyType: string;
    fyCustomStartMonth: string;
    fyCustomEndMonth: string;
    payrollFreq: string;
    cutoffDay: string;
    disbursementDay: string;
    weekStart: string;
    timezone: string;
    workingDays: string[];
}

export interface Step5Form {
    currency: string;
    language: string;
    dateFormat: string;
    numberFormat: string;
    timeFormat: string;
    indiaCompliance: boolean;
    multiCurrency: boolean;
    ess: boolean;
    mobileApp: boolean;
    webApp: boolean;
    systemApp: boolean;
    aiChatbot: boolean;
    eSign: boolean;
    biometric: boolean;
    bankIntegration: boolean;
    razorpayEnabled: boolean;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
    razorpayAccountNumber: string;
    razorpayAutoDisbursement: boolean;
    razorpayTestMode: boolean;
    emailNotif: boolean;
    whatsapp: boolean;
}

export interface Step6EndpointForm {
    endpointType: 'default' | 'custom';
    customBaseUrl: string;
}

export interface Step7ModulesForm {
    selectedModuleIds: string[];
    customModulePricing: Record<string, number>;
}

export type UserTierKey = 'starter' | 'growth' | 'scale' | 'enterprise' | 'custom';

export interface Step8TierForm {
    userTier: UserTierKey;
    customUserLimit: string;
    customTierPrice: string;
    billingType: 'monthly' | 'annual' | 'one_time_amc';
    trialDays: string;
    oneTimeLicenseFee?: string;
    amcAmount?: string;
}

// Step7Form — kept for backward compat (plants/branches meta).
// Strategy config is now in StrategyConfig.
export interface Step7Form {
    multiLocationMode: boolean;
    locationConfig: 'common' | 'per-location';
}

// ---- Scoped Config (common or per-location) ----

export type ScopedConfig<T> = {
    mode: 'common' | 'per-location';
    common: T;
    byLocationId: Record<string, T>;
};

// ---- Strategy Config ----

export interface StrategyConfig {
    multiLocationMode: boolean;
    locationConfig: 'common' | 'per-location';
    billingScope: 'per-location';
}

// ---- Per-Location Commercial ----

export interface LocationCommercialEntry {
    moduleIds: string[];
    customModulePricing: Record<string, number>;
    userTier: 'starter' | 'growth' | 'scale' | 'enterprise' | 'custom';
    customUserLimit: string;
    customTierPrice: string;
    billingType: 'monthly' | 'annual' | 'one_time_amc';
    trialDays: string;
    oneTimeLicenseFee?: string;
    amcAmount?: string;
}

export interface Step8Form {
    dayStartTime: string;
    dayEndTime: string;
    weeklyOffs: string[];
}

export interface Step11Form {
    ncEditMode: boolean;
    loadUnload: boolean;
    cycleTime: boolean;
    payrollLock: boolean;
    leaveCarryForward: boolean;
    overtimeApproval: boolean;
    mfa: boolean;
}
