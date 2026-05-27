import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, Wrench, AlertTriangle, Ban } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useToolsAtMachine } from '@/features/inventory/api/use-inventory-queries';
import { useCreateToolIssue } from '@/features/inventory/api/use-inventory-mutations';
import { getToolLifeLevel } from '@/features/inventory/shared/inventory-status-colors';

export function ToolIssueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useToolsAtMachine();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const lifeRemainingPct = item.lifeRemainingPct != null ? Number(item.lifeRemainingPct) : 100;
    const lifeColor = getToolLifeLevel(lifeRemainingPct);
    const isWarning = lifeRemainingPct > 0 && lifeRemainingPct < 50;
    const isBlocked = lifeRemainingPct <= 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolName || item.part?.name || 'Unknown Tool'}
            </Text>
            {isBlocked && (
              <View style={styles.blockedBadge}>
                <Ban color="#ef4444" size={12} />
                <Text className="text-[10px] font-bold font-inter text-red-600 ml-1">BLOCKED</Text>
              </View>
            )}
            {isWarning && !isBlocked && (
              <View style={styles.warningBadge}>
                <AlertTriangle color="#d97706" size={12} />
                <Text className="text-[10px] font-bold font-inter text-amber-600 ml-1">LOW LIFE</Text>
              </View>
            )}
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">
              Machine: {item.machineName || item.machine?.name || '--'}
            </Text>
            <Text className="text-xs font-inter text-neutral-400">
              Spindle: {item.spindlePosition || '--'}
            </Text>
          </View>
          {/* Life progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, lifeRemainingPct))}%`, backgroundColor: lifeColor.progressColor }]} />
          </View>
          <Text className="text-[10px] font-inter text-neutral-400 mt-1">
            {lifeRemainingPct.toFixed(0)}% life remaining | Issued: {item.issuedAt ? fmt.date(item.issuedAt) : '--'}
          </Text>
        </View>
      </Animated.View>
    );
  }, [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Issue</Text>
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
          ListEmptyComponent={<EmptyState title="No tools issued" message="Issue tools to machines from this screen" />}
        />
      )}

      <FAB onPress={() => setShowForm(true)} />
      {showForm && <IssueToolSheet onClose={() => { setShowForm(false); refetch(); }} />}
    </View>
  );
}

function IssueToolSheet({ onClose }: { onClose: () => void }) {
  const issueMutation = useCreateToolIssue();
  const [toolPartId, setToolPartId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [spindlePosition, setSpindlePosition] = useState('');

  const canSubmit = toolPartId && machineId;

  const handleSubmit = () => {
    issueMutation.mutate(
      {
        toolPartId,
        machineId,
        spindlePosition: spindlePosition || undefined,
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
            <Text className="text-lg font-bold font-inter text-neutral-900">Issue Tool</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Tool Part ID *</Text>
          <TextInput style={styles.input} value={toolPartId} onChangeText={setToolPartId} placeholder="Select or enter tool part" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Machine ID *</Text>
          <TextInput style={styles.input} value={machineId} onChangeText={setMachineId} placeholder="Select or enter machine" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Spindle Position</Text>
          <TextInput style={styles.input} value={spindlePosition} onChangeText={setSpindlePosition} placeholder="e.g. S1, S2" placeholderTextColor={colors.neutral[400]} />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || issueMutation.isPending}
            style={[styles.submitBtn, (!canSubmit || issueMutation.isPending) && { opacity: 0.5 }]}
          >
            {issueMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-bold font-inter text-white">Issue Tool</Text>
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  warningBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#fde68a' },
  blockedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#fecaca' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
