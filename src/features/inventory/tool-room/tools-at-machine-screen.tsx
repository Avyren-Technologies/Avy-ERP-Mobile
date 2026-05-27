import { useState, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Cpu } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useToolsAtMachineReport } from '@/features/inventory/api/use-inventory-queries';
import { getToolLifeLevel } from '@/features/inventory/shared/inventory-status-colors';

interface MachineSection {
  title: string;
  machineCode: string;
  data: any[];
}

export function ToolsAtMachineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fmt = useCompanyFormatter();

  const { data, isLoading, refetch, isRefetching } = useToolsAtMachineReport();
  const rawItems = (data as any)?.data || [];

  // Group by machine
  const sections: MachineSection[] = [];
  const machineMap = new Map<string, any[]>();
  rawItems.forEach((item: any) => {
    const key = item.machineName || item.machine?.name || 'Unknown Machine';
    if (!machineMap.has(key)) machineMap.set(key, []);
    machineMap.get(key)!.push(item);
  });
  machineMap.forEach((items, title) => {
    sections.push({ title, machineCode: items[0]?.machineCode || items[0]?.machine?.code || '', data: items });
  });

  const renderSectionHeader = useCallback(({ section }: { section: MachineSection }) => (
    <View style={styles.sectionHeader}>
      <Cpu color={colors.primary[500]} size={16} />
      <Text className="text-sm font-bold font-inter text-neutral-900 ml-2">{section.title}</Text>
      {section.machineCode ? (
        <Text className="text-xs font-inter text-neutral-400 ml-2">({section.machineCode})</Text>
      ) : null}
      <Text className="text-xs font-inter text-neutral-400 ml-auto">{section.data.length} tools</Text>
    </View>
  ), []);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const lifeRemainingPct = item.lifeRemainingPct != null ? Number(item.lifeRemainingPct) : 100;
    const lifeColor = getToolLifeLevel(lifeRemainingPct);

    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(250)}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text className="text-sm font-inter text-neutral-900" numberOfLines={1} style={{ flex: 1 }}>
              {item.toolName || item.part?.name || 'Unknown Tool'}
            </Text>
            <Text className="text-xs font-inter text-neutral-400">
              Spindle: {item.spindlePosition || '--'}
            </Text>
          </View>
          {/* Life progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, lifeRemainingPct))}%`, backgroundColor: lifeColor.progressColor }]} />
          </View>
          <View style={[styles.cardRow, { marginTop: 4 }]}>
            <Text className="text-[10px] font-inter text-neutral-400">
              {lifeRemainingPct.toFixed(0)}% remaining
            </Text>
            <Text className="text-[10px] font-inter text-neutral-400">
              Issued: {item.issuedAt ? fmt.date(item.issuedAt) : '--'}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }, [fmt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <LinearGradient colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]} style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3">Tools at Machine</Text>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary[500]} /></View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, padding: 16 }}>
          <EmptyState title="No tools at machines" message="No tools are currently assigned to machines" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', padding: 12, marginBottom: 8, marginLeft: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  progressBg: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
});
