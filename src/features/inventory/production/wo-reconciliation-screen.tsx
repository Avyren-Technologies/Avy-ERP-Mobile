import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useWoReconciliation } from '@/features/inventory/api/use-inventory-queries';
import { useGenerateWoReconciliation } from '@/features/inventory/api/use-inventory-mutations';

export function WoReconciliationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [workOrderId, setWorkOrderId] = useState('');
  const [selectedWo, setSelectedWo] = useState('');

  const { data, isLoading, isFetching } = useWoReconciliation(selectedWo);
  const generateMutation = useGenerateWoReconciliation();

  const reconciliation = (data as any)?.data;
  const lines = reconciliation?.lines || reconciliation?.items || [];
  const hasData = lines.length > 0;

  const handleSearch = () => {
    if (workOrderId.trim()) {
      setSelectedWo(workOrderId.trim());
    }
  };

  const handleGenerate = () => {
    if (selectedWo) {
      generateMutation.mutate(selectedWo);
    }
  };

  // Compute summary totals
  const totals = lines.reduce(
    (acc: any, li: any) => ({
      bomRequired: acc.bomRequired + Number(li.bomRequiredQty ?? 0),
      totalIssued: acc.totalIssued + Number(li.totalIssuedQty ?? 0),
      returned: acc.returned + Number(li.returnedQty ?? 0),
      scrapped: acc.scrapped + Number(li.scrappedQty ?? 0),
      consumedInFg: acc.consumedInFg + Number(li.consumedInFgQty ?? 0),
      variance: acc.variance + Number(li.varianceQty ?? 0),
    }),
    { bomRequired: 0, totalIssued: 0, returned: 0, scrapped: 0, consumedInFg: 0, variance: 0 },
  );

  const getVarianceColor = (v: number) => {
    if (v === 0) return 'text-emerald-600';
    if (v > 0) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">WO Reconciliation</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* WO Selector */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={workOrderId}
            onChangeText={setWorkOrderId}
            placeholder="Enter Work Order ID..."
            placeholderTextColor={colors.neutral[400]}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} style={styles.loadBtn}>
            <Text className="text-sm font-bold font-inter text-white">Load</Text>
          </TouchableOpacity>
        </View>

        {selectedWo && (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
            style={styles.generateBtn}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.neutral[600]} />
            ) : (
              <RefreshCw color={colors.neutral[600]} size={16} />
            )}
            <Text className="text-xs font-medium font-inter text-neutral-700 ml-2">
              {hasData ? 'Refresh Reconciliation' : 'Generate Reconciliation'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        {!selectedWo ? (
          <EmptyState title="Enter a Work Order ID" message="View material reconciliation for a work order" />
        ) : isLoading || isFetching ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
        ) : !hasData ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text className="text-sm font-inter text-neutral-400 mb-3">No reconciliation data available</Text>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generateMutation.isPending}
              style={[styles.loadBtn, { paddingHorizontal: 20 }]}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-sm font-bold font-inter text-white">Generate Reconciliation</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* WO Info */}
            {reconciliation?.workOrder && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.woInfoCard}>
                <Text className="text-sm font-bold font-inter text-neutral-900">{reconciliation.workOrder.woNumber || selectedWo}</Text>
                {reconciliation.workOrder.fgPartName && (
                  <Text className="text-xs font-inter text-neutral-500">FG: {reconciliation.workOrder.fgPartName}</Text>
                )}
                {reconciliation.generatedAt && (
                  <Text className="text-[10px] font-inter text-neutral-400 mt-1">Generated: {fmt.dateTime(reconciliation.generatedAt)}</Text>
                )}
              </Animated.View>
            )}

            {/* Reconciliation cards */}
            {lines.map((li: any, idx: number) => {
              const variance = Number(li.varianceQty ?? 0);
              return (
                <Animated.View key={li.partId || idx} entering={FadeInDown.delay(idx * 50).duration(300)} style={styles.reconCard}>
                  <View style={{ marginBottom: 8 }}>
                    <Text className="text-xs font-bold font-inter text-primary-600">{li.partNumber || li.part?.partNumber || '--'}</Text>
                    <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{li.partName || li.part?.name || ''}</Text>
                  </View>
                  <View style={styles.reconGrid}>
                    <ReconItem label="BOM Req" value={Number(li.bomRequiredQty ?? 0)} />
                    <ReconItem label="Issued" value={Number(li.totalIssuedQty ?? 0)} bold />
                    <ReconItem label="Returned" value={Number(li.returnedQty ?? 0)} color="text-blue-600" />
                    <ReconItem label="Scrapped" value={Number(li.scrappedQty ?? 0)} color="text-red-600" />
                    <ReconItem label="Consumed" value={Number(li.consumedInFgQty ?? 0)} color="text-emerald-600" />
                    <ReconItem label="Variance" value={variance} color={getVarianceColor(variance)} bold prefix={variance > 0 ? '+' : ''} />
                  </View>
                </Animated.View>
              );
            })}

            {/* Summary */}
            <Animated.View entering={FadeInDown.delay(lines.length * 50).duration(300)} style={[styles.reconCard, { backgroundColor: '#f0f0f0' }]}>
              <Text className="text-xs font-bold font-inter text-neutral-600 uppercase mb-2">Totals</Text>
              <View style={styles.reconGrid}>
                <ReconItem label="BOM Req" value={totals.bomRequired} />
                <ReconItem label="Issued" value={totals.totalIssued} bold />
                <ReconItem label="Returned" value={totals.returned} color="text-blue-600" />
                <ReconItem label="Scrapped" value={totals.scrapped} color="text-red-600" />
                <ReconItem label="Consumed" value={totals.consumedInFg} color="text-emerald-600" />
                <ReconItem label="Variance" value={totals.variance} color={getVarianceColor(totals.variance)} bold prefix={totals.variance > 0 ? '+' : ''} />
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReconItem({ label, value, bold, color, prefix }: { label: string; value: number; bold?: boolean; color?: string; prefix?: string }) {
  return (
    <View style={styles.reconItem}>
      <Text className="text-[10px] font-inter text-neutral-400">{label}</Text>
      <Text className={`text-sm font-inter ${bold ? 'font-bold' : 'font-medium'} ${color || 'text-neutral-700'}`}>
        {prefix || ''}{value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  loadBtn: { backgroundColor: colors.primary[600], borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, backgroundColor: '#fff' },
  woInfoCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 12 },
  reconCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  reconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reconItem: { width: '30%', flexGrow: 1 },
});
