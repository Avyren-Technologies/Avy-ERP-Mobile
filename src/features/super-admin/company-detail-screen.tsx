/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
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

import { MODULE_CATALOGUE, USER_TIERS } from './tenant-onboarding/constants';
import type { UserTierKey } from './tenant-onboarding/types';

// ============ TYPES ============

type WizardStatus = 'Draft' | 'Pilot' | 'Active' | 'Inactive';

interface CompanyDetail {
    id: string;
    displayName: string;
    legalName: string;
    businessType: string;
    industry: string;
    status: WizardStatus;
    // Statutory
    pan: string;
    gstin: string;
    pfRegNo: string;
    // Address
    hqAddress: string;
    city: string;
    state: string;
    // Contacts
    adminEmail: string;
    adminPhone: string;
    // Fiscal
    fyType: string;
    payrollFreq: string;
    // Modules & tier
    selectedModuleIds: string[];
    userTier: UserTierKey;
    // Users
    userCount: number;
    maxUsers: number;
    // Billing
    billingCycle: 'monthly' | 'annual';
    nextRenewal: string;
    monthlyAmount: string;
    customPricing: boolean;
    trialDays: number;
    // Endpoint
    endpointType: 'default' | 'custom';
    endpointUrl: string;
    // Meta
    createdAt: string;
    lastActive: string;
}

// ============ MOCK DATA ============

const MOCK_DETAIL: CompanyDetail = {
    id: '1',
    displayName: 'Apex Manufacturing Pvt. Ltd',
    legalName: 'Apex Manufacturing Private Limited',
    businessType: 'Private Limited',
    industry: 'Automotive',
    status: 'Active',
    pan: 'AABCA1234H',
    gstin: '27AABCA1234H1Z5',
    pfRegNo: 'MH/PUN/0112345',
    hqAddress: 'Plot 45, MIDC Industrial Area',
    city: 'Pune',
    state: 'Maharashtra',
    adminEmail: 'admin@apexmfg.com',
    adminPhone: '+91 98765 43210',
    fyType: 'apr-mar',
    payrollFreq: 'Monthly',
    selectedModuleIds: ['hr', 'security', 'production', 'machine-maintenance', 'inventory', 'vendor', 'finance'],
    userTier: 'growth',
    userCount: 156,
    maxUsers: 500,
    billingCycle: 'annual',
    nextRenewal: '2026-06-15',
    monthlyAmount: '₹1,84,500',
    customPricing: false,
    trialDays: 0,
    endpointType: 'default',
    endpointUrl: 'https://api.avyerp.com',
    createdAt: '2025-06-15',
    lastActive: '2 hours ago',
};

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

function SectionHeader({ title, iconType }: { title: string; iconType: string }) {
    return (
        <View style={styles.sectionHeader}>
            <SectionIcon type={iconType} color={colors.primary[500]} />
            <Text className="font-inter text-sm font-bold text-primary-900">
                {title}
            </Text>
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
        case 'server':
            return (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Rect x="2" y="2" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Rect x="2" y="14" width="20" height="8" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
                    <Circle cx="6" cy="6" r="1" fill={color} />
                    <Circle cx="6" cy="18" r="1" fill={color} />
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

// ============ MAIN COMPONENT ============

export function CompanyDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [company] = React.useState(MOCK_DETAIL);
    const [endpointType, setEndpointType] = React.useState<'default' | 'custom'>(company.endpointType);
    const [customUrl, setCustomUrl] = React.useState(company.endpointType === 'custom' ? company.endpointUrl : '');
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [maxUsers, setMaxUsers] = React.useState(String(company.maxUsers));
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    const usagePercent = company.maxUsers > 0 ? (company.userCount / company.maxUsers) * 100 : 0;
    const tier = USER_TIERS.find((t) => t.key === company.userTier);
    const badgeStatus = toBadgeStatus(company.status);

    const handleVerifyEndpoint = () => {
        setIsVerifying(true);
        setTimeout(() => setIsVerifying(false), 1500);
    };

    const handleSuspend = () => {
        showConfirm({
            title: 'Suspend Tenant',
            message: `Are you sure you want to suspend ${company.displayName}? All users will immediately lose access.`,
            variant: 'warning',
            confirmText: 'Suspend',
            onConfirm: () => {
                // TODO: API call to suspend tenant
            },
        });
    };

    const handleActivate = () => {
        showConfirm({
            title: 'Activate Tenant',
            message: `Activate ${company.displayName}? Users will regain access immediately.`,
            variant: 'primary',
            confirmText: 'Activate',
            onConfirm: () => {
                // TODO: API call to activate tenant
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
                // TODO: API call to delete tenant
                router.back();
            },
        });
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
                            <LinearGradient
                                colors={[colors.accent[300], colors.primary[400]]}
                                style={styles.companyLargeAvatar}
                            >
                                <Text className="font-inter text-xl font-bold text-white">
                                    {company.displayName.substring(0, 2).toUpperCase()}
                                </Text>
                            </LinearGradient>

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
                                    {tier?.label ?? company.userTier}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    User Tier
                                </Text>
                            </View>
                            <View style={styles.quickStatDivider} />
                            <View style={styles.quickStat}>
                                <Text className="font-inter text-lg font-bold text-white">
                                    {company.lastActive}
                                </Text>
                                <Text className="font-inter text-[10px] font-medium text-primary-200">
                                    Last Active
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <View style={styles.body}>
                    {/* ---- Company Information ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.section}>
                        <SectionHeader title="Company Information" iconType="info" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Admin Email" value={company.adminEmail} />
                            <InfoRow label="Admin Phone" value={company.adminPhone} />
                            <InfoRow label="Registered" value={company.createdAt} />
                            <InfoRow label="FY Type" value={company.fyType === 'apr-mar' ? 'April–March (India)' : company.fyType} />
                            <InfoRow label="Payroll Frequency" value={company.payrollFreq} />
                        </View>
                    </Animated.View>

                    {/* ---- Statutory & Tax ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.section}>
                        <SectionHeader title="Statutory & Tax" iconType="statutory" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="PAN" value={company.pan} />
                            <InfoRow label="GSTIN" value={company.gstin || '—'} />
                            <InfoRow label="PF Registration" value={company.pfRegNo || '—'} />
                        </View>
                    </Animated.View>

                    {/* ---- Address ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.section}>
                        <SectionHeader title="Registered Address" iconType="address" />
                        <View style={styles.sectionCard}>
                            <InfoRow label="Address" value={company.hqAddress} />
                            <InfoRow label="City" value={company.city} />
                            <InfoRow label="State" value={company.state} />
                        </View>
                    </Animated.View>

                    {/* ---- Server Endpoint ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
                        <SectionHeader title="Backend Endpoint" iconType="server" />
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
                                        https://api.avyerp.com
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
                                            {isVerifying ? 'Verifying...' : '🔗 Verify Endpoint'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- User Limits ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
                        <SectionHeader title="User Tier & Limits" iconType="users" />
                        <View style={styles.sectionCard}>
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
                    </Animated.View>

                    {/* ---- Modules ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.section}>
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
                                    Manage Modules →
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* ---- Subscription & Billing ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
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
                                <View style={styles.billingItem}>
                                    <Text className="font-inter text-xs text-neutral-500">Amount</Text>
                                    <Text className="font-inter text-sm font-bold text-success-600">
                                        {company.monthlyAmount}/mo
                                    </Text>
                                </View>
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
                                        ⭐ Custom Pricing Applied
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* ---- Tenant Actions ---- */}
                    <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.section}>
                        <Text className="mb-3 font-inter text-sm font-bold text-neutral-500">
                            Tenant Actions
                        </Text>
                        <View style={styles.actionsRow}>
                            {company.status === 'Active' && (
                                <Pressable onPress={handleSuspend} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.warning[500], colors.warning[600]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M10 9v6M14 9v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                                            <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5" fill="none" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Suspend</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                            {company.status === 'Inactive' && (
                                <Pressable onPress={handleActivate} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.success[500], colors.success[600]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Activate</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                            {company.status === 'Draft' && (
                                <Pressable onPress={handleActivate} style={styles.actionButton}>
                                    <LinearGradient
                                        colors={[colors.primary[500], colors.primary[700]]}
                                        style={styles.actionGradient}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text className="ml-2 font-inter text-xs font-bold text-white">Provision</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
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
                                    <Text className="ml-2 font-inter text-xs font-bold text-white">Delete</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>

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
