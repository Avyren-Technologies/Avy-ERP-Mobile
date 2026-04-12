import { Download, File, FileSpreadsheet, FileText, X } from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';
import { useIsDark } from '@/hooks/use-is-dark';

export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  disabled?: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'xlsx',
    label: 'Excel (.xlsx)',
    description: 'Full data with formatting and charts',
    icon: <FileSpreadsheet size={22} color={colors.success[600]} />,
  },
  {
    format: 'pdf',
    label: 'PDF Report',
    description: 'Formatted summary report',
    icon: <FileText size={22} color={colors.danger[500]} />,
  },
  {
    format: 'csv',
    label: 'CSV (.csv)',
    description: 'Raw data for further analysis',
    icon: <File size={22} color={colors.info[600]} />,
  },
];

export function ExportButton({ onExport, loading, disabled }: ExportButtonProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const [visible, setVisible] = useState(false);

  const handleExport = (format: ExportFormat) => {
    setVisible(false);
    onExport(format);
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={[styles.triggerButton, disabled && styles.triggerButtonDisabled]}
        disabled={disabled || loading}
      >
        <Download size={16} color={disabled ? colors.neutral[400] : colors.white} />
        <Text
          className={`font-inter text-[13px] font-bold ${disabled ? 'text-neutral-400' : 'text-white'}`}
        >
          Export
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Animated.View entering={FadeInUp.duration(300)}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text className="font-inter text-[17px] font-bold text-neutral-900 dark:text-white">
                  Export Report
                </Text>
                <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
                  <X size={20} color={colors.neutral[500]} />
                </Pressable>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {EXPORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.format}
                    onPress={() => handleExport(option.format)}
                    style={styles.optionRow}
                  >
                    <View style={styles.optionIcon}>{option.icon}</View>
                    <View style={styles.optionText}>
                      <Text className="font-inter text-[15px] font-semibold text-neutral-800">
                        {option.label}
                      </Text>
                      <Text className="font-inter text-[12px] text-neutral-400">
                        {option.description}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Cancel */}
              <Pressable onPress={() => setVisible(false)} style={styles.cancelButton}>
                <Text className="font-inter text-[15px] font-semibold text-neutral-500 dark:text-neutral-400">
                  Cancel
                </Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: colors.primary[600],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  triggerButtonDisabled: {
    backgroundColor: colors.neutral[200],
    shadowOpacity: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: isDark ? '#1A1730' : colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
});
const styles = createStyles(false);
