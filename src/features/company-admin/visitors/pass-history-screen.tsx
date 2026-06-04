/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import {
  useMaterialPasses,
  useMaterialPassEvents,
  useVehiclePasses,
  useVehiclePassEvents,
  useVisits,
} from '@/features/company-admin/api/use-visitor-queries';

type Tab = 'visits' | 'vehicles' | 'materials';

const VISIT_STATUS_TINTS: Record<string, { bg: string; text: string }> = {
  EXPECTED:         { bg: colors.info[50],    text: colors.info[700]    },
  ARRIVED:          { bg: colors.warning[50], text: colors.warning[700] },
  CHECKED_IN:       { bg: colors.success[50], text: colors.success[700] },
  CHECKED_OUT:      { bg: colors.neutral[100], text: colors.neutral[600] },
  AUTO_CHECKED_OUT: { bg: colors.neutral[100], text: colors.neutral[600] },
  NO_SHOW:          { bg: colors.neutral[100], text: colors.neutral[500] },
  CANCELLED:        { bg: colors.neutral[100], text: colors.neutral[500] },
  REJECTED:         { bg: colors.danger[50],  text: colors.danger[700]  },
};

const PASS_STATUS_TINTS: Record<string, { bg: string; text: string }> = {
  ISSUED:    { bg: colors.info[50],    text: colors.info[700]    },
  IN_USE:    { bg: colors.warning[50], text: colors.warning[700] },
  ACTIVE:    { bg: colors.success[50], text: colors.success[700] },
  COMPLETED: { bg: colors.neutral[100], text: colors.neutral[600] },
  CANCELLED: { bg: colors.neutral[100], text: colors.neutral[500] },
  REVOKED:   { bg: colors.danger[50],  text: colors.danger[700]  },
  EXPIRED:   { bg: colors.neutral[100], text: colors.neutral[500] },
};

const EVENT_LABELS: Record<string, string> = {
  CREATED:        'Pass created',
  ENTRY:          'Entry recorded',
  EXIT:           'Exit recorded',
  PARTIAL_RETURN: 'Partial return',
  FULL_RETURN:    'Full return',
  CANCELLED:      'Cancelled',
  EXPIRED:        'Auto-expired',
};

export function PassHistoryScreen() {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();

  const [tab, setTab] = React.useState<Tab>('visits');
  const [selectedPass, setSelectedPass] = React.useState<null | { kind: Tab; data: any }>(null);

  const visitsQuery = useVisits({ limit: 50 });
  const vehiclesQuery = useVehiclePasses({ limit: 50 });
  const materialsQuery = useMaterialPasses({ limit: 50 });

  const visits = (visitsQuery.data as any)?.data ?? [];
  const vehicles = (vehiclesQuery.data as any)?.data ?? [];
  const materials = (materialsQuery.data as any)?.data ?? [];

  const isLoading = (tab === 'visits' && visitsQuery.isLoading)
    || (tab === 'vehicles' && vehiclesQuery.isLoading)
    || (tab === 'materials' && materialsQuery.isLoading);
  const isFetching = visitsQuery.isFetching || vehiclesQuery.isFetching || materialsQuery.isFetching;

  const refreshAll = () => {
    visitsQuery.refetch();
    vehiclesQuery.refetch();
    materialsQuery.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Pass History" subtitle="All gate passes & events" onMenuPress={toggle} />

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
        {(['visits', 'vehicles', 'materials'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text className={`font-inter text-xs font-bold ${tab === t ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
              {t === 'visits' ? 'Visits' : t === 'vehicles' ? 'Vehicles' : 'Materials'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refreshAll} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      >
        {isLoading ? (
          <View style={{ marginTop: 16 }}><SkeletonCard /><SkeletonCard /></View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 12 }}>
            {tab === 'visits' && (
              visits.length === 0 ? (
                <EmptyState icon="inbox" title="No visits yet" message="Visitor history will appear here once visits are created." />
              ) : (
                visits.map((v: any) => (
                  <VisitCard key={v.id} item={v} onPress={() => setSelectedPass({ kind: 'visits', data: v })} fmt={fmt} />
                ))
              )
            )}
            {tab === 'vehicles' && (
              vehicles.length === 0 ? (
                <EmptyState icon="inbox" title="No vehicle passes" message="Vehicle gate-pass history will appear here." />
              ) : (
                vehicles.map((v: any) => (
                  <VehicleCard key={v.id} item={v} onPress={() => setSelectedPass({ kind: 'vehicles', data: v })} fmt={fmt} />
                ))
              )
            )}
            {tab === 'materials' && (
              materials.length === 0 ? (
                <EmptyState icon="inbox" title="No material passes" message="Material gate-pass history will appear here." />
              ) : (
                materials.map((m: any) => (
                  <MaterialCard key={m.id} item={m} onPress={() => setSelectedPass({ kind: 'materials', data: m })} fmt={fmt} />
                ))
              )
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedPass} animationType="slide" transparent onRequestClose={() => setSelectedPass(null)}>
        {selectedPass && (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: insets.bottom + 16 }}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} />
              </View>
              <View style={{ paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[100] }}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                  {selectedPass.kind === 'visits' ? 'Visit Details' : selectedPass.kind === 'vehicles' ? 'Vehicle Pass' : 'Material Pass'}
                </Text>
                <Text className="font-inter text-xs text-neutral-500 mt-0.5">
                  {selectedPass.kind === 'visits' ? selectedPass.data.visitNumber : selectedPass.data.passNumber}
                </Text>
              </View>
              <DetailContent selection={selectedPass} fmt={fmt} />
              <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                <Pressable onPress={() => setSelectedPass(null)} style={{ height: 48, borderRadius: 12, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' }}>
                  <Text className="font-inter text-sm font-bold text-neutral-700">Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function StatusPill({ status, palette }: { status: string; palette: Record<string, { bg: string; text: string }> }) {
  const tint = palette[status] ?? { bg: colors.neutral[100], text: colors.neutral[600] };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tint.bg }}>
      <Text className="font-inter text-[10px] font-bold" style={{ color: tint.text }}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

function VisitCard({ item, onPress, fmt }: { item: any; onPress: () => void; fmt: ReturnType<typeof useCompanyFormatter> }) {
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.visitorCompany ?? '—'}{item.visitNumber ? ` · ${item.visitNumber}` : ''}</Text>
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.checkInTime ? `In: ${fmt.dateTime(item.checkInTime)}` : item.expectedDate ? `Exp: ${fmt.date(item.expectedDate)}` : ''}
          {item.checkOutTime ? ` · Out: ${fmt.time(item.checkOutTime)}` : ''}
        </Text>
      </View>
      <StatusPill status={item.status ?? 'EXPECTED'} palette={VISIT_STATUS_TINTS} />
    </Pressable>
  );
}

function VehicleCard({ item, onPress, fmt }: { item: any; onPress: () => void; fmt: ReturnType<typeof useCompanyFormatter> }) {
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.vehicleRegNumber}</Text>
        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.vehicleType} · {item.driverName}</Text>
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.passNumber}{item.validUntil ? ` · valid till ${fmt.date(item.validUntil)}` : ''}
        </Text>
      </View>
      <StatusPill status={item.status ?? 'ACTIVE'} palette={PASS_STATUS_TINTS} />
    </Pressable>
  );
}

function MaterialCard({ item, onPress, fmt }: { item: any; onPress: () => void; fmt: ReturnType<typeof useCompanyFormatter> }) {
  const qty = item.quantityValue != null
    ? `${item.quantityValue}${item.unitOfMeasure?.abbreviation ? ` ${item.unitOfMeasure.abbreviation}` : ''}`
    : item.quantityIssued ?? '';
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.description}</Text>
        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.type}{item.vendorName ? ` · ${item.vendorName}` : ''}</Text>
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.passNumber}{qty ? ` · ${qty}` : ''}{item.createdAt ? ` · ${fmt.date(item.createdAt)}` : ''}
        </Text>
      </View>
      <StatusPill status={item.status ?? 'ISSUED'} palette={PASS_STATUS_TINTS} />
    </Pressable>
  );
}

function DetailContent({ selection, fmt }: { selection: { kind: Tab; data: any }; fmt: ReturnType<typeof useCompanyFormatter> }) {
  if (selection.kind === 'visits') return <VisitDetail visit={selection.data} fmt={fmt} />;
  if (selection.kind === 'vehicles') return <VehicleDetail pass={selection.data} fmt={fmt} />;
  return <MaterialDetail pass={selection.data} fmt={fmt} />;
}

function VisitDetail({ visit, fmt }: { visit: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
      <DetailRow label="Visitor" value={visit.visitorName} />
      <DetailRow label="Mobile" value={visit.visitorMobile} />
      {visit.visitorCompany ? <DetailRow label="Company" value={visit.visitorCompany} /> : null}
      <DetailRow label="Purpose" value={visit.purpose} />
      <DetailRow label="Expected" value={visit.expectedDate ? fmt.date(visit.expectedDate) : '—'} />
      <DetailRow label="Status" value={visit.status?.replace(/_/g, ' ')} />
      {visit.checkInTime ? <DetailRow label="Checked In" value={fmt.dateTime(visit.checkInTime)} /> : null}
      {visit.checkOutTime ? <DetailRow label="Checked Out" value={fmt.dateTime(visit.checkOutTime)} /> : null}
      {visit.badgeNumber ? <DetailRow label="Badge" value={visit.badgeNumber} /> : null}
      {visit.visitDurationMinutes ? <DetailRow label="Duration" value={`${Math.floor(visit.visitDurationMinutes / 60)}h ${visit.visitDurationMinutes % 60}m`} /> : null}
    </ScrollView>
  );
}

function VehicleDetail({ pass, fmt }: { pass: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  const eventsQuery = useVehiclePassEvents(pass.id);
  const events: any[] = (eventsQuery.data as any)?.data ?? [];
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
      <DetailRow label="Vehicle" value={pass.vehicleRegNumber} />
      <DetailRow label="Type" value={pass.vehicleType} />
      <DetailRow label="Driver" value={pass.driverName} />
      {pass.driverMobile ? <DetailRow label="Driver Mobile" value={pass.driverMobile} /> : null}
      <DetailRow label="Purpose" value={pass.purpose} />
      <DetailRow label="Status" value={pass.status} />
      {pass.validFrom ? <DetailRow label="Valid From" value={fmt.date(pass.validFrom)} /> : null}
      {pass.validUntil ? <DetailRow label="Valid Until" value={fmt.date(pass.validUntil)} /> : null}
      <EventTimeline title="Entry / Exit log" events={events} fmt={fmt} loading={eventsQuery.isLoading} />
    </ScrollView>
  );
}

function MaterialDetail({ pass, fmt }: { pass: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  const eventsQuery = useMaterialPassEvents(pass.id);
  const events: any[] = (eventsQuery.data as any)?.data ?? [];
  const qty = pass.quantityValue != null
    ? `${pass.quantityValue}${pass.unitOfMeasure?.abbreviation ? ` ${pass.unitOfMeasure.abbreviation}` : ''}`
    : pass.quantityIssued ?? '';
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
      <DetailRow label="Description" value={pass.description} />
      <DetailRow label="Type" value={pass.type} />
      {qty ? <DetailRow label="Quantity" value={qty} /> : null}
      {pass.vendorName ? <DetailRow label="Vendor" value={pass.vendorName} /> : null}
      <DetailRow label="Purpose" value={pass.purpose} />
      <DetailRow label="Status" value={pass.status} />
      <DetailRow label="Return Status" value={(pass.returnStatus ?? 'NOT_APPLICABLE').replace(/_/g, ' ')} />
      {pass.expectedReturnDate ? <DetailRow label="Expected Return" value={fmt.date(pass.expectedReturnDate)} /> : null}
      {pass.returnedAt ? <DetailRow label="Returned At" value={fmt.dateTime(pass.returnedAt)} /> : null}
      <EventTimeline title="Activity log" events={events} fmt={fmt} loading={eventsQuery.isLoading} />
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <Text className="font-inter text-xs font-bold text-neutral-500 uppercase tracking-widest" style={{ flex: 1 }}>{label}</Text>
      <Text className="font-inter text-sm text-primary-950 dark:text-white" style={{ flex: 2, textAlign: 'right' }}>{value ?? '—'}</Text>
    </View>
  );
}

function EventTimeline({ title, events, fmt, loading }: { title: string; events: any[]; fmt: ReturnType<typeof useCompanyFormatter>; loading: boolean }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-3">{title}</Text>
      {loading ? (
        <SkeletonCard />
      ) : events.length === 0 ? (
        <Text className="font-inter text-xs text-neutral-400 text-center py-4">No events recorded yet.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {events.map((e: any, idx: number) => (
            <View key={e.id ?? idx} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 18 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500], marginTop: 4 }} />
                {idx < events.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: colors.neutral[200], marginTop: 4 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 8 }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{EVENT_LABELS[e.type] ?? e.type}</Text>
                <Text className="font-inter text-[11px] text-neutral-500">
                  {e.recordedAt ? fmt.dateTime(e.recordedAt) : ''}
                  {e.quantityValue != null ? ` · qty ${e.quantityValue}` : ''}
                </Text>
                {e.notes ? <Text className="font-inter text-xs text-neutral-600 mt-1" numberOfLines={2}>{e.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M9 18l6-6-6-6" stroke={colors.neutral[300]} strokeWidth="2" fill="none" />
                </Svg>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary[600] },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[100] },
});
