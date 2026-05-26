import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useGrn } from '@/features/inventory/api/use-inventory-queries';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';

const DISCREPANCY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OVER_RECEIPT: { bg: '#fffbeb', text: 'text-amber-700', label: 'Over Receipt' },
  SHORT_DELIVERY: { bg: '#fff1f2', text: 'text-red-700', label: 'Short Delivery' },
  NONE: { bg: '#ecfdf5', text: 'text-emerald-700', label: 'None' },
};

export function GrnDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fmt = useCompanyFormatter();
  const { data, isLoading } = useGrn(id || '');
  const grn = (data as any)?.data;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">GRN Detail</Text>
          </View>
        </LinearGradient>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      </View>
    );
  }

  if (!grn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">GRN Detail</Text>
          </View>
        </LinearGradient>
        <EmptyState title="GRN not found" description="This GRN may have been removed" />
      </View>
    );
  }

  const lineItems = grn.lineItems || grn.lines || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="text-xl font-bold text-white font-inter">{grn.grnNumber || grn.transactionNumber || 'GRN'}</Text>
          </View>
          <TransactionStatusBadge status={grn.status || 'DRAFT'} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <InfoItem label="PO Reference" value={grn.poReference || grn.poNumber || '--'} />
            <InfoItem label="Supplier" value={grn.supplierName || grn.supplier?.name || '--'} />
            <InfoItem label="Warehouse" value={grn.warehouse?.code || grn.warehouseCode || '--'} />
            <InfoItem label="Received At" value={grn.receivedAt ? fmt.dateTime(grn.receivedAt) : grn.createdAt ? fmt.dateTime(grn.createdAt) : '--'} />
          </View>
        </Animated.View>

        {/* Line Items */}
        <Text className="text-sm font-bold font-inter text-neutral-800 mt-6 mb-3">Line Items ({lineItems.length})</Text>
        {lineItems.length === 0 ? (
          <Text className="text-sm font-inter text-neutral-400 text-center py-8">No line items</Text>
        ) : (
          lineItems.map((li: any, idx: number) => {
            const discrepancy = li.discrepancyType || li.discrepancy || 'NONE';
            const dConfig = DISCREPANCY_COLORS[discrepancy] || DISCREPANCY_COLORS.NONE;
            return (
              <Animated.View key={li.id || idx} entering={FadeInDown.delay(idx * 50).duration(300)} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <View style={{ flex: 1 }}>
                    <Text className="text-xs font-bold font-inter text-primary-600">{li.partNumber || li.part?.partNumber || '--'}</Text>
                    <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{li.partName || li.part?.name || ''}</Text>
                  </View>
                  <View style={[styles.discBadge, { backgroundColor: dConfig.bg }]}>
                    <Text className={`text-[10px] font-medium font-inter ${dConfig.text}`}>{dConfig.label}</Text>
                  </View>
                </View>
                <View style={styles.qtyRow}>
                  <QtyItem label="Ordered" value={Number(li.orderedQty ?? 0)} />
                  <QtyItem label="Received" value={Number(li.receivedQty ?? li.quantity ?? 0)} bold />
                  <QtyItem label="Accepted" value={Number(li.acceptedQty ?? 0)} color="text-emerald-600" />
                  <QtyItem label="Rejected" value={Number(li.rejectedQty ?? 0)} color="text-red-600" />
                </View>
                {li.lotNumber && <Text className="text-[10px] font-inter text-neutral-400 mt-1">Lot: {li.lotNumber}{li.expiryDate ? ` / Exp: ${fmt.date(li.expiryDate)}` : ''}</Text>}
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
      <Text className="text-sm font-semibold font-inter text-neutral-900 mt-1">{value}</Text>
    </View>
  );
}

function QtyItem({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text className="text-[10px] font-inter text-neutral-400">{label}</Text>
      <Text className={`text-sm font-inter ${bold ? 'font-bold text-neutral-900' : color || 'text-neutral-700'}`}>{value.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5', padding: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoItem: { width: '45%', flexGrow: 1 },
  lineCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', gap: 8 },
  discBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
});
