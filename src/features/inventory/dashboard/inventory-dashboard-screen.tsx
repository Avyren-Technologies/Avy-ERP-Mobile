import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
    const { toggle } = useSidebar();
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useInventoryDashboard } from '@/features/inventory/api/use-inventory-queries';

function KpiCard({ label, value, subtext, color, delay, onPress }: {
  label: string; value: string | number; subtext?: string; color: string; delay: number; onPress?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.7} style={styles.kpiInner}>
        <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
        <Text className="text-xl font-bold font-inter text-neutral-900 mt-1">{value}</Text>
        {subtext && <Text className="text-[10px] font-inter text-neutral-400 mt-0.5">{subtext}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function InventoryDashboardScreen() {
  const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useInventoryDashboard();
  const dashboard = (data as any)?.data;

  const pending = dashboard?.pendingTasks || {};
  const risks = dashboard?.stockRisks || {};
  const activity = dashboard?.todayActivity || {};

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="text-xl font-bold text-white font-inter ml-3">Inventory</Text>
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">Warehouse operations overview</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending Tasks */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3">Pending Tasks</Text>
          <View style={styles.grid}>
            <KpiCard label="Pending Put-Away" value={pending.pendingPutaway ?? 0} color={colors.info[600]} delay={0} onPress={() => router.push('/inventory/put-away' as any)} />
            <KpiCard label="Pending Counts" value={pending.pendingCounts ?? 0} color={colors.warning[600]} delay={50} onPress={() => router.push('/inventory/counts' as any)} />
            <KpiCard label="Pending Approvals" value={pending.pendingApprovals ?? 0} color={colors.accent[600]} delay={100} onPress={() => router.push('/inventory/approvals' as any)} />
            <KpiCard label="In-Transit Moves" value={pending.inTransitMoves ?? 0} color={colors.success[600]} delay={150} onPress={() => router.push('/inventory/transfer' as any)} />
          </View>

          {/* Stock Risks */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">Stock Risks</Text>
          <View style={styles.grid}>
            <KpiCard label="Near Expiry" value={risks.nearExpiry ?? 0} subtext="Items expiring soon" color={colors.warning[600]} delay={200} />
            <KpiCard label="Blocked Aging" value={risks.blockedAging ?? 0} subtext="Beyond threshold" color={colors.danger[600]} delay={250} />
            <KpiCard label="Below Reorder" value={risks.belowReorder ?? 0} subtext="Need reorder" color={colors.danger[500]} delay={300} />
            <KpiCard label="Zero Stock" value={risks.zeroStock ?? 0} subtext="No stock on hand" color={colors.neutral[500]} delay={350} />
          </View>

          {/* Today's Activity */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">Today's Activity</Text>
          <View style={styles.grid}>
            <KpiCard label="Receipts" value={activity.receipts ?? 0} color={colors.success[600]} delay={400} />
            <KpiCard label="Dispatches" value={activity.dispatches ?? 0} color={colors.primary[600]} delay={450} />
            <KpiCard label="Transfers" value={activity.transfers ?? 0} color={colors.info[600]} delay={500} />
            <KpiCard label="Adjustments" value={activity.adjustments ?? 0} color={colors.accent[600]} delay={550} />
          </View>

          {/* Warehouse Summary */}
          {dashboard?.warehouseSummary?.length > 0 && (
            <>
              <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">Warehouse Utilization</Text>
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.summaryCard}>
                {dashboard.warehouseSummary.map((wh: any) => (
                  <View key={wh.id || wh.code} style={styles.summaryRow}>
                    <View style={{ flex: 1 }}>
                      <Text className="text-sm font-medium font-inter text-neutral-900">{wh.name || wh.code}</Text>
                      <Text className="text-xs font-inter text-neutral-500">{wh.zoneCount ?? 0} zones, {wh.binCount ?? 0} bins</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text className="text-sm font-bold font-inter text-neutral-900">{Number(wh.totalQty ?? 0).toLocaleString()}</Text>
                      <Text className="text-[10px] font-inter text-neutral-400">items</Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    width: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiInner: { padding: 14 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
});
