/* eslint-disable better-tailwindcss/no-unknown-classes */
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
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { ManageModal } from '@/components/ui/manage-modal';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';
import {
  useCreateMachine,
  useUpdateMachine,
  useDeleteMachine,
  useCreateMachineCategory,
  useUpdateMachineCategory,
  useDeleteMachineCategory,
  useCreateMachineType,
  useUpdateMachineType,
  useDeleteMachineType,
  useCreateMachineZone,
  useUpdateMachineZone,
  useDeleteMachineZone,
} from '@/features/masters/api/use-masters-mutations';
import {
  useMachines,
  useMachineCategories,
  useMachineTypes,
  useMachineZones,
} from '@/features/masters/api/use-masters-queries';
import { useIsDark } from '@/hooks/use-is-dark';
import type { Machine } from '@/lib/api/masters';

// ============ TYPES ============

interface MachineData {
  id: string;
  assetCode: string;
  assetName: string;
  machineCode?: string;
  serialNumber?: string;
  categoryId?: string;
  categoryName?: string;
  typeId?: string;
  typeName?: string;
  zoneId?: string;
  zoneName?: string;
  lineWorkCenter?: string;
  priority: string;
  capacity?: string;
  make?: string;
  model?: string;
  powerRating?: string;
  yearOfManufacture?: number;
  status: string;
  idleReason?: string;
}

interface DropdownOption {
  id: string;
  name: string;
}

// ============ HELPERS ============

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['RUNNING', 'IDLE', 'MAINTENANCE', 'DECOMMISSIONED'];

function getPriorityColor(priority: string): { bg: string; text: string } {
  switch (priority?.toUpperCase()) {
    case 'HIGH':
      return { bg: colors.danger[50], text: colors.danger[700] };
    case 'MEDIUM':
      return { bg: colors.warning[50], text: colors.warning[700] };
    case 'LOW':
      return { bg: colors.neutral[100], text: colors.neutral[600] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'RUNNING':
      return { bg: colors.success[50], text: colors.success[700] };
    case 'IDLE':
      return { bg: colors.warning[50], text: colors.warning[700] };
    case 'MAINTENANCE':
      return { bg: colors.info[50], text: colors.info[700] };
    case 'DECOMMISSIONED':
      return { bg: colors.danger[50], text: colors.danger[700] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

function mapApiMachine(item: any): MachineData {
  return {
    id: item.id ?? '',
    assetCode: item.assetCode ?? '',
    assetName: item.assetName ?? '',
    machineCode: item.machineCode ?? undefined,
    serialNumber: item.serialNumber ?? undefined,
    categoryId: item.categoryId ?? '',
    categoryName: item.category?.name ?? '',
    typeId: item.typeId ?? '',
    typeName: item.type?.name ?? '',
    zoneId: item.zoneId ?? '',
    zoneName: item.zone?.name ?? '',
    lineWorkCenter: item.lineWorkCenter ?? undefined,
    priority: item.priority ?? 'MEDIUM',
    capacity: item.capacity ?? undefined,
    make: item.make ?? undefined,
    model: item.model ?? undefined,
    powerRating: item.powerRating ?? undefined,
    yearOfManufacture: item.yearOfManufacture ?? undefined,
    status: item.status ?? 'RUNNING',
    idleReason: item.idleReason ?? undefined,
  };
}

// ============ MACHINE CARD ============

function MachineCard({
  machine,
  index,
  isDark,
  onEdit,
  onDelete,
}: {
  machine: MachineData;
  index: number;
  isDark: boolean;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
}) {
  const priorityColor = getPriorityColor(machine.priority);
  const statusColor = getStatusColor(machine.status);

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
          <View style={cardStyles.machineInfo}>
            <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {machine.assetCode}
              </Text>
            </View>
            <View style={cardStyles.nameContainer}>
              <Text
                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                numberOfLines={1}
              >
                {machine.assetName}
              </Text>
              {machine.zoneName ? (
                <Text
                  className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                  numberOfLines={1}
                >
                  {machine.zoneName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Actions */}
          <View style={cardStyles.cardActions}>
            <Pressable
              onPress={() => onEdit(machine)}
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
              onPress={() => onDelete(machine)}
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

        {/* Details Row */}
        <View style={cardStyles.detailsRow}>
          {machine.categoryName ? (
            <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-accent-700">
                {machine.categoryName}
              </Text>
            </View>
          ) : null}

          <View style={[cardStyles.tagBadge, { backgroundColor: priorityColor.bg }]}>
            <Text
              style={{ color: priorityColor.text }}
              className="font-inter text-[10px] font-bold"
            >
              {machine.priority}
            </Text>
          </View>

          <View
            style={[
              cardStyles.statusBadge,
              { backgroundColor: statusColor.bg },
            ]}
          >
            <View
              style={[
                cardStyles.statusDot,
                { backgroundColor: statusColor.text },
              ]}
            />
            <Text
              style={{ color: statusColor.text }}
              className="font-inter text-[10px] font-bold"
            >
              {machine.status}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ ADD/EDIT FORM SHEET ============

function MachineFormSheet({
  visible,
  onClose,
  machine,
  categories,
  types,
  zones,
  onSubmit,
  isSubmitting,
  onManageCategory,
  onManageType,
  onManageZone,
}: {
  visible: boolean;
  onClose: () => void;
  machine?: MachineData | null;
  categories: DropdownOption[];
  types: DropdownOption[];
  zones: DropdownOption[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onManageCategory: () => void;
  onManageType: () => void;
  onManageZone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const sheetStyles = createSheetStyles(isDark);
  const isEdit = !!machine;

  const [assetCode, setAssetCode] = React.useState('');
  const [assetName, setAssetName] = React.useState('');
  const [machineCode, setMachineCode] = React.useState('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [typeId, setTypeId] = React.useState('');
  const [zoneId, setZoneId] = React.useState('');
  const [lineWorkCenter, setLineWorkCenter] = React.useState('');
  const [priority, setPriority] = React.useState('MEDIUM');
  const [capacity, setCapacity] = React.useState('');
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [powerRating, setPowerRating] = React.useState('');
  const [yearOfManufacture, setYearOfManufacture] = React.useState('');
  const [status, setStatus] = React.useState('RUNNING');
  const [idleReason, setIdleReason] = React.useState('');
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      if (machine) {
        setAssetCode(machine.assetCode ?? '');
        setAssetName(machine.assetName ?? '');
        setMachineCode(machine.machineCode ?? '');
        setSerialNumber(machine.serialNumber ?? '');
        setCategoryId(machine.categoryId ?? '');
        setTypeId(machine.typeId ?? '');
        setZoneId(machine.zoneId ?? '');
        setLineWorkCenter(machine.lineWorkCenter ?? '');
        setPriority(machine.priority ?? 'MEDIUM');
        setCapacity(machine.capacity ?? '');
        setMake(machine.make ?? '');
        setModel(machine.model ?? '');
        setPowerRating(machine.powerRating ?? '');
        setYearOfManufacture(machine.yearOfManufacture ? String(machine.yearOfManufacture) : '');
        setStatus(machine.status ?? 'RUNNING');
        setIdleReason(machine.idleReason ?? '');
      } else {
        setAssetCode('');
        setAssetName('');
        setMachineCode('');
        setSerialNumber('');
        setCategoryId('');
        setTypeId('');
        setZoneId('');
        setLineWorkCenter('');
        setPriority('MEDIUM');
        setCapacity('');
        setMake('');
        setModel('');
        setPowerRating('');
        setYearOfManufacture('');
        setStatus('RUNNING');
        setIdleReason('');
      }
      setErrors({});
      setOpenDropdown(null);
    }
  }, [visible, machine]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedType = types.find((t) => t.id === typeId);
  const selectedZone = zones.find((z) => z.id === zoneId);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!assetName.trim()) newErrors.assetName = 'Asset name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: Record<string, unknown> = {
      assetName: assetName.trim(),
      priority,
      status,
    };
    if (assetCode.trim()) data.assetCode = assetCode.trim();
    if (machineCode.trim()) data.machineCode = machineCode.trim();
    if (serialNumber.trim()) data.serialNumber = serialNumber.trim();
    if (categoryId) data.categoryId = categoryId;
    if (typeId) data.typeId = typeId;
    if (zoneId) data.zoneId = zoneId;
    if (lineWorkCenter.trim()) data.lineWorkCenter = lineWorkCenter.trim();
    if (capacity.trim()) data.capacity = capacity.trim();
    if (powerRating.trim()) data.powerRating = powerRating.trim();
    if (make.trim()) data.make = make.trim();
    if (model.trim()) data.model = model.trim();
    if (yearOfManufacture.trim()) data.yearOfManufacture = parseInt(yearOfManufacture, 10);
    if (status === 'IDLE' && idleReason.trim()) data.idleReason = idleReason.trim();
    onSubmit(data);
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const renderDropdownField = (
    label: string,
    dropdownName: string,
    value: string | undefined,
    placeholder: string,
    options: DropdownOption[] | string[],
    selectedId: string,
    onSelect: (val: string) => void,
    onAddNew?: () => void,
  ) => {
    const isOpen = openDropdown === dropdownName;
    return (
      <View style={[sheetStyles.field, { zIndex: isOpen ? 100 : 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
            {label}
          </Text>
          {onAddNew ? (
            <Pressable onPress={onAddNew} hitSlop={8}>
              <Text className="font-inter text-xs font-bold text-primary-600">+ New</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => toggleDropdown(dropdownName)}
          style={[
            sheetStyles.input,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            isOpen && { borderColor: colors.primary[400] },
          ]}
        >
          <Text
            className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}
          >
            {value || placeholder}
          </Text>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
              stroke={colors.neutral[400]}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        {isOpen && (
          <View style={sheetStyles.dropdown}>
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: 300 }}
              keyboardShouldPersistTaps="handled"
            >
              {(options as any[]).map((opt, idx) => {
                const optId = typeof opt === 'string' ? opt : opt.id;
                const optLabel = typeof opt === 'string' ? opt : opt.name;
                const isSelected = optId === selectedId;
                return (
                  <Pressable
                    key={optId}
                    onPress={() => {
                      onSelect(optId);
                      setOpenDropdown(null);
                    }}
                    style={[
                      sheetStyles.dropdownItem,
                      isSelected && { backgroundColor: colors.primary[50] },
                      idx > 0 && {
                        borderTopWidth: 1,
                        borderTopColor: colors.neutral[100],
                      },
                    ]}
                  >
                    <Text
                      className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}
                    >
                      {optLabel}
                    </Text>
                    {isSelected && (
                      <Svg width={15} height={15} viewBox="0 0 24 24">
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
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sheetStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={sheetStyles.header}>
          <Pressable onPress={onClose}>
            <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Cancel
            </Text>
          </Pressable>
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
            {isEdit ? 'Edit Machine' : 'Add Machine'}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            sheetStyles.formContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Asset Name */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Asset Name <Text className="text-danger-500">*</Text>
            </Text>
            <TextInput
              style={[
                sheetStyles.input,
                errors.assetName ? sheetStyles.inputError : undefined,
              ]}
              placeholder="Enter asset name"
              placeholderTextColor={colors.neutral[400]}
              value={assetName}
              onChangeText={(v) => { setAssetName(v); clearError('assetName'); }}
              autoCapitalize="words"
            />
            {errors.assetName ? (
              <Text className="mt-1 font-inter text-[10px] text-danger-600">
                {errors.assetName}
              </Text>
            ) : null}
          </View>

          {/* 2. Asset Code */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Asset Code
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Leave blank to auto-generate"
              placeholderTextColor={colors.neutral[400]}
              value={assetCode}
              onChangeText={(v) => { setAssetCode(v); }}
              autoCapitalize="characters"
            />
          </View>

          {/* 3. Serial Number (MFR) */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Serial Number (MFR)
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter serial number"
              placeholderTextColor={colors.neutral[400]}
              value={serialNumber}
              onChangeText={setSerialNumber}
            />
          </View>

          {/* 4. Machine Code */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Machine Code
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter machine code"
              placeholderTextColor={colors.neutral[400]}
              value={machineCode}
              onChangeText={setMachineCode}
            />
          </View>

          {/* 5. Category Dropdown + New */}
          {renderDropdownField(
            'Category',
            'category',
            selectedCategory?.name,
            'Select category',
            categories,
            categoryId,
            setCategoryId,
            onManageCategory,
          )}

          {/* 6. Type Dropdown + New */}
          {renderDropdownField(
            'Type',
            'type',
            selectedType?.name,
            'Select type',
            types,
            typeId,
            setTypeId,
            onManageType,
          )}

          {/* 7. Zone Dropdown + New */}
          {renderDropdownField(
            'Zone',
            'zone',
            selectedZone?.name,
            'Select zone',
            zones,
            zoneId,
            setZoneId,
            onManageZone,
          )}

          {/* 8. Line / Work Center */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Line / Work Center
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter line or work center"
              placeholderTextColor={colors.neutral[400]}
              value={lineWorkCenter}
              onChangeText={setLineWorkCenter}
            />
          </View>

          {/* 9. Priority Dropdown */}
          {renderDropdownField(
            'Priority',
            'priority',
            priority,
            'Select priority',
            PRIORITY_OPTIONS,
            priority,
            setPriority,
          )}

          {/* 10. Status Dropdown */}
          {renderDropdownField(
            'Status',
            'status',
            status,
            'Select status',
            STATUS_OPTIONS,
            status,
            setStatus,
          )}

          {/* 11. Idle Reason (only when status is IDLE) */}
          {status === 'IDLE' ? (
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Idle Reason
              </Text>
              <TextInput
                style={sheetStyles.input}
                placeholder="Reason for idle state"
                placeholderTextColor={colors.neutral[400]}
                value={idleReason}
                onChangeText={setIdleReason}
              />
            </View>
          ) : null}

          {/* 12. Capacity */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Capacity
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. 500 units/hr"
              placeholderTextColor={colors.neutral[400]}
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>

          {/* 13. Power Rating */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Power Rating
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. 15 kW"
              placeholderTextColor={colors.neutral[400]}
              value={powerRating}
              onChangeText={setPowerRating}
            />
          </View>

          {/* 14. Make */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Make
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Manufacturer name"
              placeholderTextColor={colors.neutral[400]}
              value={make}
              onChangeText={setMake}
            />
          </View>

          {/* 15. Model */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Model
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Machine model"
              placeholderTextColor={colors.neutral[400]}
              value={model}
              onChangeText={setModel}
            />
          </View>

          {/* 16. Year of Manufacture */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Year of Manufacture
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. 2024"
              placeholderTextColor={colors.neutral[400]}
              value={yearOfManufacture}
              onChangeText={setYearOfManufacture}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View
          style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          <Pressable
            style={({ pressed }) => [
              sheetStyles.submitBtn,
              pressed && { opacity: 0.85 },
              isSubmitting && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="font-inter text-base font-bold text-white">
                {isEdit ? 'Update Machine' : 'Create Machine'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

    </RNModal>
  );
}

// ============ MAIN COMPONENT ============

export function MachineMasterScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [editingMachine, setEditingMachine] = React.useState<MachineData | null>(null);

  const confirmModal = useConfirmModal();

  // Fetch dropdowns
  const { data: categoriesRaw } = useMachineCategories();
  const categories: DropdownOption[] = React.useMemo(() => {
    const data = (categoriesRaw as any)?.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' }));
  }, [categoriesRaw]);

  const { data: typesRaw } = useMachineTypes();
  const types: DropdownOption[] = React.useMemo(() => {
    const data = (typesRaw as any)?.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesRaw]);

  const { data: zonesRaw } = useMachineZones();
  const zones: DropdownOption[] = React.useMemo(() => {
    const data = (zonesRaw as any)?.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((z: any) => ({ id: z.id ?? '', name: z.name ?? '' }));
  }, [zonesRaw]);

  // Fetch machines
  const statusParam =
    activeFilter === 'running'
      ? 'RUNNING'
      : activeFilter === 'idle'
        ? 'IDLE'
        : activeFilter === 'maintenance'
          ? 'MAINTENANCE'
          : undefined;
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMachines({
    search: search.trim() || undefined,
    status: statusParam,
  });

  const machines: MachineData[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapApiMachine);
  }, [response]);

  const totalCount = (response as any)?.meta?.total ?? machines.length;

  const filterChips = React.useMemo(
    () => [
      { key: 'all', label: 'All', count: totalCount },
      { key: 'running', label: 'Running' },
      { key: 'idle', label: 'Idle' },
      { key: 'maintenance', label: 'Maintenance' },
    ],
    [totalCount],
  );

  // Mutations
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();
  const createCategory = useCreateMachineCategory();
  const updateCategory = useUpdateMachineCategory();
  const deleteCategory = useDeleteMachineCategory();
  const createType = useCreateMachineType();
  const updateType = useUpdateMachineType();
  const deleteType = useDeleteMachineType();
  const createZone = useCreateMachineZone();
  const updateZone = useUpdateMachineZone();
  const deleteZone = useDeleteMachineZone();

  // Manage modal state
  const [manageModal, setManageModal] = React.useState<'category' | 'zone' | 'type' | null>(null);

  // Ref to auto-select newly created items back in the form sheet
  const pendingSelectRef = React.useRef<{ field: 'categoryId' | 'typeId' | 'zoneId'; id: string } | null>(null);

  const handleAdd = () => {
    setEditingMachine(null);
    setSheetVisible(true);
  };

  const handleEdit = (machine: MachineData) => {
    setEditingMachine(machine);
    setSheetVisible(true);
  };

  const handleDelete = (machine: MachineData) => {
    confirmModal.show({
      title: 'Delete Machine',
      message: `Are you sure you want to delete "${machine.assetName}" (${machine.assetCode})? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteMachine.mutate(machine.id, {
          onSuccess: () => refetch(),
        });
      },
    });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingMachine) {
      updateMachine.mutate(
        { id: editingMachine.id, data },
        {
          onSuccess: () => {
            setSheetVisible(false);
            refetch();
          },
        },
      );
    } else {
      createMachine.mutate(data, {
        onSuccess: (res: any) => {
          const createdCode = res?.data?.assetCode ?? '';
          setSheetVisible(false);
          refetch();
          if (createdCode) {
            showSuccess('Machine Created', `Machine ${createdCode} created successfully`);
          }
        },
      });
    }
  };

  const renderMachine = ({ item, index }: { item: MachineData; index: number }) => (
    <MachineCard
      machine={item}
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
          title="Machine Master"
          subtitle={`${totalCount} machine${totalCount !== 1 ? 's' : ''}`}
          onMenuPress={toggle}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by asset code or name..."
          filters={filterChips}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
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
            title="Failed to load machines"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No machines found"
        message="Try adjusting your search or filters, or add a new machine."
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
        data={machines}
        renderItem={renderMachine}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
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

      <MachineFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        machine={editingMachine}
        categories={categories}
        types={types}
        zones={zones}
        onSubmit={handleSubmit}
        isSubmitting={createMachine.isPending || updateMachine.isPending}
        onManageCategory={() => setManageModal('category')}
        onManageType={() => setManageModal('type')}
        onManageZone={() => setManageModal('zone')}
      />

      {/* Manage Machine Category */}
      <ManageModal
        visible={manageModal === 'category'}
        onClose={() => setManageModal(null)}
        title="Manage Machine Categories"
        items={categories}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'e.g. CNC', required: true },
        ]}
        onCreate={async (values) => {
          const res: any = await createCategory.mutateAsync(values);
          const newId = res?.data?.id ?? '';
          if (newId) {
            pendingSelectRef.current = { field: 'categoryId', id: newId };
          }
        }}
        onUpdate={async (id, values) => {
          await updateCategory.mutateAsync({ id, data: values });
        }}
        onDelete={async (id) => {
          await deleteCategory.mutateAsync(id);
        }}
        isCreating={createCategory.isPending}
        isUpdating={updateCategory.isPending}
        isDeleting={deleteCategory.isPending}
      />

      {/* Manage Machine Zones */}
      <ManageModal
        visible={manageModal === 'zone'}
        onClose={() => setManageModal(null)}
        title="Manage Machine Zones"
        items={zones}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'e.g. Zone A', required: true },
        ]}
        onCreate={async (values) => {
          const res: any = await createZone.mutateAsync({ name: values.name });
          const newId = res?.data?.id ?? '';
          if (newId) {
            pendingSelectRef.current = { field: 'zoneId', id: newId };
          }
        }}
        onUpdate={async (id, values) => {
          await updateZone.mutateAsync({ id, data: values });
        }}
        onDelete={async (id) => {
          await deleteZone.mutateAsync(id);
        }}
        isCreating={createZone.isPending}
        isUpdating={updateZone.isPending}
        isDeleting={deleteZone.isPending}
      />

      {/* Manage Machine Types */}
      <ManageModal
        visible={manageModal === 'type'}
        onClose={() => setManageModal(null)}
        title="Manage Machine Types"
        items={types}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'e.g. Lathe', required: true },
        ]}
        onCreate={async (values) => {
          const res: any = await createType.mutateAsync(values);
          const newId = res?.data?.id ?? '';
          if (newId) {
            pendingSelectRef.current = { field: 'typeId', id: newId };
          }
        }}
        onUpdate={async (id, values) => {
          await updateType.mutateAsync({ id, data: values });
        }}
        onDelete={async (id) => {
          await deleteType.mutateAsync(id);
        }}
        isCreating={createType.isPending}
        isUpdating={updateType.isPending}
        isDeleting={deleteType.isPending}
      />

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
    alignItems: 'center',
  },
  machineInfo: {
    flex: 1,
    marginRight: 8,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 8,
    flexWrap: 'wrap',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 'auto',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

const createSheetStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100],
    },
    formContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    field: {
      marginBottom: 20,
    },
    input: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: isDark ? colors.white : colors.primary[950],
    },
    inputError: {
      borderColor: colors.danger[400],
      borderWidth: 1.5,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 200,
      backgroundColor: isDark ? '#1A1730' : '#fff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? colors.primary[800] : colors.primary[200],
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 20,
      overflow: 'hidden',
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    submitContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
      backgroundColor: isDark ? '#1A1730' : colors.white,
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

