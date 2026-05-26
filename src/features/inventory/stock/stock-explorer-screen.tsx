import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useStockOnHand, useWarehouses } from '@/features/inventory/api/use-inventory-queries';
import { InventoryStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';
import { STOCK_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

export function StockExplorerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, limit: 25 };
    if (search) p.search = search;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [search, statusFilter, page]);

  const { data, isLoading, refetch, isRefetching } = useStockOnHand(params);
  const items = (data as any)?.data || [];
  const meta = (data as any)?.meta;

  const statusOptions = Object.keys(STOCK_STATUS_CONFIG);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text className="text-xs font-bold font-inter text-primary-600">{item.partNumber || item.part?.partNumber || '--'}</Text>
            <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{item.partName || item.part?.name || ''}</Text>
          </View>
          <InventoryStatusBadge status={item.status || 'AVAILABLE'} />
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.detailCol}>
            <Text className="text-[10px] font-inter text-neutral-400">Warehouse</Text>
            <Text className="text-xs font-medium font-inter text-neutral-700">{item.warehouseCode || item.warehouse?.code || '--'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text className="text-[10px] font-inter text-neutral-400">Zone / Bin</Text>
            <Text className="text-xs font-medium font-inter text-neutral-700">
              {[item.zoneCode || item.zone?.code, item.binCode || item.bin?.code].filter(Boolean).join(' / ') || '--'}
            </Text>
          </View>
          <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
            <Text className="text-[10px] font-inter text-neutral-400">Qty</Text>
            <Text className="text-sm font-bold font-inter text-neutral-900">{Number(item.qty ?? item.quantity ?? 0).toLocaleString()}</Text>
          </View>
        </View>
        {(item.lotNumber || item.serialNumber) && (
          <Text className="text-[10px] font-inter text-neutral-400 mt-1">
            {item.lotNumber ? `Lot: ${item.lotNumber}` : ''}{item.serialNumber ? `Serial: ${item.serialNumber}` : ''}
          </Text>
        )}
      </View>
    </Animated.View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Stock Explorer</Text>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color={colors.neutral[400]} size={16} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search part number or name..."
          placeholderTextColor={colors.neutral[400]}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
        />
      </View>

      {/* Status filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['', ...statusOptions]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}
        keyExtractor={(s) => s || 'all'}
        renderItem={({ item: s }) => (
          <TouchableOpacity
            onPress={() => { setStatusFilter(s); setPage(1); }}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
          >
            <Text className={`text-xs font-medium font-inter ${statusFilter === s ? 'text-white' : 'text-neutral-600'}`}>
              {s ? STOCK_STATUS_CONFIG[s]?.label || s : 'All'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any, idx) => item.id || String(idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No stock records" description="Try adjusting your filters" />}
          onEndReached={() => { if (meta && page < meta.totalPages) setPage(page + 1); }}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#111',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  chipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
});
