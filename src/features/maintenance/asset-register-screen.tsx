/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Modal as RNModal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
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
import { HelpDrawer } from '@/components/ui/help-drawer';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { assetRegisterHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { ManageModal } from '@/components/ui/manage-modal';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { DatePickerField } from '@/components/ui/date-picker';
import { showSuccess, showWarning } from '@/components/ui/utils';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import {
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useCreateAssetCategory,
  useUpdateAssetCategory,
  useDeleteAssetCategory,
  useCreateAssetSubCategory,
  useUpdateAssetSubCategory,
  useDeleteAssetSubCategory,
  useCreateAssetType,
  useUpdateAssetType,
  useDeleteAssetType,
  useCreateAssetClassOption,
  useUpdateAssetClassOption,
  useDeleteAssetClassOption,
  useCreateOwnershipOption,
  useUpdateOwnershipOption,
  useDeleteOwnershipOption,
  useCreatePTWClassOption,
  useUpdatePTWClassOption,
  useDeletePTWClassOption,
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
  useAssets,
  useAssetCategories,
  useAssetSubCategories,
  useAssetTypes,
  useAssetClassOptions,
  useOwnershipOptions,
  usePTWClassOptions,
} from '@/features/maintenance/api/use-maintenance-queries';
import { AssetStatusBadge } from '@/features/maintenance/shared/asset-status-badge';
import { CriticalityBadge } from '@/features/maintenance/shared/criticality-badge';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface AssetData {
  id: string;
  assetNumber: string;
  name: string;
  assetClass: string;
  criticality: string;
  operationalStatus: string;
  maintenanceStatus: string;
  categoryId?: string;
  categoryName?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  typeId?: string;
  typeName?: string;
  locationId?: string;
  locationName?: string;
  parentAssetId?: string;
  linkedMachineId?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  description?: string;

  // Detailed fields mapped for edit/view modes
  ownership?: string;
  isBottleneck?: boolean;
  floorZone?: string;
  manufacturer?: string;
  brand?: string;
  modelNumber?: string;
  commissioningDate?: string;
  condition?: string;
  ratedCapacity?: string;
  designLifeYears?: number;
  permitRequired?: boolean;
  ptwClass?: string;
  warrantyExpiry?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  fitnessExpiry?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  replacementValue?: number;
}

interface DropdownOption {
  id: string;
  name: string;
}

// ============ HELPERS ============

const ASSET_CLASS_OPTIONS = ['MACHINE', 'VEHICLE', 'BUILDING', 'TOOL', 'INSTRUMENT', 'UTILITY', 'IT_EQUIPMENT', 'FURNITURE', 'OTHER'];
const CRITICALITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const OP_STATUS_OPTIONS = ['RUNNING', 'IDLE', 'BREAKDOWN', 'SHUTDOWN', 'INACTIVE', 'RETIRED'];
const OWNERSHIP_OPTIONS = ['OWNED', 'LEASED', 'AMC_MANAGED', 'CUSTOMER_SITE'];
const PTW_CLASS_OPTIONS = ['HOT_WORK', 'CONFINED_SPACE', 'ELECTRICAL_ISOLATION', 'PRESSURE_RELEASE', 'GENERAL_WORK'];
const CONDITION_OPTIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];

function mapApiAsset(item: any): AssetData {
  return {
    id: item.id ?? '',
    assetNumber: item.assetNumber ?? '',
    name: item.name ?? '',
    assetClass: item.assetClass ?? 'OTHER',
    criticality: item.criticality ?? 'MEDIUM',
    operationalStatus: item.operationalStatus ?? 'IDLE',
    maintenanceStatus: item.maintenanceStatus ?? 'NO_ACTION',
    categoryId: item.categoryId ?? undefined,
    categoryName: item.category?.name ?? '',
    subCategoryId: item.subCategoryId ?? undefined,
    subCategoryName: item.subCategory?.name ?? '',
    typeId: item.typeId ?? undefined,
    typeName: item.type?.name ?? '',
    locationId: item.locationId ?? undefined,
    locationName: item.location?.name ?? '',
    parentAssetId: item.parentAssetId ?? undefined,
    linkedMachineId: item.linkedMachineId ?? undefined,
    make: item.manufacturer ?? item.make ?? undefined,
    model: item.modelNumber ?? item.model ?? undefined,
    serialNumber: item.serialNumber ?? undefined,
    description: item.description ?? undefined,

    // Detailed mappings
    ownership: item.ownership ?? 'OWNED',
    isBottleneck: item.isBottleneck ?? false,
    floorZone: item.floorZone ?? undefined,
    manufacturer: item.manufacturer ?? undefined,
    brand: item.brand ?? undefined,
    modelNumber: item.modelNumber ?? undefined,
    commissioningDate: item.commissioningDate ?? undefined,
    condition: item.condition ?? undefined,
    ratedCapacity: item.ratedCapacity ?? undefined,
    designLifeYears: item.designLifeYears != null ? Number(item.designLifeYears) : undefined,
    permitRequired: item.permitRequired ?? false,
    ptwClass: item.ptwClass ?? undefined,
    warrantyExpiry: item.warrantyExpiry ?? undefined,
    insuranceExpiry: item.insuranceExpiry ?? undefined,
    registrationExpiry: item.registrationExpiry ?? undefined,
    fitnessExpiry: item.fitnessExpiry ?? undefined,
    purchaseCost: item.purchaseCost != null ? Number(item.purchaseCost) : undefined,
    currentBookValue: item.currentBookValue != null ? Number(item.currentBookValue) : undefined,
    replacementValue: item.replacementValue != null ? Number(item.replacementValue) : undefined,
  };
}

// ============ ASSET CARD ============

function AssetCard({
  asset,
  index,
  isDark,
  onPress,
  onEdit,
  onDelete,
}: {
  asset: AssetData;
  index: number;
  isDark: boolean;
  onPress: (asset: AssetData) => void;
  onEdit: (asset: AssetData) => void;
  onDelete: (asset: AssetData) => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
      <Pressable
        onPress={() => onPress(asset)}
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
          <View style={cardStyles.assetInfo}>
            <View style={[cardStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {asset.assetNumber}
              </Text>
            </View>
            <View style={cardStyles.nameContainer}>
              <Text
                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                numberOfLines={1}
              >
                {asset.name}
              </Text>
              {asset.locationName ? (
                <Text
                  className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                  numberOfLines={1}
                >
                  {asset.locationName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Actions: Eye (view detail), Edit, Delete */}
          <View style={cardStyles.cardActions}>
            {/* Eye / View icon — navigates to asset detail with all tabs */}
            <Pressable
              onPress={(e) => { (e as any).stopPropagation?.(); onPress(asset); }}
              style={[cardStyles.actionBtn, { backgroundColor: isDark ? '#1E3A5F' : colors.info[50] }]}
              hitSlop={8}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  stroke={colors.info[600]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M12 9a3 3 0 100 6 3 3 0 000-6z"
                  stroke={colors.info[600]}
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            {/* Edit icon */}
            <Pressable
              onPress={(e) => { (e as any).stopPropagation?.(); onEdit(asset); }}
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
            {/* Delete icon */}
            <Pressable
              onPress={(e) => { (e as any).stopPropagation?.(); onDelete(asset); }}
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
          <View style={[cardStyles.tagBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
            <Text className="font-inter text-[10px] font-bold text-accent-700">
              {asset.assetClass.replace(/_/g, ' ')}
            </Text>
          </View>
          <CriticalityBadge criticality={asset.criticality} />
          <View style={{ marginLeft: 'auto' }}>
            <AssetStatusBadge operationalStatus={asset.operationalStatus} maintenanceStatus={asset.maintenanceStatus} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ ASSET FORM SHEET ============

function AssetFormSheet({
  visible,
  onClose,
  asset,
  categories,
  subCategories,
  types,
  locations,
  onSubmit,
  isSubmitting,
  onManageCategory,
  onManageSubCategory,
  onManageType,
  categoryId,
  setCategoryId,
  subCategoryId,
  setSubCategoryId,
  assetClassOptions,
  ownershipOptions,
  ptwClassOptions,
  onManageAssetClass,
  onManageOwnership,
  onManagePTWClass,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  asset?: AssetData | null;
  categories: DropdownOption[];
  subCategories: DropdownOption[];
  types: DropdownOption[];
  locations: DropdownOption[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onManageCategory: () => void;
  onManageSubCategory: () => void;
  onManageType: () => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  subCategoryId: string;
  setSubCategoryId: (id: string) => void;
  assetClassOptions?: DropdownOption[];
  ownershipOptions?: DropdownOption[];
  ptwClassOptions?: DropdownOption[];
  onManageAssetClass?: () => void;
  onManageOwnership?: () => void;
  onManagePTWClass?: () => void;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const sheetStyles = createSheetStyles(isDark);
  const isEdit = !!asset;

  // Identity
  const [name, setName] = React.useState('');
  const [assetClass, setAssetClass] = React.useState('MACHINE');
  const [serialNumber, setSerialNumber] = React.useState('');

  // Classification
  const [typeId, setTypeId] = React.useState('');
  const [ownership, setOwnership] = React.useState('OWNED');
  const [criticality, setCriticality] = React.useState('MEDIUM');
  const [isBottleneck, setIsBottleneck] = React.useState(false);

  // Location
  const [locationId, setLocationId] = React.useState('');
  const [floorZone, setFloorZone] = React.useState('');

  // Technical
  const [manufacturer, setManufacturer] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [modelNumber, setModelNumber] = React.useState('');
  const [commissioningDate, setCommissioningDate] = React.useState('');
  const [condition, setCondition] = React.useState('');
  const [ratedCapacity, setRatedCapacity] = React.useState('');
  const [designLifeYears, setDesignLifeYears] = React.useState('');

  // Compliance
  const [permitRequired, setPermitRequired] = React.useState(false);
  const [ptwClass, setPtwClass] = React.useState('');
  const [warrantyExpiry, setWarrantyExpiry] = React.useState('');
  const [insuranceExpiry, setInsuranceExpiry] = React.useState('');
  const [registrationExpiry, setRegistrationExpiry] = React.useState('');
  const [fitnessExpiry, setFitnessExpiry] = React.useState('');

  // Financial
  const [purchaseCost, setPurchaseCost] = React.useState('');
  const [currentBookValue, setCurrentBookValue] = React.useState('');
  const [replacementValue, setReplacementValue] = React.useState('');

  // Description
  const [description, setDescription] = React.useState('');

  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      if (asset) {
        setName(asset.name ?? '');
        setAssetClass(asset.assetClass ?? 'MACHINE');
        setSerialNumber(asset.serialNumber ?? '');
        setCategoryId(asset.categoryId ?? '');
        setSubCategoryId(asset.subCategoryId ?? '');
        setTypeId(asset.typeId ?? '');
        setOwnership(asset.ownership ?? 'OWNED');
        setCriticality(asset.criticality ?? 'MEDIUM');
        setIsBottleneck(asset.isBottleneck ?? false);
        setLocationId(asset.locationId ?? '');
        setFloorZone(asset.floorZone ?? '');
        setManufacturer(asset.manufacturer ?? asset.make ?? '');
        setBrand(asset.brand ?? '');
        setModelNumber(asset.modelNumber ?? asset.model ?? '');
        setCommissioningDate(asset.commissioningDate ? String(asset.commissioningDate).split('T')[0] : '');
        setCondition(asset.condition ?? '');
        setRatedCapacity(asset.ratedCapacity ?? '');
        setDesignLifeYears(asset.designLifeYears != null ? String(asset.designLifeYears) : '');
        setPermitRequired(asset.permitRequired ?? false);
        setPtwClass(asset.ptwClass ?? '');
        setWarrantyExpiry(asset.warrantyExpiry ? String(asset.warrantyExpiry).split('T')[0] : '');
        setInsuranceExpiry(asset.insuranceExpiry ? String(asset.insuranceExpiry).split('T')[0] : '');
        setRegistrationExpiry(asset.registrationExpiry ? String(asset.registrationExpiry).split('T')[0] : '');
        setFitnessExpiry(asset.fitnessExpiry ? String(asset.fitnessExpiry).split('T')[0] : '');
        setPurchaseCost(asset.purchaseCost != null ? String(Number(asset.purchaseCost)) : '');
        setCurrentBookValue(asset.currentBookValue != null ? String(Number(asset.currentBookValue)) : '');
        setReplacementValue(asset.replacementValue != null ? String(Number(asset.replacementValue)) : '');
        setDescription(asset.description ?? '');
      } else {
        setName('');
        setAssetClass('MACHINE');
        setSerialNumber('');
        setCategoryId('');
        setSubCategoryId('');
        setTypeId('');
        setOwnership('OWNED');
        setCriticality('MEDIUM');
        setIsBottleneck(false);
        setLocationId('');
        setFloorZone('');
        setManufacturer('');
        setBrand('');
        setModelNumber('');
        setCommissioningDate('');
        setCondition('');
        setRatedCapacity('');
        setDesignLifeYears('');
        setPermitRequired(false);
        setPtwClass('');
        setWarrantyExpiry('');
        setInsuranceExpiry('');
        setRegistrationExpiry('');
        setFitnessExpiry('');
        setPurchaseCost('');
        setCurrentBookValue('');
        setReplacementValue('');
        setDescription('');
      }
      setErrors({});
      setOpenDropdown(null);
    }
  }, [visible, asset]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSubCategory = subCategories.find((c) => c.id === subCategoryId);
  const selectedType = types.find((t) => t.id === typeId);
  const selectedLocation = locations.find((l) => l.id === locationId);

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
    if (!name.trim()) newErrors.name = 'Asset name is required';
    if (!assetClass) newErrors.assetClass = 'Asset class is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      assetClass,
      criticality,
      ownership,
      isBottleneck,
      permitRequired,
    };
    if (categoryId) data.categoryId = categoryId;
    if (subCategoryId) data.subCategoryId = subCategoryId;
    if (typeId) data.typeId = typeId;
    if (locationId) data.locationId = locationId;
    if (floorZone.trim()) data.floorZone = floorZone.trim();
    if (manufacturer.trim()) data.manufacturer = manufacturer.trim();
    if (brand.trim()) data.brand = brand.trim();
    if (modelNumber.trim()) data.modelNumber = modelNumber.trim();
    if (serialNumber.trim()) data.serialNumber = serialNumber.trim();
    if (commissioningDate.trim()) data.commissioningDate = commissioningDate.trim();
    if (condition.trim()) data.condition = condition.trim();
    if (ratedCapacity.trim()) data.ratedCapacity = ratedCapacity.trim();
    if (designLifeYears.trim()) data.designLifeYears = Number(designLifeYears);
    if (ptwClass) data.ptwClass = ptwClass;
    if (warrantyExpiry.trim()) data.warrantyExpiry = warrantyExpiry.trim();
    if (insuranceExpiry.trim()) data.insuranceExpiry = insuranceExpiry.trim();
    if (registrationExpiry.trim()) data.registrationExpiry = registrationExpiry.trim();
    if (fitnessExpiry.trim()) data.fitnessExpiry = fitnessExpiry.trim();
    if (purchaseCost.trim()) data.purchaseCost = Number(purchaseCost);
    if (currentBookValue.trim()) data.currentBookValue = Number(currentBookValue);
    if (replacementValue.trim()) data.replacementValue = Number(replacementValue);
    if (description.trim()) data.description = description.trim();
    onSubmit(data);
  };

  const toggleDropdown = (dd: string) => {
    setOpenDropdown((prev) => (prev === dd ? null : dd));
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
    required?: boolean,
    error?: string,
  ) => {
    const isOpen = openDropdown === dropdownName;
    return (
      <View style={sheetStyles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
            {label}
            {required && <Text className="text-danger-500"> *</Text>}
          </Text>
          {onAddNew ? (
            <TouchableOpacity onPress={onAddNew} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.6}>
              <Text className="font-inter text-xs font-bold text-primary-600">+ New</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Pressable
          onPress={() => toggleDropdown(dropdownName)}
          style={[
            sheetStyles.input,
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
            error ? sheetStyles.inputError : undefined,
            isOpen && { borderColor: colors.primary[400] },
          ]}
        >
          <Text className={`font-inter text-sm ${value ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}>
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
        {error ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{error}</Text> : null}
        {isOpen && (
          <View style={sheetStyles.dropdown}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {(options as any[]).map((opt, idx) => {
                const optId = typeof opt === 'string' ? opt : opt.id;
                const optLabel = typeof opt === 'string' ? opt.replace(/_/g, ' ') : opt.name;
                const isSelected = optId === selectedId;
                return (
                  <Pressable
                    key={optId}
                    onPress={() => { onSelect(optId); setOpenDropdown(null); }}
                    style={[
                      sheetStyles.dropdownItem,
                      isSelected && { backgroundColor: colors.primary[50] },
                      idx > 0 && { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
                    ]}
                  >
                    <Text className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}>
                      {optLabel}
                    </Text>
                    {isSelected && (
                      <Svg width={15} height={15} viewBox="0 0 24 24">
                        <Path d="M5 12l5 5L20 7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
    <RNModal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={[sheetStyles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 24) }]}>
          {/* Header */}
          <View style={sheetStyles.header}>
            <Pressable onPress={onClose}>
              <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">Cancel</Text>
            </Pressable>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
              {isEdit ? 'Edit Asset' : 'Add Asset'}
            </Text>
            <View style={{ width: 52 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[sheetStyles.formContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {/* ── IDENTITY ── */}
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Identity
            </Text>

            {/* Name */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Asset Name <Text className="text-danger-500">*</Text>
              </Text>
              <TextInput
                style={[sheetStyles.input, errors.name ? sheetStyles.inputError : undefined]}
                placeholder="Enter asset name"
                placeholderTextColor={colors.neutral[400]}
                value={name}
                onChangeText={(v) => { setName(v); clearError('name'); }}
                autoCapitalize="words"
              />
              {errors.name ? <Text className="mt-1 font-inter text-[10px] text-danger-600">{errors.name}</Text> : null}
            </View>

            {/* Asset Class */}
            {renderDropdownField('Asset Class', 'assetClass', assetClass.replace(/_/g, ' '), 'Select class', assetClassOptions && assetClassOptions.length > 0 ? assetClassOptions : ASSET_CLASS_OPTIONS, assetClass, (val) => {
              setAssetClass(val);
              clearError('assetClass');
            }, onManageAssetClass, true, errors.assetClass)}

            {/* Serial Number */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Serial Number</Text>
              <TextInput style={sheetStyles.input} placeholder="Serial number" placeholderTextColor={colors.neutral[400]} value={serialNumber} onChangeText={setSerialNumber} />
            </View>

            {/* ── CLASSIFICATION ── */}
            <View style={sheetStyles.sectionDivider} />
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Classification
            </Text>

            {/* Category */}
            {renderDropdownField('Category', 'category', selectedCategory?.name, 'Select category', categories, categoryId, (val) => {
              setCategoryId(val);
              setSubCategoryId('');
            }, onManageCategory)}

            {/* Sub-Category */}
            {renderDropdownField('Sub-Category', 'subCategory', selectedSubCategory?.name, 'Select sub-category', subCategories, subCategoryId, setSubCategoryId, onManageSubCategory)}

            {/* Type */}
            {renderDropdownField('Type', 'type', selectedType?.name, 'Select type', types, typeId, setTypeId, onManageType)}

            {/* Ownership */}
            {renderDropdownField('Ownership', 'ownership', ownership.replace(/_/g, ' '), 'Select ownership', ownershipOptions && ownershipOptions.length > 0 ? ownershipOptions : OWNERSHIP_OPTIONS, ownership, setOwnership, onManageOwnership)}

            {/* Criticality */}
            {renderDropdownField('Criticality', 'criticality', criticality, 'Select criticality', CRITICALITY_OPTIONS, criticality, setCriticality)}

            {/* Is Bottleneck */}
            <View style={[sheetStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Is Bottleneck</Text>
                <InfoTooltip content={assetRegisterHelp.fields!.isBottleneck} />
              </View>
              <Switch
                value={isBottleneck}
                onValueChange={setIsBottleneck}
                trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                thumbColor={isBottleneck ? colors.primary[600] : colors.neutral[100]}
              />
            </View>

            {/* ── LOCATION ── */}
            <View style={sheetStyles.sectionDivider} />
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Location
            </Text>

            {/* Location */}
            {renderDropdownField('Location', 'location', selectedLocation?.name, 'Select location', locations, locationId, setLocationId)}

            {/* Floor / Zone */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Floor / Zone</Text>
              <TextInput style={sheetStyles.input} placeholder="e.g. Floor 2, Zone A" placeholderTextColor={colors.neutral[400]} value={floorZone} onChangeText={setFloorZone} />
            </View>

            {/* ── TECHNICAL ── */}
            <View style={sheetStyles.sectionDivider} />
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Technical
            </Text>

            {/* Manufacturer */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Manufacturer</Text>
              <TextInput style={sheetStyles.input} placeholder="Manufacturer" placeholderTextColor={colors.neutral[400]} value={manufacturer} onChangeText={setManufacturer} />
            </View>

            {/* Brand */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Brand</Text>
              <TextInput style={sheetStyles.input} placeholder="Brand" placeholderTextColor={colors.neutral[400]} value={brand} onChangeText={setBrand} />
            </View>

            {/* Model Number */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Model Number</Text>
              <TextInput style={sheetStyles.input} placeholder="Model number" placeholderTextColor={colors.neutral[400]} value={modelNumber} onChangeText={setModelNumber} />
            </View>

            {/* Commissioning Date */}
            <DatePickerField
              label="Commissioning Date"
              value={commissioningDate}
              onChange={setCommissioningDate}
            />

            {/* Condition */}
            {renderDropdownField('Condition', 'condition', condition ? condition.replace(/_/g, ' ') : undefined, 'Select condition', CONDITION_OPTIONS, condition, setCondition)}

            {/* Rated Capacity */}
            <View style={sheetStyles.field}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Rated Capacity</Text>
                <InfoTooltip content={assetRegisterHelp.fields!.ratedCapacity} />
              </View>
              <TextInput style={sheetStyles.input} placeholder="e.g. 500 kg/hr" placeholderTextColor={colors.neutral[400]} value={ratedCapacity} onChangeText={setRatedCapacity} />
            </View>

            {/* Design Life (Years) */}
            <View style={sheetStyles.field}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Design Life (Years)</Text>
                <InfoTooltip content={assetRegisterHelp.fields!.designLifeYears} />
              </View>
              <TextInput style={sheetStyles.input} placeholder="e.g. 10" placeholderTextColor={colors.neutral[400]} value={designLifeYears} onChangeText={setDesignLifeYears} keyboardType="numeric" />
            </View>

            {/* ── COMPLIANCE ── */}
            <View style={sheetStyles.sectionDivider} />
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Compliance
            </Text>

            {/* Permit Required */}
            <View style={[sheetStyles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Permit Required</Text>
              <Switch
                value={permitRequired}
                onValueChange={setPermitRequired}
                trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                thumbColor={permitRequired ? colors.primary[600] : colors.neutral[100]}
              />
            </View>

            {/* PTW Class */}
            {renderDropdownField('PTW Class', 'ptwClass', ptwClass ? ptwClass.replace(/_/g, ' ') : undefined, 'Select PTW class', ptwClassOptions && ptwClassOptions.length > 0 ? ptwClassOptions : PTW_CLASS_OPTIONS, ptwClass, setPtwClass, onManagePTWClass)}

            {/* Warranty Expiry */}
            <DatePickerField
              label="Warranty Expiry"
              value={warrantyExpiry}
              onChange={setWarrantyExpiry}
            />

            {/* Insurance Expiry */}
            <DatePickerField
              label="Insurance Expiry"
              value={insuranceExpiry}
              onChange={setInsuranceExpiry}
            />

            {/* Registration Expiry */}
            <DatePickerField
              label="Registration Expiry"
              value={registrationExpiry}
              onChange={setRegistrationExpiry}
            />

            {/* Fitness Expiry */}
            <DatePickerField
              label="Fitness Expiry"
              value={fitnessExpiry}
              onChange={setFitnessExpiry}
            />

            {/* ── FINANCIAL ── */}
            <View style={sheetStyles.sectionDivider} />
            <Text className="mb-3 font-inter text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Financial
            </Text>

            {/* Purchase Cost */}
            <View style={sheetStyles.field}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Purchase Cost</Text>
                <InfoTooltip content={assetRegisterHelp.fields!.purchaseCost} />
              </View>
              <TextInput style={sheetStyles.input} placeholder="0.00" placeholderTextColor={colors.neutral[400]} value={purchaseCost} onChangeText={setPurchaseCost} keyboardType="numeric" />
            </View>

            {/* Current Book Value */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Current Book Value</Text>
              <TextInput style={sheetStyles.input} placeholder="0.00" placeholderTextColor={colors.neutral[400]} value={currentBookValue} onChangeText={setCurrentBookValue} keyboardType="numeric" />
            </View>

            {/* Replacement Value */}
            <View style={sheetStyles.field}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Replacement Value</Text>
                <InfoTooltip content={assetRegisterHelp.fields!.replacementValue} />
              </View>
              <TextInput style={sheetStyles.input} placeholder="0.00" placeholderTextColor={colors.neutral[400]} value={replacementValue} onChangeText={setReplacementValue} keyboardType="numeric" />
            </View>

            {/* ── DESCRIPTION ── */}
            <View style={sheetStyles.sectionDivider} />
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Description</Text>
              <TextInput
                style={[sheetStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Description"
                placeholderTextColor={colors.neutral[400]}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </ScrollView>

          {/* Submit */}
          <View style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={({ pressed }) => [
                sheetStyles.submitBtn,
                (isSubmitting || !name.trim()) && sheetStyles.submitBtnDisabled,
                pressed && !(isSubmitting || !name.trim()) && { opacity: 0.85 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{ color: (isSubmitting || !name.trim()) ? colors.neutral[400] : colors.white }}
                  className="font-inter text-base font-bold"
                >
                  {isEdit ? 'Update Asset' : 'Create Asset'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {children}
    </RNModal>
  );
}

// ============ MAIN COMPONENT ============

export function AssetRegisterScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<AssetData | null>(null);
  const confirmModal = useConfirmModal();

  // Lifted category state to filter sub-categories and manage sub-category creation
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = React.useState<string>('');

  // Fetch locations
  const { data: locationsRaw } = useCompanyLocations();
  const locations: DropdownOption[] = React.useMemo(() => {
    const data = (locationsRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((l: any) => ({ id: l.id ?? '', name: l.name ?? '' })) : [];
  }, [locationsRaw]);

  // Fetch dropdowns
  const { data: categoriesRaw } = useAssetCategories();
  const categories: DropdownOption[] = React.useMemo(() => {
    const data = (categoriesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' })) : [];
  }, [categoriesRaw]);

  const { data: subCategoriesRaw } = useAssetSubCategories(selectedCategoryId ? { categoryId: selectedCategoryId } : undefined);
  const subCategories: DropdownOption[] = React.useMemo(() => {
    const data = (subCategoriesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' })) : [];
  }, [subCategoriesRaw]);

  const { data: typesRaw } = useAssetTypes();
  const types: DropdownOption[] = React.useMemo(() => {
    const data = (typesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' })) : [];
  }, [typesRaw]);

  // DB-driven option lists
  const { data: assetClassRaw } = useAssetClassOptions();
  const assetClassOptions: DropdownOption[] = React.useMemo(() => {
    const data = (assetClassRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((o: any) => ({ id: o.name ?? '', name: o.name ?? '' })) : [];
  }, [assetClassRaw]);

  const { data: ownershipRaw } = useOwnershipOptions();
  const ownershipOptions: DropdownOption[] = React.useMemo(() => {
    const data = (ownershipRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((o: any) => ({ id: o.name ?? '', name: o.name ?? '' })) : [];
  }, [ownershipRaw]);

  const { data: ptwClassRaw } = usePTWClassOptions();
  const ptwClassOptions: DropdownOption[] = React.useMemo(() => {
    const data = (ptwClassRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((o: any) => ({ id: o.name ?? '', name: o.name ?? '' })) : [];
  }, [ptwClassRaw]);

  // Fetch assets
  const classFilter = activeFilter === 'all' ? undefined : activeFilter;
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAssets({
    search: search.trim() || undefined,
    assetClass: classFilter,
  });

  const assets: AssetData[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapApiAsset);
  }, [response]);

  const totalCount = (response as any)?.meta?.total ?? assets.length;

  const filterChips = React.useMemo(() => {
    const list = [
      { key: 'all', label: 'All', count: activeFilter === 'all' ? totalCount : undefined }
    ];

    const classes = assetClassOptions.length > 0
      ? assetClassOptions.map(o => ({
          key: o.name,
          label: o.name.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
          count: activeFilter === o.name ? totalCount : undefined
        }))
      : [
          { key: 'MACHINE', label: 'Machine', count: activeFilter === 'MACHINE' ? totalCount : undefined },
          { key: 'VEHICLE', label: 'Vehicle', count: activeFilter === 'VEHICLE' ? totalCount : undefined },
          { key: 'BUILDING', label: 'Building', count: activeFilter === 'BUILDING' ? totalCount : undefined },
          { key: 'TOOL', label: 'Tool', count: activeFilter === 'TOOL' ? totalCount : undefined },
          { key: 'INSTRUMENT', label: 'Instrument', count: activeFilter === 'INSTRUMENT' ? totalCount : undefined },
          { key: 'UTILITY', label: 'Utility', count: activeFilter === 'UTILITY' ? totalCount : undefined },
          { key: 'IT_EQUIPMENT', label: 'IT', count: activeFilter === 'IT_EQUIPMENT' ? totalCount : undefined },
          { key: 'FURNITURE', label: 'Furniture', count: activeFilter === 'FURNITURE' ? totalCount : undefined },
          { key: 'OTHER', label: 'Other', count: activeFilter === 'OTHER' ? totalCount : undefined },
        ];

    return [...list, ...classes];
  }, [assetClassOptions, totalCount, activeFilter]);

  // Mutations
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const createCat = useCreateAssetCategory();
  const updateCat = useUpdateAssetCategory();
  const deleteCat = useDeleteAssetCategory();
  const createSubCat = useCreateAssetSubCategory();
  const updateSubCat = useUpdateAssetSubCategory();
  const deleteSubCat = useDeleteAssetSubCategory();
  const createType = useCreateAssetType();
  const updateType = useUpdateAssetType();
  const deleteType = useDeleteAssetType();

  // Asset Class Option mutations
  const createAssetClassOpt = useCreateAssetClassOption();
  const updateAssetClassOpt = useUpdateAssetClassOption();
  const deleteAssetClassOpt = useDeleteAssetClassOption();

  // Ownership Option mutations
  const createOwnershipOpt = useCreateOwnershipOption();
  const updateOwnershipOpt = useUpdateOwnershipOption();
  const deleteOwnershipOpt = useDeleteOwnershipOption();

  // PTW Class Option mutations
  const createPTWClassOpt = useCreatePTWClassOption();
  const updatePTWClassOpt = useUpdatePTWClassOption();
  const deletePTWClassOpt = useDeletePTWClassOption();

  const [manageModal, setManageModal] = React.useState<'category' | 'subCategory' | 'type' | 'assetClass' | 'ownership' | 'ptwClass' | null>(null);

  const handleAdd = () => { setSelectedCategoryId(''); setSelectedSubCategoryId(''); setEditingAsset(null); setSheetVisible(true); };
  const handleEdit = (a: AssetData) => { setSelectedCategoryId(a.categoryId ?? ''); setSelectedSubCategoryId(a.subCategoryId ?? ''); setEditingAsset(a); setSheetVisible(true); };
  const handleView = (a: AssetData) => { router.push(`/maintenance/asset-detail?id=${a.id}`); };

  const handleDelete = (a: AssetData) => {
    confirmModal.show({
      title: 'Delete Asset',
      message: `Are you sure you want to delete "${a.name}" (${a.assetNumber})? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => { deleteAsset.mutate(a.id, { onSuccess: () => refetch() }); },
    });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingAsset) {
      updateAsset.mutate(
        { id: editingAsset.id, data },
        { onSuccess: () => { setSheetVisible(false); refetch(); } },
      );
    } else {
      createAsset.mutate(data, {
        onSuccess: (res: any) => {
          const code = res?.data?.assetNumber ?? '';
          setSheetVisible(false);
          refetch();
          if (code) showSuccess('Asset Created', `Asset ${code} created successfully`);
        },
      });
    }
  };

  const renderAsset = ({ item, index }: { item: AssetData; index: number }) => (
    <AssetCard asset={item} index={index} isDark={isDark} onPress={handleView} onEdit={handleEdit} onDelete={handleDelete} />
  );

  const renderHeader = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <AppTopHeader title="Asset Register" subtitle={`${totalCount} asset${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} rightSlot={<HelpDrawer help={assetRegisterHelp} />} />
      </Animated.View>
      <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search assets..."
          filters={filterChips}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </Animated.View>
    </>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40 }}><EmptyState icon="error" title="Failed to load assets" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    return <EmptyState icon="search" title="No assets found" message="Try adjusting your search or filters, or add a new asset." />;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <FlashList
        data={assets}
        renderItem={renderAsset}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />

      <FAB onPress={handleAdd} />

      <AssetFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        asset={editingAsset}
        categories={categories}
        subCategories={subCategories}
        types={types}
        locations={locations}
        onSubmit={handleSubmit}
        isSubmitting={createAsset.isPending || updateAsset.isPending}
        onManageCategory={() => setManageModal('category')}
        onManageSubCategory={() => {
          if (!selectedCategoryId) {
            showWarning('Select Category', 'Please select a Category first to manage sub-categories.');
          } else {
            setManageModal('subCategory');
          }
        }}
        onManageType={() => setManageModal('type')}
        categoryId={selectedCategoryId}
        setCategoryId={setSelectedCategoryId}
        subCategoryId={selectedSubCategoryId}
        setSubCategoryId={setSelectedSubCategoryId}
        assetClassOptions={assetClassOptions}
        ownershipOptions={ownershipOptions}
        ptwClassOptions={ptwClassOptions}
        onManageAssetClass={() => setManageModal('assetClass')}
        onManageOwnership={() => setManageModal('ownership')}
        onManagePTWClass={() => setManageModal('ptwClass')}
      >
        {/* Manage Category */}
        <ManageModal
          visible={manageModal === 'category'}
          onClose={() => setManageModal(null)}
          title="Manage Asset Categories"
          items={categories}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Production Equipment', required: true }]}
          onCreate={async (values) => { await createCat.mutateAsync(values); }}
          onUpdate={async (id, values) => { await updateCat.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deleteCat.mutateAsync(id); }}
          isCreating={createCat.isPending}
          isUpdating={updateCat.isPending}
          isDeleting={deleteCat.isPending}
        />

        {/* Manage SubCategory */}
        <ManageModal
          visible={manageModal === 'subCategory'}
          onClose={() => setManageModal(null)}
          title="Manage Asset Sub-Categories"
          items={subCategories}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. CNC Machines', required: true }]}
          onCreate={async (values) => {
            const result = await createSubCat.mutateAsync({
              ...values,
              categoryId: selectedCategoryId,
            });
            if (result?.data?.id) {
              setSelectedSubCategoryId(result.data.id);
            }
          }}
          onUpdate={async (id, values) => { await updateSubCat.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deleteSubCat.mutateAsync(id); }}
          isCreating={createSubCat.isPending}
          isUpdating={updateSubCat.isPending}
          isDeleting={deleteSubCat.isPending}
        />

        {/* Manage Type */}
        <ManageModal
          visible={manageModal === 'type'}
          onClose={() => setManageModal(null)}
          title="Manage Asset Types"
          items={types}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Rotary', required: true }]}
          onCreate={async (values) => { await createType.mutateAsync(values); }}
          onUpdate={async (id, values) => { await updateType.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deleteType.mutateAsync(id); }}
          isCreating={createType.isPending}
          isUpdating={updateType.isPending}
          isDeleting={deleteType.isPending}
        />

        {/* Manage Asset Classes */}
        <ManageModal
          visible={manageModal === 'assetClass'}
          onClose={() => setManageModal(null)}
          title="Manage Asset Classes"
          items={(assetClassRaw as any)?.data?.map((o: any) => ({ id: o.id, name: o.name })) ?? []}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Machine', required: true }]}
          onCreate={async (values) => { await createAssetClassOpt.mutateAsync(values); }}
          onUpdate={async (id, values) => { await updateAssetClassOpt.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deleteAssetClassOpt.mutateAsync(id); }}
          isCreating={createAssetClassOpt.isPending}
          isUpdating={updateAssetClassOpt.isPending}
          isDeleting={deleteAssetClassOpt.isPending}
        />

        {/* Manage Ownership Types */}
        <ManageModal
          visible={manageModal === 'ownership'}
          onClose={() => setManageModal(null)}
          title="Manage Ownership Types"
          items={(ownershipRaw as any)?.data?.map((o: any) => ({ id: o.id, name: o.name })) ?? []}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Owned', required: true }]}
          onCreate={async (values) => { await createOwnershipOpt.mutateAsync(values); }}
          onUpdate={async (id, values) => { await updateOwnershipOpt.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deleteOwnershipOpt.mutateAsync(id); }}
          isCreating={createOwnershipOpt.isPending}
          isUpdating={updateOwnershipOpt.isPending}
          isDeleting={deleteOwnershipOpt.isPending}
        />

        {/* Manage PTW Classes */}
        <ManageModal
          visible={manageModal === 'ptwClass'}
          onClose={() => setManageModal(null)}
          title="Manage PTW Classes"
          items={(ptwClassRaw as any)?.data?.map((o: any) => ({ id: o.id, name: o.name })) ?? []}
          isLoading={false}
          createFields={[{ key: 'name', label: 'Name', placeholder: 'e.g. Hot Work', required: true }]}
          onCreate={async (values) => { await createPTWClassOpt.mutateAsync(values); }}
          onUpdate={async (id, values) => { await updatePTWClassOpt.mutateAsync({ id, data: values }); }}
          onDelete={async (id) => { await deletePTWClassOpt.mutateAsync(id); }}
          isCreating={createPTWClassOpt.isPending}
          isUpdating={updatePTWClassOpt.isPending}
          isDeleting={deletePTWClassOpt.isPending}
        />
      </AssetFormSheet>

      <ConfirmModal {...confirmModal.modalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    searchSection: { paddingHorizontal: 24, paddingVertical: 16 },
    listContent: { paddingHorizontal: 24 },
  });

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetInfo: { flex: 1, marginRight: 8 },
  codeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  nameContainer: { flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  detailsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.neutral[100], gap: 8, flexWrap: 'wrap',
  },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});

const createSheetStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#1A1730' : colors.white },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: isDark ? colors.neutral[700] : colors.neutral[100],
    },
    formContent: { paddingHorizontal: 20, paddingTop: 20 },
    field: { marginBottom: 20 },
    input: {
      backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1,
      borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, color: isDark ? colors.white : colors.primary[950],
    },
    inputError: { borderColor: colors.danger[400], borderWidth: 1.5 },
    dropdown: {
      backgroundColor: isDark ? '#1A1730' : '#fff', borderRadius: 10, borderWidth: 1,
      borderColor: isDark ? colors.primary[800] : colors.primary[200], marginTop: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 4, overflow: 'hidden',
    },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    sectionDivider: { height: 1, backgroundColor: isDark ? colors.neutral[700] : colors.neutral[200], marginVertical: 8 },
    submitContainer: {
      paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1,
      borderTopColor: isDark ? colors.neutral[700] : colors.neutral[100],
      backgroundColor: isDark ? '#1A1730' : colors.white,
    },
    submitBtn: {
      backgroundColor: colors.primary[600], borderRadius: 14, height: 52,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    submitBtnDisabled: {
      backgroundColor: isDark ? colors.neutral[800] : colors.neutral[200],
      shadowOpacity: 0,
      elevation: 0,
    },
  });
