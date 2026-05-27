import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ScanLine, AlertTriangle, Package, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { usePickItems } from '@/features/inventory/api/use-inventory-queries';
import { useConfirmPick } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

type ScanStep = 'list' | 'scan-bin' | 'scan-item' | 'confirm-qty';

export function PickScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [step, setStep] = useState<ScanStep>('list');
  const [selectedPick, setSelectedPick] = useState<any>(null);
  const [scannedBin, setScannedBin] = useState('');
  const [scannedItem, setScannedItem] = useState('');
  const [pickQty, setPickQty] = useState('');
  const [shortPickWarning, setShortPickWarning] = useState(false);

  const params = useMemo(() => ({ status: 'CREATED' }), []);
  const { data, isLoading, refetch, isRefetching } = usePickItems(params);
  const confirmMutation = useConfirmPick();
  const items = (data as any)?.data || [];

  const handlePickSelect = useCallback((pick: any) => {
    setSelectedPick(pick);
    setStep('scan-bin');
    setScannedBin('');
    setScannedItem('');
    setPickQty('');
    setShortPickWarning(false);
  }, []);

  const handleBinScan = useCallback((value: string) => {
    setScannedBin(value);
    setStep('scan-item');
  }, []);

  const handleItemScan = useCallback((value: string) => {
    setScannedItem(value);
    setStep('confirm-qty');
    const requiredQty = selectedPick?.requestedQty || selectedPick?.quantity || '';
    setPickQty(String(requiredQty));
  }, [selectedPick]);

  const handleConfirmQty = useCallback(() => {
    if (!selectedPick || !pickQty) return;
    const qty = Number(pickQty);
    const required = Number(selectedPick.requestedQty || selectedPick.quantity || 0);
    if (qty < required) {
      setShortPickWarning(true);
    }
    confirmMutation.mutate(
      {
        id: selectedPick.id,
        data: { binCode: scannedBin, itemCode: scannedItem, pickedQty: qty },
      },
      {
        onSuccess: () => {
          setStep('list');
          setSelectedPick(null);
          refetch();
        },
      },
    );
  }, [selectedPick, pickQty, scannedBin, scannedItem, confirmMutation, refetch]);

  const handleCancel = useCallback(() => {
    setStep('list');
    setSelectedPick(null);
  }, []);

  if (step === 'scan-bin') {
    return (
      <BarcodeScanner
        onScan={handleBinScan}
        prompt="Scan the bin barcode"
        onManualEntry={() => { setScannedBin('MANUAL'); setStep('scan-item'); }}
        onClose={handleCancel}
      />
    );
  }

  if (step === 'scan-item') {
    return (
      <BarcodeScanner
        onScan={handleItemScan}
        prompt="Scan the item barcode"
        onManualEntry={() => { setScannedItem('MANUAL'); setStep('confirm-qty'); setPickQty(String(selectedPick?.requestedQty || '')); }}
        onClose={handleCancel}
      />
    );
  }

  if (step === 'confirm-qty') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleCancel} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Confirm Pick Qty</Text>
          </View>
        </LinearGradient>
        <View style={{ padding: 20, gap: 16 }}>
          <View style={styles.infoCard}>
            <Text className="text-sm font-bold font-inter text-neutral-900">{selectedPick?.partName || selectedPick?.part?.name || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-500 mt-1">Bin: {scannedBin} | Required: {selectedPick?.requestedQty || selectedPick?.quantity || '--'}</Text>
          </View>

          {shortPickWarning && (
            <View style={styles.warningBanner}>
              <AlertTriangle color="#d97706" size={16} />
              <Text className="text-xs font-medium font-inter text-amber-700 ml-2">Short pick: quantity is less than requested</Text>
            </View>
          )}

          <Text className="text-xs font-medium font-inter text-neutral-600">Picked Quantity *</Text>
          <TextInput
            style={styles.input}
            value={pickQty}
            onChangeText={(v) => {
              setPickQty(v);
              const required = Number(selectedPick?.requestedQty || selectedPick?.quantity || 0);
              setShortPickWarning(Number(v) < required && Number(v) > 0);
            }}
            keyboardType="numeric"
            placeholder="Enter quantity"
            placeholderTextColor={colors.neutral[400]}
            autoFocus
          />

          <TouchableOpacity
            onPress={handleConfirmQty}
            disabled={!pickQty || Number(pickQty) <= 0 || confirmMutation.isPending}
            style={[styles.submitBtn, (!pickQty || Number(pickQty) <= 0 || confirmMutation.isPending) && { opacity: 0.5 }]}
          >
            {confirmMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Confirm Pick</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <TouchableOpacity style={styles.card} onPress={() => handlePickSelect(item)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.pickListNumber || item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'CREATED'} />
        </View>
        <View style={styles.cardRow}>
          <Text className="text-sm font-inter text-neutral-800">{item.partName || item.part?.name || '--'}</Text>
          <View style={styles.scanBadge}>
            <ScanLine color={colors.primary[600]} size={14} />
            <Text className="text-[10px] font-bold font-inter text-primary-600 ml-1">PICK</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-500">Qty: {item.requestedQty || item.quantity || '--'}</Text>
          <Text className="text-xs font-inter text-neutral-400">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [fmt, handlePickSelect]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Pick Scan</Text>
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
          ListEmptyComponent={<EmptyState title="No active pick lists" message="No items awaiting pick" />}
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
  infoCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', padding: 14 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', padding: 12 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
