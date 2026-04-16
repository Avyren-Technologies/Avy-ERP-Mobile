/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DateTime } from 'luxon';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';

// ── Types ──

interface ClaimOvertimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; hours: number; reason: string; attachments?: string[] }) => void;
  isSubmitting: boolean;
}

// ── Component ──

export function ClaimOvertimeModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: ClaimOvertimeModalProps) {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();

  const [date, setDate] = React.useState('');
  const [hours, setHours] = React.useState(1);
  const [reason, setReason] = React.useState('');
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const [attachments, setAttachments] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setDate('');
      setHours(1);
      setReason('');
      setAttachmentUrl('');
      setAttachments([]);
    }
  }, [visible]);

  const today = DateTime.now();
  const minDate = today.minus({ days: 30 });

  const isDateValid = (() => {
    if (!date.trim()) return false;
    const parsed = DateTime.fromFormat(date.trim(), 'yyyy-MM-dd');
    if (!parsed.isValid) return false;
    return parsed >= minDate.startOf('day') && parsed <= today.endOf('day');
  })();

  const isReasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;
  const isValid = isDateValid && hours >= 0.5 && hours <= 24 && isReasonValid;

  const incrementHours = () => setHours((h) => Math.min(24, +(h + 0.5).toFixed(1)));
  const decrementHours = () => setHours((h) => Math.max(0.5, +(h - 0.5).toFixed(1)));

  const addAttachment = () => {
    const url = attachmentUrl.trim();
    if (url && attachments.length < 5 && !attachments.includes(url)) {
      setAttachments((prev) => [...prev, url]);
      setAttachmentUrl('');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmit({
      date: date.trim(),
      hours,
      reason: reason.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 15, 40, 0.32)' }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.formSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.sheetHandle} />
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white mb-4">
            Claim Overtime
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
            {/* Date */}
            <View style={s.fieldWrap}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Date <Text className="text-danger-500">*</Text>
              </Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={[s.textInput, isDark && s.textInputDark]}
                  placeholder="YYYY-MM-DD (last 30 days)"
                  placeholderTextColor={colors.neutral[400]}
                  value={date}
                  onChangeText={setDate}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {date.trim().length > 0 && !isDateValid && (
                <Text className="font-inter text-[10px] text-danger-500 mt-1">
                  Enter a valid date within the last 30 days (YYYY-MM-DD)
                </Text>
              )}
            </View>

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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[s.inputWrap, { flex: 1 }]}>
                    <TextInput
                      style={[s.textInput, isDark && s.textInputDark]}
                      placeholder="Paste URL..."
                      placeholderTextColor={colors.neutral[400]}
                      value={attachmentUrl}
                      onChangeText={setAttachmentUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                  <Pressable
                    onPress={addAttachment}
                    style={[s.addBtn, !attachmentUrl.trim() && { opacity: 0.4 }]}
                    disabled={!attachmentUrl.trim()}
                  >
                    <Text className="font-inter text-xs font-bold text-white">Add</Text>
                  </Pressable>
                </View>
              )}
              {attachments.map((url, idx) => (
                <View key={idx} style={s.attachmentRow}>
                  <Text className="font-inter text-xs text-primary-700 dark:text-primary-300 flex-1" numberOfLines={1}>
                    {url}
                  </Text>
                  <Pressable onPress={() => removeAttachment(idx)}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                      <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" strokeLinecap="round" />
                    </Svg>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable onPress={onClose} style={s.cancelBtn}>
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
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    formSheet: {
      backgroundColor: isDark ? '#1A1730' : colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.neutral[300],
      alignSelf: 'center',
      marginBottom: 16,
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
    addBtn: {
      height: 46,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.primary[600],
      justifyContent: 'center',
      alignItems: 'center',
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
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
