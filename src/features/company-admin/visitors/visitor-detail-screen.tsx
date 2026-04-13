/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  Modal,
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
  useApproveVisit,
  useCancelVisit,
  useCheckInVisit,
  useCheckOutVisit,
  useExtendVisit,
  useRejectVisit,
} from '@/features/company-admin/api/use-visitor-mutations';
import { useVisit } from '@/features/company-admin/api/use-visitor-queries';
import { VisitStatusBadge } from '@/features/company-admin/visitors/components/visit-status-badge';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  notes: string;
}

// ============ INFO ROW ============

function InfoRow({ label, value }: { readonly label: string; readonly value: string }) {
  if (!value) return null;
  return (
    <View style={detailStyles.infoRow}>
      <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider" style={{ width: 110 }}>
        {label}
      </Text>
      <Text className="font-inter text-sm font-medium text-primary-950 dark:text-white" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

// ============ TIMELINE ITEM ============

function TimelineItem({
  event,
  index,
  isLast,
  fmt,
}: {
  readonly event: TimelineEvent;
  readonly index: number;
  readonly isLast: boolean;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(index * 60)}>
      <View style={detailStyles.timelineRow}>
        <View style={detailStyles.timelineDotCol}>
          <View style={detailStyles.timelineDot} />
          {!isLast && <View style={detailStyles.timelineLine} />}
        </View>
        <View style={{ flex: 1, paddingBottom: 16 }}>
          <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{event.action}</Text>
          <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
            {fmt.dateTime(event.timestamp)} {event.user ? `by ${event.user}` : ''}
          </Text>
          {event.notes ? (
            <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{event.notes}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ EXTEND MODAL ============

function ExtendModal({
  visible,
  onClose,
  onSubmit,
  isPending,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: { extendedUntil: string; reason: string }) => void;
  readonly isPending: boolean;
}) {
  const isDark = useIsDark();
  const [extendedUntil, setExtendedUntil] = React.useState('');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (visible) { setExtendedUntil(''); setReason(''); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[detailStyles.formSheet, { paddingBottom: 40 }]}>
          <View style={detailStyles.sheetHandle} />
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">Extend Visit</Text>

          <View style={detailStyles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
              Extend Until <Text className="text-danger-500">*</Text>
            </Text>
            <View style={detailStyles.inputWrap}>
              <TextInput
                style={[detailStyles.textInput, isDark && { color: colors.white }]}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={colors.neutral[400]}
                value={extendedUntil}
                onChangeText={setExtendedUntil}
              />
            </View>
          </View>

          <View style={detailStyles.fieldWrap}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Reason</Text>
            <View style={[detailStyles.inputWrap, { height: 80 }]}>
              <TextInput
                style={[detailStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]}
                placeholder="Reason for extension"
                placeholderTextColor={colors.neutral[400]}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>
          </View>

          <Pressable
            onPress={() => onSubmit({ extendedUntil, reason })}
            disabled={isPending || !extendedUntil.trim()}
            style={[detailStyles.saveBtn, (isPending || !extendedUntil.trim()) && { opacity: 0.5 }]}
          >
            <Text className="font-inter text-sm font-bold text-white">{isPending ? 'Extending...' : 'EXTEND'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ============ MAIN COMPONENT ============

export function VisitorDetailScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: response, isLoading, error, refetch, isFetching } = useVisit(id ?? '');

  const checkInMutation = useCheckInVisit();
  const checkOutMutation = useCheckOutVisit();
  const approveMutation = useApproveVisit();
  const rejectMutation = useRejectVisit();
  const cancelMutation = useCancelVisit();
  const extendMutation = useExtendVisit();

  const [showExtendModal, setShowExtendModal] = React.useState(false);

  const visit = React.useMemo(() => {
    const raw = (response as any)?.data ?? response;
    if (!raw) return null;
    return {
      id: raw.id ?? '',
      visitorName: raw.visitorName ?? raw.visitor?.name ?? '',
      visitorCompany: raw.visitorCompany ?? raw.visitor?.company ?? '',
      visitorPhone: raw.visitorPhone ?? raw.visitor?.phone ?? '',
      visitorEmail: raw.visitorEmail ?? raw.visitor?.email ?? '',
      visitorType: raw.visitorType?.name ?? raw.typeName ?? '',
      hostName: raw.hostName ?? raw.host?.name ?? '',
      purpose: raw.purpose ?? '',
      status: raw.status ?? '',
      visitCode: raw.visitCode ?? raw.code ?? '',
      checkInTime: raw.checkInTime ?? null,
      checkOutTime: raw.checkOutTime ?? null,
      expectedArrival: raw.expectedArrival ?? null,
      gate: raw.gate?.name ?? raw.gateName ?? '',
      vehiclePlate: raw.vehiclePlate ?? '',
      notes: raw.notes ?? '',
      timeline: Array.isArray(raw.timeline) ? raw.timeline.map((e: any) => ({
        id: e.id ?? `${e.action}-${e.timestamp}`,
        action: e.action ?? e.event ?? '',
        timestamp: e.timestamp ?? e.createdAt ?? '',
        user: e.user?.name ?? e.userName ?? '',
        notes: e.notes ?? '',
      })) : [],
    };
  }, [response]);

  const handleCheckIn = () => {
    if (!visit) return;
    checkInMutation.mutate({ id: visit.id }, { onSuccess: () => showSuccess('Visitor checked in') });
  };

  const handleCheckOut = () => {
    if (!visit) return;
    showConfirm({
      title: 'Check Out Visitor',
      message: `Check out ${visit.visitorName}?`,
      confirmText: 'Check Out',
      variant: 'warning',
      onConfirm: () => {
        checkOutMutation.mutate({ id: visit.id }, { onSuccess: () => showSuccess('Visitor checked out') });
      },
    });
  };

  const handleApprove = () => {
    if (!visit) return;
    approveMutation.mutate({ id: visit.id }, { onSuccess: () => showSuccess('Visit approved') });
  };

  const handleReject = () => {
    if (!visit) return;
    showConfirm({
      title: 'Reject Visit',
      message: `Reject visit from ${visit.visitorName}?`,
      confirmText: 'Reject',
      variant: 'danger',
      onConfirm: () => {
        rejectMutation.mutate({ id: visit.id }, { onSuccess: () => showSuccess('Visit rejected') });
      },
    });
  };

  const handleCancel = () => {
    if (!visit) return;
    showConfirm({
      title: 'Cancel Visit',
      message: `Cancel visit from ${visit.visitorName}? This cannot be undone.`,
      confirmText: 'Cancel Visit',
      variant: 'danger',
      onConfirm: () => {
        cancelMutation.mutate(visit.id, { onSuccess: () => { showSuccess('Visit cancelled'); router.back(); } });
      },
    });
  };

  const handleExtendSubmit = (data: { extendedUntil: string; reason: string }) => {
    if (!visit) return;
    extendMutation.mutate(
      { id: visit.id, data: { extendedUntil: data.extendedUntil, reason: data.reason } },
      { onSuccess: () => { showSuccess('Visit extended'); setShowExtendModal(false); } },
    );
  };

  const canCheckIn = visit?.status === 'PRE_REGISTERED' || visit?.status === 'APPROVED';
  const canCheckOut = visit?.status === 'CHECKED_IN';
  const canApprove = visit?.status === 'PRE_REGISTERED';
  const canExtend = visit?.status === 'CHECKED_IN';
  const canCancel = visit?.status === 'PRE_REGISTERED' || visit?.status === 'APPROVED';

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader
        title="Visit Details"
        onMenuPress={toggle}
        rightSlot={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.white} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={{ padding: 24 }}><SkeletonCard /><SkeletonCard /></View>
      ) : error || !visit ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <EmptyState icon="error" title="Visit not found" message="Could not load visit details." action={{ label: 'Go Back', onPress: () => router.back() }} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
          }
        >
          {/* Header Card */}
          <Animated.View entering={FadeInDown.duration(400)} style={s.sectionWrap}>
            <View style={s.detailCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{visit.visitorName}</Text>
                  {visit.visitorCompany ? (
                    <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400">{visit.visitorCompany}</Text>
                  ) : null}
                </View>
                <VisitStatusBadge status={visit.status} />
              </View>

              {visit.visitCode ? (
                <View style={[detailStyles.codeBadge, { marginTop: 12, alignSelf: 'flex-start' }]}>
                  <Text className="font-inter text-sm font-bold text-primary-600">{visit.visitCode}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* Visitor Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={s.sectionWrap}>
            <View style={s.detailCard}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">Visitor Information</Text>
              <InfoRow label="Phone" value={visit.visitorPhone} />
              <InfoRow label="Email" value={visit.visitorEmail} />
              <InfoRow label="Type" value={visit.visitorType} />
              <InfoRow label="Vehicle" value={visit.vehiclePlate} />
            </View>
          </Animated.View>

          {/* Visit Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.sectionWrap}>
            <View style={s.detailCard}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">Visit Details</Text>
              <InfoRow label="Purpose" value={visit.purpose} />
              <InfoRow label="Host" value={visit.hostName} />
              <InfoRow label="Gate" value={visit.gate} />
              <InfoRow label="Expected" value={visit.expectedArrival ? fmt.dateTime(visit.expectedArrival) : ''} />
              <InfoRow label="Check In" value={visit.checkInTime ? fmt.dateTime(visit.checkInTime) : ''} />
              <InfoRow label="Check Out" value={visit.checkOutTime ? fmt.dateTime(visit.checkOutTime) : ''} />
              {visit.notes ? <InfoRow label="Notes" value={visit.notes} /> : null}
            </View>
          </Animated.View>

          {/* Actions */}
          {(canCheckIn || canCheckOut || canApprove || canExtend || canCancel) && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)} style={s.sectionWrap}>
              <View style={s.detailCard}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">Actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {canCheckIn && (
                    <Pressable onPress={handleCheckIn} disabled={checkInMutation.isPending} style={[detailStyles.actionBtn, { backgroundColor: colors.success[600] }]}>
                      <Text className="font-inter text-xs font-bold text-white">{checkInMutation.isPending ? 'Checking In...' : 'Check In'}</Text>
                    </Pressable>
                  )}
                  {canCheckOut && (
                    <Pressable onPress={handleCheckOut} disabled={checkOutMutation.isPending} style={[detailStyles.actionBtn, { backgroundColor: colors.warning[600] }]}>
                      <Text className="font-inter text-xs font-bold text-white">{checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}</Text>
                    </Pressable>
                  )}
                  {canApprove && (
                    <>
                      <Pressable onPress={handleApprove} disabled={approveMutation.isPending} style={[detailStyles.actionBtn, { backgroundColor: colors.primary[600] }]}>
                        <Text className="font-inter text-xs font-bold text-white">{approveMutation.isPending ? 'Approving...' : 'Approve'}</Text>
                      </Pressable>
                      <Pressable onPress={handleReject} disabled={rejectMutation.isPending} style={[detailStyles.actionBtn, { backgroundColor: colors.danger[600] }]}>
                        <Text className="font-inter text-xs font-bold text-white">{rejectMutation.isPending ? 'Rejecting...' : 'Reject'}</Text>
                      </Pressable>
                    </>
                  )}
                  {canExtend && (
                    <Pressable onPress={() => setShowExtendModal(true)} style={[detailStyles.actionBtn, { backgroundColor: colors.info[600] }]}>
                      <Text className="font-inter text-xs font-bold text-white">Extend</Text>
                    </Pressable>
                  )}
                  {canCancel && (
                    <Pressable onPress={handleCancel} disabled={cancelMutation.isPending} style={[detailStyles.actionBtn, { backgroundColor: colors.danger[100], borderWidth: 1, borderColor: colors.danger[300] }]}>
                      <Text className="font-inter text-xs font-bold text-danger-700">{cancelMutation.isPending ? 'Cancelling...' : 'Cancel Visit'}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Timeline */}
          {visit.timeline.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(400)} style={s.sectionWrap}>
              <View style={s.detailCard}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-3">Timeline</Text>
                {visit.timeline.map((event: TimelineEvent, idx: number) => (
                  <TimelineItem key={event.id} event={event} index={idx} isLast={idx === visit.timeline.length - 1} fmt={fmt} />
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}

      <ExtendModal
        visible={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onSubmit={handleExtendSubmit}
        isPending={extendMutation.isPending}
      />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 16 },
  detailCard: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
});

const detailStyles = StyleSheet.create({
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  actionBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  timelineRow: { flexDirection: 'row' },
  timelineDotCol: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500], marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.primary[100], marginTop: 4 },
  formSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300], alignSelf: 'center', marginBottom: 16 },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});
