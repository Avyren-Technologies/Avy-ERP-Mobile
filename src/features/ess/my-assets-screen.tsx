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
import { useMyAssets } from '@/features/company-admin/api/use-ess-queries';
import { useIsDark } from '@/hooks/use-is-dark';

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
    NEW: { bg: colors.success[50], text: colors.success[700] },
    GOOD: { bg: colors.primary[50], text: colors.primary[700] },
    FAIR: { bg: colors.warning[50], text: colors.warning[700] },
    POOR: { bg: colors.danger[50], text: colors.danger[700] },
    DAMAGED: { bg: colors.danger[100], text: colors.danger[800] },
};

export function MyAssetsScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { open } = useSidebar();
    const { data, isLoading, refetch } = useMyAssets();
    const assets = (data as any)?.data ?? [];

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const condition = (item.condition ?? item.status ?? 'GOOD').toUpperCase();
        const conditionStyle = CONDITION_COLORS[condition] ?? CONDITION_COLORS.GOOD;

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100" numberOfLines={2}>
                            {item.name ?? item.assetName ?? 'Unnamed Asset'}
                        </Text>
                        {(item.category ?? item.assetType) && (
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.category ?? item.assetType}</Text>
                        )}
                    </View>
                    <View style={[styles.badge, { backgroundColor: conditionStyle.bg }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: conditionStyle.text }}>{condition}</Text>
                    </View>
                </View>
                <View style={styles.meta}>
                    {(item.serialNumber ?? item.serialNo) && (
                        <View style={styles.metaItem}>
                            <Text className="font-inter text-[10px] text-neutral-400">S/N</Text>
                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{item.serialNumber ?? item.serialNo}</Text>
                        </View>
                    )}
                    {item.assetTag && (
                        <View style={styles.metaItem}>
                            <Text className="font-inter text-[10px] text-neutral-400">Tag</Text>
                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{item.assetTag}</Text>
                        </View>
                    )}
                    {(item.assignedDate ?? item.assignedAt) && (
                        <View style={styles.metaItem}>
                            <Text className="font-inter text-[10px] text-neutral-400">Assigned</Text>
                            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">{item.assignedDate ?? item.assignedAt}</Text>
                        </View>
                    )}
                </View>
                {item.description && <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400 mt-2" numberOfLines={2}>{item.description}</Text>}
            </Animated.View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
            <AppTopHeader title="My Assets" onMenuPress={open} />
            <FlashList
                data={assets}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
                ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text className="font-inter text-sm text-neutral-400">No assets assigned to you</Text></View> : null}
            />
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    card: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 16, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    meta: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
    metaItem: { alignItems: 'flex-start' },
    empty: { alignItems: 'center', paddingTop: 60 },
});
const styles = createStyles(false);
