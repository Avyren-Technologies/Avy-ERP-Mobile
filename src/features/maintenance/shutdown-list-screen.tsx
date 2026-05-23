import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useShutdowns } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Type badge ── */

const TYPE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    PLANNED_OVERHAUL: { label: 'Overhaul', bgColor: colors.info[50], textColor: colors.info[700] },
    STATUTORY_INSPECTION: { label: 'Statutory', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    CORRECTIVE_MAJOR: { label: 'Corrective', bgColor: colors.danger[50], textColor: colors.danger[700] },
    COMMISSIONING: { label: 'Commission', bgColor: '#ECFDF5', textColor: '#059669' },
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    DRAFT: { label: 'Draft', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    APPROVED: { label: 'Approved', bgColor: colors.info[50], textColor: colors.info[700] },
    IN_PROGRESS: { label: 'In Progress', bgColor: colors.warning[50], textColor: colors.warning[700] },
    COMPLETED: { label: 'Completed', bgColor: colors.success[50], textColor: colors.success[700] },
    CANCELLED: { label: 'Cancelled', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

function Badge({ config, value }: { config: Record<string, { label: string; bgColor: string; textColor: string }>; value: string }) {
    const cfg = config[value] ?? { label: value, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Filters ── */

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'IN_PROGRESS', label: 'Active' },
    { key: 'COMPLETED', label: 'Done' },
];

/* ── Card ── */

function ShutdownCard({ item, index, isDark, onPress, fmt }: { item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter }) {
    const woCount = item._count?.workOrders ?? item.woCount ?? 0;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <View style={cardStyles.headerRow}>
                    <Badge config={TYPE_CONFIG} value={item.eventType ?? 'PLANNED_OVERHAUL'} />
                    <Badge config={STATUS_CONFIG} value={item.status ?? 'DRAFT'} />
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 8 }}>
                    {item.name ?? 'Untitled Shutdown'}
                </Text>

                <Text className="font-inter text-xs text-neutral-500" style={{ marginTop: 4 }}>
                    {item.location?.name ?? item.productionLine?.name ?? '---'}
                </Text>

                <View style={cardStyles.statsRow}>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">WOs</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{woCount}</Text>
                    </View>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">Budget</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.estimatedBudget ? Number(item.estimatedBudget).toLocaleString() : '---'}</Text>
                    </View>
                    <View style={cardStyles.stat}>
                        <Text className="font-inter text-[10px] text-neutral-400">Actual</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{item.actualCost ? Number(item.actualCost).toLocaleString() : '---'}</Text>
                    </View>
                </View>

                <View style={cardStyles.footerRow}>
                    <Text className="font-inter text-[10px] text-neutral-400">
                        {item.plannedStart ? fmt.date(item.plannedStart) : '---'} - {item.plannedEnd ? fmt.date(item.plannedEnd) : '---'}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function ShutdownListScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');

    const params: Record<string, unknown> = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;

    const { data, isLoading, refetch, isRefetching } = useShutdowns(params);
    const shutdowns: any[] = (data as any)?.data ?? [];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Shutdown Events" onMenuPress={toggle} />

            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search shutdowns..." />
            </View>

            {/* Filter chips */}
            <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.chipRow}>
                {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.key;
                    return (
                        <Pressable key={f.key} onPress={() => setStatusFilter(f.key)} style={[styles.chip, { backgroundColor: active ? colors.primary[600] : isDark ? '#1A1730' : colors.white, borderColor: active ? colors.primary[600] : isDark ? colors.primary[900] : colors.primary[100] }]}>
                            <Text className="font-inter" style={[styles.chipText, { color: active ? colors.white : isDark ? colors.primary[300] : colors.primary[700] }]}>{f.label}</Text>
                        </Pressable>
                    );
                })}
            </Animated.View>

            {isLoading ? (
                <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
            ) : shutdowns.length === 0 ? (
                <EmptyState icon="search" title="No shutdown events" message={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first shutdown event.'} />
            ) : (
                <FlashList
                    data={shutdowns}
                    keyExtractor={(item: any) => item.id}

                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 80 }}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
                    renderItem={({ item, index }) => (
                        <ShutdownCard item={item} index={index} isDark={isDark} fmt={fmt} onPress={() => router.push({ pathname: '/maintenance/shutdown-detail' as any, params: { id: item.id } })} />
                    )}
                />
            )}

            <FAB onPress={() => router.push('/maintenance/shutdown-detail' as any)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    chipRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 6, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
    chipText: { fontSize: 11, fontWeight: '700' },
});

const badgeStyles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    label: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

const cardStyles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    stat: { gap: 2 },
    footerRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
});
