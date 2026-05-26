import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { usePendingPutaway } from '@/features/inventory/api/use-inventory-queries';
import { useConfirmPutaway } from '@/features/inventory/api/use-inventory-mutations';
import { WarehouseLocationPicker } from '@/features/inventory/shared/WarehouseLocationPicker';

export function PutAwayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = usePendingPutaway();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <PutawayCard item={item} />
    </Animated.View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Put-Away</Text>
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">{items.length} pending items</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <CheckCircle2 color={colors.success[400]} size={48} />
              <Text className="text-sm font-inter text-neutral-500 mt-3">All items have been put away</Text>
              <Text className="text-xs font-inter text-neutral-400 mt-1">New items appear after GRN processing</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function PutawayCard({ item }: { item: any }) {
  const confirmMutation = useConfirmPutaway();
  const [warehouseId, setWarehouseId] = useState(item.warehouseId || '');
  const [zoneId, setZoneId] = useState(item.suggestedZoneId || '');
  const [binId, setBinId] = useState(item.suggestedBinId || '');

  const handleConfirm = () => {
    confirmMutation.mutate({ stockBalanceId: item.id, warehouseId, zoneId: zoneId || undefined, binId: binId || undefined });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text className="text-xs font-bold font-inter text-primary-600">{item.partNumber || item.part?.partNumber || '--'}</Text>
        <Text className="text-sm font-bold font-inter text-neutral-900">{Number(item.qty ?? item.quantity ?? 0).toLocaleString()} {item.uom || ''}</Text>
      </View>
      <Text className="text-[10px] font-inter text-neutral-500 mb-3">{item.partName || item.part?.name || ''}</Text>

      <WarehouseLocationPicker
        warehouseId={warehouseId} zoneId={zoneId} binId={binId}
        onWarehouseChange={setWarehouseId} onZoneChange={setZoneId} onBinChange={setBinId}
      />

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={!warehouseId || confirmMutation.isPending}
        style={[styles.confirmBtn, (!warehouseId || confirmMutation.isPending) && { opacity: 0.5 }]}
      >
        {confirmMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Confirm Put-Away</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  confirmBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
});
