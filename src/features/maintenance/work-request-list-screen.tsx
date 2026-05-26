/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
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
import { useWorkRequests } from '@/features/maintenance/api/use-maintenance-queries';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

// ============ HELPERS ============

const WR_STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'UNDER_REVIEW', label: 'Under Review' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CONVERTED', label: 'Converted' },
    { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
    SUBMITTED: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
    UNDER_REVIEW: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
    APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
    CONVERTED: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
    REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
    CANCELLED: { bg: colors.neutral[100], text: colors.neutral[500], dot: colors.neutral[400] },
};

const TYPE_LABELS: Record<string, string> = {
    BREAKDOWN: 'Breakdown',
    PLANNED_SERVICE: 'Planned Service',
    INSPECTION: 'Inspection',
    REPLACEMENT: 'Replacement',
    SAFETY: 'Safety',
    CORRECTIVE: 'Corrective',
    OTHER: 'Other',
};

function getStatusColor(status: string) {
    return STATUS_COLOR[status] ?? { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
}

// ============ CARD ============

function WRCard({
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
    const sc = getStatusColor(item.status);

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
                {/* Header */}
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-info-700">
                            {item.requestNumber ?? 'WR-???'}
                        </Text>
                    </View>
                    <View style={[cardStyles.statusBadge, { backgroundColor: sc.bg }]}>
                        <View style={[cardStyles.statusDot, { backgroundColor: sc.dot }]} />
                        <Text style={{ color: sc.text }} className="font-inter text-[10px] font-bold">
                            {(item.status ?? '').replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>

                {/* Asset name */}
                <Text
                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                    numberOfLines={1}
                    style={{ marginTop: 8 }}
                >
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>

                {item.description ? (
                    <Text
                        className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                        numberOfLines={2}
                        style={{ marginTop: 4 }}
                    >
                        {item.description}
                    </Text>
                ) : null}

                {/* Bottom row */}
                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                            {TYPE_LABELS[item.requestType] ?? item.requestType}
                        </Text>
                    </View>
                    <PriorityBadge priority={item.priority ?? 'MEDIUM'} />
                    {item.safetyRisk ? (
                        <View style={[cardStyles.safetyBadge]}>
                            <Text className="font-inter text-[10px] font-bold text-danger-700">Safety</Text>
                        </View>
                    ) : null}
                    <Text
                        className="font-inter text-[10px] text-neutral-400"
                        style={{ marginLeft: 'auto' }}
                    >
                        {item.createdAt ? fmt.date(item.createdAt) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============ MAIN ============

export function WorkRequestListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const statusParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useWorkRequests({
        search: search.trim() || undefined,
        status: statusParam,
    });

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <WRCard
            item={item}
            index={index}
            isDark={isDark}
            fmt={fmt}
            onPress={() => router.push({ pathname: '/maintenance/work-request-detail' as any, params: { id: item.id } })}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Work Requests"
                    subtitle={`${totalCount} request${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search requests..."
                    filters={WR_STATUS_FILTERS}
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
                        title="Failed to load requests"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No work requests found"
                message="Try adjusting your search or filters, or raise a new request."
            />
        );
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
            <FAB onPress={() => router.push('/maintenance/work-request-create')} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
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
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    safetyBadge: {
        backgroundColor: colors.danger[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
});
