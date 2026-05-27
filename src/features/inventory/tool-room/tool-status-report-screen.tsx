import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useToolStatusReport } from '@/features/inventory/api/use-inventory-queries';
import { getToolLifeLevel, STOCK_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

type StatusFilter = 'ALL' | 'AVAILABLE' | 'IN_USE_AT_MACHINE' | 'UNDER_RECONDITIONING' | 'CONDEMNED';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'AVAILABLE', label: 'Available' },
  { key: 'IN_USE_AT_MACHINE', label: 'In Use' },
  { key: 'UNDER_RECONDITIONING', label: 'Reconditioning' },
  { key: 'CONDEMNED', label: 'Condemned' },
];

export function ToolStatusReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (filter !== 'ALL') p.status = filter;
    return p;
  }, [filter]);

  const { data, isLoading, refetch, isRefetching } = useToolStatusReport(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const lifeRemainingPct = item.lifeRemainingPct != null ? Number(item.lifeRemainingPct) : 100;
    const lifeColor = getToolLifeLevel(lifeRemainingPct);
    const statusCfg = STOCK_STATUS_CONFIG[item.status] || STOCK_STATUS_CONFIG.AVAILABLE;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolName || item.part?.name || 'Unknown Tool'}
            </Text>
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }} className={statusCfg.bg}>
              <Text className={`text-[10px] font-medium font-inter ${statusCfg.text}`}>{statusCfg.label}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">{item.partCode || item.part?.code || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-400">
              {item.totalReconditionings || 0} reconditionings
            </Text>
          </View>
          {/* Life progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, lifeRemainingPct))}%`, backgroundColor: lifeColor.progressColor }]} />
          </View>
          <Text className="text-[10px] font-inter text-neutral-400 mt-1">
            {lifeRemainingPct.toFixed(0)}% life remaining
          </Text>
        </View>
      </Animated.View>
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Status Report</Text>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text className={`text-[11px] font-inter ${filter === f.key ? 'text-white font-bold' : 'text-neutral-600'}`}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No tools found" message="No tools match the selected filter" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexWrap: 'wrap' },
  filterChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e5e5' },
  filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
});
