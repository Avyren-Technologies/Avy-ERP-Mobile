import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
    const { toggle } = useSidebar();
import Animated, { FadeInDown } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { useStockValueByWarehouse } from '@/features/inventory/api/use-inventory-queries';

function SummaryCard({ label, value, color, delay }: {
  label: string; value: number; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
      <Text className="text-lg font-bold font-inter text-neutral-900 mt-1">
        {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </Text>
    </Animated.View>
  );
}

function WarehouseCard({ item, maxValue, grandTotal, index }: {
  item: any; maxValue: number; grandTotal: number; index: number;
}) {
  const val = Number(item.totalValue) || 0;
  const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
  const barWidth = maxValue > 0 ? (val / maxValue) * 100 : 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={styles.warehouseCard}>
      <View style={styles.warehouseHeader}>
        <Text className="text-sm font-semibold font-inter text-neutral-900">{item.name || item.warehouseName}</Text>
        <Text className="text-sm font-bold font-inter text-neutral-900">{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.min(barWidth, 100)}%` }]} />
      </View>
      <View style={styles.warehouseFooter}>
        <Text className="text-[10px] font-inter text-neutral-400">{pct.toFixed(1)}% of total</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text className="text-[10px] font-inter text-red-500">Blocked: {(Number(item.blockedValue) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
          <Text className="text-[10px] font-inter text-amber-500">Expired: {(Number(item.expiredValue) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function StockValueScreen() {
  const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
  const { data, isLoading, refetch, isRefetching } = useStockValueByWarehouse();

  const result = (data as any)?.data;
  const summary = result?.summary || {};
  const warehouses = result?.warehouses || [];
  const maxValue = Math.max(...warehouses.map((w: any) => Number(w.totalValue) || 0), 1);
  const grandTotal = Number(summary.totalInventoryValue) || warehouses.reduce((sum: number, w: any) => sum + (Number(w.totalValue) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="text-xl font-bold text-white font-inter ml-3">Stock Value Analysis</Text>
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">Inventory value breakdown by warehouse</Text>
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
          {/* Summary */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3">Summary</Text>
          <View style={styles.grid}>
            <SummaryCard label="Total Value" value={Number(summary.totalInventoryValue) || grandTotal} color={colors.primary[600]} delay={0} />
            <SummaryCard label="Blocked" value={Number(summary.blockedStockValue) || 0} color={colors.danger[600]} delay={50} />
            <SummaryCard label="Expired" value={Number(summary.expiredStockValue) || 0} color={colors.warning[600]} delay={100} />
            <SummaryCard label="WIP Value" value={Number(summary.wipValue) || 0} color={colors.accent[600]} delay={150} />
          </View>

          {/* Warehouse Breakdown */}
          <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">By Warehouse</Text>
          {warehouses.length === 0 && (
            <View style={styles.emptyCard}>
              <Text className="text-sm font-inter text-neutral-400 text-center">No warehouse data available</Text>
            </View>
          )}
          {warehouses.map((w: any, i: number) => (
            <WarehouseCard key={w.id || i} item={w} maxValue={maxValue} grandTotal={grandTotal} index={i} />
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
  summaryCard: {
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
  warehouseCard: {
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
  warehouseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barBg: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  warehouseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
});
