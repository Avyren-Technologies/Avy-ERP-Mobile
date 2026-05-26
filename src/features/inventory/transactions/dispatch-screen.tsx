import { useState, useCallback } from 'react';
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
import { useDispatches } from '@/features/inventory/api/use-inventory-queries';
import { useCreateDispatch } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

export function DispatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useDispatches({ page, limit: 25 });
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || item.dispatchNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'DRAFT'} />
        </View>
        <Text className="text-xs font-inter text-neutral-600 mt-1">Customer: {item.customerName || item.customer?.name || '--'}</Text>
        <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
      </View>
    </Animated.View>
  ), [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Dispatch</Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList data={items} keyExtractor={(item: any) => item.id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No dispatches" description="Create a new dispatch" />}
        />
      )}

      <Fab onPress={() => setShowForm(true)} />
      {showForm && <CreateDispatchSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateDispatchSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateDispatch();
  const [form, setForm] = useState({ warehouseId: '', customerName: '', remarks: '', partId: '', quantity: '' });
  const canSubmit = form.warehouseId && form.partId && Number(form.quantity) > 0;

  const handleSubmit = () => {
    createMutation.mutate({
      warehouseId: form.warehouseId, customerName: form.customerName || undefined,
      lineItems: [{ partId: form.partId, quantity: Number(form.quantity) }],
      remarks: form.remarks || undefined,
    }, { onSuccess: onClose });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.sheetHeader}>
            <Text className="text-lg font-bold font-inter text-neutral-900">New Dispatch</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>
          {[{ key: 'warehouseId', label: 'Warehouse ID *' }, { key: 'customerName', label: 'Customer' }, { key: 'partId', label: 'Part ID *' }, { key: 'quantity', label: 'Quantity *', numeric: true }, { key: 'remarks', label: 'Remarks' }].map((f) => (
            <View key={f.key} style={{ marginTop: 12 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                placeholder={f.label} placeholderTextColor={colors.neutral[400]} keyboardType={(f as any).numeric ? 'numeric' : 'default'} />
            </View>
          ))}
          <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Create Dispatch</Text>}
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
