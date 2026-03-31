import { useRouter } from 'expo-router';
import { BarChart3, PieChart } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DrilldownColumn } from '@/components/analytics';
import {
  AlertsBanner,
  DashboardShell,
  DistributionChart,
  DrilldownList,
  InsightsPanel,
  KPIGrid,
  TrendChart,
  ZeroDataState,
} from '@/components/analytics';
import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useAnalyticsDashboard } from '@/features/company-admin/api/use-analytics-queries';

const attendanceColumns: DrilldownColumn[] = [
  { key: 'employeeName', label: 'Employee' },
  { key: 'department', label: 'Department' },
  { key: 'attendancePct', label: 'Attendance %', align: 'right' },
  { key: 'lateCount', label: 'Late Count', align: 'right' },
  { key: 'avgHours', label: 'Avg Hours', align: 'right' },
  { key: 'otHours', label: 'OT Hours', align: 'right' },
];

export function AttendanceAnalyticsDashboardScreen() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const { data: response, isLoading, isFetched, refetch } = useAnalyticsDashboard('attendance', filters);
  const router = useRouter();

  const dashboardData = response?.data;

  const handleDrilldown = useCallback(
    (type: string) => {
      // Navigate to drilldown or handle in-screen
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isFetched && !isLoading && !dashboardData?.kpis?.length && !dashboardData?.meta?.lastComputedAt) {
    return (
      <DashboardShell title="Attendance Analytics" loading={false}>
        <ZeroDataState
          title="No attendance analytics yet"
          message="Attendance analytics will appear once attendance records are processed."
          icon="clock"
          action={{
            label: 'Go to Attendance',
            onPress: () => router.push('/company/hr/attendance'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Attendance Analytics" loading={isLoading} onRefresh={handleRefresh}>
      {(dashboardData?.alerts?.length ?? 0) > 0 && (
        <AlertsBanner alerts={dashboardData!.alerts} />
      )}

      <KPIGrid kpis={dashboardData?.kpis ?? []} onDrilldown={handleDrilldown} />

      {/* ── Trend Analysis ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary[50] }]}>
            <BarChart3 size={15} color={colors.primary[500]} />
          </View>
          <Text className="font-inter text-[13px] font-bold text-neutral-800">
            Trend Analysis
          </Text>
        </View>
        <View style={styles.chartRow}>
          {dashboardData?.trends?.[0] && (
            <TrendChart series={[dashboardData.trends[0]]} height={220} />
          )}
          {dashboardData?.trends?.[1] && (
            <TrendChart series={[dashboardData.trends[1]]} height={220} />
          )}
        </View>
      </View>

      {/* ── Distribution ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.accent[50] }]}>
            <PieChart size={15} color={colors.accent[500]} />
          </View>
          <Text className="font-inter text-[13px] font-bold text-neutral-800">
            Distribution
          </Text>
        </View>
        <View style={styles.chartRow}>
          {dashboardData?.distributions?.[0] && (
            <DistributionChart distribution={dashboardData.distributions[0]} />
          )}
          {dashboardData?.distributions?.[1] && (
            <DistributionChart distribution={dashboardData.distributions[1]} />
          )}
        </View>
      </View>

      <InsightsPanel insights={dashboardData?.insights ?? []} onDrilldown={handleDrilldown} />

      {/* Drilldown List */}
      {dashboardData?.drilldown?.data && (
        <DrilldownList
          data={dashboardData.drilldown.data}
          columns={attendanceColumns}
          total={dashboardData.drilldown.total ?? 0}
        />
      )}
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartRow: {
    gap: 16,
  },
});
