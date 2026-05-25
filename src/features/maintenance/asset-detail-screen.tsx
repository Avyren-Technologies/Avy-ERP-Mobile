/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Switch,
  Modal as RNModal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { showSuccess, showErrorMessage, showError } from '@/components/ui/utils';
import {
  useUpdateAsset,
  useDeleteAsset,
  useAddMeter,
  useLogReading,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
  useAsset,
  useAssetMeters,
  useAssetHistory,
  useMeterReadings,
} from '@/features/maintenance/api/use-maintenance-queries';
import { useQuery } from '@tanstack/react-query';
import { platformUsersApi } from '@/lib/api/platform-users';
import { useAuthStore, getDisplayName } from '@/features/auth/use-auth-store';
import { AssetStatusBadge } from '@/features/maintenance/shared/asset-status-badge';
import { CriticalityBadge } from '@/features/maintenance/shared/criticality-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useDepartments } from '@/features/company-admin/api/use-hr-queries';

// ============ TABS ============

const TABS = ['Overview', 'Meters', 'History', 'Documents', 'Cost'] as const;
type TabName = (typeof TABS)[number];

function TabBar({ active, onSelect, isDark }: { active: TabName; onSelect: (t: TabName) => void; isDark: boolean }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tabStyles.container}
      style={{ flexGrow: 0 }}
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            style={[
              tabStyles.tab,
              isActive && { borderBottomColor: colors.primary[600], borderBottomWidth: 2 },
            ]}
          >
            <Text
              className={`font-inter text-sm font-semibold ${isActive ? 'text-primary-600' : 'text-neutral-400 dark:text-neutral-500'}`}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ============ INFO ROW ============

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white text-right flex-1 ml-4" numberOfLines={1}>
        {value != null && String(value).trim() !== '' ? String(value) : '---'}
      </Text>
    </View>
  );
}

// ============ INFO CARD ============

function InfoCard({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <View style={[infoStyles.card, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
      <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
        {title}
      </Text>
      <View style={{ gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

// ============ METER CARD ============

function MeterCard({
  meter,
  assetId,
  isDark,
  index,
  onLogReading,
  fmt,
}: {
  meter: any;
  assetId: string;
  isDark: boolean;
  index: number;
  onLogReading: (meter: any) => void;
  fmt: CompanyFormatter;
}) {
  const [showHistory, setShowHistory] = React.useState(false);
  const { data: historyRes } = useMeterReadings(assetId, meter.id, showHistory);
  const readings: any[] = React.useMemo(() => {
    if (!historyRes) return [];
    if (Array.isArray(historyRes)) return historyRes;
    if ((historyRes as any).data && Array.isArray((historyRes as any).data.data)) {
      return (historyRes as any).data.data;
    }
    if (Array.isArray((historyRes as any).data)) return (historyRes as any).data;
    if (Array.isArray((historyRes as any).readings)) return (historyRes as any).readings;
    if ((historyRes as any).data && Array.isArray((historyRes as any).data.readings)) return (historyRes as any).data.readings;
    return [];
  }, [historyRes]);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
      <View style={[meterStyles.card, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.primary[900] : colors.neutral[200] }]}>
        <View style={meterStyles.header}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
              {meter.name || meter.label}
            </Text>
            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
              {(meter.meterType ?? 'CUMULATIVE').replace(/_/g, ' ')} - {meter.unit || meter.unitOfMeasure || 'hrs'}
            </Text>
          </View>
          <View style={[meterStyles.valueBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
            <Text className="font-inter text-sm font-bold text-primary-700">
              {meter.currentValue ?? 0}
            </Text>
            <Text className="font-inter text-[10px] text-primary-500">
              {meter.unit || meter.unitOfMeasure || 'hrs'}
            </Text>
          </View>
        </View>

        <View style={meterStyles.actions}>
          <Pressable
            onPress={() => onLogReading(meter)}
            style={[meterStyles.actionBtn, { backgroundColor: colors.primary[600] }]}
          >
            <Text className="font-inter text-xs font-bold text-white">Log Reading</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowHistory(!showHistory)}
            style={[meterStyles.actionBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}
          >
            <Text className="font-inter text-xs font-bold text-primary-600">
              {showHistory ? 'Hide' : 'History'}
            </Text>
          </Pressable>
        </View>

        {showHistory ? (
          <View style={meterStyles.historySection}>
            {readings.length > 0 ? (
              <>
                <View style={[meterStyles.historyHeaderRow, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200] }]}>
                  <Text style={meterStyles.colDate} className="font-inter text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Date</Text>
                  <Text style={meterStyles.colValue} className="font-inter text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Value</Text>
                  <Text style={meterStyles.colDelta} className="font-inter text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Delta</Text>
                  <Text style={meterStyles.colSource} className="font-inter text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Source</Text>
                </View>
                {readings.slice(0, 10).map((r: any, i: number) => {
                  const delta = r.previousValue != null
                    ? Number(r.value) - Number(r.previousValue)
                    : null;
                  return (
                    <View key={r.id ?? i} style={[meterStyles.historyRow, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[200] }]}>
                      <Text style={meterStyles.colDate} className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                        {r.createdAt ? fmt.date(r.createdAt) : '---'}
                      </Text>
                      <Text style={meterStyles.colValue} className="font-inter text-xs font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                        {Number(r.value).toLocaleString()}
                      </Text>
                      <View style={meterStyles.colDelta}>
                        {r.isReset ? (
                          <View style={[meterStyles.resetBadge, { backgroundColor: isDark ? '#3B2314' : colors.warning[50], borderColor: isDark ? colors.warning[800] : colors.warning[200] }]}>
                            <Text className="font-inter text-[8px] font-bold text-warning-700 dark:text-warning-400">RESET</Text>
                          </View>
                        ) : delta != null ? (
                          <Text className={`font-inter text-xs font-semibold ${delta >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`} numberOfLines={1}>
                            {delta >= 0 ? '+' : ''}{Number(delta).toLocaleString()}
                          </Text>
                        ) : (
                          <Text className="font-inter text-xs text-neutral-400 dark:text-neutral-500">---</Text>
                        )}
                      </View>
                      <Text style={meterStyles.colSource} className="font-inter text-[10px] text-neutral-400 dark:text-neutral-500 uppercase" numberOfLines={1}>
                        {r.source || 'MANUAL'}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text className="font-inter text-xs text-neutral-400 dark:text-neutral-500">
                  No readings recorded yet
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ USER NAME RESOLVER ============

function UserName({ actorId, currentUser }: { actorId: string | null | undefined; currentUser: any }) {
  const isCurrentUser = !!actorId && currentUser?.id === actorId;

  const { data } = useQuery({
    queryKey: ['platform-user', actorId],
    queryFn: () => platformUsersApi.getUserById(actorId!),
    enabled: !!actorId && !isCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  if (!actorId) return <Text className="font-inter text-[10px] text-neutral-400 italic">System</Text>;

  if (isCurrentUser) {
    return (
      <Text className="font-inter text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
        {getDisplayName(currentUser)}
      </Text>
    );
  }

  const fetched = (data as any)?.data;
  if (fetched) {
    const name = `${fetched.firstName ?? ''} ${fetched.lastName ?? ''}`.trim() || fetched.email;
    return (
      <Text className="font-inter text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
        {name}
      </Text>
    );
  }

  return (
    <Text className="font-inter text-[10px] text-neutral-400 italic">
      User #{actorId.slice(-6)}
    </Text>
  );
}

// ============ EVENT DESCRIPTION BUILDER ============

function buildEventDescription(event: any): string {
  if (event.description) return event.description;
  if (event.notes) return event.notes;

  const meta = event.metadata as any;
  const nv = event.newValue as any;
  const ov = event.oldValue as any;

  switch (event.eventType ?? event.type) {
    case 'CREATED':
      return 'Asset was registered in the system.';
    case 'STATUS_CHANGED':
    case 'STATUS_CHANGE': {
      const from = (ov?.operationalStatus || ov?.status || '').replace(/_/g, ' ');
      const to = (nv?.operationalStatus || nv?.status || '').replace(/_/g, ' ');
      if (from && to) return `Status changed from ${from} to ${to}.`;
      if (to) return `Status changed to ${to}.`;
      return 'Asset status was updated.';
    }
    case 'TRANSFERRED': {
      const loc = meta?.toLocationName || nv?.locationName || '';
      return loc ? `Asset transferred to ${loc}.` : 'Asset was transferred to a new location.';
    }
    case 'RETIRED':
      return 'Asset was retired and soft-deleted.';
    case 'READING_LOGGED':
    case 'METER_READING': {
      const val = meta?.value ?? nv?.value;
      const unit = meta?.unit || '';
      const isReset = meta?.isReset || nv?.isReset;
      if (isReset) return `Meter reset. New reading: ${val}${unit ? ` ${unit}` : ''}.`;
      return val != null ? `Meter reading logged: ${val}${unit ? ` ${unit}` : ''}.` : 'Meter reading logged.';
    }
    default:
      return '---';
  }
}

// ============ HISTORY ITEM ============

function HistoryItem({
  event,
  index,
  isDark,
  fmt,
  currentUser,
}: {
  event: any;
  index: number;
  isDark: boolean;
  fmt: CompanyFormatter;
  currentUser: any;
}) {
  if (!event) return null;
  const typeColors: Record<string, string> = {
    CREATED: colors.success[500],
    STATUS_CHANGE: colors.info[500],
    STATUS_CHANGED: colors.info[500],
    TRANSFER: colors.warning[500],
    TRANSFERRED: colors.warning[500],
    WORK_REQUEST: colors.accent[500],
    WORK_ORDER: colors.primary[500],
    METER_READING: colors.info[400],
    READING_LOGGED: colors.info[400],
    MAINTENANCE: colors.warning[600],
  };
  const dotColor = typeColors[event.eventType ?? event.type] ?? colors.neutral[400];

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 40)}>
      <View style={historyStyles.row}>
        <View style={historyStyles.timeline}>
          <View style={[historyStyles.dot, { backgroundColor: dotColor }]} />
          {index < 20 ? <View style={[historyStyles.line, { backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} /> : null}
        </View>
        <View style={historyStyles.content}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%' }}>
            <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
              {(event.eventType ?? event.type ?? 'EVENT').replace(/_/g, ' ')}
            </Text>
            <Text className="font-inter text-[10px] text-neutral-400 text-right">
              {event.createdAt ? fmt.dateTime(event.createdAt) : '-'}
            </Text>
          </View>
          <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ marginTop: 2 }}>
            {buildEventDescription(event)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text className="font-inter text-[10px] text-neutral-400">By:</Text>
            <UserName actorId={event.actorId} currentUser={currentUser} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ CONSTANTS FOR METER FORM ============

const METER_TYPES = [
  { value: 'RUNTIME_HOURS', label: 'Runtime Hours' },
  { value: 'CYCLE_COUNT', label: 'Cycle Count' },
  { value: 'MILEAGE', label: 'Mileage' },
  { value: 'OUTPUT_UNITS', label: 'Output Units' },
  { value: 'ENERGY_KWH', label: 'Energy (kWh)' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'PRESSURE', label: 'Pressure' },
  { value: 'VIBRATION', label: 'Vibration' },
] as const;

// ============ MAIN ============

export function AssetDetailScreen() {
  const isDark = useIsDark();
  const fmt = useCompanyFormatter();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirmModal = useConfirmModal();
  const [activeTab, setActiveTab] = React.useState<TabName>('Overview');

  const currentUser = useAuthStore.use.user();

  // Queries
  const { data: assetRes, isLoading, refetch, isFetching } = useAsset(id ?? '');
  const asset: any = (assetRes as any)?.data ?? null;

  const { data: metersRes, refetch: refetchMeters } = useAssetMeters(id ?? '');
  const meters: any[] = (metersRes as any)?.data ?? [];

  const { data: historyRes } = useAssetHistory(id ?? '');
  const historyEvents: any[] = (historyRes as any)?.data ?? [];

  const { data: locationsRaw } = useCompanyLocations();
  const locations = (locationsRaw as any)?.data ?? [];

  const { data: deptsRaw } = useDepartments();
  const departments = (deptsRaw as any)?.data ?? [];

  // Mutations
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const addMeter = useAddMeter();
  const logReading = useLogReading();

  // Add meter state
  const [showAddMeter, setShowAddMeter] = React.useState(false);
  const [meterName, setMeterName] = React.useState('');
  const [meterUnit, setMeterUnit] = React.useState('');
  const [meterType, setMeterType] = React.useState('RUNTIME_HOURS');
  const [isCumulative, setIsCumulative] = React.useState(true);
  const [currentValue, setCurrentValue] = React.useState('0');

  // Log reading modal state
  const [showLogReading, setShowLogReading] = React.useState(false);
  const [selectedLogMeter, setSelectedLogMeter] = React.useState<any>(null);
  const [readingValue, setReadingValue] = React.useState('');
  const [isResetReading, setIsResetReading] = React.useState(false);
  const [readingWarning, setReadingWarning] = React.useState(false);

  // Validate cumulative warning on log reading
  React.useEffect(() => {
    if (selectedLogMeter && readingValue) {
      const numVal = parseFloat(readingValue);
      const currentVal = Number(selectedLogMeter.currentValue ?? 0);
      const isCum = selectedLogMeter.isCumulative !== false;
      if (isCum && !isResetReading && numVal < currentVal) {
        setReadingWarning(true);
      } else {
        setReadingWarning(false);
      }
    } else {
      setReadingWarning(false);
    }
  }, [readingValue, selectedLogMeter, isResetReading]);

  const handleRefresh = () => {
    refetch();
    refetchMeters();
  };

  const handleDelete = () => {
    confirmModal.show({
      title: 'Delete Asset',
      message: `Are you sure you want to delete "${asset?.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteAsset.mutate(id ?? '', {
          onSuccess: () => { showSuccess('Asset Deleted'); router.back(); },
        });
      },
    });
  };

  const handleAddMeter = () => {
    if (!meterName.trim()) { showErrorMessage('Meter name is required'); return; }
    if (!meterUnit.trim()) { showErrorMessage('Unit is required'); return; }

    addMeter.mutate(
      {
        assetId: id ?? '',
        data: {
          label: meterName.trim(),
          unit: meterUnit.trim(),
          meterType: meterType,
          isCumulative: isCumulative,
          currentValue: Number(currentValue || 0),
        },
      },
      {
        onSuccess: () => {
          setShowAddMeter(false);
          setMeterName('');
          setMeterUnit('');
          setMeterType('RUNTIME_HOURS');
          setIsCumulative(true);
          setCurrentValue('0');
          refetchMeters();
          showSuccess('Meter Added');
        },
        onError: (err: any) => {
          showError(err);
        },
      },
    );
  };

  const handleLogReading = (meter: any) => {
    setSelectedLogMeter(meter);
    setReadingValue('');
    setIsResetReading(false);
    setReadingWarning(false);
    setShowLogReading(true);
  };

  const handleLogReadingSubmit = () => {
    if (!selectedLogMeter) return;
    if (!readingValue.trim()) { showErrorMessage('Please enter a reading value'); return; }

    const numVal = parseFloat(readingValue);
    if (isNaN(numVal)) { showErrorMessage('Please enter a valid number'); return; }

    logReading.mutate(
      {
        assetId: id ?? '',
        meterId: selectedLogMeter.id,
        data: {
          value: numVal,
          isReset: isResetReading,
          source: 'MANUAL',
        },
      },
      {
        onSuccess: () => {
          setShowLogReading(false);
          setReadingValue('');
          setIsResetReading(false);
          setSelectedLogMeter(null);
          refetchMeters();
          showSuccess('Reading Logged');
        },
        onError: (err: any) => {
          showError(err);
        },
      },
    );
  };

  if (isLoading || !asset) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={styles.titleWrap}>
            <Text className="font-inter text-lg font-bold text-white" numberOfLines={1}>{asset.name}</Text>
            <Text className="font-inter text-[11px] text-white/80" numberOfLines={1}>{asset.assetNumber}</Text>
          </View>
          <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={12}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <TabBar active={activeTab} onSelect={setActiveTab} isDark={isDark} />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        overScrollMode="always"
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={handleRefresh} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      >
        {activeTab === 'Overview' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Status badges */}
            <View style={styles.badgeRow}>
              <AssetStatusBadge operationalStatus={asset.operationalStatus} maintenanceStatus={asset.maintenanceStatus} />
              <CriticalityBadge criticality={asset.criticality ?? 'MEDIUM'} />
            </View>

            {/* 1. Identity Card */}
            <InfoCard title="Identity" isDark={isDark}>
              <InfoRow label="Asset Number" value={asset.assetNumber} />
              <InfoRow label="Name" value={asset.name} />
              <InfoRow label="Asset Code" value={asset.assetCode || asset.assetNumber} />
              <InfoRow label="Serial Number" value={asset.serialNumber} />
              <InfoRow label="Class" value={(asset.assetClass || '').replace(/_/g, ' ')} />
            </InfoCard>

            {/* 2. Classification Card */}
            <InfoCard title="Classification" isDark={isDark}>
              <InfoRow label="Category" value={asset.category?.name} />
              <InfoRow label="Sub-Category" value={asset.subCategory?.name} />
              <InfoRow label="Type" value={asset.type?.name || asset.assetType?.name} />
              <InfoRow label="Ownership" value={(asset.ownership || '').replace(/_/g, ' ')} />
              <InfoRow label="Bottleneck" value={asset.isBottleneck ? 'Yes' : 'No'} />
            </InfoCard>

            {/* 3. Location Card */}
            <InfoCard title="Location" isDark={isDark}>
              <InfoRow label="Location" value={locations.find((l: any) => l.id === asset.locationId)?.name || asset.location?.name} />
              <InfoRow label="Department" value={departments.find((d: any) => d.id === asset.departmentId)?.name || asset.department?.name} />
              <InfoRow label="Floor / Zone" value={asset.floorZone} />
            </InfoCard>

            {/* 4. Technical Card */}
            <InfoCard title="Technical" isDark={isDark}>
              <InfoRow label="Manufacturer" value={asset.manufacturer} />
              <InfoRow label="Brand" value={asset.brand} />
              <InfoRow label="Model" value={asset.model || asset.modelNumber} />
              <InfoRow label="Condition" value={asset.condition} />
              <InfoRow label="Rated Capacity" value={asset.ratedCapacity} />
              <InfoRow label="Design Life" value={asset.designLifeYears ? `${asset.designLifeYears} years` : null} />
              <InfoRow label="Commissioned" value={asset.commissioningDate ? fmt.date(asset.commissioningDate) : null} />
            </InfoCard>

            {/* 5. Compliance Card */}
            <InfoCard title="Compliance" isDark={isDark}>
              <InfoRow label="Permit Required" value={asset.permitRequired ? 'Yes' : 'No'} />
              <InfoRow label="PTW Class" value={asset.ptwClass ? String(asset.ptwClass).replace(/_/g, ' ') : null} />
              <InfoRow label="Warranty Expiry" value={asset.warrantyExpiry ? fmt.date(asset.warrantyExpiry) : null} />
              <InfoRow label="Insurance Expiry" value={asset.insuranceExpiry ? fmt.date(asset.insuranceExpiry) : null} />
              <InfoRow label="Registration Expiry" value={asset.registrationExpiry ? fmt.date(asset.registrationExpiry) : null} />
              <InfoRow label="Fitness Expiry" value={asset.fitnessExpiry ? fmt.date(asset.fitnessExpiry) : null} />
            </InfoCard>

            {/* 6. Financial Card */}
            <InfoCard title="Financial" isDark={isDark}>
              <InfoRow label="Purchase Cost" value={asset.purchaseCost ? Number(asset.purchaseCost).toLocaleString() : null} />
              <InfoRow label="Book Value" value={asset.currentBookValue ? Number(asset.currentBookValue).toLocaleString() : null} />
              <InfoRow label="Replacement Value" value={asset.replacementValue ? Number(asset.replacementValue).toLocaleString() : null} />
              <InfoRow label="Accumulated Maint. Cost" value={asset.accumulatedMaintCost ? Number(asset.accumulatedMaintCost).toLocaleString() : '0'} />
            </InfoCard>

            {/* Parent Asset Link */}
            {asset.parentAsset ? (
              <Pressable
                onPress={() => router.push(`/maintenance/asset-detail?id=${asset.parentAssetId}`)}
                style={[styles.linkCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}
              >
                <Text className="font-inter text-xs text-neutral-400">Parent Asset</Text>
                <Text className="font-inter text-sm font-bold text-primary-600">{asset.parentAsset.name}</Text>
              </Pressable>
            ) : null}

            {/* Linked Machine Link */}
            {asset.linkedMachine ? (
              <View style={[styles.linkCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <Text className="font-inter text-xs text-neutral-400">Linked Machine</Text>
                <Text className="font-inter text-sm font-bold text-accent-600">{asset.linkedMachine.assetName}</Text>
              </View>
            ) : null}
          </Animated.View>
        )}

        {activeTab === 'Meters' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.sectionHeader}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                Meters ({meters.length})
              </Text>
              <Pressable onPress={() => setShowAddMeter(true)}>
                <Text className="font-inter text-xs font-bold text-primary-600">
                  + Add Meter
                </Text>
              </Pressable>
            </View>

            {meters.length > 0 ? (
              meters.map((m: any, i: number) => (
                <MeterCard key={m.id} meter={m} assetId={id ?? ''} isDark={isDark} index={i} onLogReading={handleLogReading} fmt={fmt} />
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text className="font-inter text-sm text-neutral-400">No meters configured</Text>
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'History' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="mb-4 font-inter text-sm font-bold text-primary-950 dark:text-white">
              Maintenance History
            </Text>
            {historyEvents.length > 0 ? (
              historyEvents.map((evt: any, i: number) => (
                <HistoryItem key={evt.id ?? i} event={evt} index={i} isDark={isDark} fmt={fmt} currentUser={currentUser} />
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text className="font-inter text-sm text-neutral-400">No history records</Text>
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'Documents' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Svg width={48} height={48} viewBox="0 0 24 24">
                <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text className="mt-4 font-inter text-sm font-semibold text-neutral-400">
                Document management coming soon
              </Text>
            </View>
          </Animated.View>
        )}

        {activeTab === 'Cost' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ gap: 12 }}>
              {/* Purchase Cost */}
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <Text className="mb-1 font-inter text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Purchase Cost
                </Text>
                <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">
                  {asset.purchaseCost != null ? Number(asset.purchaseCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
              </View>

              {/* Book Value */}
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <Text className="mb-1 font-inter text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Current Book Value
                </Text>
                <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">
                  {asset.currentBookValue != null ? Number(asset.currentBookValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
              </View>

              {/* Replacement Value */}
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <Text className="mb-1 font-inter text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Replacement Value
                </Text>
                <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white">
                  {asset.replacementValue != null ? Number(asset.replacementValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
              </View>

              {/* Accumulated Maintenance Cost */}
              <View style={[
                styles.infoCard, 
                { 
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)', 
                  borderColor: isDark ? colors.primary[800] : colors.primary[200],
                }
              ]}>
                <Text className="mb-1 font-inter text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Accumulated Maint. Cost
                </Text>
                <Text className="font-inter text-xl font-bold text-primary-600 dark:text-primary-400">
                  {asset.accumulatedMaintCost != null ? Number(asset.accumulatedMaintCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* ============ ADD METER MODAL ============ */}
      <RNModal visible={showAddMeter} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddMeter(false)}>
        <View style={[formStyles.container, { paddingTop: insets.top + 24, backgroundColor: isDark ? '#0F0D1A' : colors.white }]}>
          <View style={[formStyles.header, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
            <Pressable onPress={() => setShowAddMeter(false)}>
              <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Cancel
              </Text>
            </Pressable>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
              Add Meter
            </Text>
            <View style={{ width: 52 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={formStyles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Meter Label */}
            <View style={formStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Meter Label <Text className="text-danger-500">*</Text>
              </Text>
              <TextInput
                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                placeholder="e.g. Runtime Hours"
                placeholderTextColor={colors.neutral[400]}
                value={meterName}
                onChangeText={setMeterName}
              />
            </View>

            {/* Unit */}
            <View style={formStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Unit <Text className="text-danger-500">*</Text>
              </Text>
              <TextInput
                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                placeholder="e.g. hrs, km, cycles"
                placeholderTextColor={colors.neutral[400]}
                value={meterUnit}
                onChangeText={setMeterUnit}
              />
            </View>

            {/* Meter Type Selector */}
            <View style={formStyles.field}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Meter Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {METER_TYPES.map((t) => {
                  const selected = meterType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setMeterType(t.value)}
                      style={[
                        formStyles.chip,
                        {
                          backgroundColor: selected
                            ? isDark ? colors.primary[800] : colors.primary[50]
                            : isDark ? '#1E1B4B' : colors.neutral[50],
                          borderColor: selected
                            ? colors.primary[400]
                            : isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <Text
                        className={`font-inter text-xs font-semibold ${selected
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Behavior */}
            <View style={formStyles.field}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Behavior
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setIsCumulative(true)}
                  style={[
                    formStyles.chip,
                    {
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: isCumulative
                        ? isDark ? colors.primary[800] : colors.primary[50]
                        : isDark ? '#1E1B4B' : colors.neutral[50],
                      borderColor: isCumulative
                        ? colors.primary[400]
                        : isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                >
                  <Text className={`font-inter text-xs font-semibold ${isCumulative ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    Cumulative (Increases)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsCumulative(false)}
                  style={[
                    formStyles.chip,
                    {
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: !isCumulative
                        ? isDark ? colors.primary[800] : colors.primary[50]
                        : isDark ? '#1E1B4B' : colors.neutral[50],
                      borderColor: !isCumulative
                        ? colors.primary[400]
                        : isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                >
                  <Text className={`font-inter text-xs font-semibold ${!isCumulative ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    Gauge (Fluctuates)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Initial Value */}
            <View style={formStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Initial Value
              </Text>
              <TextInput
                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                placeholder="0"
                placeholderTextColor={colors.neutral[400]}
                value={currentValue}
                onChangeText={setCurrentValue}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
            <Pressable
              style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, addMeter.isPending && { opacity: 0.6 }]}
              onPress={handleAddMeter}
              disabled={addMeter.isPending}
            >
              {addMeter.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Add Meter</Text>}
            </Pressable>
          </View>
        </View>
      </RNModal>

      {/* ============ LOG METER READING MODAL ============ */}
      <RNModal visible={showLogReading} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogReading(false)}>
        <View style={[formStyles.container, { paddingTop: insets.top + 24, backgroundColor: isDark ? '#0F0D1A' : colors.white }]}>
          <View style={[formStyles.header, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
            <Pressable onPress={() => setShowLogReading(false)}>
              <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Cancel
              </Text>
            </Pressable>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
              Log Meter Reading
            </Text>
            <View style={{ width: 52 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={formStyles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {selectedLogMeter && (
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100], marginBottom: 8 }]}>
                <InfoRow label="Meter" value={selectedLogMeter.name || selectedLogMeter.label} />
                <InfoRow label="Current Value" value={`${selectedLogMeter.currentValue ?? 0} ${selectedLogMeter.unit || selectedLogMeter.unitOfMeasure || ''}`} />
              </View>
            )}

            {/* Reading Value */}
            <View style={formStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Value <Text className="text-danger-500">*</Text>
              </Text>
              <TextInput
                style={[formStyles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: readingWarning ? colors.warning[400] : (isDark ? colors.neutral[700] : colors.neutral[200]), fontSize: 18, fontWeight: 'bold' }]}
                placeholder="Enter reading value"
                placeholderTextColor={colors.neutral[400]}
                value={readingValue}
                onChangeText={setReadingValue}
                keyboardType="numeric"
                autoFocus
              />
              {readingWarning && (
                <View style={[styles.warningBox, { backgroundColor: isDark ? '#3B2314' : colors.warning[50], borderColor: colors.warning[200] }]}>
                  <Text className="font-inter text-xs text-warning-700 flex-1 leading-4">
                    Value is less than current reading ({selectedLogMeter?.currentValue ?? 0}). Check "Meter Reset" below if you reset or replaced the meter.
                  </Text>
                </View>
              )}
            </View>

            {/* Meter Reset Checkbox row */}
            {selectedLogMeter && selectedLogMeter.isCumulative !== false && (
              <View style={[formStyles.resetRow, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text className="font-inter text-sm font-bold text-warning-700 dark:text-warning-400">
                    Meter reset / replacement
                  </Text>
                  <Text className="font-inter text-[11px] text-warning-600 dark:text-warning-500" style={{ marginTop: 2 }}>
                    Check this if the meter was reset or replaced. Allows the reading value to be lower than the current value.
                  </Text>
                </View>
                <Switch
                  value={isResetReading}
                  onValueChange={setIsResetReading}
                  trackColor={{ false: colors.neutral[300], true: colors.warning[400] }}
                  thumbColor={isResetReading ? colors.warning[600] : colors.neutral[100]}
                />
              </View>
            )}
          </ScrollView>

          <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16, borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
            <Pressable
              style={({ pressed }) => [formStyles.submitBtn, pressed && { opacity: 0.85 }, logReading.isPending && { opacity: 0.6 }]}
              onPress={handleLogReadingSubmit}
              disabled={logReading.isPending}
            >
              {logReading.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-base font-bold text-white">Log Reading</Text>}
            </Pressable>
          </View>
        </View>
      </RNModal>

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerGradient: {
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
    deleteBtn: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    infoCard: {
      borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12,
      shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    linkCard: {
      borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12, gap: 4,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    costRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
    },
    warningBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
      borderRadius: 10, padding: 12, borderWidth: 1,
    },
  });

const infoStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12,
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
});

const tabStyles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
});

const meterStyles = StyleSheet.create({
  card: {
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  historySection: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[200], paddingTop: 8 },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  colDate: {
    flex: 3.2,
    paddingRight: 4,
  },
  colValue: {
    flex: 2.2,
    paddingRight: 4,
  },
  colDelta: {
    flex: 2.4,
    paddingRight: 4,
  },
  colSource: {
    flex: 2.2,
  },
  resetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
});

const historyStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4 },
  timeline: { width: 24, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4 },
  content: { flex: 1, paddingLeft: 12, paddingBottom: 16, gap: 2 },
});

const formStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  formContent: { padding: 24, gap: 20 },
  field: { gap: 6 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  submitContainer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  submitBtn: {
    backgroundColor: colors.primary[600], borderRadius: 12, height: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  resetRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8,
  },
});
