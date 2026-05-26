import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useCount } from '@/features/inventory/api/use-inventory-queries';
import { useEnterCount, useSubmitCount, useApproveCount } from '@/features/inventory/api/use-inventory-mutations';
import { COUNT_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

export function CountDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fmt = useCompanyFormatter();
  const { data, isLoading } = useCount(id || '');
  const enterMutation = useEnterCount();
  const submitMutation = useSubmitCount();
  const approveMutation = useApproveCount();

  const count = (data as any)?.data;
  const [entries, setEntries] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Count Detail</Text>
          </View>
        </LinearGradient>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      </View>
    );
  }

  if (!count) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Count Detail</Text>
          </View>
        </LinearGradient>
        <EmptyState title="Count not found" description="This count may have been removed" />
      </View>
    );
  }

  const statusConfig = COUNT_STATUS_CONFIG[count.status] || COUNT_STATUS_CONFIG.CREATED;
  const countItems = count.items || count.countItems || count.lineItems || [];
  const canEnter = count.status === 'CREATED' || count.status === 'IN_PROGRESS';
  const canSubmit = count.status === 'IN_PROGRESS' || count.status === 'VARIANCE_COMPUTED';
  const canApprove = count.status === 'PENDING_APPROVAL';

  const handleSaveEntries = () => {
    const items = Object.entries(entries).map(([itemId, physicalQty]) => ({ itemId, physicalQty: Number(physicalQty) }));
    if (items.length > 0) enterMutation.mutate({ id: id!, data: { items } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="text-xl font-bold text-white font-inter">{count.countNumber || count.referenceNumber || 'Count'}</Text>
          </View>
          <View className={`rounded-full px-2 py-0.5 ${statusConfig.bg} border ${statusConfig.border}`}>
            <Text className={`text-xs font-medium font-inter ${statusConfig.text}`}>{statusConfig.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <InfoItem label="Type" value={count.type || '--'} />
            <InfoItem label="Warehouse" value={count.warehouse?.code || count.warehouseCode || '--'} />
          </View>
          <View style={styles.infoRow}>
            <InfoItem label="Scheduled" value={count.scheduledDate ? fmt.date(count.scheduledDate) : '--'} />
            <InfoItem label="Created" value={count.createdAt ? fmt.dateTime(count.createdAt) : '--'} />
          </View>
        </Animated.View>

        {/* Count Items */}
        <Text className="text-sm font-bold font-inter text-neutral-800 mt-6 mb-3">Count Items ({countItems.length})</Text>
        {countItems.length === 0 ? (
          <Text className="text-sm font-inter text-neutral-400 text-center py-8">No items in this count</Text>
        ) : (
          countItems.map((item: any, idx: number) => (
            <Animated.View key={item.id || idx} entering={FadeInDown.delay(idx * 50).duration(300)} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text className="text-xs font-bold font-inter text-primary-600">{item.partNumber || item.part?.partNumber || '--'}</Text>
                  <Text className="text-[10px] font-inter text-neutral-500" numberOfLines={1}>{item.partName || item.part?.name || ''}</Text>
                </View>
              </View>
              <View style={styles.qtyRow}>
                <View style={{ flex: 1 }}>
                  <Text className="text-[10px] font-inter text-neutral-400">System Qty</Text>
                  <Text className="text-sm font-bold font-inter text-neutral-900">{Number(item.systemQty ?? item.expectedQty ?? 0).toLocaleString()}</Text>
                </View>
                {canEnter ? (
                  <View style={{ flex: 1 }}>
                    <Text className="text-[10px] font-inter text-neutral-400">Physical Qty</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={entries[item.id] ?? String(item.physicalQty ?? '')}
                      onChangeText={(v) => setEntries({ ...entries, [item.id]: v })}
                      keyboardType="numeric"
                      placeholder="Enter"
                      placeholderTextColor={colors.neutral[400]}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text className="text-[10px] font-inter text-neutral-400">Physical Qty</Text>
                    <Text className="text-sm font-bold font-inter text-neutral-900">{Number(item.physicalQty ?? 0).toLocaleString()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text className="text-[10px] font-inter text-neutral-400">Variance</Text>
                  <Text className={`text-sm font-bold font-inter ${Number(item.variance ?? 0) !== 0 ? 'text-amber-700' : 'text-neutral-600'}`}>
                    {Number(item.variance ?? 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {canEnter && (
            <TouchableOpacity onPress={handleSaveEntries} disabled={enterMutation.isPending} style={[styles.btn, enterMutation.isPending && { opacity: 0.5 }]}>
              {enterMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Save Entries</Text>}
            </TouchableOpacity>
          )}
          {canSubmit && (
            <TouchableOpacity onPress={() => submitMutation.mutate(id!)} disabled={submitMutation.isPending} style={[styles.btn, styles.btnSecondary, submitMutation.isPending && { opacity: 0.5 }]}>
              {submitMutation.isPending ? <ActivityIndicator color={colors.primary[600]} size="small" /> : <Text className="text-sm font-bold font-inter text-primary-600">Submit for Approval</Text>}
            </TouchableOpacity>
          )}
          {canApprove && (
            <TouchableOpacity onPress={() => approveMutation.mutate({ id: id! })} disabled={approveMutation.isPending} style={[styles.btn, approveMutation.isPending && { opacity: 0.5 }]}>
              {approveMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Approve Count</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text className="text-[10px] font-medium font-inter text-neutral-500 uppercase tracking-wider">{label}</Text>
      <Text className="text-sm font-semibold font-inter text-neutral-900 mt-1">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5', padding: 16 },
  infoRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', gap: 12 },
  qtyInput: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontFamily: 'Inter', color: '#111', marginTop: 2 },
  actionRow: { marginTop: 16, gap: 10 },
  btn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnSecondary: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
});
