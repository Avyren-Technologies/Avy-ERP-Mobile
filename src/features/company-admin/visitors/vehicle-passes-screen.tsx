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
import { useCreateVehiclePass, useRecordVehicleExit } from '@/features/company-admin/api/use-visitor-mutations';
import { useGates, useVehiclePasses } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface VehiclePassItem {
  id: string;
  passNumber: string;
  vehicleRegNumber: string;
  vehicleType: string;
  driverName: string;
  purpose: string;
  entryTime: string | null;
  exitTime: string | null;
  qrCode: string | null;
}

// ============ CREATE MODAL ============

function CreateVehicleModal({
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
  const [vehicleRegNumber, setVehicleRegNumber] = React.useState('');
  const [vehicleType, setVehicleType] = React.useState('CAR');
  const [driverName, setDriverName] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [entryGateId, setEntryGateId] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
    if (visible) { setVehicleRegNumber(''); setVehicleType('CAR'); setDriverName(''); setPurpose(''); setEntryGateId(''); setPlantId(''); setErrors({}); }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!vehicleRegNumber.trim()) e.vehicleRegNumber = 'Vehicle registration is required';
    if (!driverName.trim()) e.driverName = 'Driver name is required';
    if (!purpose.trim()) e.purpose = 'Purpose is required';
    if (!entryGateId) e.entryGateId = 'Entry gate is required';
    if (!plantId) e.plantId = 'Plant is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      vehicleRegNumber: vehicleRegNumber.trim().toUpperCase(),
      vehicleType,
      driverName: driverName.trim(),
      purpose: purpose.trim(),
      entryGateId,
      plantId,
    });
  };

  const VEHICLE_TYPES = ['CAR', 'TWO_WHEELER', 'AUTO', 'TRUCK', 'VAN', 'TEMPO', 'BUS'];

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
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">New Vehicle Pass</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Vehicle Registration <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.vehicleRegNumber && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "KA-01-AB-1234"' placeholderTextColor={colors.neutral[400]} value={vehicleRegNumber} onChangeText={(v) => { setVehicleRegNumber(v); if (errors.vehicleRegNumber) setErrors(prev => ({ ...prev, vehicleRegNumber: '' })); }} autoCapitalize="characters" />
              </View>
              {!!errors.vehicleRegNumber && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.vehicleRegNumber}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Vehicle Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {VEHICLE_TYPES.map(vt => {
                  const selected = vt === vehicleType;
                  return (
                    <Pressable key={vt} onPress={() => setVehicleType(vt)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{vt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Driver Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.driverName && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Driver full name" placeholderTextColor={colors.neutral[400]} value={driverName} onChangeText={(v) => { setDriverName(v); if (errors.driverName) setErrors(prev => ({ ...prev, driverName: '' })); }} />
              </View>
              {!!errors.driverName && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.driverName}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Purpose <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, { height: 80 }, !!errors.purpose && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]} placeholder="Purpose of visit" placeholderTextColor={colors.neutral[400]} value={purpose} onChangeText={(v) => { setPurpose(v); if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' })); }} multiline />
              </View>
              {!!errors.purpose && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.purpose}</Text>}
            </View>

            <DropdownField
              label="Entry Gate"
              selected={entryGateId}
              onSelect={(v) => { setEntryGateId(v); if (errors.entryGateId) setErrors(prev => ({ ...prev, entryGateId: '' })); }}
              options={gateOptions}
              placeholder="Select entry gate..."
              required
              error={errors.entryGateId}
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

// ============ VEHICLE CARD ============

function VehicleCard({
  item,
  index,
  onRecordExit,
  onShowQr,
  fmt,
}: {
  readonly item: VehiclePassItem;
  readonly index: number;
  readonly onRecordExit: () => void;
  readonly onShowQr: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  const hasExited = !!item.exitTime;

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.vehicleRegNumber}</Text>
              {item.passNumber ? (
                <View style={cardStyles.codeBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">{item.passNumber}</Text>
                </View>
              ) : null}
            </View>
            {item.driverName ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.driverName}</Text>
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
            <View style={[cardStyles.statusBadge, { backgroundColor: hasExited ? colors.neutral[100] : colors.success[50] }]}>
              <Text className={`font-inter text-[10px] font-bold ${hasExited ? 'text-neutral-500' : 'text-success-700'}`}>
                {hasExited ? 'Exited' : 'On Site'}
              </Text>
            </View>
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.vehicleType}</Text>
          </View>
          {item.purpose ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.purpose}</Text>
            </View>
          ) : null}
          {item.entryTime ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">In: {fmt.time(item.entryTime)}</Text>
            </View>
          ) : null}
          {item.exitTime ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Out: {fmt.time(item.exitTime)}</Text>
            </View>
          ) : null}
        </View>

        {!hasExited ? (
          <View style={{ marginTop: 12 }}>
            <Pressable onPress={onRecordExit} style={cardStyles.actionBtn}>
              <Text className="font-inter text-[11px] font-bold text-warning-600">RECORD EXIT</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function VehiclePassesScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [exitTarget, setExitTarget] = React.useState<VehiclePassItem | null>(null);
  const [exitGateId, setExitGateId] = React.useState('');
  const [qrModalItem, setQrModalItem] = React.useState<VehiclePassItem | null>(null);

  const { data: gatesResponseMain } = useGates();
  const exitGateOptions = React.useMemo(() => {
    const raw = (gatesResponseMain as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({ id: g.id, name: `${g.name} (${g.code})` }));
  }, [gatesResponseMain]);

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search]);

  const { data: response, isLoading, error, refetch, isFetching } = useVehiclePasses(queryParams);
  const createMutation = useCreateVehiclePass();
  const exitMutation = useRecordVehicleExit();

  const items: VehiclePassItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      id: v.id ?? '',
      passNumber: v.passNumber ?? '',
      vehicleRegNumber: v.vehicleRegNumber ?? '',
      vehicleType: v.vehicleType ?? 'CAR',
      driverName: v.driverName ?? '',
      purpose: v.purpose ?? '',
      entryTime: v.entryTime ?? null,
      exitTime: v.exitTime ?? null,
      qrCode: v.qrCode ?? null,
    }));
  }, [response]);

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowCreateModal(false); showSuccess('Vehicle pass created'); },
    });
  };

  const handleRecordExit = (item: VehiclePassItem) => {
    setExitTarget(item);
    setExitGateId('');
  };

  const confirmExit = () => {
    if (!exitTarget || !exitGateId) return;
    exitMutation.mutate({ id: exitTarget.id, data: { exitGateId } }, {
      onSuccess: () => { showSuccess('Vehicle exit recorded'); setExitTarget(null); setExitGateId(''); },
    });
  };

  const renderItem = ({ item, index }: { readonly item: VehiclePassItem; readonly index: number }) => (
    <VehicleCard item={item} index={index} onRecordExit={() => handleRecordExit(item)} onShowQr={() => setQrModalItem(item)} fmt={fmt} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Vehicle Passes</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} pass{items.length !== 1 ? 'es' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by vehicle reg, driver..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No vehicle passes match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No vehicle passes" message="Create your first vehicle pass." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Vehicle Passes" onMenuPress={toggle} />

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

      <CreateVehicleModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} isSaving={createMutation.isPending} />

      <ConfirmModal {...confirmModalProps} />

      {/* Exit Gate Modal */}
      <Modal visible={!!exitTarget} transparent animationType="fade" onRequestClose={() => setExitTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
            <Text className="font-inter text-lg font-bold text-primary-950 mb-2">Record Vehicle Exit</Text>
            <Text className="font-inter text-sm text-neutral-500 mb-4">Select the exit gate for {exitTarget?.vehicleRegNumber}.</Text>
            <DropdownField
              label="Exit Gate"
              selected={exitGateId}
              onSelect={setExitGateId}
              options={exitGateOptions}
              placeholder="Select exit gate..."
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Pressable onPress={() => { setExitTarget(null); setExitGateId(''); }} style={[formStyles.cancelBtn, { height: 48 }]}>
                <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmExit} disabled={exitMutation.isPending || !exitGateId} style={[formStyles.saveBtn, { height: 48 }, (!exitGateId || exitMutation.isPending) && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{exitMutation.isPending ? 'Recording...' : 'Record Exit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text className="font-inter text-sm font-semibold text-neutral-700 mt-1">{qrModalItem?.vehicleRegNumber}</Text>
              <Text className="font-inter text-xs text-neutral-500 mt-0.5">{qrModalItem?.driverName}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 }}>
              <Pressable
                onPress={async () => {
                  if (qrModalItem?.passNumber) {
                    try {
                      await Share.share({
                        message: `Vehicle Gate Pass: ${qrModalItem.passNumber}\nVehicle: ${qrModalItem.vehicleRegNumber}\nDriver: ${qrModalItem.driverName}`,
                        title: `Vehicle Pass - ${qrModalItem.passNumber}`,
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
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.warning[50], borderWidth: 1, borderColor: colors.warning[200], alignSelf: 'flex-start' },
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
