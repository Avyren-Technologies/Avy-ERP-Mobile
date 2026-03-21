/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showErrorMessage } from '@/components/ui/utils';

import { useCompanyProfile } from '@/features/company-admin/api/use-company-admin-queries';
import { useUpdateProfileSection } from '@/features/company-admin/api/use-company-admin-mutations';

import { MODULE_CATALOGUE, USER_TIERS } from '@/features/super-admin/tenant-onboarding/constants';
import type { UserTierKey } from '@/features/super-admin/tenant-onboarding/types';
import { FormInput } from '@/features/super-admin/tenant-onboarding/atoms';

// ============ TYPES ============

type EditableSectionKey = 'basicInfo' | 'registeredAddress' | 'corporateAddress';

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
    const billing = raw.commercial ?? raw.billing ?? {};
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
        employeeCount: identity.employeeCount ?? raw.employeeCount ?? '',
        pan: statutory.pan ?? '',
        tan: statutory.tan ?? '',
        gstin: statutory.gstin ?? '',
        pfRegNo: statutory.pfRegNo ?? '',
        esiCode: statutory.esiCode ?? '',
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

function BackButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={s.backButton}>
            <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </Pressable>
    );
}

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
                {value || '\u2014'}
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
            <Text className="font-inter text-2xl font-bold text-primary-600">{count}</Text>
            <Text className="mt-1 font-inter text-xs font-medium text-neutral-500">{label}</Text>
        </Pressable>
    );
}

// ============ EDIT BOTTOM SHEET ============

const SECTION_TITLES: Record<EditableSectionKey, string> = {
    basicInfo: 'Basic Info',
    registeredAddress: 'Registered Address',
    corporateAddress: 'Corporate Address',
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
            setFormData({ ...currentData });
            setSaveError('');
        }
    }, [visible, currentData]);

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        if (saveError) setSaveError('');
    };

    const handleSave = () => {
        setSaveError('');
        mutation.mutate(
            { sectionKey, data: formData },
            {
                onSuccess: () => {
                    showSuccess('Saved', 'Profile section updated successfully.');
                    onSaved();
                    onClose();
                },
                onError: (err: any) => {
                    const msg = err?.message ?? 'Failed to save changes. Please try again.';
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
            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={bs.backdrop}>
                <Pressable style={bs.backdropPress} onPress={onClose} />
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
                            <Text className="font-inter text-xs font-medium text-danger-600">{saveError}</Text>
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
            </View>
        </Modal>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: profileResponse, isLoading, error, refetch } = useCompanyProfile();
    const rawData = profileResponse?.data ?? profileResponse;
    const profile: CompanyProfileData | null = rawData ? mapApiToProfile(rawData) : null;

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
        }
        setEditSection(key);
        setEditData(data);
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

    const [logoFailed, setLogoFailed] = React.useState(false);
    const hasLogo = !!profile.logoUrl && !logoFailed;

    return (
        <View style={s.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                bounces={false}
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
                            <BackButton onPress={() => router.back()} />
                            <Text className="font-inter text-base font-semibold text-white">
                                Company Profile
                            </Text>
                            <View style={{ width: 36 }} />
                        </View>

                        {/* Company avatar + name */}
                        <View style={s.companyHeaderInfo}>
                            {hasLogo ? (
                                <Image
                                    source={{ uri: profile.logoUrl }}
                                    style={{ width: 72, height: 72, borderRadius: 16 }}
                                    resizeMode="contain"
                                    onError={() => setLogoFailed(true)}
                                />
                            ) : (
                                <LinearGradient
                                    colors={[colors.accent[300], colors.primary[400]]}
                                    style={s.companyAvatar}
                                >
                                    <Text className="font-inter text-xl font-bold text-white">
                                        {profile.displayName.substring(0, 2).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )}

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
                    {/* ---- Company Identity (read-only) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={s.section}>
                        <SectionHeader title="Company Identity" iconType="identity" readOnly />
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

                    {/* ---- Statutory Info (read-only) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={s.section}>
                        <SectionHeader title="Statutory Info" iconType="statutory" readOnly />
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

                    {/* ---- Fiscal Config (read-only) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(700)} style={s.section}>
                        <SectionHeader title="Fiscal Configuration" iconType="fiscal" readOnly />
                        <View style={s.sectionCard}>
                            <InfoRow label="Fiscal Year Type" value={profile.fyType} />
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

                    {/* ---- Preferences (read-only) ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(800)} style={s.section}>
                        <SectionHeader title="Preferences" iconType="preferences" readOnly />
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
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '44%',
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
});

// ---- Bottom Sheet Styles ----

const bs = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    backdropPress: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        paddingTop: 8,
    },
    handleBar: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[300],
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.neutral[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 4,
    },
    errorContainer: {
        marginHorizontal: 24,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
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
