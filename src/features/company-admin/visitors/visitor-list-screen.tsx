/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Pressable,
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

import { useVisits } from '@/features/company-admin/api/use-visitor-queries';
import { VisitStatusBadge } from '@/features/company-admin/visitors/components/visit-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface VisitItem {
  id: string;
  visitorName: string;
  visitorCompany: string;
  visitorType: string;
  hostName: string;
  status: string;
  checkInTime: string | null;
  expectedArrival: string | null;
  visitCode: string;
  visitDate: string;
}

// ============ VISIT CARD ============

function VisitCard({
  item,
  index,
  onPress,
  fmt,
}: {
  readonly item: VisitItem;
  readonly index: number;
  readonly onPress: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyles.card, pressed && cardStyles.cardPressed]}
      >
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                {item.visitorName}
              </Text>
              {item.visitCode ? (
                <View style={cardStyles.codeBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">{item.visitCode}</Text>
                </View>
              ) : null}
            </View>
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
          {item.checkInTime ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.checkInTime)}</Text>
            </View>
          ) : item.expectedArrival ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Exp: {fmt.time(item.expectedArrival)}</Text>
            </View>
          ) : null}
          {item.visitDate ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{fmt.date(item.visitDate)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ FILTER CHIPS ============

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PRE_REGISTERED', label: 'Pre-Registered' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'CHECKED_IN', label: 'Checked In' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// ============ MAIN COMPONENT ============

export function VisitorListScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  const { data: response, isLoading, error, refetch, isFetching } = useVisits(queryParams);

  const visits: VisitItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      visitorCompany: v.visitorCompany ?? v.visitor?.company ?? '',
      visitorType: v.visitorType?.name ?? v.typeName ?? '',
      hostName: v.hostName ?? v.host?.name ?? '',
      status: v.status ?? 'PRE_REGISTERED',
      checkInTime: v.checkInTime ?? null,
      expectedArrival: v.expectedArrival ?? v.scheduledTime ?? null,
      visitCode: v.visitCode ?? v.code ?? '',
      visitDate: v.visitDate ?? v.expectedArrival ?? v.createdAt ?? '',
    }));
  }, [response]);

  const renderItem = ({ item, index }: { readonly item: VisitItem; readonly index: number }) => (
    <VisitCard
      item={item}
      index={index}
      onPress={() => router.push(`/company/visitors/detail?id=${item.id}` as any)}
      fmt={fmt}
    />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">All Visits</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
        {visits.length} visit{visits.length !== 1 ? 's' : ''}
      </Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, company, code..."
          filters={STATUS_FILTERS}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load visits" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || statusFilter) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No visits match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No visits" message="No visitor records found." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Visitor List" onMenuPress={toggle} />

      <FlashList
        data={visits}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
        }
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
  card: {
    backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    borderWidth: 1, borderColor: colors.primary[50],
  },
  cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
