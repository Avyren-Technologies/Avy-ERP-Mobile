/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { showSuccess } from '@/components/ui/utils';
import { Skeleton } from '@/components/ui/skeleton';

import { MODULE_CATALOGUE, USER_TIERS, FY_OPTIONS, MONTHS } from './tenant-onboarding/constants';
import type { UserTierKey } from './tenant-onboarding/types';

import { useTenantDetail, useUpdateCompanyStatus, useDeleteCompany } from '@/features/super-admin/api/use-tenant-queries';
import { useEntityAuditLogs } from '@/features/super-admin/api/use-audit-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { CompanyDetailEditModal } from '@/features/super-admin/company-detail-edit-modal';
import { EmptyState } from '@/components/ui/empty-state';

// ============ TYPES ============

type WizardStatus = 'Draft' | 'Pilot' | 'Active' | 'Inactive';

/** Shape of company detail as consumed by the UI — mapped from API response */
interface CompanyDetailUI {
    id: string;
    logoUrl: string;
    displayName: string;
    legalName: string;
    businessType: string;
    industry: string;
    companyCode: string;
    shortName: string;
    slug: string;
    customDomain: string;
    status: WizardStatus;
    cin: string;
    incorporationDate: string;
    employees: string;
    website: string;
    emailDomain: string;
    pan: string; tan: string; gstin: string; pfRegNo: string; esiCode: string; ptReg: string; lwfrNo: string; rocState: string;
    regLine1: string; regLine2: string; regCity: string; regDistrict: string; regPin: string; regState: string; regCountry: string; sameAsRegistered: boolean;
    fyType: string; fyCustomStartMonth: string; fyCustomEndMonth: string; payrollFreq: string; cutoffDay: string; disbursementDay: string; weekStart: string; timezone: string; workingDays: string[];
    currency: string; language: string; dateFormat: string; indiaCompliance: boolean; mobileApp: boolean; webApp: boolean; bankIntegration: boolean; biometric: boolean; emailNotif: boolean; mfa: boolean;
    endpointType: 'default' | 'custom'; endpointUrl: string;
    multiLocationMode: boolean; locationConfig: string;
    locations: Array<{ id: string; name: string; code: string; type: string; city: string; state: string; isHQ: boolean; status: string; geoEnabled: boolean; geoRadius: number; gstin: string; modules: string[]; userTier: string }>;
    contacts: Array<{ name: string; designation: string; department: string; type: string; email: string; mobile: string }>;
    dayStartTime: string; dayEndTime: string; weeklyOffs: string[];
    shifts: Array<{ name: string; fromTime: string; toTime: string; noShuffle: boolean; downtimeSlots: Array<{ type: string; duration: string }> }>;
    noSeries: Array<{ code: string; screen: string; preview: string }>;
    iotReasons: Array<{ reasonType: string; reason: string; department: string; planned: boolean }>;
    controls: { ncEditMode: boolean; loadUnload: boolean; cycleTime: boolean; payrollLock: boolean; leaveCarryForward: boolean; overtimeApproval: boolean; mfa: boolean };
    users: Array<{ fullName: string; username: string; role: string; email: string; department: string; location: string }>;
    selectedModuleIds: string[]; userTier: UserTierKey; userCount: number; maxUsers: number; billingCycle: 'monthly' | 'annual'; nextRenewal: string; monthlyAmount: string; customPricing: boolean; trialDays: number;
    createdAt: string; lastActive: string;
}

/** Map API response to UI-expected shape */
function mapApiToDetailUI(raw: any): CompanyDetailUI {
    const identity = raw.identity ?? raw;
    const statutory = raw.statutory ?? raw;
    const address = raw.registeredAddress ?? raw.address?.registered ?? raw;
    const fiscal = raw.fiscalConfig ?? raw.fiscal ?? raw;
    const preferences = raw.preferences ?? raw;
    const endpoint = raw.endpoint ?? raw;
    const strategy = raw.strategy ?? raw;
    const controls = raw.systemControls ?? raw.controls ?? {};
    const billing = raw.commercial ?? raw.billing ?? {};
    const sub = raw.tenant?.subscriptions?.[0] ?? {};

    const locations = raw.locations ?? [];
    const derivedModuleIds = Array.from(
        new Set(
            locations.flatMap((loc: any) => (loc.moduleIds ?? []) as string[]),
        ),
    ) as string[];
    const tierSet = Array.from(
        new Set(
            locations
                .map((loc: any) => loc.userTier)
                .filter(Boolean)
                .map((t: string) => String(t).toLowerCase()),
        ),
    ) as string[];
    const derivedTier = (tierSet.length === 1 ? tierSet[0] : 'starter') as UserTierKey;
    const derivedMaxUsers = locations.reduce((sum: number, loc: any) => {
        const tierKey = String(loc.userTier ?? '').toLowerCase();
        if (tierKey === 'custom') {
            return sum + (loc.customUserLimit ? parseInt(String(loc.customUserLimit), 10) || 0 : 0);
        }
        const tierMeta = USER_TIERS.find((t) => t.key === tierKey);
        return sum + (tierMeta?.maxUsers ?? 0);
    }, 0);
    const derivedTrialDays = locations.length > 0
        ? Math.max(...locations.map((loc: any) => Number(loc.trialDays ?? 0)))
        : 0;
    const derivedMonthly = locations.reduce((sum: number, loc: any) => {
        const moduleSum = ((loc.moduleIds ?? []) as string[]).reduce((s, moduleId) => {
            const moduleMeta = MODULE_CATALOGUE.find((m) => m.id === moduleId);
            const customPrice = loc.customModulePricing?.[moduleId];
            return s + (customPrice ?? moduleMeta?.price ?? 0);
        }, 0);
        const tierKey = String(loc.userTier ?? '').toLowerCase();
        const tierSum = tierKey === 'custom'
            ? (loc.customTierPrice ? parseInt(String(loc.customTierPrice), 10) || 0 : 0)
            : (USER_TIERS.find((t) => t.key === tierKey)?.basePrice ?? 0);
        return sum + moduleSum + tierSum;
    }, 0);

    return {
        id: raw.id ?? '',
        logoUrl: identity.logoUrl ?? raw.logoUrl ?? '',
        displayName: identity.displayName ?? raw.displayName ?? '',
        legalName: identity.legalName ?? raw.legalName ?? '',
        businessType: identity.businessType ?? raw.businessType ?? '',
        industry: identity.industry ?? raw.industry ?? '',
        companyCode: identity.companyCode ?? raw.companyCode ?? '',
        shortName: identity.shortName ?? raw.shortName ?? '',
        slug: raw.tenant?.slug ?? raw.slug ?? '',
        customDomain: raw.tenant?.customDomain ?? raw.customDomain ?? '',
        status: (raw.wizardStatus ?? raw.status ?? 'Draft') as WizardStatus,
        cin: identity.cin ?? raw.cin ?? '',
        incorporationDate: identity.incorporationDate ?? raw.incorporationDate ?? '',
        employees: identity.employeeCount ?? raw.employeeCount ?? '',
        website: identity.website ?? raw.website ?? '',
        emailDomain: identity.emailDomain ?? raw.emailDomain ?? '',
        pan: statutory.pan ?? '', tan: statutory.tan ?? '', gstin: statutory.gstin ?? '', pfRegNo: statutory.pfRegNo ?? '', esiCode: statutory.esiCode ?? '', ptReg: statutory.ptReg ?? '', lwfrNo: statutory.lwfrNo ?? '', rocState: statutory.rocState ?? '',
        regLine1: address.line1 ?? address.regLine1 ?? '', regLine2: address.line2 ?? address.regLine2 ?? '', regCity: address.city ?? address.regCity ?? '', regDistrict: address.district ?? address.regDistrict ?? '', regPin: address.pin ?? address.regPin ?? '', regState: address.state ?? address.regState ?? '', regCountry: address.country ?? address.regCountry ?? 'India', sameAsRegistered: raw.address?.sameAsRegistered ?? raw.sameAsRegistered ?? true,
        fyType: fiscal.fyType ?? '', fyCustomStartMonth: fiscal.fyCustomStartMonth ?? '', fyCustomEndMonth: fiscal.fyCustomEndMonth ?? '', payrollFreq: fiscal.payrollFreq ?? '', cutoffDay: fiscal.cutoffDay ?? '', disbursementDay: fiscal.disbursementDay ?? '', weekStart: fiscal.weekStart ?? '', timezone: fiscal.timezone ?? '', workingDays: fiscal.workingDays ?? [],
        currency: preferences.currency ?? '', language: preferences.language ?? '', dateFormat: preferences.dateFormat ?? '', indiaCompliance: preferences.indiaCompliance ?? false, mobileApp: preferences.mobileApp ?? false, webApp: preferences.webApp ?? false, bankIntegration: preferences.bankIntegration ?? false, biometric: preferences.biometric ?? false, emailNotif: preferences.emailNotif ?? false, mfa: controls.mfa ?? preferences.mfa ?? false,
        endpointType: (endpoint.endpointType ?? raw.endpointType ?? 'default') as 'default' | 'custom', endpointUrl: endpoint.customBaseUrl ?? raw.customEndpointUrl ?? 'https://avy-erp-api.avyren.in',
        multiLocationMode: strategy.multiLocationMode ?? raw.multiLocationMode ?? false, locationConfig: strategy.locationConfig ?? raw.locationConfig ?? 'common',
        locations: locations.map((loc: any) => ({
            id: loc.id ?? '', name: loc.name ?? '', code: loc.code ?? '', type: loc.facilityType ?? loc.type ?? '',
            city: loc.city ?? '', state: loc.state ?? '', isHQ: loc.isHQ ?? false, status: loc.status ?? 'Active',
            geoEnabled: loc.geoEnabled ?? false, geoRadius: loc.geoRadius ?? 0, gstin: loc.gstin ?? '',
            modules: loc.moduleIds ?? loc.selectedModuleIds ?? loc.modules ?? [], userTier: loc.userTier ?? 'starter',
        })),
        contacts: (raw.contacts ?? []).map((c: any) => ({
            name: c.name ?? '', designation: c.designation ?? '', department: c.department ?? '',
            type: c.type ?? '', email: c.email ?? '', mobile: c.mobile ?? c.phone ?? '',
        })),
        dayStartTime: raw.dayStartTime ?? '',
        dayEndTime: raw.dayEndTime ?? '',
        weeklyOffs: raw.weeklyOffs ?? [],
        shifts: (raw.shifts ?? []).map((s: any) => ({
            name: s.name ?? '', fromTime: s.fromTime ?? s.startTime ?? '', toTime: s.toTime ?? s.endTime ?? '',
            noShuffle: s.noShuffle ?? false, downtimeSlots: s.downtimeSlots ?? [],
        })),
        noSeries: (raw.noSeries ?? []).map((ns: any) => {
            const numberCount = ns.numberCount ?? 4;
            const startNumber = ns.startNumber ?? 1;
            const padded = String(startNumber).padStart(numberCount, '0');
            return {
                code: ns.code ?? '',
                screen: ns.linkedScreen ?? ns.screen ?? ns.documentType ?? '',
                preview: `${ns.prefix ?? ''}${ns.suffix ?? ''}${padded}`,
            };
        }),
        iotReasons: (raw.iotReasons ?? []).map((r: any) => ({ reasonType: r.reasonType ?? '', reason: r.reason ?? '', department: r.department ?? '', planned: r.planned ?? false })),
        controls: { ncEditMode: controls.ncEditMode ?? false, loadUnload: controls.loadUnload ?? false, cycleTime: controls.cycleTime ?? false, payrollLock: controls.payrollLock ?? false, leaveCarryForward: controls.leaveCarryForward ?? false, overtimeApproval: controls.overtimeApproval ?? false, mfa: controls.mfa ?? false },
        users: (raw.users ?? []).map((u: any) => ({
            fullName: u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(' ') ?? u.name ?? '',
            username: u.username ?? (u.email ? String(u.email).split('@')[0] : ''),
            role: u.role ?? '',
            email: u.email ?? '',
            department: u.department ?? '',
            location: u.location ?? '',
        })),
        selectedModuleIds: (raw.selectedModuleIds ?? derivedModuleIds) as string[],
        userTier: (sub.tier ?? raw.userTier ?? derivedTier) as UserTierKey,
        userCount: raw._count?.users ?? raw.userCount ?? ((raw.users ?? []).length),
        maxUsers: sub.maxUsers ?? raw.maxUsers ?? (derivedMaxUsers || 100),
        billingCycle: (sub.billingCycle ?? raw.billingCycle ?? 'monthly') as 'monthly' | 'annual',
        nextRenewal: sub.nextRenewal ?? raw.nextRenewal ?? '',
        monthlyAmount: sub.monthlyAmount ?? raw.monthlyAmount ?? (derivedMonthly ? `₹${derivedMonthly.toLocaleString('en-IN')}` : ''),
        customPricing: sub.customPricing ?? raw.customPricing ?? false,
        trialDays: sub.trialDays ?? raw.trialDays ?? derivedTrialDays,
        createdAt: raw.createdAt ?? '',
        lastActive: raw.lastActive ?? raw.updatedAt ?? '',
    };
}

// ============ HELPERS ============

function toBadgeStatus(status: WizardStatus) {
    switch (status) {
        case 'Active': return 'active' as const;
        case 'Pilot': return 'trial' as const;
        case 'Inactive': return 'suspended' as const;
        case 'Draft': return 'pending' as const;
    }
}

// ============ UI COMPONENTS ============

function BackButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.backButton}>
            <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </Pressable>
    );
}

function SectionHeader({ title, iconType, onEdit }: { title: string; iconType: string; onEdit?: () => void }) {
    return (
        <View style={styles.sectionHeader}>
            <SectionIcon type={iconType} color={colors.primary[500]} />
            <Text className="font-inter text-sm font-bold text-primary-900" style={{ flex: 1 }}>
                {title}
            </Text>
            {onEdit ? (
                <Pressable onPress={onEdit} style={styles.editIconButton}>
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
            ) : null}
        </View>
    );
}

function SectionIcon({ type, color }: { type: string; color: string }) {
    switch (type) {
        case 'info':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'statutory':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'address':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'fiscal':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'preferences':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'server':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="2" y="2" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="2" y="14" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Circle cx="6" cy="6" r="1" fill={color} />
                    <Circle cx="6" cy="18" r="1" fill={color} />
                </Svg>
            );
        case 'strategy':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            );
        case 'locations':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.5" fill="none" />
                </Svg>
            );
        case 'contacts':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </Svg>
            );
        case 'shifts':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
                    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'noseries':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M4 7V4a2 2 0 012-2h8.5L20 7.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <Path d="M14 2v6h6M2 14h8M6 11l3 3-3 3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            );
        case 'iot':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'controls':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                    <Path d="M1 14h6M9 8h6M17 16h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                </Svg>
            );
        case 'users':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
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
        case 'billing':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                        d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22"
                        stroke={color}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                </Svg>
            );
        default:
            return null;
    }
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text className="font-inter text-xs font-medium text-neutral-500">
                {label}
            </Text>
            <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

function ChipRow({ items, variant = 'primary' }: { items: string[]; variant?: 'primary' | 'success' | 'neutral' }) {
    const chipStyle = variant === 'success' ? styles.chipSuccess : variant === 'neutral' ? styles.chipNeutral : styles.chipPrimary;
    const textClass = variant === 'success'
        ? 'font-inter text-xs font-semibold text-success-700'
        : variant === 'neutral'
            ? 'font-inter text-xs font-semibold text-neutral-600'
            : 'font-inter text-xs font-semibold text-primary-700';
    return (
        <View style={styles.chipRow}>
            {items.map((item) => (
                <View key={item} style={chipStyle}>
                    <Text className={textClass}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

function ToggleChip({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <View style={[styles.toggleChip, enabled ? styles.toggleChipEnabled : styles.toggleChipDisabled]}>
            <View style={[styles.toggleDot, { backgroundColor: enabled ? colors.success[500] : colors.neutral[300] }]} />
            <Text className={`font-inter text-xs font-semibold ${enabled ? 'text-success-700' : 'text-neutral-500'}`}>
                {label}
            </Text>
        </View>
    );
}

// ============ AUDIT HISTORY SECTION ============

function AuditActionBadge({ action }: { action: string }) {
    const upper = (action ?? '').toUpperCase();
    let bgColor = colors.info[50];
    let borderColor = colors.info[200];
    let textColor = colors.info[700];
    if (upper.includes('CREATE')) {
        bgColor = colors.success[50];
        borderColor = colors.success[200];
        textColor = colors.success[700];
    } else if (upper.includes('DELETE')) {
        bgColor = colors.danger[50];
        borderColor = colors.danger[200];
        textColor = colors.danger[700];
    } else if (upper.includes('UPDATE')) {
        bgColor = colors.primary[50];
        borderColor = colors.primary[200];
        textColor = colors.primary[700];
    }
    return (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: bgColor, borderWidth: 1, borderColor }}>
            <Text className="font-inter" style={{ fontSize: 10, fontWeight: '700', color: textColor }}>{upper}</Text>
        </View>
    );
}

function AuditHistorySection({ companyId }: { companyId: string }) {
    const { data, isLoading } = useEntityAuditLogs('COMPANY', companyId);
    const fmt = useCompanyFormatter();
    const logs: any[] = data?.data ?? data ?? [];

    const formatTimestamp = (ts: string) => {
        if (!ts) return '';
        return fmt.dateTime(ts);
    };

    return (
        <Animated.View entering={FadeInUp.duration(400).delay(850)} style={styles.section}>
            <SectionHeader title="Audit History" iconType="info" />
            <View style={styles.sectionCard}>
                {isLoading ? (
                    <Skeleton
                        isLoading={true}
                        layout={[
                            { key: 'row1', width: '100%', height: 48, borderRadius: 12, marginBottom: 8 },
                            { key: 'row2', width: '100%', height: 48, borderRadius: 12, marginBottom: 8 },
                            { key: 'row3', width: '80%', height: 48, borderRadius: 12 },
                        ]}
                    >
                        <View />
                    </Skeleton>
                ) : logs.length === 0 ? (
                    <EmptyState
                        icon="inbox"
                        title="No audit history"
                        message="Changes to this company will be recorded here."
                    />
                ) : (
                    <View style={{ gap: 0 }}>
                        {logs.slice(0, 20).map((log: any, i: number) => (
                            <View
                                key={log.id ?? i}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    paddingVertical: 10,
                                    borderBottomWidth: i < Math.min(logs.length, 20) - 1 ? 1 : 0,
                                    borderBottomColor: colors.neutral[100],
                                }}
                            >
                                {/* Timeline dot */}
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[300], marginTop: 6 }} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <AuditActionBadge action={log.action ?? ''} />
                                        <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[400] }}>
                                            {formatTimestamp(log.createdAt ?? log.timestamp ?? '')}
                                        </Text>
                                    </View>
                                    <Text className="font-inter text-sm font-semibold text-primary-950" numberOfLines={2}>
                                        {log.description ?? log.action ?? ''}
                                    </Text>
                                    {log.performedBy && (
                                        <Text className="font-inter" style={{ fontSize: 11, color: colors.neutral[400], marginTop: 2 }}>
                                            by {log.performedBy}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    // --- API hooks ---
    const { data: detailResponse, isLoading, error, refetch } = useTenantDetail(id ?? '');
    const statusMutation = useUpdateCompanyStatus();
    const deleteMutation = useDeleteCompany();

    const rawData = detailResponse?.data ?? detailResponse;
    const company: CompanyDetailUI | null = rawData ? mapApiToDetailUI(rawData) : null;

    const [endpointType, setEndpointType] = React.useState<'default' | 'custom'>('default');
    const [customUrl, setCustomUrl] = React.useState('');
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [maxUsers, setMaxUsers] = React.useState('100');

    // Edit modal state
    const [editSection, setEditSection] = React.useState<string | null>(null);
    const [editData, setEditData] = React.useState<Record<string, any> | null>(null);

    // Sync local state when company data loads
    React.useEffect(() => {
        if (company) {
            setEndpointType(company.endpointType);
            setCustomUrl(company.endpointType === 'custom' ? company.endpointUrl : '');
            setMaxUsers(String(company.maxUsers));
        }
    }, [rawData]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Loading & error states ---
    if (isLoading || !company) {
        return (
            <View style={styles.container}>
                <Skeleton isLoading={true} layout={[
                    { key: 'header', width: '100%', height: 180 },
                    { key: 'tabs', width: '100%', height: 44, marginTop: 12 },
                    { key: 's1', width: '92%', height: 120, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                    { key: 's2', width: '92%', height: 120, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                    { key: 's3', width: '92%', height: 80, marginTop: 12, borderRadius: 12, alignSelf: 'center' },
                ]}>
                    <View />
                </Skeleton>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
                <Text className="font-inter text-base font-semibold text-danger-600">Failed to load company</Text>
                <Text className="mt-1 font-inter text-sm text-neutral-500 text-center">
                    {(error as any)?.message ?? 'An error occurred.'}
                </Text>
                <Pressable onPress={() => refetch()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary[500] }}>
                    <Text className="font-inter text-sm font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

    const usagePercent = company.maxUsers > 0 ? (company.userCount / company.maxUsers) * 100 : 0;
    const tier = USER_TIERS.find((t) => t.key === company.userTier);
    const badgeStatus = toBadgeStatus(company.status);

    const idleCount = company.iotReasons.filter((r) => r.reasonType === 'Machine Idle').length;
    const alarmCount = company.iotReasons.filter((r) => r.reasonType === 'Machine Alarm').length;

    const handleVerifyEndpoint = () => {
        setIsVerifying(true);
        setTimeout(() => setIsVerifying(false), 1500);
    };

    const VALID_TRANSITIONS: Record<string, string[]> = {
        Draft: ['Pilot', 'Active'],
        Pilot: ['Active', 'Inactive'],
        Active: ['Inactive'],
        Inactive: ['Active'],
        Suspended: ['Active', 'Inactive'],
    };

    const allowedTransitions = VALID_TRANSITIONS[company.status] ?? [];

    const STATUS_CONFIG: Record<string, { title: string; message: string; variant: 'primary' | 'warning' | 'danger'; confirmText: string }> = {
        Pilot: {
            title: 'Move to Pilot',
            message: `Move ${company.displayName} to Pilot status for trial evaluation?`,
            variant: 'primary',
            confirmText: 'Start Pilot',
        },
        Active: {
            title: company.status === 'Inactive' ? 'Reactivate Company' : 'Activate Company',
            message: company.status === 'Inactive'
                ? `Reactivate ${company.displayName}? Users will regain access immediately.`
                : `Activate ${company.displayName}? This will make the company fully operational.`,
            variant: 'primary',
            confirmText: company.status === 'Inactive' ? 'Reactivate' : 'Activate',
        },
        Inactive: {
            title: 'Deactivate Company',
            message: `Are you sure you want to deactivate ${company.displayName}? All users will immediately lose access.`,
            variant: 'warning',
            confirmText: 'Deactivate',
        },
    };

    const handleStatusChange = (newStatus: string) => {
        const config = STATUS_CONFIG[newStatus];
        if (!config) return;
        showConfirm({
            ...config,
            onConfirm: () => {
                statusMutation.mutate(
                    { companyId: id!, status: newStatus },
                    {
                        onSuccess: () => showSuccess('Status Updated', `Company status changed to ${newStatus}.`),
                        onError: (err: any) => showConfirm({ title: 'Error', message: err?.message ?? 'Failed to update status.', variant: 'danger', confirmText: 'OK', onConfirm: () => {} }),
                    },
                );
            },
        });
    };

    const handleDelete = () => {
        showConfirm({
            title: 'Delete Tenant',
            message: `This will permanently delete ${company.displayName} and all associated data. This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: () => {
                deleteMutation.mutate(id!, {
                    onSuccess: () => {
                        showSuccess('Company Deleted', 'Company removed successfully.');
                        router.back();
                    },
                    onError: (err: any) => showConfirm({ title: 'Error', message: err?.message ?? 'Failed to delete tenant.', variant: 'danger', confirmText: 'OK', onConfirm: () => {} }),
                });
            },
        });
    };

    const openEditModal = (sectionKey: string) => {
        if (!company) return;
        let data: Record<string, any> = {};
        switch (sectionKey) {
            case 'identity':
                data = { displayName: company.displayName, legalName: company.legalName, businessType: company.businessType, industry: company.industry, companyCode: company.companyCode, shortName: company.shortName, cin: company.cin, website: company.website, emailDomain: company.emailDomain };
                break;
            case 'statutory':
                data = { pan: company.pan, tan: company.tan, gstin: company.gstin, pfRegNo: company.pfRegNo, esiCode: company.esiCode, ptReg: company.ptReg, lwfrNo: company.lwfrNo, rocState: company.rocState };
                break;
            case 'address':
                data = { regLine1: company.regLine1, regLine2: company.regLine2, regCity: company.regCity, regDistrict: company.regDistrict, regPin: company.regPin, regState: company.regState, regCountry: company.regCountry, sameAsRegistered: company.sameAsRegistered };
                break;
            case 'fiscal':
                data = { fyType: company.fyType, payrollFreq: company.payrollFreq, cutoffDay: company.cutoffDay, disbursementDay: company.disbursementDay, weekStart: company.weekStart, timezone: company.timezone, workingDays: [...company.workingDays] };
                break;
            case 'preferences':
                data = { currency: company.currency, language: company.language, dateFormat: company.dateFormat, indiaCompliance: company.indiaCompliance, mobileApp: company.mobileApp, webApp: company.webApp, bankIntegration: company.bankIntegration, biometric: company.biometric, emailNotif: company.emailNotif, mfa: company.mfa };
                break;
            case 'endpoint':
                data = { endpointType: company.endpointType, endpointUrl: company.endpointUrl };
                break;
            case 'strategy':
                data = { multiLocationMode: company.multiLocationMode, locationConfig: company.locationConfig };
                break;
            case 'controls':
                data = { controls: { ...company.controls } };
                break;
        }
        setEditSection(sectionKey);
        setEditData(data);
    };

    const handleEditSaved = () => {
        refetch();
    };

    return (
        <View style={styles.container}>
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
                        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
                    >
                        <View style={styles.headerDecor1} />
                        <View style={styles.headerDecor2} />

                        <View style={styles.headerTop}>
                            <BackButton onPress={() => router.back()} />
                            <Text className="font-inter text-base font-semibold text-white">
                                Company Details
                            </Text>
                            <View style={{ width: 36 }} />
                        </View>

                        <View style={styles.companyHeaderInfo}>
                            {company.logoUrl ? (
                                <Image
                                    source={{ uri: company.logoUrl }}
                                    style={styles.companyLargeAvatar}
                                    contentFit="cover"
                                />
                            ) : (
                                <LinearGradient
                                    colors={[colors.accent[300], colors.primary[400]]}
                                    style={styles.companyLargeAvatar}
                                >
                                    <Text className="font-inter text-xl font-bold text-white">
                                        {company.displayName.substring(0, 2).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )}

                            <Text className="mt-3 font-inter text-xl font-bold text-white">
                                {company.displayName}
                            </Text>
                            <Text className="mt-0.5 font-inter text-xs text-primary-200">
                                {company.legalName}
                            </Text>
                            <View style={styles.headerBadgeRow}>
                                <StatusBadge status={badgeStatus} />
                                <View style={styles.industryTag}>
                                    <Text className="font-inter text-xs font-semibold text-white/80">
                                        {company.industry}
                                    </Text>
                                </View>
                                {company.businessType ? (
                                    <View style={styles.industryTag}>
                                        <Text className="font-inter text-xs font-semibold text-white/80">
                                            {company.businessType}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Strategy badge */}
                            {company.multiLocationMode && (
                                <View style={styles.strategyBadge}>
                                    <Text className="font-inter text-[10px] font-bold text-white/90">
                                        Multi-Location  ·  {company.locationConfig === 'per-location' ? 'Per-Location Config' : 'Common Config'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.quickStatsRow}>
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.userCount}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Active Users
                                </Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.selectedModuleIds.length}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Modules
                                </Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.locations.length}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Locations
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <View style={styles.body}>
                    {/* ---- Company Information ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.section}>
                        <SectionHeader title="Company Information" iconType="info" onEdit={() => openEditModal('identity')} />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Company Code" value={company.companyCode} />
                            <InfoRow label="Short Name" value={company.shortName} />
                            <InfoRow label="CIN" value={company.cin} />
                            <InfoRow label="Incorporation Date" value={company.incorporationDate} />
                            <InfoRow label="Employees" value={company.employees} />
                            <InfoRow label="Website" value={company.website} />
                            <InfoRow label="Email Domain" value={company.emailDomain} />
                            <InfoRow label="Custom Domain" value={company.customDomain} />
                            <InfoRow label="Slug" value={company.slug} />
                            {company.slug ? <InfoRow label="Subdomain" value={`${company.slug}.avyren.in`} /> : null}
                            <InfoRow label="Registered" value={company.createdAt} />
                        </View>
                    </Animated.View>

                    {/* ---- Statutory & Tax ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
                        <SectionHeader title="Statutory & Tax" iconType="statutory" onEdit={() => openEditModal('statutory')} />
                        <View style={styles.sectionCard}>
                            <InfoRow label="PAN" value={company.pan} />
                            <InfoRow label="TAN" value={company.tan || '—'} />
                            <InfoRow label="GSTIN" value={company.gstin || '—'} />
                            <InfoRow label="PF Registration" value={company.pfRegNo || '—'} />
                            <InfoRow label="ESI Code" value={company.esiCode || '—'} />
                            <InfoRow label="PT Registration" value={company.ptReg || '—'} />
                            <InfoRow label="LWFR No." value={company.lwfrNo || '—'} />
                            <InfoRow label="ROC State" value={company.rocState || '—'} />
                        </View>
                    </Animated.View>

                    {/* ---- Address ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.section}>
                        <SectionHeader title="Registered Address" iconType="address" onEdit={() => openEditModal('address')} />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Address Line 1" value={company.regLine1} />
                            {company.regLine2 ? <InfoRow label="Address Line 2" value={company.regLine2} /> : null}
                            <InfoRow label="City" value={company.regCity} />
                            <InfoRow label="District" value={company.regDistrict} />
                            <InfoRow label="PIN Code" value={company.regPin} />
                            <InfoRow label="State" value={company.regState} />
                            <InfoRow label="Country" value={company.regCountry} />
                            {company.sameAsRegistered && (
                                <View style={styles.sameAddressBadge}>
                                    <Text className="font-inter text-xs font-semibold text-info-700">
                                        Corporate address same as registered
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Fiscal & Calendar ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
                        <SectionHeader title="Fiscal & Calendar" iconType="fiscal" onEdit={() => openEditModal('fiscal')} />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Financial Year" value={(() => {
                                const fyOpt = FY_OPTIONS.find((o) => o.key === company.fyType);
                                if (company.fyType === 'custom' && company.fyCustomStartMonth && company.fyCustomEndMonth) {
                                    const startMonth = MONTHS.find((m) => m.key === company.fyCustomStartMonth || m.label === company.fyCustomStartMonth);
                                    const endMonth = MONTHS.find((m) => m.key === company.fyCustomEndMonth || m.label === company.fyCustomEndMonth);
                                    return `${startMonth?.label ?? company.fyCustomStartMonth} – ${endMonth?.label ?? company.fyCustomEndMonth}`;
                                }
                                return fyOpt?.label ?? company.fyType;
                            })()} />
                            <InfoRow label="Payroll Frequency" value={company.payrollFreq} />
                            <InfoRow label="Cutoff Day" value={company.cutoffDay} />
                            <InfoRow label="Disbursement Day" value={company.disbursementDay} />
                            <InfoRow label="Week Starts" value={company.weekStart} />
                            <InfoRow label="Timezone" value={company.timezone} />
                            <View style={styles.infoRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">
                                    Working Days
                                </Text>
                                <ChipRow items={company.workingDays} variant="primary" />
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Preferences ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
                        <SectionHeader title="Preferences" iconType="preferences" onEdit={() => openEditModal('preferences')} />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Currency" value={company.currency} />
                            <InfoRow label="Language" value={company.language} />
                            <InfoRow label="Date Format" value={company.dateFormat} />
                            <View style={styles.infoRow}>
                                <Text className="mb-2 font-inter text-xs font-medium text-neutral-500">
                                    Integrations & Features
                                </Text>
                                <View style={styles.chipRow}>
                                    <ToggleChip label="India Compliance" enabled={company.indiaCompliance} />
                                    <ToggleChip label="Mobile App" enabled={company.mobileApp} />
                                    <ToggleChip label="Web App" enabled={company.webApp} />
                                    <ToggleChip label="Bank Integration" enabled={company.bankIntegration} />
                                    <ToggleChip label="Biometric" enabled={company.biometric} />
                                    <ToggleChip label="Email Notif" enabled={company.emailNotif} />
                                    <ToggleChip label="MFA" enabled={company.mfa} />
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Server Endpoint ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.section}>
                        <SectionHeader title="Backend Endpoint" iconType="server" onEdit={() => openEditModal('endpoint')} />
                        <View style={styles.sectionCard}>
                            <View style={styles.serverToggleRow}>
                                <Pressable
                                    onPress={() => setEndpointType('default')}
                                    style={[
                                        styles.serverToggle,
                                        endpointType === 'default' && styles.serverToggleActive,
                                    ]}
                                >
                                    <View style={[styles.serverDot, { backgroundColor: colors.success[500] }]} />
                                    <Text className={`font-inter text-xs font-semibold ${endpointType === 'default' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                        Default (Avyren)
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setEndpointType('custom')}
                                    style={[
                                        styles.serverToggle,
                                        endpointType === 'custom' && styles.serverToggleActive,
                                    ]}
                                >
                                    <View style={[styles.serverDot, { backgroundColor: colors.info[500] }]} />
                                    <Text className={`font-inter text-xs font-semibold ${endpointType === 'custom' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                        Custom URL
                                    </Text>
                                </Pressable>
                            </View>

                            {endpointType === 'default' ? (
                                <View style={styles.serverUrlDisplay}>
                                    <Text className="font-inter text-sm font-medium text-success-700">
                                        https://avy-erp-api.avyren.in
                                    </Text>
                                    <View style={styles.connectedBadge}>
                                        <View style={[styles.serverDot, { backgroundColor: colors.success[500] }]} />
                                        <Text className="font-inter text-[10px] font-bold text-success-700">
                                            CONNECTED
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.customUrlInput}>
                                        <TextInput
                                            style={styles.urlInput}
                                            placeholder="https://erp.clientdomain.com/api"
                                            placeholderTextColor={colors.neutral[400]}
                                            value={customUrl}
                                            onChangeText={setCustomUrl}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                        />
                                    </View>
                                    <Pressable
                                        onPress={handleVerifyEndpoint}
                                        style={styles.verifyButton}
                                        disabled={isVerifying || !customUrl}
                                    >
                                        <Text className={`font-inter text-xs font-bold ${isVerifying ? 'text-neutral-400' : 'text-primary-600'}`}>
                                            {isVerifying ? 'Verifying...' : 'Verify Endpoint'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Locations ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
                        <SectionHeader title="Locations" iconType="locations" onEdit={() => openEditModal('strategy')} />
                        {company.locations.map((loc) => (
                            <View key={loc.id} style={[styles.sectionCard, styles.locationCard]}>
                                <View style={styles.locationCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.locationNameRow}>
                                            <Text className="font-inter text-sm font-bold text-primary-950">
                                                {loc.name}
                                            </Text>
                                            {loc.isHQ && (
                                                <View style={styles.hqBadge}>
                                                    <Text className="font-inter text-[9px] font-bold text-white">
                                                        HQ
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text className="font-inter text-xs font-medium text-neutral-500">
                                            {loc.code}  ·  {loc.type}
                                        </Text>
                                    </View>
                                    <View style={[styles.locationStatusDot, { backgroundColor: loc.status === 'Active' ? colors.success[500] : colors.neutral[300] }]} />
                                </View>
                                <View style={styles.locationMeta}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {loc.city}, {loc.state}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-500">
                                        GSTIN: {loc.gstin}
                                    </Text>
                                </View>
                                <View style={styles.locationFooter}>
                                    <View style={styles.locationChipRow}>
                                        {loc.geoEnabled && (
                                            <View style={styles.geoBadge}>
                                                <Text className="font-inter text-[10px] font-bold text-info-700">
                                                    Geo {loc.geoRadius}m
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.locationModuleCount}>
                                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                                {loc.modules.length} modules
                                            </Text>
                                        </View>
                                        <View style={styles.locationTierBadge}>
                                            <Text className="font-inter text-[10px] font-bold text-accent-700">
                                                {loc.userTier}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Key Contacts ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(450)} style={styles.section}>
                        <SectionHeader title="Key Contacts" iconType="contacts" />
                        {company.contacts.map((contact, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.contactCard]}>
                                <View style={styles.contactHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">
                                            {contact.name}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            {contact.designation}  ·  {contact.department}
                                        </Text>
                                    </View>
                                    <View style={styles.contactTypeBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-primary-700">
                                            {contact.type}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.contactDetails}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {contact.email}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {contact.mobile}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Shifts & Time ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
                        <SectionHeader title="Shifts & Time" iconType="shifts" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Day Boundary" value={`${company.dayStartTime} — ${company.dayEndTime}`} />
                            <View style={styles.infoRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">
                                    Weekly Offs
                                </Text>
                                <ChipRow items={company.weeklyOffs} variant="neutral" />
                            </View>
                        </View>
                        {company.shifts.map((shift, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.shiftCard]}>
                                <View style={styles.shiftHeader}>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {shift.name}
                                    </Text>
                                    <Text className="font-inter text-xs font-semibold text-primary-600">
                                        {shift.fromTime} — {shift.toTime}
                                    </Text>
                                </View>
                                <View style={styles.shiftMeta}>
                                    {shift.noShuffle && (
                                        <View style={styles.noShuffleBadge}>
                                            <Text className="font-inter text-[10px] font-bold text-warning-700">
                                                No Shuffle
                                            </Text>
                                        </View>
                                    )}
                                    {shift.downtimeSlots.map((dt, dtIdx) => (
                                        <View key={dtIdx} style={styles.downtimeChip}>
                                            <Text className="font-inter text-[10px] font-medium text-neutral-600">
                                                {dt.type}: {dt.duration}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- No. Series ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(550)} style={styles.section}>
                        <SectionHeader title="No. Series" iconType="noseries" />
                        <View style={styles.sectionCard}>
                            {company.noSeries.map((series, idx) => (
                                <View key={idx} style={[styles.noSeriesRow, idx === company.noSeries.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs font-medium text-neutral-500">
                                            {series.screen}
                                        </Text>
                                        <Text className="font-inter text-sm font-bold text-primary-950" style={{ fontFamily: 'monospace' }}>
                                            {series.preview}
                                        </Text>
                                    </View>
                                    <View style={styles.seriesCodeBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-primary-600" style={{ fontFamily: 'monospace' }}>
                                            {series.code}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- IOT Reasons ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.section}>
                        <SectionHeader title="IOT Reasons" iconType="iot" />
                        <View style={styles.sectionCard}>
                            <View style={styles.iotSummaryRow}>
                                <View style={styles.iotSummaryItem}>
                                    <Text className="font-inter text-lg font-bold text-warning-600">
                                        {idleCount}
                                    </Text>
                                    <Text className="font-inter text-[10px] font-medium text-neutral-500">
                                        Idle Reasons
                                    </Text>
                                </View>
                                <View style={styles.iotSummaryDivider} />
                                <View style={styles.iotSummaryItem}>
                                    <Text className="font-inter text-lg font-bold text-danger-600">
                                        {alarmCount}
                                    </Text>
                                    <Text className="font-inter text-[10px] font-medium text-neutral-500">
                                        Alarm Reasons
                                    </Text>
                                </View>
                            </View>
                            {company.iotReasons.map((reason, idx) => (
                                <View key={idx} style={[styles.iotReasonRow, idx === company.iotReasons.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">
                                            {reason.reason}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500">
                                            {reason.department}
                                        </Text>
                                    </View>
                                    <View style={styles.iotBadgeRow}>
                                        <View style={[styles.iotTypeBadge, reason.reasonType === 'Machine Idle' ? styles.iotIdleBadge : styles.iotAlarmBadge]}>
                                            <Text className={`font-inter text-[10px] font-bold ${reason.reasonType === 'Machine Idle' ? 'text-warning-700' : 'text-danger-700'}`}>
                                                {reason.reasonType === 'Machine Idle' ? 'Idle' : 'Alarm'}
                                            </Text>
                                        </View>
                                        {reason.planned && (
                                            <View style={styles.plannedBadge}>
                                                <Text className="font-inter text-[10px] font-bold text-info-700">
                                                    Planned
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- System Controls ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(650)} style={styles.section}>
                        <SectionHeader title="System Controls" iconType="controls" onEdit={() => openEditModal('controls')} />
                        <View style={styles.sectionCard}>
                            <View style={styles.chipRow}>
                                <ToggleChip label="NC Edit Mode" enabled={company.controls.ncEditMode} />
                                <ToggleChip label="Load/Unload" enabled={company.controls.loadUnload} />
                                <ToggleChip label="Cycle Time" enabled={company.controls.cycleTime} />
                                <ToggleChip label="Payroll Lock" enabled={company.controls.payrollLock} />
                                <ToggleChip label="Leave Carry Forward" enabled={company.controls.leaveCarryForward} />
                                <ToggleChip label="Overtime Approval" enabled={company.controls.overtimeApproval} />
                                <ToggleChip label="MFA" enabled={company.controls.mfa} />
                            </View>
                        </View>
                    </Animated.View>

                    {/* ---- Users ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(700)} style={styles.section}>
                        <SectionHeader title="Users & Access" iconType="users" />
                        <View style={styles.sectionCard}>
                            {/* User Tier & Limits */}
                            <View style={styles.userLimitsRow}>
                                <View style={styles.userLimitInfo}>
                                    <Text className="font-inter text-xs font-medium text-neutral-500">
                                        Active Users
                                    </Text>
                                    <Text className="font-inter text-2xl font-bold text-primary-950">
                                        {company.userCount}
                                    </Text>
                                </View>
                                <View style={styles.userLimitDivider} />
                                <View style={styles.userLimitInfo}>
                                    <Text className="font-inter text-xs font-medium text-neutral-500">
                                        Max Limit
                                    </Text>
                                    <View style={styles.maxUserInput}>
                                        <TextInput
                                            style={styles.maxUserTextField}
                                            value={maxUsers}
                                            onChangeText={setMaxUsers}
                                            keyboardType="number-pad"
                                        />
                                        <Svg width={14} height={14} viewBox="0 0 24 24">
                                            <Path
                                                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                                stroke={colors.primary[400]}
                                                strokeWidth="1.5"
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                        </Svg>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.usageSection}>
                                <View style={styles.usageBarBg}>
                                    <View
                                        style={[
                                            styles.usageBarFill,
                                            {
                                                width: `${Math.min(usagePercent, 100)}%`,
                                                backgroundColor: usagePercent > 80 ? colors.warning[500] : colors.success[500],
                                            },
                                        ]}
                                    />
                                </View>
                                <Text className="font-inter text-[10px] font-medium text-neutral-400">
                                    {Math.round(usagePercent)}% capacity · {tier?.label ?? company.userTier} tier · {tier?.range ?? ''}
                                </Text>
                            </View>
                        </View>

                        {/* User List */}
                        {company.users.map((user, idx) => (
                            <View key={idx} style={[styles.sectionCard, styles.userCard]}>
                                <View style={styles.userCardHeader}>
                                    <View style={styles.userAvatar}>
                                        <Text className="font-inter text-xs font-bold text-primary-700">
                                            {user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-bold text-primary-950">
                                            {user.fullName}
                                        </Text>
                                        <Text className="font-inter text-xs text-neutral-500" style={{ fontFamily: 'monospace' }}>
                                            {user.username ? `@${user.username}` : '—'}
                                        </Text>
                                    </View>
                                    <View style={styles.roleBadge}>
                                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                                            {user.role}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userMeta}>
                                    <Text className="font-inter text-xs text-neutral-600">
                                        {[user.department, user.location].filter(Boolean).join('  ·  ') || '—'}
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-500">
                                        {user.email}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* ---- Active Modules ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(750)} style={styles.section}>
                        <SectionHeader title="Active Modules" iconType="modules" />
                        <View style={styles.sectionCard}>
                            <View style={styles.modulesGrid}>
                                {MODULE_CATALOGUE.map((mod) => {
                                    const isActive = company.selectedModuleIds.includes(mod.id);
                                    return (
                                        <View
                                            key={mod.id}
                                            style={[
                                                styles.moduleChip,
                                                isActive ? styles.moduleChipActive : styles.moduleChipInactive,
                                            ]}
                                        >
                                            <Text
                                                className={`font-inter text-xs font-semibold ${isActive ? 'text-primary-800' : 'text-neutral-400'}`}
                                            >
                                                {mod.icon} {mod.name}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <Pressable
                                style={styles.manageModulesButton}
                                onPress={() => router.push(`/(app)/tenant/module-assignment?id=${company.id}`)}
                            >
                                <Text className="font-inter text-sm font-bold text-primary-600">
                                    Manage Modules
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* ---- Subscription & Billing ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(800)} style={styles.section}>
                        <SectionHeader title="Subscription & Billing" iconType="billing" />
                        <View style={styles.sectionCard}>
                            <View style={styles.billingGrid}>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Plan</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {tier?.label ?? company.userTier}
                                    </Text>
                                </View>
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Billing</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {company.billingCycle === 'annual' ? 'Annual (2 months free)' : 'Monthly'}
                                    </Text>
                                </View>
                                {/* Pricing hidden — uncomment when pricing is finalized
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Amount</Text>
                                    <Text className="font-inter text-sm font-bold text-success-600">
                                        {company.monthlyAmount}/mo
                                    </Text>
                                </View>
                                */}
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Next Renewal</Text>
                                    <Text className="font-inter text-sm font-bold text-primary-950">
                                        {company.nextRenewal}
                                    </Text>
                                </View>
                                {company.trialDays > 0 ? (
                                    <View style={styles.billingItem}>
                                        <Text className="font-inter text-xs text-neutral-500">Trial Period</Text>
                                        <Text className="font-inter text-sm font-bold text-info-600">
                                            {company.trialDays} days
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            {company.customPricing && (
                                <View style={styles.customPricingBadge}>
                                    <Text className="font-inter text-xs font-bold text-accent-700">
                                        Custom Pricing Applied
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Audit History ---- */}
                    <AuditHistorySection companyId={company.id} />

                    {/* ---- Status Management ---- */}
                    <Animated.View entering={FadeIn.duration(400).delay(850)} style={styles.section}>
                        <SectionHeader title="Status Management" iconType="settings" />
                        <View style={styles.sectionCard}>
                            {/* Current Status */}
                            <View style={styles.statusCurrentRow}>
                                <Text className="font-inter text-xs font-medium text-neutral-500">Current Status</Text>
                                <StatusBadge status={badgeStatus} />
                            </View>

                            {/* Status Transitions */}
                            {allowedTransitions.length > 0 && (
                                <View style={styles.statusTransitionsRow}>
                                    {allowedTransitions.includes('Pilot') && (
                                        <Pressable onPress={() => handleStatusChange('Pilot')} style={styles.actionButton} disabled={statusMutation.isPending}>
                                            <LinearGradient
                                                colors={[colors.info[500], colors.info[600]]}
                                                style={styles.actionGradient}
                                            >
                                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                                <Text className="ml-2 font-inter text-xs font-bold text-white">Pilot</Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}
                                    {allowedTransitions.includes('Active') && (
                                        <Pressable onPress={() => handleStatusChange('Active')} style={styles.actionButton} disabled={statusMutation.isPending}>
                                            <LinearGradient
                                                colors={[colors.success[500], colors.success[600]]}
                                                style={styles.actionGradient}
                                            >
                                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                                    {company.status === 'Inactive' ? (
                                                        <Path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    ) : (
                                                        <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    )}
                                                </Svg>
                                                <Text className="ml-2 font-inter text-xs font-bold text-white">
                                                    {company.status === 'Inactive' ? 'Reactivate' : 'Activate'}
                                                </Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}
                                    {allowedTransitions.includes('Inactive') && (
                                        <Pressable onPress={() => handleStatusChange('Inactive')} style={styles.actionButton} disabled={statusMutation.isPending}>
                                            <LinearGradient
                                                colors={[colors.warning[500], colors.warning[600]]}
                                                style={styles.actionGradient}
                                            >
                                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                                    <Path d="M18.36 6.64A9 9 0 0112 21a9 9 0 010-18c1.39 0 2.73.32 3.95.9" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                    <Path d="M18 2v6h-6" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                                <Text className="ml-2 font-inter text-xs font-bold text-white">Deactivate</Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Delete ---- */}
                    <Animated.View entering={FadeIn.duration(400).delay(900)} style={styles.section}>
                        <View style={styles.actionsRow}>
                            <Pressable onPress={handleDelete} style={styles.actionButton}>
                                <LinearGradient
                                    colors={[colors.danger[500], colors.danger[600]]}
                                    style={styles.actionGradient}
                                >
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path
                                            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </Svg>
                                    <Text className="ml-2 font-inter text-xs font-bold text-white">Delete Tenant</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>

            <CompanyDetailEditModal
                visible={editSection !== null}
                onClose={() => { setEditSection(null); setEditData(null); }}
                companyId={id ?? ''}
                section={editSection ?? ''}
                currentData={editData ?? {}}
                onSaved={handleEditSaved}
            />
            <ConfirmModal {...confirmModalProps} />
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
        marginBottom: 20,
    },
    companyLargeAvatar: {
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
    strategyBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    quickStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    quickStat: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
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
    sameAddressBadge: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[100],
    },
    // Chips
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
    chipNeutral: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    toggleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    toggleChipEnabled: {
        backgroundColor: colors.success[50],
        borderColor: colors.success[200],
    },
    toggleChipDisabled: {
        backgroundColor: colors.neutral[50],
        borderColor: colors.neutral[200],
    },
    toggleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    // Server
    serverToggleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    serverToggle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        backgroundColor: colors.neutral[50],
    },
    serverToggleActive: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    serverDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    serverUrlDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.success[50],
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    customUrlInput: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 44,
        justifyContent: 'center',
    },
    urlInput: {
        fontSize: 13,
        color: colors.primary[950],
    },
    verifyButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
    },
    // Locations
    locationCard: {
        marginBottom: 10,
    },
    locationCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    locationNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hqBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.primary[500],
    },
    locationStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    locationMeta: {
        marginTop: 8,
        gap: 2,
    },
    locationFooter: {
        marginTop: 10,
    },
    locationChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    geoBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[200],
    },
    locationModuleCount: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    locationTierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.accent[50],
        borderWidth: 1,
        borderColor: colors.accent[200],
    },
    // Contacts
    contactCard: {
        marginBottom: 10,
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    contactTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    contactDetails: {
        marginTop: 8,
        gap: 2,
    },
    // Shifts
    shiftCard: {
        marginTop: 10,
    },
    shiftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shiftMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    noShuffleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.warning[50],
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
    downtimeChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.neutral[100],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    // No. Series
    noSeriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    seriesCodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    // IOT
    iotSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    iotSummaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    iotSummaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.neutral[200],
        marginHorizontal: 12,
    },
    iotReasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    iotBadgeRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    iotTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    iotIdleBadge: {
        backgroundColor: colors.warning[50],
        borderColor: colors.warning[200],
    },
    iotAlarmBadge: {
        backgroundColor: colors.danger[50],
        borderColor: colors.danger[200],
    },
    plannedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.info[50],
        borderWidth: 1,
        borderColor: colors.info[200],
    },
    // Users
    userLimitsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userLimitInfo: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    userLimitDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.neutral[200],
        marginHorizontal: 12,
    },
    maxUserInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary[50],
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    maxUserTextField: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary[600],
        minWidth: 50,
        textAlign: 'center',
    },
    usageSection: {
        marginTop: 14,
        gap: 6,
    },
    usageBarBg: {
        height: 6,
        backgroundColor: colors.neutral[100],
        borderRadius: 3,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    userCard: {
        marginTop: 10,
    },
    userCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: colors.accent[50],
        borderWidth: 1,
        borderColor: colors.accent[200],
    },
    userMeta: {
        marginTop: 8,
        marginLeft: 46,
        gap: 2,
    },
    // Modules
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    moduleChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    moduleChipActive: {
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    moduleChipInactive: {
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    manageModulesButton: {
        marginTop: 14,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: colors.primary[50],
    },
    // Billing
    billingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    billingItem: {
        width: '50%',
        paddingVertical: 10,
        gap: 4,
    },
    customPricingBadge: {
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.accent[50],
    },
    // Status management
    statusCurrentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    statusTransitionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 14,
    },
});
