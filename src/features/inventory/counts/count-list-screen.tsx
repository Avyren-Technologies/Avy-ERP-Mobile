import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useCounts } from '@/features/inventory/api/use-inventory-queries';
import { COUNT_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

function CountStatusBadge({ status }: { status: string }) {
  const config = COUNT_STATUS_CONFIG[status] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', label: status };
  return (
    <View className={`flex-row items-center rounded-full px-2 py-0.5 ${config.bg} border ${config.border}`}>
      <Text className={`text-xs font-medium font-inter ${config.text}`}>{config.label}</Text>
    </View>
  );
}

export function CountListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, limit: 25 };
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, statusFilter]);

  const { data, isLoading, refetch, isRefetching } = useCounts(params);
  const items = (data as any)?.data || [];

  const statusOptions = Object.keys(COUNT_STATUS_CONFIG);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/inventory/counts/${item.id}` as any)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.countNumber || item.referenceNumber || '--'}</Text>
          <CountStatusBadge status={item.status || 'CREATED'} />
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-600">{item.type || 'CYCLE'} Count</Text>
          <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        </View>
        <Text className="text-xs font-inter text-neutral-500 mt-1">Warehouse: {item.warehouse?.code || item.warehouseCode || '--'}</Text>
      </TouchableOpacity>
    </Animated.View>
  ), [fmt, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Inventory Counts</Text>
        </View>
      </LinearGradient>

      {/* Status filter chips */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={['', ...statusOptions]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}
        keyExtractor={(s) => s || 'all'}
        renderItem={({ item: s }) => (
          <TouchableOpacity onPress={() => { setStatusFilter(s); setPage(1); }} style={[styles.chip, statusFilter === s && styles.chipActive]}>
            <Text className={`text-xs font-medium font-inter ${statusFilter === s ? 'text-white' : 'text-neutral-600'}`}>
              {s ? COUNT_STATUS_CONFIG[s]?.label || s : 'All'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList data={items} keyExtractor={(item: any) => item.id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No counts" description="Create an inventory count" />}
        />
      )}

      <Fab onPress={() => router.push('/inventory/counts/new' as any)} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});
