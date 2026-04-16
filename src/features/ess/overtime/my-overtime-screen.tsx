/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
  useMyOvertimeRequests,
  useMyOvertimeSummary,
  useClaimOvertime,
} from '@/features/ess/overtime/use-overtime-queries';
import { ClaimOvertimeModal } from '@/features/ess/overtime/claim-overtime-modal';
import {
  OvertimeRequestDetailSheet,
  type OvertimeDetailSheetHandle,
} from '@/features/ess/overtime/overtime-request-detail-sheet';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import type {
  OvertimeRequestListItem,
  OvertimeRequestStatus,
  OvertimeRequestSource,
} from '@/lib/api/ess';

// ── Constants ──

type FilterOption = 'ALL' | OvertimeRequestStatus;

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Paid', value: 'PAID' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
  APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
  REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
  PAID: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
  COMP_OFF_ACCRUED: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  AUTO: { bg: colors.neutral[100], text: colors.neutral[600] },
  MANUAL: { bg: colors.accent[50], text: colors.accent[700] },
};

const MULTIPLIER_LABELS: Record<string, string> = {
  WEEKDAY: 'Weekday',
  WEEKEND: 'Weekend',
  HOLIDAY: 'Holiday',
  NIGHT_SHIFT: 'Night',
};

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <View style={[chipStyles.badge, { backgroundColor: s.bg }]}>
      <View style={[chipStyles.dot, { backgroundColor: s.dot }]} />
      <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

function SourceBadge({ source }: { source: OvertimeRequestSource }) {
  const s = SOURCE_COLORS[source] ?? SOURCE_COLORS.AUTO;
  return (
    <View style={[chipStyles.badge, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '600' }}>{source}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ── Summary Card ──

function SummaryCard({
  title,
  value,
  iconColor,
  bgColor,
  icon,
  onPress,
  subtitle,
  isDark,
}: {
  title: string;
  value: string;
  iconColor: string;
  bgColor: string;
  icon: React.ReactNode;
  onPress?: () => void;
  subtitle?: string;
  isDark: boolean;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      {...(onPress ? { onPress } : {})}
      style={[summaryStyles.card, { backgroundColor: isDark ? '#1E1B4B' : colors.white, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
    >
      <View style={[summaryStyles.iconWrap, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400 mt-1.5">
        {title}
      </Text>
      <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mt-0.5">
        {value}
      </Text>
      {subtitle ? (
        <Text className="font-inter text-[9px] text-neutral-400 mt-0.5">{subtitle}</Text>
      ) : null}
      {onPress ? (
        <Svg width={10} height={10} viewBox="0 0 24 24" style={{ position: 'absolute', top: 10, right: 10 }}>
          <Path d="M9 18l6-6-6-6" stroke={colors.neutral[400]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </Wrapper>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ── SVG Icons for summary cards ──

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function HourglassIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RupeeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M6 3h12M6 8h12M6 3v0a6 6 0 006 6H6M14 21l-8-8h4a6 6 0 006-6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GiftIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PaperclipIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Main Screen ──

export function MyOvertimeScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { open } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const detailSheetRef = React.useRef<OvertimeDetailSheetHandle>(null);

  const [filter, setFilter] = React.useState<FilterOption>('ALL');
  const [formVisible, setFormVisible] = React.useState(false);

  const summaryQuery = useMyOvertimeSummary();
  const listQuery = useMyOvertimeRequests(
    filter === 'ALL' ? { limit: 20 } : { status: filter as OvertimeRequestStatus, limit: 20 },
  );
  const claimMutation = useClaimOvertime();

  const summary = (summaryQuery.data as any)?.data as {
    totalOtHours: number;
    pendingCount: number;
    approvedAmount: number;
    compOff: { balance: number; expiresAt: string | null; leaveTypeId: string | null } | null;
  } | undefined;

  const requests: OvertimeRequestListItem[] = (listQuery.data as any)?.data ?? [];

  const handleRefresh = () => {
    summaryQuery.refetch();
    listQuery.refetch();
  };

  const handleClaim = (data: { date: string; hours: number; reason: string; attachments?: string[] }) => {
    showConfirm({
      title: 'Submit Overtime Claim',
      message: 'Are you sure you want to submit this overtime claim for review?',
      confirmText: 'Submit',
      variant: 'primary',
      onConfirm: () => {
        claimMutation.mutate(data, {
          onSuccess: () => {
            setFormVisible(false);
            showSuccess('Overtime claim submitted successfully');
          },
          onError: (err: any) =>
            showErrorMessage(
              err?.response?.data?.message ?? err?.message ?? 'Failed to submit overtime claim',
            ),
        });
      },
    });
  };

  const handleCompOffPress = () => {
    if (summary?.compOff?.leaveTypeId) {
      router.push({
        pathname: '/company/hr/my-leave',
        params: { leaveTypeId: summary.compOff.leaveTypeId, preselected: 'COMPENSATORY' },
      });
    }
  };

  const renderItem = ({ item, index }: { item: OvertimeRequestListItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        onPress={() => detailSheetRef.current?.open(item.id)}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
      >
        {/* Top row: date + status */}
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
              {fmt.date(item.date)}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Middle row: hours, multiplier, source */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text className="font-inter text-xs font-semibold text-primary-700 dark:text-primary-300">
            {item.requestedHours}h
          </Text>
          <View style={[chipStyles.badge, { backgroundColor: colors.primary[50] }]}>
            <Text style={{ color: colors.primary[700], fontFamily: 'Inter', fontSize: 10, fontWeight: '600' }}>
              {MULTIPLIER_LABELS[item.multiplierSource] ?? item.multiplierSource} {item.appliedMultiplier}x
            </Text>
          </View>
          <SourceBadge source={item.source} />
          {item.attachments && item.attachments.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 4 }}>
              <PaperclipIcon color={colors.neutral[400]} />
              <Text className="font-inter text-[10px] text-neutral-400">{item.attachments.length}</Text>
            </View>
          )}
        </View>

        {/* Amount row */}
        <View style={{ marginTop: 6 }}>
          <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
            {item.calculatedAmount != null
              ? `₹${item.calculatedAmount.toLocaleString('en-IN')}`
              : 'Amount pending'}
          </Text>
        </View>

        {/* Reason preview for MANUAL */}
        {item.source === 'MANUAL' && item.reason && (
          <Text
            className="font-inter text-xs text-neutral-500 dark:text-neutral-400 mt-1.5"
            numberOfLines={1}
          >
            {item.reason}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white }}>
      <AppTopHeader title="My Overtime" onMenuPress={open} />

      <FlashList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isLoading || summaryQuery.isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Summary cards */}
            <View style={s.summaryGrid}>
              <View style={s.summaryRow}>
                <SummaryCard
                  title="OT Hours"
                  value={`${summary?.totalOtHours?.toFixed(1) ?? '0.0'}h`}
                  iconColor={colors.primary[600]}
                  bgColor={isDark ? colors.primary[900] : colors.primary[50]}
                  icon={<ClockIcon color={colors.primary[600]} />}
                  isDark={isDark}
                />
                <SummaryCard
                  title="Pending"
                  value={`${summary?.pendingCount ?? 0}`}
                  iconColor={colors.warning[600]}
                  bgColor={isDark ? colors.warning[900] : colors.warning[50]}
                  icon={<HourglassIcon color={colors.warning[600]} />}
                  isDark={isDark}
                />
              </View>
              <View style={s.summaryRow}>
                <SummaryCard
                  title="Approved"
                  value={`₹${(summary?.approvedAmount ?? 0).toLocaleString('en-IN')}`}
                  iconColor={colors.success[600]}
                  bgColor={isDark ? colors.success[900] : colors.success[50]}
                  icon={<RupeeIcon color={colors.success[600]} />}
                  isDark={isDark}
                />
                <SummaryCard
                  title="Comp-Off"
                  value={`${summary?.compOff?.balance?.toFixed(1) ?? '0.0'} days`}
                  iconColor={colors.accent[600]}
                  bgColor={isDark ? colors.accent[900] : colors.accent[50]}
                  icon={<GiftIcon color={colors.accent[600]} />}
                  onPress={summary?.compOff?.leaveTypeId ? handleCompOffPress : undefined}
                  subtitle={
                    summary?.compOff?.expiresAt
                      ? `Expires ${fmt.date(summary.compOff.expiresAt)}`
                      : undefined
                  }
                  isDark={isDark}
                />
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
            >
              {FILTER_OPTIONS.map((opt) => {
                const isActive = filter === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFilter(opt.value)}
                    style={[
                      s.filterChip,
                      isActive && s.filterChipActive,
                    ]}
                  >
                    <Text
                      className="font-inter text-xs font-semibold"
                      style={{ color: isActive ? colors.white : (isDark ? colors.neutral[300] : colors.neutral[600]) }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          !listQuery.isLoading ? (
            <View style={s.empty}>
              <Text className="font-inter text-sm text-neutral-400">No overtime requests found</Text>
            </View>
          ) : null
        }
      />

      <FAB onPress={() => setFormVisible(true)} />

      <ClaimOvertimeModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleClaim}
        isSubmitting={claimMutation.isPending}
      />

      <OvertimeRequestDetailSheet ref={detailSheetRef} />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ── Styles ──

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    summaryGrid: {
      gap: 10,
      marginBottom: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    filterChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    card: {
      backgroundColor: isDark ? '#1E1B4B' : colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.primary[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
    },
  });
