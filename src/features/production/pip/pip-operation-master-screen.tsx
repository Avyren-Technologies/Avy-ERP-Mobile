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
import type { ManageModalItem } from '@/components/ui/manage-modal';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import { useOperations, useProcessCategories } from '@/features/production/pip/api/use-pip-queries';
import {
  useCreateOperation,
  useUpdateOperation,
  useDeleteOperation,
  useCreateProcessCategory,
  useUpdateProcessCategory,
  useDeleteProcessCategory,
} from '@/features/production/pip/api/use-pip-mutations';
import type { Operation, ProcessCategory } from '@/lib/api/pip';

// ============ TYPES ============

interface OperationData {
  id: string;
  code: string;
  name: string;
  processType?: string;
  processCategoryId?: string;
  processCategoryName?: string;
  status: string;
  isActive: boolean;
}

const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

// ============ HELPERS ============

function mapOperation(item: any): OperationData {
  return {
    id: item.id ?? '',
    code: item.code ?? '',
    name: item.name ?? '',
    processType: item.processType,
    processCategoryId: item.processCategoryId ?? item.processCategory?.id,
    processCategoryName: item.processCategory?.name ?? item.processType ?? '',
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

function getProcessTypeColor(type: string): { bg: string; text: string } {
  switch (type?.toUpperCase()) {
    case 'MACHINING':
      return { bg: colors.info[50], text: colors.info[700] };
    case 'MOULDING':
      return { bg: colors.accent[50], text: colors.accent[700] };
    case 'ASSEMBLY':
      return { bg: colors.primary[50], text: colors.primary[700] };
    case 'INSPECTION':
      return { bg: colors.warning[50], text: colors.warning[700] };
    case 'FINISHING':
      return { bg: colors.success[50], text: colors.success[700] };
    case 'PACKAGING':
      return { bg: colors.neutral[100], text: colors.neutral[700] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[600] };
  }
}

// ============ OPERATION CARD ============

function OperationCard({
  item,
  index,
  isDark,
  onEdit,
  onDelete,
}: {
  item: OperationData;
  index: number;
  isDark: boolean;
  onEdit: (item: OperationData) => void;
  onDelete: (item: OperationData) => void;
}) {
  const statusColor = getStatusColor(item.status);
  const displayProcessType = item.processCategoryName || item.processType || '';
  const processColor = getProcessTypeColor(displayProcessType);

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
              <Text
                className="font-inter text-[10px] font-bold text-info-700"
                style={{ fontFamily: 'monospace' }}
              >
                {item.code}
              </Text>
            </View>
            <Text
              className="mt-1 font-inter text-sm font-bold text-primary-950 dark:text-white"
              numberOfLines={1}
            >
              {item.name}
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

        {/* Process Type + Status Row */}
        <View style={cardStyles.footerRow}>
          <View style={[cardStyles.badge, { backgroundColor: isDark ? colors.accent[900] : processColor.bg }]}>
            <Text
              style={{ color: processColor.text }}
              className="font-inter text-[10px] font-bold"
            >
              {displayProcessType}
            </Text>
          </View>

          <View style={[cardStyles.statusBadge, { backgroundColor: isDark ? (item.status === 'ACTIVE' ? colors.success[900] : colors.neutral[800]) : statusColor.bg }]}>
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

// ============ CHIP SELECTOR ============

function ChipSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  isDark,
  required,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (val: T) => void;
  isDark: boolean;
  required?: boolean;
}) {
  return (
    <View style={formStyles.field}>
      <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
        {label} {required && <Text className="font-inter text-danger-500">*</Text>}
      </Text>
      <View style={formStyles.chipRow}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                formStyles.chip,
                {
                  backgroundColor: selected
                    ? isDark ? colors.primary[800] : colors.primary[50]
                    : isDark ? '#1A1730' : colors.neutral[50],
                  borderColor: selected
                    ? colors.primary[400]
                    : isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
            >
              <Text
                className={`font-inter text-xs font-semibold ${
                  selected
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============ FORM SHEET ============

interface ProcessCategoryOption {
  id: string;
  name: string;
  code: string;
}

function OperationFormSheet({
  visible,
  onClose,
  editItem,
  onSubmit,
  isSubmitting,
  processCategories,
  onManageCategories,
}: {
  visible: boolean;
  onClose: () => void;
  editItem?: OperationData | null;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  processCategories: ProcessCategoryOption[];
  onManageCategories: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const isEdit = !!editItem;

  const [name, setName] = React.useState('');
  const [processCategoryId, setProcessCategoryId] = React.useState('');
  const [status, setStatus] = React.useState<typeof STATUSES[number]>('ACTIVE');

  React.useEffect(() => {
    if (visible) {
      if (editItem) {
        setName(editItem.name);
        setProcessCategoryId(editItem.processCategoryId ?? '');
        setStatus((editItem.status as typeof STATUSES[number]) || 'ACTIVE');
      } else {
        setName('');
        setProcessCategoryId('');
        setStatus('ACTIVE');
      }
    }
  }, [visible, editItem]);

  const handleSubmit = () => {
    const data: Record<string, unknown> = {
      name,
      processCategoryId: processCategoryId || undefined,
    };
    if (isEdit) {
      data.status = status;
    }
    onSubmit(data);
  };

  const canSubmit = !!name.trim() && !!processCategoryId;

  return (
    <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[formStyles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#0F0D1A' : colors.white }]}>
        {/* Header */}
        <View style={[formStyles.header, { borderBottomColor: isDark ? colors.neutral[800] : colors.neutral[100] }]}>
          <Pressable onPress={onClose}>
            <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              Cancel
            </Text>
          </Pressable>
          <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
            {isEdit ? 'Edit Operation' : 'New Operation'}
          </Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[formStyles.formContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Code (auto-generated) */}
          <View style={formStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Code
            </Text>
            <TextInput
              style={[
                formStyles.input,
                {
                  backgroundColor: isDark ? '#141225' : colors.neutral[100],
                  color: isDark ? colors.neutral[400] : colors.neutral[500],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
              placeholder={isEdit ? editItem?.code : 'Auto Generated'}
              placeholderTextColor={colors.neutral[400]}
              value={isEdit ? editItem?.code ?? '' : ''}
              editable={false}
            />
          </View>

          {/* Operation Name */}
          <View style={formStyles.field}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Operation Name <Text className="font-inter text-danger-500">*</Text>
            </Text>
            <TextInput
              style={[
                formStyles.input,
                {
                  backgroundColor: isDark ? '#1A1730' : colors.neutral[50],
                  color: isDark ? colors.white : colors.primary[950],
                  borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
                },
              ]}
              placeholder="e.g. CNC Turning"
              placeholderTextColor={colors.neutral[400]}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Process Category */}
          <View style={formStyles.field}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text className="font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Process Category <Text className="font-inter text-danger-500">*</Text>
              </Text>
              <Pressable onPress={onManageCategories} hitSlop={8}>
                <Text className="font-inter text-xs font-semibold text-primary-600">
                  Manage
                </Text>
              </Pressable>
            </View>
            <View style={formStyles.chipRow}>
              {processCategories.map((cat) => {
                const selected = processCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setProcessCategoryId(cat.id)}
                    style={[
                      formStyles.chip,
                      {
                        backgroundColor: selected
                          ? isDark ? colors.primary[800] : colors.primary[50]
                          : isDark ? '#1A1730' : colors.neutral[50],
                        borderColor: selected
                          ? colors.primary[400]
                          : isDark ? colors.neutral[700] : colors.neutral[200],
                      },
                    ]}
                  >
                    <Text
                      className={`font-inter text-xs font-semibold ${
                        selected
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
              {processCategories.length === 0 && (
                <Text className="font-inter text-xs text-neutral-400">
                  No process categories. Tap Manage to add one.
                </Text>
              )}
            </View>
          </View>

          {/* Status (edit only) */}
          {isEdit && (
            <ChipSelector
              label="Status"
              options={STATUSES}
              value={status}
              onChange={setStatus}
              isDark={isDark}
            />
          )}
        </ScrollView>

        {/* Bottom Submit */}
        <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              formStyles.submitBtn,
              pressed && { opacity: 0.85 },
              (!canSubmit || isSubmitting) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="font-inter text-base font-bold text-white">
                {isEdit ? 'Update' : 'Create'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </RNModal>
  );
}

// ============ MAIN COMPONENT ============

export function PipOperationMasterScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const [search, setSearch] = React.useState('');
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<OperationData | null>(null);
  const [manageCategoriesVisible, setManageCategoriesVisible] = React.useState(false);

  const confirmModal = useConfirmModal();

  const { data: response, isLoading, error, refetch, isFetching } = useOperations(
    search.trim() ? { search: search.trim() } : undefined,
  );

  const operations: OperationData[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapOperation);
  }, [response]);

  // Process categories
  const { data: catResponse, isLoading: catLoading } = useProcessCategories();
  const processCategoryList: ProcessCategoryOption[] = React.useMemo(() => {
    const raw = (catResponse as any)?.data ?? catResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any) => ({ id: c.id ?? '', name: c.name ?? '', code: c.code ?? '' }));
  }, [catResponse]);

  const manageCategoryItems: ManageModalItem[] = React.useMemo(
    () => processCategoryList.map((c) => ({ id: c.id, name: c.name, code: c.code })),
    [processCategoryList],
  );

  // Mutations
  const createOp = useCreateOperation();
  const updateOp = useUpdateOperation();
  const deleteOp = useDeleteOperation();
  const createCat = useCreateProcessCategory();
  const updateCat = useUpdateProcessCategory();
  const deleteCat = useDeleteProcessCategory();

  const handleAdd = () => {
    setEditingItem(null);
    setSheetVisible(true);
  };

  const handleEdit = (item: OperationData) => {
    setEditingItem(item);
    setSheetVisible(true);
  };

  const handleDelete = (item: OperationData) => {
    confirmModal.show({
      title: 'Delete Operation',
      message: `Delete operation "${item.name}" (${item.code})? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteOp.mutate(item.id);
      },
    });
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingItem) {
      updateOp.mutate(
        { id: editingItem.id, data },
        { onSuccess: () => setSheetVisible(false) },
      );
    } else {
      createOp.mutate(data, {
        onSuccess: () => setSheetVisible(false),
      });
    }
  };

  const renderItem = ({ item, index }: { item: OperationData; index: number }) => (
    <OperationCard
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
          title="Operations"
          subtitle={`${operations.length} operation${operations.length !== 1 ? 's' : ''}`}
          onMenuPress={toggle}
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
            Define manufacturing operations (e.g. CNC Turning, Assembly). Operations can be linked to slab configs and daily entries for tracking.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or code..."
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
            title="Failed to load operations"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No operations found"
        message="Add an operation to define manufacturing processes."
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
        data={operations}
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

      <OperationFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        editItem={editingItem}
        onSubmit={handleSubmit}
        isSubmitting={createOp.isPending || updateOp.isPending}
        processCategories={processCategoryList}
        onManageCategories={() => setManageCategoriesVisible(true)}
      />

      <ManageModal
        visible={manageCategoriesVisible}
        onClose={() => setManageCategoriesVisible(false)}
        title="Process Categories"
        items={manageCategoryItems}
        isLoading={catLoading}
        createFields={[
          { key: 'name', label: 'Name', placeholder: 'e.g. Machining', required: true },
        ]}
        onCreate={async (values) => {
          await createCat.mutateAsync({ name: values.name });
        }}
        onUpdate={async (id, values) => {
          await updateCat.mutateAsync({ id, data: { name: values.name } });
        }}
        onDelete={async (id) => {
          await deleteCat.mutateAsync(id);
        }}
        isCreating={createCat.isPending}
        isUpdating={updateCat.isPending}
        isDeleting={deleteCat.isPending}
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
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

const formStyles = StyleSheet.create({
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
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
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
