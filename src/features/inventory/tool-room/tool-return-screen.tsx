import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, CheckCircle, Wrench, AlertTriangle, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useToolsAtMachine } from '@/features/inventory/api/use-inventory-queries';
import { useCreateToolReturn } from '@/features/inventory/api/use-inventory-mutations';

type Outcome = 'STILL_USABLE' | 'NEEDS_RECONDITIONING' | 'CONDEMNED' | 'BROKEN';

const OUTCOME_CONFIG: Record<Outcome, { label: string; icon: string; bg: string; text: string; borderColor: string }> = {
  STILL_USABLE: { label: 'Still Usable', icon: 'check', bg: '#ecfdf5', text: 'text-emerald-700', borderColor: '#a7f3d0' },
  NEEDS_RECONDITIONING: { label: 'Needs Reconditioning', icon: 'wrench', bg: '#fffbeb', text: 'text-amber-700', borderColor: '#fde68a' },
  CONDEMNED: { label: 'Condemned', icon: 'trash', bg: '#f3f4f6', text: 'text-gray-600', borderColor: '#d1d5db' },
  BROKEN: { label: 'Broken', icon: 'alert', bg: '#fef2f2', text: 'text-red-700', borderColor: '#fecaca' },
};

export function ToolReturnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useToolsAtMachine();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
            {item.toolName || item.part?.name || 'Unknown Tool'}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-500">Machine: {item.machineName || item.machine?.name || '--'}</Text>
          <Text className="text-xs font-inter text-neutral-400">Spindle: {item.spindlePosition || '--'}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text className="text-xs font-inter text-neutral-400">Issued: {item.issuedAt ? fmt.date(item.issuedAt) : '--'}</Text>
        </View>
      </View>
    </Animated.View>
  ), [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Return</Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title="No tools at machines" message="No tools are currently issued to machines" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />
      {showForm && <ReturnToolSheet onClose={() => { setShowForm(false); refetch(); }} />}
    </View>
  );
}

function ReturnToolSheet({ onClose }: { onClose: () => void }) {
  const returnMutation = useCreateToolReturn();
  const [toolAtMachineId, setToolAtMachineId] = useState('');
  const [actualUsage, setActualUsage] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [breakageCause, setBreakageCause] = useState('');
  const [isSafetyIncident, setIsSafetyIncident] = useState(false);
  const [breakageNotes, setBreakageNotes] = useState('');

  const showBreakageFields = outcome === 'BROKEN';
  const canSubmit = toolAtMachineId && outcome;

  const handleSubmit = () => {
    returnMutation.mutate(
      {
        toolAtMachineId,
        actualUsage: actualUsage ? Number(actualUsage) : undefined,
        outcome,
        breakageCause: showBreakageFields ? breakageCause : undefined,
        isSafetyIncident: showBreakageFields ? isSafetyIncident : undefined,
        breakageNotes: showBreakageFields ? breakageNotes : undefined,
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
            <Text className="text-lg font-bold font-inter text-neutral-900">Return Tool</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Tool at Machine ID *</Text>
          <TextInput style={styles.input} value={toolAtMachineId} onChangeText={setToolAtMachineId} placeholder="Select tool assignment" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Actual Usage</Text>
          <TextInput style={styles.input} value={actualUsage} onChangeText={setActualUsage} keyboardType="numeric" placeholder="Hours/cycles used" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-2 mt-4">Outcome *</Text>
          <View style={{ gap: 8 }}>
            {(Object.keys(OUTCOME_CONFIG) as Outcome[]).map((key) => {
              const cfg = OUTCOME_CONFIG[key];
              const selected = outcome === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setOutcome(key)}
                  style={[styles.outcomeCard, { backgroundColor: cfg.bg, borderColor: selected ? colors.primary[500] : cfg.borderColor, borderWidth: selected ? 2 : 1 }]}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm font-bold font-inter ${cfg.text}`}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showBreakageFields && (
            <View style={styles.breakageSection}>
              <Text className="text-xs font-bold font-inter text-red-700 mb-2">Breakage Details</Text>
              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1">Cause</Text>
              <TextInput style={styles.input} value={breakageCause} onChangeText={setBreakageCause} placeholder="What caused the breakage?" placeholderTextColor={colors.neutral[400]} />

              <TouchableOpacity
                onPress={() => setIsSafetyIncident(!isSafetyIncident)}
                style={[styles.safetyToggle, isSafetyIncident && { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
              >
                <View style={[styles.checkbox, isSafetyIncident && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
                  {isSafetyIncident && <CheckCircle color="#fff" size={12} />}
                </View>
                <Text className="text-xs font-inter text-neutral-700 ml-2">Safety Incident</Text>
              </TouchableOpacity>

              <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-3">Notes</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={breakageNotes}
                onChangeText={setBreakageNotes}
                multiline
                placeholder="Additional details"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || returnMutation.isPending}
            style={[styles.submitBtn, (!canSubmit || returnMutation.isPending) && { opacity: 0.5 }]}
          >
            {returnMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Return Tool</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  outcomeCard: { borderRadius: 12, padding: 14, alignItems: 'center' },
  breakageSection: { marginTop: 16, backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fecaca' },
  safetyToggle: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5', marginTop: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
