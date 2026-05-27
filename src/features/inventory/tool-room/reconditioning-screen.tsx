import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, X, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useReconditioning, useOverdueReconditioning } from '@/features/inventory/api/use-inventory-queries';
import { useInitiateReconditioning, useCompleteReconditioning } from '@/features/inventory/api/use-inventory-mutations';
import { RECONDITIONING_STATUS_CONFIG } from '@/features/inventory/shared/inventory-status-colors';

type Tab = 'active' | 'completed' | 'overdue';

export function ReconditioningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();
  const [tab, setTab] = useState<Tab>('active');
  const [showInitForm, setShowInitForm] = useState(false);
  const [completeItem, setCompleteItem] = useState<any>(null);

  const activeParams = useMemo(() => ({ status: 'INITIATED,IN_PROGRESS' }), []);
  const completedParams = useMemo(() => ({ status: 'COMPLETED' }), []);

  const { data: activeData, isLoading: activeLoading, refetch: refetchActive, isRefetching: activeRefreshing } = useReconditioning(activeParams);
  const { data: completedData, isLoading: completedLoading, refetch: refetchCompleted, isRefetching: completedRefreshing } = useReconditioning(completedParams);
  const { data: overdueData, isLoading: overdueLoading, refetch: refetchOverdue, isRefetching: overdueRefreshing } = useOverdueReconditioning();

  const activeItems = (activeData as any)?.data || [];
  const completedItems = (completedData as any)?.data || [];
  const overdueItems = (overdueData as any)?.data || [];

  const currentItems = tab === 'active' ? activeItems : tab === 'completed' ? completedItems : overdueItems;
  const currentLoading = tab === 'active' ? activeLoading : tab === 'completed' ? completedLoading : overdueLoading;
  const currentRefetch = tab === 'active' ? refetchActive : tab === 'completed' ? refetchCompleted : refetchOverdue;
  const currentRefreshing = tab === 'active' ? activeRefreshing : tab === 'completed' ? completedRefreshing : overdueRefreshing;

  const refetchAll = () => { refetchActive(); refetchCompleted(); refetchOverdue(); };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const status = item.status || 'INITIATED';
    const cfg = RECONDITIONING_STATUS_CONFIG[status] || RECONDITIONING_STATUS_CONFIG.INITIATED;
    const isActive = status === 'INITIATED' || status === 'IN_PROGRESS';

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <TouchableOpacity
          style={styles.card}
          onPress={isActive ? () => setCompleteItem(item) : undefined}
          activeOpacity={isActive ? 0.7 : 1}
        >
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolName || item.tool?.name || item.part?.name || 'Unknown Tool'}
            </Text>
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }} className={cfg.bg}>
              <Text className={`text-[10px] font-medium font-inter ${cfg.text}`}>{cfg.label}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">Type: {item.reconditioningType || '--'}</Text>
            <Text className="text-xs font-inter text-neutral-400">Vendor: {item.vendorName || item.vendor?.name || '--'}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-400">
              Expected: {item.expectedCompletionDate ? fmt.date(item.expectedCompletionDate) : '--'}
            </Text>
            {item.actualCost && (
              <Text className="text-xs font-inter text-neutral-500">Cost: {Number(item.actualCost).toLocaleString()}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fmt]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeItems.length },
    { key: 'completed', label: 'Completed', count: completedItems.length },
    { key: 'overdue', label: 'Overdue', count: overdueItems.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Reconditioning</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text className={`text-xs font-bold font-inter ${tab === t.key ? 'text-primary-600' : 'text-neutral-500'}`}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : (
        <FlatList
          data={currentItems}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={currentRefreshing} onRefresh={currentRefetch} tintColor={colors.primary[500]} />}
          ListEmptyComponent={<EmptyState title={`No ${tab} reconditioning`} message="Nothing to display" />}
        />
      )}

      <FAB onPress={() => setShowInitForm(true)} />
      {showInitForm && <InitiateSheet onClose={() => { setShowInitForm(false); refetchAll(); }} />}
      {completeItem && <CompleteSheet item={completeItem} onClose={() => { setCompleteItem(null); refetchAll(); }} />}
    </View>
  );
}

function InitiateSheet({ onClose }: { onClose: () => void }) {
  const mutation = useInitiateReconditioning();
  const [toolPartId, setToolPartId] = useState('');
  const [reconditioningType, setReconditioningType] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const handleSubmit = () => {
    mutation.mutate(
      {
        toolPartId,
        reconditioningType: reconditioningType || undefined,
        vendorName: vendorName || undefined,
        expectedCompletionDate: expectedDate || undefined,
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
            <Text className="text-lg font-bold font-inter text-neutral-900">Initiate Reconditioning</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Tool Part ID *</Text>
          <TextInput style={styles.input} value={toolPartId} onChangeText={setToolPartId} placeholder="Select tool" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Type</Text>
          <TextInput style={styles.input} value={reconditioningType} onChangeText={setReconditioningType} placeholder="e.g. Regrind, Recoat" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Vendor</Text>
          <TextInput style={styles.input} value={vendorName} onChangeText={setVendorName} placeholder="Vendor name" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Expected Completion (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={expectedDate} onChangeText={setExpectedDate} placeholder="2026-06-01" placeholderTextColor={colors.neutral[400]} />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!toolPartId || mutation.isPending}
            style={[styles.submitBtn, (!toolPartId || mutation.isPending) && { opacity: 0.5 }]}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text className="text-sm font-bold font-inter text-white">Initiate</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function CompleteSheet({ item, onClose }: { item: any; onClose: () => void }) {
  const mutation = useCompleteReconditioning();
  const [actualDate, setActualDate] = useState('');
  const [actualCost, setActualCost] = useState('');

  const handleSubmit = () => {
    mutation.mutate(
      {
        id: item.id,
        data: {
          actualCompletionDate: actualDate || undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
        },
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
            <Text className="text-lg font-bold font-inter text-neutral-900">Complete Reconditioning</Text>
            <TouchableOpacity onPress={onClose}><X color={colors.neutral[400]} size={20} /></TouchableOpacity>
          </View>

          <Text className="text-sm font-bold font-inter text-neutral-800 mt-3">
            {item.toolName || item.tool?.name || 'Unknown Tool'}
          </Text>

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Actual Completion Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={actualDate} onChangeText={setActualDate} placeholder="2026-06-01" placeholderTextColor={colors.neutral[400]} />

          <Text className="text-xs font-medium font-inter text-neutral-600 mb-1 mt-4">Actual Cost</Text>
          <TextInput style={styles.input} value={actualCost} onChangeText={setActualCost} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.neutral[400]} />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={[styles.submitBtn, mutation.isPending && { opacity: 0.5 }]}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle color="#fff" size={16} />
                <Text className="text-sm font-bold font-inter text-white">Mark Complete</Text>
              </View>
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter', color: '#111' },
  submitBtn: { backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
