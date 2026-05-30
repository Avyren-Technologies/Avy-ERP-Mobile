import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { inventoryApi } from '@/lib/api/inventory';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

const TABS = [
  { key: 'transaction-register', label: 'Transactions' },
  { key: 'count-variance', label: 'Count Variance' },
  { key: 'adjustment-register', label: 'Adjustments' },
  { key: 'transfer-log', label: 'Transfers' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const apiFns: Record<TabKey, (params?: any) => any> = {
  'transaction-register': inventoryApi.getTransactionRegister,
  'count-variance': inventoryApi.getCountVariance,
  'adjustment-register': inventoryApi.getAdjustmentRegister,
  'transfer-log': inventoryApi.getTransferLog,
};

export function InventoryReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [tab, setTab] = useState<TabKey>('transaction-register');
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ page, limit: 25 }), [page]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory', 'reports', tab, params],
    queryFn: () => apiFns[tab](params),
  });

  const items = (data as any)?.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Reports</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => { setTab(t.key); setPage(1); }} style={[styles.chip, tab === t.key && styles.chipActive]}>
            <Text className={`text-xs font-medium font-inter ${tab === t.key ? 'text-white' : 'text-neutral-600'}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any, idx) => item.id || String(idx)}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 20).duration(300)}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || item.countNumber || '--'}</Text>
                  {item.status && <TransactionStatusBadge status={item.status} />}
                </View>
                <View style={styles.cardRow}>
                  <Text className="text-xs font-inter text-neutral-600">{item.type || item.transactionType || '--'}</Text>
                  <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
                </View>
                {item.partNumber && <Text className="text-xs font-inter text-neutral-500 mt-1">Part: {item.partNumber}</Text>}
                {item.quantity != null && <Text className="text-xs font-inter text-neutral-700 mt-1">Qty: {Number(item.quantity).toLocaleString()}</Text>}
                {item.variance != null && <Text className="text-xs font-inter text-amber-700 mt-1">Variance: {Number(item.variance).toLocaleString()}</Text>}
              </View>
            </Animated.View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No report data" message="Try a different report tab" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
