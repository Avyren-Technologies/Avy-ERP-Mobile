import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useDowntimeList } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Category config ── */

const CATEGORY_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    BREAKDOWN: { label: 'Breakdown', bgColor: colors.danger[50], textColor: colors.danger[700] },
    PLANNED: { label: 'Planned', bgColor: colors.info[50], textColor: colors.info[700] },
    CHANGEOVER: { label: 'Changeover', bgColor: colors.warning[50], textColor: colors.warning[700] },
    SETUP: { label: 'Setup', bgColor: colors.accent[50], textColor: colors.accent[700] },
    IDLE: { label: 'Idle', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    EXTERNAL: { label: 'External', bgColor: '#ECFDF5', textColor: '#047857' },
};

function CategoryBadge({ category }: { category: string }) {
    const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.IDLE;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Filters ── */

const DT_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'BREAKDOWN', label: 'Breakdown' },
    { key: 'PLANNED', label: 'Planned' },
    { key: 'CHANGEOVER', label: 'Changeover' },
    { key: 'SETUP', label: 'Setup' },
];

/* ── Helpers ── */

function formatDuration(minutes: number | string | null): string {
    if (!minutes) return '---';
    const m = Number(minutes);
    if (isNaN(m)) return String(minutes);
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
}

/* ── Card ── */

function DowntimeCard({
    item,
    index,
    isDark,
    fmt,
}: {
    item: any;
    index: number;
    isDark: boolean;
    fmt: CompanyFormatter;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <View
                style={[
                    cardStyles.card,
                    {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.primary[900] : colors.primary[50],
                    },
                ]}
            >
                <View style={cardStyles.headerRow}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1 }}>
                        {item.asset?.name ?? 'Unknown Asset'}
                    </Text>
                    <CategoryBadge category={item.category ?? 'IDLE'} />
                </View>

                <View style={cardStyles.timeRow}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[10px] text-neutral-400">Start</Text>
                        <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            {item.startTime ? fmt.dateTime(item.startTime) : '---'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[10px] text-neutral-400">End</Text>
                        <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            {item.endTime ? fmt.dateTime(item.endTime) : 'Ongoing'}
                        </Text>
                    </View>
                    <View>
                        <Text className="font-inter text-[10px] text-neutral-400">Duration</Text>
                        <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-400">
                            {formatDuration(item.durationMinutes)}
                        </Text>
                    </View>
                </View>

                {item.rootCause ? (
                    <Text className="font-inter text-[10px] text-neutral-400" numberOfLines={1} style={{ marginTop: 8 }}>
                        Cause: {item.rootCause}
                    </Text>
                ) : null}
            </View>
        </Animated.View>
    );
}

/* ── Screen ── */

export function DowntimeHistoryScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const categoryParam = activeFilter === 'all' ? undefined : activeFilter;
    const { data: response, isLoading, error, refetch, isFetching } = useDowntimeList({
        search: search.trim() || undefined,
        category: categoryParam,
    });

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <DowntimeCard item={item} index={index} isDark={isDark} fmt={fmt} />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Downtime History"
                    subtitle={`${totalCount} record${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by asset..."
                    filters={DT_FILTERS}
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
                        title="Failed to load downtime"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState icon="search" title="No downtime records" message="No downtime events recorded yet." />
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    timeRow: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 12,
    },
});
