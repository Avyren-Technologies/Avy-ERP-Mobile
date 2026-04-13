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
  useCreateVisitorType,
  useDeleteVisitorType,
  useUpdateVisitorType,
} from '@/features/company-admin/api/use-visitor-mutations';
import { useVisitorTypes } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface VisitorTypeItem {
  id: string;
  name: string;
  code: string;
  badgeColor: string;
  requiresApproval: boolean;
  requiresIdProof: boolean;
  requiresPhoto: boolean;
  maxDurationMinutes: number;
  isActive: boolean;
}

// ============ FORM MODAL ============

function VisitorTypeFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSaving,
}: {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSave: (data: Record<string, unknown>) => void;
  readonly initialData: VisitorTypeItem | null;
  readonly isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [badgeColor, setBadgeColor] = React.useState('#6366F1');
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [requiresIdProof, setRequiresIdProof] = React.useState(false);
  const [requiresPhoto, setRequiresPhoto] = React.useState(false);
  const [maxDuration, setMaxDuration] = React.useState('480');
  const [isActive, setIsActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code);
        setBadgeColor(initialData.badgeColor || '#6366F1');
        setRequiresApproval(initialData.requiresApproval);
        setRequiresIdProof(initialData.requiresIdProof);
        setRequiresPhoto(initialData.requiresPhoto);
        setMaxDuration(String(initialData.maxDurationMinutes || 480));
        setIsActive(initialData.isActive);
      } else {
        setName(''); setCode(''); setBadgeColor('#6366F1');
        setRequiresApproval(false); setRequiresIdProof(false); setRequiresPhoto(false);
        setMaxDuration('480'); setIsActive(true);
      }
    }
  }, [visible, initialData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!code.trim()) e.code = 'Code is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      badgeColor,
      requiresApproval,
      requiresIdProof,
      requiresPhoto,
      maxDurationMinutes: Number.parseInt(maxDuration, 10) || 480,
      isActive,
    });
  };

  const BADGE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#0EA5E9', '#8B5CF6', '#EC4899'];

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
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
              {initialData ? 'Edit Visitor Type' : 'New Visitor Type'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            {/* Name */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "Vendor"' placeholderTextColor={colors.neutral[400]} value={name} onChangeText={(v) => { setName(v); if (!initialData) setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }} />
              </View>
              {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
            </View>

            {/* Code */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Code <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.code && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "VND"' placeholderTextColor={colors.neutral[400]} value={code} onChangeText={(v) => { setCode(v.toUpperCase()); if (errors.code) setErrors(prev => ({ ...prev, code: '' })); }} autoCapitalize="characters" />
              </View>
              {!!errors.code && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.code}</Text>}
            </View>

            {/* Badge Color */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Badge Color</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {BADGE_COLORS.map(c => (
                  <Pressable key={c} onPress={() => setBadgeColor(c)} style={[formStyles.colorDot, { backgroundColor: c }, badgeColor === c && formStyles.colorDotSelected]}>
                    {badgeColor === c && (
                      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Max Duration */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Max Duration (minutes)</Text>
              <View style={formStyles.inputWrap}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="480" placeholderTextColor={colors.neutral[400]} value={maxDuration} onChangeText={setMaxDuration} keyboardType="number-pad" />
              </View>
            </View>

            {/* Toggles */}
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Requirements</Text>
              {[
                { label: 'Requires Approval', value: requiresApproval, setter: setRequiresApproval },
                { label: 'Requires ID Proof', value: requiresIdProof, setter: setRequiresIdProof },
                { label: 'Requires Photo', value: requiresPhoto, setter: setRequiresPhoto },
                { label: 'Active', value: isActive, setter: setIsActive },
              ].map(toggle => (
                <Pressable key={toggle.label} onPress={() => toggle.setter(!toggle.value)} style={formStyles.toggleRow}>
                  <Text className="font-inter text-sm text-primary-950 dark:text-white">{toggle.label}</Text>
                  <View style={[formStyles.toggleTrack, toggle.value && formStyles.toggleTrackActive]}>
                    <View style={[formStyles.toggleThumb, toggle.value && formStyles.toggleThumbActive]} />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
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

// ============ VISITOR TYPE CARD ============

function VisitorTypeCard({
  item,
  index,
  onEdit,
  onDelete,
}: {
  readonly item: VisitorTypeItem;
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
              <View style={[cardStyles.colorIndicator, { backgroundColor: item.badgeColor || colors.primary[500] }]} />
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.name}</Text>
              <View style={cardStyles.codeBadge}>
                <Text className="font-inter text-[10px] font-bold text-primary-600">{item.code}</Text>
              </View>
            </View>
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
          {item.requiresApproval && (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Approval Required</Text>
            </View>
          )}
          {item.requiresIdProof && (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">ID Proof</Text>
            </View>
          )}
          {item.requiresPhoto && (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Photo</Text>
            </View>
          )}
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">Max: {item.maxDurationMinutes}min</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function VisitorTypeScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [formVisible, setFormVisible] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<VisitorTypeItem | null>(null);

  const { data: response, isLoading, error, refetch, isFetching } = useVisitorTypes();
  const createMutation = useCreateVisitorType();
  const updateMutation = useUpdateVisitorType();
  const deleteMutation = useDeleteVisitorType();

  const items: VisitorTypeItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      id: t.id ?? '',
      name: t.name ?? '',
      code: t.code ?? '',
      badgeColor: t.badgeColor ?? t.color ?? '#6366F1',
      requiresApproval: !!t.requiresApproval,
      requiresIdProof: !!t.requiresIdProof,
      requiresPhoto: !!t.requiresPhoto,
      maxDurationMinutes: t.maxDurationMinutes ?? 480,
      isActive: t.isActive !== false,
    }));
  }, [response]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [items, search]);

  const handleAdd = () => { setEditingItem(null); setFormVisible(true); };
  const handleEdit = (item: VisitorTypeItem) => { setEditingItem(item); setFormVisible(true); };

  const handleDelete = (item: VisitorTypeItem) => {
    showConfirm({
      title: 'Delete Visitor Type',
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const handleSave = (data: Record<string, unknown>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data }, { onSuccess: () => { setFormVisible(false); showSuccess('Visitor type updated'); } });
    } else {
      createMutation.mutate(data, { onSuccess: () => { setFormVisible(false); showSuccess('Visitor type created'); } });
    }
  };

  const renderItem = ({ item, index }: { readonly item: VisitorTypeItem; readonly index: number }) => (
    <VisitorTypeCard item={item} index={index} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Visitor Types</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} type{items.length !== 1 ? 's' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or code..." />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim()) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No visitor types match your search." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No visitor types" message="Create your first visitor type." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Visitor Types" onMenuPress={toggle} />

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

      <VisitorTypeFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        initialData={editingItem}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

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
  colorIndicator: { width: 12, height: 12, borderRadius: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  colorDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  colorDotSelected: { borderWidth: 3, borderColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary[600] },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbActive: { alignSelf: 'flex-end' },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
