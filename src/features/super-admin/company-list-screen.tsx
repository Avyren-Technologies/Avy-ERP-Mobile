/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusBadge } from '@/components/ui/status-badge';

import { MODULE_CATALOGUE, USER_TIERS } from './tenant-onboarding/constants';
import type { UserTierKey } from './tenant-onboarding/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ TYPES ============

type WizardStatus = 'Draft' | 'Pilot' | 'Active' | 'Inactive';

interface CompanyItem {
    id: string;
    displayName: string;
    legalName: string;
    businessType: string;
    industry: string;
    status: WizardStatus;
    userCount: number;
    maxUsers: number;
    selectedModuleIds: string[];
    userTier: UserTierKey;
    billingCycle: 'monthly' | 'annual';
    adminEmail: string;
    endpointType: 'default' | 'custom';
    createdAt: string;
}

// Maps wizard status to StatusBadge variant
function toBadgeStatus(status: WizardStatus) {
    switch (status) {
        case 'Active': return 'active' as const;
        case 'Pilot': return 'trial' as const;
        case 'Inactive': return 'suspended' as const;
        case 'Draft': return 'pending' as const;
    }
}

// ============ MOCK DATA ============

const MOCK_COMPANIES: CompanyItem[] = [
    {
        id: '1',
        displayName: 'Apex Manufacturing Pvt. Ltd',
        legalName: 'Apex Manufacturing Private Limited',
        businessType: 'Private Limited',
        industry: 'Automotive',
        status: 'Active',
        userCount: 156,
        maxUsers: 500,
        selectedModuleIds: ['hr', 'production', 'machine-maintenance', 'inventory', 'vendor', 'finance', 'masters'],
        userTier: 'growth',
        billingCycle: 'annual',
        adminEmail: 'admin@apexmfg.com',
        endpointType: 'default',
        createdAt: '2025-06-15',
    },
    {
        id: '2',
        displayName: 'Steel Dynamics Industries',
        legalName: 'Steel Dynamics Industries Ltd',
        businessType: 'Public Limited',
        industry: 'Steel & Metal',
        status: 'Active',
        userCount: 412,
        maxUsers: 1000,
        selectedModuleIds: ['hr', 'security', 'production', 'machine-maintenance', 'inventory', 'vendor', 'sales', 'finance', 'masters'],
        userTier: 'scale',
        billingCycle: 'annual',
        adminEmail: 'it@steeldynamics.in',
        endpointType: 'custom',
        createdAt: '2025-03-22',
    },
    {
        id: '3',
        displayName: 'Sahara Industries Ltd',
        legalName: 'Sahara Industries Limited',
        businessType: 'Public Limited',
        industry: 'Textiles',
        status: 'Pilot',
        userCount: 23,
        maxUsers: 100,
        selectedModuleIds: ['hr', 'inventory', 'finance', 'masters'],
        userTier: 'starter',
        billingCycle: 'monthly',
        adminEmail: 'ops@saharaindustries.co.in',
        endpointType: 'default',
        createdAt: '2026-02-28',
    },
    {
        id: '4',
        displayName: 'Indo Metals Corporation',
        legalName: 'Indo Metals Corporation Pvt. Ltd',
        businessType: 'Private Limited',
        industry: 'Metal Fabrication',
        status: 'Active',
        userCount: 89,
        maxUsers: 100,
        selectedModuleIds: ['hr', 'production', 'inventory', 'vendor', 'finance', 'masters'],
        userTier: 'starter',
        billingCycle: 'monthly',
        adminEmail: 'admin@indometals.com',
        endpointType: 'default',
        createdAt: '2025-09-10',
    },
    {
        id: '5',
        displayName: 'Precision Machining Corp',
        legalName: 'Precision Machining Corporation Pvt. Ltd',
        businessType: 'Private Limited',
        industry: 'CNC Machining',
        status: 'Inactive',
        userCount: 0,
        maxUsers: 500,
        selectedModuleIds: ['hr', 'production', 'machine-maintenance', 'inventory', 'finance', 'masters'],
        userTier: 'growth',
        billingCycle: 'monthly',
        adminEmail: 'info@precmach.in',
        endpointType: 'default',
        createdAt: '2025-01-05',
    },
    {
        id: '6',
        displayName: 'GreenTech Polymers',
        legalName: 'GreenTech Polymers Pvt. Ltd',
        businessType: 'Private Limited',
        industry: 'Plastics & Rubber',
        status: 'Draft',
        userCount: 0,
        maxUsers: 100,
        selectedModuleIds: ['hr', 'inventory', 'masters'],
        userTier: 'starter',
        billingCycle: 'monthly',
        adminEmail: 'admin@greentechpoly.com',
        endpointType: 'default',
        createdAt: '2026-02-20',
    },
    {
        id: '7',
        displayName: 'Rathi Engineering Works',
        legalName: 'Rathi Engineering Works Pvt. Ltd',
        businessType: 'Private Limited',
        industry: 'Heavy Engineering',
        status: 'Active',
        userCount: 245,
        maxUsers: 1000,
        selectedModuleIds: ['hr', 'security', 'production', 'machine-maintenance', 'inventory', 'vendor', 'sales', 'masters'],
        userTier: 'scale',
        billingCycle: 'annual',
        adminEmail: 'erp@rathiengg.com',
        endpointType: 'custom',
        createdAt: '2025-04-18',
    },
    {
        id: '8',
        displayName: 'Vishwa Electronics',
        legalName: 'Vishwa Electronics Pvt. Ltd',
        businessType: 'Private Limited',
        industry: 'Electronics & Semiconductors',
        status: 'Pilot',
        userCount: 12,
        maxUsers: 100,
        selectedModuleIds: ['hr', 'inventory', 'masters'],
        userTier: 'starter',
        billingCycle: 'monthly',
        adminEmail: 'cto@vishwaelec.in',
        endpointType: 'default',
        createdAt: '2026-03-01',
    },
];

const FILTER_CHIPS = [
    { key: 'all', label: 'All', count: MOCK_COMPANIES.length },
    { key: 'Active', label: 'Active', count: MOCK_COMPANIES.filter(c => c.status === 'Active').length },
    { key: 'Pilot', label: 'Pilot', count: MOCK_COMPANIES.filter(c => c.status === 'Pilot').length },
    { key: 'Draft', label: 'Draft', count: MOCK_COMPANIES.filter(c => c.status === 'Draft').length },
    { key: 'Inactive', label: 'Inactive', count: MOCK_COMPANIES.filter(c => c.status === 'Inactive').length },
];

// ============ COMPANY CARD ============

function CompanyCard({ company, index }: { company: CompanyItem; index: number }) {
    const router = useRouter();

    const handlePress = () => {
        router.push(`/(app)/tenant/${company.id}`);
    };

    const usagePercent = company.maxUsers > 0 ? (company.userCount / company.maxUsers) * 100 : 0;
    const usageColor = usagePercent > 80 ? colors.warning[500] : colors.success[500];

    const tier = USER_TIERS.find((t) => t.key === company.userTier);
    const moduleCount = company.selectedModuleIds.length;
    const badgeStatus = toBadgeStatus(company.status);
    const isLive = company.status === 'Active' || company.status === 'Pilot';

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                ]}
            >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={styles.companyInfo}>
                        <LinearGradient
                            colors={company.status === 'Active'
                                ? [colors.primary[500], colors.accent[500]] as const
                                : company.status === 'Pilot'
                                    ? [colors.info[400], colors.info[600]] as const
                                    : [colors.neutral[400], colors.neutral[500]] as const
                            }
                            style={styles.companyAvatar}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {company.displayName.substring(0, 2).toUpperCase()}
                            </Text>
                        </LinearGradient>

                        <View style={styles.companyNameContainer}>
                            <Text
                                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                numberOfLines={1}
                            >
                                {company.displayName}
                            </Text>
                            <View style={styles.industryRow}>
                                <Text className="font-inter text-xs text-neutral-500">
                                    {company.industry}
                                </Text>
                                {company.endpointType === 'custom' && (
                                    <View style={styles.customServerTag}>
                                        <Text className="font-inter text-[9px] font-bold text-info-700">
                                            SELF-HOSTED
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                    <StatusBadge status={badgeStatus} size="sm" />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path
                                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <Circle cx="9" cy="7" r="4" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-neutral-600">
                            {company.userCount}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-400">
                            / {company.maxUsers}
                        </Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Rect x="3" y="3" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="14" y="3" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="3" y="14" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                            <Rect x="14" y="14" width="7" height="7" rx="1" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-neutral-600">
                            {moduleCount} modules
                        </Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <Text className="font-inter text-xs font-semibold text-primary-500">
                            {tier?.label ?? company.userTier}
                        </Text>
                        {company.billingCycle === 'annual' ? (
                            <View style={styles.annualBadge}>
                                <Text className="font-inter text-[8px] font-bold text-success-700">
                                    YR
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* User Usage Bar */}
                {isLive ? (
                    <View style={styles.usageBarContainer}>
                        <View style={styles.usageBarBg}>
                            <View
                                style={[
                                    styles.usageBarFill,
                                    {
                                        width: `${Math.min(usagePercent, 100)}%`,
                                        backgroundColor: usageColor,
                                    },
                                ]}
                            />
                        </View>
                        <Text className="font-inter text-[10px] font-medium text-neutral-400">
                            {Math.round(usagePercent)}% capacity
                        </Text>
                    </View>
                ) : null}

                {/* Module chips (first 4) */}
                {company.selectedModuleIds.length > 0 && (
                    <View style={styles.moduleChips}>
                        {company.selectedModuleIds.slice(0, 4).map((id) => {
                            const mod = MODULE_CATALOGUE.find((m) => m.id === id);
                            if (!mod) return null;
                            return (
                                <View key={id} style={styles.moduleChip}>
                                    <Text className="font-inter text-[9px] font-semibold text-primary-700">
                                        {mod.icon} {mod.name}
                                    </Text>
                                </View>
                            );
                        })}
                        {company.selectedModuleIds.length > 4 ? (
                            <View style={styles.moduleChipMore}>
                                <Text className="font-inter text-[9px] font-semibold text-neutral-500">
                                    +{company.selectedModuleIds.length - 4}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function CompanyListScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const filteredCompanies = React.useMemo(() => {
        let list = MOCK_COMPANIES;

        if (activeFilter !== 'all') {
            list = list.filter(c => c.status === activeFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                c =>
                    c.displayName.toLowerCase().includes(q) ||
                    c.legalName.toLowerCase().includes(q) ||
                    c.industry.toLowerCase().includes(q) ||
                    c.adminEmail.toLowerCase().includes(q),
            );
        }

        return list;
    }, [search, activeFilter]);

    const handleAddCompany = () => {
        router.push('/(app)/tenant/add-company');
    };

    const renderCompany = ({ item, index }: { item: CompanyItem; index: number }) => (
        <CompanyCard company={item} index={index} />
    );

    const activeCount = MOCK_COMPANIES.filter(c => c.status === 'Active').length;

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Companies
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {MOCK_COMPANIES.length} tenants · {activeCount} active
                    </Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search companies..."
                    filters={FILTER_CHIPS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24">
                <Path
                    d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"
                    stroke={colors.neutral[300]}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
            <Text className="mt-4 font-inter text-base font-semibold text-neutral-400">
                No companies found
            </Text>
            <Text className="mt-1 font-inter text-sm text-neutral-400">
                Try adjusting your search or filters
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={filteredCompanies}
                renderItem={renderCompany}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />

            <FAB onPress={handleAddCompany} />
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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 4,
    },
    searchSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    cardPressed: {
        backgroundColor: colors.primary[50],
        transform: [{ scale: 0.98 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    companyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    companyNameContainer: {
        flex: 1,
    },
    industryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 6,
    },
    customServerTag: {
        backgroundColor: colors.info[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 14,
        backgroundColor: colors.neutral[200],
    },
    annualBadge: {
        backgroundColor: colors.success[100],
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    usageBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8,
    },
    usageBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: colors.neutral[100],
        borderRadius: 2,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    moduleChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 10,
    },
    moduleChip: {
        backgroundColor: colors.primary[50],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    moduleChipMore: {
        backgroundColor: colors.neutral[100],
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
});
