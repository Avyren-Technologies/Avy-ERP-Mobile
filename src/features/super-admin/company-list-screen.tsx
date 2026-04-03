/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    RefreshControl,
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
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { MODULE_CATALOGUE, USER_TIERS } from './tenant-onboarding/constants';
import type { UserTierKey } from './tenant-onboarding/types';

import { useTenantList } from '@/features/super-admin/api/use-tenant-queries';

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
    locationCount: number;
    multiLocationMode: boolean;
    primaryContact: string;
    primaryDesignation: string;
    slug: string;
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

// ============ API DATA MAPPER ============

function mapApiCompany(item: any): CompanyItem {
    return {
        id: item.id ?? '',
        displayName: item.displayName ?? item.name ?? '',
        legalName: item.legalName ?? '',
        businessType: item.businessType ?? '',
        industry: item.industry ?? '',
        status: (item.wizardStatus ?? 'Draft') as WizardStatus,
        userCount: item._count?.users ?? item.userCount ?? 0,
        maxUsers: item.maxUsers ?? 100,
        selectedModuleIds: item.selectedModuleIds ?? [],
        userTier: (item.userTier ?? 'starter') as UserTierKey,
        billingCycle: item.billingCycle ?? 'monthly',
        adminEmail: item.emailDomain ? `admin@${item.emailDomain}` : (item.adminEmail ?? ''),
        endpointType: (item.endpointType ?? 'default') as 'default' | 'custom',
        createdAt: item.createdAt ?? '',
        locationCount: item._count?.locations ?? item.locationCount ?? 0,
        multiLocationMode: item.multiLocationMode ?? false,
        primaryContact: item.contacts?.[0]?.name ?? item.primaryContact ?? '',
        primaryDesignation: item.contacts?.[0]?.designation ?? item.primaryDesignation ?? '',
        slug: item.tenant?.slug ?? item.slug ?? '',
    };
}

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
                            {company.slug ? (
                                <Text className="font-inter text-[10px] text-primary-400" numberOfLines={1}>
                                    {company.slug}.avyren.in
                                </Text>
                            ) : null}
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
                        ) : (
                            <View style={styles.monthlyBadge}>
                                <Text className="font-inter text-[8px] font-bold text-neutral-500">
                                    MO
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Location + Contact Row */}
                <View style={styles.locationContactRow}>
                    <View style={styles.locationInfo}>
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                            <Path
                                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Circle cx="12" cy="10" r="3" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-[10px] font-medium text-neutral-500">
                            {company.locationCount} {company.locationCount === 1 ? 'location' : 'locations'}
                        </Text>
                        {company.multiLocationMode && (
                            <View style={styles.multiLocationBadge}>
                                <Text className="font-inter text-[8px] font-bold text-accent-700">
                                    MULTI
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.contactInfo}>
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                            <Path
                                d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                stroke={colors.neutral[400]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <Circle cx="12" cy="7" r="4" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                        </Svg>
                        <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                            {company.primaryContact}, {company.primaryDesignation}
                        </Text>
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
    const [page, setPage] = React.useState(1);
    const [allCompanies, setAllCompanies] = React.useState<CompanyItem[]>([]);

    const statusParam = activeFilter !== 'all' ? activeFilter : undefined;
    const searchParam = search.trim() || undefined;

    const { data: response, isLoading, error, refetch, isFetching } = useTenantList({
        search: searchParam,
        status: statusParam,
        page,
        limit: 25,
    });

    const meta = (response as any)?.meta;
    const rawData = response?.data ?? response ?? [];
    const pageCompanies: CompanyItem[] = React.useMemo(() => {
        if (!Array.isArray(rawData)) return [];
        return rawData.map(mapApiCompany);
    }, [rawData]);

    // Accumulate companies across pages; reset when filters change
    const filterKey = `${searchParam ?? ''}|${statusParam ?? ''}`;
    const prevFilterKey = React.useRef(filterKey);

    React.useEffect(() => {
        if (prevFilterKey.current !== filterKey) {
            // Filters changed — reset
            prevFilterKey.current = filterKey;
            setPage(1);
            setAllCompanies([]);
            return;
        }
        if (pageCompanies.length === 0) return;
        if (page === 1) {
            setAllCompanies(pageCompanies);
        } else {
            setAllCompanies(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newItems = pageCompanies.filter(c => !existingIds.has(c.id));
                return [...prev, ...newItems];
            });
        }
    }, [pageCompanies, page, filterKey]);

    const companies = allCompanies;
    const totalCount = meta?.total ?? companies.length;
    const activeCount = companies.filter(c => c.status === 'Active').length;
    const hasNextPage = meta ? page < meta.totalPages : false;
    const isFetchingNextPage = isFetching && page > 1;

    const filterChips = React.useMemo(() => [
        { key: 'all', label: 'All', count: totalCount },
        { key: 'Active', label: 'Active', count: undefined as number | undefined },
        { key: 'Pilot', label: 'Pilot', count: undefined as number | undefined },
        { key: 'Draft', label: 'Draft', count: undefined as number | undefined },
        { key: 'Inactive', label: 'Inactive', count: undefined as number | undefined },
    ], [totalCount]);

    const handleAddCompany = () => {
        router.push('/(app)/tenant/add-company');
    };

    const renderCompany = ({ item, index }: { item: CompanyItem; index: number }) => (
        <CompanyCard company={item} index={index} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Companies
                    </Text>
                    <Text className="mt-1 font-inter text-sm text-neutral-500">
                        {totalCount} tenants · {activeCount} active
                    </Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search companies..."
                    filters={filterChips}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 24 }]}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                    <EmptyState
                        icon="error"
                        title="Failed to load companies"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon="search"
                    title="No companies found"
                    message="Try adjusting your search or filters."
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={companies}
                renderItem={renderCompany}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={colors.primary[500]} />
                            <Text className="font-inter text-xs text-neutral-400 ml-2">
                                Loading more...
                            </Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={() => {
                    if (hasNextPage && !isFetching) {
                        setPage(prev => prev + 1);
                    }
                }}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading && !isFetchingNextPage}
                        onRefresh={() => {
                            setPage(1);
                            setAllCompanies([]);
                            refetch();
                        }}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
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
    monthlyBadge: {
        backgroundColor: colors.neutral[100],
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    locationContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    multiLocationBadge: {
        backgroundColor: colors.accent[50],
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
        marginLeft: 12,
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
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
});
