import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, Shield, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useToolLifePolicies } from '@/features/inventory/api/use-inventory-queries';
import { useUpsertToolLifePolicy } from '@/features/inventory/api/use-inventory-mutations';
import { getToolLifeLevel } from '@/features/inventory/shared/inventory-status-colors';

export function ToolLifePolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<any>(null);

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search) p.search = search;
    return p;
  }, [search]);

  const { data, isLoading, refetch, isRefetching } = useToolLifePolicies(params);
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const lifeUsedPct = item.expectedLife > 0 ? Math.max(0, 100 - ((Number(item.currentUsage || 0) / Number(item.expectedLife)) * 100)) : 100;
    const lifeColor = getToolLifeLevel(lifeUsedPct);
    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TouchableOpacity style={styles.card} onPress={() => setEditItem(item)} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.partName || item.part?.name || 'Unknown Tool'}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock color={colors.neutral[400]} size={12} />
              <Text className="text-xs font-inter text-neutral-500">
                Life: {item.expectedLife || '--'} {item.lifeUnit || 'hours'}
              </Text>
            </View>
            <Text className="text-xs font-inter text-neutral-400">
              Warning at {item.warningThresholdPct || 20}%
            </Text>
          </View>
          {/* Life progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, lifeUsedPct)}%`, backgroundColor: lifeColor.progressColor }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Life Policies</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tools..."
          placeholderTextColor="rgba(255,255,255,0.5)"
        />
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id || item.partId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No tool life policies" message="Configure tool life tracking for your tooling parts" />}
        />
      )}

      {editItem && <PolicyEditSheet item={editItem} onClose={() => { setEditItem(null); refetch(); }} />}
    </View>
  );
}

function PolicyEditSheet({ item, onClose }: { item: any; onClose: () => void }) {
  const upsertMutation = useUpsertToolLifePolicy();
  const [lifeUnit, setLifeUnit] = useState(item.lifeUnit || 'HOURS');
  const [expectedLife, setExpectedLife] = useState(String(item.expectedLife || ''));
  const [warningPct, setWarningPct] = useState(String(item.warningThresholdPct || '20'));
  const [maxReconditionings, setMaxReconditionings] = useState(String(item.maxReconditionings || ''));

  const LIFE_UNITS = ['HOURS', 'CYCLES', 'STROKES', 'METRES', 'PIECES'];

  const handleSave = () => {
    upsertMutation.mutate(
      {
        partId: item.partId || item.id,
        lifeUnit,
        expectedLife: Number(expectedLife),
        warningThresholdPct: Number(warningPct),
        maxReconditionings: maxReconditionings ? Number(maxReconditionings) : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.sheetHeader}>
            <Text className="text-lg font-bold font-inter text-neutral-900">Edit Policy</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-sm font-bold font-inter text-neutral-800 mt-3">
            {item.partName || item.part?.name || 'Unknown Tool'}
          </Text>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Life Unit *</Text>
          <View style={styles.chipRow}>
            {LIFE_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setLifeUnit(u)}
                style={[styles.chip, lifeUnit === u && styles.chipActive]}
              >
                <Text className={`text-xs font-inter ${lifeUnit === u ? 'text-white font-bold' : 'text-neutral-600'}`}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Expected Life *</Text>
          <TextInput style={styles.input} value={expectedLife} onChangeText={setExpectedLife} keyboardType="numeric" placeholder="e.g. 500" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Warning Threshold (%)</Text>
          <TextInput style={styles.input} value={warningPct} onChangeText={setWarningPct} keyboardType="numeric" placeholder="20" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Max Reconditionings</Text>
          <TextInput style={styles.input} value={maxReconditionings} onChangeText={setMaxReconditionings} keyboardType="numeric" placeholder="Optional" placeholderTextColor={colors.neutral[400]} />

          <TouchableOpacity
            onPress={handleSave}
            disabled={!expectedLife || upsertMutation.isPending}
            style={[styles.submitBtn, (!expectedLife || upsertMutation.isPending) && { opacity: 0.5 }]}
          >
            {upsertMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Save Policy</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Inter', color: '#fff', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e5e5' },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
