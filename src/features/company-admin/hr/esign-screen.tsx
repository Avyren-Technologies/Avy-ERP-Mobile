/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useDispatchESign } from '@/features/company-admin/api/use-recruitment-mutations';
import { useESignStatus, usePendingESign } from '@/features/company-admin/api/use-recruitment-queries';

// ============ TYPES ============

interface ESignRecord {
    id: string;
    letterType: string;
    employeeName: string;
    dispatchedAt: string;
    status: 'PENDING' | 'SIGNED' | 'DECLINED';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: colors.warning[50], text: 'text-warning-700' },
    SIGNED: { bg: colors.success[50], text: 'text-success-700' },
    DECLINED: { bg: colors.danger[50], text: 'text-danger-600' },
};

const STATUS_FILTERS = ['All', 'PENDING', 'SIGNED', 'DECLINED'];

// ============ BADGES ============

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.PENDING;
    return (
        <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
            <Text className={`font-inter text-[10px] font-bold ${c.text}`}>{status}</Text>
        </View>
    );
}

// ============ STAT CARD ============

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const bgMap: Record<string, string> = {
        warning: colors.warning[50],
        success: colors.success[50],
        danger: colors.danger[50],
    };
    const textMap: Record<string, string> = {
        warning: 'text-warning-700',
        success: 'text-success-700',
        danger: 'text-danger-600',
    };
    return (
        <View style={[styles.statCard, { backgroundColor: bgMap[color] ?? colors.neutral[50] }]}>
            <Text className={`font-inter text-xl font-bold ${textMap[color] ?? 'text-neutral-700'}`}>{value}</Text>
            <Text className="font-inter text-[10px] font-bold text-neutral-500 mt-0.5">{label}</Text>
        </View>
    );
}

// ============ FILTER CHIPS ============

function FilterChips({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {STATUS_FILTERS.map(f => {
                const active = f === value;
                return (
                    <Pressable key={f} onPress={() => onSelect(f)} style={[styles.chip, active && styles.chipActive]}>
                        <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{f}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ============ ESIGN CARD ============

function ESignCard({ item, index, onResend, isResending }: { item: ESignRecord; index: number; onResend: () => void; isResending: boolean }) {
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.letterType ?? 'HR Letter'}</Text>
                            <StatusBadge status={item.status} />
                        </View>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">{item.employeeName}</Text>
                    </View>
                    {item.status === 'PENDING' && (
                        <Pressable onPress={onResend} disabled={isResending} style={styles.resendBtn}>
                            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke={colors.primary[600]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                            <Text className="font-inter text-[10px] font-bold text-primary-600 ml-1">Resend</Text>
                        </Pressable>
                    )}
                </View>
                <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                        <Text className="font-inter text-[10px] text-neutral-500">
                            Dispatched: {item.dispatchedAt ? new Date(item.dispatchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ MAIN COMPONENT ============

export function ESignScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('All');

    const queryStatus = statusFilter === 'All' ? undefined : statusFilter;
    const { data: response, isLoading, error, refetch, isFetching } = usePendingESign();
    const { data: statsData } = useESignStatus('__overview__');
    const dispatchMutation = useDispatchESign();

    const stats: any = (statsData as any)?.data ?? { pending: 0, signedThisMonth: 0, declined: 0 };

    const records: ESignRecord[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw;
    }, [response]);

    const filtered = React.useMemo(() => {
        if (!search.trim()) return records;
        const q = search.toLowerCase();
        return records.filter(r => r.employeeName?.toLowerCase().includes(q) || r.letterType?.toLowerCase().includes(q));
    }, [records, search]);

    const handleResend = (id: string) => {
        dispatchMutation.mutate({ id } as any);
    };

    const renderItem = ({ item, index }: { item: ESignRecord; index: number }) => (
        <ESignCard item={item} index={index} onResend={() => handleResend(item.id)} isResending={dispatchMutation.isPending} />
    );

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <Text className="font-inter text-2xl font-bold text-primary-950">E-Signatures</Text>
            <Text className="mt-1 font-inter text-sm text-neutral-500">Track electronic signature requests</Text>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <StatCard label="Pending" value={stats.pending ?? 0} color="warning" />
                <StatCard label="Signed" value={stats.signedThisMonth ?? 0} color="success" />
                <StatCard label="Declined" value={stats.declined ?? 0} color="danger" />
            </View>

            <FilterChips value={statusFilter} onSelect={setStatusFilter} />

            <View style={{ marginTop: 12 }}>
                <SearchBar value={search} onChangeText={setSearch} placeholder="Search by employee or letter..." />
            </View>
        </Animated.View>
    );

    const renderEmpty = () => {
        if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
        if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
        if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message={`No records match "${search}".`} /></View>;
        return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No e-sign records" message={statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests.` : 'No e-signature requests found.'} /></View>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppTopHeader title="E-Signatures" onMenuPress={toggle} />
            <FlatList
                data={filtered}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.gradient.surface },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
    headerContent: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
    listContent: { paddingHorizontal: 24 },
    card: {
        backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
        borderWidth: 1, borderColor: colors.primary[50],
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
    chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    resendBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary[50] },
});
