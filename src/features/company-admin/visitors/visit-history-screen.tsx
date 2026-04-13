/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useVisitHistory } from '@/features/company-admin/api/use-visitor-queries';
import { VisitStatusBadge } from '@/features/company-admin/visitors/components/visit-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface HistoryItem {
  id: string;
  visitorName: string;
  visitorCompany: string;
  visitorType: string;
  hostName: string;
  visitDate: string;
  duration: string;
  status: string;
}

// ============ STATUS FILTERS ============

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
  { key: 'AUTO_CHECKED_OUT', label: 'Auto Out' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'NO_SHOW', label: 'No Show' },
];

// ============ HISTORY CARD ============

function HistoryCard({
  item,
  index,
  fmt,
}: {
  readonly item: HistoryItem;
  readonly index: number;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
            {item.visitorCompany ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.visitorCompany}</Text>
            ) : null}
          </View>
          <VisitStatusBadge status={item.status} />
        </View>

        <View style={cardStyles.cardMeta}>
          {item.visitorType ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.visitorType}</Text>
            </View>
          ) : null}
          {item.hostName ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Host: {item.hostName}</Text>
            </View>
          ) : null}
          {item.visitDate ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{fmt.date(item.visitDate)}</Text>
            </View>
          ) : null}
          {item.duration ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.duration}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function VisitHistoryScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [search, statusFilter]);

  const { data: response, isLoading, error, refetch, isFetching } = useVisitHistory(queryParams);

  const items: HistoryItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      visitorCompany: v.visitorCompany ?? v.visitor?.company ?? '',
      visitorType: v.visitorType?.name ?? v.typeName ?? '',
      hostName: v.hostName ?? v.host?.name ?? '',
      visitDate: v.visitDate ?? v.checkInTime ?? v.createdAt ?? '',
      duration: v.duration ?? v.visitDuration ?? '',
      status: v.status ?? 'CHECKED_OUT',
    }));
  }, [response]);

  const renderItem = ({ item, index }: { readonly item: HistoryItem; readonly index: number }) => (
    <HistoryCard item={item} index={index} fmt={fmt} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Visit History</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} record{items.length !== 1 ? 's' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, company, host..."
          filters={STATUS_FILTERS}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || statusFilter) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No visits match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No visit history" message="No completed or historical visits found." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Visit History" onMenuPress={toggle} />

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  listContent: { paddingHorizontal: 24 },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: colors.primary[50] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});
