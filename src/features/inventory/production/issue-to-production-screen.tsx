import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIssueToProduction } from '@/features/inventory/api/use-inventory-queries';
import { useCreateIssueToProduction } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';
import { BomIssueCounter } from '@/features/inventory/shared/BomIssueCounter';

export function IssueToProductionScreen() {
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

  const { data, isLoading, refetch, isRefetching } = useIssueToProduction(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/inventory/production/issue-detail/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.issueNumber || item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'DRAFT'} />
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-600">WO: {item.workOrderNumber || item.workOrder?.woNumber || '--'}</Text>
          <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-400">{item.lineItems?.length || item.partCount || 0} parts</Text>
          {item.isPartialIssue ? (
            <View style={[styles.typeBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Text className="text-[10px] font-medium font-inter text-amber-600">Partial</Text>
            </View>
          ) : (
            <View style={[styles.typeBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
              <Text className="text-[10px] font-medium font-inter text-emerald-600">Full</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [fmt, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Issue to Production</Text>
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
          ListEmptyComponent={<EmptyState title="No production issues" message="Issue raw materials to work orders" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />

      {showForm && <CreateIssueSheet onClose={() => setShowForm(false)} />}
    </View>
  );
}

function CreateIssueSheet({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateIssueToProduction();
  const [workOrderId, setWorkOrderId] = useState('');
  const [lineItems, setLineItems] = useState([
    { partId: '', bomRequiredQty: '0', issueQty: '1', lotId: '', overIssueReason: '' },
  ]);
  const [hasOverIssue, setHasOverIssue] = useState(false);

  const addLine = () => setLineItems([...lineItems, { partId: '', bomRequiredQty: '0', issueQty: '1', lotId: '', overIssueReason: '' }]);
  const removeLine = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const updated = lineItems.map((li, i) => i === idx ? { ...li, [field]: value } : li);
    setLineItems(updated);
    setHasOverIssue(updated.some(li => Number(li.issueQty) > Number(li.bomRequiredQty) && Number(li.bomRequiredQty) > 0));
  };

  const canSubmit = workOrderId && lineItems.length > 0 && lineItems.every(li => li.partId && Number(li.issueQty) > 0);

  const handleSubmit = () => {
    createMutation.mutate(
      {
        workOrderId,
        lineItems: lineItems.map(li => ({
          partId: li.partId,
          issueQty: Number(li.issueQty),
          bomRequiredQty: Number(li.bomRequiredQty) || undefined,
          lotId: li.lotId || undefined,
          overIssueReason: li.overIssueReason || undefined,
        })),
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
            <Text className="text-lg font-bold font-inter text-neutral-900">New Issue to Production</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Work Order ID *</Text>
          <TextInput style={styles.input} value={workOrderId} onChangeText={setWorkOrderId} placeholder="Work Order ID" placeholderTextColor={colors.neutral[400]} />

          {hasOverIssue && (
            <View style={styles.warningBanner}>
              <Text className="text-xs font-medium font-inter text-amber-700">Some items exceed BOM required quantity. Provide an over-issue reason.</Text>
            </View>
          )}

          <View style={styles.linesHeader}>
            <Text className="text-sm font-bold font-inter text-neutral-800">Line Items</Text>
            <TouchableOpacity onPress={addLine}><Text className="text-xs font-bold font-inter text-primary-600">+ Add</Text></TouchableOpacity>
          </View>

          {lineItems.map((li, idx) => {
            const isOverIssued = Number(li.issueQty) > Number(li.bomRequiredQty) && Number(li.bomRequiredQty) > 0;
            return (
              <View key={idx} style={styles.lineRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <TextInput style={styles.input} value={li.partId} onChangeText={(v) => updateLine(idx, 'partId', v)} placeholder="Part ID *" placeholderTextColor={colors.neutral[400]} />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={li.bomRequiredQty} onChangeText={(v) => updateLine(idx, 'bomRequiredQty', v)} placeholder="BOM Req" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={li.issueQty} onChangeText={(v) => updateLine(idx, 'issueQty', v)} placeholder="Issue Qty *" keyboardType="numeric" placeholderTextColor={colors.neutral[400]} />
                  </View>
                  <TextInput style={styles.input} value={li.lotId} onChangeText={(v) => updateLine(idx, 'lotId', v)} placeholder="Lot ID (Auto FEFO/FIFO)" placeholderTextColor={colors.neutral[400]} />
                  {Number(li.bomRequiredQty) > 0 && (
                    <BomIssueCounter bomRequired={Number(li.bomRequiredQty)} cumulativeIssued={Number(li.issueQty)} remaining={Math.max(0, Number(li.bomRequiredQty) - Number(li.issueQty))} compact />
                  )}
                  {isOverIssued && (
                    <TextInput style={[styles.input, { borderColor: '#fde68a' }]} value={li.overIssueReason} onChangeText={(v) => updateLine(idx, 'overIssueReason', v)} placeholder="Over-issue reason *" placeholderTextColor={colors.warning[400]} />
                  )}
                </View>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(idx)} style={{ padding: 8 }}><Trash2 color={colors.danger[400]} size={16} /></TouchableOpacity>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || createMutation.isPending}
            style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Issue to Production</Text>
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
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  linesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f9fafb', borderRadius: 12, padding: 10, marginBottom: 8, gap: 8 },
  warningBanner: { backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', padding: 12, marginTop: 12 },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
