/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useWOBoard } from '@/features/maintenance/api/use-maintenance-queries';
import { PriorityBadge } from '@/features/maintenance/shared/priority-badge';
import { WOStatusBadge } from '@/features/maintenance/shared/wo-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

const BOARD_COLUMNS = ['DRAFT', 'PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED'];
const COLUMN_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    ON_HOLD: 'On Hold',
    COMPLETED: 'Completed',
    CLOSED: 'Closed',
};

export function WorkOrderBoardScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [selectedColumn, setSelectedColumn] = React.useState('ASSIGNED');
    const columnScrollRef = React.useRef<ScrollView>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useWOBoard();

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch]),
    );
    const boardData: Record<string, any[]> = React.useMemo(() => {
        const raw = (response as any)?.data ?? {};
        if (typeof raw !== 'object') return {};
        return raw;
    }, [response]);

    const currentItems = boardData[selectedColumn] ?? [];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            {/* Header */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Svg width={22} height={22} viewBox="0 0 24 24">
                        <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </Pressable>
                <Text className="font-inter text-lg font-bold text-white">WO Board</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            {/* Status tabs */}
            <View style={styles.tabContainer}>
                <ScrollView ref={columnScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
                    {BOARD_COLUMNS.map((col) => {
                        const count = (boardData[col] ?? []).length;
                        const isActive = col === selectedColumn;
                        return (
                            <Pressable
                                key={col}
                                onPress={() => setSelectedColumn(col)}
                                style={[styles.tabChip, isActive && styles.tabChipActive]}
                            >
                                <Text className={`font-inter text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                    {COLUMN_LABELS[col] ?? col}
                                </Text>
                                {count > 0 ? (
                                    <View style={[styles.tabCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.neutral[200] }]}>
                                        <Text className={`font-inter text-[9px] font-bold ${isActive ? 'text-white' : 'text-neutral-600'}`}>{count}</Text>
                                    </View>
                                ) : null}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Column content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
            >
                {isLoading ? (
                    <View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
                ) : error ? (
                    <EmptyState icon="error" title="Failed to load board" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} />
                ) : currentItems.length === 0 ? (
                    <EmptyState icon="search" title={`No ${COLUMN_LABELS[selectedColumn] ?? ''} orders`} message="No work orders in this status." />
                ) : (
                    currentItems.map((item: any, index: number) => (
                        <Animated.View key={item.id} entering={FadeInUp.duration(300).delay(index * 40)}>
                            <Pressable
                                onPress={() => router.push({ pathname: '/maintenance/work-order-detail' as any, params: { id: item.id } })}
                                style={[cardStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.primary[50] }]}
                            >
                                <View style={cardStyles.headerRow}>
                                    <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
                                        <Text className="font-inter text-[10px] font-bold text-info-700">{item.woNumber ?? 'WO-???'}</Text>
                                    </View>
                                    <PriorityBadge priority={item.priority ?? 'MEDIUM'} />
                                </View>
                                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 6 }}>
                                    {item.asset?.name ?? 'Unknown Asset'}
                                </Text>
                                {item.leadTechnician ? (
                                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 4 }}>
                                        {item.leadTechnician.firstName ?? ''} {item.leadTechnician.lastName ?? ''}
                                    </Text>
                                ) : null}
                                {item.plannedStart ? (
                                    <Text className="font-inter text-[10px] text-neutral-400" style={{ marginTop: 2 }}>
                                        {fmt.date(item.plannedStart)}
                                    </Text>
                                ) : null}
                            </Pressable>
                        </Animated.View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 24, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    tabChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200],
    },
    tabChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    tabCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: 'center' },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16, padding: 14, marginBottom: 10,
        shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
