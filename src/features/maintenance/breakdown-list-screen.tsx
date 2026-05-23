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
import { useBreakdowns } from '@/features/maintenance/api/use-maintenance-queries';
import { useResolveBreakdown } from '@/features/maintenance/api/use-maintenance-mutations';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Status badge ── */

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    OPEN: { label: 'Open', bgColor: colors.danger[50], textColor: colors.danger[700] },
    ASSIGNED: { label: 'Assigned', bgColor: colors.info[50], textColor: colors.info[700] },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700] },
    RESOLVED: { label: 'Resolved', bgColor: colors.success[50], textColor: colors.success[700] },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
};

function BreakdownStatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Live timer ── */

function LiveTimer({ startedAt }: { startedAt: string }) {
    const [elapsed, setElapsed] = React.useState('');

    React.useEffect(() => {
        const start = new Date(startedAt).getTime();
        const tick = () => {
            const diff = Date.now() - start;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setElapsed(`${h}h ${m}m`);
        };
        tick();
        const id = setInterval(tick, 60000);
        return () => clearInterval(id);
    }, [startedAt]);

    return (
        <View style={[badgeStyles.badge, { backgroundColor: colors.danger[50] }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: colors.danger[700] }]}>{elapsed}</Text>
        </View>
    );
}

/* ── Filters ── */

const BD_STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
];

/* ── Card ── */

function BreakdownCard({
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
    const isActive = item.status === 'OPEN' || item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED';

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable
                onPress={onPress}
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.danger[900] : isActive ? colors.danger[100] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-danger-700">
                            {item.workOrder?.woNumber ?? item.woNumber ?? 'BD'}
                        </Text>
                    </View>
                    <BreakdownStatusBadge status={item.status ?? 'OPEN'} />
                </View>

                <Text
                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                    numberOfLines={1}
                    style={{ marginTop: 8 }}
                >
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>

                {item.description ? (
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2} style={{ marginTop: 4 }}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={cardStyles.detailsRow}>
                    <PriorityBadge priority={item.priority ?? 'EMERGENCY'} />
                    {isActive && item.reportedAt ? <LiveTimer startedAt={item.reportedAt} /> : null}
                    {item.rootCause ? (
                        <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1} style={{ flex: 1 }}>
                            {item.rootCause}
                        </Text>
                    ) : null}
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.reportedAt ? fmt.date(item.reportedAt) : ''}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function BreakdownListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const statusParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useBreakdowns({
        search: search.trim() || undefined,
        status: statusParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <BreakdownCard
            item={item}
            index={index}
            isDark={isDark}
            fmt={fmt}
            onPress={() => {
                if (item.workOrder?.id) {
                    router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: item.workOrder.id } });
                }
            }}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Breakdowns"
                    subtitle={`${totalCount} breakdown${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search breakdowns..."
                    filters={BD_STATUS_FILTERS}
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
                        title="Failed to load breakdowns"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No breakdowns found"
                message="No active breakdowns. Log a new one when equipment fails."
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
            <FAB onPress={() => router.push('/maintenance/breakdown-log' as any)} />
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
