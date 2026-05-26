import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useFgReceipts } from '@/features/inventory/api/use-inventory-queries';
import { useCreateFgReceipt } from '@/features/inventory/api/use-inventory-mutations';

const QC_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PASSED: { bg: '#ecfdf5', text: 'text-emerald-700', label: 'Passed' },
  FAILED: { bg: '#fff1f2', text: 'text-red-700', label: 'Failed' },
  PENDING: { bg: '#fffbeb', text: 'text-amber-700', label: 'Pending QC' },
  NOT_APPLICABLE: { bg: '#f9fafb', text: 'text-gray-600', label: 'N/A' },
};

export function FgReceiptScreen() {
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

  const { data, isLoading, refetch, isRefetching } = useFgReceipts(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const declared = Number(item.declaredQty ?? 0);
    const received = Number(item.receivedQty ?? 0);
    const variance = received - declared;
    const qcStatus = item.qcStatus || 'NOT_APPLICABLE';
    const qcConfig = QC_STATUS_COLORS[qcStatus] || QC_STATUS_COLORS.NOT_APPLICABLE;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || '--'}</Text>
            <View style={[styles.qcBadge, { backgroundColor: qcConfig.bg }]}>
              <Text className={`text-[10px] font-medium font-inter ${qcConfig.text}`}>{qcConfig.label}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-600">WO: {item.workOrderNumber || item.workOrder?.woNumber || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-400">Declared: {declared.toLocaleString()} / Received: {received.toLocaleString()}</Text>
            {variance !== 0 && (
              <Text className={`text-xs font-medium font-inter ${variance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {variance > 0 ? '+' : ''}{variance.toLocaleString()}
              </Text>
            )}
          </View>
          {item.wipCleared && (
            <View style={{ marginTop: 4 }}>
              <Text className="text-[10px] font-medium font-inter text-emerald-600">WIP Cleared</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }, [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">FG Receipt</Text>
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
          ListEmptyComponent={<EmptyState title="No FG receipts" message="Receive finished goods from production" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />

      {showForm && <CreateFgReceiptSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateFgReceiptSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateFgReceipt();
  const [form, setForm] = useState({
    workOrderId: '',
    fgPartId: '',
    declaredQty: '0',
    receivedQty: '0',
    fgLotNumber: '',
    remarks: '',
  });

  const variance = Number(form.receivedQty) - Number(form.declaredQty);
  const canSubmit = form.workOrderId && form.fgPartId && Number(form.receivedQty) > 0;

  const handleSubmit = () => {
    createMutation.mutate(
      {
        workOrderId: form.workOrderId,
        fgPartId: form.fgPartId,
        declaredQty: Number(form.declaredQty),
        receivedQty: Number(form.receivedQty),
        fgLotNumber: form.fgLotNumber || undefined,
        remarks: form.remarks || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.sheetHeader}>
            <Text className="text-lg font-bold font-inter text-neutral-900">New FG Receipt</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Work Order ID *</Text>
          <TextInput style={styles.input} value={form.workOrderId} onChangeText={(v) => setForm({ ...form, workOrderId: v })} placeholder="Work Order ID" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">FG Part ID *</Text>
          <TextInput style={styles.input} value={form.fgPartId} onChangeText={(v) => setForm({ ...form, fgPartId: v })} placeholder="Finished Good Part" placeholderTextColor={colors.neutral[400]} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Declared Qty</Text>
              <TextInput style={styles.input} value={form.declaredQty} onChangeText={(v) => setForm({ ...form, declaredQty: v })} keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Received Qty *</Text>
              <TextInput style={styles.input} value={form.receivedQty} onChangeText={(v) => setForm({ ...form, receivedQty: v })} keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
            </View>
          </View>

          {Number(form.declaredQty) > 0 && Number(form.receivedQty) > 0 && variance !== 0 && (
            <View style={styles.varianceBanner}>
              <Text className="text-xs font-medium font-inter text-amber-700">
                Variance: {variance > 0 ? '+' : ''}{variance} ({variance > 0 ? 'over-receipt' : 'short receipt'})
              </Text>
            </View>
          )}

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">FG Lot Number</Text>
          <TextInput style={styles.input} value={form.fgLotNumber} onChangeText={(v) => setForm({ ...form, fgLotNumber: v })} placeholder="Optional" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">Remarks</Text>
          <TextInput style={styles.input} value={form.remarks} onChangeText={(v) => setForm({ ...form, remarks: v })} placeholder="Optional" placeholderTextColor={colors.neutral[400]} />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || createMutation.isPending}
            style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Record Receipt</Text>
            )}
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
  qcBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  varianceBanner: { backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', padding: 12, marginTop: 12 },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
