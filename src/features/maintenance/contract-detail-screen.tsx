import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useContract, useContractUtilisation } from '@/features/maintenance/api/use-maintenance-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

/* ── Screen ── */

export function ContractDetailScreen() {
    const isDark = useIsDark();
    const fmt = useCompanyFormatter();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data, isLoading } = useContract(id ?? '');
    const contract: any = (data as any)?.data ?? {};

    const { data: utilData } = useContractUtilisation(id ?? '');
    const utilisation: any = (utilData as any)?.data ?? {};

    const [activeTab, setActiveTab] = React.useState<'info' | 'assets' | 'visits' | 'utilisation'>('info');

    const linkedAssets: any[] = contract.assets ?? contract.contractAssets ?? [];
    const visits: any[] = contract.visits ?? contract.contractVisits ?? [];

    const daysLeft = contract.endDate
        ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000)
        : null;

    const callsPct = contract.callLimit ? Math.min(100, Math.round(((contract.callsUsed ?? 0) / contract.callLimit) * 100)) : 0;
    const costPct = utilisation.costClaimedPct ? Math.min(100, Number(utilisation.costClaimedPct)) : 0;

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
                <View style={{ padding: 24 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            </View>
        );
    }

    const tabs = ['info', 'assets', 'visits', 'utilisation'] as const;

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
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
                        <Text className="font-inter text-sm font-bold text-primary-600">Back</Text>
                    </Pressable>
                    <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white" style={{ marginTop: 8 }}>
                        {contract.name ?? 'Contract Detail'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text className="font-inter text-xs text-neutral-500">{contract.code ?? ''} - {contract.contractType ?? ''}</Text>
                        {daysLeft !== null && (
                            <View style={[
                                styles.expiryBadge,
                                {
                                    backgroundColor: daysLeft < 0 ? colors.neutral[100] : daysLeft <= 30 ? colors.danger[50] : daysLeft <= 90 ? colors.warning[50] : colors.success[50],
                                },
                            ]}>
                                <Text className="font-inter text-[10px] font-bold" style={{
                                    color: daysLeft < 0 ? colors.neutral[500] : daysLeft <= 30 ? colors.danger[700] : daysLeft <= 90 ? colors.warning[700] : colors.success[700],
                                }}>
                                    {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Info cards */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.cardsRow}>
                    {[
                        { label: 'Vendor', value: contract.vendorName ?? '---' },
                        { label: 'Calls', value: `${contract.callsUsed ?? 0}/${contract.callLimit ?? 'Unlimited'}` },
                        { label: 'Value', value: contract.contractValue ? Number(contract.contractValue).toLocaleString() : '---' },
                        { label: 'Period', value: `${contract.startDate ? fmt.date(contract.startDate) : '---'} to ${contract.endDate ? fmt.date(contract.endDate) : '---'}` },
                    ].map((c, i) => (
                        <View key={i} style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                            <Text className="font-inter text-[10px] text-neutral-400 uppercase">{c.label}</Text>
                            <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ marginTop: 2 }}>{c.value}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* Tabs */}
                <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.tabRow}>
                    {tabs.map((tab) => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: activeTab === tab ? (isDark ? colors.primary[900] : colors.primary[50]) : 'transparent',
                                },
                            ]}
                        >
                            <Text className="font-inter text-xs font-bold" style={{ color: activeTab === tab ? colors.primary[700] : colors.neutral[500], textTransform: 'capitalize' }}>
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Tab content */}
                {activeTab === 'info' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ gap: 12 }}>
                            <View><Text className="font-inter text-[10px] text-neutral-400 uppercase">Contact</Text><Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{contract.vendorContact ?? '---'}</Text></View>
                            <View><Text className="font-inter text-[10px] text-neutral-400 uppercase">Coverage</Text><Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">{contract.coverage ?? contract.description ?? '---'}</Text></View>
                        </View>
                    </Animated.View>
                )}

                {activeTab === 'assets' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300" style={{ marginBottom: 12 }}>
                            Linked Assets ({linkedAssets.length})
                        </Text>
                        {linkedAssets.length === 0 ? (
                            <EmptyState icon="search" title="No assets linked" message="Add assets covered by this contract." />
                        ) : (
                            linkedAssets.map((a: any, i: number) => (
                                <View key={i} style={styles.assetItem}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{a.asset?.name ?? a.name ?? '---'}</Text>
                                    <Text className="font-inter text-[10px] text-neutral-400">{a.asset?.assetNumber ?? a.assetNumber ?? ''}</Text>
                                </View>
                            ))
                        )}
                    </Animated.View>
                )}

                {activeTab === 'visits' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <Text className="font-inter text-sm font-bold text-neutral-700 dark:text-neutral-300" style={{ marginBottom: 12 }}>
                            Visit Log ({visits.length})
                        </Text>
                        {visits.length === 0 ? (
                            <EmptyState icon="search" title="No visits logged" message="Log a vendor visit to track usage." />
                        ) : (
                            visits.map((v: any, i: number) => (
                                <View key={i} style={styles.visitItem}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">{v.technicianName ?? '---'}</Text>
                                        <Text className="font-inter text-[10px] text-neutral-400">{v.visitDate ? fmt.date(v.visitDate) : '---'}</Text>
                                    </View>
                                    {v.notes ? <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={2} style={{ marginTop: 4 }}>{v.notes}</Text> : null}
                                    {v.cost ? <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-400" style={{ marginTop: 4 }}>Cost: {Number(v.cost).toLocaleString()}</Text> : null}
                                </View>
                            ))
                        )}
                    </Animated.View>
                )}

                {activeTab === 'utilisation' && (
                    <Animated.View entering={FadeInUp.duration(300)} style={[styles.section, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                        <View style={{ gap: 20 }}>
                            {/* Calls used bar */}
                            <View>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">Calls Used</Text>
                                <View style={styles.barContainer}>
                                    <View style={[styles.barBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                        <View style={[styles.barFill, { width: `${callsPct}%`, backgroundColor: callsPct >= 90 ? colors.danger[500] : callsPct >= 70 ? colors.warning[500] : colors.primary[500] }]} />
                                    </View>
                                    <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">{callsPct}%</Text>
                                </View>
                                <Text className="font-inter text-[10px] text-neutral-400">{contract.callsUsed ?? 0} of {contract.callLimit ?? 'Unlimited'}</Text>
                            </View>
                            {/* Cost claimed bar */}
                            <View>
                                <Text className="font-inter text-[10px] text-neutral-400 uppercase">Cost Claimed</Text>
                                <View style={styles.barContainer}>
                                    <View style={[styles.barBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                                        <View style={[styles.barFill, { width: `${costPct}%`, backgroundColor: costPct >= 90 ? colors.danger[500] : costPct >= 70 ? colors.warning[500] : colors.success[500] }]} />
                                    </View>
                                    <Text className="font-inter text-xs font-bold text-neutral-700 dark:text-neutral-300">{costPct.toFixed(1)}%</Text>
                                </View>
                                <Text className="font-inter text-[10px] text-neutral-400">{utilisation.totalCostClaimed ? Number(utilisation.totalCostClaimed).toLocaleString() : '0'} of {contract.contractValue ? Number(contract.contractValue).toLocaleString() : '---'}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    expiryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    cardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    infoCard: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    tabRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 20,
        backgroundColor: colors.neutral[100],
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    section: {
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.neutral[100],
    },
    assetItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    visitItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    barBg: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
});
