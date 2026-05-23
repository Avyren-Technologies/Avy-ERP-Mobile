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
} from '@/features/maintenance/api/use-maintenance-mutations';
import {
  useAssets,
  useAssetCategories,
  useAssetSubCategories,
  useAssetTypes,
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
}

interface DropdownOption {
  id: string;
  name: string;
}

// ============ HELPERS ============

const ASSET_CLASS_OPTIONS = ['MACHINE', 'VEHICLE', 'BUILDING', 'TOOL', 'INSTRUMENT', 'UTILITY', 'IT_EQUIPMENT', 'FURNITURE', 'OTHER'];
const CRITICALITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const OP_STATUS_OPTIONS = ['RUNNING', 'IDLE', 'BREAKDOWN', 'SHUTDOWN', 'INACTIVE', 'RETIRED'];

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
    make: item.make ?? undefined,
    model: item.model ?? undefined,
    serialNumber: item.serialNumber ?? undefined,
    description: item.description ?? undefined,
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

          {/* Actions */}
          <View style={cardStyles.cardActions}>
            <Pressable
              onPress={() => onEdit(asset)}
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
              onPress={() => onDelete(asset)}
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
  onSubmit,
  isSubmitting,
  onManageCategory,
  onManageSubCategory,
  onManageType,
}: {
  visible: boolean;
  onClose: () => void;
  asset?: AssetData | null;
  categories: DropdownOption[];
  subCategories: DropdownOption[];
  types: DropdownOption[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onManageCategory: () => void;
  onManageSubCategory: () => void;
  onManageType: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const sheetStyles = createSheetStyles(isDark);
  const isEdit = !!asset;

  const [name, setName] = React.useState('');
  const [assetClass, setAssetClass] = React.useState('MACHINE');
  const [criticality, setCriticality] = React.useState('MEDIUM');
  const [operationalStatus, setOperationalStatus] = React.useState('IDLE');
  const [categoryId, setCategoryId] = React.useState('');
  const [subCategoryId, setSubCategoryId] = React.useState('');
  const [typeId, setTypeId] = React.useState('');
  const [make, setMake] = React.useState('');
  const [modelVal, setModelVal] = React.useState('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      if (asset) {
        setName(asset.name ?? '');
        setAssetClass(asset.assetClass ?? 'MACHINE');
        setCriticality(asset.criticality ?? 'MEDIUM');
        setOperationalStatus(asset.operationalStatus ?? 'IDLE');
        setCategoryId(asset.categoryId ?? '');
        setSubCategoryId(asset.subCategoryId ?? '');
        setTypeId(asset.typeId ?? '');
        setMake(asset.make ?? '');
        setModelVal(asset.model ?? '');
        setSerialNumber(asset.serialNumber ?? '');
        setDescription(asset.description ?? '');
      } else {
        setName('');
        setAssetClass('MACHINE');
        setCriticality('MEDIUM');
        setOperationalStatus('IDLE');
        setCategoryId('');
        setSubCategoryId('');
        setTypeId('');
        setMake('');
        setModelVal('');
        setSerialNumber('');
        setDescription('');
      }
      setErrors({});
      setOpenDropdown(null);
    }
  }, [visible, asset]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSubCategory = subCategories.find((c) => c.id === subCategoryId);
  const selectedType = types.find((t) => t.id === typeId);

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: Record<string, unknown> = {
      name: name.trim(),
      assetClass,
      criticality,
      operationalStatus,
    };
    if (categoryId) data.categoryId = categoryId;
    if (subCategoryId) data.subCategoryId = subCategoryId;
    if (typeId) data.typeId = typeId;
    if (make.trim()) data.make = make.trim();
    if (modelVal.trim()) data.model = modelVal.trim();
    if (serialNumber.trim()) data.serialNumber = serialNumber.trim();
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
  ) => {
    const isOpen = openDropdown === dropdownName;
    return (
      <View style={sheetStyles.field}>
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
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
            {renderDropdownField('Asset Class', 'assetClass', assetClass.replace(/_/g, ' '), 'Select class', ASSET_CLASS_OPTIONS, assetClass, setAssetClass)}

            {/* Criticality */}
            {renderDropdownField('Criticality', 'criticality', criticality, 'Select criticality', CRITICALITY_OPTIONS, criticality, setCriticality)}

            {/* Operational Status */}
            {renderDropdownField('Operational Status', 'operationalStatus', operationalStatus, 'Select status', OP_STATUS_OPTIONS, operationalStatus, setOperationalStatus)}

            {/* Category */}
            {renderDropdownField('Category', 'category', selectedCategory?.name, 'Select category', categories, categoryId, setCategoryId, onManageCategory)}

            {/* Sub-Category */}
            {renderDropdownField('Sub-Category', 'subCategory', selectedSubCategory?.name, 'Select sub-category', subCategories, subCategoryId, setSubCategoryId, onManageSubCategory)}

            {/* Type */}
            {renderDropdownField('Type', 'type', selectedType?.name, 'Select type', types, typeId, setTypeId, onManageType)}

            {/* Make */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Make</Text>
              <TextInput style={sheetStyles.input} placeholder="Manufacturer" placeholderTextColor={colors.neutral[400]} value={make} onChangeText={setMake} />
            </View>

            {/* Model */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Model</Text>
              <TextInput style={sheetStyles.input} placeholder="Model number" placeholderTextColor={colors.neutral[400]} value={modelVal} onChangeText={setModelVal} />
            </View>

            {/* Serial Number */}
            <View style={sheetStyles.field}>
              <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">Serial Number</Text>
              <TextInput style={sheetStyles.input} placeholder="Serial number" placeholderTextColor={colors.neutral[400]} value={serialNumber} onChangeText={setSerialNumber} />
            </View>

            {/* Description */}
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
              style={({ pressed }) => [sheetStyles.submitBtn, pressed && { opacity: 0.85 }, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-inter text-base font-bold text-white">
                  {isEdit ? 'Update Asset' : 'Create Asset'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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

  // Fetch dropdowns
  const { data: categoriesRaw } = useAssetCategories();
  const categories: DropdownOption[] = React.useMemo(() => {
    const data = (categoriesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' })) : [];
  }, [categoriesRaw]);

  const { data: subCategoriesRaw } = useAssetSubCategories();
  const subCategories: DropdownOption[] = React.useMemo(() => {
    const data = (subCategoriesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '' })) : [];
  }, [subCategoriesRaw]);

  const { data: typesRaw } = useAssetTypes();
  const types: DropdownOption[] = React.useMemo(() => {
    const data = (typesRaw as any)?.data ?? [];
    return Array.isArray(data) ? data.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' })) : [];
  }, [typesRaw]);

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

  const filterChips = React.useMemo(
    () => [
      { key: 'all', label: 'All', count: totalCount },
      { key: 'MACHINE', label: 'Machine' },
      { key: 'VEHICLE', label: 'Vehicle' },
      { key: 'BUILDING', label: 'Building' },
      { key: 'TOOL', label: 'Tool' },
      { key: 'IT_EQUIPMENT', label: 'IT' },
      { key: 'OTHER', label: 'Other' },
    ],
    [totalCount],
  );

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

  const [manageModal, setManageModal] = React.useState<'category' | 'subCategory' | 'type' | null>(null);

  const handleAdd = () => { setEditingAsset(null); setSheetVisible(true); };
  const handleEdit = (a: AssetData) => { setEditingAsset(a); setSheetVisible(true); };
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
        <AppTopHeader title="Asset Register" subtitle={`${totalCount} asset${totalCount !== 1 ? 's' : ''}`} onMenuPress={toggle} />
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
        onSubmit={handleSubmit}
        isSubmitting={createAsset.isPending || updateAsset.isPending}
        onManageCategory={() => setManageModal('category')}
        onManageSubCategory={() => setManageModal('subCategory')}
        onManageType={() => setManageModal('type')}
      />

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
        onCreate={async (values) => { await createSubCat.mutateAsync(values); }}
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
  });
