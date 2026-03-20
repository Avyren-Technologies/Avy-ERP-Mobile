/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';

import { useFnFSettlements, useFnFSettlement } from '@/features/company-admin/api/use-offboarding-queries';
import { useComputeFnF, useApproveFnF, usePayFnF } from '@/features/company-admin/api/use-offboarding-mutations';

// ============ TYPES ============

type FnFStatus = 'Draft' | 'Computed' | 'Approved' | 'Paid';

interface FnFSettlementItem {
  id: string;
  exitRequestId: string;
  employeeName: string;
  totalAmount: number;
  status: FnFStatus;
  breakdown?: FnFBreakdown;
}

interface FnFBreakdown {
  salaryForWorkedDays: number;
  leaveEncashment: number;
  gratuity: number;
  bonusProRata: number;
  noticePay: number;
  loanRecovery: number;
  assetRecovery: number;
  reimbursement: number;
  tds: number;
  netAmount: number;
}

// ============ CONSTANTS ============

const STATUS_FILTERS: ('All' | FnFStatus)[] = ['All', 'Draft', 'Computed', 'Approved', 'Paid'];

const STATUS_COLORS: Record<FnFStatus, { bg: string; text: string; dot: string }> = {
  Draft: { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] },
  Computed: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
  Approved: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
  Paid: { bg: colors.primary[50], text: colors.primary[700], dot: colors.primary[500] },
};

const FNF_LINE_ITEMS: { key: keyof FnFBreakdown; label: string; isDeduction?: boolean }[] = [
  { key: 'salaryForWorkedDays', label: 'Salary for Worked Days' },
  { key: 'leaveEncashment', label: 'Leave Encashment' },
  { key: 'gratuity', label: 'Gratuity' },
  { key: 'bonusProRata', label: 'Bonus Pro-rata' },
  { key: 'noticePay', label: 'Notice Pay' },
  { key: 'loanRecovery', label: 'Loan Recovery', isDeduction: true },
  { key: 'assetRecovery', label: 'Asset Recovery', isDeduction: true },
  { key: 'reimbursement', label: 'Reimbursement' },
  { key: 'tds', label: 'TDS', isDeduction: true },
  { key: 'netAmount', label: 'Net Amount' },
];

// ============ SHARED ATOMS ============

function StatusBadge({ status }: { status: FnFStatus }) {
  const scheme = STATUS_COLORS[status] ?? STATUS_COLORS.Draft;
  return (
    <View style={[styles.statusBadge, { backgroundColor: scheme.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: scheme.dot }]} />
      <Text style={{ color: scheme.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

function AvatarCircle({ name }: { name: string }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '';
  return (
    <View style={styles.avatar}>
      <Text className="font-inter text-xs font-bold text-primary-600">{initials}</Text>
    </View>
  );
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '--';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ============ FNF DETAIL MODAL ============

function FnFDetailModal({
  visible, onClose, settlement,
  onCompute, onApprove, onPay,
  isComputing, isApproving, isPaying,
}: {
  visible: boolean; onClose: () => void;
  settlement: FnFSettlementItem | null;
  onCompute: () => void; onApprove: () => void; onPay: () => void;
  isComputing: boolean; isApproving: boolean; isPaying: boolean;
}) {
  const insets = useSafeAreaInsets();
  if (!settlement) return null;

  const breakdown = settlement.breakdown;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.formSheet, { paddingBottom: insets.bottom + 16, maxHeight: '90%' }]}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <AvatarCircle name={settlement.employeeName} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text className="font-inter text-base font-bold text-primary-950">{settlement.employeeName}</Text>
                <StatusBadge status={settlement.status} />
              </View>
              <Text className="font-inter text-lg font-bold text-primary-700">{formatCurrency(settlement.totalAmount)}</Text>
            </View>

            {/* Breakdown table */}
            <Text className="font-inter text-sm font-bold text-primary-900 mb-3">F&F Breakdown</Text>
            <View style={styles.breakdownTable}>
              {FNF_LINE_ITEMS.map((line, idx) => {
                const amount = breakdown?.[line.key] ?? 0;
                const isNet = line.key === 'netAmount';
                return (
                  <View key={line.key} style={[styles.breakdownRow, isNet && styles.breakdownNetRow,
                    idx < FNF_LINE_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.neutral[50] }]}>
                    <Text className={`font-inter text-xs ${isNet ? 'font-bold text-primary-950' : 'text-primary-800'}`}>
                      {line.label}
                    </Text>
                    <Text className={`font-inter text-xs ${isNet ? 'font-bold text-primary-950' : line.isDeduction ? 'text-danger-600 font-semibold' : 'text-primary-800 font-semibold'}`}>
                      {line.isDeduction && amount > 0 ? `- ${formatCurrency(amount)}` : formatCurrency(amount)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Actions */}
            <View style={{ gap: 10, marginTop: 16 }}>
              {settlement.status === 'Draft' && (
                <Pressable onPress={onCompute} disabled={isComputing} style={[styles.actionBtn, { backgroundColor: colors.info[600] }]}>
                  <Text className="font-inter text-sm font-bold text-white">{isComputing ? 'Computing...' : 'Compute F&F'}</Text>
                </Pressable>
              )}
              {settlement.status === 'Computed' && (
                <Pressable onPress={onApprove} disabled={isApproving} style={[styles.actionBtn, { backgroundColor: colors.success[600] }]}>
                  <Text className="font-inter text-sm font-bold text-white">{isApproving ? 'Approving...' : 'Approve'}</Text>
                </Pressable>
              )}
              {settlement.status === 'Approved' && (
                <Pressable onPress={onPay} disabled={isPaying} style={[styles.actionBtn, { backgroundColor: colors.primary[600] }]}>
                  <Text className="font-inter text-sm font-bold text-white">{isPaying ? 'Processing...' : 'Mark as Paid'}</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============ FNF CARD ============

function FnFCard({ item, index, onPress }: { item: FnFSettlementItem; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AvatarCircle name={item.employeeName} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="font-inter text-sm font-bold text-primary-950" numberOfLines={1}>{item.employeeName}</Text>
            <View style={{ marginTop: 4 }}>
              <StatusBadge status={item.status} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text className="font-inter text-base font-bold text-primary-700">{formatCurrency(item.totalAmount)}</Text>
            <Text className="font-inter text-[10px] text-neutral-400">Total F&F</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN SCREEN ============

export function FnFSettlementScreen() {
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | FnFStatus>('All');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showDetail, setShowDetail] = React.useState(false);

  const { data: fnfData, isLoading, refetch } = useFnFSettlements(
    statusFilter !== 'All' ? { status: statusFilter } : undefined
  );
  const computeMutation = useComputeFnF();
  const approveMutation = useApproveFnF();
  const payMutation = usePayFnF();
  const confirmModal = useConfirmModal();

  const settlements: FnFSettlementItem[] = React.useMemo(() => {
    const raw = (fnfData as any)?.data ?? (fnfData as any) ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [fnfData]);

  const filtered = React.useMemo(() => {
    let list = settlements;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.employeeName?.toLowerCase().includes(q));
    }
    return list;
  }, [settlements, search]);

  const selectedSettlement = React.useMemo(
    () => settlements.find(s => s.id === selectedId) ?? null,
    [settlements, selectedId]
  );

  const handleCompute = () => {
    if (!selectedSettlement) return;
    confirmModal.show({
      title: 'Compute F&F?',
      message: 'This will calculate all settlement components for this employee.',
      variant: 'primary',
      confirmText: 'Compute',
      onConfirm: () => {
        computeMutation.mutate(selectedSettlement.exitRequestId, {
          onSuccess: () => { refetch(); },
        });
      },
    });
  };

  const handleApprove = () => {
    if (!selectedSettlement) return;
    confirmModal.show({
      title: 'Approve F&F?',
      message: `Approve the F&F settlement of ${formatCurrency(selectedSettlement.totalAmount)} for ${selectedSettlement.employeeName}?`,
      variant: 'primary',
      confirmText: 'Approve',
      onConfirm: () => {
        approveMutation.mutate(selectedSettlement.id, {
          onSuccess: () => { refetch(); },
        });
      },
    });
  };

  const handlePay = () => {
    if (!selectedSettlement) return;
    confirmModal.show({
      title: 'Mark as Paid?',
      message: `This confirms that ${formatCurrency(selectedSettlement.totalAmount)} has been disbursed to ${selectedSettlement.employeeName}. This action cannot be undone.`,
      variant: 'warning',
      confirmText: 'Confirm Payment',
      onConfirm: () => {
        payMutation.mutate(selectedSettlement.id, {
          onSuccess: () => { refetch(); setShowDetail(false); },
        });
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="font-inter text-white text-lg font-bold ml-3">F&F Settlement</Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search settlements..." />
        </View>
      </LinearGradient>

      {/* Status filter chips */}
      <Animated.View entering={FadeInUp.delay(80).duration(350)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {STATUS_FILTERS.map(s => {
            const active = s === statusFilter;
            return (
              <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text className={`font-inter text-xs font-semibold ${active ? 'text-white' : 'text-neutral-600'}`}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* List */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState title="No F&F settlements" message="Settlements will appear here once exit requests are processed" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <FnFCard item={item} index={index} onPress={() => { setSelectedId(item.id); setShowDetail(true); }} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary[500]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FnFDetailModal
        visible={showDetail} onClose={() => setShowDetail(false)}
        settlement={selectedSettlement}
        onCompute={handleCompute} onApprove={handleApprove} onPay={handlePay}
        isComputing={computeMutation.isPending} isApproving={approveMutation.isPending} isPaying={payMutation.isPending}
      />

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gradient.surface },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[100],
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 100, gap: 4, alignSelf: 'flex-start',
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
    borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  formSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200],
    alignSelf: 'center', marginBottom: 16,
  },
  breakdownTable: {
    backgroundColor: colors.neutral[50], borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  breakdownNetRow: {
    backgroundColor: colors.primary[50],
  },
  actionBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
});
