/* eslint-disable better-tailwindcss/no-unknown-classes */
import BottomSheet from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { DownloadIcon } from '@/features/production/pip/download-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportSheet } from '@/components/ui/export-sheet';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { showErrorMessage } from '@/components/ui/utils';
import { useIsDark } from '@/hooks/use-is-dark';
import { useFileDownload } from '@/hooks/use-file-download';
import { analyticsApi } from '@/lib/api/analytics';
import { usePipSlabConfigs, useOperations } from '@/features/production/pip/api/use-pip-queries';
import {
  useCreatePipSlabConfig,
  useBulkCreatePipSlabConfigs,
  useUpdatePipSlabConfig,
  useDeletePipSlabConfig,
} from '@/features/production/pip/api/use-pip-mutations';
import { useMachines } from '@/features/masters/api/use-masters-queries';
import { useParts } from '@/features/masters/api/use-masters-queries';
import type { PipSlabConfig, SlabTier } from '@/lib/api/pip';

// ============ TYPES ============

interface SlabConfigData {
  id: string;
  machineCode: string;
  machineName: string;
  machineId: string;
  operationCode: string;
  operationName: string;
  operationId: string;
  operationProcessType: string;
  partNumber: string;
  partName: string;
  partId: string;
  shiftTargetQty: number;
  slabTiers: SlabTier[];
  status: string;
  isActive: boolean;
}

interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface TierRow {
  fromQty: string;
  toQty: string;
  ratePerPiece: string;
}

// ============ HELPERS ============

function mapSlabConfig(item: any): SlabConfigData {
  return {
    id: item.id ?? '',
    machineCode: item.machine?.assetCode ?? '',
    machineName: item.machine?.assetName ?? '',
    machineId: item.machineId ?? '',
    operationCode: item.operation?.code ?? '',
    operationName: item.operation?.name ?? '',
    operationId: item.operationId ?? '',
    operationProcessType: item.operation?.processCategory?.name ?? item.operation?.processType ?? '',
    partNumber: item.part?.partNumber ?? '',
    partName: item.part?.name ?? '',
    partId: item.partId ?? '',
    shiftTargetQty: item.shiftTargetQty ?? 0,
    slabTiers: item.slabTiers ?? [],
    status: item.status ?? 'ACTIVE',
    isActive: item.isActive ?? true,
  };
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return { bg: colors.success[50], text: colors.success[700] };
    case 'INACTIVE':
      return { bg: colors.neutral[100], text: colors.neutral[600] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

// ============ SLAB CONFIG CARD ============

function SlabConfigCard({
  item,
  index,
  isDark,
  onEdit,
  onDelete,
}: {
  item: SlabConfigData;
  index: number;
  isDark: boolean;
  onEdit: (item: SlabConfigData) => void;
  onDelete: (item: SlabConfigData) => void;
}) {
  const statusColor = getStatusColor(item.status);

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.primary[50],
          },
        ]}
      >
        {/* Header Row */}
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {item.machineCode}
              </Text>
            </View>
            <Text
              className="mt-1 font-inter text-sm font-bold text-primary-950 dark:text-white"
              numberOfLines={1}
            >
              {item.machineName}
            </Text>
          </View>

          <View style={cardStyles.cardActions}>
            <Pressable
              onPress={() => onEdit(item)}
              style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}
              hitSlop={8}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                  stroke={colors.primary[500]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke={colors.primary[500]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            <Pressable
              onPress={() => onDelete(item)}
              style={[cardStyles.actionBtn, { backgroundColor: isDark ? colors.danger[900] : colors.danger[50] }]}
              hitSlop={8}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
                  stroke={colors.danger[500]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>

        {/* Operation Row */}
        {(item.operationCode || item.operationName) && (
          <View style={cardStyles.detailsRow}>
            <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.info[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {item.operationCode}
              </Text>
            </View>
            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1} style={{ flex: 1 }}>
              {item.operationName}
            </Text>
            {item.operationProcessType ? (
              <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
                <Text className="font-inter text-[9px] font-bold text-primary-600">
                  {item.operationProcessType}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Part Row */}
        <View style={cardStyles.detailsRow}>
          <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-accent-700">
              {item.partNumber}
            </Text>
          </View>
          <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {item.partName}
          </Text>
        </View>

        {/* Target + Tiers */}
        <View style={cardStyles.targetRow}>
          <View style={cardStyles.targetBox}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">
              Shift Target
            </Text>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
              {item.shiftTargetQty} pcs
            </Text>
          </View>

          <View style={cardStyles.tiersContainer}>
            {item.slabTiers.slice(0, 3).map((tier, idx) => (
              <View
                key={idx}
                style={[
                  cardStyles.tierBadge,
                  { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
                ]}
              >
                <Text className="font-inter text-[9px] font-bold text-primary-700">
                  {tier.fromQty}-{tier.toQty ?? '+'} @ Rs{tier.ratePerPiece}
                </Text>
              </View>
            ))}
            {item.slabTiers.length > 3 && (
              <View
                style={[
                  cardStyles.tierBadge,
                  { backgroundColor: isDark ? colors.neutral[800] : colors.neutral[100] },
                ]}
              >
                <Text className="font-inter text-[9px] font-bold text-neutral-500">
                  +{item.slabTiers.length - 3} more
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Status */}
        <View style={cardStyles.statusRow}>
          <View style={[cardStyles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <View style={[cardStyles.statusDot, { backgroundColor: statusColor.text }]} />
            <Text
              style={{ color: statusColor.text }}
              className="font-inter text-[10px] font-bold"
            >
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ FORM SHEET ============

interface OperationOption extends DropdownOption {
  processType?: string;
}

function SlabConfigFormSheet({
  visible,
  onClose,
  editItem,
  machines,
  operations,
  parts,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  editItem?: SlabConfigData | null;
  machines: DropdownOption[];
  operations: OperationOption[];
  parts: DropdownOption[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const isEdit = !!editItem;

  const [step, setStep] = React.useState(1);
  // Multi-select state for CREATE mode
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<Set<string>>(new Set());
  const [selectedOperationIds, setSelectedOperationIds] = React.useState<Set<string>>(new Set());
  const [selectedPartIds, setSelectedPartIds] = React.useState<Set<string>>(new Set());
  const [shiftTarget, setShiftTarget] = React.useState('');
  const [tiers, setTiers] = React.useState<TierRow[]>([
    { fromQty: '', toQty: '', ratePerPiece: '' },
  ]);
  const [machineSearch, setMachineSearch] = React.useState('');
  const [operationSearch, setOperationSearch] = React.useState('');
  const [partSearch, setPartSearch] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      if (editItem) {
        setSelectedMachineIds(new Set([editItem.machineId]));
        setSelectedOperationIds(new Set([editItem.operationId]));
        setSelectedPartIds(new Set([editItem.partId]));
        setShiftTarget(String(editItem.shiftTargetQty));
        setTiers(
          editItem.slabTiers.map((t) => ({
            fromQty: String(t.fromQty),
            toQty: t.toQty !== null ? String(t.toQty) : '',
            ratePerPiece: String(t.ratePerPiece),
          })),
        );
        setStep(4); // Jump to target/tiers for edit
      } else {
        setSelectedMachineIds(new Set());
        setSelectedOperationIds(new Set());
        setSelectedPartIds(new Set());
        setShiftTarget('');
        setTiers([{ fromQty: '', toQty: '', ratePerPiece: '' }]);
        setStep(1);
      }
      setMachineSearch('');
      setOperationSearch('');
      setPartSearch('');
    }
  }, [visible, editItem]);

  const filteredMachines = React.useMemo(() => {
    if (!machineSearch.trim()) return machines;
    const q = machineSearch.toLowerCase();
    return machines.filter(
      (m) => m.label.toLowerCase().includes(q) || (m.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [machines, machineSearch]);

  const filteredOperations = React.useMemo(() => {
    if (!operationSearch.trim()) return operations;
    const q = operationSearch.toLowerCase();
    return operations.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q) ||
        ((o as OperationOption).processType ?? '').toLowerCase().includes(q),
    );
  }, [operations, operationSearch]);

  const filteredParts = React.useMemo(() => {
    if (!partSearch.trim()) return parts;
    const q = partSearch.toLowerCase();
    return parts.filter(
      (p) => p.label.toLowerCase().includes(q) || (p.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [parts, partSearch]);

  const addTier = () => {
    setTiers((prev) => [...prev, { fromQty: '', toQty: '', ratePerPiece: '' }]);
  };

  const removeTier = (idx: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, field: keyof TierRow, value: string) => {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = () => {
    const parsedTiers = tiers
      .filter((t) => t.fromQty && t.ratePerPiece)
      .map((t) => ({
        fromQty: Number(t.fromQty),
        toQty: t.toQty ? Number(t.toQty) : null,
        ratePerPiece: Number(t.ratePerPiece),
      }));

    if (isEdit) {
      // Edit mode: single config
      onSubmit({
        machineId: editItem!.machineId,
        operationId: editItem!.operationId,
        partId: editItem!.partId,
        shiftTargetQty: Number(shiftTarget),
        slabTiers: parsedTiers,
      });
    } else {
      // Create mode: bulk configs
      onSubmit({
        machineIds: Array.from(selectedMachineIds),
        operationIds: Array.from(selectedOperationIds),
        partIds: Array.from(selectedPartIds),
        shiftTargetQty: Number(shiftTarget),
        slabTiers: parsedTiers,
      });
    }
  };

  const bulkTotal = selectedMachineIds.size * selectedOperationIds.size * selectedPartIds.size;

  const canProceed = () => {
    if (step === 1) return selectedMachineIds.size > 0;
    if (step === 2) return selectedOperationIds.size > 0;
    if (step === 3) return selectedPartIds.size > 0;
    if (step === 4) {
      return (
        !!shiftTarget &&
        Number(shiftTarget) > 0 &&
        tiers.length > 0 &&
        tiers.every((t) => t.fromQty && t.ratePerPiece)
      );
    }
    return false;
  };

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0F0D1A' : colors.white }]}>
        {/* Header */}
        <View style={[sheetStyles.header, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
          <Pressable onPress={onClose}>
            <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Cancel
            </Text>
          </Pressable>
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
            {isEdit ? 'Edit Slab Config' : `Step ${step} of 4`}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        {/* Step Indicators */}
        {!isEdit && (
          <View style={sheetStyles.stepRow}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  sheetStyles.stepDot,
                  {
                    backgroundColor: s <= step ? colors.primary[600] : isDark ? colors.neutral[700] : colors.neutral[200],
                    flex: s <= step ? 2 : 1,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[sheetStyles.formContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Select Machine */}
          {step === 1 && (
            <View>
              <Text className="mb-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                Select Machines
              </Text>
              {selectedMachineIds.size > 0 && (
                <Text className="mb-3 font-inter text-xs text-primary-600">
                  {selectedMachineIds.size} selected
                </Text>
              )}
              {selectedMachineIds.size === 0 && <View style={{ height: 12 }} />}
              <TextInput
                style={[
                  sheetStyles.searchInput,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                    color: isDark ? colors.white : colors.primary[950],
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
                placeholder="Search machines..."
                placeholderTextColor={colors.neutral[400]}
                value={machineSearch}
                onChangeText={setMachineSearch}
              />
              <Pressable
                onPress={() => {
                  if (selectedMachineIds.size === filteredMachines.length && filteredMachines.length > 0) {
                    setSelectedMachineIds(new Set());
                  } else {
                    setSelectedMachineIds(new Set(filteredMachines.map((m) => m.id)));
                  }
                }}
                style={sheetStyles.selectAllBtn}
              >
                <Text className="font-inter text-xs font-bold text-primary-600">
                  {selectedMachineIds.size === filteredMachines.length && filteredMachines.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </Pressable>
              {filteredMachines.map((m) => {
                const isSelected = selectedMachineIds.has(m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setSelectedMachineIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      });
                    }}
                    style={[
                      sheetStyles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? isDark ? colors.primary[900] : colors.primary[50]
                          : isDark ? '#1A1730' : colors.white,
                        borderColor: isSelected
                          ? colors.primary[400]
                          : isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <View style={[sheetStyles.checkbox, isSelected && sheetStyles.checkboxSelected]}>
                      {isSelected && (
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                          <Path
                            d="M5 12l5 5L20 7"
                            stroke={colors.white}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                        {m.label}
                      </Text>
                      {m.sublabel ? (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                          {m.sublabel}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 2: Select Operation */}
          {step === 2 && (
            <View>
              <Text className="mb-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                Select Operations
              </Text>
              {selectedOperationIds.size > 0 && (
                <Text className="mb-3 font-inter text-xs text-primary-600">
                  {selectedOperationIds.size} selected
                </Text>
              )}
              {selectedOperationIds.size === 0 && <View style={{ height: 12 }} />}
              <TextInput
                style={[
                  sheetStyles.searchInput,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                    color: isDark ? colors.white : colors.primary[950],
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
                placeholder="Search operations..."
                placeholderTextColor={colors.neutral[400]}
                value={operationSearch}
                onChangeText={setOperationSearch}
              />
              <Pressable
                onPress={() => {
                  if (selectedOperationIds.size === filteredOperations.length && filteredOperations.length > 0) {
                    setSelectedOperationIds(new Set());
                  } else {
                    setSelectedOperationIds(new Set(filteredOperations.map((o) => o.id)));
                  }
                }}
                style={sheetStyles.selectAllBtn}
              >
                <Text className="font-inter text-xs font-bold text-primary-600">
                  {selectedOperationIds.size === filteredOperations.length && filteredOperations.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </Pressable>
              {filteredOperations.map((o) => {
                const isSelected = selectedOperationIds.has(o.id);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setSelectedOperationIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(o.id)) next.delete(o.id);
                        else next.add(o.id);
                        return next;
                      });
                    }}
                    style={[
                      sheetStyles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? isDark ? colors.primary[900] : colors.primary[50]
                          : isDark ? '#1A1730' : colors.white,
                        borderColor: isSelected
                          ? colors.primary[400]
                          : isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <View style={[sheetStyles.checkbox, isSelected && sheetStyles.checkboxSelected]}>
                      {isSelected && (
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                          <Path
                            d="M5 12l5 5L20 7"
                            stroke={colors.white}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.info[900] : colors.info[50] }]}>
                          <Text className="font-inter text-[10px] font-bold text-info-700">
                            {o.sublabel}
                          </Text>
                        </View>
                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" style={{ flex: 1 }}>
                          {o.label}
                        </Text>
                      </View>
                      {(o as OperationOption).processType ? (
                        <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50], alignSelf: 'flex-start' }]}>
                          <Text className="font-inter text-[9px] font-bold text-primary-600">
                            {(o as OperationOption).processType}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 3: Select Part */}
          {step === 3 && (
            <View>
              <Text className="mb-1 font-inter text-base font-bold text-primary-950 dark:text-white">
                Select Parts
              </Text>
              {selectedPartIds.size > 0 && (
                <Text className="mb-3 font-inter text-xs text-primary-600">
                  {selectedPartIds.size} selected
                </Text>
              )}
              {selectedPartIds.size === 0 && <View style={{ height: 12 }} />}
              <TextInput
                style={[
                  sheetStyles.searchInput,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                    color: isDark ? colors.white : colors.primary[950],
                    borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                  },
                ]}
                placeholder="Search parts..."
                placeholderTextColor={colors.neutral[400]}
                value={partSearch}
                onChangeText={setPartSearch}
              />
              <Pressable
                onPress={() => {
                  if (selectedPartIds.size === filteredParts.length && filteredParts.length > 0) {
                    setSelectedPartIds(new Set());
                  } else {
                    setSelectedPartIds(new Set(filteredParts.map((p) => p.id)));
                  }
                }}
                style={sheetStyles.selectAllBtn}
              >
                <Text className="font-inter text-xs font-bold text-primary-600">
                  {selectedPartIds.size === filteredParts.length && filteredParts.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </Pressable>
              {filteredParts.map((p) => {
                const isSelected = selectedPartIds.has(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setSelectedPartIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      });
                    }}
                    style={[
                      sheetStyles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? isDark ? colors.primary[900] : colors.primary[50]
                          : isDark ? '#1A1730' : colors.white,
                        borderColor: isSelected
                          ? colors.primary[400]
                          : isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <View style={[sheetStyles.checkbox, isSelected && sheetStyles.checkboxSelected]}>
                      {isSelected && (
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                          <Path
                            d="M5 12l5 5L20 7"
                            stroke={colors.white}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                        {p.label}
                      </Text>
                      {p.sublabel ? (
                        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                          {p.sublabel}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Step 4: Target + Tiers */}
          {step === 4 && (
            <View>
              {/* Summary of selected */}
              {(selectedMachineIds.size > 0 || selectedOperationIds.size > 0 || selectedPartIds.size > 0) && (
                <View style={[sheetStyles.summaryCard, { backgroundColor: isDark ? '#1A1730' : colors.primary[50] }]}>
                  {isEdit ? (
                    <>
                      {machines.find((m) => selectedMachineIds.has(m.id)) && (
                        <Text className="font-inter text-xs text-primary-700">
                          Machine: {machines.find((m) => selectedMachineIds.has(m.id))?.label}
                        </Text>
                      )}
                      {operations.find((o) => selectedOperationIds.has(o.id)) && (
                        <Text className="font-inter text-xs text-info-700">
                          Operation: {operations.find((o) => selectedOperationIds.has(o.id))?.sublabel} — {operations.find((o) => selectedOperationIds.has(o.id))?.label}
                        </Text>
                      )}
                      {parts.find((p) => selectedPartIds.has(p.id)) && (
                        <Text className="font-inter text-xs text-accent-700">
                          Part: {parts.find((p) => selectedPartIds.has(p.id))?.label}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text className="font-inter text-xs text-primary-700">
                        Machines: {selectedMachineIds.size} selected
                      </Text>
                      <Text className="font-inter text-xs text-info-700">
                        Operations: {selectedOperationIds.size} selected
                      </Text>
                      <Text className="font-inter text-xs text-accent-700">
                        Parts: {selectedPartIds.size} selected
                      </Text>
                      <Text className="mt-1 font-inter text-xs font-bold text-neutral-500">
                        Creating {selectedMachineIds.size} x {selectedOperationIds.size} x {selectedPartIds.size} = {bulkTotal} config{bulkTotal !== 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </View>
              )}

              <Text className="mb-3 font-inter text-base font-bold text-primary-950 dark:text-white">
                Shift Target &amp; Slab Tiers
              </Text>

              {/* Shift Target */}
              <View style={sheetStyles.field}>
                <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                  Shift Target Qty <Text className="text-danger-500">*</Text>
                </Text>
                <TextInput
                  style={[
                    sheetStyles.input,
                    {
                      backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                      color: isDark ? colors.white : colors.primary[950],
                      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                    },
                  ]}
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.neutral[400]}
                  value={shiftTarget}
                  onChangeText={setShiftTarget}
                  keyboardType="numeric"
                />
              </View>

              {/* Tier Rows */}
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Slab Tiers
              </Text>
              {tiers.map((tier, idx) => (
                <View key={idx} style={[sheetStyles.tierRow, { backgroundColor: isDark ? '#1A1730' : colors.neutral[50] }]}>
                  <View style={sheetStyles.tierHeader}>
                    <Text className="font-inter text-[10px] font-bold text-primary-600">
                      TIER {idx + 1}
                    </Text>
                    {tiers.length > 1 && (
                      <Pressable onPress={() => removeTier(idx)} hitSlop={8}>
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
                  <View style={sheetStyles.tierFields}>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-[10px] text-neutral-500">From</Text>
                      <TextInput
                        style={[sheetStyles.tierInput, { color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                        value={tier.fromQty}
                        onChangeText={(v) => updateTier(idx, 'fromQty', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.neutral[400]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-[10px] text-neutral-500">To</Text>
                      <TextInput
                        style={[sheetStyles.tierInput, { color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                        value={tier.toQty}
                        onChangeText={(v) => updateTier(idx, 'toQty', v)}
                        keyboardType="numeric"
                        placeholder="Unlimited"
                        placeholderTextColor={colors.neutral[400]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="font-inter text-[10px] text-neutral-500">Rate/pc</Text>
                      <TextInput
                        style={[sheetStyles.tierInput, { color: isDark ? colors.white : colors.primary[950], borderColor: isDark ? colors.neutral[700] : colors.neutral[200] }]}
                        value={tier.ratePerPiece}
                        onChangeText={(v) => updateTier(idx, 'ratePerPiece', v)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.neutral[400]}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <Pressable onPress={addTier} style={sheetStyles.addTierBtn}>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M12 5v14M5 12h14" stroke={colors.primary[600]} strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <Text className="ml-1 font-inter text-xs font-bold text-primary-600">
                  Add Tier
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={sheetStyles.btnRow}>
            {step > 1 && !isEdit && (
              <Pressable
                style={({ pressed }) => [
                  sheetStyles.backBtn,
                  { backgroundColor: isDark ? '#1A1730' : colors.neutral[100] },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setStep((s) => s - 1)}
              >
                <Text className="font-inter text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  Back
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                sheetStyles.submitBtn,
                { flex: step > 1 && !isEdit ? 2 : 1 },
                pressed && { opacity: 0.85 },
                (!canProceed() || isSubmitting) && { opacity: 0.6 },
              ]}
              onPress={() => {
                if (step < 4 && !isEdit) setStep((s) => s + 1);
                else handleSubmit();
              }}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-inter text-base font-bold text-white">
                  {step < 4 && !isEdit ? 'Next' : isEdit ? 'Update' : 'Create'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

// ============ MAIN COMPONENT ============

export function PipSlabConfigScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const exportRef = React.useRef<BottomSheet>(null);
  const { download, isDownloading } = useFileDownload();

  const [search, setSearch] = React.useState('');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SlabConfigData | null>(null);

  const confirmModal = useConfirmModal();

  const { data: response, isLoading, error, refetch, isFetching } = usePipSlabConfigs(
    search.trim() ? { search: search.trim() } : undefined,
  );

  const configs: SlabConfigData[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapSlabConfig);
  }, [response]);

  // Fetch machines, operations, and parts for the form
  const { data: machinesRaw } = useMachines();
  const machines: DropdownOption[] = React.useMemo(() => {
    const data = (machinesRaw as any)?.data ?? machinesRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((m: any) => ({
      id: m.id ?? '',
      label: m.assetName ?? '',
      sublabel: m.assetCode ?? '',
    }));
  }, [machinesRaw]);

  const { data: operationsRaw } = useOperations({ status: 'ACTIVE' });
  const operationOptions: OperationOption[] = React.useMemo(() => {
    const data = (operationsRaw as any)?.data ?? operationsRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((o: any) => ({
      id: o.id ?? '',
      label: o.name ?? '',
      sublabel: o.code ?? '',
      processType: o.processCategory?.name ?? o.processType ?? '',
    }));
  }, [operationsRaw]);

  const { data: partsRaw } = useParts();
  const partOptions: DropdownOption[] = React.useMemo(() => {
    const data = (partsRaw as any)?.data ?? partsRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((p: any) => ({
      id: p.id ?? '',
      label: p.name ?? '',
      sublabel: p.partNumber ?? '',
    }));
  }, [partsRaw]);

  // Mutations
  const createSlab = useCreatePipSlabConfig();
  const bulkCreateSlab = useBulkCreatePipSlabConfigs();
  const updateSlab = useUpdatePipSlabConfig();
  const deleteSlab = useDeletePipSlabConfig();

  const handleExport = React.useCallback(async (format: 'excel' | 'pdf') => {
    exportRef.current?.close();
    try {
      const response = await analyticsApi.exportReport('pip-slab-config', { format });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await download(response.data, {
        fileName: `slab-config.${ext}`,
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
  }, [download]);

  const handleAdd = () => {
    setEditingItem(null);
    setSheetVisible(true);
  };

  const handleEdit = (item: SlabConfigData) => {
    setEditingItem(item);
    setSheetVisible(true);
  };

  const handleDelete = (item: SlabConfigData) => {
    confirmModal.show({
      title: 'Delete Slab Config',
      message: `Delete slab config for "${item.machineName} - ${item.partName}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteSlab.mutate(item.id);
      },
    });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingItem) {
      updateSlab.mutate(
        { id: editingItem.id, data },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else if (data.machineIds) {
      // Bulk create (multi-select)
      bulkCreateSlab.mutate(data, {
        onSuccess: () => setSheetVisible(false),
      });
    } else {
      createSlab.mutate(data, {
        onSuccess: () => setSheetVisible(false),
      });
    }
  };

  const renderItem = ({ item, index }: { item: SlabConfigData; index: number }) => (
    <SlabConfigCard
      item={item}
      index={index}
      isDark={isDark}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  const renderHeader = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <AppTopHeader
          title="Slab Configuration"
          subtitle={`${configs.length} config${configs.length !== 1 ? 's' : ''}`}
          onMenuPress={toggle}
          rightSlot={
            <Pressable onPress={() => exportRef.current?.expand()} hitSlop={8}>
              <DownloadIcon color={colors.white} />
            </Pressable>
          }
        />
      </Animated.View>

      {/* Info banner */}
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.infoBanner}>
        <View
          style={[
            styles.infoBannerContent,
            {
              backgroundColor: isDark ? '#1A1730' : colors.info[50],
              borderColor: isDark ? colors.info[900] : colors.info[200],
            },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01"
              stroke={colors.info[600]}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text className="ml-2 flex-1 font-inter text-[11px] leading-4 text-info-700 dark:text-info-300">
            Configure slab tiers per machine-part combination. Each slab defines the incentive rate for quantity ranges above the shift target.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by machine, operation or part..."
        />
      </Animated.View>
    </>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={{ paddingTop: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ paddingTop: 40 }}>
          <EmptyState
            icon="error"
            title="Failed to load slab configs"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No slab configs found"
        message="Add a slab configuration to define incentive tiers."
      />
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <FlashList
        data={configs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      />

      <FAB onPress={handleAdd} />

      <SlabConfigFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        editItem={editingItem}
        machines={machines}
        operations={operationOptions}
        parts={partOptions}
        onSubmit={handleSubmit}
        isSubmitting={createSlab.isPending || bulkCreateSlab.isPending || updateSlab.isPending}
      />

      <ExportSheet ref={exportRef} onExport={handleExport} isDownloading={isDownloading} />
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
    searchSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    listContent: {
      paddingHorizontal: 24,
    },
    infoBanner: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    infoBannerContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
  });

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  targetBox: {
    gap: 2,
  },
  tiersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: '55%',
    justifyContent: 'flex-end',
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },
  formContent: {
    paddingHorizontal: 20,
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
  },
  summaryCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  field: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  tierRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierFields: {
    flexDirection: 'row',
    gap: 8,
  },
  tierInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginTop: 4,
  },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  selectAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
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
  submitBtn: {
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
