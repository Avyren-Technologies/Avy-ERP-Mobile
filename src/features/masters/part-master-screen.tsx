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
  Switch,
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
import {
  useCreatePart,
  useUpdatePart,
  useDeletePart,
  useCreatePartCategory,
  useUpdatePartCategory,
  useDeletePartCategory,
  useCreateProductModel,
  useUpdateProductModel,
  useDeleteProductModel,
  useCreateUom,
  useUpdateUom,
  useDeleteUom,
  useCreateComponentType,
  useUpdateComponentType,
  useDeleteComponentType,
} from '@/features/masters/api/use-masters-mutations';
import {
  useParts,
  usePartCategories,
  useProductModels,
  useUoms,
  useComponentTypes,
} from '@/features/masters/api/use-masters-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface PartData {
  id: string;
  partNumber: string;
  name: string;
  engineeringPartNo?: string;
  categoryName?: string;
  categoryId?: string;
  productModelName?: string;
  productModelId?: string;
  uomId?: string;
  uomName?: string;
  componentTypeId?: string;
  componentTypeName?: string;
  partType: string;
  hsnCode?: string;
  weight?: number;
  dimensions?: string;
  revision?: string;
  drawingReference?: string;
  status: string;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  isBomEnabled: boolean;
  isQcRequired: boolean;
  isInventoryItem: boolean;
}

interface DropdownOption {
  id: string;
  name: string;
}

// ============ HELPERS ============

const PART_TYPE_OPTIONS = ['FINISH_PART', 'RAW_MATERIAL', 'SEMI_FINISHED', 'CONSUMABLE', 'SPARE'];
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'DISCONTINUED'];

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return { bg: colors.success[50], text: colors.success[700] };
    case 'INACTIVE':
      return { bg: colors.neutral[100], text: colors.neutral[600] };
    case 'DISCONTINUED':
      return { bg: colors.danger[50], text: colors.danger[700] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

function mapApiPart(item: any): PartData {
  return {
    id: item.id ?? '',
    partNumber: item.partNumber ?? '',
    name: item.name ?? '',
    engineeringPartNo: item.engineeringPartNo ?? undefined,
    categoryName: item.category?.name ?? '',
    categoryId: item.categoryId ?? '',
    productModelName: item.productModel?.name ?? '',
    productModelId: item.productModelId ?? '',
    uomId: item.uomId ?? '',
    uomName: item.uom?.name ?? '',
    componentTypeId: item.componentTypeId ?? '',
    componentTypeName: item.componentType?.name ?? '',
    partType: item.partType ?? '',
    hsnCode: item.hsnCode ?? '',
    weight: item.weight ?? undefined,
    dimensions: item.dimensions ?? '',
    revision: item.revision ?? '',
    drawingReference: item.drawingReference ?? '',
    status: item.status ?? 'ACTIVE',
    isBatchTracked: item.isBatchTracked ?? false,
    isSerialTracked: item.isSerialTracked ?? false,
    isBomEnabled: item.isBomEnabled ?? false,
    isQcRequired: item.isQcRequired ?? false,
    isInventoryItem: item.isInventoryItem ?? true,
  };
}

function formatPartType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============ PART CARD ============

function PartCard({
  part,
  index,
  isDark,
  onEdit,
  onDelete,
}: {
  part: PartData;
  index: number;
  isDark: boolean;
  onEdit: (part: PartData) => void;
  onDelete: (part: PartData) => void;
}) {
  const statusColor = getStatusColor(part.status);

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
          <View style={cardStyles.partInfo}>
            <View style={[cardStyles.partBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {part.partNumber}
              </Text>
            </View>
            <View style={cardStyles.partNameContainer}>
              <Text
                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                numberOfLines={1}
              >
                {part.name}
              </Text>
              {part.productModelName ? (
                <Text
                  className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                  numberOfLines={1}
                >
                  {part.productModelName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Actions */}
          <View style={cardStyles.cardActions}>
            <Pressable
              onPress={() => onEdit(part)}
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
              onPress={() => onDelete(part)}
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
          {part.categoryName ? (
            <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-accent-700">
                {part.categoryName}
              </Text>
            </View>
          ) : null}

          <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-primary-700">
              {formatPartType(part.partType)}
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
              {part.status}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ ADD/EDIT FORM SHEET ============

function PartFormSheet({
  visible,
  onClose,
  part,
  categories,
  productModels,
  uoms,
  componentTypes,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  part?: PartData | null;
  categories: DropdownOption[];
  productModels: DropdownOption[];
  uoms: DropdownOption[];
  componentTypes: DropdownOption[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isEdit = !!part;

  // Form state — 18 fields
  const [partNumber, setPartNumber] = React.useState('');
  const [name, setName] = React.useState('');
  const [engineeringPartNo, setEngineeringPartNo] = React.useState('');
  const [productModelId, setProductModelId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [uomId, setUomId] = React.useState('');
  const [componentTypeId, setComponentTypeId] = React.useState('');
  const [partType, setPartType] = React.useState('FINISH_PART');
  const [hsnCode, setHsnCode] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [dimensions, setDimensions] = React.useState('');
  const [revision, setRevision] = React.useState('');
  const [drawingReference, setDrawingReference] = React.useState('');
  const [status, setStatus] = React.useState('ACTIVE');
  const [isBatchTracked, setIsBatchTracked] = React.useState(false);
  const [isSerialTracked, setIsSerialTracked] = React.useState(false);
  const [isBomEnabled, setIsBomEnabled] = React.useState(false);
  const [isQcRequired, setIsQcRequired] = React.useState(false);
  const [isInventoryItem, setIsInventoryItem] = React.useState(true);

  // Dropdown visibility
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [showModelDropdown, setShowModelDropdown] = React.useState(false);
  const [showUomDropdown, setShowUomDropdown] = React.useState(false);
  const [showComponentTypeDropdown, setShowComponentTypeDropdown] = React.useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = React.useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // ManageModal visibility
  const [showManageModel, setShowManageModel] = React.useState(false);
  const [showManageCategory, setShowManageCategory] = React.useState(false);
  const [showManageUom, setShowManageUom] = React.useState(false);
  const [showManageComponentType, setShowManageComponentType] = React.useState(false);

  // Mutations for ManageModal
  const createModelMutation = useCreateProductModel();
  const updateModelMutation = useUpdateProductModel();
  const deleteModelMutation = useDeleteProductModel();
  const createCategoryMutation = useCreatePartCategory();
  const updateCategoryMutation = useUpdatePartCategory();
  const deleteCategoryMutation = useDeletePartCategory();
  const createUomMutation = useCreateUom();
  const updateUomMutation = useUpdateUom();
  const deleteUomMutation = useDeleteUom();
  const createComponentTypeMutation = useCreateComponentType();
  const updateComponentTypeMutation = useUpdateComponentType();
  const deleteComponentTypeMutation = useDeleteComponentType();

  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowModelDropdown(false);
    setShowUomDropdown(false);
    setShowComponentTypeDropdown(false);
    setShowTypeDropdown(false);
    setShowStatusDropdown(false);
  };

  React.useEffect(() => {
    if (visible) {
      if (part) {
        setPartNumber(part.partNumber ?? '');
        setName(part.name ?? '');
        setEngineeringPartNo(part.engineeringPartNo ?? '');
        setProductModelId(part.productModelId ?? '');
        setCategoryId(part.categoryId ?? '');
        setUomId(part.uomId ?? '');
        setComponentTypeId(part.componentTypeId ?? '');
        setPartType(part.partType ?? 'FINISH_PART');
        setHsnCode(part.hsnCode ?? '');
        setWeight(part.weight != null ? String(part.weight) : '');
        setDimensions(part.dimensions ?? '');
        setRevision(part.revision ?? '');
        setDrawingReference(part.drawingReference ?? '');
        setStatus(part.status ?? 'ACTIVE');
        setIsBatchTracked(part.isBatchTracked ?? false);
        setIsSerialTracked(part.isSerialTracked ?? false);
        setIsBomEnabled(part.isBomEnabled ?? false);
        setIsQcRequired(part.isQcRequired ?? false);
        setIsInventoryItem(part.isInventoryItem ?? true);
      } else {
        setPartNumber('');
        setName('');
        setEngineeringPartNo('');
        setProductModelId('');
        setCategoryId('');
        setUomId('');
        setComponentTypeId('');
        setPartType('FINISH_PART');
        setHsnCode('');
        setWeight('');
        setDimensions('');
        setRevision('');
        setDrawingReference('');
        setStatus('ACTIVE');
        setIsBatchTracked(false);
        setIsSerialTracked(false);
        setIsBomEnabled(false);
        setIsQcRequired(false);
        setIsInventoryItem(true);
      }
      setErrors({});
      closeAllDropdowns();
    }
  }, [visible, part]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedModel = productModels.find((m) => m.id === productModelId);
  const selectedUom = uoms.find((u) => u.id === uomId);
  const selectedComponentType = componentTypes.find((ct) => ct.id === componentTypeId);

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
    if (!name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      partType,
      status,
    };
    if (partNumber.trim()) data.partNumber = partNumber.trim();
    if (engineeringPartNo.trim()) data.engineeringPartNo = engineeringPartNo.trim();
    if (productModelId) data.productModelId = productModelId;
    if (categoryId) data.categoryId = categoryId;
    if (uomId) data.uomId = uomId;
    if (componentTypeId) data.componentTypeId = componentTypeId;
    if (hsnCode.trim()) data.hsnCode = hsnCode.trim();
    if (weight.trim()) data.weight = parseFloat(weight);
    if (dimensions.trim()) data.dimensions = dimensions.trim();
    if (revision.trim()) data.revision = revision.trim();
    if (drawingReference.trim()) data.drawingReference = drawingReference.trim();
    data.isBatchTracked = isBatchTracked;
    data.isSerialTracked = isSerialTracked;
    data.isBomEnabled = isBomEnabled;
    data.isQcRequired = isQcRequired;
    data.isInventoryItem = isInventoryItem;
    onSubmit(data);
  };

  // ManageModal async handlers
  const handleManageCreateModel = async (values: Record<string, string>) => {
    const res: any = await createModelMutation.mutateAsync({ name: values.name?.trim() });
    const created = res?.data ?? res;
    if (created?.id) setProductModelId(created.id);
  };

  const handleManageUpdateModel = async (id: string, values: Record<string, string>) => {
    await updateModelMutation.mutateAsync({ id, data: { name: values.name?.trim() } });
  };

  const handleManageDeleteModel = async (id: string) => {
    await deleteModelMutation.mutateAsync(id);
    if (productModelId === id) setProductModelId('');
  };

  const handleManageCreateCategory = async (values: Record<string, string>) => {
    const res: any = await createCategoryMutation.mutateAsync({ name: values.name?.trim() });
    const created = res?.data ?? res;
    if (created?.id) setCategoryId(created.id);
  };

  const handleManageUpdateCategory = async (id: string, values: Record<string, string>) => {
    await updateCategoryMutation.mutateAsync({ id, data: { name: values.name?.trim() } });
  };

  const handleManageDeleteCategory = async (id: string) => {
    await deleteCategoryMutation.mutateAsync(id);
    if (categoryId === id) setCategoryId('');
  };

  const handleManageCreateUom = async (values: Record<string, string>) => {
    const res: any = await createUomMutation.mutateAsync({
      name: values.name?.trim(),
      abbreviation: values.abbreviation?.trim() || undefined,
    });
    const created = res?.data ?? res;
    if (created?.id) setUomId(created.id);
  };

  const handleManageUpdateUom = async (id: string, values: Record<string, string>) => {
    await updateUomMutation.mutateAsync({
      id,
      data: { name: values.name?.trim(), abbreviation: values.abbreviation?.trim() || undefined },
    });
  };

  const handleManageDeleteUom = async (id: string) => {
    await deleteUomMutation.mutateAsync(id);
    if (uomId === id) setUomId('');
  };

  const handleManageCreateComponentType = async (values: Record<string, string>) => {
    const res: any = await createComponentTypeMutation.mutateAsync({ name: values.name?.trim() });
    const created = res?.data ?? res;
    if (created?.id) {
      setComponentTypeId(created.id);
      if (!name.trim()) setName(values.name?.trim() ?? '');
    }
  };

  const handleManageUpdateComponentType = async (id: string, values: Record<string, string>) => {
    await updateComponentTypeMutation.mutateAsync({ id, data: { name: values.name?.trim() } });
  };

  const handleManageDeleteComponentType = async (id: string) => {
    await deleteComponentTypeMutation.mutateAsync(id);
    if (componentTypeId === id) setComponentTypeId('');
  };

  const renderDropdownField = (
    label: string,
    value: string | undefined,
    placeholder: string,
    isOpen: boolean,
    toggle: () => void,
    options: DropdownOption[] | string[],
    selectedId: string,
    onSelect: (val: string) => void,
    onCloseDropdown: () => void,
    onCreateNew?: () => void,
  ) => (
    <View style={[sheetStyles.field, { zIndex: isOpen ? 100 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
          {label}
        </Text>
        {onCreateNew ? (
          <Pressable onPress={onCreateNew} hitSlop={8}>
            <Text className="font-inter text-xs font-bold text-primary-600">
              + New
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={toggle}
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
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
          >
            {(options as any[]).map((opt, idx) => {
              const optId = typeof opt === 'string' ? opt : opt.id;
              const optLabel = typeof opt === 'string' ? formatPartType(opt) : opt.name;
              const isSelected = optId === selectedId;
              return (
                <Pressable
                  key={optId}
                  onPress={() => {
                    onSelect(optId);
                    onCloseDropdown();
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

  const renderToggleRow = (
    label: string,
    subtitle: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
  ) => (
    <View style={sheetStyles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
          {label}
        </Text>
        <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.neutral[200],
          true: colors.primary[400],
        }}
        thumbColor={value ? colors.primary[600] : colors.neutral[300]}
      />
    </View>
  );

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
            {isEdit ? 'Edit Part' : 'Add Part'}
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
          {/* 1. Component Type dropdown */}
          {renderDropdownField(
            'Component / Part Type',
            selectedComponentType?.name,
            'Select component type',
            showComponentTypeDropdown,
            () => {
              closeAllDropdowns();
              setShowComponentTypeDropdown((v) => !v);
            },
            componentTypes,
            componentTypeId,
            (val) => {
              setComponentTypeId(val);
              const ct = componentTypes.find((c) => c.id === val);
              if (ct && !name.trim()) setName(ct.name);
            },
            () => setShowComponentTypeDropdown(false),
            () => setShowManageComponentType(true),
          )}

          {/* 2. Part Name (required) */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Part Name <Text className="text-danger-500">*</Text>
            </Text>
            <TextInput
              style={[
                sheetStyles.input,
                errors.name ? sheetStyles.inputError : undefined,
              ]}
              placeholder="Enter part name"
              placeholderTextColor={colors.neutral[400]}
              value={name}
              onChangeText={(v) => { setName(v); clearError('name'); }}
              autoCapitalize="words"
            />
            {errors.name ? (
              <Text className="mt-1 font-inter text-[10px] text-danger-600">
                {errors.name}
              </Text>
            ) : null}
          </View>

          {/* 3. Product Model + Manage */}
          {renderDropdownField(
            'Product Model',
            selectedModel?.name,
            'Select product model',
            showModelDropdown,
            () => {
              closeAllDropdowns();
              setShowModelDropdown((v) => !v);
            },
            productModels,
            productModelId,
            setProductModelId,
            () => setShowModelDropdown(false),
            () => setShowManageModel(true),
          )}

          {/* 3. Engineering Part No */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Engineering Part No
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter engineering part number"
              placeholderTextColor={colors.neutral[400]}
              value={engineeringPartNo}
              onChangeText={setEngineeringPartNo}
            />
          </View>

          {/* 4. Status Dropdown */}
          {renderDropdownField(
            'Status',
            status,
            'Select status',
            showStatusDropdown,
            () => {
              closeAllDropdowns();
              setShowStatusDropdown((v) => !v);
            },
            STATUS_OPTIONS,
            status,
            setStatus,
            () => setShowStatusDropdown(false),
          )}

          {/* 5. Part Number (auto-generate hint) */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Part Number
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Leave blank to auto-generate"
              placeholderTextColor={colors.neutral[400]}
              value={partNumber}
              onChangeText={(v) => { setPartNumber(v); }}
              autoCapitalize="characters"
            />
          </View>

          {/* 7. Category + Manage */}
          {renderDropdownField(
            'Category',
            selectedCategory?.name,
            'Select category',
            showCategoryDropdown,
            () => {
              closeAllDropdowns();
              setShowCategoryDropdown((v) => !v);
            },
            categories,
            categoryId,
            setCategoryId,
            () => setShowCategoryDropdown(false),
            () => setShowManageCategory(true),
          )}

          {/* 8. Unit of Measure + Manage */}
          {renderDropdownField(
            'Unit of Measure',
            selectedUom?.name,
            'Select unit of measure',
            showUomDropdown,
            () => {
              closeAllDropdowns();
              setShowUomDropdown((v) => !v);
            },
            uoms,
            uomId,
            setUomId,
            () => setShowUomDropdown(false),
            () => setShowManageUom(true),
          )}

          {/* 8. Part Type Dropdown */}
          {renderDropdownField(
            'Part Type',
            formatPartType(partType),
            'Select part type',
            showTypeDropdown,
            () => {
              closeAllDropdowns();
              setShowTypeDropdown((v) => !v);
            },
            PART_TYPE_OPTIONS,
            partType,
            setPartType,
            () => setShowTypeDropdown(false),
          )}

          {/* 9. HSN Code */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              HSN Code
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter HSN code"
              placeholderTextColor={colors.neutral[400]}
              value={hsnCode}
              onChangeText={setHsnCode}
            />
          </View>

          {/* 10. Weight (kg) */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Weight (kg)
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="Enter weight"
              placeholderTextColor={colors.neutral[400]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* 11. Dimensions */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Dimensions
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. 300x200x150mm"
              placeholderTextColor={colors.neutral[400]}
              value={dimensions}
              onChangeText={setDimensions}
            />
          </View>

          {/* 12. Revision */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Revision
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. Rev A"
              placeholderTextColor={colors.neutral[400]}
              value={revision}
              onChangeText={setRevision}
            />
          </View>

          {/* 13. Drawing Reference */}
          <View style={sheetStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Drawing Reference
            </Text>
            <TextInput
              style={sheetStyles.input}
              placeholder="e.g. DWG-CS-001"
              placeholderTextColor={colors.neutral[400]}
              value={drawingReference}
              onChangeText={setDrawingReference}
            />
          </View>

          {/* 14. Capabilities Section Header */}
          <View style={sheetStyles.sectionHeader}>
            <Text className="font-inter text-sm font-bold text-primary-900 dark:text-primary-100">
              Capabilities
            </Text>
          </View>

          {/* 15. Toggle switches */}
          {renderToggleRow('Batch Tracked', 'Track parts in batches', isBatchTracked, setIsBatchTracked)}
          {renderToggleRow('Serial Tracked', 'Track individual serial numbers', isSerialTracked, setIsSerialTracked)}
          {renderToggleRow('BOM Enabled', 'Part has a Bill of Materials', isBomEnabled, setIsBomEnabled)}
          {renderToggleRow('QC Required', 'Quality check required', isQcRequired, setIsQcRequired)}
          {renderToggleRow('Inventory Item', 'Tracked in inventory', isInventoryItem, setIsInventoryItem)}
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
                {isEdit ? 'Update Part' : 'Create Part'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ManageModal — Product Model */}
      <ManageModal
        visible={showManageModel}
        onClose={() => setShowManageModel(false)}
        title="Manage Product Models"
        items={productModels.map((m) => ({ id: m.id, name: m.name }))}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'Enter model name', required: true },
        ]}
        onCreate={handleManageCreateModel}
        onUpdate={handleManageUpdateModel}
        onDelete={handleManageDeleteModel}
        isCreating={createModelMutation.isPending}
        isUpdating={updateModelMutation.isPending}
        isDeleting={deleteModelMutation.isPending}
      />

      {/* ManageModal — Category */}
      <ManageModal
        visible={showManageCategory}
        onClose={() => setShowManageCategory(false)}
        title="Manage Categories"
        items={categories.map((c) => ({ id: c.id, name: c.name }))}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'Enter category name', required: true },
        ]}
        onCreate={handleManageCreateCategory}
        onUpdate={handleManageUpdateCategory}
        onDelete={handleManageDeleteCategory}
        isCreating={createCategoryMutation.isPending}
        isUpdating={updateCategoryMutation.isPending}
        isDeleting={deleteCategoryMutation.isPending}
      />

      {/* ManageModal — Unit of Measure */}
      <ManageModal
        visible={showManageUom}
        onClose={() => setShowManageUom(false)}
        title="Manage Units of Measure"
        items={uoms.map((u) => ({ id: u.id, name: u.name }))}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'Enter UOM name', required: true },
          { key: 'abbreviation', label: 'Abbreviation', placeholder: 'e.g. kg, pcs, m' },
        ]}
        onCreate={handleManageCreateUom}
        onUpdate={handleManageUpdateUom}
        onDelete={handleManageDeleteUom}
        isCreating={createUomMutation.isPending}
        isUpdating={updateUomMutation.isPending}
        isDeleting={deleteUomMutation.isPending}
      />

      {/* ManageModal — Component Type */}
      <ManageModal
        visible={showManageComponentType}
        onClose={() => setShowManageComponentType(false)}
        title="Manage Component Types"
        items={componentTypes.map((ct) => ({ id: ct.id, name: ct.name }))}
        isLoading={false}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'Enter component type name', required: true },
        ]}
        onCreate={handleManageCreateComponentType}
        onUpdate={handleManageUpdateComponentType}
        onDelete={handleManageDeleteComponentType}
        isCreating={createComponentTypeMutation.isPending}
        isUpdating={updateComponentTypeMutation.isPending}
        isDeleting={deleteComponentTypeMutation.isPending}
      />
    </RNModal>
  );
}

// ============ MAIN COMPONENT ============

export function PartMasterScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [editingPart, setEditingPart] = React.useState<PartData | null>(null);

  const confirmModal = useConfirmModal();

  // Fetch categories and product models for dropdowns
  const { data: categoriesRaw } = usePartCategories();
  const categories: DropdownOption[] = React.useMemo(() => {
    const data = (categoriesRaw as any)?.data ?? categoriesRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' }));
  }, [categoriesRaw]);

  const { data: modelsRaw } = useProductModels();
  const productModels: DropdownOption[] = React.useMemo(() => {
    const data = (modelsRaw as any)?.data ?? modelsRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((m: any) => ({ id: m.id ?? '', name: m.name ?? '' }));
  }, [modelsRaw]);

  const { data: uomsRaw } = useUoms();
  const uomsList: DropdownOption[] = React.useMemo(() => {
    const data = (uomsRaw as any)?.data ?? uomsRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((u: any) => ({ id: u.id ?? '', name: u.name ?? '' }));
  }, [uomsRaw]);

  const { data: componentTypesRaw } = useComponentTypes();
  const componentTypesList: DropdownOption[] = React.useMemo(() => {
    const data = (componentTypesRaw as any)?.data ?? componentTypesRaw ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((ct: any) => ({ id: ct.id ?? '', name: ct.name ?? '' }));
  }, [componentTypesRaw]);

  // Fetch parts
  const statusParam =
    activeFilter === 'active'
      ? 'ACTIVE'
      : activeFilter === 'inactive'
        ? 'INACTIVE'
        : undefined;
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useParts({
    search: search.trim() || undefined,
    status: statusParam,
  });

  const parts: PartData[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapApiPart);
  }, [response]);

  const totalCount = (response as any)?.meta?.total ?? parts.length;

  const filterChips = React.useMemo(
    () => [
      { key: 'all', label: 'All', count: totalCount },
      { key: 'active', label: 'Active' },
      { key: 'inactive', label: 'Inactive' },
    ],
    [totalCount],
  );

  // Mutations
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();

  const handleAdd = () => {
    setEditingPart(null);
    setSheetVisible(true);
  };

  const handleEdit = (part: PartData) => {
    setEditingPart(part);
    setSheetVisible(true);
  };

  const handleDelete = (part: PartData) => {
    confirmModal.show({
      title: 'Delete Part',
      message: `Are you sure you want to delete "${part.name}" (${part.partNumber})? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deletePart.mutate(part.id, {
          onSuccess: () => refetch(),
        });
      },
    });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingPart) {
      updatePart.mutate(
        { id: editingPart.id, data },
        {
          onSuccess: () => {
            setSheetVisible(false);
            refetch();
          },
        },
      );
    } else {
      createPart.mutate(data, {
        onSuccess: () => {
          setSheetVisible(false);
          refetch();
        },
      });
    }
  };

  const renderPart = ({ item, index }: { item: PartData; index: number }) => (
    <PartCard
      part={item}
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
          title="Part Master"
          subtitle={`${totalCount} part${totalCount !== 1 ? 's' : ''}`}
          onMenuPress={toggle}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by part number or name..."
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
            title="Failed to load parts"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No parts found"
        message="Try adjusting your search or filters, or add a new part."
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
        data={parts}
        renderItem={renderPart}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={110}
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

      <PartFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        part={editingPart}
        categories={categories}
        productModels={productModels}
        uoms={uomsList}
        componentTypes={componentTypesList}
        onSubmit={handleSubmit}
        isSubmitting={createPart.isPending || updatePart.isPending}
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
  partInfo: {
    flex: 1,
    marginRight: 8,
  },
  partBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  partNameContainer: {
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

const sheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  field: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.primary[950],
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
    backgroundColor: '#fff',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    backgroundColor: colors.white,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
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

