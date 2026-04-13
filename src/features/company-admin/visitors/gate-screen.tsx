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
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface GateItem {
  id: string;
  name: string;
  code: string;
  location: string;
  gateType: string;
  isActive: boolean;
}

// ============ FORM MODAL ============

function GateFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSaving,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly initialData: GateItem | null;
  readonly isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [gateType, setGateType] = React.useState('ENTRY_EXIT');
  const [isActive, setIsActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code);
        setLocation(initialData.location);
        setGateType(initialData.gateType || 'ENTRY_EXIT');
        setIsActive(initialData.isActive);
      } else {
        setName(''); setCode(''); setLocation(''); setGateType('ENTRY_EXIT'); setIsActive(true);
      }
    }
  }, [visible, initialData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Gate name is required';
    if (!code.trim()) e.code = 'Gate code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location.trim() || undefined,
      gateType,
      isActive,
    });
  };

  const GATE_TYPES = ['ENTRY', 'EXIT', 'ENTRY_EXIT'];

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

            {/* Location */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Location</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Building / area" placeholderTextColor={colors.neutral[400]} value={location} onChangeText={setLocation} />
              </View>
            </View>

            {/* Gate Type */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Gate Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {GATE_TYPES.map(gt => {
                  const selected = gt === gateType;
                  return (
                    <Pressable key={gt} onPress={() => setGateType(gt)} style={[formStyles.chip, selected && formStyles.chipActive]}>
                      <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        {gt.replace(/_/g, ' ')}
                      </Text>
                    </Pressable>
                  );
                })}
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
}: {
  readonly item: GateItem;
  readonly index: number;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
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
            {item.location ? (
              <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{item.location}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[cardStyles.statusBadge, { backgroundColor: item.isActive ? colors.success[50] : colors.neutral[100] }]}>
              <View style={[cardStyles.statusDot, { backgroundColor: item.isActive ? colors.success[500] : colors.neutral[400] }]} />
              <Text className={`font-inter text-[10px] font-bold ${item.isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={colors.danger[400]} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>
        <View style={cardStyles.cardMeta}>
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.gateType.replace(/_/g, ' ')}</Text>
          </View>
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

  const { data: response, isLoading, error, refetch, isFetching } = useGates();
  const createMutation = useCreateGate();
  const updateMutation = useUpdateGate();
  const deleteMutation = useDeleteGate();

  const items: GateItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({
      id: g.id ?? '',
      name: g.name ?? '',
      code: g.code ?? '',
      location: g.location ?? '',
      gateType: g.gateType ?? g.type ?? 'ENTRY_EXIT',
      isActive: g.isActive !== false,
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
    <GateCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
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

      <GateFormModal visible={formVisible} onClose={() => setFormVisible(false)} onSave={handleSave} initialData={editingItem} isSaving={createMutation.isPending || updateMutation.isPending} />

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

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary[600] },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbActive: { alignSelf: 'flex-end' as const },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
