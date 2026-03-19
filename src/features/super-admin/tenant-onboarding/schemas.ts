import { z } from 'zod';

// ============ STEP 1 — Company Identity ============

export const step1Schema = z.object({
    logoUri: z.string().optional(),
    logoBase64: z.string().optional(),
    displayName: z.string().min(2, 'Display name is required (min 2 characters)'),
    legalName: z.string().min(2, 'Legal / registered name is required'),
    businessType: z.string().min(1, 'Select a business type'),
    industry: z.string().min(1, 'Select an industry'),
    companyCode: z
        .string()
        .min(2, 'Company code is required')
        .regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, hyphens and underscores allowed'),
    shortName: z.string().optional(),
    incorporationDate: z
        .string()
        .min(1, 'Incorporation date is required')
        .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
    employees: z
        .string()
        .optional()
        .refine((v) => !v || /^\d+$/.test(v), 'Must be a whole number'),
    cin: z
        .string()
        .optional()
        .refine(
            (v) => !v || /^[A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(v),
            'Invalid CIN format (e.g. U72900KA2019PTC312847)'
        ),
    website: z
        .string()
        .optional()
        .refine(
            (v) => !v || v.startsWith('https://') || v.startsWith('http://'),
            'Must start with https:// or http://'
        ),
    emailDomain: z
        .string()
        .min(4, 'Corporate email domain is required')
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, 'Invalid domain format (e.g. company.com)'),
    status: z.string().min(1, 'Select a status'),
});

export type Step1Errors = Partial<Record<keyof z.infer<typeof step1Schema>, string>>;

// ============ STEP 2 — Statutory & Tax ============

export const step2Schema = z.object({
    pan: z
        .string()
        .min(1, 'PAN is required')
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (format: AAAAA9999A)'),
    tan: z
        .string()
        .min(1, 'TAN is required')
        .regex(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, 'Invalid TAN (format: AAAA99999A)'),
    gstin: z
        .string()
        .optional()
        .refine(
            (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
            'Invalid GSTIN (format: 29AARCA5678F1Z3)'
        ),
    pfRegNo: z.string().min(1, 'PF Registration No. is required'),
    esiCode: z
        .string()
        .optional()
        .refine(
            (v) => !v || /^[0-9]{2}-[0-9]{2}-[0-9]{6}-[0-9]{3}-[0-9]{4}$/.test(v) || /^[0-9-]+$/.test(v),
            'Invalid ESI employer code format'
        ),
    ptReg: z.string().optional(),
    lwfrNo: z.string().optional(),
    rocState: z.string().min(1, 'ROC filing state is required'),
});

export type Step2Errors = Partial<Record<keyof z.infer<typeof step2Schema>, string>>;

export const CORPORATE_TYPES = ['Private Limited (Pvt. Ltd.)', 'Public Limited'];

export function getStep2Schema(businessType: string) {
    const isCorporate = CORPORATE_TYPES.includes(businessType);
    return z.object({
        pan: z
            .string()
            .min(1, 'PAN is required')
            .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (format: AAAAA9999A)'),
        tan: isCorporate
            ? z.string().min(1, 'TAN is required').regex(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, 'Invalid TAN (format: AAAA99999A)')
            : z.string().optional().or(z.literal('')),
        gstin: z
            .string()
            .optional()
            .refine(
                (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
                'Invalid GSTIN (format: 29AARCA5678F1Z3)'
            ),
        pfRegNo: isCorporate
            ? z.string().min(1, 'PF Registration No. is required')
            : z.string().optional().or(z.literal('')),
        esiCode: z
            .string()
            .optional()
            .refine(
                (v) => !v || /^[0-9]{2}-[0-9]{2}-[0-9]{6}-[0-9]{3}-[0-9]{4}$/.test(v) || /^[0-9-]+$/.test(v),
                'Invalid ESI employer code format'
            ),
        ptReg: z.string().optional(),
        lwfrNo: z.string().optional(),
        rocState: isCorporate
            ? z.string().min(1, 'ROC filing state is required')
            : z.string().optional(),
    });
}

// ============ STEP 3 — Address ============

export const step3Schema = z
    .object({
        regLine1: z.string().min(5, 'Address line 1 is required (min 5 characters)'),
        regLine2: z.string().optional(),
        regCity: z.string().min(2, 'City is required'),
        regDistrict: z.string().optional(),
        regState: z.string().min(2, 'State is required'),
        regCountry: z.string().min(2, 'Country is required'),
        regPin: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
        regStdCode: z.string().optional(),
        sameAsRegistered: z.boolean(),
        corpLine1: z.string().optional(),
        corpCity: z.string().optional(),
        corpState: z.string().optional(),
        corpPin: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.sameAsRegistered) {
            if (!data.corpLine1 || data.corpLine1.length < 5) {
                ctx.addIssue({ code: 'custom', message: 'Corporate address line 1 is required', path: ['corpLine1'] });
            }
            if (!data.corpCity || data.corpCity.length < 2) {
                ctx.addIssue({ code: 'custom', message: 'Corporate city is required', path: ['corpCity'] });
            }
            if (!data.corpState) {
                ctx.addIssue({ code: 'custom', message: 'Corporate state is required', path: ['corpState'] });
            }
            if (!data.corpPin || !/^\d{6}$/.test(data.corpPin)) {
                ctx.addIssue({ code: 'custom', message: 'Corporate PIN must be 6 digits', path: ['corpPin'] });
            }
        }
    });

export type Step3Errors = Partial<Record<keyof z.infer<typeof step3Schema>, string>>;

// ============ STEP 4 — Fiscal & Calendar ============

export const step4Schema = z
    .object({
        fyType: z.string().min(1, 'Select a fiscal year type'),
        fyCustomStartMonth: z.string().optional(),
        fyCustomEndMonth: z.string().optional(),
        payrollFreq: z.string().min(1, 'Select payroll frequency'),
        cutoffDay: z.string().min(1, 'Select cut-off day'),
        disbursementDay: z.string().min(1, 'Select disbursement day'),
        weekStart: z.string().min(1, 'Select week start day'),
        timezone: z.string().min(1, 'Select timezone'),
        workingDays: z.array(z.string()).min(1, 'Select at least one working day'),
    })
    .superRefine((data, ctx) => {
        if (data.fyType === 'custom') {
            if (!data.fyCustomStartMonth) {
                ctx.addIssue({ code: 'custom', message: 'Select custom FY start month', path: ['fyCustomStartMonth'] });
            }
            if (!data.fyCustomEndMonth) {
                ctx.addIssue({ code: 'custom', message: 'Select custom FY end month', path: ['fyCustomEndMonth'] });
            }
            if (data.fyCustomStartMonth && data.fyCustomEndMonth && data.fyCustomStartMonth === data.fyCustomEndMonth) {
                ctx.addIssue({ code: 'custom', message: 'Start and end months must be different', path: ['fyCustomEndMonth'] });
            }
        }
    });

export type Step4Errors = Partial<Record<keyof z.infer<typeof step4Schema>, string>>;

// ============ STEP 5 — Preferences ============

export const step5Schema = z
    .object({
        currency: z.string().min(1, 'Select a currency'),
        language: z.string().min(1, 'Select a language'),
        dateFormat: z.string().min(1, 'Select a date format'),
        numberFormat: z.string().min(1, 'Select a number format'),
        timeFormat: z.string().min(1, 'Select a time format'),
        indiaCompliance: z.boolean(),
        multiCurrency: z.boolean(),
        ess: z.boolean(),
        mobileApp: z.boolean(),
        webApp: z.boolean(),
        systemApp: z.boolean(),
        aiChatbot: z.boolean(),
        eSign: z.boolean(),
        biometric: z.boolean(),
        bankIntegration: z.boolean(),
        razorpayEnabled: z.boolean(),
        razorpayKeyId: z.string().optional(),
        razorpayKeySecret: z.string().optional(),
        razorpayWebhookSecret: z.string().optional(),
        razorpayAccountNumber: z.string().optional(),
        razorpayAutoDisbursement: z.boolean(),
        razorpayTestMode: z.boolean(),
        emailNotif: z.boolean(),
        whatsapp: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.bankIntegration && data.razorpayEnabled) {
            if (!data.razorpayKeyId || data.razorpayKeyId.trim().length < 10) {
                ctx.addIssue({ code: 'custom', message: 'RazorpayX Key ID is required', path: ['razorpayKeyId'] });
            }
            if (!data.razorpayKeySecret || data.razorpayKeySecret.trim().length < 10) {
                ctx.addIssue({ code: 'custom', message: 'RazorpayX Key Secret is required', path: ['razorpayKeySecret'] });
            }
            if (!data.razorpayAccountNumber || !/^\d{9,18}$/.test(data.razorpayAccountNumber)) {
                ctx.addIssue({ code: 'custom', message: 'Valid account number required (9–18 digits)', path: ['razorpayAccountNumber'] });
            }
        }
    });

export type Step5Errors = Partial<Record<keyof z.infer<typeof step5Schema>, string>>;

// ============ STEP 6 — Backend Endpoint ============

export const step6EndpointSchema = z
    .object({
        endpointType: z.enum(['default', 'custom']),
        customBaseUrl: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.endpointType === 'custom') {
            if (!data.customBaseUrl || data.customBaseUrl.trim().length === 0) {
                ctx.addIssue({ code: 'custom', message: 'Custom base URL is required', path: ['customBaseUrl'] });
            } else if (!/^https?:\/\/.+/.test(data.customBaseUrl.trim())) {
                ctx.addIssue({ code: 'custom', message: 'URL must start with https:// or http://', path: ['customBaseUrl'] });
            }
        }
    });

export type Step6EndpointErrors = Partial<Record<keyof z.infer<typeof step6EndpointSchema>, string>>;

// ============ STEP 7 — Configuration Strategy ============

export const step7StrategySchema = z.object({
    multiLocationMode: z.boolean(),
    locationConfig: z.enum(['common', 'per-location']),
    billingScope: z.literal('per-location'),
});

export type Step7StrategyErrors = Partial<Record<keyof z.infer<typeof step7StrategySchema>, string>>;

// ============ STEP 9 — Per-Location Modules (simplified) ============

export const step9PerLocationModulesSchema = z.object({
    locationId: z.string().min(1),
    moduleIds: z.array(z.string()).min(1, 'Select at least one module for this location'),
});

// ============ STEP 10 — Per-Location Tier (simplified) ============

export const step10PerLocationTierSchema = z.object({
    locationId: z.string().min(1),
    userTier: z.enum(['starter', 'growth', 'scale', 'enterprise', 'custom']),
    billingType: z.enum(['monthly', 'annual', 'one_time_amc']),
    trialDays: z.string(),
});

// ============ STEP 7 (old) — Module Selection ============

export const step7ModulesSchema = z.object({
    selectedModuleIds: z.array(z.string()).min(1, 'Select at least one module'),
    customModulePricing: z.record(z.string(), z.number()).optional(),
});

export type Step7ModulesErrors = Partial<Record<keyof z.infer<typeof step7ModulesSchema>, string>>;

// ============ STEP 8 — User Tier & Pricing ============

export const step8TierSchema = z
    .object({
        userTier: z.enum(['starter', 'growth', 'scale', 'enterprise', 'custom']),
        customUserLimit: z.string().optional(),
        customTierPrice: z.string().optional(),
        billingType: z.enum(['monthly', 'annual', 'one_time_amc']),
        trialDays: z
            .string()
            .regex(/^\d+$/, 'Trial days must be a non-negative number'),
    })
    .superRefine((data, ctx) => {
        if (data.userTier === 'custom') {
            if (!data.customUserLimit || !/^\d+$/.test(data.customUserLimit) || parseInt(data.customUserLimit) < 1001) {
                ctx.addIssue({ code: 'custom', message: 'Custom user limit must be ≥ 1001', path: ['customUserLimit'] });
            }
            if (!data.customTierPrice || !/^\d+$/.test(data.customTierPrice) || parseInt(data.customTierPrice) <= 0) {
                ctx.addIssue({ code: 'custom', message: 'Custom tier price must be a positive number', path: ['customTierPrice'] });
            }
        }
    });

export type Step8TierErrors = Partial<Record<keyof z.infer<typeof step8TierSchema>, string>>;

// ============ STEP 9 — Key Contacts ============

const contactSchema = z.object({
    id: z.string(),
    name: z.string().min(2, 'Contact name is required'),
    designation: z.string().optional(),
    department: z.string().optional(),
    countryCode: z.string().min(1),
    mobile: z
        .string()
        .min(7, 'Mobile number is required (min 7 digits)')
        .regex(/^\d[\d\s-]{5,}$/, 'Invalid mobile number'),
    email: z.string().email('Invalid email address'),
    type: z.string().min(1),
    linkedin: z
        .string()
        .optional()
        .refine(
            (v) => !v || v.includes('linkedin.com'),
            'Must be a valid LinkedIn URL'
        ),
});

export const step9ContactsSchema = z
    .array(contactSchema)
    .min(1, 'Add at least one key contact');

export type ContactErrors = Partial<Record<keyof z.infer<typeof contactSchema>, string>>;

// ============ STEP 10 — Plants & Branches ============

const plantBranchSchema = z.object({
    id: z.string(),
    name: z.string().min(2, 'Location name is required'),
    code: z
        .string()
        .min(2, 'Location code is required')
        .regex(/^[A-Z0-9_-]+$/, 'Code: uppercase letters, numbers, hyphens only'),
    facilityType: z.string().min(1, 'Select a facility type'),
    customFacilityType: z.string().optional(),
    status: z.string().min(1),
    isHQ: z.boolean(),
    gstin: z.string().optional().refine(
        (v) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
        'Invalid GSTIN format'
    ),
    stateGST: z.string().optional(),
    addressLine1: z.string().min(5, 'Address is required'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    district: z.string().optional(),
    state: z.string().min(2, 'State is required'),
    pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
    country: z.string().min(2),
    contactName: z.string().optional(),
    contactDesignation: z.string().optional(),
    contactEmail: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, 'Invalid email'),
    contactCountryCode: z.string(),
    contactPhone: z.string().optional(),
    geoEnabled: z.boolean(),
    geoLocationName: z.string().optional(),
    geoLat: z.string().optional(),
    geoLng: z.string().optional(),
    geoRadius: z.number(),
    geoShape: z.enum(['circle', 'freeform']),
}).superRefine((data, ctx) => {
    if (data.facilityType === 'Custom...' && (!data.customFacilityType || data.customFacilityType.length < 3)) {
        ctx.addIssue({ code: 'custom', message: 'Custom facility type must be at least 3 characters', path: ['customFacilityType'] });
    }
    if (data.geoEnabled && !data.geoLocationName) {
        ctx.addIssue({ code: 'custom', message: 'Set a geofencing location or disable geofencing', path: ['geoLocationName'] });
    }
});

export const step10LocationsSchema = z.array(plantBranchSchema);

export type PlantBranchErrors = Partial<Record<string, string>>;

// ============ STEP 11 — Shifts & Time ============

const shiftSchema = z.object({
    id: z.string(),
    name: z.string().min(2, 'Shift name is required'),
    fromTime: z
        .string()
        .min(1, 'Start time is required')
        .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    toTime: z
        .string()
        .min(1, 'End time is required')
        .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    noShuffle: z.boolean(),
    downtimeSlots: z.array(z.object({
        id: z.string(),
        type: z.string().min(1, 'Select downtime type'),
        duration: z.string().regex(/^\d+$/, 'Duration must be a number (minutes)'),
    })),
});

export const step11ShiftsSchema = z.object({
    dayStartTime: z.string().optional(),
    dayEndTime: z.string().optional(),
    weeklyOffs: z.array(z.string()),
    shifts: z.array(shiftSchema),
});

export type ShiftErrors = Partial<Record<string, string>>;

// ============ STEP 12 — No. Series ============

const noSeriesItemSchema = z.object({
    id: z.string(),
    code: z.string().min(2, 'Series code is required'),
    description: z.string().optional(),
    linkedScreen: z.string().min(1, 'Select a linked screen'),
    prefix: z.string().min(1, 'Prefix is required'),
    suffix: z.string().optional(),
    numberCount: z
        .string()
        .regex(/^[1-9]\d*$/, 'Number count must be a positive integer'),
    startNumber: z
        .string()
        .regex(/^\d+$/, 'Start number must be a non-negative integer'),
});

export const step12NoSeriesSchema = z.array(noSeriesItemSchema);

export type NoSeriesErrors = Partial<Record<string, string>>;

// ============ STEP 13 — IOT Reasons ============

const iotReasonSchema = z.object({
    id: z.string(),
    reasonType: z.string().min(1, 'Select a reason type'),
    reason: z.string().min(2, 'Reason is required (min 2 characters)'),
    description: z.string().optional(),
    department: z.string().optional(),
    planned: z.boolean(),
    duration: z
        .string()
        .optional()
        .refine((v) => !v || /^\d+$/.test(v), 'Duration must be a number (minutes)'),
});

export const step13IOTReasonsSchema = z.array(iotReasonSchema);

export type IOTReasonErrors = Partial<Record<string, string>>;

// ============ STEP 15 — Users ============

const userItemSchema = z.object({
    id: z.string(),
    fullName: z.string().min(2, 'Full name is required'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-z0-9._-]+$/, 'Only lowercase letters, numbers, dots, underscores, hyphens'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    role: z.string().min(1, 'Select a role'),
    email: z.string().email('Invalid email address'),
    mobile: z
        .string()
        .optional()
        .refine((v) => !v || /^\d{7,15}$/.test(v.replace(/\s/g, '')), 'Invalid mobile number'),
    department: z.string().optional(),
});

export const step15UsersSchema = z
    .array(userItemSchema)
    .min(1, 'Add at least one user');

export type UserErrors = Partial<Record<keyof z.infer<typeof userItemSchema>, string>>;

// ============ VALIDATION RUNNER ============

export type StepErrors = Record<string, string>;

/**
 * Runs Zod validation for the given step and returns a flat error map.
 * Keys follow the pattern: fieldName (for simple fields) or fieldName_index (for array items).
 */
export function validateStep(
    step: number,
    data: Record<string, unknown>
): StepErrors {
    const schemas: Record<number, z.ZodTypeAny> = {
        1: step1Schema,
        2: step2Schema,
        3: step3Schema,
        4: step4Schema,
        5: step5Schema,
        6: step6EndpointSchema,
        7: step7StrategySchema,
        // steps 9 & 10 (per-location modules/tier) are validated inline in index.tsx
    };

    const schema = schemas[step];
    if (!schema) return {};

    const result = schema.safeParse(data);
    if (result.success) return {};

    const errors: StepErrors = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join('_') || '_root';
        if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
}

/**
 * Validates array-based steps (contacts, locations, shifts, no-series, iot, users).
 * Returns errors keyed as fieldName_index (e.g. name_0, email_1).
 */
export function validateArrayStep(
    step: number,
    items: unknown[]
): StepErrors {
    const schemas: Record<number, z.ZodTypeAny> = {
        8: step10LocationsSchema,  // step 8 = Locations Master (was step 10)
        11: step9ContactsSchema,   // step 11 = Key Contacts (was step 9)
        13: step12NoSeriesSchema,  // step 13 = No. Series (was step 12)
        14: step13IOTReasonsSchema, // step 14 = IOT Reasons (was step 13)
        16: step15UsersSchema,     // step 16 = Users & Access (was step 15)
    };

    const schema = schemas[step];
    if (!schema) return {};

    const result = schema.safeParse(items);
    if (result.success) return {};

    const errors: StepErrors = {};
    for (const issue of result.error.issues) {
        const path = issue.path;
        if (path.length === 0) {
            errors['_root'] = issue.message;
        } else if (path.length === 1) {
            const key = String(path[0]);
            if (!errors[key]) errors[key] = issue.message;
        } else {
            // path[0] = array index, path[1] = field name
            const key = `${String(path[1])}_${String(path[0])}`;
            if (!errors[key]) errors[key] = issue.message;
        }
    }
    return errors;
}
