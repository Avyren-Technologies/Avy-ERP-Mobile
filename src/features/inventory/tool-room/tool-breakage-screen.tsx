import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useToolBreakageReport } from '@/features/inventory/api/use-inventory-queries';

export function ToolBreakageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();

  const { data, isLoading, refetch, isRefetching } = useToolBreakageReport();
  const items = (data as any)?.data || [];

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const isSafety = item.isSafetyIncident;

    return (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <View style={[styles.card, isSafety && styles.safetyCard]}>
          {isSafety && (
            <View style={styles.safetyBanner}>
              <ShieldAlert color="#ef4444" size={14} />
              <Text className="text-[10px] font-bold font-inter text-red-700 ml-1">SAFETY INCIDENT</Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <Text className="text-sm font-bold font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolName || item.part?.name || 'Unknown Tool'}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text className="text-xs font-inter text-neutral-500">
              Machine: {item.machineName || item.machine?.name || '--'}
            </Text>
            <Text className="text-xs font-inter text-neutral-400">
              {item.breakageDate ? fmt.date(item.breakageDate) : item.createdAt ? fmt.date(item.createdAt) : '--'}
            </Text>
          </View>
          {item.breakageCause && (
            <View style={styles.causeRow}>
              <AlertTriangle color={colors.warning[500]} size={12} />
              <Text className="text-xs font-inter text-neutral-600 ml-2" numberOfLines={2}>
                {item.breakageCause}
              </Text>
            </View>
          )}
          {item.breakageNotes && (
            <Text className="text-xs font-inter text-neutral-400 mt-1" numberOfLines={2}>
              {item.breakageNotes}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }, [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tool Breakage</Text>
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
          ListEmptyComponent={<EmptyState title="No breakage incidents" message="Tool breakage records will appear here" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', padding: 14, marginBottom: 10 },
  safetyCard: { borderColor: '#fecaca', borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  safetyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, padding: 6, paddingHorizontal: 10, marginBottom: 8, alignSelf: 'flex-start' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  causeRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, backgroundColor: '#fffbeb', borderRadius: 8, padding: 8 },
});
