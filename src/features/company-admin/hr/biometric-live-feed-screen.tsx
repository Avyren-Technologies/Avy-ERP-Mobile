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
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useBiometricPunchLogs } from '@/features/company-admin/api/use-biometric-queries';
import { useIsDark } from '@/hooks/use-is-dark';
import { connectSocket, disconnectSocket } from '@/lib/socket';

// ============ TYPES ============

interface PunchLogEntry {
  id: string;
  employeeName: string | null;
  employeeCode: string | null;
  deviceUserId: string;
  deviceName: string;
  serialNumber: string;
  punchType: string; // CHECK_IN | CHECK_OUT
  verifyType: string; // FINGERPRINT | FACE | RFID | PIN | PASSWORD
  punchTime: string;
  mappingStatus: string; // MAPPED | UNMAPPED
}

// ============ HELPERS ============

function getVerifyLabel(type: string): string {
  switch (type) {
    case 'FINGERPRINT':
      return 'Fingerprint';
    case 'FACE':
      return 'Face';
    case 'RFID':
      return 'RFID';
    case 'PIN':
      return 'PIN';
    case 'PASSWORD':
      return 'Password';
    default:
      return type || 'Unknown';
  }
}

function getPunchTypeStyle(type: string): { bg: string; textClass: string; label: string } {
  if (type === 'CHECK_IN') {
    return {
      bg: colors.success[50],
      textClass: 'text-success-700',
      label: 'Check In',
    };
  }
  return {
    bg: colors.primary[50],
    textClass: 'text-primary-700',
    label: 'Check Out',
  };
}

// ============ PULSING DOT ============

function PulsingDot() {
  return (
    <View style={dotStyles.container}>
      <View style={dotStyles.outer} />
      <View style={dotStyles.inner} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outer: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success[200],
    opacity: 0.5,
  },
  inner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
});

// ============ STAT CHIP ============

function StatChip({
  label,
  value,
  bg,
  textClass,
}: {
  label: string;
  value: number;
  bg: string;
  textClass: string;
}) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: bg }]}>
      <Text className={`font-inter text-sm font-bold ${textClass}`}>
        {value}
      </Text>
      <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

// ============ PUNCH CARD ============

function PunchCard({
  item,
  index,
}: {
  item: PunchLogEntry;
  index: number;
}) {
  const fmt = useCompanyFormatter();
  const isDark = useIsDark();
  const punchStyle = getPunchTypeStyle(item.punchType);
  const isMapped = item.mappingStatus === 'MAPPED';

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(50 + index * 40)}>
      <View
        style={[
          punchCardStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        {/* Top row: Name + Punch type badge */}
        <View style={punchCardStyles.topRow}>
          <View style={{ flex: 1 }}>
            {isMapped ? (
              <Text
                className="font-inter text-sm font-semibold text-primary-950 dark:text-white"
                numberOfLines={1}
              >
                {item.employeeName ?? 'Unknown'}
              </Text>
            ) : (
              <Text
                className="font-inter text-sm font-semibold text-warning-600"
                numberOfLines={1}
              >
                Unknown — ID: {item.deviceUserId}
              </Text>
            )}
            {item.employeeCode && (
              <Text className="font-inter text-[10px] text-neutral-400 dark:text-neutral-500">
                {item.employeeCode}
              </Text>
            )}
          </View>
          <View style={[punchCardStyles.badge, { backgroundColor: punchStyle.bg }]}>
            <Text
              className={`font-inter text-[10px] font-bold ${punchStyle.textClass}`}
            >
              {punchStyle.label}
            </Text>
          </View>
        </View>

        {/* Bottom row: Verify type, device, time */}
        <View style={punchCardStyles.bottomRow}>
          <View
            style={[
              punchCardStyles.metaChip,
              {
                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
              },
            ]}
          >
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
              {getVerifyLabel(item.verifyType)}
            </Text>
          </View>
          <View
            style={[
              punchCardStyles.metaChip,
              {
                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
              },
            ]}
          >
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
              {item.deviceName}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text className="font-inter text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
            {fmt.time(item.punchTime)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const punchCardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  metaChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});

// ============ MAIN COMPONENT ============

export function BiometricLiveFeedScreen() {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const {
    data: logsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useBiometricPunchLogs({ limit: 50 });

  // Socket.IO real-time subscription
  React.useEffect(() => {
    const socket = connectSocket();

    const handlePunch = () => {
      // Refetch punch logs on new attendance punch event
      refetch();
    };

    socket.on('attendance:punch', handlePunch);

    return () => {
      socket.off('attendance:punch', handlePunch);
      disconnectSocket();
    };
  }, [refetch]);

  const punchLogs: PunchLogEntry[] = React.useMemo(() => {
    const raw = (logsResponse as any)?.data ?? logsResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [logsResponse]);

  // Compute summary stats
  const summary = React.useMemo(() => {
    let checkIns = 0;
    let checkOuts = 0;
    for (const log of punchLogs) {
      if (log.punchType === 'CHECK_IN') checkIns++;
      else checkOuts++;
    }
    return { checkIns, checkOuts, total: punchLogs.length };
  }, [punchLogs]);

  const renderItem = ({
    item,
    index,
  }: {
    item: PunchLogEntry;
    index: number;
  }) => <PunchCard item={item} index={index} />;

  const renderHeader = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{ paddingTop: 8, paddingBottom: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
          Live Attendance
        </Text>
        <PulsingDot />
      </View>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
        Real-time biometric punch feed
      </Text>

      {/* Summary chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <StatChip
          label="Check-Ins"
          value={summary.checkIns}
          bg={colors.success[50]}
          textClass="text-success-700"
        />
        <StatChip
          label="Check-Outs"
          value={summary.checkOuts}
          bg={colors.primary[50]}
          textClass="text-primary-700"
        />
        <StatChip
          label="Total"
          value={summary.total}
          bg={colors.accent[50]}
          textClass="text-accent-700"
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={{ paddingTop: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <EmptyState
            icon="error"
            title="Failed to load punch logs"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <View style={{ paddingTop: 40, alignItems: 'center' }}>
        <EmptyState
          icon="inbox"
          title="No punches yet"
          message="Attendance punches will appear here in real time."
        />
      </View>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
      }}
    >
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <AppTopHeader title="Live Attendance" onMenuPress={toggle} />
      <FlashList
        data={punchLogs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      />
    </View>
  );
}
