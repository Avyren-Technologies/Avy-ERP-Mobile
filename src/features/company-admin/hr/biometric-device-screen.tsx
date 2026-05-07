/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import {
  useClaimBiometricDevice,
  useDeactivateBiometricDevice,
  useUpdateBiometricDevice,
} from '@/features/company-admin/api/use-biometric-mutations';
import {
  useBiometricDevices,
  useBiometricDeviceStats,
} from '@/features/company-admin/api/use-biometric-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface AdmsDevice {
  id: string;
  serialNumber: string;
  deviceName: string;
  isActive: boolean;
  lastHeartbeatAt: string | null;
  heartbeatCount: number;
  firmwareVersion: string | null;
  locationId: string | null;
  location: { id: string; name: string; code: string } | null;
  timezone: string;
  protocol: string;
  claimStatus: string;
  registeredAt: string;
  assignedAt: string | null;
}

// ============ HELPERS ============

function getDeviceStatus(device: AdmsDevice): {
  label: string;
  bg: string;
  textClass: string;
} {
  if (!device.isActive) {
    return { label: 'Inactive', bg: colors.neutral[100], textClass: 'text-neutral-500' };
  }
  if (!device.lastHeartbeatAt) {
    return { label: 'Offline', bg: colors.danger[50], textClass: 'text-danger-600' };
  }
  const diff = Date.now() - new Date(device.lastHeartbeatAt).getTime();
  const twoMin = 2 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  if (diff <= twoMin) {
    return { label: 'Online', bg: colors.success[50], textClass: 'text-success-700' };
  }
  if (diff <= oneHour) {
    return { label: 'Idle', bg: colors.warning[50], textClass: 'text-warning-700' };
  }
  return { label: 'Offline', bg: colors.danger[50], textClass: 'text-danger-600' };
}

// ============ STATUS BADGE ============

function StatusBadge({ device }: { device: AdmsDevice }) {
  const s = getDeviceStatus(device);
  return (
    <View style={[statusStyles.badge, { backgroundColor: s.bg }]}>
      <Text className={`font-inter text-[10px] font-bold ${s.textClass}`}>
        {s.label}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});

// ============ STATS HEADER ============

function StatsHeader({
  stats,
  isLoading,
}: {
  stats: { total: number; online: number; offline: number } | null;
  isLoading: boolean;
}) {
  const total = stats?.total ?? 0;
  const online = stats?.online ?? 0;
  const offline = stats?.offline ?? 0;

  if (isLoading && !stats) {
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              borderRadius: 14,
              padding: 12,
              alignItems: 'center',
              backgroundColor: colors.neutral[50],
              height: 60,
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      {[
        {
          label: 'Total',
          value: total,
          color: colors.primary[50],
          textColor: 'text-primary-700',
        },
        {
          label: 'Online',
          value: online,
          color: colors.success[50],
          textColor: 'text-success-700',
        },
        {
          label: 'Offline',
          value: offline,
          color: colors.danger[50],
          textColor: 'text-danger-600',
        },
      ].map((stat) => (
        <View
          key={stat.label}
          style={{
            flex: 1,
            borderRadius: 14,
            padding: 12,
            alignItems: 'center',
            backgroundColor: stat.color,
          }}
        >
          <Text className={`font-inter text-lg font-bold ${stat.textColor}`}>
            {stat.value}
          </Text>
          <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ============ CLAIM MODAL ============

function ClaimDeviceModal({
  visible,
  onClose,
  onSave,
  isSaving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { serialNumber: string; deviceName: string }) => void;
  isSaving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const [serialNumber, setSerialNumber] = React.useState('');
  const [deviceName, setDeviceName] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      setSerialNumber('');
      setDeviceName('');
    }
  }, [visible]);

  const isValid = serialNumber.trim() && deviceName.trim();

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      serialNumber: serialNumber.trim(),
      deviceName: deviceName.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(8, 15, 40, 0.32)',
        }}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            claimStyles.sheet,
            {
              paddingBottom: insets.bottom + 20,
              backgroundColor: isDark ? '#1A1730' : colors.white,
            },
          ]}
        >
          <View style={claimStyles.handle} />
          <Text className="mb-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
            Register Device
          </Text>

          <View style={claimStyles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Serial Number <Text className="text-danger-500">*</Text>
            </Text>
            <View
              style={[
                claimStyles.inputWrap,
                {
                  backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
            >
              <TextInput
                style={claimStyles.textInput}
                placeholder="e.g. ADMS-SN-001"
                placeholderTextColor={colors.neutral[400]}
                value={serialNumber}
                onChangeText={setSerialNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={claimStyles.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Device Name <Text className="text-danger-500">*</Text>
            </Text>
            <View
              style={[
                claimStyles.inputWrap,
                {
                  backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
            >
              <TextInput
                style={claimStyles.textInput}
                placeholder="e.g. Main Gate Scanner"
                placeholderTextColor={colors.neutral[400]}
                value={deviceName}
                onChangeText={setDeviceName}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={onClose}
              style={[
                claimStyles.cancelBtn,
                {
                  backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
            >
              <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!isValid || isSaving}
              style={[
                claimStyles.saveBtn,
                (!isValid || isSaving) && { opacity: 0.5 },
              ]}
            >
              <Text className="font-inter text-sm font-bold text-white">
                {isSaving ? 'Registering...' : 'Register'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const claimStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginBottom: 16,
  },
  fieldWrap: { marginBottom: 14 },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.primary[950],
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

// ============ DEVICE CARD ============

function DeviceCard({
  item,
  index,
  onDeactivate,
}: {
  item: AdmsDevice;
  index: number;
  onDeactivate: () => void;
}) {
  const fmt = useCompanyFormatter();
  const isDark = useIsDark();
  const status = getDeviceStatus(item);

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        <View style={cardStyles.header}>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text
                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                numberOfLines={1}
              >
                {item.deviceName}
              </Text>
              <StatusBadge device={item} />
            </View>
            <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">
              SN: {item.serialNumber}
            </Text>
          </View>
          {item.isActive && (
            <Pressable onPress={onDeactivate} hitSlop={8}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={colors.danger[400]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          )}
        </View>

        <View style={cardStyles.meta}>
          {item.firmwareVersion && (
            <View
              style={[
                cardStyles.metaChip,
                {
                  backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                },
              ]}
            >
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                FW: {item.firmwareVersion}
              </Text>
            </View>
          )}
          {item.location && (
            <View
              style={[
                cardStyles.metaChip,
                {
                  backgroundColor: isDark ? '#312E81' : colors.primary[50],
                },
              ]}
            >
              <Text className="font-inter text-[10px] text-primary-700 dark:text-primary-300">
                {item.location.name}
              </Text>
            </View>
          )}
          <View
            style={[
              cardStyles.metaChip,
              {
                backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
              },
            ]}
          >
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
              {item.protocol} · {item.timezone}
            </Text>
          </View>
        </View>

        {item.lastHeartbeatAt && (
          <View style={{ marginTop: 8 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Svg width={10} height={10} viewBox="0 0 24 24">
                <Circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill={status.label === 'Online' ? colors.success[400] : colors.neutral[300]}
                />
              </Svg>
              <Text className="font-inter text-[10px] text-neutral-400 dark:text-neutral-500">
                Last seen: {fmt.dateTime(item.lastHeartbeatAt)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
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

export function BiometricDeviceScreen() {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } =
    useConfirmModal();

  const [formVisible, setFormVisible] = React.useState(false);

  const {
    data: devicesResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useBiometricDevices();

  const { data: statsResponse, isLoading: statsLoading } =
    useBiometricDeviceStats();

  const claimMutation = useClaimBiometricDevice();
  const deactivateMutation = useDeactivateBiometricDevice();

  const devices: AdmsDevice[] = React.useMemo(() => {
    const raw = (devicesResponse as any)?.data ?? devicesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [devicesResponse]);

  const stats = React.useMemo(() => {
    const raw = (statsResponse as any)?.data ?? statsResponse ?? null;
    if (!raw) return null;
    return {
      total: raw.total ?? 0,
      online: raw.online ?? 0,
      offline: raw.offline ?? 0,
    };
  }, [statsResponse]);

  const handleClaim = (data: { serialNumber: string; deviceName: string }) => {
    claimMutation.mutate(data, {
      onSuccess: () => setFormVisible(false),
    });
  };

  const handleDeactivate = (item: AdmsDevice) => {
    showConfirm({
      title: 'Deactivate Device',
      message: `Are you sure you want to deactivate "${item.deviceName}"? The device will stop sending data.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: () => {
        deactivateMutation.mutate(item.id);
      },
    });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: AdmsDevice;
    index: number;
  }) => (
    <DeviceCard
      item={item}
      index={index}
      onDeactivate={() => handleDeactivate(item)}
    />
  );

  const renderHeader = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{ paddingTop: 8, paddingBottom: 16 }}
    >
      <View>
        <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">
          Biometric Devices
        </Text>
        <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
          ADMS-connected devices
        </Text>
      </View>
      <View style={{ marginTop: 16 }}>
        <StatsHeader stats={stats} isLoading={statsLoading} />
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
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <EmptyState
            icon="error"
            title="Failed to load devices"
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
          title="No devices registered"
          message="Register an ADMS biometric device to get started."
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
      <AppTopHeader title="Biometric Devices" onMenuPress={toggle} />
      <FlashList
        data={devices}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
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
      <FAB onPress={() => setFormVisible(true)} />
      <ClaimDeviceModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleClaim}
        isSaving={claimMutation.isPending}
      />
      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}
