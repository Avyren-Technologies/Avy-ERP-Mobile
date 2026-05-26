import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { useWarehouses } from '@/features/inventory/api/use-inventory-queries';
import { useCreateCount } from '@/features/inventory/api/use-inventory-mutations';

const COUNT_TYPES = ['CYCLE', 'FULL', 'SPOT'];

export function CountCreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createMutation = useCreateCount();
  const { data: whData } = useWarehouses();
  const warehouses = (whData as any)?.data || [];

  const [form, setForm] = useState({ type: 'CYCLE', warehouseId: '', scheduledDate: '', remarks: '' });

  const canSubmit = form.warehouseId && form.type;

  const handleSubmit = () => {
    createMutation.mutate({
      type: form.type,
      warehouseId: form.warehouseId,
      scheduledDate: form.scheduledDate || undefined,
      remarks: form.remarks || undefined,
    }, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">New Count</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Count Type */}
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-2">Count Type *</Text>
        <View style={styles.chipRow}>
          {COUNT_TYPES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setForm({ ...form, type: t })} style={[styles.chip, form.type === t && styles.chipActive]}>
              <Text className={`text-xs font-medium font-inter ${form.type === t ? 'text-white' : 'text-neutral-700'}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Warehouse */}
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-2 mt-5">Warehouse *</Text>
        <View style={styles.chipRow}>
          {warehouses.map((w: any) => (
            <TouchableOpacity key={w.id} onPress={() => setForm({ ...form, warehouseId: w.id })} style={[styles.chip, form.warehouseId === w.id && styles.chipActive]}>
              <Text className={`text-xs font-inter ${form.warehouseId === w.id ? 'text-white font-bold' : 'text-neutral-700'}`}>{w.code} - {w.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-5">Scheduled Date</Text>
        <TextInput style={styles.input} value={form.scheduledDate} onChangeText={(v) => setForm({ ...form, scheduledDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} />

        {/* Remarks */}
        <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Remarks</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={form.remarks} onChangeText={(v) => setForm({ ...form, remarks: v })} placeholder="Optional remarks" placeholderTextColor={colors.neutral[400]} />

        <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={[styles.submitBtn, (!canSubmit || createMutation.isPending) && { opacity: 0.5 }]}>
          {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Create Count</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
});
