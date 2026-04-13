/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import {
  useMarkSafe,
  useResolveEmergency,
  useTriggerEmergency,
} from '@/features/company-admin/api/use-visitor-mutations';
import { useMusterList } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface MusterPerson {
  id: string;
  name: string;
  company: string;
  type: string; // visitor | employee
  checkInTime: string;
  isSafe: boolean;
  gate: string;
}

// ============ MUSTER CARD ============

function MusterCard({
  item,
  index,
  onMarkSafe,
  isPending,
  fmt,
}: {
  readonly item: MusterPerson;
  readonly index: number;
  readonly onMarkSafe: () => void;
  readonly isPending: boolean;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(index * 60)}>
      <View style={[cardStyles.card, item.isSafe && cardStyles.cardSafe]}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
              <View style={[cardStyles.typeBadge, { backgroundColor: item.type === 'visitor' ? colors.accent[50] : colors.info[50] }]}>
                <Text className={`font-inter text-[10px] font-bold ${item.type === 'visitor' ? 'text-accent-700' : 'text-info-700'}`}>
                  {item.type === 'visitor' ? 'Visitor' : 'Employee'}
                </Text>
              </View>
            </View>
            {item.company ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.company}</Text>
            ) : null}
            <Text className="mt-0.5 font-inter text-[10px] text-neutral-400">
              In: {fmt.time(item.checkInTime)} {item.gate ? `| Gate: ${item.gate}` : ''}
            </Text>
          </View>

          {item.isSafe ? (
            <View style={cardStyles.safeBadge}>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M5 12l5 5L20 7" stroke={colors.success[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text className="font-inter text-[10px] font-bold text-success-700 ml-1">SAFE</Text>
            </View>
          ) : (
            <Pressable
              onPress={onMarkSafe}
              disabled={isPending}
              style={[cardStyles.markSafeBtn, isPending && { opacity: 0.5 }]}
            >
              <Text className="font-inter text-xs font-bold text-white">Mark Safe</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function EmergencyMusterScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const [emergencyReason, setEmergencyReason] = React.useState('');
  const [hasActiveEmergency, setHasActiveEmergency] = React.useState(false);

  const { data: response, isLoading, error, refetch, isFetching } = useMusterList();
  const triggerMutation = useTriggerEmergency();
  const markSafeMutation = useMarkSafe();
  const resolveMutation = useResolveEmergency();

  const musterList: MusterPerson[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response;
    if (!raw) return [];

    const list = raw.persons ?? raw.list ?? raw.visitors ?? [];
    if (!Array.isArray(list)) return [];

    return list.map((p: any) => ({
      id: p.id ?? '',
      name: p.name ?? p.visitorName ?? '',
      company: p.company ?? p.visitorCompany ?? '',
      type: p.type ?? 'visitor',
      checkInTime: p.checkInTime ?? '',
      isSafe: !!p.isSafe,
      gate: p.gate?.name ?? p.gateName ?? '',
    }));
  }, [response]);

  // Separate effect for emergency status — cannot call setState inside useMemo
  React.useEffect(() => {
    const raw = (response as any)?.data ?? response;
    if (raw?.isActive !== undefined) {
      setHasActiveEmergency(!!raw.isActive);
    }
  }, [response]);

  const safeCount = musterList.filter(p => p.isSafe).length;
  const unsafeCount = musterList.length - safeCount;

  const handleTriggerEmergency = () => {
    showConfirm({
      title: 'Trigger Emergency',
      message: 'This will activate emergency mode and generate a muster list of all on-site visitors. Are you sure?',
      confirmText: 'TRIGGER EMERGENCY',
      variant: 'danger',
      onConfirm: () => {
        triggerMutation.mutate(
          { reason: emergencyReason.trim() || 'Emergency evacuation' },
          {
            onSuccess: () => {
              showSuccess('Emergency triggered - muster list generated');
              setHasActiveEmergency(true);
              setEmergencyReason('');
            },
          },
        );
      },
    });
  };

  const handleMarkSafe = (personId: string) => {
    markSafeMutation.mutate(
      { personId },
      { onSuccess: () => showSuccess('Marked as safe') },
    );
  };

  const handleResolve = () => {
    showConfirm({
      title: 'Resolve Emergency',
      message: 'Mark this emergency as resolved? All on-site visitors should be accounted for.',
      confirmText: 'Resolve',
      variant: 'warning',
      onConfirm: () => {
        resolveMutation.mutate(undefined, {
          onSuccess: () => {
            showSuccess('Emergency resolved');
            setHasActiveEmergency(false);
          },
        });
      },
    });
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Emergency Muster" onMenuPress={toggle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
        }
      >
        {/* Emergency Trigger Section */}
        {!hasActiveEmergency && (
          <Animated.View entering={FadeInDown.duration(400)} style={s.sectionWrap}>
            <View style={s.emergencyCard}>
              <View style={s.emergencyIconWrap}>
                <Svg width={48} height={48} viewBox="0 0 24 24">
                  <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={colors.danger[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white text-center mt-4">Emergency Evacuation</Text>
              <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
                Trigger an emergency to generate a muster list of all on-site visitors and employees.
              </Text>

              <View style={[s.inputWrap, { marginTop: 20 }]}>
                <TextInput
                  style={[s.textInput, isDark && { color: colors.white }]}
                  placeholder="Reason (optional)"
                  placeholderTextColor={colors.neutral[400]}
                  value={emergencyReason}
                  onChangeText={setEmergencyReason}
                />
              </View>

              <Pressable
                onPress={handleTriggerEmergency}
                disabled={triggerMutation.isPending}
                style={[s.emergencyBtn, triggerMutation.isPending && { opacity: 0.5 }]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-sm font-bold text-white ml-2">
                  {triggerMutation.isPending ? 'TRIGGERING...' : 'TRIGGER EMERGENCY'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Active Emergency Stats */}
        {hasActiveEmergency && (
          <Animated.View entering={FadeInDown.duration(400)} style={s.sectionWrap}>
            <View style={s.activeEmergencyBanner}>
              <Text className="font-inter text-base font-bold text-white">EMERGENCY ACTIVE</Text>
              <Text className="font-inter text-xs text-white/80 mt-1">All persons on-site must be accounted for</Text>
            </View>

            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftColor: colors.success[500] }]}>
                <Text className="font-inter text-2xl font-bold text-success-600">{safeCount}</Text>
                <Text className="font-inter text-[10px] font-semibold text-neutral-500 uppercase">Safe</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: colors.danger[500] }]}>
                <Text className="font-inter text-2xl font-bold text-danger-600">{unsafeCount}</Text>
                <Text className="font-inter text-[10px] font-semibold text-neutral-500 uppercase">Unaccounted</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: colors.primary[500] }]}>
                <Text className="font-inter text-2xl font-bold text-primary-600">{musterList.length}</Text>
                <Text className="font-inter text-[10px] font-semibold text-neutral-500 uppercase">Total</Text>
              </View>
            </View>

            <Pressable
              onPress={handleResolve}
              disabled={resolveMutation.isPending}
              style={[s.resolveBtn, resolveMutation.isPending && { opacity: 0.5 }]}
            >
              <Text className="font-inter text-sm font-bold text-white">
                {resolveMutation.isPending ? 'RESOLVING...' : 'RESOLVE EMERGENCY'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Muster List */}
        {hasActiveEmergency && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.sectionWrap}>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">
              Muster List ({musterList.length})
            </Text>

            {isLoading ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : error ? (
              <EmptyState icon="error" title="Failed to load" message="Check your connection." action={{ label: 'Retry', onPress: () => refetch() }} />
            ) : musterList.length === 0 ? (
              <EmptyState icon="inbox" title="No persons on site" message="No visitors or employees were on site when the emergency was triggered." />
            ) : (
              musterList.map((person, idx) => (
                <MusterCard
                  key={person.id}
                  item={person}
                  index={idx}
                  onMarkSafe={() => handleMarkSafe(person.id)}
                  isPending={markSafeMutation.isPending}
                  fmt={fmt}
                />
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 16 },
  emergencyCard: {
    backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 2, borderColor: colors.danger[200],
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
  },
  emergencyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.danger[50], alignItems: 'center', justifyContent: 'center' },
  inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center', width: '100%' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  emergencyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 16, backgroundColor: colors.danger[600], width: '100%', marginTop: 16,
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  activeEmergencyBanner: { backgroundColor: colors.danger[600], borderRadius: 16, padding: 16, alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 14, padding: 14, alignItems: 'center', borderLeftWidth: 3 },
  resolveBtn: { height: 48, borderRadius: 14, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center', marginTop: 16 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: colors.danger[100],
  },
  cardSafe: { borderColor: colors.success[200], backgroundColor: colors.success[50] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  safeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success[50], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  markSafeBtn: { backgroundColor: colors.success[600], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
