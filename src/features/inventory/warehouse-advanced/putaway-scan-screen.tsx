import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ScanLine, MapPin, Clock, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { usePendingPutaway } from '@/features/inventory/api/use-inventory-queries';
import { useConfirmPutaway, useSuggestBin } from '@/features/inventory/api/use-inventory-mutations';

export function PutawayScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [scanning, setScanning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [manualBin, setManualBin] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const { data, isLoading, refetch, isRefetching } = usePendingPutaway();
  const confirmMutation = useConfirmPutaway();
  const suggestMutation = useSuggestBin();
  const items = (data as any)?.data || [];

  const handleTaskSelect = useCallback((task: any) => {
    setSelectedTask(task);
    setScanning(true);
    setShowManualEntry(false);
    setManualBin('');
  }, []);

  const handleScan = useCallback((value: string) => {
    if (!selectedTask) return;
    const suggestedBin = selectedTask.suggestedBinCode || selectedTask.suggestedBin?.code;
    if (suggestedBin && value === suggestedBin) {
      confirmMutation.mutate(
        { putawayTaskId: selectedTask.id, binCode: value },
        {
          onSuccess: () => {
            setScanning(false);
            setSelectedTask(null);
            refetch();
          },
        },
      );
    } else {
      confirmMutation.mutate(
        { putawayTaskId: selectedTask.id, binCode: value },
        {
          onSuccess: () => {
            setScanning(false);
            setSelectedTask(null);
            refetch();
          },
        },
      );
    }
  }, [selectedTask, confirmMutation, refetch]);

  const handleManualConfirm = useCallback(() => {
    if (!selectedTask || !manualBin.trim()) return;
    confirmMutation.mutate(
      { putawayTaskId: selectedTask.id, binCode: manualBin.trim() },
      {
        onSuccess: () => {
          setScanning(false);
          setSelectedTask(null);
          setShowManualEntry(false);
          setManualBin('');
          refetch();
        },
      },
    );
  }, [selectedTask, manualBin, confirmMutation, refetch]);

  if (scanning && !showManualEntry) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        prompt={`Scan bin barcode${selectedTask?.suggestedBinCode ? ` (suggested: ${selectedTask.suggestedBinCode})` : ''}`}
        onManualEntry={() => setShowManualEntry(true)}
        onClose={() => { setScanning(false); setSelectedTask(null); }}
      />
    );
  }

  if (scanning && showManualEntry) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { setShowManualEntry(false); setScanning(false); setSelectedTask(null); }} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Manual Bin Entry</Text>
          </View>
        </LinearGradient>
        <View style={{ padding: 20, gap: 16 }}>
          {selectedTask?.suggestedBinCode && (
            <View style={styles.suggestedBanner}>
              <MapPin color={colors.primary[500]} size={16} />
              <Text className="text-sm font-inter text-primary-700 ml-2">Suggested: {selectedTask.suggestedBinCode}</Text>
            </View>
          )}
          <Text className="text-xs font-medium font-inter text-neutral-600">Bin Code *</Text>
          <TextInput
            style={styles.input}
            value={manualBin}
            onChangeText={setManualBin}
            placeholder="Enter bin code"
            placeholderTextColor={colors.neutral[400]}
            autoFocus
          />
          <TouchableOpacity
            onPress={handleManualConfirm}
            disabled={!manualBin.trim() || confirmMutation.isPending}
            style={[styles.submitBtn, (!manualBin.trim() || confirmMutation.isPending) && { opacity: 0.5 }]}
          >
            {confirmMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Confirm Putaway</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowManualEntry(false)} style={{ alignItems: 'center', padding: 12 }}>
            <Text className="text-sm font-inter text-primary-600">Back to Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const timeSince = item.createdAt ? fmt.relativeDate(item.createdAt) : '--';
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TouchableOpacity style={styles.card} onPress={() => handleTaskSelect(item)} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1}>
              {item.partName || item.part?.name || 'Unknown Part'}
            </Text>
            <View style={styles.scanBadge}>
              <ScanLine color={colors.primary[600]} size={14} />
              <Text className="text-[10px] font-bold font-inter text-primary-600 ml-1">SCAN</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">Qty: {item.quantity || item.qty || '--'}</Text>
            {item.lotNumber && <Text className="text-xs font-inter text-neutral-400">Lot: {item.lotNumber}</Text>}
          </View>
          <View style={styles.cardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin color={colors.neutral[400]} size={12} />
              <Text className="text-xs font-inter text-neutral-500">
                Suggested: {item.suggestedBinCode || item.suggestedBin?.code || 'Any'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock color={colors.neutral[400]} size={12} />
              <Text className="text-xs font-inter text-neutral-400">{timeSince}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fmt, handleTaskSelect]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Putaway Scan</Text>
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
          ListEmptyComponent={
            <EmptyState
              title="No pending putaways"
              message="All items have been put away"
            />
          }
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
  suggestedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[50], borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.primary[200] },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
