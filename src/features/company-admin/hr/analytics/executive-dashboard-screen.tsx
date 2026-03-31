import { useRouter } from 'expo-router';
import { BarChart3, PieChart } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AlertsBanner,
  DashboardShell,
  DistributionChart,
  InsightsPanel,
  KPIGrid,
  TrendChart,
  ZeroDataState,
} from '@/components/analytics';
import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useAnalyticsDashboard } from '@/features/company-admin/api/use-analytics-queries';

export function ExecutiveDashboardScreen() {
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const { data: response, isLoading, refetch } = useAnalyticsDashboard('executive', filters);
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
      <DashboardShell title="Executive Overview" loading={false}>
        <ZeroDataState
          title="No analytics data yet"
          message="Analytics will appear once employee data is added and the first computation runs."
          icon="chart"
          action={{
            label: 'Employee Directory',
            onPress: () => router.push('/company/hr/employees'),
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Executive Overview" loading={isLoading} onRefresh={handleRefresh}>
      {(dashboardData?.alerts?.length ?? 0) > 0 && (
        <AlertsBanner alerts={dashboardData!.alerts} />
      )}

      <KPIGrid kpis={dashboardData?.kpis ?? []} onDrilldown={handleDrilldown} />

      {/* ── Trends ── */}
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
