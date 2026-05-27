import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ScanLine, Package, CheckCircle, Truck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useDispatches } from '@/features/inventory/api/use-inventory-queries';
import { useCreateDispatch } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

export function DispatchScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [scanning, setScanning] = useState(false);
  const [scannedPackage, setScannedPackage] = useState<string | null>(null);
  const [packageContents, setPackageContents] = useState<any[]>([]);

  const params = useMemo(() => ({ status: 'CREATED,PACKED' }), []);
  const { data, isLoading, refetch, isRefetching } = useDispatches(params);
  const dispatchMutation = useCreateDispatch();
  const items = (data as any)?.data || [];

  const handleScan = useCallback((value: string) => {
    setScannedPackage(value);
    setScanning(false);
    // Find matching dispatch from data
    const matched = items.find((d: any) =>
      d.packageBarcode === value || d.lpnBarcode === value || d.transactionNumber === value,
    );
    if (matched?.lineItems || matched?.items) {
      setPackageContents(matched.lineItems || matched.items || []);
    } else {
      setPackageContents([]);
    }
  }, [items]);

  const handleConfirmDispatch = useCallback(() => {
    if (!scannedPackage) return;
    dispatchMutation.mutate(
      { packageBarcode: scannedPackage },
      {
        onSuccess: () => {
          setScannedPackage(null);
          setPackageContents([]);
          refetch();
        },
      },
    );
  }, [scannedPackage, dispatchMutation, refetch]);

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        prompt="Scan package or LPN barcode"
        onClose={() => setScanning(false)}
        onManualEntry={() => { setScanning(false); setScannedPackage(''); }}
      />
    );
  }

  if (scannedPackage !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setScannedPackage(null)} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Verify & Dispatch</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, flex: 1 }}>
          <View style={styles.packageCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Package color={colors.primary[500]} size={20} />
              <Text className="text-sm font-bold font-inter text-neutral-900">Package: {scannedPackage || '--'}</Text>
            </View>
          </View>

          {packageContents.length > 0 ? (
            <>
              <Text className="text-xs font-medium font-inter text-neutral-500 mt-4 mb-2">Contents ({packageContents.length} items)</Text>
              <FlatList
                data={packageContents}
                keyExtractor={(_, idx) => String(idx)}
                renderItem={({ item, index }) => (
                  <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
                    <View style={styles.contentRow}>
                      <View style={{ flex: 1 }}>
                        <Text className="text-sm font-inter text-neutral-800">{item.partName || item.part?.name || '--'}</Text>
                        <Text className="text-xs font-inter text-neutral-500">Qty: {item.quantity || item.qty || '--'}</Text>
                      </View>
                      <CheckCircle color="#10b981" size={18} />
                    </View>
                  </Animated.View>
                )}
              />
            </>
          ) : (
            <View style={styles.noContents}>
              <Text className="text-sm font-inter text-neutral-500 text-center">No package details found. Confirm to proceed with dispatch.</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            onPress={handleConfirmDispatch}
            disabled={dispatchMutation.isPending}
            style={[styles.dispatchBtn, dispatchMutation.isPending && { opacity: 0.5 }]}
          >
            {dispatchMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Truck color="#fff" size={18} />
                <Text className="text-sm font-bold font-inter text-white">Confirm Dispatch</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <TouchableOpacity style={styles.card} onPress={() => setScanning(true)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.dispatchNumber || item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'CREATED'} />
        </View>
        <View style={styles.cardRow}>
          <Text className="text-sm font-inter text-neutral-800">{item.customerName || item.customer?.name || '--'}</Text>
          <Text className="text-xs font-inter text-neutral-500">{item.itemCount || item.lineItems?.length || 0} items</Text>
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-400">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
          <View style={styles.scanBadge}>
            <ScanLine color={colors.primary[600]} size={14} />
            <Text className="text-[10px] font-bold font-inter text-primary-600 ml-1">SCAN</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Dispatch Scan</Text>
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
          ListEmptyComponent={<EmptyState title="No pending dispatches" message="All packages have been dispatched" />}
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
  packageCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 16 },
  contentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', padding: 12, marginBottom: 8 },
  noContents: { marginTop: 32, padding: 20, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  dispatchBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
