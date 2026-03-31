import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AlertsBanner,
  DashboardShell,
  DistributionChart,
  InsightsPanel,
  KPIGrid,
  TrendChart,
  ZeroDataState,
} from '@/components/analytics';
import { useAnalyticsDashboard } from '@/features/company-admin/api/use-analytics-queries';

export function PayrollAnalyticsDashboardScreen() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const { data: response, isLoading, refetch } = useAnalyticsDashboard('payroll', filters);
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
      <DashboardShell title="Payroll Analytics" loading={false}>
        <ZeroDataState
          title="No payroll analytics yet"
          message="Payroll analytics will appear once payroll runs are processed."
          icon="chart"
          action={{
            label: 'Go to Payroll Runs',
            onPress: () => router.push('/company/hr/payroll-runs'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Payroll Analytics" loading={isLoading} onRefresh={handleRefresh}>
      {(dashboardData?.alerts?.length ?? 0) > 0 && (
        <AlertsBanner alerts={dashboardData!.alerts} />
      )}

      <KPIGrid kpis={dashboardData?.kpis ?? []} onDrilldown={handleDrilldown} />

      {/* Payroll Cost Trend + CTC vs Take-home Trend */}
      <View style={styles.chartRow}>
        {dashboardData?.trends?.[0] && (
          <TrendChart series={[dashboardData.trends[0]]} height={220} />
        )}
        {dashboardData?.trends?.[1] && (
          <TrendChart series={[dashboardData.trends[1]]} height={220} />
        )}
      </View>

      {/* Salary Band Distribution + Department Cost Split */}
      <View style={styles.chartRow}>
        {dashboardData?.distributions?.[0] && (
          <DistributionChart distribution={dashboardData.distributions[0]} />
        )}
        {dashboardData?.distributions?.[1] && (
          <DistributionChart distribution={dashboardData.distributions[1]} />
        )}
      </View>

      <InsightsPanel insights={dashboardData?.insights ?? []} onDrilldown={handleDrilldown} />
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    gap: 16,
  },
});
