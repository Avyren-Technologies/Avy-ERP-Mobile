import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import colors from '@/components/ui/colors';
import { HamburgerButton } from '@/components/ui/sidebar';
import { useImportJobs } from '@/features/inventory/api/use-inventory-queries';
import { inventoryApi } from '@/lib/api/inventory';
import { inventoryKeys } from '@/features/inventory/api/inventory-keys';

const ENTITY_TYPES = [
  { key: 'opening-stock', label: 'Opening Stock' },
  { key: 'item-master', label: 'Item Master' },
  { key: 'warehouse', label: 'Warehouse' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#f3f4f6', text: '#6b7280' },
  PROCESSING: { bg: '#dbeafe', text: '#1d4ed8' },
  COMPLETED: { bg: '#dcfce7', text: '#15803d' },
  FAILED: { bg: '#fef2f2', text: '#dc2626' },
  PARTIAL: { bg: '#fef3c7', text: '#b45309' },
};

export function InventoryImportScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('opening-stock');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previewData, setPreviewData] = useState<any>(null);
  const [jobId, setJobId] = useState('');

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs, isRefetching } = useImportJobs();
  const jobs = (jobsData as any)?.data || [];

  const previewMutation = useMutation({
    mutationFn: (formData: any) => inventoryApi.previewImport(formData),
    onSuccess: (res: any) => {
      setPreviewData(res?.data);
      setJobId(res?.data?.jobId || '');
      setStep(2);
    },
  });

  const commitMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.commitImport(id),
    onSuccess: () => {
      setStep(3);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.importJobs() });
    },
  });

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'text/csv' } as any);
      formData.append('entityType', entityType);
      previewMutation.mutate(formData);
    } catch {
      // user cancelled
    }
  }, [entityType, previewMutation]);

  const handleReset = () => {
    setStep(1);
    setPreviewData(null);
    setJobId('');
  };

  const rows = previewData?.rows || [];
  const validCount = rows.filter((r: any) => !r.errors?.length).length;
  const errorCount = rows.filter((r: any) => r.errors?.length > 0).length;

  const renderRow = ({ item, index }: { item: any; index: number }) => {
    const hasError = item.errors?.length > 0;
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 30).duration(300)}
        style={[styles.previewRow, { borderLeftColor: hasError ? '#ef4444' : '#22c55e', borderLeftWidth: 3 }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text className="text-xs font-medium font-inter text-neutral-500">Row {index + 1}</Text>
          <Text className={`text-xs font-semibold font-inter ${hasError ? 'text-red-600' : 'text-emerald-600'}`}>
            {hasError ? 'Error' : 'Valid'}
          </Text>
        </View>
        {Object.entries(item.data || {}).slice(0, 4).map(([key, val]) => (
          <Text key={key} className="text-[11px] font-inter text-neutral-600 mt-0.5" numberOfLines={1}>
            {key}: {String(val ?? '-')}
          </Text>
        ))}
        {hasError && (
          <Text className="text-[10px] font-inter text-red-500 mt-1">{(item.errors || []).join('; ')}</Text>
        )}
      </Animated.View>
    );
  };

  const renderJob = ({ item, index }: { item: any; index: number }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)} style={styles.jobCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text className="text-sm font-semibold font-inter text-neutral-900">{item.entityType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={{ color: statusColor.text, fontSize: 10, fontWeight: '600' }}>{item.status}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text className="text-[10px] font-inter text-neutral-400">{item.totalRows ?? 0} rows</Text>
          {item.errorCount > 0 && <Text className="text-[10px] font-inter text-red-500">{item.errorCount} errors</Text>}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <HamburgerButton />
          <Text className="text-xl font-bold text-white font-inter ml-3">Import Data</Text>
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">Upload CSV files to import inventory data</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchJobs} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Entity Type */}
        <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3">Entity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {ENTITY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => { setEntityType(t.key); handleReset(); }}
              activeOpacity={0.7}
              style={[styles.chip, entityType === t.key && styles.chipActive]}
            >
              <Text className={`text-xs font-medium font-inter ${entityType === t.key ? 'text-primary-700' : 'text-neutral-600'}`}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.uploadCard}>
            <Text className="text-sm font-semibold font-inter text-neutral-700 text-center mb-2">Upload File</Text>
            <Text className="text-xs font-inter text-neutral-400 text-center mb-4">CSV or XLSX format</Text>
            <TouchableOpacity
              onPress={handlePickFile}
              activeOpacity={0.7}
              style={styles.uploadBtn}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-semibold font-inter text-white">Choose File</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Step 2: Preview */}
        {step === 2 && previewData && (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryBadge, { backgroundColor: '#dcfce7' }]}>
                <Text className="text-xs font-semibold font-inter text-emerald-700">{validCount} valid</Text>
              </View>
              <View style={[styles.summaryBadge, { backgroundColor: '#fef2f2' }]}>
                <Text className="text-xs font-semibold font-inter text-red-700">{errorCount} errors</Text>
              </View>
              <Text className="text-xs font-inter text-neutral-400">{rows.length} total</Text>
            </View>

            {rows.slice(0, 20).map((row: any, i: number) => renderRow({ item: row, index: i }))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={[styles.actionBtn, { backgroundColor: '#f3f4f6' }]}>
                <Text className="text-sm font-semibold font-inter text-neutral-700">Re-upload</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => commitMutation.mutate(jobId)}
                activeOpacity={0.7}
                disabled={errorCount > 0 || commitMutation.isPending}
                style={[styles.actionBtn, { backgroundColor: errorCount > 0 ? '#e5e7eb' : colors.primary[600], flex: 1 }]}
              >
                {commitMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className={`text-sm font-semibold font-inter ${errorCount > 0 ? 'text-neutral-400' : 'text-white'}`}>
                    Commit Import
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.doneCard}>
            <Text className="text-2xl font-inter text-center mb-2">{'\u2705'}</Text>
            <Text className="text-lg font-bold font-inter text-neutral-900 text-center">Import Complete</Text>
            <Text className="text-sm font-inter text-neutral-500 text-center mt-1">{validCount} records imported</Text>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={[styles.uploadBtn, { marginTop: 16 }]}>
              <Text className="text-sm font-semibold font-inter text-white">Import More</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Recent Jobs */}
        <Text className="text-xs font-bold font-inter text-neutral-700 uppercase tracking-wider mb-3 mt-6">Recent Import Jobs</Text>
        {jobsLoading && <ActivityIndicator size="small" color={colors.primary[500]} />}
        {!jobsLoading && jobs.length === 0 && (
          <View style={styles.emptyCard}>
            <Text className="text-sm font-inter text-neutral-400 text-center">No import jobs yet</Text>
          </View>
        )}
        {jobs.map((j: any, i: number) => renderJob({ item: j, index: i }))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipActive: {
    backgroundColor: '#e0e7ff',
  },
  uploadCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    marginBottom: 16,
  },
  uploadBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
});
