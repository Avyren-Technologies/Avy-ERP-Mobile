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
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { showSuccess, showErrorMessage } from '@/components/ui/utils';
import {
  useUpdateAsset,
  useDeleteAsset,
  useAddMeter,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
  useAsset,
  useAssetMeters,
  useAssetHistory,
  useMeterReadings,
} from '@/features/maintenance/api/use-maintenance-queries';
import { AssetStatusBadge } from '@/features/maintenance/shared/asset-status-badge';
import { CriticalityBadge } from '@/features/maintenance/shared/criticality-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

import type { CompanyFormatter } from '@/lib/format/company-formatter';

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

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ width: 120 }}>
        {label}
      </Text>
      <Text className="flex-1 font-inter text-sm font-medium text-primary-950 dark:text-white">
        {value}
      </Text>
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
  const { data: historyRes } = useMeterReadings(assetId, meter.id);
  const readings: any[] = (historyRes as any)?.data ?? [];

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
      <View style={[meterStyles.card, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderColor: isDark ? colors.primary[900] : colors.neutral[200] }]}>
        <View style={meterStyles.header}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
              {meter.name}
            </Text>
            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
              {meter.meterType ?? 'CUMULATIVE'} - {meter.unitOfMeasure ?? 'hrs'}
            </Text>
          </View>
          <View style={[meterStyles.valueBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
            <Text className="font-inter text-sm font-bold text-primary-700">
              {meter.currentValue ?? 0}
            </Text>
            <Text className="font-inter text-[10px] text-primary-500">
              {meter.unitOfMeasure ?? 'hrs'}
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

        {showHistory && readings.length > 0 ? (
          <View style={meterStyles.historySection}>
            {readings.slice(0, 10).map((r: any, i: number) => (
              <View key={r.id ?? i} style={[meterStyles.historyRow, { borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                <Text className="font-inter text-xs text-neutral-500">
                  {r.readingDate ? fmt.date(r.readingDate) : '-'}
                </Text>
                <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                  {r.value} {meter.unitOfMeasure ?? ''}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400">
                  {r.source ?? 'MANUAL'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ HISTORY ITEM ============

function HistoryItem({ event, index, isDark, fmt }: { event: any; index: number; isDark: boolean; fmt: CompanyFormatter }) {
  const typeColors: Record<string, string> = {
    CREATED: colors.success[500],
    STATUS_CHANGE: colors.info[500],
    TRANSFER: colors.warning[500],
    WORK_REQUEST: colors.accent[500],
    WORK_ORDER: colors.primary[500],
    METER_READING: colors.info[400],
    MAINTENANCE: colors.warning[600],
  };
  const dotColor = typeColors[event.eventType] ?? colors.neutral[400];

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 40)}>
      <View style={historyStyles.row}>
        <View style={historyStyles.timeline}>
          <View style={[historyStyles.dot, { backgroundColor: dotColor }]} />
          {index < 20 ? <View style={[historyStyles.line, { backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200] }]} /> : null}
        </View>
        <View style={historyStyles.content}>
          <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
            {(event.eventType ?? 'EVENT').replace(/_/g, ' ')}
          </Text>
          <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
            {event.description ?? event.notes ?? '-'}
          </Text>
          <Text className="font-inter text-[10px] text-neutral-400">
            {event.createdAt ? fmt.date(event.createdAt) : '-'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

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

  // Queries
  const { data: assetRes, isLoading, refetch, isFetching } = useAsset(id ?? '');
  const asset: any = (assetRes as any)?.data ?? null;

  const { data: metersRes, refetch: refetchMeters } = useAssetMeters(id ?? '');
  const meters: any[] = (metersRes as any)?.data ?? [];

  const { data: historyRes } = useAssetHistory(id ?? '');
  const historyEvents: any[] = (historyRes as any)?.data ?? [];

  // Mutations
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const addMeter = useAddMeter();

  // Add meter state
  const [showAddMeter, setShowAddMeter] = React.useState(false);
  const [meterName, setMeterName] = React.useState('');
  const [meterUnit, setMeterUnit] = React.useState('');

  const handleRefresh = () => {
    refetch();
    refetchMeters();
  };

  const handleRetire = () => {
    confirmModal.show({
      title: 'Retire Asset',
      message: `Are you sure you want to retire "${asset?.name}"? This will mark it as inactive.`,
      confirmText: 'Retire',
      variant: 'danger',
      onConfirm: () => {
        updateAsset.mutate(
          { id: id ?? '', data: { operationalStatus: 'RETIRED' } },
          { onSuccess: () => { showSuccess('Asset Retired', 'Asset has been retired'); refetch(); } },
        );
      },
    });
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
    addMeter.mutate(
      { assetId: id ?? '', data: { name: meterName.trim(), unitOfMeasure: meterUnit.trim() || 'hrs', meterType: 'CUMULATIVE' } },
      { onSuccess: () => { setShowAddMeter(false); setMeterName(''); setMeterUnit(''); refetchMeters(); showSuccess('Meter Added'); } },
    );
  };

  const handleLogReading = (meter: any) => {
    router.push(`/maintenance/log-reading?assetId=${id}&meterId=${meter.id}`);
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
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={handleRefresh} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      >
        {activeTab === 'Overview' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Status badges */}
            <View style={styles.badgeRow}>
              <AssetStatusBadge operationalStatus={asset.operationalStatus} maintenanceStatus={asset.maintenanceStatus} />
              <CriticalityBadge criticality={asset.criticality ?? 'MEDIUM'} />
            </View>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
              <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Asset Details
              </Text>
              <InfoRow label="Asset Number" value={asset.assetNumber} />
              <InfoRow label="Asset Class" value={asset.assetClass?.replace(/_/g, ' ')} />
              <InfoRow label="Category" value={asset.category?.name} />
              <InfoRow label="Sub-Category" value={asset.subCategory?.name} />
              <InfoRow label="Type" value={asset.type?.name} />
              <InfoRow label="Make" value={asset.make} />
              <InfoRow label="Model" value={asset.model} />
              <InfoRow label="Serial Number" value={asset.serialNumber} />
              <InfoRow label="Location" value={asset.location?.name} />
              <InfoRow label="Description" value={asset.description} />
            </View>

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
              <Pressable onPress={() => setShowAddMeter(!showAddMeter)}>
                <Text className="font-inter text-xs font-bold text-primary-600">
                  {showAddMeter ? 'Cancel' : '+ Add Meter'}
                </Text>
              </Pressable>
            </View>

            {showAddMeter ? (
              <View style={[styles.addMeterCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                  placeholder="Meter name (e.g. Runtime Hours)"
                  placeholderTextColor={colors.neutral[400]}
                  value={meterName}
                  onChangeText={setMeterName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                  placeholder="Unit (e.g. hrs, km, cycles)"
                  placeholderTextColor={colors.neutral[400]}
                  value={meterUnit}
                  onChangeText={setMeterUnit}
                />
                <Pressable onPress={handleAddMeter} style={styles.addBtn} disabled={addMeter.isPending}>
                  {addMeter.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-inter text-sm font-bold text-white">Add Meter</Text>}
                </Pressable>
              </View>
            ) : null}

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
                <HistoryItem key={evt.id ?? i} event={evt} index={i} isDark={isDark} fmt={fmt} />
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
            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
              <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Accumulated Costs
              </Text>
              <View style={styles.costRow}>
                <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">Labour</Text>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">--</Text>
              </View>
              <View style={styles.costRow}>
                <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">Parts</Text>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">--</Text>
              </View>
              <View style={styles.costRow}>
                <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">External</Text>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">--</Text>
              </View>
              <View style={[styles.costRow, { borderTopWidth: 1, borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingTop: 12, marginTop: 4 }]}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">Total</Text>
                <Text className="font-inter text-base font-bold text-primary-600">--</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

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
    addMeterCard: {
      borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16, gap: 12,
    },
    input: {
      borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    },
    addBtn: {
      backgroundColor: colors.primary[600], borderRadius: 10, height: 44,
      justifyContent: 'center', alignItems: 'center',
    },
    costRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
    },
  });

const tabStyles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
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
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1,
  },
});

const historyStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4 },
  timeline: { width: 24, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 4 },
  content: { flex: 1, paddingLeft: 12, paddingBottom: 16, gap: 2 },
});
