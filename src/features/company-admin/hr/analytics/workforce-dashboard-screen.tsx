import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AlertsBanner,
  DashboardShell,
  DistributionChart,
  InsightsPanel,
  KPIGrid,
  ZeroDataState,
} from '@/components/analytics';
import { useAnalyticsDashboard } from '@/features/company-admin/api/use-analytics-queries';

export function WorkforceDashboardScreen() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const { data: response, isLoading, refetch } = useAnalyticsDashboard('workforce', filters);
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
      <DashboardShell title="Workforce Analytics" loading={false}>
        <ZeroDataState
          title="No workforce data yet"
          message="Workforce analytics will appear once employee records are created."
          icon="users"
          action={{
            label: 'Employee Directory',
            onPress: () => router.push('/company/hr/employees'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Workforce Analytics" loading={isLoading} onRefresh={handleRefresh}>
      {(dashboardData?.alerts?.length ?? 0) > 0 && (
        <AlertsBanner alerts={dashboardData!.alerts} />
      )}

      <KPIGrid kpis={dashboardData?.kpis ?? []} onDrilldown={handleDrilldown} />

      {/* Gender Ratio (donut) + Age Bands (bar) */}
      <View style={styles.chartRow}>
        {dashboardData?.distributions?.[0] && (
          <DistributionChart distribution={dashboardData.distributions[0]} />
        )}
        {dashboardData?.distributions?.[1] && (
          <DistributionChart distribution={dashboardData.distributions[1]} />
        )}
      </View>

      {/* Dept Strength (grouped bar) + Tenure Bands (bar) */}
      <View style={styles.chartRow}>
        {dashboardData?.distributions?.[2] && (
          <DistributionChart distribution={dashboardData.distributions[2]} />
        )}
        {dashboardData?.distributions?.[3] && (
          <DistributionChart distribution={dashboardData.distributions[3]} />
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
