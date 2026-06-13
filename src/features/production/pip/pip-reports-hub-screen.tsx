/* eslint-disable better-tailwindcss/no-unknown-classes */
import BottomSheet from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ExportSheet } from '@/components/ui/export-sheet';
import { DownloadIcon } from '@/features/production/pip/download-icon';
import { showErrorMessage } from '@/components/ui/utils';
import { useFileDownload } from '@/hooks/use-file-download';
import { useIsDark } from '@/hooks/use-is-dark';
import { analyticsApi } from '@/lib/api/analytics';

// ============ REPORT CATALOG ============

const PIP_REPORTS = [
  { key: 'pip-daily-production', title: 'Daily Production', description: 'Day-wise output by operator, machine, and operation', sheets: 3 },
  { key: 'pip-extra-hours-entries', title: 'Extra Hours Entries', description: 'Extra-hours production incentives by operator and part', sheets: 2 },
  { key: 'pip-incentive-summary', title: 'Incentive Summary', description: 'Monthly incentive consolidation with breakdowns', sheets: 5 },
  { key: 'pip-operator-performance', title: 'Operator Performance', description: 'Achievement rates and operator ranking', sheets: 3 },
  { key: 'pip-machine-utilization', title: 'Machine Utilization', description: 'Machine productivity and downtime analysis', sheets: 4 },
  { key: 'pip-shift-productivity', title: 'Shift Productivity', description: 'Shift-wise comparison and trends', sheets: 3 },
  { key: 'pip-payroll-merge', title: 'Payroll Merge', description: 'Audit trail of incentives merged into payroll', sheets: 2 },
  { key: 'pip-exception', title: 'Exception Report', description: 'Below-target, missing entries, duplicates, high downtime', sheets: 4 },
  { key: 'pip-slab-config', title: 'Slab Configuration', description: 'Current slab configs with tier details', sheets: 2 },
];

// ============ REPORT CARD ============

function ReportCard({
  report,
  index,
  isDark,
  onDownload,
}: {
  report: (typeof PIP_REPORTS)[number];
  index: number;
  isDark: boolean;
  onDownload: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(80 + index * 50)}>
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        <View style={cardStyles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
              {report.title}
            </Text>
            <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
              {report.description}
            </Text>
            <View style={[cardStyles.sheetBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-primary-600">
                {report.sheets} sheet{report.sheets !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onDownload}
            style={[
              cardStyles.downloadBtn,
              { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
            ]}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <DownloadIcon size={20} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function PipReportsHubScreen() {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const exportRef = React.useRef<BottomSheet>(null);
  const { download, isDownloading } = useFileDownload();
  const [selectedReport, setSelectedReport] = React.useState<string | null>(null);

  const handleDownloadPress = React.useCallback((reportKey: string) => {
    setSelectedReport(reportKey);
    exportRef.current?.expand();
  }, []);

  const handleExport = React.useCallback(async (format: 'excel' | 'pdf') => {
    if (!selectedReport) return;
    exportRef.current?.close();
    try {
      const response = await analyticsApi.exportReport(selectedReport, { format });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await download(response.data, {
        fileName: `${selectedReport}.${ext}`,
        mimeType: mime,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      if (msg === 'RATE_LIMIT_EXCEEDED' || msg.includes('rate limit')) {
        showErrorMessage('You have reached the export limit (50/hour). Please wait and try again.');
      } else {
        showErrorMessage('Failed to export report');
      }
    }
  }, [selectedReport, download]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }]}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke={colors.white}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-lg font-bold text-white">
              PIP Reports
            </Text>
            <Text className="font-inter text-xs text-white/70">
              {PIP_REPORTS.length} reports available for download
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >


        {/* Report Cards */}
        <View style={styles.content}>
          {PIP_REPORTS.map((report, index) => (
            <ReportCard
              key={report.key}
              report={report}
              index={index}
              isDark={isDark}
              onDownload={() => handleDownloadPress(report.key)}
            />
          ))}
        </View>
      </ScrollView>

      <ExportSheet ref={exportRef} onExport={handleExport} isDownloading={isDownloading} />
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  downloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
