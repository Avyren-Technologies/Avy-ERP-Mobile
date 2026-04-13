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
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useCheckOutVisit } from '@/features/company-admin/api/use-visitor-mutations';
import { useOnSiteVisitors } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface OnSiteVisitor {
  id: string;
  visitorName: string;
  visitorCompany: string;
  visitorType: string;
  hostName: string;
  checkInTime: string;
  visitCode: string;
  gate: string;
}

// ============ ON-SITE CARD ============

function OnSiteCard({
  item,
  index,
  onCheckOut,
  isPending,
  onPress,
  fmt,
}: {
  readonly item: OnSiteVisitor;
  readonly index: number;
  readonly onCheckOut: () => void;
  readonly isPending: boolean;
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
              <View style={[cardStyles.statusBadge, { backgroundColor: colors.success[50] }]}>
                <View style={[cardStyles.statusDot, { backgroundColor: colors.success[500] }]} />
                <Text className="font-inter text-[10px] font-bold text-success-700">ON SITE</Text>
              </View>
            </View>
            {item.visitorCompany ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.visitorCompany}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={onCheckOut}
            disabled={isPending}
            style={[cardStyles.checkOutBtn, isPending && { opacity: 0.5 }]}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="font-inter text-[10px] font-bold text-white ml-1">Out</Text>
          </Pressable>
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
          ) : null}
          {item.gate ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Gate: {item.gate}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function OnSiteVisitorsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const [search, setSearch] = React.useState('');

  const { data: response, isLoading, error, refetch, isFetching } = useOnSiteVisitors();
  const checkOutMutation = useCheckOutVisit();

  const visitors: OnSiteVisitor[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      visitorName: v.visitorName ?? v.visitor?.name ?? '',
      visitorCompany: v.visitorCompany ?? v.visitor?.company ?? '',
      visitorType: v.visitorType?.name ?? v.typeName ?? '',
      hostName: v.hostName ?? v.host?.name ?? '',
      checkInTime: v.checkInTime ?? '',
      visitCode: v.visitCode ?? v.code ?? '',
      gate: v.gate?.name ?? v.gateName ?? '',
    }));
  }, [response]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return visitors;
    const q = search.toLowerCase();
    return visitors.filter(v =>
      v.visitorName.toLowerCase().includes(q) ||
      v.visitorCompany.toLowerCase().includes(q) ||
      v.visitCode.toLowerCase().includes(q),
    );
  }, [visitors, search]);

  const handleCheckOut = (item: OnSiteVisitor) => {
    showConfirm({
      title: 'Check Out Visitor',
      message: `Check out ${item.visitorName}?`,
      confirmText: 'Check Out',
      variant: 'warning',
      onConfirm: () => {
        checkOutMutation.mutate(
          { id: item.id },
          { onSuccess: () => showSuccess(`${item.visitorName} checked out`) },
        );
      },
    });
  };

  const renderItem = ({ item, index }: { readonly item: OnSiteVisitor; readonly index: number }) => (
    <OnSiteCard
      item={item}
      index={index}
      onCheckOut={() => handleCheckOut(item)}
      isPending={checkOutMutation.isPending}
      onPress={() => router.push(`/company/visitors/detail?id=${item.id}` as any)}
      fmt={fmt}
    />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">On-Site Visitors</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
        {filtered.length} visitor{filtered.length !== 1 ? 's' : ''} currently on site
      </Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, company, code..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No on-site visitors match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No on-site visitors" message="There are currently no visitors on site." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="On-Site Visitors" onMenuPress={toggle} />

      <FlashList
        data={filtered}
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

      <ConfirmModal {...confirmModalProps} />
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
    borderWidth: 1, borderColor: colors.success[100],
  },
  cardPressed: { backgroundColor: colors.success[50], transform: [{ scale: 0.98 }] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  checkOutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning[600], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
