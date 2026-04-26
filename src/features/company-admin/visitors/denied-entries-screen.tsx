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

import { useDeniedEntries } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface DeniedEntryItem {
  id: string;
  visitorName: string;
  visitorMobile: string;
  visitorCompany: string;
  denialReason: string;
  gate: string;
  deniedBy: string;
  deniedAt: string;
}

// ============ DENIAL REASON BADGE ============

const REASON_COLOR: Record<string, { bg: string; text: string }> = {
  BLOCKLIST_MATCH: { bg: colors.danger[50], text: colors.danger[700] },
  HOST_REJECTED: { bg: colors.warning[50], text: colors.warning[700] },
  INDUCTION_FAILED: { bg: colors.danger[50], text: colors.danger[700] },
  GATE_CLOSED: { bg: colors.neutral[100], text: colors.neutral[600] },
  WRONG_DATE: { bg: colors.info[50], text: colors.info[700] },
  WRONG_GATE: { bg: colors.info[50], text: colors.info[700] },
  PASS_EXPIRED: { bg: colors.neutral[100], text: colors.neutral[500] },
  APPROVAL_TIMEOUT: { bg: colors.warning[50], text: colors.warning[700] },
  MANUAL_DENIAL: { bg: colors.danger[50], text: colors.danger[700] },
  VISIT_CANCELLED: { bg: colors.neutral[100], text: colors.neutral[600] },
};

// ============ DENIED ENTRY CARD ============

function DeniedCard({
  item,
  index,
  fmt,
}: {
  readonly item: DeniedEntryItem;
  readonly index: number;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  const reasonCfg = REASON_COLOR[item.denialReason] ?? { bg: colors.danger[50], text: colors.danger[700] };
  const reasonLabel = item.denialReason.replace(/_/g, ' ');

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={[cardStyles.card, { borderLeftColor: colors.danger[500], borderLeftWidth: 3 }]}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
            {item.visitorMobile ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.visitorMobile}</Text>
            ) : null}
            {item.visitorCompany ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.visitorCompany}</Text>
            ) : null}
          </View>
          <View style={[cardStyles.reasonBadge, { backgroundColor: reasonCfg.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: reasonCfg.text }}>{reasonLabel}</Text>
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          {item.gate ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Gate: {item.gate}</Text>
            </View>
          ) : null}
          {item.deniedBy ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">By: {item.deniedBy}</Text>
            </View>
          ) : null}
          {item.deniedAt ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{fmt.dateTime(item.deniedAt)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function DeniedEntriesScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();

  const [search, setSearch] = React.useState('');

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search]);

  const { data: response, isLoading, error, refetch, isFetching } = useDeniedEntries(queryParams);

  const items: DeniedEntryItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => ({
      id: d.id ?? '',
      visitorName: d.visitorName ?? '',
      visitorMobile: d.visitorMobile ?? '',
      visitorCompany: d.visitorCompany ?? '',
      denialReason: d.denialReason ?? '',
      gate: d.gateId ?? '',
      deniedBy: d.deniedBy ?? '',
      deniedAt: d.deniedAt ?? d.createdAt ?? '',
    }));
  }, [response]);

  const renderItem = ({ item, index }: { readonly item: DeniedEntryItem; readonly index: number }) => (
    <DeniedCard item={item} index={index} fmt={fmt} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Denied Entries</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} entr{items.length !== 1 ? 'ies' : 'y'}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, mobile, company..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No denied entries match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No denied entries" message="No entry denials recorded." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Denied Entries" onMenuPress={toggle} />

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
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reasonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
});
