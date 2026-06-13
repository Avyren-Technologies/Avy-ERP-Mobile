/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { ManageModalItem } from '@/components/ui/manage-modal';

import type { PartEntry as ShiftPartInput, SlabTier } from '@/features/production/pip/lib/shift-incentive';
import type { EmployeeDropdownItem } from '@/lib/api/hr';
import type { PipIncentiveConfig, PipSlabConfig } from '@/lib/api/pip';
import BottomSheet from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmployeePicker } from '@/components/ui/employee-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportSheet } from '@/components/ui/export-sheet';
import { ManageModal } from '@/components/ui/manage-modal';
import { SearchBar } from '@/components/ui/search-bar';
import { HamburgerButton, useSidebar  } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showErrorMessage, showWarning } from '@/components/ui/utils';
import { useCompanyShifts } from '@/features/company-admin/api/use-company-admin-queries';
import {
  useCreateDowntimeReason,
  useDeleteDowntimeReason,
  useSaveExtraHoursEntries,
  useSavePipDailyEntries,
  useUpdateDowntimeReason,
  useUpdatePipConfig,
} from '@/features/production/pip/api/use-pip-mutations';
import {
  useDowntimeReasons,
  usePipConfig,
  usePipDailyEntries,
  usePipExtraHoursEntries,
  usePipSlabConfigs,
} from '@/features/production/pip/api/use-pip-queries';
import { DownloadIcon } from '@/features/production/pip/download-icon';
import {
  calculateExtraHoursIncentive,
  computeShiftWorkingHours,
} from '@/features/production/pip/lib/extra-hours';
import { calculateIncentive } from '@/features/production/pip/lib/shift-incentive';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useFileDownload } from '@/hooks/use-file-download';
import { useIsDark } from '@/hooks/use-is-dark';
import { analyticsApi } from '@/lib/api/analytics';

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
  downtimeReasonId: string;
  downtimeMinutes: string;
}

interface DowntimeReasonOption {
  id: string;
  code: string;
  name: string;
}

interface OperationOption {
  id: string;
  code: string;
  name: string;
}

interface MachineSession {
  machineId: string;
  machineName: string;
  machineCode: string;
  operationId: string;
  operationName: string;
  operationCode: string;
  parts: PartEntry[];
}

/** Slab-configured part eligible for the extra-hours picker (one per part on the machine). */
interface ExtraHoursMachinePart {
  partId: string;
  partNumber: string;
  partName: string;
  slabConfigId: string;
  operationId: string | null;
  shiftTargetQty: number;
  slab1Rate: number;
}

/** A staged (not-yet-saved) extra-hours entry for one part. */
interface PendingExtraHoursEntry {
  machineId: string;
  machineCode: string;
  partId: string;
  partNumber: string;
  partName: string;
  slabConfigId: string;
  operationId: string | null;
  shiftTargetQty: number;
  slab1Rate: number;
  qtyProduced: number;
  extraHoursTarget: number;
  incentiveQty: number;
  incentiveAmount: number;
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
  const [y, mo, da] = ymd.split('-').map((x) => Number.parseInt(x, 10));
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

  // Export sheets — one for the saved daily-production entries, one for extra-hours
  const savedExportRef = React.useRef<BottomSheet>(null);
  const extraExportRef = React.useRef<BottomSheet>(null);
  const { download, isDownloading } = useFileDownload();

  // State
  const [currentStep, setCurrentStep] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState(formatDate(new Date()));
  const [selectedShift, setSelectedShift] = React.useState('');
  const [selectedOperator, setSelectedOperator] = React.useState<OperatorOption | null>(null);
  const [machineSessions, setMachineSessions] = React.useState<MachineSession[]>([]);
  const [currentMachineId, setCurrentMachineId] = React.useState('');
  // Operation picker: null = no pending machine, otherwise picking operation for this machine
  const [pendingMachine, setPendingMachine] = React.useState<MachineOption | null>(null);
  const [pendingOperations, setPendingOperations] = React.useState<OperationOption[]>([]);
  const [partFilter, setPartFilter] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Data fetching
  const { data: configRaw, refetch: refetchConfig } = usePipConfig();
  const config: PipIncentiveConfig | null = React.useMemo(() => {
    const d = (configRaw as any)?.data ?? configRaw;
    return d as PipIncentiveConfig | null;
  }, [configRaw]);

  const { data: slabsRaw, isLoading: slabsLoading, refetch: refetchSlabs } = usePipSlabConfigs();
  const slabConfigs: PipSlabConfig[] = React.useMemo(() => {
    const raw = (slabsRaw as any)?.data ?? slabsRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [slabsRaw]);

  const saveMutation = useSavePipDailyEntries();
  const updateConfigMutation = useUpdatePipConfig();
  const saveExtraHoursMutation = useSaveExtraHoursEntries();

  // ── Extra Hours state ──
  const [extraHoursWorked, setExtraHoursWorked] = React.useState('');
  const [extraHoursPartId, setExtraHoursPartId] = React.useState<string | null>(null);
  const [extraHoursQty, setExtraHoursQty] = React.useState('');
  const [pendingExtraHours, setPendingExtraHours] = React.useState<PendingExtraHoursEntry[]>([]);
  const [extraHoursPartPickerOpen, setExtraHoursPartPickerOpen] = React.useState(false);
  // Operator-keyed extra-hours incentive surfaced on the saved confirmation
  const [lastExtraHoursIncentive, setLastExtraHoursIncentive] = React.useState(0);

  // Downtime reasons
  const [manageDowntimeVisible, setManageDowntimeVisible] = React.useState(false);
  const [downtimePickerPartKey, setDowntimePickerPartKey] = React.useState<{ machineId: string; partId: string } | null>(null);
  const { data: downtimeReasonsRaw, isLoading: downtimeReasonsLoading, refetch: refetchDowntime } = useDowntimeReasons();
  const downtimeReasonList: DowntimeReasonOption[] = React.useMemo(() => {
    const raw = (downtimeReasonsRaw as any)?.data ?? downtimeReasonsRaw ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((r: any) => ({ id: r.id ?? '', code: r.code ?? '', name: r.name ?? '' }));
  }, [downtimeReasonsRaw]);
  const manageDowntimeItems: ManageModalItem[] = React.useMemo(
    () => downtimeReasonList.map((r) => ({ id: r.id, name: r.name, code: r.code })),
    [downtimeReasonList],
  );
  const createDTR = useCreateDowntimeReason();
  const updateDTR = useUpdateDowntimeReason();
  const deleteDTR = useDeleteDowntimeReason();

  // Fetch company shifts and auto-select based on current time (PRD 17.8)
  const { data: shiftsRaw, refetch: refetchShifts } = useCompanyShifts();
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
  const { data: todayEntriesRaw, isLoading: entriesLoading, refetch: refetchEntries } = usePipDailyEntries(
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

  useFocusEffect(
    React.useCallback(() => {
      refetchConfig();
      refetchSlabs();
      refetchDowntime();
      refetchShifts();
      if (selectedDate && selectedShift) {
        refetchEntries();
      }
    }, [refetchConfig, refetchSlabs, refetchDowntime, refetchShifts, refetchEntries, selectedDate, selectedShift])
  );

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

  // ============ EXTRA HOURS DERIVED ============

  const differentiateExtraHours = config?.differentiateExtraHours ?? false;

  // The currently-focused machine session (last selected machine in the wizard)
  const currentSession = React.useMemo(
    () => machineSessions.find((ms) => ms.machineId === currentMachineId) ?? null,
    [machineSessions, currentMachineId],
  );

  const selectedShiftObj = React.useMemo(
    () => (shifts as any[]).find((x: any) => x.id === selectedShift) ?? null,
    [shifts, selectedShift],
  );

  // Resolve shift hours: derive from selected shift times/breaks, else config default
  const shiftHours = React.useMemo(() => {
    if (selectedShiftObj?.startTime && selectedShiftObj?.endTime) {
      const computed = computeShiftWorkingHours(
        {
          startTime: selectedShiftObj.startTime,
          endTime: selectedShiftObj.endTime,
          isCrossDay: Boolean(selectedShiftObj.isCrossDay),
        },
        ((selectedShiftObj.breaks ?? []) as any[]).map((b) => ({
          duration: Number(b.duration) || 0,
          isPaid: Boolean(b.isPaid),
        })),
      );
      if (computed != null && computed > 0) return computed;
    }
    return Number(config?.defaultShiftHours) || 8;
  }, [selectedShiftObj, config?.defaultShiftHours]);

  // Slab-configured parts for the current machine (for the extra-hours picker)
  const extraHoursMachineParts: ExtraHoursMachinePart[] = React.useMemo(() => {
    if (!currentMachineId) return [];
    const seen = new Set<string>();
    const result: ExtraHoursMachinePart[] = [];
    for (const sc of slabConfigs) {
      if (sc.machineId !== currentMachineId || !sc.isActive) continue;
      if (currentSession?.operationId && sc.operationId && sc.operationId !== currentSession.operationId) continue;
      if (seen.has(sc.partId)) continue;
      seen.add(sc.partId);
      result.push({
        partId: sc.partId,
        partNumber: sc.part?.partNumber ?? '',
        partName: sc.part?.name ?? '',
        slabConfigId: sc.id,
        operationId: sc.operationId ?? null,
        shiftTargetQty: sc.shiftTargetQty,
        slab1Rate: sc.slabTiers.length > 0 ? Number(sc.slabTiers[0].ratePerPiece) : 0,
      });
    }
    return result;
  }, [currentMachineId, currentSession, slabConfigs]);

  const selectedExtraHoursPart = React.useMemo(
    () => extraHoursMachineParts.find((p) => p.partId === extraHoursPartId) ?? null,
    [extraHoursMachineParts, extraHoursPartId],
  );

  // ≥1 shift part already added (with qty > 0) for the current machine
  const hasShiftPartForMachine = React.useMemo(() => {
    if (!currentSession) return false;
    return currentSession.parts.some((p) => Number(p.qtyProduced) > 0);
  }, [currentSession]);

  // Show the Extra Hours block?
  const showExtraHoursBlock =
    differentiateExtraHours && !!selectedOperator && !!currentMachineId && hasShiftPartForMachine;

  const extraHoursWorkedNum = Number(extraHoursWorked) || 0;
  const extraHoursQtyNum = Number(extraHoursQty) || 0;
  const maxExtraHours = Math.max(0, 24 - shiftHours);
  const extraHoursOverThreshold =
    config?.extraHoursWarnThreshold != null && extraHoursWorkedNum > Number(config.extraHoursWarnThreshold);
  const extraHoursOverMax = extraHoursWorkedNum > maxExtraHours;

  // Live preview for the part currently being entered
  const extraHoursLivePreview = React.useMemo(() => {
    if (!selectedExtraHoursPart || !currentSession || extraHoursWorkedNum <= 0 || extraHoursQtyNum <= 0) return null;
    return calculateExtraHoursIncentive(
      [{
        partId: selectedExtraHoursPart.partId,
        partNumber: selectedExtraHoursPart.partNumber,
        partName: selectedExtraHoursPart.partName,
        machineId: currentSession.machineId,
        machineCode: currentSession.machineCode,
        qtyProduced: extraHoursQtyNum,
        shiftTargetQty: selectedExtraHoursPart.shiftTargetQty,
        slab1Rate: selectedExtraHoursPart.slab1Rate,
      }],
      extraHoursWorkedNum,
      shiftHours,
    );
  }, [selectedExtraHoursPart, currentSession, extraHoursWorkedNum, extraHoursQtyNum, shiftHours]);

  // Computed target/rate for the selected part (display even before qty entered)
  const selectedPartHourlyRate =
    selectedExtraHoursPart && shiftHours > 0 ? selectedExtraHoursPart.shiftTargetQty / shiftHours : 0;
  const selectedPartExtraTarget = Math.ceil(selectedPartHourlyRate * extraHoursWorkedNum);

  const pendingExtraHoursTotal = pendingExtraHours.reduce((sum, e) => sum + e.incentiveAmount, 0);
  const extraHoursCardTotal = pendingExtraHoursTotal + (extraHoursLivePreview?.totalIncentive ?? 0);

  // Saved extra-hours entries (toggle ON only)
  const extraHoursEntriesParams = React.useMemo(
    () => ({ entryDate: selectedDate, ...(selectedShift ? { shiftId: selectedShift } : {}) }),
    [selectedDate, selectedShift],
  );
  const { data: extraHoursSavedRaw, refetch: refetchExtraHours } = usePipExtraHoursEntries(
    extraHoursEntriesParams,
    { enabled: Boolean(differentiateExtraHours && selectedDate && selectedShift) },
  );
  const extraHoursSaved = React.useMemo(() => {
    if (!differentiateExtraHours) return [];
    const raw = (extraHoursSavedRaw as any)?.data ?? extraHoursSavedRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [differentiateExtraHours, extraHoursSavedRaw]);

  const methodBadge = getActiveMethodBadge(config);

  // ── Live shift incentive (mirrors web "Live Incentive" panel) ──
  // Active method number: 1 = Excess Ratio, 2 = Milestone Rounding, null = none configured
  const methodNumber: 1 | 2 | null = React.useMemo(() => {
    if (config?.method1Enabled) return 1;
    if (config?.method2Enabled) return 2;
    return null;
  }, [config?.method1Enabled, config?.method2Enabled]);

  // Fast lookup of slab tiers for a part on a machine, keyed by slabConfigId.
  const slabTiersByConfigId = React.useMemo(() => {
    const map = new Map<string, SlabTier[]>();
    slabConfigs.forEach((sc) => {
      map.set(sc.id, (sc.slabTiers ?? []) as SlabTier[]);
    });
    return map;
  }, [slabConfigs]);

  // All in-progress shift parts (with a qty entered) across every machine session,
  // in entry order — Method 1 needs the full set together for the cumulative ratio.
  const liveShiftParts: ShiftPartInput[] = React.useMemo(() => {
    const parts: ShiftPartInput[] = [];
    machineSessions.forEach((ms) => {
      ms.parts.forEach((p) => {
        const qty = Number(p.qtyProduced) || 0;
        if (qty <= 0) return;
        parts.push({
          partId: p.partId,
          partNumber: p.partNumber,
          partName: p.partName,
          machineId: ms.machineId,
          machineCode: ms.machineCode,
          qtyProduced: qty,
          shiftTargetQty: Number(p.shiftTargetQty) || 0,
          slabTiers: slabTiersByConfigId.get(p.slabConfigId) ?? [],
        });
      });
    });
    return parts;
  }, [machineSessions, slabTiersByConfigId]);

  const liveShift = React.useMemo(
    () => (methodNumber ? calculateIncentive(liveShiftParts, methodNumber) : null),
    [liveShiftParts, methodNumber],
  );

  // Combined Total = live shift incentive + live extra-hours total (extra only when toggle ON).
  const liveShiftTotal = Number(liveShift?.totalIncentive ?? 0);
  const combinedTotal = liveShiftTotal + (differentiateExtraHours ? Number(extraHoursCardTotal) : 0);

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
    const machineSlabs = slabConfigs.filter((sc) => sc.machineId === machine.id && sc.isActive);
    const uniqueOpsMap = new Map<string, OperationOption>();
    machineSlabs.forEach((sc) => {
      if (sc.operationId && sc.operation && !uniqueOpsMap.has(sc.operationId)) {
        uniqueOpsMap.set(sc.operationId, {
          id: sc.operationId,
          code: sc.operation.code,
          name: sc.operation.name,
        });
      }
    });
    const uniqueOps = Array.from(uniqueOpsMap.values());

    if (uniqueOps.length === 1) {
      // Auto-select the single operation
      confirmMachineWithOperation(machine, uniqueOps[0]);
    } else if (uniqueOps.length > 1) {
      // Show operation picker
      setPendingMachine(machine);
      setPendingOperations(uniqueOps);
    } else {
      // No operations on slab configs (shouldn't happen) — proceed with empty operation
      confirmMachineWithOperation(machine, null);
    }
  };

  const confirmMachineWithOperation = (machine: MachineOption, operation: OperationOption | null) => {
    setPendingMachine(null);
    setPendingOperations([]);
    setCurrentMachineId(machine.id);
    setPartFilter('');

    const existing = machineSessions.find((ms) => ms.machineId === machine.id && ms.operationId === (operation?.id ?? ''));
    if (!existing) {
      const parts = slabConfigs
        .filter((sc) =>
          sc.machineId === machine.id &&
          sc.isActive &&
          (operation ? sc.operationId === operation.id : true),
        )
        .map((sc) => ({
          partId: sc.partId,
          partNumber: sc.part?.partNumber ?? '',
          partName: sc.part?.name ?? '',
          slabConfigId: sc.id,
          shiftTargetQty: sc.shiftTargetQty,
          qtyProduced: '',
          ncCount: '0',
          downtimeReasonId: '',
          downtimeMinutes: '',
        }));
      setMachineSessions((prev) => [
        ...prev,
        {
          machineId: machine.id,
          machineName: machine.name,
          machineCode: machine.code,
          operationId: operation?.id ?? '',
          operationName: operation?.name ?? '',
          operationCode: operation?.code ?? '',
          parts,
        },
      ]);
    }
    goNext();
  };

  const updatePartQty = (machineId: string, partId: string, field: 'qtyProduced' | 'ncCount' | 'downtimeReasonId' | 'downtimeMinutes', value: string) => {
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

  // ── Extra Hours handlers ──

  const handleToggleExtraHours = () => {
    const next = !differentiateExtraHours;
    updateConfigMutation.mutate(
      { differentiateExtraHours: next },
      {
        onSuccess: () => {
          refetchConfig();
          if (!next) {
            // Reset extra-hours staging when turned off
            setExtraHoursWorked('');
            setExtraHoursPartId(null);
            setExtraHoursQty('');
            setPendingExtraHours([]);
            setExtraHoursPartPickerOpen(false);
          }
        },
      },
    );
  };

  const handleAddExtraHoursPart = () => {
    if (!currentSession || !selectedExtraHoursPart) return;
    if (extraHoursWorkedNum <= 0 || extraHoursWorkedNum > maxExtraHours) return;
    if (extraHoursQtyNum <= 0) return;
    const preview = calculateExtraHoursIncentive(
      [{
        partId: selectedExtraHoursPart.partId,
        partNumber: selectedExtraHoursPart.partNumber,
        partName: selectedExtraHoursPart.partName,
        machineId: currentSession.machineId,
        machineCode: currentSession.machineCode,
        qtyProduced: extraHoursQtyNum,
        shiftTargetQty: selectedExtraHoursPart.shiftTargetQty,
        slab1Rate: selectedExtraHoursPart.slab1Rate,
      }],
      extraHoursWorkedNum,
      shiftHours,
    );
    const part = preview.parts[0];
    if (!part) return;
    setPendingExtraHours((prev) => [
      ...prev.filter((e) => !(e.partId === selectedExtraHoursPart.partId && e.machineId === currentSession.machineId)),
      {
        machineId: currentSession.machineId,
        machineCode: currentSession.machineCode,
        partId: selectedExtraHoursPart.partId,
        partNumber: selectedExtraHoursPart.partNumber,
        partName: selectedExtraHoursPart.partName,
        slabConfigId: selectedExtraHoursPart.slabConfigId,
        operationId: selectedExtraHoursPart.operationId,
        shiftTargetQty: selectedExtraHoursPart.shiftTargetQty,
        slab1Rate: selectedExtraHoursPart.slab1Rate,
        qtyProduced: extraHoursQtyNum,
        extraHoursTarget: part.extraHoursTarget,
        incentiveQty: part.incentiveQty,
        incentiveAmount: part.incentiveAmount,
      },
    ]);
    setExtraHoursPartId(null);
    setExtraHoursQty('');
  };

  const handleRemovePendingExtraHours = (machineId: string, partId: string) => {
    confirmModal.show({
      title: 'Remove entry',
      message: "Remove this part's extra hours entry?",
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: () => {
        setPendingExtraHours((prev) => prev.filter((e) => !(e.machineId === machineId && e.partId === partId)));
      },
    });
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
          ...(ms.operationId ? { operationId: ms.operationId } : {}),
          qtyProduced: Number(p.qtyProduced),
          ncCount: Number(p.ncCount) || 0,
          ...(p.downtimeReasonId ? { downtimeReasonId: p.downtimeReasonId } : {}),
          ...(p.downtimeMinutes && Number(p.downtimeMinutes) > 0 ? { downtimeMinutes: Number(p.downtimeMinutes) } : {}),
        })),
    );

    if (entries.length === 0) return;

    const operatorId = selectedOperator.id;
    setIsSaving(true);
    void (async () => {
      try {
        const saveResult = await saveMutation.mutateAsync({
          entryDate: selectedDate,
          shiftId: selectedShift,
          operatorId,
          entries,
        });

        // ── Auto-commit pending Extra Hours entries (cascade via shared sessionRef) ──
        let extraHoursIncentiveForOperator = 0;
        const pendingForOperator = pendingExtraHours;
        if (differentiateExtraHours && pendingForOperator.length > 0 && extraHoursWorkedNum > 0) {
          const savedRows = ((saveResult as any)?.data?.entries
            ?? (saveResult as any)?.data
            ?? []) as Array<{ sessionRef?: string }>;
          const sessionRef = Array.isArray(savedRows)
            ? savedRows.find((r) => r?.sessionRef)?.sessionRef
            : undefined;
          const ehResult = await saveExtraHoursMutation.mutateAsync({
            entryDate: selectedDate,
            shiftId: selectedShift,
            operatorId,
            ...(sessionRef ? { sessionRef } : {}),
            extraHoursWorked: extraHoursWorkedNum,
            entries: pendingForOperator.map((e) => ({
              machineId: e.machineId,
              partId: e.partId,
              slabConfigId: e.slabConfigId,
              ...(e.operationId ? { operationId: e.operationId } : {}),
              qtyProduced: e.qtyProduced,
            })),
          });
          extraHoursIncentiveForOperator = Number((ehResult as any)?.data?.calculation?.totalIncentive ?? 0);
          refetchExtraHours();
        }

        setLastExtraHoursIncentive(extraHoursIncentiveForOperator);
        // Reset wizard + extra-hours staging
        setCurrentStep(0);
        setSelectedOperator(null);
        setMachineSessions([]);
        setCurrentMachineId('');
        setPendingMachine(null);
        setPendingOperations([]);
        setExtraHoursWorked('');
        setExtraHoursPartId(null);
        setExtraHoursQty('');
        setPendingExtraHours([]);
        setExtraHoursPartPickerOpen(false);
      } catch {
        // Mutation onError surfaces the toast; keep the wizard intact for retry.
      } finally {
        setIsSaving(false);
      }
    })();
  };

  // ── Export handlers (mirror pip-daily-report-screen) ──

  const handleExportSaved = React.useCallback(async (format: 'excel' | 'pdf') => {
    savedExportRef.current?.close();
    try {
      const response = await analyticsApi.exportReport('pip-daily-production', {
        dateFrom: selectedDate,
        dateTo: selectedDate,
        ...(selectedShift ? { shiftId: selectedShift } : {}),
        format,
      });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await download(response.data, {
        fileName: `daily-production-${selectedDate}.${ext}`,
        mimeType: mime,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      if (msg === 'RATE_LIMIT_EXCEEDED' || msg.includes('rate limit')) {
        showErrorMessage('You have reached the export limit (50/hour). Please wait and try again.');
      } else {
        showErrorMessage('Failed to export report');
      }
    }
  }, [selectedDate, selectedShift, download]);

  const handleExportExtraHours = React.useCallback(async (format: 'excel' | 'pdf') => {
    extraExportRef.current?.close();
    try {
      const response = await analyticsApi.exportReport('pip-extra-hours-entries', {
        dateFrom: selectedDate,
        dateTo: selectedDate,
        ...(selectedShift ? { shiftId: selectedShift } : {}),
        format,
      });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await download(response.data, {
        fileName: `extra-hours-entries-${selectedDate}.${ext}`,
        mimeType: mime,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      if (msg === 'RATE_LIMIT_EXCEEDED' || msg.includes('rate limit')) {
        showErrorMessage('You have reached the export limit (50/hour). Please wait and try again.');
      } else {
        showErrorMessage('Failed to export report');
      }
    }
  }, [selectedDate, selectedShift, download]);

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
  if (slabsLoading) {
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

          {/* Extra Hours toggle (two-way sync with PIP config) */}
          <Pressable
            onPress={handleToggleExtraHours}
            disabled={updateConfigMutation.isPending}
            style={[
              styles.extraToggleRow,
              {
                backgroundColor: differentiateExtraHours
                  ? (isDark ? colors.success[900] : colors.success[50])
                  : (isDark ? '#1A1730' : colors.white),
                borderColor: differentiateExtraHours
                  ? colors.success[400]
                  : (isDark ? colors.neutral[700] : colors.neutral[200]),
                opacity: updateConfigMutation.isPending ? 0.6 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text className="font-inter text-xs font-bold text-primary-950 dark:text-white">
                Extra Hrs
              </Text>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                Differentiate extra-hours production incentive
              </Text>
            </View>
            <View
              style={[
                styles.toggleTrack,
                { backgroundColor: differentiateExtraHours ? colors.success[500] : (isDark ? colors.neutral[700] : colors.neutral[300]) },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { alignSelf: differentiateExtraHours ? 'flex-end' : 'flex-start' },
                ]}
              />
            </View>
          </Pressable>

          <View style={[styles.savedSection, { borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
            <View style={styles.savedSectionHeader}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                Saved entries
              </Text>
              <View style={styles.savedHeaderRight}>
                {todayEntries.length > 0 && (
                  <View style={styles.savedCountBadge}>
                    <Text className="font-inter text-[10px] font-bold text-primary-700">{todayEntries.length}</Text>
                  </View>
                )}
                {todayEntries.length > 0 && (
                  <Pressable
                    onPress={() => savedExportRef.current?.expand()}
                    style={[styles.exportBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}
                    hitSlop={8}
                  >
                    <DownloadIcon size={16} color={colors.primary[600]} />
                  </Pressable>
                )}
              </View>
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
                        {entry.incentiveAmount != null ? ` · ₹${Number(entry.incentiveAmount).toFixed(0)}` : ''}
                      </Text>
                      {entry.consideredPct != null ? (
                        <Text className="font-inter text-[10px] text-neutral-500">
                          {ach.toFixed(0)}%→{Number(entry.consideredPct).toFixed(0)}%
                          {entry.appliedSlabLabel ? ` · ${entry.appliedSlabLabel}` : ''}
                          {entry.appliedRate != null ? `: ₹${Number(entry.appliedRate)}/pc` : ''}
                        </Text>
                      ) : (
                        <Text className="font-inter text-[10px] text-neutral-500">
                          {ach.toFixed(0)}%
                          {entry.incentiveAmount != null ? ` · ₹${Number(entry.incentiveAmount).toFixed(0)}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Extra Hours Saved Entries (toggle ON only) */}
          {differentiateExtraHours && selectedShift && (
            <View style={[styles.savedSection, { borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
              <View style={styles.savedSectionHeader}>
                <Text className="font-inter text-sm font-bold text-success-700 dark:text-success-300">
                  Extra Hours Saved Entries
                </Text>
                <View style={styles.savedHeaderRight}>
                  {extraHoursSaved.length > 0 && (
                    <View style={[styles.savedCountBadge, { backgroundColor: isDark ? colors.success[900] : colors.success[100] }]}>
                      <Text className="font-inter text-[10px] font-bold text-success-700">{extraHoursSaved.length}</Text>
                    </View>
                  )}
                  {extraHoursSaved.length > 0 && (
                    <Pressable
                      onPress={() => extraExportRef.current?.expand()}
                      style={[styles.exportBtn, { backgroundColor: isDark ? colors.success[900] : colors.success[100] }]}
                      hitSlop={8}
                    >
                      <DownloadIcon size={16} color={colors.success[600]} />
                    </Pressable>
                  )}
                </View>
              </View>
              {extraHoursSaved.length === 0 ? (
                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                  No extra hours entries for this date and shift yet.
                </Text>
              ) : (
                extraHoursSaved.map((entry: any) => {
                  const opName = entry.operator
                    ? `${entry.operator.firstName ?? ''} ${entry.operator.lastName ?? ''}`.trim()
                    : '';
                  const machineLabel = entry.slabConfig?.machine?.assetCode ?? entry.machineId ?? '';
                  const partNo = entry.slabConfig?.part?.partNumber ?? entry.partId ?? '';
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
                          {machineLabel} · {partNo} · {Number(entry.extraHoursWorked ?? 0).toFixed(2)}h extra
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                          ₹{Number(entry.hourlyRate ?? 0).toFixed(2)}/hr · target {entry.shiftTargetQty ?? 0} · extra tgt {entry.extraHoursTarget ?? 0}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text className="font-inter text-xs font-bold text-success-600">
                          ₹{Number(entry.incentiveAmount ?? 0).toFixed(2)}
                        </Text>
                        <Text className="font-inter text-[10px] text-neutral-500">
                          {entry.qtyProduced ?? 0} − {entry.extraHoursTarget ?? 0} = {entry.incentiveQty ?? 0} pcs
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Animated.View>

        {/* Step 0: Select Operator */}
        {currentStep === 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-4 font-inter text-base font-bold text-primary-950 dark:text-white">
              Select Operator
            </Text>
            <EmployeePicker
              value={selectedOperator?.id ?? null}
              onChange={(id, employee?: EmployeeDropdownItem) => {
                if (!id || !employee) {
                  setSelectedOperator(null);
                  return;
                }
                const fullName = [employee.firstName, employee.middleName, employee.lastName]
                  .filter((p): p is string => !!p && p.trim().length > 0)
                  .join(' ')
                  .trim() || 'Unknown';
                setSelectedOperator({
                  id: employee.id,
                  name: fullName,
                  initials: getInitials(fullName),
                  employeeNumber: employee.employeeId,
                });
              }}
              placeholder="Select operator..."
              status="ACTIVE"
            />
          </Animated.View>
        )}

        {/* Step 1: Select Machine (or pick operation for pending machine) */}
        {currentStep === 1 && (
          <Animated.View entering={FadeIn.duration(300)}>
            {pendingMachine ? (
              /* Operation picker — shown when machine has multiple operations */
              <>
                <View style={styles.operationPickerHeader}>
                  <Pressable
                    onPress={() => { setPendingMachine(null); setPendingOperations([]); }}
                    style={({ pressed }) => [styles.backChip, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                  >
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                      <Path d="M15 18l-6-6 6-6" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text className="font-inter text-xs font-semibold text-primary-600">Back</Text>
                  </Pressable>
                </View>
                <Text className="mb-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                  Select Operation
                </Text>
                <Text className="mb-4 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                  {pendingMachine.name} ({pendingMachine.code}) has multiple operations. Choose one.
                </Text>
                {pendingOperations.map((op) => (
                  <Pressable
                    key={op.id}
                    onPress={() => confirmMachineWithOperation(pendingMachine, op)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isDark ? '#1A1730' : colors.white,
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.opIconBadge,
                        { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] },
                      ]}
                    >
                      <Text className="font-inter text-[10px] font-bold text-accent-700">
                        {op.code}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                        {op.name}
                      </Text>
                      <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400">
                        {op.code}
                      </Text>
                    </View>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path
                        d="M9 6l6 6-6 6"
                        stroke={colors.primary[500]}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </Svg>
                  </Pressable>
                ))}
              </>
            ) : (
              /* Machine list */
              <>
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
                        key={`${ms.machineId}-${ms.operationId}`}
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
                            {ms.machineCode}
                            {ms.operationName ? ` · ${ms.operationCode} ${ms.operationName}` : ''}
                            {` — ${ms.parts.length} part(s)`}
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
              </>
            )}
          </Animated.View>
        )}

        {/* Step 2: Enter Quantities */}
        {currentStep === 2 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Text className="mb-4 font-inter text-base font-bold text-primary-950 dark:text-white">
              Enter Quantities
            </Text>

            <View style={{ marginBottom: 12 }}>
              <SearchBar
                value={partFilter}
                onChangeText={setPartFilter}
                placeholder="Filter parts..."
              />
            </View>

            {machineSessions.map((ms) => {
              const filteredParts = ms.parts.filter((p) => {
                if (!partFilter.trim()) return true;
                const q = partFilter.toLowerCase();
                return (
                  p.partNumber?.toLowerCase().includes(q) ||
                  p.partName?.toLowerCase().includes(q)
                );
              });

              return (
              <View key={`${ms.machineId}-${ms.operationId}`} style={{ marginBottom: 20 }}>
                <View
                  style={[
                    styles.machineHeader,
                    { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text className="font-inter text-xs font-bold text-primary-700">
                      {ms.machineName} ({ms.machineCode})
                    </Text>
                    {ms.operationName ? (
                      <View style={[styles.opBadge, { backgroundColor: isDark ? colors.accent[800] : colors.accent[100] }]}>
                        <Text className="font-inter text-[9px] font-semibold text-accent-700">
                          {ms.operationCode} · {ms.operationName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {filteredParts.length === 0 && ms.parts.length > 0 ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                      No parts match "{partFilter}"
                    </Text>
                  </View>
                ) : null}

                {filteredParts.map((part) => {
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

                      {/* Downtime / Idle Reason */}
                      <View style={[styles.downtimeSection, { borderTopColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text className="font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                            Downtime / Idle Reason
                          </Text>
                          <Pressable onPress={() => setManageDowntimeVisible(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? colors.primary[900] : colors.primary[50], paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}>
                            <Svg width={10} height={10} viewBox="0 0 24 24">
                              <Path d="M12 5v14m-7-7h14" stroke={colors.primary[600]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text className="font-inter text-[10px] font-bold text-primary-600 underline">
                              Add Reason
                            </Text>
                          </Pressable>
                        </View>

                        {/* Reason Picker */}
                        <Pressable
                          onPress={() => {
                            if (downtimePickerPartKey?.machineId === ms.machineId && downtimePickerPartKey?.partId === part.partId) {
                              setDowntimePickerPartKey(null);
                            } else {
                              setDowntimePickerPartKey({ machineId: ms.machineId, partId: part.partId });
                            }
                          }}
                          style={[
                            styles.downtimePickerBtn,
                            {
                              backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                              borderColor: part.downtimeReasonId
                                ? colors.warning[400]
                                : isDark ? colors.neutral[700] : colors.neutral[200],
                            },
                          ]}
                        >
                          <Text
                            className={`font-inter text-xs ${
                              part.downtimeReasonId
                                ? 'font-semibold text-warning-700 dark:text-warning-400'
                                : 'text-neutral-400'
                            }`}
                            numberOfLines={1}
                          >
                            {part.downtimeReasonId
                              ? downtimeReasonList.find((r) => r.id === part.downtimeReasonId)?.name ?? 'Selected'
                              : 'Select reason (optional)'}
                          </Text>
                          <Svg width={14} height={14} viewBox="0 0 24 24" style={{ transform: [{ rotate: downtimePickerPartKey?.machineId === ms.machineId && downtimePickerPartKey?.partId === part.partId ? '180deg' : '0deg' }] }}>
                            <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        </Pressable>

                        {/* Inline Dropdown List */}
                        {downtimePickerPartKey?.machineId === ms.machineId && downtimePickerPartKey?.partId === part.partId && (
                          <View style={{ marginTop: 4, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 8, backgroundColor: isDark ? '#0F0D1A' : colors.white, maxHeight: 180, overflow: 'hidden' }}>
                            {downtimeReasonList.length === 0 ? (
                              <View style={{ padding: 16, alignItems: 'center' }}>
                                <Text className="font-inter text-xs text-neutral-500">No reasons available.</Text>
                              </View>
                            ) : (
                              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                                {part.downtimeReasonId && (
                                  <Pressable
                                    onPress={() => {
                                      updatePartQty(ms.machineId, part.partId, 'downtimeReasonId', '');
                                      updatePartQty(ms.machineId, part.partId, 'downtimeMinutes', '');
                                      setDowntimePickerPartKey(null);
                                    }}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }}
                                  >
                                    <Text className="font-inter text-xs font-semibold text-danger-500">Clear Selection</Text>
                                  </Pressable>
                                )}
                                {downtimeReasonList.map((reason) => {
                                  const isSelected = part.downtimeReasonId === reason.id;
                                  return (
                                    <Pressable
                                      key={reason.id}
                                      onPress={() => {
                                        updatePartQty(ms.machineId, part.partId, 'downtimeReasonId', reason.id);
                                        setDowntimePickerPartKey(null);
                                      }}
                                      style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                                        backgroundColor: isSelected ? (isDark ? colors.warning[900] : colors.warning[50]) : 'transparent',
                                        borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 16, height: 16, borderRadius: 4, borderWidth: isSelected ? 0 : 1.5,
                                          borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
                                          backgroundColor: isSelected ? colors.warning[500] : 'transparent',
                                          alignItems: 'center', justifyContent: 'center',
                                        }}
                                      >
                                        {isSelected && (
                                          <Svg width={10} height={10} viewBox="0 0 24 24">
                                            <Path d="M5 12l5 5L20 7" stroke="#FFF" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                          </Svg>
                                        )}
                                      </View>
                                      <Text className={`font-inter text-xs ${isSelected ? 'font-bold text-primary-950 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        {reason.name}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </ScrollView>
                            )}
                          </View>
                        )}

                        {/* Duration chips */}
                        {part.downtimeReasonId ? (
                          <View style={{ marginTop: 8 }}>
                            <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                              Duration (minutes)
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
                              {[5, 10, 15, 30, 45, 60, 90, 120].map((mins) => {
                                const active = part.downtimeMinutes === String(mins);
                                return (
                                  <Pressable
                                    key={mins}
                                    onPress={() => updatePartQty(ms.machineId, part.partId, 'downtimeMinutes', String(mins))}
                                    style={[
                                      styles.durationChip,
                                      {
                                        backgroundColor: active
                                          ? colors.warning[500]
                                          : isDark ? '#0F0D1A' : colors.neutral[50],
                                        borderColor: active
                                          ? colors.warning[500]
                                          : isDark ? colors.neutral[700] : colors.neutral[200],
                                      },
                                    ]}
                                  >
                                    <Text
                                      className="font-inter text-[11px] font-semibold"
                                      style={{ color: active ? colors.white : isDark ? colors.neutral[300] : colors.neutral[600] }}
                                    >
                                      {mins}m
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                            {/* Custom minutes input */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                                Custom:
                              </Text>
                              <TextInput
                                style={[
                                  styles.downtimeCustomInput,
                                  {
                                    backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                                    color: isDark ? colors.white : colors.primary[950],
                                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                                  },
                                ]}
                                value={
                                  [5, 10, 15, 30, 45, 60, 90, 120].includes(Number(part.downtimeMinutes))
                                    ? ''
                                    : part.downtimeMinutes
                                }
                                onChangeText={(v) => updatePartQty(ms.machineId, part.partId, 'downtimeMinutes', v)}
                                keyboardType="numeric"
                                placeholder="min"
                                placeholderTextColor={colors.neutral[400]}
                              />
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
              );
            })}

            {/* ── Live Shift Incentive card (mirrors web "Live Incentive" panel) ── */}
            {methodNumber == null ? (
              <View
                style={[
                  styles.liveShiftCard,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.danger[800] : colors.danger[200],
                  },
                ]}
              >
                <View style={styles.liveShiftHeader}>
                  <Text className="font-inter text-xs font-bold text-danger-600 dark:text-danger-400">
                    No incentive method active
                  </Text>
                  <Text className="mt-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                    Enable Method 1 or Method 2 in PIP configuration to preview incentive.
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.liveShiftCard,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: liveShift?.isEligible
                      ? colors.success[400]
                      : isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveShiftHeader,
                    { backgroundColor: liveShift?.isEligible ? colors.success[600] : colors.warning[600] },
                  ]}
                >
                  <Text className="font-inter text-[9px] font-semibold text-white/70">LIVE INCENTIVE</Text>
                  <Text className="font-inter text-xl font-bold text-white">
                    ₹{Number(liveShift?.totalIncentive ?? 0).toFixed(2)}
                  </Text>
                  <Text className="mt-0.5 font-inter text-[10px] text-white/80">
                    {methodNumber === 2
                      ? `${Number(liveShift?.cumulativeRatio ?? 0).toFixed(0)}% milestones ${liveShift?.isEligible ? '✓' : '— need ≥ 100%'}`
                      : `${Number(liveShift?.cumulativeRatio ?? 0).toFixed(1)}% ${liveShift?.isEligible ? 'eligible ✓' : '— need 100%'}`}
                  </Text>
                </View>

                {(liveShift?.parts ?? []).length === 0 ? (
                  <View style={[styles.liveShiftPartRow, { borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
                    <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                      Enter quantities to preview the shift incentive.
                    </Text>
                  </View>
                ) : (
                  (liveShift?.parts ?? []).map((p) => {
                    const earned = Number(p.incentiveAmount) > 0;
                    return (
                      <View
                        key={`${p.machineId}-${p.partId}`}
                        style={[styles.liveShiftPartRow, { borderTopColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text className="font-inter text-[11px] font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
                            {p.partNumber} — {p.partName}
                          </Text>
                          <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                            {p.machineCode} · {Number(p.qtyProduced)}/{Number(p.shiftTargetQty)} · {Number(p.achievementPct).toFixed(0)}%
                          </Text>
                        </View>
                        <Text
                          className="font-inter text-xs font-bold"
                          style={{ color: earned ? colors.success[600] : colors.neutral[400] }}
                        >
                          ₹{Number(p.incentiveAmount).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ── Extra Hours Production block ── */}
            {showExtraHoursBlock && currentSession && (
              <View
                style={[
                  styles.extraBlock,
                  {
                    backgroundColor: isDark ? colors.success[900] : colors.success[50],
                    borderColor: colors.success[400],
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M12 6v6l4 2" stroke={colors.success[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M12 22a10 10 0 100-20 10 10 0 000 20z" stroke={colors.success[600]} strokeWidth="2" fill="none" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-success-700 dark:text-success-300">
                    Extra Hours Production
                  </Text>
                </View>
                <Text className="mb-3 font-inter text-[10px] text-success-700 dark:text-success-400">
                  {currentSession.machineName} ({currentSession.machineCode}) · Slab-1 flat rate, per-part independent
                </Text>

                {/* Total Extra Hours Worked Today */}
                <Text className="mb-1 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                  Total Extra Hours Worked Today
                </Text>
                <TextInput
                  style={[
                    styles.qtyInput,
                    {
                      backgroundColor: isDark ? '#0F0D1A' : colors.white,
                      color: isDark ? colors.white : colors.primary[950],
                      borderColor: extraHoursOverMax
                        ? colors.danger[400]
                        : isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                  value={extraHoursWorked}
                  onChangeText={setExtraHoursWorked}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                />
                <Text className="mt-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
                  Shift hours: {shiftHours.toFixed(2)}h · max extra: {maxExtraHours.toFixed(2)}h
                </Text>
                {extraHoursOverThreshold && (
                  <Text className="mt-1 font-inter text-[10px] font-semibold text-warning-700 dark:text-warning-400">
                    {extraHoursWorkedNum}h exceeds the {Number(config?.extraHoursWarnThreshold)}h warning threshold — please verify.
                  </Text>
                )}
                {extraHoursOverMax && (
                  <Text className="mt-1 font-inter text-[10px] font-semibold text-danger-500">
                    Extra hours cannot exceed {maxExtraHours.toFixed(2)}h (24 − shift hours).
                  </Text>
                )}

                {/* Part picker */}
                <Text className="mb-1 mt-3 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                  Select Part
                </Text>
                <Pressable
                  onPress={() => setExtraHoursPartPickerOpen((o) => !o)}
                  style={[
                    styles.downtimePickerBtn,
                    {
                      backgroundColor: isDark ? '#0F0D1A' : colors.white,
                      borderColor: selectedExtraHoursPart ? colors.success[400] : isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                >
                  <Text
                    className={`font-inter text-xs ${selectedExtraHoursPart ? 'font-semibold text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                    numberOfLines={1}
                  >
                    {selectedExtraHoursPart
                      ? `${selectedExtraHoursPart.partNumber} — ${selectedExtraHoursPart.partName}`
                      : 'Select a slab-configured part'}
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" style={{ transform: [{ rotate: extraHoursPartPickerOpen ? '180deg' : '0deg' }] }}>
                    <Path d="M6 9l6 6 6-6" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>

                {extraHoursPartPickerOpen && (
                  <View style={{ marginTop: 4, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], borderRadius: 8, backgroundColor: isDark ? '#0F0D1A' : colors.white, maxHeight: 220, overflow: 'hidden' }}>
                    {extraHoursMachineParts.length === 0 ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text className="font-inter text-xs text-neutral-500">No slab-configured parts.</Text>
                      </View>
                    ) : (
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                        {extraHoursMachineParts.map((p) => {
                          const added = pendingExtraHours.some((e) => e.partId === p.partId && e.machineId === currentSession.machineId);
                          const isSelected = extraHoursPartId === p.partId;
                          const hourly = shiftHours > 0 ? p.shiftTargetQty / shiftHours : 0;
                          return (
                            <Pressable
                              key={p.partId}
                              onPress={() => { setExtraHoursPartId(p.partId); setExtraHoursQty(''); setExtraHoursPartPickerOpen(false); }}
                              style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12,
                                backgroundColor: isSelected ? (isDark ? colors.success[900] : colors.success[50]) : 'transparent',
                                borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100],
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text className={`font-inter text-xs ${isSelected ? 'font-bold text-primary-950 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`} numberOfLines={1}>
                                  {p.partNumber} — {p.partName}
                                </Text>
                                <Text className="font-inter text-[10px] text-neutral-500">
                                  Target {p.shiftTargetQty} · ₹{Number(hourly).toFixed(2)}/hr
                                </Text>
                              </View>
                              {added && (
                                <View style={[styles.addedTag, { backgroundColor: isDark ? colors.success[800] : colors.success[100] }]}>
                                  <Text className="font-inter text-[9px] font-bold text-success-700">✓ added</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Per-part row */}
                {selectedExtraHoursPart && (
                  <View
                    style={[
                      styles.extraPartCard,
                      {
                        backgroundColor: isDark ? '#0F0D1A' : colors.white,
                        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <View style={styles.extraStatsRow}>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[9px] text-neutral-500 dark:text-neutral-400">Shift Target</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{selectedExtraHoursPart.shiftTargetQty}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[9px] text-neutral-500 dark:text-neutral-400">Hourly Rate</Text>
                        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{Number(selectedPartHourlyRate).toFixed(2)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="font-inter text-[9px] text-neutral-500 dark:text-neutral-400">Extra Hrs Target</Text>
                        <Text className="font-inter text-sm font-bold text-warning-700 dark:text-warning-400">{selectedPartExtraTarget}</Text>
                      </View>
                    </View>

                    <Text className="mb-1 mt-2 font-inter text-[10px] font-bold text-primary-900 dark:text-primary-100">
                      Qty Produced (extra hours)
                    </Text>
                    <TextInput
                      style={[
                        styles.qtyInput,
                        {
                          backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                          color: isDark ? colors.white : colors.primary[950],
                          borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                        },
                      ]}
                      value={extraHoursQty}
                      onChangeText={setExtraHoursQty}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.neutral[400]}
                    />

                    {/* Live incentive preview */}
                    <View style={styles.extraPreviewRow}>
                      <Text className="flex-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
                        {extraHoursLivePreview?.parts[0]?.breakdown ?? 'Enter extra hours and quantity to preview.'}
                      </Text>
                      <Text
                        className="font-inter text-sm font-bold"
                        style={{ color: (extraHoursLivePreview?.totalIncentive ?? 0) > 0 ? colors.success[600] : colors.neutral[400] }}
                      >
                        ₹{Number(extraHoursLivePreview?.totalIncentive ?? 0).toFixed(2)}
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleAddExtraHoursPart}
                      disabled={extraHoursWorkedNum <= 0 || extraHoursOverMax || extraHoursQtyNum <= 0}
                      style={({ pressed }) => [
                        styles.addExtraBtn,
                        pressed && { opacity: 0.85 },
                        (extraHoursWorkedNum <= 0 || extraHoursOverMax || extraHoursQtyNum <= 0) && { opacity: 0.5 },
                      ]}
                    >
                      <Text className="font-inter text-xs font-bold text-white">Add This Part's Extra Hours Entry</Text>
                    </Pressable>
                  </View>
                )}

                {/* Extra Hours Entries Added */}
                {pendingExtraHours.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text className="font-inter text-xs font-bold text-success-700 dark:text-success-300">
                        Extra Hours Entries Added ({pendingExtraHours.length})
                      </Text>
                      <Text className="font-inter text-xs font-bold text-success-700 dark:text-success-300">
                        ₹{Number(pendingExtraHoursTotal).toFixed(2)}
                      </Text>
                    </View>
                    {pendingExtraHours.map((e) => (
                      <View
                        key={`${e.machineId}-${e.partId}`}
                        style={[
                          styles.pendingExtraRow,
                          {
                            backgroundColor: isDark ? '#0F0D1A' : colors.white,
                            borderColor: isDark ? colors.neutral[800] : colors.neutral[100],
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white" numberOfLines={1}>
                            {e.partNumber} — {e.partName}
                          </Text>
                          <Text className="font-inter text-[10px] text-neutral-500" numberOfLines={1}>
                            {e.machineCode} · {e.qtyProduced} − {e.extraHoursTarget} = {e.incentiveQty} @ ₹{Number(e.slab1Rate).toFixed(2)}
                          </Text>
                        </View>
                        <Text className="mr-2 font-inter text-xs font-bold text-success-600">
                          ₹{Number(e.incentiveAmount).toFixed(2)}
                        </Text>
                        <Pressable onPress={() => handleRemovePendingExtraHours(e.machineId, e.partId)} hitSlop={8}>
                          <Svg width={16} height={16} viewBox="0 0 24 24">
                            <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" strokeLinecap="round" />
                          </Svg>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Live cards: Extra Hours + Combined Total */}
                <View style={styles.extraCardsRow}>
                  <View style={[styles.extraCard, { backgroundColor: colors.success[600] }]}>
                    <Text className="font-inter text-[9px] font-semibold text-white/70">EXTRA HOURS</Text>
                    <Text className="font-inter text-lg font-bold text-white">₹{Number(extraHoursCardTotal).toFixed(2)}</Text>
                    <Text className="font-inter text-[9px] text-white/70">
                      {pendingExtraHours.length} added · {Number(extraHoursWorkedNum).toFixed(2)}h
                    </Text>
                  </View>
                  <View style={[styles.extraCard, { backgroundColor: colors.primary[600] }]}>
                    <Text className="font-inter text-[9px] font-semibold text-white/70">COMBINED TOTAL</Text>
                    <Text className="font-inter text-lg font-bold text-white">
                      ₹{Number(combinedTotal).toFixed(2)}
                    </Text>
                    <Text className="font-inter text-[9px] text-white/70">
                      Shift ₹{Number(liveShiftTotal).toFixed(2)} + Extra ₹{Number(extraHoursCardTotal).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
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
                key={`${ms.machineId}-${ms.operationId}`}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.white,
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    {ms.machineName} ({ms.machineCode})
                  </Text>
                  {ms.operationName ? (
                    <View style={[styles.opBadge, { backgroundColor: isDark ? colors.accent[800] : colors.accent[100] }]}>
                      <Text className="font-inter text-[9px] font-semibold text-accent-700">
                        {ms.operationCode} · {ms.operationName}
                      </Text>
                    </View>
                  ) : null}
                </View>
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
              {lastExtraHoursIncentive > 0 && (
                <View style={[styles.extraSavedPill, { backgroundColor: isDark ? colors.success[900] : colors.success[50] }]}>
                  <Text className="font-inter text-xs font-bold text-success-700 dark:text-success-300">
                    +₹{Number(lastExtraHoursIncentive).toFixed(2)} extra hrs
                  </Text>
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.newEntryBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  setCurrentStep(0);
                  setSelectedOperator(null);
                  setMachineSessions([]);
                  setCurrentMachineId('');
                  setPendingMachine(null);
                  setPendingOperations([]);
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



      {/* Downtime Reason Manage Modal */}
      <ManageModal
        visible={manageDowntimeVisible}
        onClose={() => setManageDowntimeVisible(false)}
        title="Downtime Reasons"
        items={manageDowntimeItems}
        isLoading={downtimeReasonsLoading}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'e.g. Power Outage', required: true },
        ]}
        onCreate={async (values) => {
          await createDTR.mutateAsync({ name: values.name });
        }}
        onUpdate={async (id, values) => {
          await updateDTR.mutateAsync({ id, data: { name: values.name } });
        }}
        onDelete={async (id) => {
          await deleteDTR.mutateAsync(id);
        }}
        isCreating={createDTR.isPending}
        isUpdating={updateDTR.isPending}
        isDeleting={deleteDTR.isPending}
      />

      <ConfirmModal {...confirmModal.modalProps} />

      <ExportSheet ref={savedExportRef} onExport={handleExportSaved} isDownloading={isDownloading} />
      <ExportSheet ref={extraExportRef} onExport={handleExportExtraHours} isDownloading={isDownloading} />
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
    savedHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    exportBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
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
    operationPickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    backChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#1A1730' : colors.primary[50],
    },
    opIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    opBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    downtimeSection: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    downtimePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    durationChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    downtimeCustomInput: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 13,
      fontWeight: '600' as const,
      width: 70,
    },
    pickerModal: {
      flex: 1,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 14,
      marginBottom: 8,
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
    extraToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      gap: 12,
    },
    toggleTrack: {
      width: 40,
      height: 22,
      borderRadius: 11,
      padding: 2,
      justifyContent: 'center',
    },
    toggleThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.white,
    },
    extraBlock: {
      marginTop: 8,
      marginBottom: 8,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    addedTag: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    extraPartCard: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    extraStatsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    extraPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    addExtraBtn: {
      marginTop: 10,
      backgroundColor: colors.success[600],
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
    },
    pendingExtraRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
      gap: 4,
    },
    extraCardsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    extraCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
    },
    liveShiftCard: {
      marginTop: 4,
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    liveShiftHeader: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    liveShiftPartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderTopWidth: 1,
    },
    extraSavedPill: {
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
  });
