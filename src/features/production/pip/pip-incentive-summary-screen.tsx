/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import {
  usePipMonthlyReports,
  usePipMonthlyReport,
} from '@/features/production/pip/api/use-pip-queries';
import {
  useGeneratePipMonthlyReport,
  useSubmitPipMonthlyReport,
  useMergePipToPayroll,
} from '@/features/production/pip/api/use-pip-mutations';
import type { PipMonthlyReport } from '@/lib/api/pip';

// ============ HELPERS ============

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getStatusBadgeStyle(status: string): { bg: string; text: string; label: string } {
  switch (status?.toUpperCase()) {
    case 'DRAFT':
      return { bg: colors.neutral[100], text: colors.neutral[600], label: 'Draft' };
    case 'SUBMITTED':
      return { bg: colors.info[50], text: colors.info[700], label: 'Submitted' };
    case 'APPROVED':
      return { bg: colors.success[50], text: colors.success[700], label: 'Approved' };
    case 'REJECTED':
      return { bg: colors.danger[50], text: colors.danger[700], label: 'Rejected' };
    case 'MERGED':
      return { bg: colors.accent[50], text: colors.accent[700], label: 'Merged' };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600], label: status || 'Unknown' };
  }
}

// ============ MONTH NAVIGATION ============

function MonthNav({
  month,
  year,
  onPrev,
  onNext,
  isDark,
}: {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        monthStyles.container,
        {
          backgroundColor: isDark ? '#1A1730' : colors.white,
          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        },
      ]}
    >
      <Pressable onPress={onPrev} style={monthStyles.arrowBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M15 18l-6-6 6-6" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
        {MONTHS[month - 1]} {year}
      </Text>
      <Pressable onPress={onNext} style={monthStyles.arrowBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M9 18l6-6-6-6" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

// ============ METRIC CARD ============

function MetricCard({
  label,
  value,
  color,
  isDark,
}: {
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <View style={[metricStyles.card, { backgroundColor: isDark ? '#1A1730' : `${color}08` }]}>
      <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="font-inter text-lg font-bold" style={{ color }}>{value}</Text>
    </View>
  );
}

// ============ BAR CHART ============

function SimpleDayChart({
  data,
  isDark,
}: {
  data: Array<{ day: number; amount: number }>;
  isDark: boolean;
}) {
  if (!data || data.length === 0) return null;
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const barWidth = 20;
  const chartHeight = 100;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
      <View style={chartStyles.container}>
        {data.map((d, idx) => {
          const barH = (d.amount / maxAmount) * chartHeight;
          return (
            <View key={idx} style={chartStyles.barWrap}>
              <View style={[chartStyles.bar, { height: barH, backgroundColor: colors.primary[400] }]} />
              <Text className="mt-1 font-inter text-[8px] text-neutral-500">{d.day}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============ MAIN COMPONENT ============

export function PipIncentiveSummaryScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const confirmModal = useConfirmModal();

  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [selectedReportId, setSelectedReportId] = React.useState('');

  const changeMonth = (delta: number) => {
    setMonth((prev) => {
      let newM = prev + delta;
      if (newM > 12) { newM = 1; setYear((y) => y + 1); }
      else if (newM < 1) { newM = 12; setYear((y) => y - 1); }
      return newM;
    });
  };

  // Fetch reports list
  const { data: reportsRaw, isLoading, error, refetch, isFetching } = usePipMonthlyReports({ month, year });

  const reports: PipMonthlyReport[] = React.useMemo(() => {
    const raw = (reportsRaw as any)?.data ?? reportsRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [reportsRaw]);

  const report = reports[0] ?? null;

  // Detail query when we have a report
  const reportId = report?.id ?? selectedReportId;
  const { data: detailRaw } = usePipMonthlyReport(reportId);
  const detail: PipMonthlyReport | null = React.useMemo(() => {
    const d = (detailRaw as any)?.data ?? detailRaw;
    return d as PipMonthlyReport | null;
  }, [detailRaw]);

  const generateReport = useGeneratePipMonthlyReport();
  const submitReport = useSubmitPipMonthlyReport();
  const mergeToPayroll = useMergePipToPayroll();

  const statusBadge = report ? getStatusBadgeStyle(report.status) : null;

  const operatorSummaries = React.useMemo(() => {
    return (detail?.operatorSummary ?? []) as Array<Record<string, any>>;
  }, [detail]);

  const partSummaries = React.useMemo(() => {
    return (detail?.partSummary ?? []) as Array<Record<string, any>>;
  }, [detail]);

  const dailyTrend = React.useMemo(() => {
    const raw = (detail?.dailyTrend ?? []) as Array<Record<string, any>>;
    return raw.map((d) => ({ day: d.day ?? d.date ?? 0, amount: d.amount ?? d.incentive ?? 0 }));
  }, [detail]);

  const handleGenerate = () => {
    generateReport.mutate({ month, year });
  };

  const handleSubmit = () => {
    if (!report) return;
    confirmModal.show({
      title: 'Submit for Approval',
      message: 'This will send the monthly incentive report for approval. Continue?',
      confirmText: 'Submit',
      variant: 'primary',
      onConfirm: () => submitReport.mutate(report.id),
    });
  };

  const handleMerge = () => {
    if (!report) return;
    confirmModal.show({
      title: 'Merge to Payroll',
      message: 'This will merge the approved incentive amounts into payroll. This action cannot be easily reversed.',
      confirmText: 'Merge',
      variant: 'warning',
      onConfirm: () => mergeToPayroll.mutate({ id: report.id, data: {} }),
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppTopHeader
            title="Incentive Summary"
            subtitle={`${MONTHS[month - 1]} ${year}`}
            onMenuPress={toggle}
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Month Navigation */}
          <MonthNav month={month} year={year} onPrev={() => changeMonth(-1)} onNext={() => changeMonth(1)} isDark={isDark} />

          {/* Loading */}
          {isLoading && (
            <View style={{ marginTop: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {/* Error */}
          {error && !isLoading && (
            <EmptyState
              icon="error"
              title="Failed to load summary"
              message="Check your connection and try again."
              action={{ label: 'Retry', onPress: () => refetch() }}
            />
          )}

          {/* No report - Generate button */}
          {!isLoading && !error && !report && (
            <Animated.View entering={FadeIn.duration(300)}>
              <View style={styles.emptySection}>
                <EmptyState
                  icon="inbox"
                  title="No report for this month"
                  message="Generate a monthly incentive report to see the summary."
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.generateBtn,
                    pressed && { opacity: 0.85 },
                    generateReport.isPending && { opacity: 0.6 },
                  ]}
                  onPress={handleGenerate}
                  disabled={generateReport.isPending}
                >
                  {generateReport.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="font-inter text-sm font-bold text-white">Generate Report</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Report exists */}
          {report && !isLoading && (
            <>
              {/* Status + Metrics */}
              <Animated.View entering={FadeInUp.duration(400).delay(50)}>
                {statusBadge && (
                  <View style={[styles.statusRow, { marginTop: 16 }]}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Text className="font-inter text-xs font-bold" style={{ color: statusBadge.text }}>
                        {statusBadge.label}
                      </Text>
                    </View>
                    <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                      Rs {Number(report.totalIncentive ?? 0).toFixed(2)} total
                    </Text>
                  </View>
                )}

                <View style={styles.metricsGrid}>
                  <MetricCard label="Total Incentive" value={`Rs ${Number(report.totalIncentive ?? 0).toFixed(0)}`} color={colors.success[600]} isDark={isDark} />
                  <MetricCard label="Operators" value={String(report.operatorCount)} color={colors.primary[600]} isDark={isDark} />
                  <MetricCard label="Working Days" value={String(report.workingDays)} color={colors.accent[600]} isDark={isDark} />
                  <MetricCard label="Avg/Day" value={`Rs ${Number(report.avgPerDay ?? 0).toFixed(0)}`} color={colors.info[600]} isDark={isDark} />
                </View>
              </Animated.View>

              {/* Operator-wise */}
              {operatorSummaries.length > 0 && (
                <Animated.View entering={FadeInUp.duration(400).delay(100)}>
                  <Text className="mb-2 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Operator-wise
                  </Text>
                  {operatorSummaries.map((op, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.listCard,
                        {
                          backgroundColor: isDark ? '#1A1730' : colors.white,
                          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                          {op.operatorName ?? op.name ?? 'Unknown'}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500">
                          {op.daysEligible ?? op.days ?? 0} days eligible
                        </Text>
                      </View>
                      <Text className="font-inter text-sm font-bold text-success-700">
                        Rs {Number(op.totalIncentive ?? op.incentive ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              )}

              {/* Part-wise */}
              {partSummaries.length > 0 && (
                <Animated.View entering={FadeInUp.duration(400).delay(150)}>
                  <Text className="mb-2 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Part-wise
                  </Text>
                  {partSummaries.map((p, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.listCard,
                        {
                          backgroundColor: isDark ? '#1A1730' : colors.white,
                          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <View style={[styles.partBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                            <Text className="font-inter text-[9px] font-bold text-accent-700">
                              {p.partNumber ?? ''}
                            </Text>
                          </View>
                          <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
                            {p.partName ?? p.name ?? ''}
                          </Text>
                        </View>
                        <Text className="font-inter text-[10px] text-neutral-500">
                          Excess: {p.excessQty ?? p.excess ?? 0} pcs
                        </Text>
                      </View>
                      <Text className="font-inter text-sm font-bold text-success-700">
                        Rs {Number(p.incentive ?? p.totalIncentive ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              )}

              {/* Day-wise Trend */}
              {dailyTrend.length > 0 && (
                <Animated.View entering={FadeInUp.duration(400).delay(200)}>
                  <Text className="mb-2 mt-4 font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Day-wise Trend
                  </Text>
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <SimpleDayChart data={dailyTrend} isDark={isDark} />
                  </View>
                </Animated.View>
              )}

              {/* Action Buttons */}
              <Animated.View entering={FadeInUp.duration(400).delay(250)}>
                <View style={styles.actionSection}>
                  {report.status === 'DRAFT' && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { backgroundColor: colors.primary[600] },
                        pressed && { opacity: 0.85 },
                        submitReport.isPending && { opacity: 0.6 },
                      ]}
                      onPress={handleSubmit}
                      disabled={submitReport.isPending}
                    >
                      {submitReport.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="font-inter text-sm font-bold text-white">
                          Send for Approval
                        </Text>
                      )}
                    </Pressable>
                  )}

                  {report.status === 'APPROVED' && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { backgroundColor: colors.success[600] },
                        pressed && { opacity: 0.85 },
                        mergeToPayroll.isPending && { opacity: 0.6 },
                      ]}
                      onPress={handleMerge}
                      disabled={mergeToPayroll.isPending}
                    >
                      {mergeToPayroll.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="font-inter text-sm font-bold text-white">
                          Merge to Payroll
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 8,
    },
    partBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    chartCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    emptySection: {
      marginTop: 24,
      alignItems: 'center',
    },
    generateBtn: {
      marginTop: 16,
      backgroundColor: colors.primary[600],
      borderRadius: 14,
      height: 48,
      paddingHorizontal: 32,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    actionSection: {
      marginTop: 20,
      gap: 10,
    },
    actionBtn: {
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  });

const monthStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const metricStyles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
});

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 4,
    minHeight: 120,
  },
  barWrap: {
    alignItems: 'center',
    width: 24,
  },
  bar: {
    width: 16,
    borderRadius: 4,
    minHeight: 2,
  },
});
