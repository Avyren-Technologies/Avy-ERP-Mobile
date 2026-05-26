import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useGrns, useWarehouses } from '@/features/inventory/api/use-inventory-queries';
import { useCreateGrn } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

export function GrnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, limit: 25 };
    if (search) p.search = search;
    return p;
  }, [search, page]);

  const { data, isLoading, refetch, isRefetching } = useGrns(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/inventory/grn/${item.id}` as any)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.grnNumber || item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'DRAFT'} />
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-600">PO: {item.poReference || item.poNumber || '--'}</Text>
          <Text className="text-xs font-inter text-neutral-500">{item.receivedAt ? fmt.dateTime(item.receivedAt) : item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        </View>
        <Text className="text-xs font-inter text-neutral-500 mt-1">Supplier: {item.supplierName || item.supplier?.name || '--'}</Text>
        {(item.hasDiscrepancies || item.discrepancyCount > 0) && (
          <View style={styles.discrepancyBadge}>
            <Text className="text-[10px] font-medium font-inter text-amber-700">{item.discrepancyCount || 'Discrepancy'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  ), [fmt, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Goods Receipt Notes</Text>
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
          ListEmptyComponent={<EmptyState title="No GRNs found" description="Create your first GRN" />}
        />
      )}

      <Fab onPress={() => setShowForm(true)} />

      {showForm && <CreateGrnSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateGrnSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateGrn();
  const { data: whData } = useWarehouses();
  const warehouses = (whData as any)?.data || [];
  const [form, setForm] = useState({ warehouseId: '', poReference: '', supplierName: '', remarks: '' });
  const [lines, setLines] = useState([{ partId: '', qty: '1', orderedQty: '0', lotNumber: '' }]);

  const addLine = () => setLines([...lines, { partId: '', qty: '1', orderedQty: '0', lotNumber: '' }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const canSubmit = form.warehouseId && lines.every(l => l.partId && Number(l.qty) > 0);

  const handleSubmit = () => {
    createMutation.mutate({
      ...form,
      lineItems: lines.map(l => ({
        partId: l.partId, receivedQty: Number(l.qty), orderedQty: Number(l.orderedQty) || undefined, lotNumber: l.lotNumber || undefined,
      })),
    }, { onSuccess: onClose });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.sheetHeader}>
            <Text className="text-lg font-bold font-inter text-neutral-900">New GRN</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Warehouse *</Text>
          <View style={styles.pickerWrap}>
            {warehouses.map((w: any) => (
              <TouchableOpacity key={w.id} onPress={() => setForm({ ...form, warehouseId: w.id })} style={[styles.pickerItem, form.warehouseId === w.id && styles.pickerItemActive]}>
                <Text className={`text-xs font-inter ${form.warehouseId === w.id ? 'text-white font-bold' : 'text-neutral-700'}`}>{w.code}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">PO Reference</Text>
              <TextInput style={styles.input} value={form.poReference} onChangeText={(v) => setForm({ ...form, poReference: v })} placeholder="PO-00001" placeholderTextColor={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Supplier</Text>
              <TextInput style={styles.input} value={form.supplierName} onChangeText={(v) => setForm({ ...form, supplierName: v })} placeholder="Supplier name" placeholderTextColor={colors.neutral[400]} />
            </View>
          </View>

          <View style={styles.linesHeader}>
            <Text className="text-sm font-bold font-inter text-neutral-800">Line Items</Text>
            <TouchableOpacity onPress={addLine}><Text className="text-xs font-bold font-inter text-primary-600">+ Add</Text></TouchableOpacity>
          </View>

          {lines.map((l, idx) => (
            <View key={idx} style={styles.lineRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextInput style={styles.input} value={l.partId} onChangeText={(v) => updateLine(idx, 'partId', v)} placeholder="Part ID *" placeholderTextColor={colors.neutral[400]} />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={l.qty} onChangeText={(v) => updateLine(idx, 'qty', v)} placeholder="Received *" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={l.orderedQty} onChangeText={(v) => updateLine(idx, 'orderedQty', v)} placeholder="Ordered" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={l.lotNumber} onChangeText={(v) => updateLine(idx, 'lotNumber', v)} placeholder="Lot #" placeholderTextColor={colors.neutral[400]} />
                </View>
              </View>
              {lines.length > 1 && <TouchableOpacity onPress={() => removeLine(idx)} style={{ padding: 8 }}><Trash2 color={colors.danger[400]} size={16} /></TouchableOpacity>}
            </View>
          ))}

          <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Create GRN</Text>}
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  discrepancyBadge: { alignSelf: 'flex-start', backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e5e5e5' },
  pickerItemActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  linesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 8, gap: 8 },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
