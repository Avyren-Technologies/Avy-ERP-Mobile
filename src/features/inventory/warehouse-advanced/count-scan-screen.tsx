import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ScanLine, Hash, CheckCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useCounts } from '@/features/inventory/api/use-inventory-queries';
import { useEnterCount } from '@/features/inventory/api/use-inventory-mutations';
import { COUNT_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

type ScreenMode = 'list' | 'scan-bin' | 'count-items';

interface BinCountEntry {
  binCode: string;
  items: Array<{ partId: string; partName: string; physicalQty: string }>;
}

export function CountScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [mode, setMode] = useState<ScreenMode>('list');
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [currentBin, setCurrentBin] = useState<BinCountEntry | null>(null);
  const [completedBins, setCompletedBins] = useState<string[]>([]);

  const params = useMemo(() => ({ status: 'CREATED,IN_PROGRESS' }), []);
  const { data, isLoading, refetch, isRefetching } = useCounts(params);
  const enterCountMutation = useEnterCount();
  const items = (data as any)?.data || [];

  const totalBins = selectedCount?.binCount || selectedCount?.bins?.length || 0;
  const countedBins = completedBins.length;

  const handleCountSelect = useCallback((count: any) => {
    setSelectedCount(count);
    setCompletedBins([]);
    setMode('scan-bin');
  }, []);

  const handleBinScan = useCallback((value: string) => {
    const binItems = selectedCount?.countItems?.filter((ci: any) =>
      ci.binCode === value || ci.bin?.code === value,
    ) || [];

    setCurrentBin({
      binCode: value,
      items: binItems.length > 0
        ? binItems.map((ci: any) => ({ partId: ci.partId, partName: ci.partName || ci.part?.name || 'Unknown', physicalQty: '' }))
        : [{ partId: '', partName: 'Unknown Item', physicalQty: '' }],
    });
    setMode('count-items');
  }, [selectedCount]);

  const updateItemQty = useCallback((idx: number, qty: string) => {
    if (!currentBin) return;
    const updated = { ...currentBin, items: currentBin.items.map((it, i) => i === idx ? { ...it, physicalQty: qty } : it) };
    setCurrentBin(updated);
  }, [currentBin]);

  const handleSaveBinCount = useCallback(() => {
    if (!selectedCount || !currentBin) return;
    const entries = currentBin.items
      .filter((it) => it.physicalQty !== '')
      .map((it) => ({ partId: it.partId, binCode: currentBin.binCode, physicalQty: Number(it.physicalQty) }));

    if (entries.length === 0) return;

    enterCountMutation.mutate(
      { id: selectedCount.id, data: { entries } },
      {
        onSuccess: () => {
          setCompletedBins((prev) => [...prev, currentBin.binCode]);
          setCurrentBin(null);
          setMode('scan-bin');
        },
      },
    );
  }, [selectedCount, currentBin, enterCountMutation]);

  const handleFinish = useCallback(() => {
    setMode('list');
    setSelectedCount(null);
    refetch();
  }, [refetch]);

  if (mode === 'scan-bin') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleFinish} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text className="text-lg font-bold text-white font-inter">Scan Bin</Text>
              <Text className="text-xs text-white/70 font-inter">{countedBins} of {totalBins || '?'} bins counted</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: totalBins > 0 ? `${(countedBins / totalBins) * 100}%` : '0%' }]} />
        </View>

        <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <View style={styles.scanPromptCard}>
            <ScanLine color={colors.primary[500]} size={48} />
            <Text className="text-lg font-bold font-inter text-neutral-900 mt-4">Scan Bin Barcode</Text>
            <Text className="text-sm font-inter text-neutral-500 text-center mt-2">
              Point the camera at the bin barcode to start counting items at that location.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.scanStartBtn}
            onPress={() => {
              // show camera
              setMode('list'); // temp: we use inline scanner via BarcodeScanner
            }}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-bold font-inter text-white">Open Scanner</Text>
          </TouchableOpacity>

          {completedBins.length > 0 && (
            <View style={{ width: '100%' }}>
              <Text className="text-xs font-medium font-inter text-neutral-500 mb-2">Completed Bins</Text>
              {completedBins.map((bin) => (
                <View key={bin} style={styles.completedBinRow}>
                  <CheckCircle color="#10b981" size={16} />
                  <Text className="text-sm font-inter text-neutral-700 ml-2">{bin}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={handleFinish} style={{ padding: 12 }}>
            <Text className="text-sm font-inter text-primary-600">Done Counting</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'count-items' && currentBin) {
    const allFilled = currentBin.items.every((it) => it.physicalQty !== '');
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setMode('scan-bin')} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text className="text-lg font-bold text-white font-inter">Bin: {currentBin.binCode}</Text>
              <Text className="text-xs text-white/70 font-inter">{currentBin.items.length} items to count</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {currentBin.items.map((item, idx) => (
            <Animated.View key={idx} entering={FadeInDown.delay(idx * 50).duration(300)}>
              <View style={styles.countItemCard}>
                <Text className="text-sm font-bold font-inter text-neutral-900">{item.partName}</Text>
                <Text className="text-xs font-medium font-inter text-neutral-500 mt-2 mb-1">Physical Qty *</Text>
                <TextInput
                  style={styles.input}
                  value={item.physicalQty}
                  onChangeText={(v) => updateItemQty(idx, v)}
                  keyboardType="numeric"
                  placeholder="Enter count"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            onPress={handleSaveBinCount}
            disabled={!allFilled || enterCountMutation.isPending}
            style={[styles.submitBtn, (!allFilled || enterCountMutation.isPending) && { opacity: 0.5 }]}
          >
            {enterCountMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Save & Next Bin</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // List mode
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const cfg = COUNT_STATUS_CONFIG[item.status] || COUNT_STATUS_CONFIG.CREATED;
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TouchableOpacity style={styles.card} onPress={() => handleCountSelect(item)} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <Text className="text-xs font-bold font-inter text-primary-600">{item.countNumber || '--'}</Text>
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }} className={cfg.bg}>
              <Text className={`text-[10px] font-medium font-inter ${cfg.text}`}>{cfg.label}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-sm font-inter text-neutral-800">{item.countType || 'Cycle Count'}</Text>
            <View style={styles.scanBadge}>
              <ScanLine color={colors.primary[600]} size={14} />
              <Text className="text-[10px] font-bold font-inter text-primary-600 ml-1">COUNT</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">{item.warehouseName || item.warehouse?.name || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-400">{item.createdAt ? fmt.date(item.createdAt) : '--'}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fmt, handleCountSelect]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Count Scan</Text>
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
          ListEmptyComponent={<EmptyState title="No active counts" message="No cycle counts in progress" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scanBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary[200] },
  progressContainer: { height: 4, backgroundColor: '#e5e5e5' },
  progressBar: { height: 4, backgroundColor: colors.primary[500] },
  scanPromptCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e5e5e5', width: '100%' },
  scanStartBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  completedBinRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  countItemCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
