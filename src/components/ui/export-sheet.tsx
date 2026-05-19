import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';

interface ExportSheetProps {
  onExport: (format: 'excel' | 'pdf') => void;
  isDownloading?: boolean;
}

export const ExportSheet = forwardRef<BottomSheet, ExportSheetProps>(
  ({ onExport, isDownloading }, ref) => {
    const isDark = useIsDark();
    const snapPoints = useMemo(() => [340], []);
    const styles = _createStyles(isDark);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: isDark ? colors.charcoal[900] : colors.white }}
        handleIndicatorStyle={{ backgroundColor: isDark ? colors.charcoal[600] : colors.neutral[300] }}
      >
        <BottomSheetView style={styles.content}>
          <Text className="font-inter text-base font-bold" style={styles.title}>Export Report</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onExport('excel')}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? colors.success[900] : colors.success[50] }]}>
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.success[600]} />
              ) : (
                <Ionicons name="document-text" size={20} color={colors.success[600]} />
              )}
            </View>
            <View style={styles.optionText}>
              <Text className="font-inter text-sm font-semibold" style={styles.optionTitle}>Excel</Text>
              <Text className="font-inter text-[11px]" style={styles.optionDesc}>Multi-sheet .xlsx with formatting</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onExport('pdf')}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]}>
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.danger[600]} />
              ) : (
                <Ionicons name="document" size={20} color={colors.danger[600]} />
              )}
            </View>
            <View style={styles.optionText}>
              <Text className="font-inter text-sm font-semibold" style={styles.optionTitle}>PDF</Text>
              <Text className="font-inter text-[11px]" style={styles.optionDesc}>Formatted .pdf report</Text>
            </View>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const _createStyles = (isDark: boolean) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  title: { color: isDark ? colors.white : colors.neutral[800], marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { color: isDark ? colors.neutral[100] : colors.neutral[800] },
  optionDesc: { color: isDark ? colors.charcoal[400] : colors.neutral[400], marginTop: 2 },
});
