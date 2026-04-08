/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { R2Image } from '@/components/ui/r2-image';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';

import { useAddLocationModules, useRemoveLocationModule, useUpdateProfileSection } from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyProfile } from '@/features/company-admin/api/use-company-admin-queries';

import type { UserTierKey } from '@/features/super-admin/tenant-onboarding/types';
import { FormInput } from '@/features/super-admin/tenant-onboarding/atoms';
import { FY_OPTIONS, MODULE_CATALOGUE, MONTHS, USER_TIERS } from '@/features/super-admin/tenant-onboarding/constants';

// ============ TYPES ============

type EditableSectionKey = 'basicInfo' | 'registeredAddress' | 'corporateAddress' | 'identity' | 'statutory' | 'fiscal' | 'preferences';

interface CompanyProfileData {
    // Identity (read-only)
    companyCode: string;
    name: string;
    businessType: string;
    industry: string;
    cin: string;
    incorporationDate: string;
    size: string;
    employeeCount: number | string;
    // Statutory (read-only)
    pan: string;
    tan: string;
    gstin: string;
    pfRegNo: string;
    esiCode: string;
    ptReg: string;
    rocState: string;
    lwfrNo: string;
    // Modules & Billing (read-only)
    selectedModuleIds: string[];
    userTier: UserTierKey;
    billingCycle: 'monthly' | 'annual';
    // Basic Info (editable)
    displayName: string;
    legalName: string;
    shortName: string;
    logoUrl: string;
    emailDomain: string;
    website: string;
    // Registered Address (editable)
    regLine1: string;
    regLine2: string;
    regCity: string;
    regState: string;
    regPin: string;
    regCountry: string;
    // Corporate Address (editable)
    sameAsRegistered: boolean;
    corpLine1: string;
    corpLine2: string;
    corpCity: string;
    corpState: string;
    corpPin: string;
    corpCountry: string;
    // Fiscal Config (read-only)
    fyType: string;
    fyCustomStartMonth: string;
    fyCustomEndMonth: string;
    payrollFreq: string;
    cutoffDay: number | string;
    disbursementDay: number | string;
    weekStart: string;
    timezone: string;
    workingDays: string[];
    // Preferences (read-only)
    currency: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
    essEnabled: boolean;
    mobileEnabled: boolean;
    webEnabled: boolean;
    emailNotifsEnabled: boolean;
    smsNotifsEnabled: boolean;
    pushNotifsEnabled: boolean;
    // Quick Stats (read-only)
    locationsCount: number;
    contactsCount: number;
    shiftsCount: number;
    usersCount: number;
    // Locations (for module display)
    locations: Array<{ id: string; name: string; isHQ: boolean; moduleIds: string[] }>;
    // Subscription (read-only)
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionBillingType: string;
    subscriptionTrialEnd: string;
}

function mapApiToProfile(raw: any): CompanyProfileData {
    const identity = raw.identity ?? raw;
    const statutory = raw.statutory ?? raw;
    const regAddr = raw.registeredAddress ?? raw.address?.registered ?? raw;
    const corpAddr = raw.corporateAddress ?? raw.address?.corporate ?? {};
    const sub = raw.tenant?.subscriptions?.[0] ?? {};
    const fiscal = raw.fiscal ?? raw.fiscalConfig ?? {};
    const prefs = raw.preferences ?? {};
    const stats = raw.stats ?? raw._count ?? {};

    const locations = raw.locations ?? [];
    const derivedModuleIds = Array.from(
        new Set(locations.flatMap((loc: any) => (loc.moduleIds ?? []) as string[])),
    ) as string[];

    return {
        companyCode: identity.companyCode ?? raw.companyCode ?? '',
        name: identity.name ?? raw.name ?? '',
        businessType: identity.businessType ?? raw.businessType ?? '',
        industry: identity.industry ?? raw.industry ?? '',
        cin: identity.cin ?? raw.cin ?? '',
        incorporationDate: identity.incorporationDate ?? raw.incorporationDate ?? '',
        size: identity.size ?? raw.size ?? '',
        employeeCount: identity.employeeCount ?? raw.employeeCount ?? 0,
        pan: statutory.pan ?? raw.pan ?? '',
        tan: statutory.tan ?? raw.tan ?? '',
        gstin: statutory.gstin ?? raw.gstin ?? '',
        pfRegNo: statutory.pfRegNo ?? raw.pfRegNo ?? '',
        esiCode: statutory.esiCode ?? raw.esiCode ?? '',
        ptReg: statutory.ptReg ?? '',
        rocState: statutory.rocState ?? '',
        lwfrNo: statutory.lwfrNo ?? '',
        selectedModuleIds: (raw.selectedModuleIds ?? derivedModuleIds) as string[],
        userTier: (sub.tier ?? raw.userTier ?? 'starter') as UserTierKey,
        billingCycle: (sub.billingCycle ?? raw.billingCycle ?? 'monthly') as 'monthly' | 'annual',
        displayName: identity.displayName ?? raw.displayName ?? '',
        legalName: identity.legalName ?? raw.legalName ?? '',
        shortName: identity.shortName ?? raw.shortName ?? '',
        logoUrl: identity.logoUrl ?? raw.logoUrl ?? '',
        emailDomain: identity.emailDomain ?? raw.emailDomain ?? '',
        website: identity.website ?? raw.website ?? '',
        regLine1: regAddr.line1 ?? regAddr.regLine1 ?? '',
        regLine2: regAddr.line2 ?? regAddr.regLine2 ?? '',
        regCity: regAddr.city ?? regAddr.regCity ?? '',
        regState: regAddr.state ?? regAddr.regState ?? '',
        regPin: regAddr.pin ?? regAddr.regPin ?? '',
        regCountry: regAddr.country ?? regAddr.regCountry ?? 'India',
        sameAsRegistered: raw.address?.sameAsRegistered ?? raw.sameAsRegistered ?? true,
        corpLine1: corpAddr.line1 ?? corpAddr.corpLine1 ?? '',
        corpLine2: corpAddr.line2 ?? corpAddr.corpLine2 ?? '',
        corpCity: corpAddr.city ?? corpAddr.corpCity ?? '',
        corpState: corpAddr.state ?? corpAddr.corpState ?? '',
        corpPin: corpAddr.pin ?? corpAddr.corpPin ?? '',
        corpCountry: corpAddr.country ?? corpAddr.corpCountry ?? 'India',
        // Fiscal Config
        fyType: fiscal.fyType ?? raw.fyType ?? '',
        fyCustomStartMonth: fiscal.fyCustomStartMonth ?? '',
        fyCustomEndMonth: fiscal.fyCustomEndMonth ?? '',
        payrollFreq: fiscal.payrollFreq ?? raw.payrollFreq ?? '',
        cutoffDay: fiscal.cutoffDay ?? raw.cutoffDay ?? '',
        disbursementDay: fiscal.disbursementDay ?? raw.disbursementDay ?? '',
        weekStart: fiscal.weekStart ?? raw.weekStart ?? '',
        timezone: fiscal.timezone ?? raw.timezone ?? '',
        workingDays: fiscal.workingDays ?? raw.workingDays ?? [],
        // Preferences
        currency: prefs.currency ?? raw.currency ?? '',
        language: prefs.language ?? raw.language ?? '',
        dateFormat: prefs.dateFormat ?? raw.dateFormat ?? '',
        timeFormat: prefs.timeFormat ?? raw.timeFormat ?? '',
        essEnabled: prefs.essEnabled ?? raw.essEnabled ?? false,
        mobileEnabled: prefs.mobileEnabled ?? raw.mobileEnabled ?? false,
        webEnabled: prefs.webEnabled ?? raw.webEnabled ?? false,
        emailNotifsEnabled: prefs.emailNotifsEnabled ?? raw.emailNotifsEnabled ?? false,
        smsNotifsEnabled: prefs.smsNotifsEnabled ?? raw.smsNotifsEnabled ?? false,
        pushNotifsEnabled: prefs.pushNotifsEnabled ?? raw.pushNotifsEnabled ?? false,
        // Locations (for module display)
        locations: locations.map((loc: any) => ({
            id: loc.id ?? '',
            name: loc.name ?? '',
            isHQ: loc.isHQ ?? false,
            moduleIds: (loc.moduleIds ?? []) as string[],
        })),
        // Quick Stats
        locationsCount: stats.locations ?? locations.length ?? 0,
        contactsCount: stats.contacts ?? raw.contacts?.length ?? 0,
        shiftsCount: stats.shifts ?? raw.shifts?.length ?? 0,
        usersCount: stats.users ?? raw.users?.length ?? 0,
        // Subscription
        subscriptionPlan: sub.planId ?? sub.plan ?? sub.tier ?? '',
        subscriptionStatus: sub.status ?? '',
        subscriptionBillingType: sub.billingType ?? sub.billingCycle ?? '',
        subscriptionTrialEnd: sub.trialEndsAt ?? sub.trialEnd ?? sub.trialEndDate ?? '',
    };
}

// ============ ICONS ============

function LockIcon() {
    return (
        <View style={s.badgeReadOnly}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
                <Rect x="3" y="11" width="18" height="11" rx="2" stroke={colors.neutral[500]} strokeWidth="2" fill="none" />
                <Path d="M7 11V7a5 5 0 0110 0v4" stroke={colors.neutral[500]} strokeWidth="2" fill="none" strokeLinecap="round" />
            </Svg>
            <Text className="font-inter text-[10px] font-semibold text-neutral-500">Read-only</Text>
        </View>
    );
}

function PencilButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={s.editIconButton}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path
                    d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke={colors.primary[500]}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                />
            </Svg>
        </Pressable>
    );
}

function SectionIcon({ type }: { type: string }) {
    const color = colors.primary[500];
    switch (type) {
        case 'identity':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'statutory':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'modules':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'basic':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'address':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'fiscal':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </Svg>
            );
        case 'preferences':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'subscription':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M1 10h22" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'stats':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
                </Svg>
            );
        default:
            return null;
    }
}

// ============ SUB-COMPONENTS ============

function SectionHeader({
    title,
    iconType,
    readOnly,
    onEdit,
}: {
    title: string;
    iconType: string;
    readOnly?: boolean;
    onEdit?: () => void;
}) {
    return (
        <View style={s.sectionHeader}>
            <SectionIcon type={iconType} />
            <Text className="font-inter text-sm font-bold text-primary-900" style={{ flex: 1 }}>
                {title}
            </Text>
            {readOnly ? <LockIcon /> : null}
            {onEdit ? <PencilButton onPress={onEdit} /> : null}
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={s.infoRow}>
            <Text className="font-inter text-xs font-medium text-neutral-500">{label}</Text>
            <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={2}>
                {value || '—'}
            </Text>
        </View>
    );
}

function ChipRow({ items, variant = 'primary' }: { items: string[]; variant?: 'primary' | 'success' }) {
    const chipStyle = variant === 'success' ? s.chipSuccess : s.chipPrimary;
    const textClass =
        variant === 'success'
            ? 'font-inter text-xs font-semibold text-success-700'
            : 'font-inter text-xs font-semibold text-primary-700';
    return (
        <View style={s.chipRow}>
            {items.map((item) => (
                <View key={item} style={chipStyle}>
                    <Text className={textClass}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

function BooleanChip({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <View
            style={[
                s.booleanChip,
                { backgroundColor: enabled ? colors.success[50] : colors.neutral[100],
                  borderColor: enabled ? colors.success[200] : colors.neutral[200] },
            ]}
        >
            <Text
                className={`font-inter text-xs font-semibold ${enabled ? 'text-success-700' : 'text-neutral-400'}`}
            >
                {enabled ? '\u2713' : '\u2717'} {label}
            </Text>
        </View>
    );
}

function StatCard({
    label,
    count,
    onPress,
}: {
    label: string;
    count: number;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={s.statCard}>
            <Text className="font-inter text-xl font-bold text-primary-600">{count}</Text>
            <Text className="mt-0.5 font-inter text-[11px] font-medium text-neutral-500">{label}</Text>
        </Pressable>
    );
}

// ============ EDIT BOTTOM SHEET ============

const SECTION_TITLES: Record<EditableSectionKey, string> = {
    basicInfo: 'Basic Info',
    registeredAddress: 'Registered Address',
    corporateAddress: 'Corporate Address',
    identity: 'Company Identity',
    statutory: 'Statutory Info',
    fiscal: 'Fiscal Configuration',
    preferences: 'Preferences',
};

function EditBottomSheet({
    visible,
    sectionKey,
    currentData,
    onClose,
    onSaved,
}: {
    visible: boolean;
    sectionKey: EditableSectionKey;
    currentData: Record<string, any>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const insets = useSafeAreaInsets();
    const mutation = useUpdateProfileSection();

    const [formData, setFormData] = React.useState<Record<string, any>>({});
    const [saveError, setSaveError] = React.useState('');

    React.useEffect(() => {
        if (visible && currentData) {
            setFormData(() => ({ ...currentData }));
            setSaveError('');
        }
    }, [visible, currentData]);

    const validate = (): boolean => {
        const errors: string[] = [];

        if (sectionKey === 'basicInfo') {
            if (!formData.displayName || formData.displayName.length < 2) errors.push('Display name is required (min 2 characters)');
            if (!formData.legalName || formData.legalName.length < 2) errors.push('Legal name is required (min 2 characters)');
            if (formData.emailDomain && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(formData.emailDomain)) {
                errors.push('Invalid domain format (e.g. company.com)');
            }
            if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
                errors.push('Website must start with http:// or https://');
            }
        }

        if (sectionKey === 'identity') {
            if (!formData.name || formData.name.length < 2) errors.push('Company name is required');
            if (formData.companyCode && !/^[A-Z\d_-]+$/.test(formData.companyCode)) {
                errors.push('Company code: uppercase letters, numbers, hyphens only');
            }
            if (formData.cin && !/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(formData.cin)) {
                errors.push('Invalid CIN format (e.g. U12345MH2023PTC123456)');
            }
        }

        if (sectionKey === 'statutory') {
            if (formData.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(formData.pan)) {
                errors.push('Invalid PAN format (e.g. ABCDE1234F)');
            }
            if (formData.tan && !/^[A-Z]{4}\d{5}[A-Z]$/.test(formData.tan)) {
                errors.push('Invalid TAN format (e.g. ABCD12345E)');
            }
            if (formData.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[\dA-Z]$/.test(formData.gstin)) {
                errors.push('Invalid GSTIN format (15 characters)');
            }
            if (formData.esiCode && !/^\d{2}-\d{2}-\d{6}-\d{3}-\d{4}$/.test(formData.esiCode) && !/^[0-9-]+$/.test(formData.esiCode)) {
                errors.push('Invalid ESI code format');
            }
        }

        if (sectionKey === 'registeredAddress' || sectionKey === 'corporateAddress') {
            const isReg = sectionKey === 'registeredAddress';
            const line1 = isReg ? formData.regLine1 : formData.corpLine1;
            const city = isReg ? formData.regCity : formData.corpCity;
            const pin = isReg ? formData.regPin : formData.corpPin;
            const same = formData.sameAsRegistered;

            if (isReg || (!isReg && !same)) {
                if (!line1 || line1.length < 5) errors.push('Address line 1 must be at least 5 characters');
                if (!city || city.length < 2) errors.push('City is required');
                if (pin && !/^\d{6}$/.test(String(pin))) errors.push('PIN code must be exactly 6 digits');
            }
        }

        if (sectionKey === 'fiscal') {
            const cutoff = Number(formData.cutoffDay);
            const disburse = Number(formData.disbursementDay);
            if (formData.cutoffDay && (Number.isNaN(cutoff) || cutoff < 1 || cutoff > 31)) errors.push('Cutoff day must be between 1 and 31');
            if (formData.disbursementDay && (Number.isNaN(disburse) || disburse < 1 || disburse > 31)) errors.push('Disbursement day must be between 1 and 31');
        }

        if (errors.length > 0) {
            setSaveError(errors[0]);
            return false;
        }

        return true;
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        if (saveError) setSaveError('');
    };

    const handleSave = () => {
        if (!validate()) return;
        setSaveError('');
        
        // Final sanitization of numeric fields
        const sanitized = { ...formData };
        ['employeeCount', 'cutoffDay', 'disbursementDay', 'regPin', 'corpPin'].forEach(key => {
            if (sanitized[key] !== undefined && sanitized[key] !== null && sanitized[key] !== '') {
                const num = Number(sanitized[key]);
                if (!Number.isNaN(num)) sanitized[key] = num;
            }
        });

        // Remap keys for address sections if they are prefixed
        let finalData = sanitized;
        if (sectionKey === 'registeredAddress') {
            finalData = {
                line1: sanitized.regLine1 || sanitized.line1,
                line2: sanitized.regLine2 || sanitized.line2,
                city: sanitized.regCity || sanitized.city,
                state: sanitized.regState || sanitized.state,
                pin: sanitized.regPin || sanitized.pin,
                country: sanitized.regCountry || sanitized.country,
            };
        } else if (sectionKey === 'corporateAddress') {
            finalData = {
                sameAsRegistered: sanitized.sameAsRegistered,
                line1: sanitized.corpLine1 || sanitized.line1,
                line2: sanitized.corpLine2 || sanitized.line2,
                city: sanitized.corpCity || sanitized.city,
                state: sanitized.corpState || sanitized.state,
                pin: sanitized.corpPin || sanitized.pin,
                country: sanitized.corpCountry || sanitized.country,
            };
        }

        mutation.mutate(
            { sectionKey, data: finalData },
            {
                onSuccess: async () => {
                    showSuccess('Success', 'Profile updated effectively.');
                    if (onSaved) await onSaved();
                    onClose();
                },
                onError: (err: any) => {
                    const msg = err?.response?.data?.message || err?.message || 'Update failed.';
                    setSaveError(msg);
                    showErrorMessage(msg);
                },
            },
        );
    };

    const title = SECTION_TITLES[sectionKey] ?? 'Edit Section';

    const renderFields = () => {
        switch (sectionKey) {
            case 'basicInfo':
                return (
                    <>
                        <FormInput label="Display Name" placeholder="e.g. Acme Corp" value={formData.displayName ?? ''} onChangeText={(v) => handleChange('displayName', v)} required />
                        <FormInput label="Legal Name" placeholder="e.g. Acme Corp Pvt. Ltd." value={formData.legalName ?? ''} onChangeText={(v) => handleChange('legalName', v)} required />
                        <FormInput label="Short Name" placeholder="e.g. ACM" value={formData.shortName ?? ''} onChangeText={(v) => handleChange('shortName', v)} />
                        <FormInput label="Logo URL" placeholder="https://..." value={formData.logoUrl ?? ''} onChangeText={(v) => handleChange('logoUrl', v)} keyboardType="url" autoCapitalize="none" />
                        <FormInput label="Corporate Email Domain" placeholder="e.g. acme.com" value={formData.emailDomain ?? ''} onChangeText={(v) => handleChange('emailDomain', v)} autoCapitalize="none" />
                        <FormInput label="Website" placeholder="https://acme.com" value={formData.website ?? ''} onChangeText={(v) => handleChange('website', v)} keyboardType="url" autoCapitalize="none" />
                    </>
                );
            case 'identity':
                return (
                    <>
                        <FormInput label="Company Name" placeholder="e.g. Acme Corp" value={formData.name ?? ''} onChangeText={(v) => handleChange('name', v)} required />
                        <FormInput label="Company Code" placeholder="e.g. ACME01" value={formData.companyCode ?? ''} onChangeText={(v) => handleChange('companyCode', v)} required />
                        <FormInput label="Business Type" placeholder="e.g. Private Limited" value={formData.businessType ?? ''} onChangeText={(v) => handleChange('businessType', v)} />
                        <FormInput label="Industry" placeholder="e.g. Manufacturing" value={formData.industry ?? ''} onChangeText={(v) => handleChange('industry', v)} />
                        <FormInput label="Company Size" placeholder="e.g. 50-100" value={formData.size ?? ''} onChangeText={(v) => handleChange('size', v)} />
                        <FormInput label="Employee Count" placeholder="e.g. 75" value={String(formData.employeeCount ?? '')} onChangeText={(v) => handleChange('employeeCount', v)} keyboardType="number-pad" />
                        <FormInput label="CIN" placeholder="U12345MH2023PTC123456" value={formData.cin ?? ''} onChangeText={(v) => handleChange('cin', v)} />
                        <FormInput label="Incorporation Date" placeholder="YYYY-MM-DD" value={formData.incorporationDate ?? ''} onChangeText={(v) => handleChange('incorporationDate', v)} />
                    </>
                );
            case 'statutory':
                return (
                    <>
                        <FormInput label="PAN" placeholder="ABCDE1234F" value={formData.pan ?? ''} onChangeText={(v) => handleChange('pan', v)} />
                        <FormInput label="TAN" placeholder="ABCD12345E" value={formData.tan ?? ''} onChangeText={(v) => handleChange('tan', v)} />
                        <FormInput label="GSTIN" placeholder="27ABCDE1234F1Z5" value={formData.gstin ?? ''} onChangeText={(v) => handleChange('gstin', v)} />
                        <FormInput label="PF Reg No" placeholder="MH/12345/678" value={formData.pfRegNo ?? ''} onChangeText={(v) => handleChange('pfRegNo', v)} />
                        <FormInput label="ESI Code" placeholder="31-00-123456-000-1234" value={formData.esiCode ?? ''} onChangeText={(v) => handleChange('esiCode', v)} />
                        <FormInput label="PT Registration" placeholder="123456789" value={formData.ptReg ?? ''} onChangeText={(v) => handleChange('ptReg', v)} />
                        <FormInput label="LWF Reg No" placeholder="LW123456" value={formData.lwfrNo ?? ''} onChangeText={(v) => handleChange('lwfrNo', v)} />
                        <FormInput label="ROC State" placeholder="e.g. Maharashtra" value={formData.rocState ?? ''} onChangeText={(v) => handleChange('rocState', v)} />
                    </>
                );
            case 'registeredAddress':
                return (
                    <>
                        <FormInput label="Address Line 1" placeholder="Street address" value={formData.regLine1 ?? ''} onChangeText={(v) => handleChange('regLine1', v)} required />
                        <FormInput label="Address Line 2" placeholder="Area / Landmark" value={formData.regLine2 ?? ''} onChangeText={(v) => handleChange('regLine2', v)} />
                        <FormInput label="City" placeholder="e.g. Mumbai" value={formData.regCity ?? ''} onChangeText={(v) => handleChange('regCity', v)} required />
                        <FormInput label="State" placeholder="e.g. Maharashtra" value={formData.regState ?? ''} onChangeText={(v) => handleChange('regState', v)} />
                        <FormInput label="PIN Code" placeholder="e.g. 400001" value={formData.regPin ?? ''} onChangeText={(v) => handleChange('regPin', v)} keyboardType="number-pad" required />
                        <FormInput label="Country" placeholder="e.g. India" value={formData.regCountry ?? ''} onChangeText={(v) => handleChange('regCountry', v)} />
                    </>
                );
            case 'corporateAddress':
                return (
                    <>
                        <View style={bs.toggleRow}>
                            <Text className="font-inter text-sm font-medium text-primary-900">Same as Registered Address</Text>
                            <Switch
                                value={formData.sameAsRegistered ?? true}
                                onValueChange={(v) => handleChange('sameAsRegistered', v)}
                                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                                thumbColor={formData.sameAsRegistered ? colors.white : colors.neutral[100]}
                            />
                        </View>
                        {!formData.sameAsRegistered && (
                            <>
                                <FormInput label="Address Line 1" placeholder="Street address" value={formData.corpLine1 ?? ''} onChangeText={(v) => handleChange('corpLine1', v)} required />
                                <FormInput label="Address Line 2" placeholder="Area / Landmark" value={formData.corpLine2 ?? ''} onChangeText={(v) => handleChange('corpLine2', v)} />
                                <FormInput label="City" placeholder="e.g. Mumbai" value={formData.corpCity ?? ''} onChangeText={(v) => handleChange('corpCity', v)} required />
                                <FormInput label="State" placeholder="e.g. Maharashtra" value={formData.corpState ?? ''} onChangeText={(v) => handleChange('corpState', v)} />
                                <FormInput label="PIN Code" placeholder="e.g. 400001" value={formData.corpPin ?? ''} onChangeText={(v) => handleChange('corpPin', v)} keyboardType="number-pad" required />
                                <FormInput label="Country" placeholder="e.g. India" value={formData.corpCountry ?? ''} onChangeText={(v) => handleChange('corpCountry', v)} />
                            </>
                        )}
                    </>
                );
            case 'fiscal':
                return (
                    <>
                        <FormInput label="Payroll Frequency" placeholder="e.g. Monthly" value={formData.payrollFreq ?? ''} onChangeText={(v) => handleChange('payrollFreq', v)} />
                        <FormInput label="Cutoff Day" placeholder="e.g. 25" value={String(formData.cutoffDay ?? '')} onChangeText={(v) => handleChange('cutoffDay', v)} keyboardType="number-pad" />
                        <FormInput label="Disbursement Day" placeholder="e.g. 30" value={String(formData.disbursementDay ?? '')} onChangeText={(v) => handleChange('disbursementDay', v)} keyboardType="number-pad" />
                        <FormInput label="Week Start" placeholder="e.g. Monday" value={formData.weekStart ?? ''} onChangeText={(v) => handleChange('weekStart', v)} />
                        <FormInput label="Timezone" placeholder="e.g. Asia/Kolkata" value={formData.timezone ?? ''} onChangeText={(v) => handleChange('timezone', v)} />
                    </>
                );
            case 'preferences':
                return (
                    <>
                        <FormInput label="Currency" placeholder="e.g. INR" value={formData.currency ?? ''} onChangeText={(v) => handleChange('currency', v)} />
                        <FormInput label="Language" placeholder="e.g. English" value={formData.language ?? ''} onChangeText={(v) => handleChange('language', v)} />
                        <FormInput label="Date Format" placeholder="e.g. DD-MM-YYYY" value={formData.dateFormat ?? ''} onChangeText={(v) => handleChange('dateFormat', v)} />
                        <FormInput label="Time Format" placeholder="e.g. HH:mm" value={formData.timeFormat ?? ''} onChangeText={(v) => handleChange('timeFormat', v)} />
                        <View style={bs.toggleRow}>
                            <Text className="font-inter text-sm font-medium text-primary-900">ESS Portal Enabled</Text>
                            <Switch value={formData.essEnabled ?? false} onValueChange={(v) => handleChange('essEnabled', v)} />
                        </View>
                        <View style={bs.toggleRow}>
                            <Text className="font-inter text-sm font-medium text-primary-900">Mobile App Enabled</Text>
                            <Switch value={formData.mobileEnabled ?? false} onValueChange={(v) => handleChange('mobileEnabled', v)} />
                        </View>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={bs.backdrop}>
                    <Pressable style={bs.backdropPress} onPress={onClose} />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                        style={{ width: '100%' }}
                    >
                        <View style={[bs.sheet, { paddingBottom: insets.bottom + 16 }]}>
                            {/* Handle bar */}
                            <View style={bs.handleBar} />

                            {/* Header */}
                            <View style={bs.header}>
                                <Text className="font-inter text-base font-bold text-primary-950">{title}</Text>
                                <Pressable onPress={onClose} style={bs.closeButton}>
                                    <Svg width={20} height={20} viewBox="0 0 24 24">
                                        <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[500]} strokeWidth="2" strokeLinecap="round" />
                                    </Svg>
                                </Pressable>
                            </View>

                            {/* Scrollable form */}
                            <ScrollView
                                style={bs.scrollView}
                                contentContainerStyle={bs.scrollContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {renderFields()}
                            </ScrollView>

                            {/* Error message */}
                            {saveError ? (
                                <View style={bs.errorContainer}>
                                    <Text className="font-inter text-xs font-medium text-danger-600 text-center">{saveError}</Text>
                                </View>
                            ) : null}

                            {/* Actions */}
                            <View style={bs.actions}>
                                <Pressable onPress={onClose} style={bs.cancelButton}>
                                    <Text className="font-inter text-sm font-semibold text-neutral-600">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleSave}
                                    style={[bs.saveButton, mutation.isPending && bs.saveButtonDisabled]}
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <Text className="font-inter text-sm font-bold text-white">Save Changes</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    const { data: profileResponse, isLoading, error, refetch, isFetching } = useCompanyProfile();
    const rawData = profileResponse?.data ?? profileResponse;
    const profile: CompanyProfileData | null = rawData ? mapApiToProfile(rawData) : null;
    const [logoFailed, setLogoFailed] = React.useState(false);

    React.useEffect(() => {
        setLogoFailed(() => false);
    }, [profile?.logoUrl]);

    // Edit sheet state
    const [editSection, setEditSection] = React.useState<EditableSectionKey | null>(null);
    const [editData, setEditData] = React.useState<Record<string, any> | null>(null);

    const openEdit = (key: EditableSectionKey) => {
        if (!profile) return;
        let data: Record<string, any> = {};
        switch (key) {
            case 'basicInfo':
                data = {
                    displayName: profile.displayName,
                    legalName: profile.legalName,
                    shortName: profile.shortName,
                    logoUrl: profile.logoUrl,
                    emailDomain: profile.emailDomain,
                    website: profile.website,
                };
                break;
            case 'registeredAddress':
                data = {
                    regLine1: profile.regLine1,
                    regLine2: profile.regLine2,
                    regCity: profile.regCity,
                    regState: profile.regState,
                    regPin: profile.regPin,
                    regCountry: profile.regCountry,
                };
                break;
            case 'corporateAddress':
                data = {
                    sameAsRegistered: profile.sameAsRegistered,
                    corpLine1: profile.corpLine1,
                    corpLine2: profile.corpLine2,
                    corpCity: profile.corpCity,
                    corpState: profile.corpState,
                    corpPin: profile.corpPin,
                    corpCountry: profile.corpCountry,
                };
                break;
            case 'identity':
                data = {
                    name: profile.name,
                    companyCode: profile.companyCode,
                    businessType: profile.businessType,
                    industry: profile.industry,
                    size: profile.size,
                    employeeCount: profile.employeeCount,
                    cin: profile.cin,
                    incorporationDate: profile.incorporationDate,
                };
                break;
            case 'statutory':
                data = {
                    pan: profile.pan,
                    tan: profile.tan,
                    gstin: profile.gstin,
                    pfRegNo: profile.pfRegNo,
                    esiCode: profile.esiCode,
                    ptReg: profile.ptReg,
                    lwfrNo: profile.lwfrNo,
                    rocState: profile.rocState,
                };
                break;
            case 'fiscal':
                data = {
                    payrollFreq: profile.payrollFreq,
                    cutoffDay: profile.cutoffDay,
                    disbursementDay: profile.disbursementDay,
                    weekStart: profile.weekStart,
                    timezone: profile.timezone,
                    workingDays: profile.workingDays,
                };
                break;
            case 'preferences':
                data = {
                    currency: profile.currency,
                    language: profile.language,
                    dateFormat: profile.dateFormat,
                    timeFormat: profile.timeFormat,
                    essEnabled: profile.essEnabled,
                    mobileEnabled: profile.mobileEnabled,
                };
                break;
        }
        setEditSection(key);
        setEditData(data);
    };

    // ---- Module management ----
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
    const addModulesMutation = useAddLocationModules();
    const removeModuleMutation = useRemoveLocationModule();

    const getLocationBillingType = (loc: CompanyProfileData['locations'][number]) => {
        // Check subscription-level billing type, default to monthly
        const bt = profile?.subscriptionBillingType ?? 'monthly';
        if (bt === 'one-time' || bt === 'onetime' || bt === 'one_time') return 'one-time' as const;
        return 'recurring' as const;
    };

    const getAutoDeps = (moduleId: string, currentModuleIds: string[]): string[] => {
        const mod = MODULE_CATALOGUE.find((m) => m.id === moduleId);
        if (!mod) return [];
        const missing: string[] = [];
        for (const depId of mod.dependencies) {
            if (!currentModuleIds.includes(depId)) {
                missing.push(depId);
                // Recurse for transitive deps
                missing.push(...getAutoDeps(depId, [...currentModuleIds, ...missing]));
            }
        }
        return [...new Set(missing)];
    };

    const handleAddModule = (locationId: string, moduleId: string, locationModuleIds: string[]) => {
        const mod = MODULE_CATALOGUE.find((m) => m.id === moduleId);
        if (!mod) return;
        const billingType = getLocationBillingType(profile!.locations.find((l) => l.id === locationId)!);
        if (billingType === 'one-time') {
            router.push({
                pathname: '/company/support' as any,
                params: { subject: `Request: Add module "${mod.name}"`, message: `Please add module "${mod.name}" to location ${locationId}.` },
            });
            return;
        }
        const autoDeps = getAutoDeps(moduleId, locationModuleIds);
        const allIds = [moduleId, ...autoDeps];
        const depNames = autoDeps.map((id) => MODULE_CATALOGUE.find((m) => m.id === id)?.name ?? id);
        const totalPrice = allIds.reduce((sum, id) => sum + (MODULE_CATALOGUE.find((m) => m.id === id)?.price ?? 0), 0);
        const depMsg = depNames.length > 0 ? `\n\nAuto-includes dependencies: ${depNames.join(', ')}` : '';
        showConfirm({
            title: `Add ${mod.name}?`,
            message: `This will add ${mod.name}.${depMsg}`,
            variant: 'primary',
            confirmText: 'Add Module',
            onConfirm: () => {
                addModulesMutation.mutate(
                    { locationId, moduleIds: allIds },
                    {
                        onSuccess: () => {
                            showSuccess(`${mod.name} added successfully`);
                            refetch();
                        },
                        onError: (err: any) => {
                            const status = err?.response?.status ?? err?.status;
                            if (status === 409) {
                                showConfirm({
                                    title: 'Cannot Add Module',
                                    message: err?.response?.data?.message ?? err?.message ?? 'This module conflicts with existing configuration.',
                                    variant: 'warning',
                                    confirmText: 'OK',
                                    onConfirm: () => {},
                                });
                            } else {
                                showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to add module');
                            }
                        },
                    },
                );
            },
        });
    };

    const handleRemoveModule = (locationId: string, moduleId: string) => {
        const mod = MODULE_CATALOGUE.find((m) => m.id === moduleId);
        if (!mod) return;
        const billingType = getLocationBillingType(profile!.locations.find((l) => l.id === locationId)!);
        if (billingType === 'one-time') {
            router.push({
                pathname: '/company/support' as any,
                params: { subject: `Request: Remove module "${mod.name}"`, message: `Please remove module "${mod.name}" from location ${locationId}.` },
            });
            return;
        }
        showConfirm({
            title: `Remove ${mod.name}?`,
            message: `This will remove ${mod.name} from this location. Modules that depend on it may also be affected.`,
            variant: 'danger',
            confirmText: 'Remove',
            onConfirm: () => {
                removeModuleMutation.mutate(
                    { locationId, moduleId },
                    {
                        onSuccess: () => {
                            showSuccess(`${mod.name} removed`);
                            refetch();
                        },
                        onError: (err: any) => {
                            const status = err?.response?.status ?? err?.status;
                            if (status === 409) {
                                showConfirm({
                                    title: 'Cannot Remove Module',
                                    message: err?.response?.data?.message ?? err?.message ?? 'Other modules depend on this one. Remove them first.',
                                    variant: 'warning',
                                    confirmText: 'OK',
                                    onConfirm: () => {},
                                });
                            } else {
                                showErrorMessage(err?.response?.data?.message ?? err?.message ?? 'Failed to remove module');
                            }
                        },
                    },
                );
            },
        });
    };

    // --- Loading state ---
    if (isLoading || !profile) {
        return (
            <View style={s.container}>
                <Skeleton
                    isLoading={true}
                    layout={[
                        { key: 'header', width: '100%', height: 160 },
                        { key: 's1', width: '92%', height: 140, marginTop: 16, borderRadius: 12, alignSelf: 'center' },
                        { key: 's2', width: '92%', height: 140, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                        { key: 's3', width: '92%', height: 100, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                    ]}
                >
                    <View />
                </Skeleton>
            </View>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
                <Text className="font-inter text-base font-semibold text-danger-600">Failed to load profile</Text>
                <Text className="mt-1 text-center font-inter text-sm text-neutral-500">
                    {(error as any)?.message ?? 'An error occurred.'}
                </Text>
                <Pressable onPress={() => refetch()} style={s.retryButton}>
                    <Text className="font-inter text-sm font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

    // Resolve module names
    const moduleNames = profile.selectedModuleIds
        .map((id) => MODULE_CATALOGUE.find((m) => m.id === id)?.name)
        .filter(Boolean) as string[];

    const tier = USER_TIERS.find((t) => t.key === profile.userTier);

    const hasLogo = !!profile.logoUrl && !logoFailed;

    return (
        <View style={s.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                bounces={true}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={() => refetch()}
                        colors={[colors.primary[500]]}
                        tintColor={colors.primary[500]}
                    />
                }
            >
                {/* ---- Header ---- */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <LinearGradient
                        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[s.headerGradient, { paddingTop: insets.top + 12 }]}
                    >
                        <View style={s.headerDecor1} />
                        <View style={s.headerDecor2} />

                        <View style={s.headerTop}>
                            <HamburgerButton onPress={toggle} />
                            <View style={{ alignItems: 'center' }}>
                                <Text className="font-inter text-base font-semibold text-white">
                                    Company Profile
                                </Text>
                                {isFetching && (
                                    <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                                )}
                            </View>
                            <View style={{ width: 36 }} />
                        </View>

                        {/* Company avatar + name */}
                        <View style={s.companyHeaderInfo}>
                            <R2Image
                                fileKey={profile.logoUrl}
                                style={{ width: 72, height: 72, borderRadius: 16 }}
                                contentFit="contain"
                                fallback={
                                    <LinearGradient
                                        colors={[colors.accent[300], colors.primary[400]]}
                                        style={s.companyAvatar}
                                    >
                                        <Text className="font-inter text-xl font-bold text-white">
                                            {profile.displayName.substring(0, 2).toUpperCase()}
                                        </Text>
                                    </LinearGradient>
                                }
                            />

                            <Text className="mt-3 font-inter text-xl font-bold text-white">
                                {profile.displayName}
                            </Text>
                            <Text className="mt-0.5 font-inter text-xs text-primary-200">
                                {profile.legalName}
                            </Text>

                            {(profile.industry || profile.businessType) ? (
                                <View style={s.headerBadgeRow}>
                                    {profile.industry ? (
                                        <View style={s.industryTag}>
                                            <Text className="font-inter text-xs font-semibold text-white/80">
                                                {profile.industry}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {profile.businessType ? (
                                        <View style={s.industryTag}>
                                            <Text className="font-inter text-xs font-semibold text-white/80">
                                                {profile.businessType}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                    </LinearGradient>
                </Animated.View>

                <View style={s.body}>
                    {/* ---- Company Identity ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={s.section}>
                        <SectionHeader title="Company Identity" iconType="identity" onEdit={() => openEdit('identity')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="Company Name" value={profile.name} />
                            <InfoRow label="Company Code" value={profile.companyCode} />
                            <InfoRow label="Business Type" value={profile.businessType} />
                            <InfoRow label="Industry" value={profile.industry} />
                            <InfoRow label="Company Size" value={profile.size} />
                            <InfoRow label="Employee Count" value={String(profile.employeeCount)} />
                            <InfoRow label="CIN" value={profile.cin} />
                            <InfoRow label="Date of Incorporation" value={profile.incorporationDate} />
                        </View>
                    </Animated.View>

                    {/* ---- Statutory Info ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={s.section}>
                        <SectionHeader title="Statutory Info" iconType="statutory" onEdit={() => openEdit('statutory')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="PAN" value={profile.pan} />
                            <InfoRow label="TAN" value={profile.tan} />
                            <InfoRow label="GSTIN" value={profile.gstin} />
                            <InfoRow label="PF Reg No" value={profile.pfRegNo} />
                            <InfoRow label="ESI Code" value={profile.esiCode} />
                            <InfoRow label="PT Registration" value={profile.ptReg} />
                            <InfoRow label="LWF Reg No" value={profile.lwfrNo} />
                            <InfoRow label="ROC State" value={profile.rocState} />
                        </View>
                    </Animated.View>

                    {/* ---- Modules & Billing (read-only) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={s.section}>
                        <SectionHeader title="Modules & Billing" iconType="modules" readOnly />
                        <View style={s.sectionCard}>
                            <View style={s.infoRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">Selected Modules</Text>
                                {moduleNames.length > 0 ? (
                                    <ChipRow items={moduleNames} variant="primary" />
                                ) : (
                                    <Text className="font-inter text-sm text-neutral-400">None assigned</Text>
                                )}
                            </View>
                            <InfoRow label="User Tier" value={tier?.label ?? profile.userTier} />
                            <InfoRow label="Billing Cycle" value={profile.billingCycle === 'annual' ? 'Annual' : 'Monthly'} />
                        </View>
                    </Animated.View>

                    {/* ---- Basic Info (editable) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(400)} style={s.section}>
                        <SectionHeader title="Basic Info" iconType="basic" onEdit={() => openEdit('basicInfo')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="Display Name" value={profile.displayName} />
                            <InfoRow label="Legal Name" value={profile.legalName} />
                            <InfoRow label="Short Name" value={profile.shortName} />
                            <InfoRow label="Corporate Email Domain" value={profile.emailDomain} />
                            <InfoRow label="Website" value={profile.website} />
                        </View>
                    </Animated.View>

                    {/* ---- Registered Address (editable) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(500)} style={s.section}>
                        <SectionHeader title="Registered Address" iconType="address" onEdit={() => openEdit('registeredAddress')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="Line 1" value={profile.regLine1} />
                            {profile.regLine2 ? <InfoRow label="Line 2" value={profile.regLine2} /> : null}
                            <InfoRow label="City" value={profile.regCity} />
                            <InfoRow label="State" value={profile.regState} />
                            <InfoRow label="PIN Code" value={profile.regPin} />
                            <InfoRow label="Country" value={profile.regCountry} />
                        </View>
                    </Animated.View>

                    {/* ---- Corporate Address (editable) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(600)} style={s.section}>
                        <SectionHeader title="Corporate Address" iconType="address" onEdit={() => openEdit('corporateAddress')} />
                        <View style={s.sectionCard}>
                            {profile.sameAsRegistered ? (
                                <View style={s.sameAddressBadge}>
                                    <Text className="font-inter text-xs font-semibold text-info-700">
                                        Same as registered address
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <InfoRow label="Line 1" value={profile.corpLine1} />
                                    {profile.corpLine2 ? <InfoRow label="Line 2" value={profile.corpLine2} /> : null}
                                    <InfoRow label="City" value={profile.corpCity} />
                                    <InfoRow label="State" value={profile.corpState} />
                                    <InfoRow label="PIN Code" value={profile.corpPin} />
                                    <InfoRow label="Country" value={profile.corpCountry} />
                                </>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Fiscal Config ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(700)} style={s.section}>
                        <SectionHeader title="Fiscal Configuration" iconType="fiscal" onEdit={() => openEdit('fiscal')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="Financial Year" value={(() => {
                                const fyOpt = FY_OPTIONS.find((o) => o.key === profile.fyType);
                                if (profile.fyType === 'custom' && profile.fyCustomStartMonth && profile.fyCustomEndMonth) {
                                    const startMonth = MONTHS.find((m) => m.key === profile.fyCustomStartMonth || m.label === profile.fyCustomStartMonth);
                                    const endMonth = MONTHS.find((m) => m.key === profile.fyCustomEndMonth || m.label === profile.fyCustomEndMonth);
                                    return `${startMonth?.label ?? profile.fyCustomStartMonth} – ${endMonth?.label ?? profile.fyCustomEndMonth}`;
                                }
                                return fyOpt?.label ?? profile.fyType;
                            })()} />
                            <InfoRow label="Payroll Frequency" value={profile.payrollFreq} />
                            <InfoRow label="Cutoff Day" value={String(profile.cutoffDay)} />
                            <InfoRow label="Disbursement Day" value={String(profile.disbursementDay)} />
                            <InfoRow label="Week Start" value={profile.weekStart} />
                            <InfoRow label="Timezone" value={profile.timezone} />
                            <InfoRow
                                label="Working Days"
                                value={
                                    Array.isArray(profile.workingDays) && profile.workingDays.length > 0
                                        ? profile.workingDays.join(', ')
                                        : ''
                                }
                            />
                        </View>
                    </Animated.View>

                    {/* ---- Preferences ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(800)} style={s.section}>
                        <SectionHeader title="Preferences" iconType="preferences" onEdit={() => openEdit('preferences')} />
                        <View style={s.sectionCard}>
                            <InfoRow label="Currency" value={profile.currency} />
                            <InfoRow label="Language" value={profile.language} />
                            <InfoRow label="Date Format" value={profile.dateFormat} />
                            <InfoRow label="Time Format" value={profile.timeFormat} />
                            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                                <Text className="mb-2 font-inter text-xs font-medium text-neutral-500">Feature Flags</Text>
                                <View style={s.chipRow}>
                                    <BooleanChip label="ESS" enabled={profile.essEnabled} />
                                    <BooleanChip label="Mobile" enabled={profile.mobileEnabled} />
                                    <BooleanChip label="Web" enabled={profile.webEnabled} />
                                    <BooleanChip label="Email Notifs" enabled={profile.emailNotifsEnabled} />
                                    <BooleanChip label="SMS Notifs" enabled={profile.smsNotifsEnabled} />
                                    <BooleanChip label="Push Notifs" enabled={profile.pushNotifsEnabled} />
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Module Management (per location) ---- */}
                    {profile.locations.length === 0 ? (
                        <View style={s.emptyContainer}>
                            <Text style={s.emptyText}>No locations found. Modules cannot be managed without locations.</Text>
                        </View>
                    ) : (
                        <Animated.View entering={FadeInUp.duration(400).delay(850)} style={s.section}>
                            <SectionHeader title="Module Management" iconType="modules" readOnly />
                            {profile.locations.map((loc) => {
                                const billingType = getLocationBillingType(loc);
                                const isOneTime = billingType === 'one-time';
                                return (
                                    <View key={loc.id} style={[s.sectionCard, { marginBottom: 12 }]}>
                                        {/* Location header */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                            <View style={{ backgroundColor: colors.primary[100], paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                                                <Text className="font-inter text-[11px] font-bold text-primary-700 uppercase">{loc.name}</Text>
                                            </View>
                                            {loc.isHQ && (
                                                <View style={{ backgroundColor: colors.warning[100], paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text className="font-inter text-[9px] font-bold text-warning-700">HQ</Text>
                                                </View>
                                            )}
                                        </View>
                                        {/* Module grid */}
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {MODULE_CATALOGUE.map((mod) => {
                                                const isActive = loc.moduleIds.includes(mod.id);
                                                const isMasters = mod.id === 'masters';
                                                const isMutating = addModulesMutation.isPending || removeModuleMutation.isPending;

                                                const cardStyle = isMasters
                                                    ? { backgroundColor: colors.primary[50], borderColor: colors.primary[200], borderWidth: 1.5 as number }
                                                    : isActive
                                                        ? { backgroundColor: colors.success[50], borderColor: colors.success[300], borderWidth: 1.5 as number }
                                                        : { backgroundColor: colors.neutral[50], borderColor: colors.neutral[200], borderWidth: 1 as number, borderStyle: 'dashed' as const };

                                                return (
                                                    <View
                                                        key={mod.id}
                                                        style={[
                                                            {
                                                                paddingHorizontal: 12,
                                                                paddingVertical: 10,
                                                                borderRadius: 12,
                                                                width: '48%',
                                                            },
                                                            cardStyle,
                                                        ]}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <Text className="font-inter text-base">{mod.icon}</Text>
                                                            <Text className="font-inter text-xs font-semibold text-neutral-800" numberOfLines={1} style={{ flex: 1 }}>
                                                                {mod.name}
                                                            </Text>
                                                        </View>
                                                        {/* Pricing hidden — uncomment when pricing is finalized
                                                        <Text className="font-inter text-[10px] text-neutral-500 mb-1">
                                                            Rs {mod.price}/mo
                                                        </Text>
                                                        */}
                                                        {/* Action */}
                                                        {isMasters ? (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                                <Svg width={10} height={10} viewBox="0 0 24 24">
                                                                    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={colors.neutral[400]} strokeWidth="2" fill="none" />
                                                                    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
                                                                </Svg>
                                                                <Text className="font-inter text-[10px] text-neutral-400">Locked</Text>
                                                            </View>
                                                        ) : isActive ? (
                                                            <Pressable
                                                                disabled={isMutating}
                                                                onPress={() => handleRemoveModule(loc.id, mod.id)}
                                                                style={{
                                                                    alignSelf: 'flex-start',
                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: 4,
                                                                    borderRadius: 10,
                                                                    backgroundColor: isOneTime ? colors.accent[100] : colors.danger[100],
                                                                    marginTop: 2,
                                                                    opacity: isMutating ? 0.5 : 1,
                                                                }}
                                                            >
                                                                <Text className={`font-inter text-[10px] font-semibold ${isOneTime ? 'text-accent-700' : 'text-danger-700'}`}>
                                                                    {isOneTime ? 'Request Remove' : 'Remove'}
                                                                </Text>
                                                            </Pressable>
                                                        ) : (
                                                            <Pressable
                                                                disabled={isMutating}
                                                                onPress={() => handleAddModule(loc.id, mod.id, loc.moduleIds)}
                                                                style={{
                                                                    alignSelf: 'flex-start',
                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: 4,
                                                                    borderRadius: 10,
                                                                    backgroundColor: isOneTime ? colors.accent[100] : colors.primary[100],
                                                                    marginTop: 2,
                                                                    opacity: isMutating ? 0.5 : 1,
                                                                }}
                                                            >
                                                                <Text className={`font-inter text-[10px] font-semibold ${isOneTime ? 'text-accent-700' : 'text-primary-700'}`}>
                                                                    {isOneTime ? 'Request Add' : 'Add'}
                                                                </Text>
                                                            </Pressable>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}
                        </Animated.View>
                    )}

                    {/* ---- Subscription Info (read-only) ---- */}
                    {profile.subscriptionPlan || profile.subscriptionStatus ? (
                        <Animated.View entering={FadeInUp.duration(400).delay(900)} style={s.section}>
                            <SectionHeader title="Subscription" iconType="subscription" readOnly />
                            <View style={s.sectionCard}>
                                <InfoRow label="Plan" value={profile.subscriptionPlan} />
                                <InfoRow label="Status" value={profile.subscriptionStatus} />
                                <InfoRow label="Billing Type" value={profile.subscriptionBillingType} />
                                {profile.subscriptionTrialEnd ? (
                                    <InfoRow label="Trial End Date" value={profile.subscriptionTrialEnd} />
                                ) : null}
                            </View>
                        </Animated.View>
                    ) : null}

                    {/* ---- Quick Stats ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(1000)} style={s.section}>
                        <SectionHeader title="Quick Stats" iconType="stats" readOnly />
                        <View style={s.statsGrid}>
                            <StatCard
                                label="Locations"
                                count={profile.locationsCount}
                                onPress={() => router.push('/company/locations')}
                            />
                            <StatCard
                                label="Contacts"
                                count={profile.contactsCount}
                                onPress={() => router.push('/company/contacts')}
                            />
                            <StatCard
                                label="Shifts"
                                count={profile.shiftsCount}
                                onPress={() => router.push('/company/shifts')}
                            />
                            <StatCard
                                label="Users"
                                count={profile.usersCount}
                                onPress={() => router.push('/company/users')}
                            />
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>

            {/* Edit Bottom Sheet */}
            {editSection && editData ? (
                <EditBottomSheet
                    visible={true}
                    sectionKey={editSection}
                    currentData={editData}
                    onClose={() => {
                        setEditSection(null);
                        setEditData(null);
                    }}
                    onSaved={() => refetch()}
                />
            ) : null}

            {/* Confirm Modal for module add/remove */}
            <ConfirmModal {...confirmModalProps} />
        </View>
    );
}

// ============ STYLES ============

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    headerGradient: {
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    companyHeaderInfo: {
        alignItems: 'center',
        marginBottom: 8,
    },
    companyAvatar: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    industryTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    body: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    editIconButton: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeReadOnly: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    infoRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    chipPrimary: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    chipSuccess: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.success[50],
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    sameAddressBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[100],
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.primary[500],
    },
    booleanChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '44%',
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.neutral[50],
    },
    hqText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: colors.success[700],
    },
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    moduleTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    moduleTagActive: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[200],
    },
    moduleTagText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: colors.neutral[600],
    },
    moduleTagTextActive: {
        color: colors.primary[700],
        fontFamily: 'Inter-SemiBold',
    },
    emptyContainer: {
        padding: 24,
        backgroundColor: colors.primary[50],
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.primary[100],
        borderStyle: 'dashed',
    },
    emptyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: colors.primary[600],
        textAlign: 'center',
    },
});

const bs = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdropPress: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.white,
        borderRadius: 36,
        maxHeight: '88%',
        marginHorizontal: 12,
        marginBottom: 12,
        elevation: 20,
        shadowColor: colors.primary[950],
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    handleBar: {
        width: 44,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.neutral[200],
        alignSelf: 'center',
        marginTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    title: {
        fontSize: 17,
        fontFamily: 'Inter-Bold',
        color: colors.primary[950],
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.neutral[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        maxHeight: '100%',
    },
    scrollContent: {
        padding: 24,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.danger[50],
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
    },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary[500],
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
});
