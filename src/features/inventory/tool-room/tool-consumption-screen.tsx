import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, TrendingDown, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useToolConsumptionReport } from '@/features/inventory/api/use-inventory-queries';

export function ToolConsumptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useToolConsumptionReport();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const expectedLife = Number(item.expectedLife || 0);
    const actualLife = Number(item.actualAvgLife || item.averageActualLife || 0);
    const variance = expectedLife > 0 ? ((actualLife - expectedLife) / expectedLife) * 100 : 0;
    const isUnderperformer = variance < -10;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={[styles.card, isUnderperformer && styles.cardUnderperformer]}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolType || item.partName || item.part?.name || 'Unknown'}
            </Text>
            {isUnderperformer && (
              <View style={styles.flagBadge}>
                <AlertTriangle color="#ef4444" size={12} />
                <Text className="text-[10px] font-bold font-inter text-red-600 ml-1">UNDERPERFORMER</Text>
              </View>
            )}
          </View>

          {/* Table-like row */}
          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text className="text-[10px] font-inter text-neutral-400">Expected</Text>
              <Text className="text-sm font-bold font-inter text-neutral-800">{expectedLife || '--'}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text className="text-[10px] font-inter text-neutral-400">Actual Avg</Text>
              <Text className="text-sm font-bold font-inter text-neutral-800">{actualLife ? actualLife.toFixed(1) : '--'}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text className="text-[10px] font-inter text-neutral-400">Variance</Text>
              <Text className={`text-sm font-bold font-inter ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-400">
              {item.lifeUnit || 'hours'} | {item.totalIssues || item.issueCount || 0} issues
            </Text>
            <Text className="text-xs font-inter text-neutral-400">
              {item.totalReturns || item.returnCount || 0} returns
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Consumption</Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id || item.partId || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No consumption data" message="Tool consumption data will appear here after tools are used" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardUnderperformer: { borderColor: '#fecaca', borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  flagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#fecaca' },
  tableRow: { flexDirection: 'row', marginVertical: 8, gap: 8 },
  tableCell: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, alignItems: 'center' },
});
