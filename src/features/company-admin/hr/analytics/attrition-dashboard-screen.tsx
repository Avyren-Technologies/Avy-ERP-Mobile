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

export function AttritionDashboardScreen() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const { data: response, isLoading, refetch } = useAnalyticsDashboard('attrition', filters);
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
      <DashboardShell title="Attrition Analytics" loading={false}>
        <ZeroDataState
          title="No attrition data yet"
          message="Attrition analytics will appear once exit and separation data is available."
          icon="users"
          action={{
            label: 'Go to Exit Requests',
            onPress: () => router.push('/company/hr/exit-requests'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Attrition Analytics" loading={isLoading} onRefresh={handleRefresh}>
      {(dashboardData?.alerts?.length ?? 0) > 0 && (
        <AlertsBanner alerts={dashboardData!.alerts} />
      )}

      <KPIGrid kpis={dashboardData?.kpis ?? []} onDrilldown={handleDrilldown} />

      {/* Attrition Rate Trend + Voluntary vs Involuntary Trend */}
      <View style={styles.chartRow}>
        {dashboardData?.trends?.[0] && (
          <TrendChart series={[dashboardData.trends[0]]} height={220} />
        )}
        {dashboardData?.trends?.[1] && (
          <TrendChart series={[dashboardData.trends[1]]} height={220} />
        )}
      </View>

      {/* Exit Reason Distribution + Department Attrition */}
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
