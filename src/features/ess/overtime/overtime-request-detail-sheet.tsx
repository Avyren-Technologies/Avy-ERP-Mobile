/* eslint-disable better-tailwindcss/no-unknown-classes */
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useMyOvertimeDetail } from '@/features/ess/overtime/use-overtime-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import type { OvertimeRequestStatus, OTMultiplierSource, OvertimeRequestSource } from '@/lib/api/ess';

// ── Status / Source colors ──

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] },
  APPROVED: { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] },
  REJECTED: { bg: colors.danger[50], text: colors.danger[700], dot: colors.danger[500] },
  PAID: { bg: colors.info[50], text: colors.info[700], dot: colors.info[500] },
  COMP_OFF_ACCRUED: { bg: colors.accent[50], text: colors.accent[700], dot: colors.accent[500] },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  AUTO: { bg: colors.neutral[100], text: colors.neutral[600] },
  MANUAL: { bg: colors.accent[50], text: colors.accent[700] },
};

const MULTIPLIER_LABELS: Record<string, string> = {
  WEEKDAY: 'Weekday',
  WEEKEND: 'Weekend',
  HOLIDAY: 'Holiday',
  NIGHT_SHIFT: 'Night Shift',
};

// ── Detail Row ──

function DetailRow({ label, value, isDark }: { label: string; value: React.ReactNode; isDark: boolean }) {
  return (
    <View style={detailRowStyles.row}>
      <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" style={{ width: 110 }}>
        {label}
      </Text>
      <View style={{ flex: 1 }}>
        {typeof value === 'string' ? (
          <Text className="font-inter text-sm font-medium text-primary-950 dark:text-white">
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
});

// ── Badge ──

function Badge({ label, bg, textColor }: { label: string; bg: string; textColor: string }) {
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: textColor, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
});

// ── Sheet Handle ──

export interface OvertimeDetailSheetHandle {
  open: (id: string) => void;
  close: () => void;
}

// ── Main Component ──

export const OvertimeRequestDetailSheet = forwardRef<OvertimeDetailSheetHandle>(
  function OvertimeRequestDetailSheet(_props, ref) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const fmt = useCompanyFormatter();
    const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
    const snapPoints = useMemo(() => ['60%', '90%'], []);
    const [selectedId, setSelectedId] = React.useState('');

    const { data, isLoading } = useMyOvertimeDetail(selectedId);
    const detail = (data as any)?.data;

    useImperativeHandle(ref, () => ({
      open: (id: string) => {
        setSelectedId(id);
        sheetRef.current?.present();
      },
      close: () => {
        sheetRef.current?.dismiss();
        setSelectedId('');
      },
    }));

    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />,
      [],
    );

    const handleDismiss = useCallback(() => {
      setSelectedId('');
    }, []);

    const statusColor = STATUS_COLORS[detail?.status] ?? STATUS_COLORS.PENDING;
    const sourceColor = SOURCE_COLORS[detail?.source] ?? SOURCE_COLORS.AUTO;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handleIndicator}
        onDismiss={handleDismiss}
      >
        <BottomSheetScrollView contentContainerStyle={s.content}>
          {isLoading || !detail ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors.primary[500]} size="large" />
            </View>
          ) : (
            <>
              {/* Title */}
              <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-3">
                Overtime Request Detail
              </Text>

              {/* Status + Source badges */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={[badgeStyles.badge, { backgroundColor: statusColor.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor.dot }} />
                  <Text style={{ color: statusColor.text, fontFamily: 'Inter', fontSize: 10, fontWeight: '700' }}>
                    {detail.status}
                  </Text>
                </View>
                <Badge label={detail.source} bg={sourceColor.bg} textColor={sourceColor.text} />
              </View>

              {/* Basic details */}
              <View style={s.section}>
                <DetailRow label="Date" value={fmt.date(detail.date)} isDark={isDark} />
                <DetailRow label="Hours" value={`${detail.requestedHours}h`} isDark={isDark} />
                <DetailRow
                  label="Multiplier"
                  value={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text className="font-inter text-sm font-medium text-primary-950 dark:text-white">
                        {detail.appliedMultiplier}x
                      </Text>
                      <Badge
                        label={MULTIPLIER_LABELS[detail.multiplierSource] ?? detail.multiplierSource}
                        bg={colors.primary[50]}
                        textColor={colors.primary[700]}
                      />
                    </View>
                  }
                  isDark={isDark}
                />
                <DetailRow
                  label="Amount"
                  value={
                    detail.calculatedAmount != null
                      ? `₹${detail.calculatedAmount.toLocaleString('en-IN')}`
                      : 'Pending'
                  }
                  isDark={isDark}
                />
                {detail.compOffGranted && (
                  <DetailRow label="Comp-Off" value="Granted" isDark={isDark} />
                )}
              </View>

              {/* Attendance Record */}
              {detail.attendanceRecord && (
                <View style={s.section}>
                  <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-2 mt-2">
                    Attendance Record
                  </Text>
                  {detail.attendanceRecord.punchIn && (
                    <DetailRow label="Punch In" value={fmt.time(detail.attendanceRecord.punchIn)} isDark={isDark} />
                  )}
                  {detail.attendanceRecord.punchOut && (
                    <DetailRow label="Punch Out" value={fmt.time(detail.attendanceRecord.punchOut)} isDark={isDark} />
                  )}
                  {detail.attendanceRecord.workedHours != null && (
                    <DetailRow label="Worked Hours" value={`${detail.attendanceRecord.workedHours}h`} isDark={isDark} />
                  )}
                  {detail.attendanceRecord.shiftName && (
                    <DetailRow label="Shift" value={detail.attendanceRecord.shiftName} isDark={isDark} />
                  )}
                </View>
              )}

              {/* Approval section */}
              {(detail.approvedByName || detail.approvalNotes) && (
                <View style={s.section}>
                  <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-2 mt-2">
                    Approval
                  </Text>
                  {detail.approvedByName && (
                    <DetailRow label="Approved By" value={detail.approvedByName} isDark={isDark} />
                  )}
                  {detail.approvedAt && (
                    <DetailRow label="Approved At" value={fmt.dateTime(detail.approvedAt)} isDark={isDark} />
                  )}
                  {detail.approvalNotes && (
                    <DetailRow label="Notes" value={detail.approvalNotes} isDark={isDark} />
                  )}
                </View>
              )}

              {/* Reason (MANUAL) */}
              {detail.reason && (
                <View style={s.section}>
                  <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-2 mt-2">
                    Reason
                  </Text>
                  <Text className="font-inter text-sm text-neutral-700 dark:text-neutral-300 leading-5">
                    {detail.reason}
                  </Text>
                </View>
              )}

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <View style={s.section}>
                  <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100 mb-2 mt-2">
                    Attachments ({detail.attachments.length})
                  </Text>
                  {detail.attachments.map((url: string, idx: number) => (
                    <Pressable
                      key={idx}
                      onPress={() => Linking.openURL(url)}
                      style={s.attachmentRow}
                    >
                      <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path
                          d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                          stroke={colors.primary[500]}
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Text className="font-inter text-xs text-primary-600 dark:text-primary-400 flex-1" numberOfLines={1}>
                        {url}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={{ height: 24 }} />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

// ── Styles ──

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: isDark ? '#1A1730' : colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    handleIndicator: {
      backgroundColor: colors.neutral[300],
      width: 40,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 40,
    },
    loadingWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    section: {
      marginBottom: 8,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      marginBottom: 6,
    },
  });
