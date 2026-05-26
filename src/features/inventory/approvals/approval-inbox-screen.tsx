import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Check, X as XIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { usePendingApprovals, useApprovalHistory } from '@/features/inventory/api/use-inventory-queries';
import { useApproveTransaction, useRejectTransaction } from '@/features/inventory/api/use-inventory-mutations';
import { TransactionStatusBadge } from '@/features/inventory/shared/InventoryStatusBadge';
import { useConfirmModal } from '@/components/ui/confirm-modal';

export function ApprovalInboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Approvals</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('pending')} style={[styles.tab, tab === 'pending' && styles.tabActive]}>
          <Text className={`text-sm font-medium font-inter ${tab === 'pending' ? 'text-primary-700' : 'text-neutral-500'}`}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('history')} style={[styles.tab, tab === 'history' && styles.tabActive]}>
          <Text className={`text-sm font-medium font-inter ${tab === 'history' ? 'text-primary-700' : 'text-neutral-500'}`}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'pending' ? <PendingTab /> : <HistoryTab />}
    </View>
  );
}

function PendingTab() {
  const fmt = useCompanyFormatter();
  const approveMutation = useApproveTransaction();
  const rejectMutation = useRejectTransaction();
  const { data, isLoading, refetch, isRefetching } = usePendingApprovals();
  const items = (data as any)?.data || [];
  const { confirm } = useConfirmModal();

  const handleReject = useCallback(async (id: string) => {
    const confirmed = await confirm({ title: 'Reject Transaction', message: 'Are you sure you want to reject this transaction?' });
    if (confirmed) rejectMutation.mutate({ id, data: { reason: 'Rejected via mobile' } });
  }, [confirm, rejectMutation]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || item.referenceNumber || '--'}</Text>
          <Text className="text-[10px] font-inter text-neutral-400">{item.transactionType || item.type || '--'}</Text>
        </View>
        <Text className="text-xs font-inter text-neutral-600 mt-1">
          {item.partNumber || '--'} | Qty: {Number(item.quantity ?? 0).toLocaleString()}
        </Text>
        <Text className="text-xs font-inter text-neutral-500">{item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => approveMutation.mutate(item.id)}
            disabled={approveMutation.isPending}
            style={[styles.approveBtn, approveMutation.isPending && { opacity: 0.5 }]}
          >
            <Check color="#fff" size={14} />
            <Text className="text-xs font-bold font-inter text-white ml-1">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleReject(item.id)}
            disabled={rejectMutation.isPending}
            style={[styles.rejectBtn, rejectMutation.isPending && { opacity: 0.5 }]}
          >
            <XIcon color={colors.danger[600]} size={14} />
            <Text className="text-xs font-bold font-inter text-danger-600 ml-1">Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  ), [fmt, approveMutation, rejectMutation, handleReject]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;

  return (
    <FlatList data={items} keyExtractor={(item: any) => item.id} renderItem={renderItem}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
      ListEmptyComponent={<EmptyState title="No pending approvals" description="All transactions have been reviewed" />}
    />
  );
}

function HistoryTab() {
  const fmt = useCompanyFormatter();
  const { data, isLoading, refetch, isRefetching } = useApprovalHistory();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text className="text-xs font-bold font-inter text-primary-600">{item.transactionNumber || '--'}</Text>
          <TransactionStatusBadge status={item.status || 'APPROVED'} />
        </View>
        <Text className="text-xs font-inter text-neutral-500 mt-1">{item.reviewedAt ? fmt.dateTime(item.reviewedAt) : item.createdAt ? fmt.dateTime(item.createdAt) : '--'}</Text>
      </View>
    </Animated.View>
  ), [fmt]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;

  return (
    <FlatList data={items} keyExtractor={(item: any) => item.id} renderItem={renderItem}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
      ListEmptyComponent={<EmptyState title="No approval history" description="Approved/rejected items appear here" />}
    />
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success[600], paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger[50], borderWidth: 1, borderColor: colors.danger[200], paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});
