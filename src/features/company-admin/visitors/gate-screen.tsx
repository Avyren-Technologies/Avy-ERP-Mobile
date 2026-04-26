/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Share } from 'react-native';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import {
  useCreateGate,
  useDeleteGate,
  useUpdateGate,
} from '@/features/company-admin/api/use-visitor-mutations';
import { useGates } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const GATE_TYPES = [
  { value: 'MAIN', label: 'Main Gate' },
  { value: 'SERVICE', label: 'Service Gate' },
  { value: 'LOADING_DOCK', label: 'Loading Dock' },
  { value: 'VIP', label: 'VIP Gate' },
] as const;

// ============ TYPES ============

interface LocationItem {
  id: string;
  name: string;
}

interface GateItem {
  id: string;
  name: string;
  code: string;
  plantId: string;
  locationName: string;
  type: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  qrPosterUrl?: string;
}

// ============ FORM MODAL ============

function GateFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSaving,
  locations,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly initialData: GateItem | null;
  readonly isSaving: boolean;
  readonly locations: LocationItem[];
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [gateType, setGateType] = React.useState('MAIN');
  const [openTime, setOpenTime] = React.useState('06:00');
  const [closeTime, setCloseTime] = React.useState('22:00');
  const [isActive, setIsActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code);
        setPlantId(initialData.plantId || '');
        setGateType(initialData.type || 'MAIN');
        setOpenTime(initialData.openTime || '06:00');
        setCloseTime(initialData.closeTime || '22:00');
        setIsActive(initialData.isActive);
      } else {
        setName(''); setCode(''); setPlantId(''); setGateType('MAIN');
        setOpenTime('06:00'); setCloseTime('22:00'); setIsActive(true);
      }
    }
  }, [visible, initialData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Gate name is required';
    if (!code.trim()) e.code = 'Gate code is required';
    if (!plantId) e.plantId = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      plantId,
      type: gateType,
      openTime: openTime || undefined,
      closeTime: closeTime || undefined,
      isActive,
    });
  };

  const selectedLocationName = locations.find(l => l.id === plantId)?.name ?? '';

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
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">{initialData ? 'Edit Gate' : 'New Gate'}</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            {/* Name */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Gate Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "Main Gate"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); if (!initialData) setCode(v.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').slice(0, 10)); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} />
              </View>
              {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
            </View>

            {/* Code */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Gate Code <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "MAIN-01"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(v) => { setCode(v.toUpperCase()); if (errors.code) setErrors(prev => ({ ...prev, code: '' })); }} autoCapitalize="characters" />
              </View>
              {!!errors.code && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>}
            </View>

            {/* Location (Plant) */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Location (Plant) <Text className="text-danger-500">*</Text>
              </Text>
              <View style={{ gap: 8 }}>
                {locations.map(loc => {
                  const selected = loc.id === plantId;
                  return (
                    <Pressable key={loc.id} onPress={() => { setPlantId(loc.id); if (errors.plantId) setErrors(prev => ({ ...prev, plantId: '' })); }} style={[formStyles.locationOption, selected && formStyles.locationOptionActive]}>
                      <View style={[formStyles.radioOuter, selected && formStyles.radioOuterActive]}>
                        {selected && <View style={formStyles.radioInner} />}
                      </View>
                      <Text className={`font-inter text-sm ${selected ? 'font-bold text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {loc.name}
                      </Text>
                    </Pressable>
                  );
                })}
                {locations.length === 0 && (
                  <Text className="font-inter text-xs text-neutral-400">No locations available</Text>
                )}
              </View>
              {!!errors.plantId && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.plantId}</Text>}
            </View>

            {/* Gate Type */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Gate Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GATE_TYPES.map(gt => {
                  const selected = gt.value === gateType;
                  return (
                    <Pressable key={gt.value} onPress={() => setGateType(gt.value)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        {gt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Operating Hours */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Operating Hours</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Open</Text>
                  <View style={formStyles.inputWrap}>
                    <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="06:00" placeholderTextColor={colors.neutral[400]} value={openTime} onChangeText={setOpenTime} keyboardType="numbers-and-punctuation" />
                  </View>
                </View>
                <Text className="font-inter text-neutral-400 mt-4">-</Text>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1 font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Close</Text>
                  <View style={formStyles.inputWrap}>
                    <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="22:00" placeholderTextColor={colors.neutral[400]} value={closeTime} onChangeText={setCloseTime} keyboardType="numbers-and-punctuation" />
                  </View>
                </View>
              </View>
            </View>

            {/* Active Toggle */}
            <Pressable onPress={() => setIsActive(!isActive)} style={formStyles.toggleRow}>
              <Text className="font-inter text-sm text-primary-950 dark:text-white">Active</Text>
              <View style={[formStyles.toggleTrack, isActive && formStyles.toggleTrackActive]}>
                <View style={[formStyles.toggleThumb, isActive && formStyles.toggleThumbActive]} />
              </View>
            </Pressable>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Pressable onPress={onClose} style={formStyles.cancelBtn}>
                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">DISCARD</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={isSaving} style={[formStyles.saveBtn, isSaving && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Saving...' : initialData ? 'UPDATE' : 'CREATE'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============ GATE CARD ============

function GateCard({
  item,
  index,
  onEdit,
  onDelete,
  onShowQr,
}: {
  readonly item: GateItem;
  readonly index: number;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onShowQr: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <Pressable onPress={onEdit} style={({ pressed }) => [cardStyles.card, pressed && cardStyles.cardPressed]}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
              <View style={cardStyles.codeBadge}>
                <Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text>
              </View>
            </View>
            {item.locationName ? (
              <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.locationName}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[cardStyles.statusBadge, { backgroundColor: item.isActive ? colors.success[50] : colors.neutral[100] }]}>
              <View style={[cardStyles.statusDot, { backgroundColor: item.isActive ? colors.success[500] : colors.neutral[400] }]} />
              <Text className={`font-inter text-[10px] font-bold ${item.isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {item.qrPosterUrl ? (
              <Pressable onPress={onShowQr} hitSlop={8}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM14 20h1v1h-1zM17 20h1v1h-1zM20 20h1v1h-1z" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ) : null}
            <Pressable onPress={onDelete} hitSlop={8}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>
        <View style={cardStyles.cardMeta}>
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{GATE_TYPES.find(t => t.value === item.type)?.label ?? item.type}</Text>
          </View>
          {item.openTime && item.closeTime ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.openTime} - {item.closeTime}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function GateScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [formVisible, setFormVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<GateItem | null>(null);
  const [qrModalItem, setQrModalItem] = React.useState<GateItem | null>(null);

  const { data: response, isLoading, error, refetch, isFetching } = useGates();
  const { data: locationsResponse } = useCompanyLocations();
  const createMutation = useCreateGate();
  const updateMutation = useUpdateGate();
  const deleteMutation = useDeleteGate();

  const locationsList: LocationItem[] = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({ id: l.id ?? '', name: l.name ?? '' }));
  }, [locationsResponse]);

  const items: GateItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({
      id: g.id ?? '',
      name: g.name ?? '',
      code: g.code ?? '',
      plantId: g.plantId ?? '',
      locationName: g.locationName ?? '',
      type: g.type ?? 'MAIN',
      openTime: g.openTime ?? '',
      closeTime: g.closeTime ?? '',
      isActive: g.isActive !== false,
      qrPosterUrl: g.qrPosterUrl ?? undefined,
    }));
  }, [response]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
  }, [items, search]);

  const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
  const handleEdit = (item: GateItem) => { setEditingItem(item); setFormVisible(true); };

  const handleDelete = (item: GateItem) => {
    showConfirm({
      title: 'Delete Gate',
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const handleSave = (data: Record<string, unknown>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => { setFormVisible(false); showSuccess('Gate updated'); } });
    } else {
      createMutation.mutate(data, { onSuccess: () => { setFormVisible(false); showSuccess('Gate created'); } });
    }
  };

  const renderItem = ({ item, index }: { readonly item: GateItem; readonly index: number }) => (
    <GateCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} onShowQr={() => setQrModalItem(item)} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Gates</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} gate{items.length !== 1 ? 's' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No gates match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No gates" message="Create your first gate." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Gate Management" onMenuPress={toggle} />

      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />}
      />

      <FAB onPress={handleAdd} />

      <GateFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} locations={locationsList} />

      {/* QR Code Modal */}
      <Modal visible={!!qrModalItem} transparent animationType="fade" onRequestClose={() => setQrModalItem(null)}>
        <Pressable onPress={() => setQrModalItem(null)} style={qrModalStyles.overlay}>
          <Pressable onPress={() => {}} style={qrModalStyles.content}>
            <View style={qrModalStyles.header}>
              <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">Gate QR Code</Text>
              <Pressable onPress={() => setQrModalItem(null)} hitSlop={8}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.neutral[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>

            <View style={qrModalStyles.body}>
              <Text className="font-inter text-xl font-bold text-primary-950 dark:text-white mb-1">{qrModalItem?.name}</Text>
              <Text className="font-inter text-sm font-semibold text-primary-600 mb-4">{qrModalItem?.code}</Text>

              {qrModalItem?.qrPosterUrl ? (
                <View style={qrModalStyles.qrWrap}>
                  <QRCode value={qrModalItem.qrPosterUrl} size={180} backgroundColor="#FFFFFF" color="#1E1B4B" />
                </View>
              ) : null}

              <Text className="font-inter text-base font-semibold text-primary-950 dark:text-white mt-4">
                Scan to Register Your Visit
              </Text>
              <Text className="font-inter text-xs text-neutral-400 mt-1 text-center px-4">
                Point your phone camera at this QR code to self-register as a visitor
              </Text>

              <View style={qrModalStyles.urlBox}>
                <Text className="font-inter text-[10px] text-neutral-400 mb-0.5">URL</Text>
                <Text className="font-inter text-xs text-primary-600 font-medium" selectable numberOfLines={2}>{qrModalItem?.qrPosterUrl}</Text>
              </View>
            </View>

            <View style={qrModalStyles.actions}>
              <Pressable
                onPress={async () => {
                  if (qrModalItem?.qrPosterUrl) {
                    try {
                      await Share.share({
                        message: `Scan this QR code to register your visit at ${qrModalItem.name}:\n${qrModalItem.qrPosterUrl}`,
                        title: `Gate QR - ${qrModalItem.name}`,
                      });
                    } catch { /* user cancelled */ }
                  }
                }}
                style={qrModalStyles.shareBtn}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-sm font-bold text-white ml-2">Share</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (qrModalItem?.qrPosterUrl) {
                    await Clipboard.setStringAsync(qrModalItem.qrPosterUrl);
                    showSuccess('URL copied to clipboard');
                  }
                }}
                style={qrModalStyles.copyBtn}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M16 3H4v13M8 7h12v14H8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-sm font-bold text-primary-600 ml-2">Copy URL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal {...confirmModalProps} />
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
  cardPressed: { backgroundColor: colors.primary[50], transform: [{ scale: 0.98 }] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});

const qrModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  content: { backgroundColor: colors.white, borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  body: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: colors.neutral[200], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  urlBox: { backgroundColor: colors.primary[50], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: '100%', borderWidth: 1, borderColor: colors.primary[100], marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary[600], borderRadius: 12, paddingVertical: 14, shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary[50], borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.primary[200] },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  locationOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.neutral[50], borderWidth: 1.5, borderColor: colors.neutral[200] },
  locationOptionActive: { borderColor: colors.primary[400], backgroundColor: colors.primary[50] },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: colors.primary[600] },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[600] },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary[600] },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbActive: { alignSelf: 'flex-end' as const },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
