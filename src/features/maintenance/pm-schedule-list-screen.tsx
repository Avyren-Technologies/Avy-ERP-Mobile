/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { usePMSchedules } from '@/features/maintenance/api/use-maintenance-queries';
import { formatPMStrategyLabel } from '@/features/maintenance/pm-schedule-form';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

const PM_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'OVERDUE', label: 'Overdue' },
];

function PMCard({ item, index, isDark, onPress, fmt }: {
    item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter;
}) {
    const isOverdue = item.isOverdue || (item.nextDueDate && new Date(item.nextDueDate) < new Date());
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50], borderLeftWidth: isOverdue ? 3 : 1, borderLeftColor: isOverdue ? colors.danger[500] : (isDark ? colors.primary[900] : colors.primary[50]) }]}>
                <View style={cardStyles.headerRow}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1 }}>
                        {item.name ?? 'PM Schedule'}
                    </Text>
                    <View style={[cardStyles.statusBadge, { backgroundColor: item.isActive !== false ? colors.success[50] : colors.neutral[100] }]}>
                        <Text className={`font-inter text-[10px] font-bold ${item.isActive !== false ? 'text-success-700' : 'text-neutral-500'}`}>
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ marginTop: 4 }}>
                    {item.asset?.name ?? 'Unknown Asset'}
                </Text>

                <View style={cardStyles.detailsRow}>
                    <View style={[cardStyles.typeBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-accent-700">
                            {formatPMStrategyLabel(item.strategyType)}
                        </Text>
                    </View>
                    {isOverdue ? (
                        <View style={[cardStyles.overdueBadge]}>
                            <Text className="font-inter text-[10px] font-bold text-danger-700">Overdue</Text>
                        </View>
                    ) : null}
                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginLeft: 'auto' }}>
                        {item.nextDueDate ? `Due: ${fmt.date(item.nextDueDate)}` : 'No due date'}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export function PMScheduleListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const params: Record<string, unknown> = { search: search.trim() || undefined };
    if (activeFilter === 'ACTIVE') params.isActive = true;
    if (activeFilter === 'OVERDUE') params.isOverdue = true;

    const { data: response, isLoading, error, refetch, isFetching } = usePMSchedules(params);

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const items: any[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? items.length;

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <PMCard item={item} index={index} isDark={isDark} fmt={fmt} onPress={() => router.push({ pathname: '/maintenance/pm-schedule-detail' as any, params: { id: item.id } })} />
    );

    const renderHeader = () => (
        <View style={{ gap: 16, marginBottom: 20 }}>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader title="PM Schedules" subtitle={`${totalCount} schedule${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} />
            </Animated.View>
            <Animated.View entering={FadeIn.duration(400).delay(150)}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search PM schedules..." filters={PM_FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </Animated.View>
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        return <EmptyState icon="search" title="No PM schedules found" message="Try adjusting your search or create a new schedule." />;
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <FlashList data={items} renderItem={renderItem} keyExtractor={(item) => item.id} ListHeaderComponent={renderHeader} ListEmptyComponent={renderEmpty} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />} />
            <FAB onPress={() => router.push('/maintenance/pm-schedule-create' as any)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});

const cardStyles = StyleSheet.create({
    card: { borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    detailsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100], gap: 8, flexWrap: 'wrap' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    overdueBadge: { backgroundColor: colors.danger[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
