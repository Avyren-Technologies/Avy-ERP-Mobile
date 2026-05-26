import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useMoveStock } from '@/features/inventory/api/use-inventory-queries';
import { useCreateMoveStock, useConfirmMoveReceipt } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

export function MoveStockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const confirmMutation = useConfirmMoveReceipt();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useMoveStock({ page, limit: 25 });
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'IN_TRANSIT'} />
        </View>
        <Text className="text-xs font-inter text-neutral-600 mt-1">
          {item.fromWarehouse?.code || '--'} → {item.toWarehouse?.code || '--'}
        </Text>
        <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        {item.status === 'IN_TRANSIT' && (
          <TouchableOpacity
            onPress={() => confirmMutation.mutate(item.id)}
            disabled={confirmMutation.isPending}
            style={[styles.actionBtn, confirmMutation.isPending && { opacity: 0.5 }]}
          >
            <Text className="text-xs font-bold font-inter text-primary-600">Confirm Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  ), [fmt, confirmMutation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Stock Transfers</Text>
        </View>
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
          ListEmptyComponent={<EmptyState title="No transfers" description="Create a stock transfer" />}
        />
      )}

      <Fab onPress={() => setShowForm(true)} />

      {showForm && <CreateMoveSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateMoveSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateMoveStock();
  const [form, setForm] = useState({ partId: '', quantity: '', fromWarehouseId: '', toWarehouseId: '', remarks: '' });

  const canSubmit = form.partId && Number(form.quantity) > 0 && form.fromWarehouseId && form.toWarehouseId;

  const handleSubmit = () => {
    createMutation.mutate({
      partId: form.partId, quantity: Number(form.quantity),
      fromWarehouseId: form.fromWarehouseId, toWarehouseId: form.toWarehouseId,
      remarks: form.remarks || undefined,
    }, { onSuccess: onClose });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.sheetHeader}>
            <Text className="text-lg font-bold font-inter text-neutral-900">New Transfer</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>
          {['partId', 'quantity', 'fromWarehouseId', 'toWarehouseId', 'remarks'].map((f) => (
            <View key={f} style={{ marginTop: 12 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">{f === 'partId' ? 'Part ID *' : f === 'quantity' ? 'Quantity *' : f === 'fromWarehouseId' ? 'From Warehouse ID *' : f === 'toWarehouseId' ? 'To Warehouse ID *' : 'Remarks'}</Text>
              <TextInput
                style={styles.input}
                value={(form as any)[f]}
                onChangeText={(v) => setForm({ ...form, [f]: v })}
                placeholder={f}
                placeholderTextColor={colors.neutral[400]}
                keyboardType={f === 'quantity' ? 'numeric' : 'default'}
              />
            </View>
          ))}
          <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Create Transfer</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: { alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.primary[50] },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
