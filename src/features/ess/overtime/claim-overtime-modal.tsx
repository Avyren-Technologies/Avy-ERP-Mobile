/* eslint-disable better-tailwindcss/no-unknown-classes */
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import * as React from 'react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DateTime } from 'luxon';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { DatePickerField } from '@/components/ui/date-picker';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Types ──

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
}

export interface ClaimOvertimeSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface ClaimOvertimeSheetProps {
  onSubmit: (data: { date: string; hours: number; reason: string; attachments?: string[] }) => void;
  isSubmitting: boolean;
}

// ── Component ──

export const ClaimOvertimeSheet = forwardRef<ClaimOvertimeSheetHandle, ClaimOvertimeSheetProps>(
  function ClaimOvertimeSheet({ onSubmit, isSubmitting }, ref) {
    const isDark = useIsDark();
    const s = createStyles(isDark);
    const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
    const snapPoints = useMemo(() => ['75%', '92%'], []);

    const [date, setDate] = React.useState('');
    const [hours, setHours] = React.useState(1);
    const [reason, setReason] = React.useState('');
    const [attachments, setAttachments] = React.useState<Attachment[]>([]);

    const resetForm = useCallback(() => {
      setDate('');
      setHours(1);
      setReason('');
      setAttachments([]);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }));

    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />,
      [],
    );

    const handleDismiss = useCallback(() => {
      resetForm();
    }, [resetForm]);

    // Date constraints: last 30 days up to yesterday
    const today = DateTime.now();
    const minDate = today.minus({ days: 30 });
    const yesterday = today.minus({ days: 1 });

    const minDateStr = minDate.toFormat('yyyy-MM-dd');
    const maxDateStr = yesterday.toFormat('yyyy-MM-dd');

    const isDateValid = (() => {
      if (!date.trim()) return false;
      const parsed = DateTime.fromFormat(date.trim(), 'yyyy-MM-dd');
      if (!parsed.isValid) return false;
      return parsed >= minDate.startOf('day') && parsed <= yesterday.endOf('day');
    })();

    const dateError = (() => {
      if (!date.trim()) return undefined;
      if (!isDateValid) return `Select a date between ${minDateStr} and ${maxDateStr}`;
      return undefined;
    })();

    const isReasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;
    const isValid = isDateValid && hours >= 0.5 && hours <= 24 && isReasonValid;

    const incrementHours = () => setHours((h) => Math.min(24, +(h + 0.5).toFixed(1)));
    const decrementHours = () => setHours((h) => Math.max(0.5, +(h - 0.5).toFixed(1)));

    // File picker
    const pickDocument = async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        const newFiles: Attachment[] = result.assets.map((asset) => ({
          fileName: asset.name,
          fileUrl: asset.uri,
          fileSize: asset.size,
        }));
        setAttachments((prev) => {
          const combined = [...prev, ...newFiles];
          return combined.slice(0, 5); // max 5
        });
      }
    };

    const removeAttachment = (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (size?: number) => {
      if (!size) return '';
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmit = () => {
      onSubmit({
        date: date.trim(),
        hours,
        reason: reason.trim(),
        attachments: attachments.length > 0 ? attachments.map((a) => a.fileUrl) : undefined,
      });
    };

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
        <BottomSheetScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">
            Claim Overtime
          </Text>

          {/* Date */}
          <DatePickerField
            label="Date"
            value={date}
            onChange={setDate}
            required
            hint={`Select a date within the last 30 days (up to yesterday)`}
            error={dateError}
          />

          {/* Hours Stepper */}
          <View style={s.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Hours <Text className="text-danger-500">*</Text>
            </Text>
            <View style={s.stepperRow}>
              <Pressable onPress={decrementHours} style={[s.stepperBtn, hours <= 0.5 && { opacity: 0.4 }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M5 12h14" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              </Pressable>
              <View style={s.stepperValueWrap}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                  {hours.toFixed(1)}h
                </Text>
              </View>
              <Pressable onPress={incrementHours} style={[s.stepperBtn, hours >= 24 && { opacity: 0.4 }]}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            <Text className="font-inter text-[10px] text-neutral-400 mt-1">
              0.5 hour increments (min 0.5, max 24)
            </Text>
          </View>

          {/* Reason */}
          <View style={s.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Reason <Text className="text-danger-500">*</Text>
            </Text>
            <View style={[s.inputWrap, { height: 100 }]}>
              <TextInput
                style={[s.textInput, isDark && s.textInputDark, { textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Describe the overtime work (10-500 characters)..."
                placeholderTextColor={colors.neutral[400]}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
            <Text className="font-inter text-[10px] text-neutral-400 mt-1 text-right">
              {reason.length}/500
            </Text>
          </View>

          {/* Attachments */}
          <View style={s.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Attachments ({attachments.length}/5)
            </Text>
            {attachments.length < 5 && (
              <Pressable onPress={pickDocument} style={s.uploadBtn}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                    stroke={colors.primary[600]}
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text className="font-inter text-xs font-bold text-primary-600">Upload File</Text>
              </Pressable>
            )}
            {attachments.map((file, idx) => (
              <View key={idx} style={s.attachmentRow}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    stroke={colors.primary[500]}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M14 2v6h6"
                    stroke={colors.primary[500]}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <View style={{ flex: 1 }}>
                  <Text className="font-inter text-xs text-primary-700 dark:text-primary-300" numberOfLines={1}>
                    {file.fileName}
                  </Text>
                  {file.fileSize != null && (
                    <Text className="font-inter text-[10px] text-neutral-400">
                      {formatFileSize(file.fileSize)}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => removeAttachment(idx)} hitSlop={8}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" strokeLinecap="round" />
                  </Svg>
                </Pressable>
              </View>
            ))}
            {attachments.length === 0 && (
              <Text className="font-inter text-[10px] text-neutral-400 mt-1">No attachments added yet</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable onPress={() => sheetRef.current?.dismiss()} style={s.cancelBtn}>
              <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-400">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
              style={[s.saveBtn, (!isValid || isSubmitting) && { opacity: 0.5 }]}
            >
              <Text className="font-inter text-sm font-bold text-white">
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

// Keep backward-compatible named export
export { ClaimOvertimeSheet as ClaimOvertimeModal };

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
    fieldWrap: { marginBottom: 14 },
    inputWrap: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingHorizontal: 14,
      height: 46,
      justifyContent: 'center',
    },
    textInput: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: colors.primary[950],
    },
    textInputDark: {
      color: colors.white,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepperBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E1B4B' : colors.primary[50],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.primary[200],
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepperValueWrap: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 46,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E1B4B' : colors.primary[50],
      borderWidth: 1.5,
      borderColor: isDark ? colors.neutral[700] : colors.primary[200],
      borderStyle: 'dashed',
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    cancelBtn: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
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
