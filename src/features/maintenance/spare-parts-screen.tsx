import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { sparePartsHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useJobPlans, useSpareKit, useStockoutAlerts } from '@/features/maintenance/api/use-maintenance-queries';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Screen ── */

export function SparePartsScreen() {
    const isDark = useIsDark();
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();

    const [selectedJobPlanId, setSelectedJobPlanId] = React.useState('');

    const { data: jobPlansData } = useJobPlans({ limit: 100 });
    const jobPlans: any[] = (jobPlansData as any)?.data ?? [];

    const { data: kitData, isLoading: kitLoading } = useSpareKit(
        selectedJobPlanId || '',
    );
    const kitParts: any[] = (kitData as any)?.data ?? [];

    const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts, isFetching } = useStockoutAlerts();
    const stockoutAlerts: any[] = (alertsData as any)?.data ?? [];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !alertsLoading}
                        onRefresh={() => refetchAlerts()}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    <AppTopHeader
                        title="Spare Parts"
                        subtitle="Kit check and stockout alerts"
                        onMenuPress={toggle}
                        rightSlot={<HelpDrawer help={sparePartsHelp} />}
                    />
                </Animated.View>

                {/* Kit Availability Checker */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginBottom: 12 }}>
                        Kit Availability Check
                    </Text>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ marginBottom: 8 }}>
                        Select a job plan to check if all required parts are available.
                    </Text>

                    {/* Simple job plan selector */}
                    <View style={[styles.pickerWrap, { backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50] }]}>
                        <Text className="font-inter text-xs text-neutral-400">
                            {selectedJobPlanId
                                ? jobPlans.find((jp: any) => jp.id === selectedJobPlanId)?.name ?? 'Selected'
                                : 'Tap to select a job plan...'}
                        </Text>
                    </View>

                    {!selectedJobPlanId && jobPlans.length > 0 && (
                        <View style={styles.jpList}>
                            {jobPlans.slice(0, 10).map((jp: any) => (
                                <View key={jp.id} style={styles.jpItem}>
                                    <Text
                                        className="font-inter text-xs font-bold text-primary-700 dark:text-primary-400"
                                        onPress={() => setSelectedJobPlanId(jp.id)}
                                    >
                                        {jp.name} ({jp.code})
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {selectedJobPlanId && (
                        <>
                            {kitLoading ? (
                                <SkeletonCard />
                            ) : kitParts.length === 0 ? (
                                <EmptyState icon="search" title="No parts data" message="No spare parts configured for this job plan." />
                            ) : (
                                <View style={{ marginTop: 12, gap: 8 }}>
                                    {kitParts.map((part: any, i: number) => {
                                        const available = (part.availableQty ?? 0) >= (part.requiredQty ?? 0);
                                        return (
                                            <View key={i} style={[styles.partRow, { borderColor: available ? colors.success[200] : colors.danger[200] }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{part.partName ?? part.name ?? '---'}</Text>
                                                    <Text className="font-inter text-[10px] text-neutral-400">{part.partNumber ?? ''}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text className="font-inter text-[10px] text-neutral-400">
                                                        {part.availableQty ?? 0} / {part.requiredQty ?? 0}
                                                    </Text>
                                                    <View style={[styles.stockBadge, { backgroundColor: available ? colors.success[50] : colors.danger[50] }]}>
                                                        <Text className="font-inter text-[10px] font-bold" style={{ color: available ? colors.success[700] : colors.danger[700] }}>
                                                            {available ? 'In Stock' : 'Short'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                            <Text
                                className="font-inter text-xs font-bold text-primary-600 dark:text-primary-400"
                                style={{ marginTop: 12 }}
                                onPress={() => setSelectedJobPlanId('')}
                            >
                                Change Job Plan
                            </Text>
                        </>
                    )}
                </Animated.View>

                {/* Stockout Alerts */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white, marginTop: 16 }]}>
                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" style={{ marginBottom: 12 }}>
                        Stockout Alerts
                    </Text>

                    {alertsLoading ? (
                        <SkeletonCard />
                    ) : stockoutAlerts.length === 0 ? (
                        <EmptyState icon="search" title="No stockout alerts" message="All spare parts are adequately stocked." />
                    ) : (
                        <View style={{ gap: 8 }}>
                            {stockoutAlerts.map((alert: any, i: number) => (
                                <View key={i} style={[styles.alertRow, { backgroundColor: isDark ? 'rgba(220,38,38,0.08)' : colors.danger[50] }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-xs font-bold text-danger-700 dark:text-danger-400">{alert.partName ?? alert.name ?? '---'}</Text>
                                        <Text className="font-inter text-[10px] text-danger-600 dark:text-danger-500">
                                            Current: {alert.currentStock ?? 0} | Min: {alert.minStock ?? alert.reorderPoint ?? 0}
                                        </Text>
                                    </View>
                                    <View style={[styles.stockBadge, { backgroundColor: colors.danger[100] }]}>
                                        <Text className="font-inter text-[10px] font-bold text-danger-700">Low Stock</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    section: {
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    pickerWrap: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    jpList: { marginTop: 8, gap: 4 },
    jpItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
    partRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100, marginTop: 2 },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
});
