import { useRouter } from 'expo-router';
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
  const { data: response, isLoading, refetch } = useAnalyticsDashboard('attendance', filters);
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

  if (!isLoading && !dashboardData?.kpis?.length && !dashboardData?.meta?.lastComputedAt) {
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

      {/* Daily Attendance 30d + OT Trend */}
      <View style={styles.chartRow}>
        {dashboardData?.trends?.[0] && (
          <TrendChart series={[dashboardData.trends[0]]} height={220} />
        )}
        {dashboardData?.trends?.[1] && (
          <TrendChart series={[dashboardData.trends[1]]} height={220} />
        )}
      </View>

      {/* Source Breakdown + Shift Adherence */}
      <View style={styles.chartRow}>
        {dashboardData?.distributions?.[0] && (
          <DistributionChart distribution={dashboardData.distributions[0]} />
        )}
        {dashboardData?.distributions?.[1] && (
          <DistributionChart distribution={dashboardData.distributions[1]} />
        )}
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
  chartRow: {
    gap: 16,
  },
});
