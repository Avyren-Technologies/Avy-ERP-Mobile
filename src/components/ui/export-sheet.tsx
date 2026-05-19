import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import colors from '@/components/ui/colors';

interface ExportSheetProps {
  onExport: (format: 'excel' | 'pdf') => void;
  isDownloading?: boolean;
}

export const ExportSheet = forwardRef<BottomSheet, ExportSheetProps>(
  ({ onExport, isDownloading }, ref) => {
    const snapPoints = useMemo(() => [240], []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.white }}
        handleIndicatorStyle={{ backgroundColor: colors.neutral[300] }}
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.title} className="font-inter">Export Report</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onExport('excel')}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              {isDownloading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Ionicons name="document-text" size={20} color="#059669" />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle} className="font-inter">Excel</Text>
              <Text style={styles.optionDesc} className="font-inter">Multi-sheet .xlsx with formatting</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onExport('pdf')}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              {isDownloading ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="document" size={20} color="#DC2626" />
              )}
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle} className="font-inter">PDF</Text>
              <Text style={styles.optionDesc} className="font-inter">Formatted .pdf report</Text>
            </View>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  optionDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
