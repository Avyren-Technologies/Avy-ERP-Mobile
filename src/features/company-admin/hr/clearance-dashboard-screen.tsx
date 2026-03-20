/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';

import { useExitClearances, useExitRequests } from '@/features/company-admin/api/use-offboarding-queries';
import { useUpdateClearance } from '@/features/company-admin/api/use-offboarding-mutations';

// ============ TYPES ============

interface ClearanceItem {
  id: string;
  department: string;
  items: { id: string; label: string; cleared: boolean }[];
  status: 'Pending' | 'Cleared';
}

// ============ CONSTANTS ============

const DEPARTMENT_ICONS: Record<string, { color: string; bgColor: string }> = {
  IT: { color: colors.info[600], bgColor: colors.info[50] },
  Admin: { color: colors.accent[600], bgColor: colors.accent[50] },
  Finance: { color: colors.success[600], bgColor: colors.success[50] },
  HR: { color: colors.primary[600], bgColor: colors.primary[50] },
  Library: { color: colors.warning[600], bgColor: colors.warning[50] },
};

const DEFAULT_DEPARTMENTS = ['IT', 'Admin', 'Finance', 'HR', 'Library'];

// ============ MOCK DATA FOR UI (until backend is wired) ============

function getMockClearances(): ClearanceItem[] {
  return DEFAULT_DEPARTMENTS.map((dept, i) => ({
    id: `clr-${i}`,
    department: dept,
    status: 'Pending' as const,
    items: [
      { id: `${dept}-1`, label: `${dept} asset return`, cleared: false },
      { id: `${dept}-2`, label: `${dept} access revocation`, cleared: false },
      { id: `${dept}-3`, label: `${dept} document handover`, cleared: false },
    ],
  }));
}

// ============ DEPARTMENT ICON ============

function DeptIcon({ dept }: { dept: string }) {
  const scheme = DEPARTMENT_ICONS[dept] ?? { color: colors.neutral[600], bgColor: colors.neutral[100] };
  return (
    <View style={[styles.deptIconWrap, { backgroundColor: scheme.bgColor }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M20 7h-4V3H8v4H4c-1.1 0-2 .9-2 2v11h20V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5z"
          stroke={scheme.color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// ============ PROGRESS BAR ============

function ProgressBar({ total, cleared }: { total: number; cleared: number }) {
  const pct = total > 0 ? (cleared / total) * 100 : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text className="font-inter text-[10px] font-bold text-primary-700">{Math.round(pct)}%</Text>
    </View>
  );
}

// ============ CLEARANCE CARD ============

function ClearanceCard({
  item, index, onClear,
}: {
  item: ClearanceItem; index: number;
  onClear: (clearanceId: string, department: string) => void;
}) {
  const clearedCount = item.items.filter(i => i.cleared).length;
  const allCleared = clearedCount === item.items.length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(350)}>
      <View style={[styles.card, allCleared && styles.cardCleared]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <DeptIcon dept={item.department} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text className="font-inter text-sm font-bold text-primary-950">{item.department}</Text>
            <Text className="font-inter text-[10px] text-neutral-400">{clearedCount}/{item.items.length} items cleared</Text>
          </View>
          {allCleared ? (
            <View style={[styles.clearedBadge]}>
              <Text className="font-inter text-[10px] font-bold text-success-700">Cleared</Text>
            </View>
          ) : (
            <Pressable onPress={() => onClear(item.id, item.department)} style={styles.clearBtn}>
              <Text className="font-inter text-xs font-bold text-white">Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Checklist */}
        {item.items.map(ci => (
          <View key={ci.id} style={styles.checkItem}>
            <View style={[styles.checkbox, ci.cleared && styles.checkboxChecked]}>
              {ci.cleared && (
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Path d="M20 6L9 17l-5-5" stroke={colors.white} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </View>
            <Text className={`font-inter text-xs ${ci.cleared ? 'text-neutral-400 line-through' : 'text-primary-900'}`}>{ci.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ============ MAIN SCREEN ============

export function ClearanceDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();
  const params = useLocalSearchParams<{ exitRequestId?: string }>();

  const exitRequestId = params.exitRequestId ?? '';
  const { data: clearanceData, isLoading, refetch } = useExitClearances(exitRequestId);
  const { data: exitListData } = useExitRequests();
  const updateClearance = useUpdateClearance();
  const confirmModal = useConfirmModal();

  // Resolve clearances — use API data or mock
  const clearances: ClearanceItem[] = React.useMemo(() => {
    const raw = (clearanceData as any)?.data ?? (clearanceData as any) ?? [];
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return getMockClearances();
  }, [clearanceData]);

  // Overall progress
  const totalItems = clearances.reduce((acc, c) => acc + c.items.length, 0);
  const clearedItems = clearances.reduce((acc, c) => acc + c.items.filter(i => i.cleared).length, 0);

  // If no exitRequestId, show a picker from exit requests list
  const exitRequests = React.useMemo(() => {
    const raw = (exitListData as any)?.data ?? (exitListData as any) ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [exitListData]);

  const handleClear = (clearanceId: string, department: string) => {
    confirmModal.show({
      title: `Clear ${department}?`,
      message: `This will mark all ${department} clearance items as completed. This action cannot be undone.`,
      variant: 'warning',
      confirmText: 'Confirm Clear',
      onConfirm: () => {
        updateClearance.mutate(
          { id: clearanceId, data: { status: 'Cleared', clearedAll: true } },
          { onSuccess: () => refetch() },
        );
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="font-inter text-white text-lg font-bold ml-3">Clearance Dashboard</Text>
        </View>
      </LinearGradient>

      {/* Overall progress */}
      <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.progressSection}>
        <Text className="font-inter text-xs font-bold text-primary-900 mb-2">Overall Clearance Progress</Text>
        <ProgressBar total={totalItems} cleared={clearedItems} />
        {clearedItems === totalItems && totalItems > 0 && (
          <Text className="font-inter text-xs font-semibold text-success-600 mt-2">All departments cleared — exit status will auto-advance.</Text>
        )}
      </Animated.View>

      {/* Clearance cards */}
      {isLoading && !clearanceData ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : clearances.length === 0 ? (
        <EmptyState title="No clearances" message="Select an exit request to view clearance status" />
      ) : (
        <FlatList
          data={clearances}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <ClearanceCard item={item} index={index} onClear={handleClear} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary[500]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gradient.surface },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  progressSection: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    backgroundColor: colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4, backgroundColor: colors.primary[500],
  },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.neutral[100],
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardCleared: { borderColor: colors.success[200], backgroundColor: colors.success[50] + '33' },
  deptIconWrap: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: colors.primary[600], borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  clearedBadge: {
    backgroundColor: colors.success[50], borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: colors.neutral[50],
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.neutral[300],
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success[500], borderColor: colors.success[500],
  },
});
