import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIssueToProductionDetail, useWipStock } from '@/features/inventory/api/use-inventory-queries';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';
import { BomIssueCounter } from '@/features/inventory/shared/BomIssueCounter';
import { WipBalanceCard } from '@/features/inventory/shared/WipBalanceCard';

export function IssueToProductionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fmt = useCompanyFormatter();
  const { data, isLoading } = useIssueToProductionDetail(id || '');
  const issue = (data as any)?.data;

  const { data: wipData } = useWipStock(
    issue?.workOrderId ? { workOrderId: issue.workOrderId } : undefined,
  );
  const wipItems = (wipData as any)?.data || [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Issue Detail</Text>
          </View>
        </LinearGradient>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Issue Detail</Text>
          </View>
        </LinearGradient>
        <EmptyState title="Issue not found" message="This issue may have been removed" />
      </View>
    );
  }

  const lineItems = issue.lineItems || issue.lines || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="text-xl font-bold text-white font-inter">{issue.issueNumber || issue.transactionNumber || 'Issue'}</Text>
            <Text className="text-xs text-white/70 font-inter">WO: {issue.workOrderNumber || issue.workOrder?.woNumber || '--'}</Text>
          </View>
          <TransactionStatusBadge status={issue.status || 'DRAFT'} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <InfoItem label="Work Order" value={issue.workOrderNumber || issue.workOrder?.woNumber || '--'} />
            <InfoItem label="Warehouse" value={issue.warehouse?.code || issue.warehouseCode || '--'} />
            <InfoItem label="Issue Type" value={issue.isPartialIssue ? 'Partial Issue' : 'Full Issue'} color={issue.isPartialIssue ? 'text-amber-600' : 'text-emerald-600'} />
            <InfoItem label="Created" value={issue.createdAt ? fmt.dateTime(issue.createdAt) : '--'} />
          </View>
        </Animated.View>

        {/* Line Items */}
        <Text className="text-sm font-bold font-inter text-neutral-800 mt-6 mb-3">Line Items ({lineItems.length})</Text>
        {lineItems.length === 0 ? (
          <Text className="text-sm font-inter text-neutral-400 text-center py-8">No line items</Text>
        ) : (
          lineItems.map((li: any, idx: number) => {
            const bomReq = Number(li.bomRequiredQty ?? 0);
            const issued = Number(li.issuedQty ?? li.issueQty ?? li.quantity ?? 0);
            const cumulative = Number(li.cumulativeIssuedQty ?? issued);
            const remaining = Number(li.remainingQty ?? Math.max(0, bomReq - cumulative));
            const isOverIssued = cumulative > bomReq && bomReq > 0;

            return (
              <Animated.View key={li.id || idx} entering={FadeInDown.delay(idx * 50).duration(300)} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <View style={{ flex: 1 }}>
                    <Text className="text-xs font-bold font-inter text-primary-600">{li.partNumber || li.part?.partNumber || '--'}</Text>
                    <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{li.partName || li.part?.name || ''}</Text>
                  </View>
                  {isOverIssued && (
                    <View style={[styles.overBadge]}>
                      <Text className="text-[10px] font-medium font-inter text-amber-600">Over-issued</Text>
                    </View>
                  )}
                </View>

                <View style={styles.qtyRow}>
                  <QtyItem label="BOM Req" value={bomReq} />
                  <QtyItem label="Issued" value={issued} bold />
                  <QtyItem label="Cumulative" value={cumulative} />
                  <QtyItem label="Remaining" value={remaining} color={remaining > 0 ? 'text-neutral-700' : 'text-emerald-600'} />
                </View>

                {li.lotNumber || li.lot?.lotNumber ? (
                  <Text className="text-[10px] font-inter text-neutral-400 mt-1">Lot: {li.lotNumber || li.lot?.lotNumber}</Text>
                ) : null}

                {bomReq > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <BomIssueCounter bomRequired={bomReq} cumulativeIssued={cumulative} remaining={remaining} compact />
                  </View>
                )}
              </Animated.View>
            );
          })
        )}

        {/* WIP Balance */}
        {wipItems.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text className="text-sm font-bold font-inter text-neutral-800 mb-3">WIP Balance for this Work Order</Text>
            {wipItems.map((wip: any) => (
              <WipBalanceCard
                key={wip.partId || wip.id}
                partName={wip.partName || wip.part?.name}
                partNumber={wip.partNumber || wip.part?.partNumber}
                items={[
                  { label: 'Available in Store', qty: Number(wip.availableInStore ?? 0) },
                  { label: 'In Production / WIP', qty: Number(wip.inProductionWip ?? wip.wipQty ?? 0) },
                  { label: 'Reserved', qty: Number(wip.reserved ?? 0) },
                ]}
                totalQty={Number(wip.totalQty ?? 0)}
                freeToAllocate={Number(wip.freeToAllocate ?? 0)}
                uom={wip.uom}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoItem}>
      <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
      <Text className={`text-sm font-semibold font-inter ${color || 'text-neutral-900'} mt-1`}>{value}</Text>
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
  overBadge: { backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#fde68a' },
});
