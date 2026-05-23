import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useContracts } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Type config ── */

const TYPE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    WARRANTY: { label: 'Warranty', bgColor: colors.info[50], textColor: colors.info[700] },
    AMC: { label: 'AMC', bgColor: colors.accent[50], textColor: colors.accent[700] },
    CAMC: { label: 'CAMC', bgColor: colors.success[50], textColor: colors.success[700] },
    RENTAL: { label: 'Rental', bgColor: colors.warning[50], textColor: colors.warning[700] },
    SERVICE: { label: 'Service', bgColor: '#ECFDF5', textColor: '#047857' },
};

function ContractTypeBadge({ type }: { type: string }) {
    const cfg = TYPE_CONFIG[type] ?? { label: type, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Expiry badge ── */

function ExpiryBadge({ endDate }: { endDate: string }) {
    if (!endDate) return null;
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    let bgColor = colors.success[50];
    let textColor = colors.success[700];
    let label = `${daysLeft}d`;

    if (daysLeft < 0) { bgColor = colors.neutral[100]; textColor = colors.neutral[500]; label = 'Expired'; }
    else if (daysLeft <= 30) { bgColor = colors.danger[50]; textColor = colors.danger[700]; }
    else if (daysLeft <= 90) { bgColor = colors.warning[50]; textColor = colors.warning[700]; }

    return (
        <View style={[badgeStyles.badge, { backgroundColor: bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: textColor }]}>{label}</Text>
        </View>
    );
}

/* ── Filters ── */

const CONTRACT_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'WARRANTY', label: 'Warranty' },
    { key: 'AMC', label: 'AMC' },
    { key: 'CAMC', label: 'CAMC' },
    { key: 'RENTAL', label: 'Rental' },
    { key: 'SERVICE', label: 'Service' },
];

/* ── Card ── */

function ContractCard({
    item,
    index,
    isDark,
    onPress,
    fmt,
}: {
    item: any;
    index: number;
    isDark: boolean;
    onPress: () => void;
    fmt: CompanyFormatter;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {item.code ?? 'CTR'}
                        </Text>
                    </View>
                    <ExpiryBadge endDate={item.endDate} />
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 8 }}>
                    {item.name ?? 'Unnamed Contract'}
                </Text>

                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 4 }}>
                    {item.vendorName ?? 'No vendor'}
                </Text>

                <View style={cardStyles.detailsRow}>
                    <ContractTypeBadge type={item.contractType ?? 'AMC'} />
                    <Text className="font-inter text-[10px] text-neutral-400">
                        {item.callsUsed ?? 0}/{item.callLimit ?? 'Unlimited'} calls
                    </Text>
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.startDate ? fmt.date(item.startDate) : ''} - {item.endDate ? fmt.date(item.endDate) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function ContractListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const typeParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useContracts({
        search: search.trim() || undefined,
        contractType: typeParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <ContractCard
            item={item}
            index={index}
            isDark={isDark}
            fmt={fmt}
            onPress={() => router.push({ pathname: '/maintenance/contract-detail' as any, params: { id: item.id } })}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Contracts"
                    subtitle={`${totalCount} contract${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search contracts..."
                    filters={CONTRACT_FILTERS}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }
        if (error) {
            return (
                <View style={{ paddingTop: 40 }}>
                    <EmptyState
                        icon="error"
                        title="Failed to load contracts"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return <EmptyState icon="search" title="No contracts found" message="Add a maintenance contract to get started." />;
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <FlashList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    label: { fontSize: 10, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
        flexWrap: 'wrap',
    },
});
