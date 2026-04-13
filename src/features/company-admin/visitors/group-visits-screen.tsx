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

import { useBatchCheckIn, useBatchCheckOut, useCreateGroupVisit } from '@/features/company-admin/api/use-visitor-mutations';
import { useGroupVisits } from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface GroupVisitItem {
  id: string;
  groupName: string;
  visitCode: string;
  hostName: string;
  expectedDate: string;
  totalMembers: number;
  status: string;
}

// ============ STATUS CONFIG ============

const GROUP_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PLANNED: { label: 'Planned', bg: colors.info[50], text: colors.info[700] },
  IN_PROGRESS: { label: 'In Progress', bg: colors.warning[50], text: colors.warning[700] },
  COMPLETED: { label: 'Completed', bg: colors.success[50], text: colors.success[700] },
  CANCELLED: { label: 'Cancelled', bg: colors.neutral[100], text: colors.neutral[500] },
};

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PLANNED', label: 'Planned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// ============ CREATE MODAL ============

function CreateGroupModal({
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
  const [groupName, setGroupName] = React.useState('');
  const [hostName, setHostName] = React.useState('');
  const [totalMembers, setTotalMembers] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) { setGroupName(''); setHostName(''); setTotalMembers(''); setErrors({}); }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!groupName.trim()) e.groupName = 'Group name is required';
    if (!hostName.trim()) e.hostName = 'Host is required';
    if (!totalMembers.trim() || isNaN(Number(totalMembers))) e.totalMembers = 'Valid member count is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      groupName: groupName.trim(),
      hostName: hostName.trim(),
      totalMembers: Number(totalMembers),
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
            <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">New Group Visit</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 100 }}>
            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Group Name <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.groupName && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder='e.g. "Board Meeting"' placeholderTextColor={colors.neutral[400]} value={groupName} onChangeText={(v) => { setGroupName(v); if (errors.groupName) setErrors(prev => ({ ...prev, groupName: '' })); }} />
              </View>
              {!!errors.groupName && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.groupName}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Host <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.hostName && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Host employee name" placeholderTextColor={colors.neutral[400]} value={hostName} onChangeText={(v) => { setHostName(v); if (errors.hostName) setErrors(prev => ({ ...prev, hostName: '' })); }} />
              </View>
              {!!errors.hostName && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.hostName}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Total Members <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.totalMembers && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Number of members" placeholderTextColor={colors.neutral[400]} value={totalMembers} onChangeText={(v) => { setTotalMembers(v); if (errors.totalMembers) setErrors(prev => ({ ...prev, totalMembers: '' })); }} keyboardType="number-pad" />
              </View>
              {!!errors.totalMembers && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.totalMembers}</Text>}
            </View>

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

// ============ GROUP CARD ============

function GroupCard({
  item,
  index,
  onBatchCheckIn,
  onBatchCheckOut,
  fmt,
}: {
  readonly item: GroupVisitItem;
  readonly index: number;
  readonly onBatchCheckIn: () => void;
  readonly onBatchCheckOut: () => void;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  const cfg = GROUP_STATUS_CONFIG[item.status] ?? { label: item.status, bg: colors.neutral[100], text: colors.neutral[500] };

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(100 + index * 60)}>
      <View style={cardStyles.card}>
        <View style={cardStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.groupName}</Text>
              {item.visitCode ? (
                <View style={cardStyles.codeBadge}>
                  <Text className="font-inter text-[10px] font-bold text-primary-600">{item.visitCode}</Text>
                </View>
              ) : null}
            </View>
            {item.hostName ? (
              <Text className="mt-0.5 font-inter text-xs text-neutral-500 dark:text-neutral-400">Host: {item.hostName}</Text>
            ) : null}
          </View>
          <View style={[cardStyles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text className="font-inter text-[10px] font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
          </View>
        </View>

        <View style={cardStyles.cardMeta}>
          <View style={cardStyles.metaChip}>
            <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{item.totalMembers} member{item.totalMembers !== 1 ? 's' : ''}</Text>
          </View>
          {item.expectedDate ? (
            <View style={cardStyles.metaChip}>
              <Text className="font-inter text-[10px] text-neutral-500 dark:text-neutral-400">{fmt.date(item.expectedDate)}</Text>
            </View>
          ) : null}
        </View>

        {(item.status === 'PLANNED' || item.status === 'IN_PROGRESS') ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {item.status === 'PLANNED' ? (
              <Pressable onPress={onBatchCheckIn} style={cardStyles.actionBtn}>
                <Text className="font-inter text-[11px] font-bold text-primary-600">BATCH CHECK-IN</Text>
              </Pressable>
            ) : null}
            {item.status === 'IN_PROGRESS' ? (
              <Pressable onPress={onBatchCheckOut} style={[cardStyles.actionBtn, { backgroundColor: colors.warning[50], borderColor: colors.warning[200] }]}>
                <Text className="font-inter text-[11px] font-bold text-warning-600">BATCH CHECK-OUT</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function GroupVisitsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const fmt = useCompanyFormatter();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const queryParams = React.useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search.trim()) p.search = search.trim();
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [search, statusFilter]);

  const { data: response, isLoading, error, refetch, isFetching } = useGroupVisits(queryParams);
  const createMutation = useCreateGroupVisit();
  const batchCheckInMutation = useBatchCheckIn();
  const batchCheckOutMutation = useBatchCheckOut();

  const items: GroupVisitItem[] = React.useMemo(() => {
    const raw = (response as any)?.data ?? response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((g: any) => ({
      id: g.id ?? '',
      groupName: g.groupName ?? g.name ?? '',
      visitCode: g.visitCode ?? g.code ?? '',
      hostName: g.hostName ?? g.host?.name ?? '',
      expectedDate: g.expectedDate ?? g.visitDate ?? g.createdAt ?? '',
      totalMembers: g.totalMembers ?? g.memberCount ?? 0,
      status: g.status ?? 'PLANNED',
    }));
  }, [response]);

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => { setShowCreateModal(false); showSuccess('Group visit created'); },
    });
  };

  const handleBatchCheckIn = (item: GroupVisitItem) => {
    showConfirm({
      title: 'Batch Check-In',
      message: `Check in all ${item.totalMembers} members of "${item.groupName}"?`,
      confirmText: 'Check In All',
      variant: 'primary',
      onConfirm: () => batchCheckInMutation.mutate(item.id, {
        onSuccess: () => showSuccess('Batch check-in completed'),
      }),
    });
  };

  const handleBatchCheckOut = (item: GroupVisitItem) => {
    showConfirm({
      title: 'Batch Check-Out',
      message: `Check out all members of "${item.groupName}"?`,
      confirmText: 'Check Out All',
      variant: 'primary',
      onConfirm: () => batchCheckOutMutation.mutate(item.id, {
        onSuccess: () => showSuccess('Batch check-out completed'),
      }),
    });
  };

  const renderItem = ({ item, index }: { readonly item: GroupVisitItem; readonly index: number }) => (
    <GroupCard item={item} index={index} onBatchCheckIn={() => handleBatchCheckIn(item)} onBatchCheckOut={() => handleBatchCheckOut(item)} fmt={fmt} />
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={s.headerContent}>
      <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Group Visits</Text>
      <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">{items.length} group{items.length !== 1 ? 's' : ''}</Text>
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by group name, code..."
          filters={STATUS_FILTERS}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </View>
    </Animated.View>
  );

  const renderEmpty = () => {
    if (isLoading) return <View style={{ paddingTop: 24 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
    if (error) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} /></View>;
    if (search.trim() || statusFilter) return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="search" title="No results" message="No group visits match your filters." /></View>;
    return <View style={{ paddingTop: 40, alignItems: 'center' }}><EmptyState icon="inbox" title="No group visits" message="Create your first group visit." /></View>;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Group Visits" onMenuPress={toggle} />

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

      <CreateGroupModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} isSaving={createMutation.isPending} />

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  metaChip: { backgroundColor: colors.neutral[50], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeBadge: { backgroundColor: colors.primary[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] },
});

const formStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[200] },
  saveBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
