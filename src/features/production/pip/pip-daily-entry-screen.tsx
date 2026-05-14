/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
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
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { HamburgerButton } from '@/components/ui/sidebar';
import { showWarning } from '@/components/ui/utils';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import {
  usePipConfig,
  usePipSlabConfigs,
  usePipDailyEntries,
} from '@/features/production/pip/api/use-pip-queries';
import { useSavePipDailyEntries } from '@/features/production/pip/api/use-pip-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import type { PipIncentiveConfig, PipSlabConfig } from '@/lib/api/pip';

// ============ TYPES ============

interface OperatorOption {
  id: string;
  name: string;
  initials: string;
  employeeNumber?: string;
}

interface MachineOption {
  id: string;
  code: string;
  name: string;
}

interface PartEntry {
  partId: string;
  partNumber: string;
  partName: string;
  slabConfigId: string;
  shiftTargetQty: number;
  qtyProduced: string;
  ncCount: string;
}

interface MachineSession {
  machineId: string;
  machineName: string;
  machineCode: string;
  parts: PartEntry[];
}

// ============ HELPERS ============

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Move a calendar day by `delta` (-1 / +1) while keeping YYYY-MM-DD in local date. */
function bumpCalendarDay(ymd: string, delta: number): string {
  const [y, mo, da] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + delta);
  return formatDate(dt);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getActiveMethodBadge(config: PipIncentiveConfig | null): { label: string; color: string } {
  if (!config) return { label: 'Not configured', color: colors.neutral[400] };
  if (config.method1Enabled) return { label: config.method1Name || 'Method 1', color: colors.primary[400] };
  if (config.method2Enabled) return { label: config.method2Name || 'Method 2', color: colors.warning[400] };
  return { label: 'No method active', color: colors.danger[400] };
}

// ============ WIZARD STEPS ============

const STEPS = ['Operator', 'Machine', 'Quantities', 'Review', 'Save'] as const;
type StepName = (typeof STEPS)[number];

// ============ MAIN COMPONENT ============

export function PipDailyEntryScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  // Must match custom tab bar height in src/app/(app)/_layout.tsx (TabLayoutInner)
  const tabBarHeight = (Platform.OS === 'ios' ? 54 : 68) + insets.bottom;
  const { toggle } = useSidebar();
  const confirmModal = useConfirmModal();

  // State
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState(formatDate(new Date()));
  const [selectedShift, setSelectedShift] = React.useState('');
  const [selectedOperator, setSelectedOperator] = React.useState<OperatorOption | null>(null);
  const [machineSessions, setMachineSessions] = React.useState<MachineSession[]>([]);
  const [currentMachineId, setCurrentMachineId] = React.useState('');
  const [operatorSearch, setOperatorSearch] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Data fetching
  const { data: configRaw } = usePipConfig();
  const config: PipIncentiveConfig | null = React.useMemo(() => {
    const d = (configRaw as any)?.data ?? configRaw;
    return d as PipIncentiveConfig | null;
  }, [configRaw]);

  const { data: slabsRaw, isLoading: slabsLoading } = usePipSlabConfigs();
  const slabConfigs: PipSlabConfig[] = React.useMemo(() => {
    const raw = (slabsRaw as any)?.data ?? slabsRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [slabsRaw]);

  const { data: employeesRaw, isLoading: employeesLoading } = useEmployees({
    limit: 100,
  });
  const operators: OperatorOption[] = React.useMemo(() => {
    const raw = (employeesRaw as any)?.data ?? employeesRaw ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id ?? '',
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.email || 'Unknown',
      initials: getInitials(`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || '?'),
      employeeNumber: e.employeeNumber ?? '',
    }));
  }, [employeesRaw]);

  const saveMutation = useSavePipDailyEntries();

  // Fetch company shifts and auto-select based on current time (PRD 17.8)
  const { data: shiftsRaw } = useCompanyShifts();
  const shifts = React.useMemo(() => {
    const raw = (shiftsRaw as any)?.data ?? shiftsRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [shiftsRaw]);

  const fmt = useCompanyFormatter();
  const dailyEntriesParams = React.useMemo(
    () => ({
      entryDate: selectedDate,
      ...(selectedShift ? { shiftId: selectedShift } : {}),
      limit: 200,
    }),
    [selectedDate, selectedShift],
  );
  const { data: todayEntriesRaw, isLoading: entriesLoading } = usePipDailyEntries(
    dailyEntriesParams,
    { enabled: Boolean(selectedDate && selectedShift) },
  );
  const todayEntries = React.useMemo(() => {
    const raw = (todayEntriesRaw as any)?.data ?? todayEntriesRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [todayEntriesRaw]);

  const selectedShiftName = React.useMemo(() => {
    const s = (shifts as any[]).find((x: any) => x.id === selectedShift);
    return s?.name as string | undefined;
  }, [shifts, selectedShift]);

  React.useEffect(() => {
    if (shifts.length > 0 && !selectedShift) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const matchedShift = shifts.find((shift: any) => {
        const [startH, startM] = (shift.startTime || '00:00').split(':').map(Number);
        const [endH, endM] = (shift.endTime || '23:59').split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (shift.isCrossDay) {
          return currentTime >= startMinutes || currentTime < endMinutes;
        }
        return currentTime >= startMinutes && currentTime < endMinutes;
      });

      if (matchedShift) {
        setSelectedShift(matchedShift.id);
      } else {
        setSelectedShift(shifts[0].id);
      }
    }
  }, [shifts, selectedShift]);

  // Derive machines from slab configs
  const availableMachines: MachineOption[] = React.useMemo(() => {
    const seen = new Map<string, MachineOption>();
    slabConfigs.forEach((sc) => {
      if (sc.machine && !seen.has(sc.machineId)) {
        seen.set(sc.machineId, {
          id: sc.machineId,
          code: sc.machine.assetCode,
          name: sc.machine.assetName,
        });
      }
    });
    return Array.from(seen.values());
  }, [slabConfigs]);

  // Parts for selected machine
  const partsForMachine = React.useMemo(() => {
    if (!currentMachineId) return [];
    return slabConfigs
      .filter((sc) => sc.machineId === currentMachineId && sc.isActive)
      .map((sc) => ({
        partId: sc.partId,
        partNumber: sc.part?.partNumber ?? '',
        partName: sc.part?.name ?? '',
        slabConfigId: sc.id,
        shiftTargetQty: sc.shiftTargetQty,
      }));
  }, [slabConfigs, currentMachineId]);

  const filteredOperators = React.useMemo(() => {
    if (!operatorSearch.trim()) return operators;
    const q = operatorSearch.toLowerCase();
    return operators.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.employeeNumber ?? '').toLowerCase().includes(q),
    );
  }, [operators, operatorSearch]);

  const methodBadge = getActiveMethodBadge(config);

  // Calculate totals for review
  const sessionTotals = React.useMemo(() => {
    let totalProduced = 0;
    let totalTarget = 0;
    machineSessions.forEach((ms) => {
      ms.parts.forEach((p) => {
        const qty = Number(p.qtyProduced) || 0;
        totalProduced += qty;
        totalTarget += p.shiftTargetQty;
      });
    });
    const achievementPct = totalTarget > 0 ? ((totalProduced / totalTarget) * 100).toFixed(1) : '0.0';
    return { totalProduced, totalTarget, achievementPct };
  }, [machineSessions]);

  // Navigation
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const selectMachine = (machine: MachineOption) => {
    setCurrentMachineId(machine.id);
    // Initialize parts for this machine if not already in sessions
    const existing = machineSessions.find((ms) => ms.machineId === machine.id);
    if (!existing) {
      const parts = slabConfigs
        .filter((sc) => sc.machineId === machine.id && sc.isActive)
        .map((sc) => ({
          partId: sc.partId,
          partNumber: sc.part?.partNumber ?? '',
          partName: sc.part?.name ?? '',
          slabConfigId: sc.id,
          shiftTargetQty: sc.shiftTargetQty,
          qtyProduced: '',
          ncCount: '0',
        }));
      setMachineSessions((prev) => [
        ...prev,
        {
          machineId: machine.id,
          machineName: machine.name,
          machineCode: machine.code,
          parts,
        },
      ]);
    }
    goNext();
  };

  const updatePartQty = (machineId: string, partId: string, field: 'qtyProduced' | 'ncCount', value: string) => {
    setMachineSessions((prev) =>
      prev.map((ms) =>
        ms.machineId === machineId
          ? {
              ...ms,
              parts: ms.parts.map((p) =>
                p.partId === partId ? { ...p, [field]: value } : p,
              ),
            }
          : ms,
      ),
    );
  };

  const removeMachineSession = (machineId: string) => {
    setMachineSessions((prev) => prev.filter((ms) => ms.machineId !== machineId));
  };

  const handleSave = () => {
    if (!selectedOperator || machineSessions.length === 0) return;
    if (shifts.length > 0 && !selectedShift) {
      showWarning('Select shift', 'Choose a shift before saving production entries.');
      return;
    }

    const entries = machineSessions.flatMap((ms) =>
      ms.parts
        .filter((p) => Number(p.qtyProduced) > 0)
        .map((p) => ({
          machineId: ms.machineId,
          partId: p.partId,
          slabConfigId: p.slabConfigId,
          qtyProduced: Number(p.qtyProduced),
          ncCount: Number(p.ncCount) || 0,
        })),
    );

    if (entries.length === 0) return;

    setIsSaving(true);
    saveMutation.mutate(
      {
        entryDate: selectedDate,
        shiftId: selectedShift,
        operatorId: selectedOperator.id,
        entries,
      },
      {
        onSuccess: () => {
          setIsSaving(false);
          // Reset wizard
          setCurrentStep(0);
          setSelectedOperator(null);
          setMachineSessions([]);
          setCurrentMachineId('');
        },
        onSettled: () => setIsSaving(false),
      },
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedOperator;
      case 1: return machineSessions.length > 0;
      case 2: return machineSessions.some((ms) => ms.parts.some((p) => Number(p.qtyProduced) > 0));
      case 3: {
        if (shifts.length > 0 && !selectedShift) return false;
        return true;
      }
      default: return false;
    }
  };

  // Loading state
  if (slabsLoading || employeesLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <HamburgerButton onPress={toggle} />
            <Text className="font-inter text-lg font-bold text-white">Daily Production Entry</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={{ padding: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />

        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <View style={styles.headerCenter}>
            <Text className="font-inter text-lg font-bold text-white">Daily Production Entry</Text>
            <Text className="font-inter text-[11px] text-white/80" numberOfLines={1}>
              {fmt.date(`${selectedDate}T12:00:00.000Z`)}
              {selectedShiftName ? ` · ${selectedShiftName}` : ''}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Method Badge */}
        <View style={styles.methodBadgeRow}>
          <View style={[styles.methodBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={[styles.methodDot, { backgroundColor: methodBadge.color }]} />
            <Text className="font-inter text-[11px] font-semibold text-white">
              {methodBadge.label}
            </Text>
          </View>
        </View>

        {/* Step Indicators */}
        <View style={styles.stepRow}>
          {STEPS.map((step, idx) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: idx <= currentStep ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Text
                  className="font-inter text-[10px] font-bold"
                  style={{ color: idx <= currentStep ? colors.primary[600] : 'rgba(255,255,255,0.5)' }}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text
                className="mt-1 font-inter text-[9px]"
                style={{ color: idx <= currentStep ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date & shift (matches web Daily Production Entry) */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
            Entry date
          </Text>
          <View style={styles.dateNavRow}>
            <Pressable
              onPress={() => setSelectedDate((d) => bumpCalendarDay(d, -1))}
              style={({ pressed }) => [styles.dateArrowBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                {fmt.date(`${selectedDate}T12:00:00.000Z`)}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedDate((d) => bumpCalendarDay(d, 1))}
              style={({ pressed }) => [styles.dateArrowBtn, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M9 6l6 6-6 6" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>

          {shifts.length > 0 && (
            <>
              <Text className="mb-2 mt-4 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Shift
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {(shifts as any[]).map((shift: any) => {
                  const active = selectedShift === shift.id;
                  return (
                    <Pressable
                      key={shift.id}
                      onPress={() => setSelectedShift(shift.id)}
                      style={[
                        styles.shiftChip,
                        {
                          backgroundColor: active
                            ? colors.primary[600]
                            : isDark ? '#1A1730' : colors.white,
                          borderColor: active ? colors.primary[600] : isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <Text
                        className="font-inter text-xs font-semibold"
                        style={{ color: active ? colors.white : isDark ? colors.neutral[200] : colors.primary[950] }}
                        numberOfLines={1}
                      >
                        {shift.name ?? 'Shift'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={[styles.savedSection, { borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
            <View style={styles.savedSectionHeader}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                Saved entries
              </Text>
              {todayEntries.length > 0 && (
                <View style={styles.savedCountBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-700">{todayEntries.length}</Text>
                </View>
              )}
            </View>
            {!selectedShift ? (
              <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                Select a shift to load saved production for this date.
              </Text>
            ) : entriesLoading ? (
              <ActivityIndicator color={colors.primary[600]} style={{ marginVertical: 12 }} />
            ) : todayEntries.length === 0 ? (
              <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                No saved entries for this date and shift yet.
              </Text>
            ) : (
              todayEntries.map((entry: any) => {
                const opName = entry.operator
                  ? `${entry.operator.firstName ?? ''} ${entry.operator.lastName ?? ''}`.trim()
                  : '';
                const machineLabel = entry.slabConfig?.machine?.assetCode ?? entry.machineId ?? '';
                const partNo = entry.slabConfig?.part?.partNumber ?? entry.partId ?? '';
                const partName = entry.slabConfig?.part?.name ?? '';
                const ach = Number(entry.achievementPct ?? 0);
                return (
                  <View
                    key={entry.id ?? `${opName}-${partNo}-${entry.qtyProduced}`}
                    style={[
                      styles.savedRowCard,
                      {
                        backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                        borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white" numberOfLines={1}>
                        {opName || '—'}
                      </Text>
                      <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                        {machineLabel} · {partNo}
                        {partName ? ` — ${partName}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                        {entry.qtyProduced ?? 0} pcs
                      </Text>
                      <Text className="font-inter text-[10px] text-neutral-500">
                        {ach.toFixed(0)}% · Rs {Number(entry.incentiveAmount ?? 0).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Step 0: Select Operator */}
        {currentStep === 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-4 font-inter text-base font-bold text-primary-950 dark:text-white">
              Select Operator
            </Text>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDark ? '#1A1730' : colors.white,
                  color: isDark ? colors.white : colors.primary[950],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
              placeholder="Search by name or employee number..."
              placeholderTextColor={colors.neutral[400]}
              value={operatorSearch}
              onChangeText={setOperatorSearch}
            />
            {filteredOperators.map((op) => (
              <Pressable
                key={op.id}
                onPress={() => setSelectedOperator(op)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: selectedOperator?.id === op.id
                      ? isDark ? colors.primary[900] : colors.primary[50]
                      : isDark ? '#1A1730' : colors.white,
                    borderColor: selectedOperator?.id === op.id
                      ? colors.primary[400]
                      : isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: selectedOperator?.id === op.id
                        ? colors.primary[600]
                        : isDark ? colors.primary[900] : colors.primary[100],
                    },
                  ]}
                >
                  <Text
                    className="font-inter text-xs font-bold"
                    style={{ color: selectedOperator?.id === op.id ? colors.white : colors.primary[600] }}
                  >
                    {op.initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                    {op.name}
                  </Text>
                  {op.employeeNumber ? (
                    <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                      {op.employeeNumber}
                    </Text>
                  ) : null}
                </View>
                {selectedOperator?.id === op.id && (
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      d="M5 12l5 5L20 7"
                      stroke={colors.primary[600]}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Step 1: Select Machine */}
        {currentStep === 1 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-2 font-inter text-base font-bold text-primary-950 dark:text-white">
              Select Machine
            </Text>
            <Text className="mb-4 font-inter text-xs text-neutral-500 dark:text-neutral-400">
              Only machines with slab configurations are shown. Tap to add.
            </Text>

            {/* Already added machines */}
            {machineSessions.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text className="mb-2 font-inter text-xs font-bold text-success-700">
                  Added ({machineSessions.length})
                </Text>
                {machineSessions.map((ms) => (
                  <View
                    key={ms.machineId}
                    style={[
                      styles.addedMachine,
                      { backgroundColor: isDark ? colors.success[900] : colors.success[50] },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-sm font-semibold text-success-700">
                        {ms.machineName}
                      </Text>
                      <Text className="font-inter text-[11px] text-success-600">
                        {ms.machineCode} - {ms.parts.length} part(s)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeMachineSession(ms.machineId)}
                      hitSlop={8}
                    >
                      <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={colors.danger[500]}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </Svg>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Available machines */}
            {availableMachines
              .filter((m) => !machineSessions.find((ms) => ms.machineId === m.id))
              .map((machine) => (
                <Pressable
                  key={machine.id}
                  onPress={() => selectMachine(machine)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? '#1A1730' : colors.white,
                      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                      {machine.name}
                    </Text>
                    <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                      {machine.code}
                    </Text>
                  </View>
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      d="M12 5v14M5 12h14"
                      stroke={colors.primary[500]}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </Svg>
                </Pressable>
              ))}

            {availableMachines.length === 0 && (
              <EmptyState
                icon="inbox"
                title="No machines available"
                message="Configure slab tiers for machines first."
              />
            )}
          </Animated.View>
        )}

        {/* Step 2: Enter Quantities */}
        {currentStep === 2 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-4 font-inter text-base font-bold text-primary-950 dark:text-white">
              Enter Quantities
            </Text>

            {machineSessions.map((ms) => (
              <View key={ms.machineId} style={{ marginBottom: 20 }}>
                <View
                  style={[
                    styles.machineHeader,
                    { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                  ]}
                >
                  <Text className="font-inter text-xs font-bold text-primary-700">
                    {ms.machineName} ({ms.machineCode})
                  </Text>
                </View>

                {ms.parts.map((part) => {
                  const qty = Number(part.qtyProduced) || 0;
                  const pct = part.shiftTargetQty > 0 ? (qty / part.shiftTargetQty) * 100 : 0;
                  const pctColor = pct >= 100 ? colors.success[500] : pct >= 80 ? colors.warning[500] : colors.danger[500];

                  return (
                    <View
                      key={part.partId}
                      style={[
                        styles.partCard,
                        {
                          backgroundColor: isDark ? '#1A1730' : colors.white,
                          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                    >
                      <View style={styles.partHeader}>
                        <View style={[styles.partBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
                          <Text className="font-inter text-[10px] font-bold text-accent-700">
                            {part.partNumber}
                          </Text>
                        </View>
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                          Target: {part.shiftTargetQty} pcs
                        </Text>
                      </View>
                      <Text className="mb-2 font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
                        {part.partName}
                      </Text>

                      <View style={styles.qtyRow}>
                        <View style={{ flex: 2 }}>
                          <Text className="font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                            Qty Produced
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
                            value={part.qtyProduced}
                            onChangeText={(v) => updatePartQty(ms.machineId, part.partId, 'qtyProduced', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.neutral[400]}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                            NC Count
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
                            value={part.ncCount}
                            onChangeText={(v) => updatePartQty(ms.machineId, part.partId, 'ncCount', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.neutral[400]}
                          />
                        </View>
                      </View>

                      {/* Progress bar */}
                      <View style={styles.progressRow}>
                        <View style={[styles.progressBg, { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min(pct, 100)}%`, backgroundColor: pctColor },
                            ]}
                          />
                        </View>
                        <Text
                          className="ml-2 font-inter text-[11px] font-bold"
                          style={{ color: pctColor }}
                        >
                          {pct.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-4 font-inter text-base font-bold text-primary-950 dark:text-white">
              Session Review
            </Text>

            {/* Operator card */}
            <View
              style={[
                styles.reviewCard,
                {
                  backgroundColor: isDark ? '#1A1730' : colors.white,
                  borderColor: isDark ? colors.primary[900] : colors.primary[100],
                },
              ]}
            >
              <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Operator</Text>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                {selectedOperator?.name}
              </Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.primary[50] }]}>
                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Total Produced</Text>
                <Text className="font-inter text-lg font-bold text-primary-700">{sessionTotals.totalProduced}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.accent[50] }]}>
                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Total Target</Text>
                <Text className="font-inter text-lg font-bold text-accent-700">{sessionTotals.totalTarget}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.success[50] }]}>
                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Achievement</Text>
                <Text className="font-inter text-lg font-bold text-success-700">{sessionTotals.achievementPct}%</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.info[50] }]}>
                <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Machines</Text>
                <Text className="font-inter text-lg font-bold text-info-700">{machineSessions.length}</Text>
              </View>
            </View>

            {/* Machine breakdowns */}
            {machineSessions.map((ms) => (
              <View
                key={ms.machineId}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <Text className="mb-2 font-inter text-sm font-bold text-primary-950 dark:text-white">
                  {ms.machineName} ({ms.machineCode})
                </Text>
                {ms.parts.map((p) => {
                  const qty = Number(p.qtyProduced) || 0;
                  return (
                    <View key={p.partId} style={styles.reviewPartRow}>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">
                          {p.partName}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500">{p.partNumber}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                          {qty} / {p.shiftTargetQty}
                        </Text>
                        {Number(p.ncCount) > 0 && (
                          <Text className="font-inter text-[10px] text-danger-500">
                            NC: {p.ncCount}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Step 4: Saved */}
        {currentStep === 4 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={styles.savedContainer}>
              <View style={[styles.savedIcon, { backgroundColor: colors.success[50] }]}>
                <Svg width={32} height={32} viewBox="0 0 24 24">
                  <Path
                    d="M5 12l5 5L20 7"
                    stroke={colors.success[600]}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text className="mt-4 font-inter text-lg font-bold text-primary-950 dark:text-white">
                Entries Saved
              </Text>
              <Text className="mt-2 text-center font-inter text-sm text-neutral-500 dark:text-neutral-400">
                Production entries have been recorded successfully.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.newEntryBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  setCurrentStep(0);
                  setSelectedOperator(null);
                  setMachineSessions([]);
                  setCurrentMachineId('');
                }}
              >
                <Text className="font-inter text-sm font-bold text-white">New Entry</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      {currentStep < 4 && (
        <View style={[styles.bottomBar, { paddingBottom: tabBarHeight + 12 }]}>
          <View style={styles.btnRow}>
            {currentStep > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: isDark ? '#1A1730' : colors.neutral[100] },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={goBack}
              >
                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  Back
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                { flex: currentStep > 0 ? 2 : 1 },
                pressed && { opacity: 0.85 },
                (!canProceed() || isSaving) && { opacity: 0.6 },
              ]}
              onPress={() => {
                if (currentStep === 3) handleSave();
                else goNext();
              }}
              disabled={!canProceed() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-inter text-base font-bold text-white">
                  {currentStep === 3 ? 'Save Entries' : currentStep === 1 ? 'Continue to Quantities' : 'Next'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <ConfirmModal {...confirmModal.modalProps} />
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
    headerGradient: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
    },
    headerDecor1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
      position: 'absolute',
      bottom: -20,
      left: -20,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    methodBadgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 10,
    },
    methodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      gap: 6,
    },
    methodDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stepRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 14,
      paddingHorizontal: 8,
    },
    stepItem: {
      alignItems: 'center',
    },
    stepCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    searchInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      marginBottom: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 14,
      marginBottom: 8,
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addedMachine: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
    },
    machineHeader: {
      borderRadius: 10,
      padding: 10,
      marginBottom: 8,
    },
    partCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 8,
    },
    partHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    partBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    qtyRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    qtyInput: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 4,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    reviewCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    summaryCard: {
      width: '48%',
      borderRadius: 12,
      padding: 12,
      flexGrow: 1,
      flexBasis: '45%',
    },
    reviewPartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[100],
    },
    savedContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    savedIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newEntryBtn: {
      marginTop: 24,
      backgroundColor: colors.primary[600],
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    dateNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateArrowBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    shiftChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    savedSection: {
      marginTop: 20,
      marginBottom: 8,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    savedSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    savedCountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: isDark ? colors.primary[900] : colors.primary[100],
    },
    savedRowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
      gap: 8,
    },
    savedEntryCard: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      marginBottom: 6,
    },
    bottomBar: {
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[100],
      backgroundColor: isDark ? '#0F0D1A' : colors.white,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    backBtn: {
      flex: 1,
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextBtn: {
      backgroundColor: colors.primary[600],
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  });
