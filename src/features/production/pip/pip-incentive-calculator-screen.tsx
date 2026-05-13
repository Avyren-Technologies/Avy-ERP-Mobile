/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import { usePipConfig, usePipSlabConfigs } from '@/features/production/pip/api/use-pip-queries';
import { useSimulatePipIncentive } from '@/features/production/pip/api/use-pip-mutations';
import type { PipIncentiveConfig, PipSlabConfig, CalculationResult } from '@/lib/api/pip';

// ============ TYPES ============

interface PartRow {
  id: string;
  machineId: string;
  partId: string;
  qty: string;
}

interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
  machineId?: string;
}

// ============ SAMPLE CASES (dynamic from slab configs) ============

interface SlabPartInfo {
  partId: string;
  partNumber: string;
  partName: string;
  shiftTargetQty: number;
  slabTiers: any[];
}

interface SampleCase {
  title: string;
  description: string;
  scenario: string;
  color: string;
  parts: { partId: string; qty: number }[];
}

function buildSampleCases(slabParts: SlabPartInfo[]): SampleCase[] {
  if (slabParts.length === 0) return [];
  const p1 = slabParts[0];
  const p2 = slabParts.length > 1 ? slabParts[1] : slabParts[0];

  return [
    {
      title: `Below Target (${p1.partNumber})`,
      description: `${p1.partName}: ${Math.floor(p1.shiftTargetQty * 0.6)} of ${p1.shiftTargetQty} target. Single part, below 100%.`,
      scenario: 'Below target',
      color: colors.danger[500],
      parts: [{ partId: p1.partId, qty: Math.floor(p1.shiftTargetQty * 0.6) }],
    },
    {
      title: `At Target (${p1.partNumber})`,
      description: `${p1.partName}: exactly ${p1.shiftTargetQty} pcs. Meets shift target, no excess.`,
      scenario: 'Break-even',
      color: colors.info[500],
      parts: [{ partId: p1.partId, qty: p1.shiftTargetQty }],
    },
    {
      title: `Above Target (${p1.partNumber})`,
      description: `${p1.partName}: ${Math.floor(p1.shiftTargetQty * 1.3)} pcs. Exceeds target by 30%.`,
      scenario: 'Above target',
      color: colors.success[500],
      parts: [{ partId: p1.partId, qty: Math.floor(p1.shiftTargetQty * 1.3) }],
    },
    {
      title: 'Multi-Part Eligible',
      description: `${p1.partNumber} at 50% + ${p2.partNumber} at 70%. Cumulative passes 100%.`,
      scenario: 'Common case',
      color: colors.warning[500],
      parts: [
        { partId: p1.partId, qty: Math.floor(p1.shiftTargetQty * 0.5) },
        { partId: p2.partId, qty: Math.floor(p2.shiftTargetQty * 0.7) },
      ],
    },
    {
      title: 'High Performer',
      description: `${p1.partNumber} at 150% + ${p2.partNumber} at 120%. All parts exceed targets.`,
      scenario: 'Best case',
      color: colors.accent[500],
      parts: [
        { partId: p1.partId, qty: Math.floor(p1.shiftTargetQty * 1.5) },
        { partId: p2.partId, qty: Math.floor(p2.shiftTargetQty * 1.2) },
      ],
    },
  ];
}

function getSlabRate(slabTiers: any[], qty: number): number {
  if (!slabTiers.length || qty <= 0) return 0;
  let total = 0;
  let remaining = qty;
  for (const tier of slabTiers) {
    if (remaining <= 0) break;
    const tierRange = tier.toQty != null ? tier.toQty - tier.fromQty + 1 : remaining;
    const pcs = Math.min(remaining, tierRange);
    total += pcs * tier.ratePerPiece;
    remaining -= pcs;
  }
  return total;
}

function calcSampleIncentive(
  partsConfig: Map<string, SlabPartInfo>,
  caseParts: { partId: string; qty: number }[],
  methodNumber: number,
): number {
  const inputs = caseParts
    .map((cp) => {
      const cfg = partsConfig.get(cp.partId);
      if (!cfg) return null;
      return { ...cfg, qtyProduced: cp.qty };
    })
    .filter(Boolean) as (SlabPartInfo & { qtyProduced: number })[];
  if (!inputs.length) return 0;

  const cumulativeRatio = inputs.reduce(
    (s, p) => s + (p.shiftTargetQty > 0 ? p.qtyProduced / p.shiftTargetQty : 0),
    0,
  );

  if (methodNumber === 1) {
    if (cumulativeRatio < 1) return 0;
    let totalIncentive = 0;
    const sorted = [...inputs].sort(
      (a, b) => a.qtyProduced / (a.shiftTargetQty || 1) - b.qtyProduced / (b.shiftTargetQty || 1),
    );
    let runningRatio = 0;
    for (const p of sorted) {
      const pctContrib = p.shiftTargetQty > 0 ? p.qtyProduced / p.shiftTargetQty : 0;
      const prev = runningRatio;
      runningRatio += pctContrib;
      let earningQty = 0;
      if (prev >= 1) earningQty = p.qtyProduced;
      else if (runningRatio > 1) earningQty = Math.max(0, p.qtyProduced - Math.ceil((1 - prev) * p.shiftTargetQty));
      const excessAboveTarget = Math.max(0, p.qtyProduced - p.shiftTargetQty);
      const slab1Earning = Math.max(0, earningQty - excessAboveTarget);
      const slab1Rate = p.slabTiers.length > 0 ? p.slabTiers[0].ratePerPiece : 0;
      totalIncentive += slab1Earning * slab1Rate + (excessAboveTarget > 0 ? getSlabRate(p.slabTiers, excessAboveTarget) : 0);
    }
    return totalIncentive;
  }

  if (methodNumber === 2) {
    const milestones = [100, 75, 50, 25];
    let totalMilestonePct = 0;
    let totalIncentive = 0;
    const partCalcs = inputs.map((p) => {
      const pct = p.shiftTargetQty > 0 ? (p.qtyProduced / p.shiftTargetQty) * 100 : 0;
      const milestone = milestones.find((m) => pct >= m) ?? 0;
      const milestoneQty = Math.floor((milestone / 100) * p.shiftTargetQty);
      const remainingQty = Math.max(0, p.qtyProduced - milestoneQty);
      totalMilestonePct += milestone;
      return { ...p, milestone, milestoneQty, remainingQty };
    });
    const milestoneEligible = totalMilestonePct >= 100;
    for (const p of partCalcs) {
      if (milestoneEligible && p.remainingQty > 0) {
        const excessAboveTarget = Math.max(0, p.qtyProduced - p.shiftTargetQty);
        if (excessAboveTarget > 0) totalIncentive += getSlabRate(p.slabTiers, excessAboveTarget);
        const slab1Earning = Math.max(0, p.remainingQty - excessAboveTarget);
        const slab1Rate = p.slabTiers.length > 0 ? p.slabTiers[0].ratePerPiece : 0;
        totalIncentive += slab1Earning * slab1Rate;
      }
    }
    return totalIncentive;
  }

  return 0;
}

// ============ MAIN COMPONENT ============

export function PipIncentiveCalculatorScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  // Data
  const { data: configRaw } = usePipConfig();
  const config: PipIncentiveConfig | null = React.useMemo(() => {
    const d = (configRaw as any)?.data ?? configRaw;
    return d as PipIncentiveConfig | null;
  }, [configRaw]);

  const { data: slabsRaw } = usePipSlabConfigs();
  const slabConfigs: PipSlabConfig[] = React.useMemo(() => {
    const raw = (slabsRaw as any)?.data ?? slabsRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [slabsRaw]);

  // Part options derived from slab configs
  const partOptions: DropdownOption[] = React.useMemo(() => {
    return slabConfigs
      .filter((sc) => sc.isActive)
      .map((sc) => ({
        id: sc.id, // Use slab config ID as unique key
        label: sc.part?.name ?? '',
        sublabel: `${sc.part?.partNumber ?? ''} | ${sc.machine?.assetName ?? ''} (Target: ${sc.shiftTargetQty})`,
        machineId: sc.machineId,
        partId: sc.partId,
      }));
  }, [slabConfigs]);

  // State
  const [rows, setRows] = React.useState<PartRow[]>([
    { id: '1', machineId: '', partId: '', qty: '' },
  ]);
  const [result, setResult] = React.useState<CalculationResult | null>(null);
  const [showDropdown, setShowDropdown] = React.useState<string | null>(null);

  const simulate = useSimulatePipIncentive();

  // Build slab parts map for dynamic sample cases
  const slabPartsMap = React.useMemo(() => {
    const map = new Map<string, SlabPartInfo>();
    for (const s of slabConfigs) {
      if (!s.isActive || !s.part) continue;
      map.set(s.partId, {
        partId: s.partId,
        partNumber: s.part.partNumber ?? '',
        partName: s.part.name ?? '',
        shiftTargetQty: s.shiftTargetQty,
        slabTiers: (s as any).slabTiers ?? [],
      });
    }
    return map;
  }, [slabConfigs]);

  const slabPartsArray = React.useMemo(() => Array.from(slabPartsMap.values()), [slabPartsMap]);
  const sampleCases = React.useMemo(() => buildSampleCases(slabPartsArray), [slabPartsArray]);

  const methodActive = config?.method1Enabled || config?.method2Enabled;
  const activeMethodNumber = config?.method1Enabled ? 1 : config?.method2Enabled ? 2 : null;
  const methodLabel = config?.method1Enabled
    ? config.method1Name || 'Method 1'
    : config?.method2Enabled
      ? config.method2Name || 'Method 2'
      : 'None';

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: String(Date.now()), machineId: '', partId: '', qty: '' },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, slabConfig: any) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, machineId: slabConfig.machineId, partId: slabConfig.partId ?? slabConfig.id }
          : r,
      ),
    );
    setShowDropdown(null);
  };

  const updateQty = (id: string, qty: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
  };

  const handleCalculate = () => {
    const entries = rows
      .filter((r) => r.partId && Number(r.qty) > 0)
      .map((r) => {
        const sc = slabConfigs.find(
          (s) => s.partId === r.partId && s.machineId === r.machineId,
        );
        return {
          machineId: r.machineId,
          partId: r.partId,
          qtyProduced: Number(r.qty),
          slabConfigId: sc?.id,
        };
      });

    if (entries.length === 0) return;

    simulate.mutate(
      { entries },
      {
        onSuccess: (data: any) => {
          const d = data?.data ?? data;
          setResult(d as CalculationResult);
        },
      },
    );
  };

  const getPartLabel = (row: PartRow): string => {
    if (!row.partId) return 'Select part...';
    const sc = slabConfigs.find(
      (s) => s.partId === row.partId && s.machineId === row.machineId,
    );
    return sc?.part?.name ?? 'Unknown';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppTopHeader
            title="Incentive Calculator"
            subtitle="Simulate incentive calculations"
            onMenuPress={toggle}
            rightSlot={
              methodActive ? (
                <View style={[styles.headerBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text className="font-inter text-[9px] font-bold text-white">
                    {methodLabel}
                  </Text>
                </View>
              ) : undefined
            }
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Warning when no method active */}
          {!methodActive && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <View
                style={[
                  styles.warningBanner,
                  {
                    backgroundColor: isDark ? '#3D2E0A' : colors.warning[50],
                    borderColor: isDark ? colors.warning[700] : colors.warning[200],
                  },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                    stroke={colors.warning[600]}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text className="ml-2 flex-1 font-inter text-xs font-semibold text-warning-700 dark:text-warning-300">
                  No incentive method is active. Enable a method in Incentive Configuration first.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Part Rows */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text className="mb-3 font-inter text-base font-bold text-primary-950 dark:text-white">
              Simulate Production
            </Text>

            {rows.map((row, idx) => (
              <View
                key={row.id}
                style={[
                  styles.partRow,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <View style={styles.partRowHeader}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">
                    PART {idx + 1}
                  </Text>
                  {rows.length > 1 && (
                    <Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
                      <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={colors.danger[500]}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </Svg>
                    </Pressable>
                  )}
                </View>

                {/* Part Selector */}
                <Pressable
                  onPress={() => setShowDropdown(showDropdown === row.id ? null : row.id)}
                  style={[
                    styles.selector,
                    {
                      backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                      borderColor: showDropdown === row.id ? colors.primary[400] : isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                >
                  <Text
                    className={`flex-1 font-inter text-sm ${row.partId ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                  >
                    {getPartLabel(row)}
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path
                      d={showDropdown === row.id ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                      stroke={colors.neutral[400]}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>

                {showDropdown === row.id && (
                  <View style={[styles.dropdown, { backgroundColor: isDark ? '#1A1730' : colors.white }]}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                      {partOptions.map((opt) => (
                        <Pressable
                          key={opt.id}
                          onPress={() => updateRow(row.id, {
                            machineId: opt.machineId,
                            partId: (opt as any).partId ?? opt.id,
                            ...opt,
                          })}
                          style={[
                            styles.dropdownItem,
                            { borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm text-primary-950 dark:text-white">
                              {opt.label}
                            </Text>
                            {opt.sublabel && (
                              <Text className="font-inter text-[10px] text-neutral-500">
                                {opt.sublabel}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Qty Input */}
                <View style={{ marginTop: 10 }}>
                  <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                    Quantity Produced
                  </Text>
                  <TextInput
                    style={[
                      styles.qtyInput,
                      {
                        backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                        color: isDark ? colors.white : colors.primary[950],
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                    value={row.qty}
                    onChangeText={(v) => updateQty(row.id, v)}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                    placeholderTextColor={colors.neutral[400]}
                  />
                </View>
              </View>
            ))}

            {/* Add Part */}
            <Pressable onPress={addRow} style={styles.addRowBtn}>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" />
              </Svg>
              <Text className="ml-1 font-inter text-xs font-bold text-primary-600">
                Add Part
              </Text>
            </Pressable>

            {/* Calculate Button */}
            <Pressable
              style={({ pressed }) => [
                styles.calcBtn,
                pressed && { opacity: 0.85 },
                (simulate.isPending || !methodActive) && { opacity: 0.6 },
              ]}
              onPress={handleCalculate}
              disabled={simulate.isPending || !methodActive}
            >
              {simulate.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-inter text-base font-bold text-white">Calculate</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Result Card */}
          {result && (
            <Animated.View entering={FadeInUp.duration(400)}>
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.primary[900] : colors.primary[200],
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    Calculation Result
                  </Text>
                  <View
                    style={[
                      styles.eligibilityBadge,
                      {
                        backgroundColor: result.isEligible ? colors.success[50] : colors.danger[50],
                      },
                    ]}
                  >
                    <Text
                      className="font-inter text-[10px] font-bold"
                      style={{ color: result.isEligible ? colors.success[700] : colors.danger[700] }}
                    >
                      {result.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultGrid}>
                  <View style={[styles.resultMetric, { backgroundColor: isDark ? '#0F0D1A' : colors.success[50] }]}>
                    <Text className="font-inter text-[10px] text-neutral-500">Total Incentive</Text>
                    <Text className="font-inter text-xl font-bold text-success-700">
                      Rs {result.totalIncentive.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.resultMetric, { backgroundColor: isDark ? '#0F0D1A' : colors.info[50] }]}>
                    <Text className="font-inter text-[10px] text-neutral-500">Cumulative Ratio</Text>
                    <Text className="font-inter text-xl font-bold text-info-700">
                      {(result.cumulativeRatio * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Per-part breakdown */}
                {result.parts?.map((p, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.breakdownRow,
                      { borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">
                        {p.partName}
                      </Text>
                      <Text className="font-inter text-[10px] text-neutral-500">
                        {p.qtyProduced}/{p.shiftTargetQty} ({p.achievementPct.toFixed(0)}%) | Excess: {p.earningQty}
                      </Text>
                      {p.breakdown && (
                        <Text className="mt-1 font-inter text-[10px] text-neutral-400 dark:text-neutral-500">
                          {p.breakdown}
                        </Text>
                      )}
                    </View>
                    <Text className="font-inter text-sm font-bold text-success-700">
                      Rs {p.incentiveAmount.toFixed(2)}
                    </Text>
                  </View>
                ))}

                {/* Method used */}
                <View style={styles.methodUsedRow}>
                  <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                    Method: {result.methodUsed} (Method {result.methodNumber})
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Sample Cases */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text className="mb-3 mt-6 font-inter text-sm font-bold text-primary-950 dark:text-white">
              Sample Scenarios
            </Text>
            {sampleCases.length === 0 ? (
              <View
                style={[
                  styles.sampleCard,
                  {
                    width: '100%',
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                  Configure slab rates to see sample calculations
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 8 }}
              >
                {sampleCases.map((sc, idx) => {
                  const incentiveAmt = activeMethodNumber
                    ? calcSampleIncentive(slabPartsMap, sc.parts, activeMethodNumber)
                    : 0;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.sampleCard,
                        {
                          backgroundColor: isDark ? '#1A1730' : colors.white,
                          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <View style={[styles.sampleDot, { backgroundColor: sc.color }]} />
                      <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                        {sc.title}
                      </Text>
                      <Text
                        className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400"
                        numberOfLines={3}
                      >
                        {sc.description}
                      </Text>
                      {activeMethodNumber ? (
                        <Text
                          className="font-inter text-xs font-bold"
                          style={{ color: incentiveAmt > 0 ? colors.success[600] : colors.neutral[400] }}
                        >
                          Rs {incentiveAmt.toFixed(2)}
                        </Text>
                      ) : null}
                      <View style={[styles.scenarioBadge, { backgroundColor: `${sc.color}15` }]}>
                        <Text className="font-inter text-[9px] font-bold" style={{ color: sc.color }}>
                          {sc.scenario}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    headerBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
    },
    partRow: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
    },
    partRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    dropdown: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary[200],
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 20,
      overflow: 'hidden',
    },
    dropdownItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    qtyInput: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: '600',
    },
    addRowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      marginBottom: 12,
    },
    calcBtn: {
      backgroundColor: colors.primary[600],
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    resultCard: {
      borderRadius: 20,
      borderWidth: 1.5,
      padding: 16,
      marginBottom: 8,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    eligibilityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    resultGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    resultMetric: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    methodUsedRow: {
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[100],
    },
    sampleCard: {
      width: 200,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      gap: 6,
    },
    sampleDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    scenarioBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 4,
    },
  });
