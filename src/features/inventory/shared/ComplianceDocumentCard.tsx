import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import {
  Plus, Trash2, ExternalLink, FileCheck, X, AlertCircle,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Linking } from 'react-native';

import colors from '@/components/ui/colors';
import { useConfirmModal } from '@/components/ui/confirm-modal';
import { useComplianceByPart, useComplianceByLot } from '@/features/inventory/api/use-inventory-queries';
import { useCreateComplianceDocument, useDeleteComplianceDocument } from '@/features/inventory/api/use-inventory-mutations';

interface ComplianceDocumentCardProps {
  partId?: string;
  lotId?: string;
}

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  COA: { bg: '#dbeafe', text: '#1d4ed8' },
  MSDS: { bg: '#fee2e2', text: '#b91c1c' },
  MILL_CERT: { bg: '#d1fae5', text: '#047857' },
  ALLERGEN_CERT: { bg: '#fef3c7', text: '#b45309' },
  ESD_CERT: { bg: '#ede9fe', text: '#6d28d9' },
  COLD_CHAIN_CERT: { bg: '#ccfbf1', text: '#0f766e' },
  WARRANTY_CERT: { bg: '#e0e7ff', text: '#4338ca' },
  OTHER: { bg: '#f5f5f5', text: '#525252' },
};

const DOC_TYPES = [
  { value: 'COA', label: 'Certificate of Analysis' },
  { value: 'MSDS', label: 'Material Safety Data Sheet' },
  { value: 'MILL_CERT', label: 'Mill Certificate' },
  { value: 'ALLERGEN_CERT', label: 'Allergen Certificate' },
  { value: 'ESD_CERT', label: 'ESD Certificate' },
  { value: 'COLD_CHAIN_CERT', label: 'Cold Chain Certificate' },
  { value: 'WARRANTY_CERT', label: 'Warranty Certificate' },
  { value: 'OTHER', label: 'Other' },
];

export function ComplianceDocumentCard({ partId, lotId }: ComplianceDocumentCardProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { show: showConfirm } = useConfirmModal();
  const [form, setForm] = useState({ documentType: 'COA', documentName: '', documentUrl: '', expiryDate: '' });
  const [selectedType, setSelectedType] = useState('COA');

  const { data: partData, isLoading: partLoading, refetch: partRefetch, isRefetching: partRefetching } = useComplianceByPart(partId || '');
  const { data: lotData, isLoading: lotLoading, refetch: lotRefetch, isRefetching: lotRefetching } = useComplianceByLot(lotId || '');

  const createMutation = useCreateComplianceDocument();
  const deleteMutation = useDeleteComplianceDocument();

  const isLoading = partId ? partLoading : lotLoading;
  const isRefetching = partId ? partRefetching : lotRefetching;
  const refetch = partId ? partRefetch : lotRefetch;
  const rawDocs = partId ? (partData as any)?.data : (lotData as any)?.data;
  const documents: any[] = rawDocs || [];

  const handleUpload = () => {
    if (!form.documentName.trim() || !form.documentUrl.trim()) return;
    const payload: Record<string, unknown> = {
      documentType: selectedType,
      documentName: form.documentName.trim(),
      documentUrl: form.documentUrl.trim(),
    };
    if (partId) payload.partId = partId;
    if (lotId) payload.lotId = lotId;
    if (form.expiryDate) payload.expiryDate = form.expiryDate;
    createMutation.mutate(payload, {
      onSuccess: () => {
        bottomSheetRef.current?.close();
        setForm({ documentType: 'COA', documentName: '', documentUrl: '', expiryDate: '' });
        setSelectedType('COA');
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    showConfirm({
      title: 'Delete Document',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger' as const,
      onConfirm: () => deleteMutation.mutate(id),
    });
  };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const typeColor = DOC_TYPE_COLORS[item.documentType] || DOC_TYPE_COLORS.OTHER;
    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.docCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={[styles.badge, { backgroundColor: typeColor.bg }]}>
              <Text className="text-[10px] font-bold font-inter" style={{ color: typeColor.text }}>{item.documentType}</Text>
            </View>
            {isExpired && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <AlertCircle color="#b91c1c" size={10} />
                <Text className="text-[10px] font-bold font-inter" style={{ color: '#b91c1c' }}>Expired</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-semibold font-inter text-neutral-800" numberOfLines={1}>{item.documentName}</Text>
          {item.expiryDate && (
            <Text className="text-[10px] font-inter text-neutral-400 mt-1">Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {item.documentUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(item.documentUrl)} style={styles.iconBtn}>
                <ExternalLink color={colors.primary[500]} size={14} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(item.id, item.documentName)} style={styles.iconBtn}>
              <Trash2 color="#dc2626" size={14} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileCheck color={colors.primary[500]} size={16} />
          <Text className="text-sm font-bold font-inter text-neutral-800">Compliance Documents</Text>
          {documents.length > 0 && (
            <View style={[styles.badge, { backgroundColor: '#eef2ff' }]}>
              <Text className="text-[10px] font-bold font-inter" style={{ color: colors.primary[700] }}>{documents.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => bottomSheetRef.current?.expand()}
          style={styles.addBtn}
        >
          <Plus color="#fff" size={14} />
          <Text className="text-xs font-bold text-white font-inter">Upload</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={{ paddingVertical: 20 }} />
      ) : documents.length === 0 ? (
        <View style={styles.emptyBox}>
          <FileCheck color={colors.neutral[300]} size={24} />
          <Text className="text-xs font-inter text-neutral-400 mt-2">No compliance documents</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          horizontal={false}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
        />
      )}

      {/* Upload Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        backgroundStyle={{ borderRadius: 24, backgroundColor: '#fff' }}
        handleIndicatorStyle={{ backgroundColor: colors.neutral[300] }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text className="text-lg font-bold font-inter text-neutral-900 mb-4">Upload Document</Text>

          {/* Document Type Chips */}
          <Text className="text-xs font-semibold font-inter text-neutral-500 mb-2">Document Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {DOC_TYPES.map(t => {
              const c = DOC_TYPE_COLORS[t.value] || DOC_TYPE_COLORS.OTHER;
              const selected = selectedType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setSelectedType(t.value)}
                  style={[styles.chip, selected && { backgroundColor: c.bg, borderColor: c.text }]}
                >
                  <Text className="text-[10px] font-bold font-inter" style={{ color: selected ? c.text : colors.neutral[500] }}>{t.value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1">Document Name *</Text>
          <TextInput
            style={styles.input}
            value={form.documentName}
            onChangeText={v => setForm(p => ({ ...p, documentName: v }))}
            placeholder="e.g., COA - Batch 2024-001"
            placeholderTextColor={colors.neutral[400]}
          />

          <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1 mt-3">Document URL *</Text>
          <TextInput
            style={styles.input}
            value={form.documentUrl}
            onChangeText={v => setForm(p => ({ ...p, documentUrl: v }))}
            placeholder="https://..."
            placeholderTextColor={colors.neutral[400]}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text className="text-xs font-semibold font-inter text-neutral-500 mb-1 mt-3">Expiry Date (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.expiryDate}
            onChangeText={v => setForm(p => ({ ...p, expiryDate: v }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.neutral[400]}
          />

          <TouchableOpacity
            onPress={handleUpload}
            disabled={createMutation.isPending || !form.documentName.trim() || !form.documentUrl.trim()}
            style={[styles.uploadBtn, (createMutation.isPending || !form.documentName.trim() || !form.documentUrl.trim()) && { opacity: 0.5 }]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-sm font-bold text-white font-inter">Upload</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary[600] },
  emptyBox: { alignItems: 'center', paddingVertical: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d4', borderRadius: 12 },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0efee',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: '#fafafa' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#d4d4d4', backgroundColor: '#fafafa' },
  input: {
    borderWidth: 1, borderColor: '#d4d4d4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#171717', backgroundColor: '#fafafa', fontFamily: 'Inter',
  },
  uploadBtn: {
    marginTop: 16, backgroundColor: colors.primary[600], paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
});
