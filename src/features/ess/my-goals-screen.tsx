/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useMyGoals } from '@/features/company-admin/api/use-ess-queries';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: colors.neutral[500],
    ACTIVE: colors.primary[600],
    COMPLETED: colors.success[600],
    CANCELLED: colors.danger[500],
};

export function MyGoalsScreen() {
    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { data, isLoading, refetch } = useMyGoals();
    const goals = (data as any)?.data ?? [];

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-bold text-primary-900" numberOfLines={2}>{item.title}</Text>
                    {item.cycle?.name && <Text className="font-inter text-xs text-neutral-500 mt-0.5">{item.cycle.name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[item.status] ?? colors.neutral[500]  }20` }]}>
                    <Text className="font-inter text-[10px] font-bold" style={{ color: STATUS_COLORS[item.status] ?? colors.neutral[500] }}>{item.status}</Text>
                </View>
            </View>
            {item.description && <Text className="font-inter text-xs text-neutral-600 mt-2">{item.description}</Text>}
            <View style={styles.meta}>
                {item.weightage != null && <Text className="font-inter text-[10px] text-neutral-400">Weight: {item.weightage}%</Text>}
                {item.targetValue && <Text className="font-inter text-[10px] text-neutral-400">Target: {item.targetValue}</Text>}
            </View>
        </Animated.View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <AppTopHeader title="My Goals" onMenuPress={open} />
            <FlashList
                data={goals}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No goals assigned yet</Text></View> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    meta: { flexDirection: 'row', gap: 12, marginTop: 8 },
    empty: { alignItems: 'center', paddingTop: 60 },
});
