import { File as ExpoFile, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { shareAsync } from 'expo-sharing';
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CalendarOff,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Shield,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterBottomSheet } from '@/components/analytics';
import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { showError, showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
  useRateLimit,
  useReportCatalog,
  useReportHistory,
} from '@/features/company-admin/api/use-analytics-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { analyticsApi } from '@/lib/api/analytics';
import { useIsDark } from '@/hooks/use-is-dark';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportItem {
  reportType: string;
  title: string;
  description: string;
  category: string;
  sheetCount: number;
}

interface CatalogCategory {
  category: string;
  reports: ReportItem[];
}

interface HistoryItem {
  id: string;
  reportType: string;
  title: string;
  category: string;
  generatedBy: string;
  generatedAt: string;
  filterSummary?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabId = 'catalog' | 'history';

const CATEGORY_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  Workforce: {
    color: colors.primary[500],
    icon: <Users size={18} color={colors.primary[500]} />,
  },
  Attendance: {
    color: colors.success[500],
    icon: <CalendarCheck size={18} color={colors.success[500]} />,
  },
  Leave: {
    color: '#F59E0B',
    icon: <CalendarOff size={18} color="#F59E0B" />,
  },
  Payroll: {
    color: '#3B82F6',
    icon: <Banknote size={18} color="#3B82F6" />,
  },
  Statutory: {
    color: '#8B5CF6',
    icon: <Shield size={18} color="#8B5CF6" />,
  },
  Performance: {
    color: '#EC4899',
    icon: <TrendingUp size={18} color="#EC4899" />,
  },
  Attrition: {
    color: colors.danger[500],
    icon: <UserMinus size={18} color={colors.danger[500]} />,
  },
  Compliance: {
    color: '#14B8A6',
    icon: <ClipboardCheck size={18} color="#14B8A6" />,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryConfig(category: string) {
  return (
    CATEGORY_CONFIG[category] ?? {
      color: colors.neutral[500],
      icon: <FileSpreadsheet size={18} color={colors.neutral[500]} />,
    }
  );
}

// formatDate removed — use fmt.date() from useCompanyFormatter inside components

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RateLimitBadge({ remaining, total }: { remaining: number; total: number }) {
  const isLow = remaining <= 3;
  return (
    <View style={[styles.rateBadge, isLow && styles.rateBadgeLow]}>
      <Download size={12} color={isLow ? colors.danger[600] : colors.white} />
      <Text
        className={`font-inter text-[12px] font-semibold ${isLow ? 'text-danger-600' : 'text-white'}`}
      >
        {remaining}/{total} left
      </Text>
    </View>
  );
}

function TabBar({
  active,
  onSwitch,
}: {
  active: TabId;
  onSwitch: (tab: TabId) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {(['catalog', 'history'] as TabId[]).map((tab) => {
        const isActive = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onSwitch(tab)}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
          >
            <Text
              className={`font-inter text-[14px] font-semibold ${
                isActive ? 'text-primary-600' : 'text-neutral-400'
              }`}
            >
              {tab === 'catalog' ? 'Catalog' : 'History'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategorySection({
  category,
  reports,
  downloadingType,
  rateLimitReached,
  onDownload,
}: {
  category: string;
  reports: ReportItem[];
  downloadingType: string | null;
  rateLimitReached: boolean;
  onDownload: (reportType: string) => void;
}) {
  const cfg = getCategoryConfig(category);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.categorySection}>
      {/* Section header */}
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIconWrap, { backgroundColor: `${cfg.color}18` }]}>
          {cfg.icon}
        </View>
        <Text className="font-inter text-[15px] font-bold text-neutral-800">
          {category}
        </Text>
        <View style={[styles.categoryCountBadge, { backgroundColor: `${cfg.color}20` }]}>
          <Text
            className="font-inter text-[11px] font-semibold"
            style={{ color: cfg.color }}
          >
            {reports.length}
          </Text>
        </View>
      </View>

      {/* 2-col grid */}
      <View style={styles.reportGrid}>
        {reports.map((report) => {
          const isDownloading = downloadingType === report.reportType;
          const disabled = rateLimitReached || isDownloading;

          return (
            <View key={report.reportType} style={styles.reportCard}>
              {/* Accent bar */}
              <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

              <View style={styles.reportCardInner}>
                <Text
                  className="font-inter text-[13px] font-bold text-neutral-800"
                  numberOfLines={2}
                >
                  {report.title}
                </Text>
                <Text
                  className="font-inter text-[11px] text-neutral-400"
                  numberOfLines={2}
                >
                  {report.description}
                </Text>

                <View style={styles.reportCardFooter}>
                  <Text className="font-inter text-[10px] font-medium text-neutral-300">
                    {report.sheetCount} {report.sheetCount === 1 ? 'sheet' : 'sheets'}
                  </Text>

                  <Pressable
                    onPress={() => onDownload(report.reportType)}
                    disabled={disabled}
                    style={[styles.downloadButton, disabled && styles.downloadButtonDisabled]}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Download size={12} color={disabled ? colors.neutral[300] : colors.white} />
                        <Text
                          className={`font-inter text-[11px] font-semibold ${
                            disabled ? 'text-neutral-300' : 'text-white'
                          }`}
                        >
                          XLSX
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function HistoryCard({
  item,
  onRegenerate,
  downloading,
}: {
  item: HistoryItem;
  onRegenerate: (reportType: string) => void;
  downloading: boolean;
}) {
  const fmt = useCompanyFormatter();
  const formatDate = (d: string) => fmt.date(d);
  const cfg = getCategoryConfig(item.category);

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <Text className="font-inter text-[14px] font-bold text-neutral-800" numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.historyBadge, { backgroundColor: `${cfg.color}18` }]}>
          <Text
            className="font-inter text-[10px] font-semibold"
            style={{ color: cfg.color }}
          >
            {item.category}
          </Text>
        </View>
      </View>

      <View style={styles.historyMeta}>
        <Users size={12} color={colors.neutral[400]} />
        <Text className="font-inter text-[12px] text-neutral-400">
          {item.generatedBy}
        </Text>
        <Clock size={12} color={colors.neutral[400]} />
        <Text className="font-inter text-[12px] text-neutral-400">
          {formatDate(item.generatedAt)}
        </Text>
      </View>

      {item.filterSummary ? (
        <Text className="font-inter text-[11px] text-neutral-300" numberOfLines={1}>
          {item.filterSummary}
        </Text>
      ) : null}

      <Pressable
        onPress={() => onRegenerate(item.reportType)}
        disabled={downloading}
        style={styles.regenerateButton}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={colors.primary[600]} />
        ) : (
          <>
            <RefreshCw size={14} color={colors.primary[600]} />
            <Text className="font-inter text-[12px] font-semibold text-primary-600">
              Re-generate
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.emptyState}>
      <FileSpreadsheet size={48} color={colors.neutral[200]} />
      <Text className="font-inter text-[16px] font-bold text-neutral-400">
        No reports generated yet
      </Text>
      <Text className="font-inter text-[13px] text-neutral-300 text-center">
        Switch to the Catalog tab to browse and download reports.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ReportsHubScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('catalog');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  // --- Queries ---
  const { data: catalogRes, isLoading: catalogLoading } = useReportCatalog();
  const {
    data: historyRes,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useReportHistory({ page: historyPage, limit: 20 });
  const { data: rateLimitRes, refetch: refetchRateLimit } = useRateLimit();

  const catalogCategories = useMemo(() => {
    const rawData = catalogRes?.data;
    if (!rawData || typeof rawData !== 'object') return [];
    return Object.entries(rawData).map(([categoryKey, categoryValue]: [string, any]) => ({
      category: categoryKey,
      label: categoryValue?.meta?.label ?? categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1) + ' Reports',
      icon: categoryValue?.meta?.icon ?? 'file-text',
      color: categoryValue?.meta?.color ?? '#6366F1',
      reports: Array.isArray(categoryValue?.reports) ? categoryValue.reports.map((r: any) => ({
        key: r.key ?? '', title: r.title ?? '', description: r.description ?? '',
        sheetNames: Array.isArray(r.sheetNames) ? r.sheetNames : [],
      })) : [],
    }));
  }, [catalogRes]);
  const historyItems: HistoryItem[] = historyRes?.data ?? [];
  const historyMeta = historyRes?.meta;
  const remaining: number = rateLimitRes?.data?.remaining ?? 20;
  const total: number = rateLimitRes?.data?.total ?? 20;
  const rateLimitReached = remaining <= 0;

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  // --- Download handler ---
  const handleDownload = useCallback(
    async (reportType: string) => {
      if (rateLimitReached) return;
      setDownloadingType(reportType);
      try {
        const cleanFilters: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters)) {
          if (v) cleanFilters[k] = v;
        }
        const response = await analyticsApi.exportReport(reportType, {
          ...cleanFilters,
          format: 'excel',
        });

        // response is an Axios response with blob data
        // Convert blob to base64 and write using new expo-file-system API
        const blob = response.data as Blob;
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] ?? '';
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        const file = new ExpoFile(Paths.cache, `${reportType}_${Date.now()}.xlsx`);
        file.create();
        file.write(base64Data, { encoding: 'base64' });

        await shareAsync(file.uri, {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Share ${reportType} report`,
        });

        showSuccess('Report downloaded successfully');
        await refetchRateLimit();
        await refetchHistory();
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'isAxiosError' in err) {
          showError(err as Parameters<typeof showError>[0]);
        } else {
          showErrorMessage('Failed to download report');
        }
      } finally {
        setDownloadingType(null);
      }
    },
    [filters, rateLimitReached, refetchRateLimit, refetchHistory],
  );

  // --- History refresh ---
  const handleHistoryRefresh = useCallback(async () => {
    setHistoryPage(1);
    await refetchHistory();
  }, [refetchHistory]);

  const handleLoadMore = useCallback(() => {
    if (historyMeta && historyPage < (historyMeta.totalPages ?? 1)) {
      setHistoryPage((p) => p + 1);
    }
  }, [historyMeta, historyPage]);

  // --- Render ---
  return (
    <View style={styles.container}>
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text className="font-inter text-[22px] font-bold text-white">
              Reports & Downloads
            </Text>
            <RateLimitBadge remaining={remaining} total={total} />
          </View>
          {rateLimitReached && (
            <View style={styles.limitBanner}>
              <AlertTriangle size={14} color={colors.danger[600]} />
              <Text className="font-inter text-[12px] font-medium text-danger-600">
                Export limit reached. Resets in next billing cycle.
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <TabBar active={activeTab} onSwitch={setActiveTab} />

      {/* Filter pill */}
      {activeTab === 'catalog' && (
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={styles.filterPill}
          >
            <Filter size={14} color={colors.primary[600]} />
            <Text className="font-inter text-[13px] font-semibold text-primary-600">
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text className="font-inter text-[10px] font-bold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </Pressable>

          {activeFilterCount === 0 && (
            <Text className="font-inter text-[12px] text-neutral-400">
              Select filters to generate reports
            </Text>
          )}
        </View>
      )}

      {/* Content */}
      {activeTab === 'catalog' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {catalogLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          ) : (
            catalogCategories.map((cat) => (
              <CategorySection
                key={cat.category}
                category={cat.label}
                reports={cat.reports.map((r: { key: string; title: string; description: string; sheetNames: string[] }) => ({
                  reportType: r.key,
                  title: r.title,
                  description: r.description,
                  category: cat.category,
                  sheetCount: r.sheetNames.length,
                }))}
                downloadingType={downloadingType}
                rateLimitReached={rateLimitReached}
                onDownload={handleDownload}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <FlashList
          data={historyItems}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
            historyItems.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={historyLoading}
              onRefresh={handleHistoryRefresh}
              tintColor={colors.primary[500]}
            />
          }
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              onRegenerate={handleDownload}
              downloading={downloadingType === item.reportType}
            />
          )}
          ListEmptyComponent={historyLoading ? null : <EmptyHistory />}
          ListFooterComponent={
            historyMeta && historyPage < (historyMeta.totalPages ?? 1) ? (
              <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
                <Text className="font-inter text-[13px] font-semibold text-primary-600">
                  Load More
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      {/* Filter bottom sheet */}
      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onChange={setFilters}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rateBadgeLow: {
    backgroundColor: colors.danger[50],
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger[100],
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary[600],
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? colors.primary[800] : colors.primary[100],
  },
  filterBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Category section
  categorySection: {
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  // Report card (grid)
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportCard: {
    width: '48.5%' as unknown as number,
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  accentBar: {
    height: 3,
  },
  reportCardInner: {
    padding: 12,
    gap: 6,
    flex: 1,
  },
  reportCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto' as unknown as number,
    paddingTop: 6,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: colors.primary[600],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  downloadButtonDisabled: {
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
  },

  // History card
  historyCard: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? colors.primary[800] : colors.primary[100],
  },

  // Load more
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? colors.primary[800] : colors.primary[100],
    shadowColor: colors.primary[400],
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
});
const styles = createStyles(false);
