/**
 * Visitor report CSV export hook for the mobile reports screen.
 *
 * Mirrors the web app's client-side CSV exporter: convert the React Query
 * results for the active tab into CSV, write to the cache directory, and
 * surface the native share sheet via `expo-sharing`.
 *
 * Wire-in (see visitor-reports-screen.tsx):
 *   const { exportActiveTab } = useReportExport(activeTab);
 *   <Pressable onPress={() => exportActiveTab('csv')}> …
 *
 * Excel and PDF formats are exposed as user choices but currently emit CSV —
 * Excel opens CSV natively, and PDF would require an extra native dep. The
 * web app is CSV-only today, so this preserves feature parity.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { showSuccess, showWarning } from '@/components/ui/utils';
import {
  useDailyLog,
  useOverstayReport,
  useReportSummary,
  useVisitorAnalytics,
} from '@/features/company-admin/api/use-visitor-queries';

export type ReportTabKey = 'daily' | 'summary' | 'overstay' | 'analytics';
export type ReportFormat = 'csv' | 'excel' | 'pdf';

/** Convert an array of plain objects to a CSV string. */
function toCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(','),
    ),
  ];
  return rows.join('\n');
}

/** Write CSV to cache and share via the native share sheet. */
async function shareAsCSV(data: any[], filename: string, format: ReportFormat): Promise<void> {
  if (!data || data.length === 0) {
    showWarning('No data to export');
    return;
  }
  try {
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) throw new Error('No writable directory');
    if (format === 'pdf') {
      showWarning('PDF export not supported on mobile yet. Exporting as CSV instead.');
    }
    const csv = toCSV(data);
    const fileUri = `${dir}${filename}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (!isAvailable) {
      showSuccess(`Saved to ${fileUri}`);
      return;
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Share ${filename}`,
      UTI: 'public.comma-separated-values-text',
    });
  } catch {
    showWarning('Could not export report');
  }
}

export function useReportExport(activeTab: ReportTabKey) {
  const dailyQuery = useDailyLog();
  const summaryQuery = useReportSummary();
  const overstayQuery = useOverstayReport();
  const analyticsQuery = useVisitorAnalytics();

  const exportActiveTab = async (format: ReportFormat) => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyData = (dailyQuery.data as any)?.data ?? [];
    const summaryData = (summaryQuery.data as any)?.data;
    const overstayData = (overstayQuery.data as any)?.data ?? [];
    const analyticsData = (analyticsQuery.data as any)?.data;

    const map: Record<ReportTabKey, { data: any; name: string }> = {
      daily: { data: dailyData, name: `visitor-daily-log-${today}` },
      summary: { data: summaryData ? [summaryData] : [], name: 'visitor-summary' },
      overstay: { data: overstayData, name: 'visitor-overstay' },
      analytics: { data: analyticsData ? [analyticsData] : [], name: 'visitor-analytics' },
    };
    const { data, name } = map[activeTab];
    await shareAsCSV(Array.isArray(data) ? data : [data], name, format);
  };

  return { exportActiveTab };
}
