/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
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

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { useAuditLogs, useAuditFilterOptions } from '@/features/super-admin/api/use-audit-queries';
import { useCompanyAuditLogs } from '@/features/company-admin/api/use-company-admin-queries';

// ============ TYPES ============

interface AuditLogItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    performedBy: string;
    timestamp: string;
    details?: Record<string, unknown>;
}

// ============ ACTION BADGE ============

function getActionColor(action: string) {
    const upper = action.toUpperCase();
    if (upper.startsWith('CREATE')) {
        return { bg: colors.success[50], text: colors.success[700], border: colors.success[200] };
    }
    if (upper.startsWith('UPDATE') || upper.startsWith('EDIT') || upper.startsWith('MODIFY')) {
        return { bg: colors.info[50], text: colors.info[700], border: colors.info[200] };
    }
    if (upper.startsWith('DELETE') || upper.startsWith('REMOVE')) {
        return { bg: colors.danger[50], text: colors.danger[700], border: colors.danger[200] };
    }
    return { bg: colors.neutral[100], text: colors.neutral[600], border: colors.neutral[200] };
}

function formatTimestamp(ts: string) {
    const d = new Date(ts);
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
}

// ============ AUDIT LOG CARD ============

function AuditLogCard({ item, index }: { item: AuditLogItem; index: number }) {
    const actionColor = getActionColor(item.action);
    const { date, time } = formatTimestamp(item.timestamp);

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 40)}>
            <View style={styles.card}>
                {/* Left: Action Badge */}
                <View
                    style={[
                        styles.actionBadge,
                        { backgroundColor: actionColor.bg, borderColor: actionColor.border },
                    ]}
                >
                    <Text
                        className="font-inter text-[9px] font-bold"
                        style={{ color: actionColor.text }}
                        numberOfLines={1}
                    >
                        {item.action.split('_')[0]}
                    </Text>
                </View>

                {/* Center: Action + Entity */}
                <View style={styles.cardCenter}>
                    <Text
                        className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                        numberOfLines={1}
                    >
                        {item.action}
                    </Text>
                    <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>
                        {item.entityType} {'\u2022'} {item.entityId}
                    </Text>
                    {item.performedBy ? (
                        <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1}>
                            by {item.performedBy}
                        </Text>
                    ) : null}
                </View>

                {/* Right: Timestamp */}
                <View style={styles.cardRight}>
                    <Text className="font-inter text-[10px] font-semibold text-neutral-500">
                        {date}
                    </Text>
                    <Text className="font-inter text-[10px] text-neutral-400">
                        {time}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

// ============ ROLE-AWARE AUDIT HOOKS ============

function useRoleAwareAuditLogs(params: {
    page: number;
    limit: number;
    action?: string;
    search?: string;
}) {
    const userRole = useAuthStore.use.userRole();
    const isCompanyAdmin = userRole === 'company-admin';

    const platformQuery = useAuditLogs(
        isCompanyAdmin ? {} : params,
    );
    const companyQuery = useCompanyAuditLogs(
        isCompanyAdmin ? { page: params.page, limit: params.limit, search: params.search } : undefined,
    );

    return isCompanyAdmin ? companyQuery : platformQuery;
}

export function AuditLogScreen() {
    const insets = useSafeAreaInsets();
    const userRole = useAuthStore.use.userRole();
    const isCompanyAdmin = userRole === 'company-admin';
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [page, setPage] = React.useState(1);

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset page when filter changes
    React.useEffect(() => {
        setPage(1);
    }, [activeFilter]);

    const actionParam = activeFilter !== 'all' ? activeFilter : undefined;
    const { data: response, isLoading, error, refetch, isFetching } = useRoleAwareAuditLogs({
        page,
        limit: 30,
        action: actionParam,
        search: debouncedSearch || undefined,
    });

    const { data: filtersResponse } = useAuditFilterOptions();

    // Parse response data
    const rawData = response?.data ?? response ?? [];
    const logs: AuditLogItem[] = React.useMemo(() => {
        const items = Array.isArray(rawData) ? rawData : (rawData as any)?.data ?? [];
        return items.map((item: any) => ({
            id: item.id ?? '',
            action: item.action ?? '',
            entityType: item.entityType ?? '',
            entityId: item.entityId ?? '',
            performedBy: item.performedBy ?? item.performedByUser?.name ?? item.userId ?? '',
            timestamp: item.timestamp ?? item.createdAt ?? '',
            details: item.details ?? {},
        }));
    }, [rawData]);

    const totalCount = (response?.data as any)?.meta?.total ?? (rawData as any)?.meta?.total ?? logs.length;

    // Build filter chips from API response
    const filterChips = React.useMemo(() => {
        const base = [{ key: 'all', label: 'All' }];
        const actionTypes: string[] = filtersResponse?.data?.actionTypes ?? [];
        const chips = actionTypes.map((a: string) => ({ key: a, label: a.replace(/_/g, ' ') }));
        return [...base, ...chips];
    }, [filtersResponse]);

    // Pagination
    const handleLoadMore = () => {
        if (!isFetching && logs.length >= 30 * page) {
            setPage((p) => p + 1);
        }
    };

    const renderItem = ({ item, index }: { item: AuditLogItem; index: number }) => (
        <AuditLogCard item={item} index={index} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
                        Audit Log
                    </Text>
                    <Text className="font-inter mt-1 text-sm text-neutral-500">
                        {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
                    </Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search audit logs..."
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
                    <SkeletonCard />
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                    <EmptyState
                        icon="error"
                        title="Failed to load audit logs"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon="inbox"
                    title="No audit logs"
                    message="There are no audit log entries matching your criteria."
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
                data={logs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={() => {
                            setPage(1);
                            refetch();
                        }}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            />
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
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.primary[50],
        gap: 12,
    },
    actionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardCenter: {
        flex: 1,
        gap: 2,
    },
    cardRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
});
