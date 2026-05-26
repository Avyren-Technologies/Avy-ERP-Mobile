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
import { useProductionScraps } from '@/features/inventory/api/use-inventory-queries';
import { useCreateProductionScrap } from '@/features/inventory/api/use-inventory-mutations';
import { ScrapCategoryPicker } from '@/features/inventory/shared/ScrapCategoryPicker';

const DISPOSITION_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  LANDFILL: { bg: '#f9fafb', border: '#e5e5e5', text: 'text-gray-600', label: 'Landfill / Dispose' },
  SALVAGE: { bg: '#fffbeb', border: '#fde68a', text: 'text-amber-700', label: 'Salvage' },
  REWORK_POSSIBLE: { bg: '#eff6ff', border: '#bfdbfe', text: 'text-blue-700', label: 'Rework Possible' },
};

export function ProductionScrapScreen() {
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

  const { data, isLoading, refetch, isRefetching } = useProductionScraps(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const disposition = item.disposition || 'LANDFILL';
    const dispConfig = DISPOSITION_CONFIG[disposition] || DISPOSITION_CONFIG.LANDFILL;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || '--'}</Text>
            <View style={[styles.dispBadge, { backgroundColor: dispConfig.bg, borderColor: dispConfig.border }]}>
              <Text className={`text-[10px] font-medium font-inter ${dispConfig.text}`}>{dispConfig.label}</Text>
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
            <Text className="text-sm font-bold font-inter text-red-600">{Number(item.scrapQty ?? item.quantity ?? 0).toLocaleString()}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-[10px] font-inter text-neutral-400">Category: {item.scrapCategory?.name || item.scrapCategoryName || '--'}</Text>
            <Text className="text-[10px] font-inter text-neutral-400">Machine: {item.machineName || item.machine?.name || '--'}</Text>
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
          <Text className="text-xl font-bold text-white font-inter ml-3">Production Scrap</Text>
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
          ListEmptyComponent={<EmptyState title="No production scrap" message="Log and track production scrap" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />

      {showForm && <CreateScrapSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateScrapSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateProductionScrap();
  const [form, setForm] = useState({
    workOrderId: '',
    partId: '',
    scrapQty: '1',
    scrapCategoryId: '',
    operation: '',
    machineId: '',
    lotNumber: '',
    disposition: 'LANDFILL',
    remarks: '',
  });

  const canSubmit = form.workOrderId && form.partId && Number(form.scrapQty) > 0 && form.scrapCategoryId;

  const handleSubmit = () => {
    createMutation.mutate(
      {
        workOrderId: form.workOrderId,
        partId: form.partId,
        scrapQty: Number(form.scrapQty),
        scrapCategoryId: form.scrapCategoryId,
        operation: form.operation || undefined,
        machineId: form.machineId || undefined,
        lotNumber: form.lotNumber || undefined,
        disposition: form.disposition,
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
            <Text className="text-lg font-bold font-inter text-neutral-900">Log Production Scrap</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Work Order ID *</Text>
          <TextInput style={styles.input} value={form.workOrderId} onChangeText={(v) => setForm({ ...form, workOrderId: v })} placeholder="Work Order ID" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">Part ID *</Text>
          <TextInput style={styles.input} value={form.partId} onChangeText={(v) => setForm({ ...form, partId: v })} placeholder="Scrapped Part" placeholderTextColor={colors.neutral[400]} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Scrap Qty *</Text>
              <TextInput style={styles.input} value={form.scrapQty} onChangeText={(v) => setForm({ ...form, scrapQty: v })} keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Operation</Text>
              <TextInput style={styles.input} value={form.operation} onChangeText={(v) => setForm({ ...form, operation: v })} placeholder="Optional" placeholderTextColor={colors.neutral[400]} />
            </View>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">Scrap Category *</Text>
          <ScrapCategoryPicker value={form.scrapCategoryId} onChange={(v) => setForm({ ...form, scrapCategoryId: v })} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Machine ID</Text>
              <TextInput style={styles.input} value={form.machineId} onChangeText={(v) => setForm({ ...form, machineId: v })} placeholder="Optional" placeholderTextColor={colors.neutral[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Lot Number</Text>
              <TextInput style={styles.input} value={form.lotNumber} onChangeText={(v) => setForm({ ...form, lotNumber: v })} placeholder="From issued lots" placeholderTextColor={colors.neutral[400]} />
            </View>
          </View>

          {/* Disposition */}
          <Text className="text-xs font-medium font-inter text-neutral-600 mb-2 mt-4">Disposition *</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(DISPOSITION_CONFIG).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setForm({ ...form, disposition: key })}
                style={[
                  styles.dispositionBtn,
                  { backgroundColor: form.disposition === key ? config.bg : '#fff', borderColor: form.disposition === key ? config.border : '#e5e5e5' },
                ]}
              >
                <Text className={`text-xs font-bold font-inter ${form.disposition === key ? config.text : 'text-neutral-700'}`}>{config.label}</Text>
              </TouchableOpacity>
            ))}
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
              <Text className="text-sm font-bold font-inter text-white">Log Scrap</Text>
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
  dispBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  dispositionBtn: { borderRadius: 12, borderWidth: 2, padding: 12 },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
