/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { DropdownField } from '@/components/ui/dropdown-field';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCreateMaterialPass, useMarkMaterialReturned } from '@/features/company-admin/api/use-visitor-mutations';
import { useGates, useMaterialPasses } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface MaterialPassItem {
  id: string;
  passNumber: string;
  type: string; // INWARD | OUTWARD | RETURNABLE
  description: string;
  quantityIssued: string;
  authorizedBy: string;
  returnStatus: string; // PENDING_RETURN | PARTIAL | FULLY_RETURNED | NOT_APPLICABLE
  createdAt: string;
  qrCode: string | null;
}

// ============ STATUS CONFIG ============

const PASS_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  INWARD: { label: 'Inward', bg: colors.info[50], text: colors.info[700] },
  OUTWARD: { label: 'Outward', bg: colors.warning[50], text: colors.warning[700] },
  RETURNABLE: { label: 'Returnable', bg: colors.accent[50], text: colors.accent[700] },
};

const RETURN_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING_RETURN: { label: 'Pending Return', bg: colors.warning[50], text: colors.warning[700] },
  PARTIAL: { label: 'Partial', bg: colors.info[50], text: colors.info[700] },
  FULLY_RETURNED: { label: 'Returned', bg: colors.success[50], text: colors.success[700] },
  NOT_APPLICABLE: { label: 'N/A', bg: colors.neutral[100], text: colors.neutral[500] },
};

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'INWARD', label: 'Inward' },
  { key: 'OUTWARD', label: 'Outward' },
  { key: 'RETURNABLE', label: 'Returnable' },
];

// ============ CREATE MODAL ============

function CreateMaterialModal({
  visible,
  onClose,
  onSave,
  isSaving,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [type, setType] = React.useState('INWARD');
  const [description, setDescription] = React.useState('');
  const [quantityIssued, setQuantityIssued] = React.useState('');
  const [authorizedBy, setAuthorizedBy] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [gateId, setGateId] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: employeesResponse } = useEmployees({ limit: 500 });
  const employeeOptions = React.useMemo(() => {
    const raw = (employeesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || e.id,
    }));
  }, [employeesResponse]);

  const { data: locationsResponse } = useCompanyLocations();
  const locationOptions = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({ id: l.id, name: l.name ?? l.code ?? l.id }));
  }, [locationsResponse]);

  const { data: gatesResponse } = useGates();
  const gateOptions = React.useMemo(() => {
    const raw = (gatesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({ id: g.id, name: `${g.name} (${g.code})` }));
  }, [gatesResponse]);

  React.useEffect(() => {
    if (visible) { setType('INWARD'); setDescription(''); setQuantityIssued(''); setAuthorizedBy(''); setPurpose(''); setGateId(''); setPlantId(''); setErrors({}); }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = 'Description is required';
    if (!authorizedBy) e.authorizedBy = 'Authorized by is required';
    if (!purpose.trim()) e.purpose = 'Purpose is required';
    if (!gateId) e.gateId = 'Gate is required';
    if (!plantId) e.plantId = 'Plant is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      type,
      description: description.trim(),
      quantityIssued: quantityIssued.trim() || undefined,
      authorizedBy,
      purpose: purpose.trim(),
      gateId,
      plantId,
    });
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.white }}>
        <LinearGradient colors={[colors.gradient.surface, colors.white]} style={StyleSheet.absoluteFill} />

        <View style={[formStyles.modalHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onClose} style={formStyles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke={colors.primary[600]} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">New Material Pass</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['INWARD', 'OUTWARD', 'RETURNABLE'].map(pt => {
                  const selected = pt === type;
                  return (
                    <Pressable key={pt} onPress={() => setType(pt)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{pt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Description <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, { height: 80 }, !!errors.description && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]} placeholder="Material description" placeholderTextColor={colors.neutral[400]} value={description} onChangeText={(v) => { setDescription(v); if (errors.description) setErrors(prev => ({ ...prev, description: '' })); }} multiline />
              </View>
              {!!errors.description && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.description}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Quantity Issued</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "5 boxes"' placeholderTextColor={colors.neutral[400]} value={quantityIssued} onChangeText={setQuantityIssued} />
              </View>
            </View>

            <DropdownField
              label="Authorized By"
              selected={authorizedBy}
              onSelect={(v) => { setAuthorizedBy(v); if (errors.authorizedBy) setErrors(prev => ({ ...prev, authorizedBy: '' })); }}
              options={employeeOptions}
              placeholder="Select authorized person..."
              required
              error={errors.authorizedBy}
            />

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Purpose <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.purpose && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Purpose" placeholderTextColor={colors.neutral[400]} value={purpose} onChangeText={(v) => { setPurpose(v); if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' })); }} />
              </View>
              {!!errors.purpose && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.purpose}</Text>}
            </View>

            <DropdownField
              label="Gate"
              selected={gateId}
              onSelect={(v) => { setGateId(v); if (errors.gateId) setErrors(prev => ({ ...prev, gateId: '' })); }}
              options={gateOptions}
              placeholder="Select gate..."
              required
              error={errors.gateId}
            />

            <DropdownField
              label="Location (Plant)"
              selected={plantId}
              onSelect={(v) => { setPlantId(v); if (errors.plantId) setErrors(prev => ({ ...prev, plantId: '' })); }}
              options={locationOptions}
              placeholder="Select location..."
              required
              error={errors.plantId}
            />

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Pressable onPress={onClose} style={formStyles.cancelBtn}>
                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={isSaving} style={[formStyles.saveBtn, isSaving && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Creating...' : 'CREATE'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============ MATERIAL CARD ============

function MaterialCard({
  item,
  index,
  onMarkReturned,
  onShowQr,
  fmt,
}: {
  readonly item: MaterialPassItem;
  readonly index: number;
  readonly onMarkReturned: () => void;
  readonly onShowQr: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  const typeCfg = PASS_TYPE_CONFIG[item.type] ?? { label: item.type, bg: colors.neutral[100], text: colors.neutral[500] };
  const returnCfg = RETURN_STATUS_CONFIG[item.returnStatus] ?? { label: item.returnStatus, bg: colors.neutral[100], text: colors.neutral[500] };

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.description}</Text>
              {item.passNumber ? (
                <View style={cardStyles.codeBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">{item.passNumber}</Text>
                </View>
              ) : null}
            </View>
            {item.quantityIssued ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Qty: {item.quantityIssued}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {item.qrCode ? (
              <Pressable onPress={onShowQr} hitSlop={8} style={cardStyles.qrBtn}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h3v3h-3zM14 17h3v3h-3zM17 20h3v3h-3z" stroke={colors.accent[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ) : null}
            <View style={[cardStyles.statusBadge, { backgroundColor: typeCfg.bg }]}>
              <Text className="font-inter text-[10px] font-bold" style={{ color: typeCfg.text }}>{typeCfg.label}</Text>
            </View>
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          {item.authorizedBy ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Auth: {item.authorizedBy}</Text>
            </View>
          ) : null}
          {item.returnStatus !== 'NOT_APPLICABLE' ? (
            <View style={[cardStyles.metaChip, { backgroundColor: returnCfg.bg }]}>
              <Text className="font-inter text-[10px] font-bold" style={{ color: returnCfg.text }}>{returnCfg.label}</Text>
            </View>
          ) : null}
          {item.createdAt ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{fmt.date(item.createdAt)}</Text>
            </View>
          ) : null}
        </View>

        {(item.returnStatus === 'PENDING_RETURN' || item.returnStatus === 'PARTIAL') ? (
          <View style={{ marginTop: 12 }}>
            <Pressable onPress={onMarkReturned} style={cardStyles.actionBtn}>
              <Text className="font-inter text-[11px] font-bold text-success-600">MARK RETURNED</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function MaterialPassesScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [qrModalItem, setQrModalItem] = React.useState<MaterialPassItem | null>(null);

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    if (typeFilter) p.type = typeFilter;
    return p;
  }, [search, typeFilter]);

  const { data: response, isLoading, error, refetch, isFetching } = useMaterialPasses(queryParams);
  const createMutation = useCreateMaterialPass();
  const returnMutation = useMarkMaterialReturned();

  const items: MaterialPassItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((m: any) => ({
      id: m.id ?? '',
      passNumber: m.passNumber ?? '',
      type: m.type ?? 'INWARD',
      description: m.description ?? '',
      quantityIssued: m.quantityIssued ?? '',
      authorizedBy: m.authorizedByName ?? m.authorizedBy ?? '',
      returnStatus: m.returnStatus ?? 'NOT_APPLICABLE',
      createdAt: m.createdAt ?? '',
      qrCode: m.qrCode ?? null,
    }));
  }, [response]);

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowCreateModal(false); showSuccess('Material pass created'); },
    });
  };

  const handleMarkReturned = (item: MaterialPassItem) => {
    showConfirm({
      title: 'Mark Returned',
      message: `Mark "${item.description}" as fully returned?`,
      confirmText: 'Confirm',
      variant: 'primary',
      onConfirm: () => returnMutation.mutate({ id: item.id, data: { quantityReturned: item.quantityIssued || '0', returnStatus: 'FULLY_RETURNED' } }, {
        onSuccess: () => showSuccess('Material marked as returned'),
      }),
    });
  };

  const renderItem = ({ item, index }: { readonly item: MaterialPassItem; readonly index: number }) => (
    <MaterialCard item={item} index={index} onMarkReturned={() => handleMarkReturned(item)} onShowQr={() => setQrModalItem(item)} fmt={fmt} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Material Passes</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} pass{items.length !== 1 ? 'es' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by description, pass number..."
          filters={TYPE_FILTERS}
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || typeFilter) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No material passes match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No material passes" message="Create your first material pass." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Material Passes" onMenuPress={toggle} />

      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />

      <FAB onPress={() => setShowCreateModal(true)} />

      <CreateMaterialModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} isSaving={createMutation.isPending} />

      <ConfirmModal {...confirmModalProps} />

      {/* QR Code Modal */}
      <Modal visible={!!qrModalItem} transparent animationType="fade" onRequestClose={() => setQrModalItem(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 24, width: '100%', maxWidth: 340, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text className="font-inter text-lg font-bold text-primary-950">Pass QR Code</Text>
              <Pressable onPress={() => setQrModalItem(null)} hitSlop={12}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
              {qrModalItem?.qrCode ? (
                <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: colors.neutral[100] }}>
                  <Image source={{ uri: qrModalItem.qrCode }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                </View>
              ) : null}
              <Text className="font-inter text-base font-bold text-primary-950 mt-4" style={{ fontFamily: 'Inter' }}>{qrModalItem?.passNumber}</Text>
              <Text className="font-inter text-sm font-semibold text-neutral-700 mt-1">{qrModalItem?.description}</Text>
              <View style={{ backgroundColor: PASS_TYPE_CONFIG[qrModalItem?.type ?? '']?.bg ?? colors.neutral[100], paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text className="font-inter text-[10px] font-bold" style={{ color: PASS_TYPE_CONFIG[qrModalItem?.type ?? '']?.text ?? colors.neutral[500] }}>
                  {PASS_TYPE_CONFIG[qrModalItem?.type ?? '']?.label ?? qrModalItem?.type}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 }}>
              <Pressable
                onPress={async () => {
                  if (qrModalItem?.passNumber) {
                    try {
                      await Share.share({
                        message: `Material Gate Pass: ${qrModalItem.passNumber}\nMaterial: ${qrModalItem.description}\nType: ${qrModalItem.type}`,
                        title: `Material Pass - ${qrModalItem.passNumber}`,
                      });
                    } catch { /* user cancelled */ }
                  }
                }}
                style={[formStyles.cancelBtn, { height: 48 }]}
              >
                <Text className="font-inter text-sm font-bold text-neutral-600">Share</Text>
              </Pressable>
              <Pressable onPress={() => setQrModalItem(null)} style={[formStyles.saveBtn, { height: 48 }]}>
                <Text className="font-inter text-sm font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  headerContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  listContent: { paddingHorizontal: 24 },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: colors.primary[50] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  qrBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accent[50], justifyContent: 'center', alignItems: 'center' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.success[50], borderWidth: 1, borderColor: colors.success[200], alignSelf: 'flex-start' },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
