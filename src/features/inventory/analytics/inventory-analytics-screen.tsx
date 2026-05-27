import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { HamburgerButton } from '@/components/ui/sidebar';
import { useCurrentKpis, useKpiSnapshots } from '@/features/inventory/api/use-inventory-queries';

function KpiCard({ label, value, unit, trend, color, delay }: {
  label: string; value: string | number; unit?: string; trend?: number; color: string; delay: number;
}) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 }}>
        <Text className="text-2xl font-bold font-inter text-neutral-900">{value}</Text>
        {unit ? <Text className="text-xs font-inter text-neutral-400 mb-1">{unit}</Text> : null}
      </View>
      {trend !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Text className={`text-[10px] font-medium font-inter ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? '\u25B2' : '\u25BC'} {isPositive ? '+' : ''}{trend.toFixed(1)}%
          </Text>
          <Text className="text-[10px] font-inter text-neutral-400">vs last period</Text>
        </View>
      )}
    </Animated.View>
  );
}

function SnapshotCard({ item, index }: { item: any; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={styles.snapshotCard}>
      <Text className="text-sm font-bold font-inter text-neutral-900">{item.month || item.period}</Text>
      <View style={styles.snapshotRow}>
        <View style={styles.snapshotCol}>
          <Text className="text-[10px] font-inter text-neutral-400">Turnover</Text>
          <Text className="text-sm font-semibold font-inter text-neutral-900">{Number(item.inventoryTurnover ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.snapshotCol}>
          <Text className="text-[10px] font-inter text-neutral-400">Fill Rate</Text>
          <Text className={`text-sm font-semibold font-inter ${Number(item.fillRate) >= 95 ? 'text-emerald-600' : Number(item.fillRate) >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
            {Number(item.fillRate ?? 0).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.snapshotCol}>
          <Text className="text-[10px] font-inter text-neutral-400">Accuracy</Text>
          <Text className={`text-sm font-semibold font-inter ${Number(item.stockAccuracy) >= 98 ? 'text-emerald-600' : Number(item.stockAccuracy) >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
            {Number(item.stockAccuracy ?? 0).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.snapshotCol}>
          <Text className="text-[10px] font-inter text-neutral-400">Turnaround</Text>
          <Text className="text-sm font-semibold font-inter text-neutral-900">{Number(item.receiptTurnaround ?? 0).toFixed(1)}h</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function InventoryAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKpis, isRefetching: isRefetchingKpis } = useCurrentKpis();
  const { data: snapshotsData, isLoading: snapLoading, refetch: refetchSnaps, isRefetching: isRefetchingSnaps } = useKpiSnapshots();

  const kpis = (kpiData as any)?.data;
  const snapshots = (snapshotsData as any)?.data || [];
  const isLoading = kpiLoading || snapLoading;
  const isRefreshing = isRefetchingKpis || isRefetchingSnaps;

  const handleRefresh = () => {
    refetchKpis();
    refetchSnaps();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <HamburgerButton />
          <Text className="text-xl font-bold text-white font-inter ml-3">Inventory Analytics</Text>
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">KPI trends and performance metrics</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary[500]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Cards */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3">Key Metrics</Text>
          <View style={styles.grid}>
            <KpiCard
              label="Inventory Turnover"
              value={Number(kpis?.inventoryTurnover ?? 0).toFixed(2)}
              trend={kpis?.turnoverTrend}
              color={colors.primary[600]}
              delay={0}
            />
            <KpiCard
              label="Fill Rate"
              value={Number(kpis?.fillRate ?? 0).toFixed(1)}
              unit="%"
              trend={kpis?.fillRateTrend}
              color={colors.success[600]}
              delay={50}
            />
            <KpiCard
              label="Stock Accuracy"
              value={Number(kpis?.stockAccuracy ?? 0).toFixed(1)}
              unit="%"
              trend={kpis?.accuracyTrend}
              color={colors.accent[600]}
              delay={100}
            />
            <KpiCard
              label="Receipt Turnaround"
              value={Number(kpis?.receiptTurnaround ?? 0).toFixed(1)}
              unit="hrs"
              trend={kpis?.turnaroundTrend}
              color={colors.warning[600]}
              delay={150}
            />
          </View>

          {/* Stock Value Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/inventory/analytics-stock-value' as any)}
            style={styles.linkCard}
          >
            <Text className="text-sm font-semibold font-inter text-primary-700">View Stock Value Analysis</Text>
            <Text className="text-xs font-inter text-primary-500 mt-1">Breakdown by warehouse</Text>
          </TouchableOpacity>

          {/* Monthly KPI */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">Monthly Summary</Text>
          {snapshots.length === 0 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyCard}>
              <Text className="text-sm font-inter text-neutral-400 text-center">No monthly data available</Text>
            </Animated.View>
          )}
          {snapshots.map((s: any, i: number) => (
            <SnapshotCard key={i} item={s} index={i} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    width: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  linkCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  snapshotCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  snapshotCol: { alignItems: 'center', flex: 1 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
});
