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
import { usePTWList } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

/* ── Class badge ── */

const CLASS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    HOT_WORK: { label: 'Hot Work', bgColor: colors.danger[50], textColor: colors.danger[700] },
    CONFINED_SPACE: { label: 'Confined Space', bgColor: '#F5F3FF', textColor: '#6D28D9' },
    ELECTRICAL_ISOLATION: { label: 'Electrical', bgColor: colors.warning[50], textColor: colors.warning[700] },
    PRESSURE_RELEASE: { label: 'Pressure', bgColor: '#ECFEFF', textColor: '#0E7490' },
    GENERAL_WORK: { label: 'General', bgColor: colors.info[50], textColor: colors.info[700] },
};

function PTWClassBadge({ ptwClass }: { ptwClass: string }) {
    const cfg = CLASS_CONFIG[ptwClass] ?? { label: ptwClass, bgColor: colors.neutral[100], textColor: colors.neutral[600] };
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Status badge ── */

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
    REQUESTED: { label: 'Requested', bgColor: colors.info[50], textColor: colors.info[700] },
    UNDER_REVIEW: { label: 'Under Review', bgColor: colors.warning[50], textColor: colors.warning[700] },
    ISSUED: { label: 'Issued', bgColor: colors.success[50], textColor: colors.success[700] },
    ACTIVE: { label: 'Active', bgColor: '#ECFDF5', textColor: '#059669' },
    CLOSED: { label: 'Closed', bgColor: colors.neutral[100], textColor: colors.neutral[600] },
    EXPIRED: { label: 'Expired', bgColor: colors.neutral[100], textColor: colors.neutral[500] },
    REVOKED: { label: 'Revoked', bgColor: colors.danger[50], textColor: colors.danger[700] },
};

function PTWStatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.REQUESTED;
    return (
        <View style={[badgeStyles.badge, { backgroundColor: cfg.bgColor }]}>
            <Text className="font-inter" style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

/* ── Filters ── */

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'UNDER_REVIEW', label: 'Review' },
    { key: 'ISSUED', label: 'Issued' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'CLOSED', label: 'Closed' },
    { key: 'REVOKED', label: 'Revoked' },
];

/* ── Card ── */

function PTWCard({ item, index, isDark, onPress, fmt }: { item: any; index: number; isDark: boolean; onPress: () => void; fmt: CompanyFormatter }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <Pressable onPress={onPress} style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <View style={cardStyles.headerRow}>
                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                        <Text className="font-inter text-[10px] font-bold text-primary-700">{item.permitNumber ?? `PTW-${(item.id ?? '').slice(0, 6)}`}</Text>
                    </View>
                    <PTWStatusBadge status={item.status ?? 'REQUESTED'} />
                </View>

                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={2} style={{ marginTop: 8 }}>
                    {item.description || 'No description'}
                </Text>

                <View style={cardStyles.metaRow}>
                    <PTWClassBadge ptwClass={item.ptwClass ?? 'GENERAL_WORK'} />
                    <Text className="font-inter text-[10px] text-neutral-500">{item.asset?.name ?? '---'}</Text>
                </View>

                <View style={cardStyles.footerRow}>
                    <Text className="font-inter text-[10px] text-neutral-400">Requested: {item.createdAt ? fmt.date(item.createdAt) : '---'}</Text>
                    {item.issuedAt && <Text className="font-inter text-[10px] text-success-600">Issued: {fmt.date(item.issuedAt)}</Text>}
                </View>
            </Pressable>
        </Animated.View>
    );
}

/* ── Screen ── */

export function PTWListScreen() {
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

    const { data, isLoading, refetch, isRefetching } = usePTWList(params);
    const permits: any[] = (data as any)?.data ?? [];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="Permit to Work" onMenuPress={toggle} />

            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search permits..." />
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
            ) : permits.length === 0 ? (
                <EmptyState icon="search" title="No permits found" message={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first Permit to Work.'} />
            ) : (
                <FlashList
                    data={permits}
                    keyExtractor={(item: any) => item.id}

                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 80 }}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
                    renderItem={({ item, index }) => (
                        <PTWCard item={item} index={index} isDark={isDark} fmt={fmt} onPress={() => router.push({ pathname: '/maintenance/ptw-detail' as any, params: { id: item.id } })} />
                    )}
                />
            )}

            <FAB onPress={() => router.push('/maintenance/ptw-detail' as any)} />
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
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
});
