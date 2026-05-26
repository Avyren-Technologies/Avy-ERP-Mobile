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
import { useMaterialReturns } from '@/features/inventory/api/use-inventory-queries';
import { useCreateMaterialReturn } from '@/features/inventory/api/use-inventory-mutations';

const CONDITION_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; description: string }> = {
  UNUSED: { bg: '#ecfdf5', border: '#a7f3d0', text: 'text-emerald-700', label: 'Unused', description: 'Material in original condition' },
  PARTIALLY_USED: { bg: '#fffbeb', border: '#fde68a', text: 'text-amber-700', label: 'Partially Used', description: 'Partially consumed in production' },
  CONTAMINATED: { bg: '#fff1f2', border: '#fecdd3', text: 'text-red-700', label: 'Contaminated', description: 'May not be reusable' },
};

const ROUTED_TO_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  AVAILABLE: { bg: '#ecfdf5', border: '#a7f3d0', text: 'text-emerald-700', label: 'Available Stock' },
  QC_HOLD: { bg: '#fffbeb', border: '#fde68a', text: 'text-amber-700', label: 'QC Hold' },
  REJECT: { bg: '#fff1f2', border: '#fecdd3', text: 'text-red-700', label: 'Rejected' },
};

const CONDITION_TO_ROUTE: Record<string, string> = {
  UNUSED: 'AVAILABLE',
  PARTIALLY_USED: 'QC_HOLD',
  CONTAMINATED: 'REJECT',
};

export function MaterialReturnScreen() {
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

  const { data, isLoading, refetch, isRefetching } = useMaterialReturns(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const condition = item.returnCondition || item.condition || 'UNUSED';
    const condConfig = CONDITION_CONFIG[condition] || CONDITION_CONFIG.UNUSED;
    const routedTo = item.routedTo || item.stockRouting || CONDITION_TO_ROUTE[condition] || 'AVAILABLE';
    const routeConfig = ROUTED_TO_CONFIG[routedTo] || ROUTED_TO_CONFIG.AVAILABLE;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || '--'}</Text>
            <View style={[styles.condBadge, { backgroundColor: condConfig.bg, borderColor: condConfig.border }]}>
              <Text className={`text-[10px] font-medium font-inter ${condConfig.text}`}>{condConfig.label}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-600">WO: {item.workOrderNumber || item.workOrder?.woNumber || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
          </View>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-bold font-inter text-neutral-700">{item.partNumber || item.part?.partNumber || '--'}</Text>
              <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{item.partName || item.part?.name || ''}</Text>
            </View>
            <Text className="text-sm font-bold font-inter text-neutral-900">{Number(item.returnQty ?? item.quantity ?? 0).toLocaleString()}</Text>
          </View>
          <View style={{ marginTop: 4 }}>
            <View style={[styles.routeBadge, { backgroundColor: routeConfig.bg, borderColor: routeConfig.border }]}>
              <Text className={`text-[10px] font-medium font-inter ${routeConfig.text}`}>Routed to: {routeConfig.label}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }, [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Material Return</Text>
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
          ListEmptyComponent={<EmptyState title="No material returns" message="Return unused materials from production" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />

      {showForm && <CreateMaterialReturnSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateMaterialReturnSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateMaterialReturn();
  const [form, setForm] = useState({
    workOrderId: '',
    partId: '',
    returnQty: '1',
    returnCondition: 'UNUSED',
    lotNumber: '',
    remarks: '',
  });

  const routedTo = CONDITION_TO_ROUTE[form.returnCondition] || 'AVAILABLE';
  const routeConfig = ROUTED_TO_CONFIG[routedTo] || ROUTED_TO_CONFIG.AVAILABLE;
  const canSubmit = form.workOrderId && form.partId && Number(form.returnQty) > 0;

  const handleSubmit = () => {
    createMutation.mutate(
      {
        workOrderId: form.workOrderId,
        partId: form.partId,
        returnQty: Number(form.returnQty),
        returnCondition: form.returnCondition,
        lotNumber: form.lotNumber || undefined,
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
            <Text className="text-lg font-bold font-inter text-neutral-900">New Material Return</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Work Order ID *</Text>
          <TextInput style={styles.input} value={form.workOrderId} onChangeText={(v) => setForm({ ...form, workOrderId: v })} placeholder="Work Order ID" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">Part ID *</Text>
          <TextInput style={styles.input} value={form.partId} onChangeText={(v) => setForm({ ...form, partId: v })} placeholder="Part issued to this WO" placeholderTextColor={colors.neutral[400]} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Return Qty *</Text>
              <TextInput style={styles.input} value={form.returnQty} onChangeText={(v) => setForm({ ...form, returnQty: v })} keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Lot Number</Text>
              <TextInput style={styles.input} value={form.lotNumber} onChangeText={(v) => setForm({ ...form, lotNumber: v })} placeholder="From original issue" placeholderTextColor={colors.neutral[400]} />
            </View>
          </View>

          {/* Return Condition */}
          <Text className="text-xs font-medium font-inter text-neutral-600 mb-2 mt-4">Return Condition *</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(CONDITION_CONFIG).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setForm({ ...form, returnCondition: key })}
                style={[
                  styles.conditionBtn,
                  { backgroundColor: form.returnCondition === key ? config.bg : '#fff', borderColor: form.returnCondition === key ? config.border : '#e5e5e5' },
                ]}
              >
                <Text className={`text-xs font-bold font-inter ${form.returnCondition === key ? config.text : 'text-neutral-700'}`}>{config.label}</Text>
                <Text className="text-[10px] font-inter text-neutral-500 mt-0.5">{config.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stock routing preview */}
          <View style={[styles.routePreview, { backgroundColor: routeConfig.bg, borderColor: routeConfig.border }]}>
            <Text className={`text-xs font-medium font-inter ${routeConfig.text}`}>
              Stock will be routed to: <Text className="font-bold font-inter">{routeConfig.label}</Text>
            </Text>
          </View>

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
              <Text className="text-sm font-bold font-inter text-white">Submit Return</Text>
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
  condBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  routeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  conditionBtn: { borderRadius: 12, borderWidth: 2, padding: 12 },
  routePreview: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
