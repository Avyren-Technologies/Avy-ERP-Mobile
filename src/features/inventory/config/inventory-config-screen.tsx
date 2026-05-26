import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { useInventoryConfig } from '@/features/inventory/api/use-inventory-queries';
import { useUpdateInventoryConfig } from '@/features/inventory/api/use-inventory-mutations';

const ISSUE_RULES = [
  { value: 'FIFO', label: 'FIFO' },
  { value: 'LIFO', label: 'LIFO' },
  { value: 'FEFO', label: 'FEFO' },
];

export function InventoryConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useInventoryConfig();
  const updateMutation = useUpdateInventoryConfig();

  const config = (data as any)?.data;

  const [form, setForm] = useState({
    defaultIssueRule: 'FIFO',
    autoProvisionVirtualLocations: false,
    nearExpiryDays: '30',
    blockedStockAgingDays: '90',
    countTolerancePct: '2',
  });

  useEffect(() => {
    if (config) {
      setForm({
        defaultIssueRule: config.defaultIssueRule || 'FIFO',
        autoProvisionVirtualLocations: !!config.autoProvisionVirtualLocations,
        nearExpiryDays: String(config.nearExpiryDays ?? 30),
        blockedStockAgingDays: String(config.blockedStockAgingDays ?? 90),
        countTolerancePct: String(config.countTolerancePct ?? 2),
      });
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate({
      defaultIssueRule: form.defaultIssueRule,
      autoProvisionVirtualLocations: form.autoProvisionVirtualLocations,
      nearExpiryDays: Number(form.nearExpiryDays),
      blockedStockAgingDays: Number(form.blockedStockAgingDays),
      countTolerancePct: Number(form.countTolerancePct),
    });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
            <Text className="text-xl font-bold text-white font-inter ml-3">Configuration</Text>
          </View>
        </LinearGradient>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Configuration</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Issue Rule */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
          <Text className="text-sm font-bold font-inter text-neutral-800 mb-3">Default Issue Rule</Text>
          <View style={styles.chipRow}>
            {ISSUE_RULES.map((r) => (
              <TouchableOpacity key={r.value} onPress={() => setForm({ ...form, defaultIssueRule: r.value })} style={[styles.chip, form.defaultIssueRule === r.value && styles.chipActive]}>
                <Text className={`text-xs font-medium font-inter ${form.defaultIssueRule === r.value ? 'text-white' : 'text-neutral-700'}`}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text className="text-sm font-bold font-inter text-neutral-800">Auto-Provision Locations</Text>
              <Text className="text-xs font-inter text-neutral-500 mt-1">Automatically create virtual bin locations</Text>
            </View>
            <Switch
              value={form.autoProvisionVirtualLocations}
              onValueChange={(v) => setForm({ ...form, autoProvisionVirtualLocations: v })}
              trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
              thumbColor={form.autoProvisionVirtualLocations ? colors.primary[600] : colors.neutral[400]}
            />
          </View>
        </Animated.View>

        {/* Thresholds */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <Text className="text-sm font-bold font-inter text-neutral-800 mb-3">Alert Thresholds</Text>
          <View style={{ gap: 12 }}>
            <View>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Near Expiry Warning (days)</Text>
              <TextInput style={styles.input} value={form.nearExpiryDays} onChangeText={(v) => setForm({ ...form, nearExpiryDays: v })} keyboardType="numeric" />
            </View>
            <View>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Blocked Stock Aging (days)</Text>
              <TextInput style={styles.input} value={form.blockedStockAgingDays} onChangeText={(v) => setForm({ ...form, blockedStockAgingDays: v })} keyboardType="numeric" />
            </View>
            <View>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Count Tolerance (%)</Text>
              <TextInput style={styles.input} value={form.countTolerancePct} onChangeText={(v) => setForm({ ...form, countTolerancePct: v })} keyboardType="numeric" />
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity onPress={handleSave} disabled={updateMutation.isPending} style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.5 }]}>
          {updateMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-sm font-bold font-inter text-white">Save Configuration</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5', padding: 16, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  saveBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
});
