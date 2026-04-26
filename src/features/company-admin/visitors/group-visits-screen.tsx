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
import { DropdownField } from '@/components/ui/dropdown-field';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
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
  const [hostEmployeeId, setHostEmployeeId] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [memberName1, setMemberName1] = React.useState('');
  const [memberMobile1, setMemberMobile1] = React.useState('');
  const [memberName2, setMemberName2] = React.useState('');
  const [memberMobile2, setMemberMobile2] = React.useState('');
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

  React.useEffect(() => {
    if (visible) { setGroupName(''); setHostEmployeeId(''); setPurpose(''); setExpectedDate(''); setPlantId(''); setMemberName1(''); setMemberMobile1(''); setMemberName2(''); setMemberMobile2(''); setErrors({}); }
  }, [visible]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!groupName.trim()) e.groupName = 'Group name is required';
    if (!hostEmployeeId) e.hostEmployeeId = 'Host employee is required';
    if (!purpose.trim()) e.purpose = 'Purpose is required';
    if (!expectedDate.trim()) e.expectedDate = 'Expected date is required';
    if (!plantId) e.plantId = 'Plant is required';
    if (!memberName1.trim() || !memberMobile1.trim()) e.member1 = 'Member 1 name and mobile are required';
    if (!memberName2.trim() || !memberMobile2.trim()) e.member2 = 'Member 2 name and mobile are required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      groupName: groupName.trim(),
      hostEmployeeId,
      purpose: purpose.trim(),
      expectedDate: expectedDate.trim(),
      plantId,
      members: [
        { visitorName: memberName1.trim(), visitorMobile: memberMobile1.trim() },
        { visitorName: memberName2.trim(), visitorMobile: memberMobile2.trim() },
      ],
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

            <DropdownField
              label="Host Employee"
              selected={hostEmployeeId}
              onSelect={(v) => { setHostEmployeeId(v); if (errors.hostEmployeeId) setErrors(prev => ({ ...prev, hostEmployeeId: '' })); }}
              options={employeeOptions}
              placeholder="Select host employee..."
              required
              error={errors.hostEmployeeId}
            />

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Purpose <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.purpose && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Factory tour, audit, etc." placeholderTextColor={colors.neutral[400]} value={purpose} onChangeText={(v) => { setPurpose(v); if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' })); }} />
              </View>
              {!!errors.purpose && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.purpose}</Text>}
            </View>

            <View style={formStyles.fieldWrap}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                Expected Date <Text className="text-danger-500">*</Text>
              </Text>
              <View style={[formStyles.inputWrap, !!errors.expectedDate && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.neutral[400]} value={expectedDate} onChangeText={(v) => { setExpectedDate(v); if (errors.expectedDate) setErrors(prev => ({ ...prev, expectedDate: '' })); }} />
              </View>
              {!!errors.expectedDate && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.expectedDate}</Text>}
            </View>

            <DropdownField
              label="Location (Plant)"
              selected={plantId}
              onSelect={(v) => { setPlantId(v); if (errors.plantId) setErrors(prev => ({ ...prev, plantId: '' })); }}
              options={locationOptions}
              placeholder="Select location..."
              required
              error={errors.plantId}
            />

            <Text className="mt-2 mb-1 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
              Member 1 <Text className="text-danger-500">*</Text>
            </Text>
            <View style={formStyles.fieldWrap}>
              <View style={[formStyles.inputWrap, !!errors.member1 && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Name" placeholderTextColor={colors.neutral[400]} value={memberName1} onChangeText={setMemberName1} />
              </View>
              <View style={[formStyles.inputWrap, { marginTop: 8 }, !!errors.member1 && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Mobile (10+ digits)" placeholderTextColor={colors.neutral[400]} value={memberMobile1} onChangeText={setMemberMobile1} keyboardType="phone-pad" />
              </View>
              {!!errors.member1 && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.member1}</Text>}
            </View>

            <Text className="mt-2 mb-1 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
              Member 2 <Text className="text-danger-500">*</Text>
            </Text>
            <View style={formStyles.fieldWrap}>
              <View style={[formStyles.inputWrap, !!errors.member2 && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Name" placeholderTextColor={colors.neutral[400]} value={memberName2} onChangeText={setMemberName2} />
              </View>
              <View style={[formStyles.inputWrap, { marginTop: 8 }, !!errors.member2 && { borderColor: colors.danger[300] }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Mobile (10+ digits)" placeholderTextColor={colors.neutral[400]} value={memberMobile2} onChangeText={setMemberMobile2} keyboardType="phone-pad" />
              </View>
              {!!errors.member2 && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.member2}</Text>}
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
      groupName: g.groupName ?? '',
      visitCode: g.visitCode ?? '',
      hostName: g.hostEmployeeName ?? g.hostEmployeeId ?? '',
      expectedDate: g.expectedDate ?? g.createdAt ?? '',
      totalMembers: g.totalMembers ?? g.members?.length ?? 0,
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
      message: `Check in all ${item.totalMembers} members of "${item.groupName}"? You will need to provide a gate ID.`,
      confirmText: 'Check In All',
      variant: 'primary',
      onConfirm: () => {
        // The backend requires memberIds and checkInGateId.
        // We fetch the group details and check in all EXPECTED members.
        // For now, we send all member IDs from the cached response.
        const raw = (response as any)?.data ?? response ?? [];
        const group = Array.isArray(raw) ? raw.find((g: any) => g.id === item.id) : null;
        const memberIds = (group?.members ?? [])
          .filter((m: any) => m.status === 'EXPECTED')
          .map((m: any) => m.id);
        if (memberIds.length === 0) {
          showSuccess('No members to check in');
          return;
        }
        batchCheckInMutation.mutate(
          { id: item.id, data: { memberIds, checkInGateId: group?.gateId ?? '' } },
          { onSuccess: () => showSuccess('Batch check-in completed') },
        );
      },
    });
  };

  const handleBatchCheckOut = (item: GroupVisitItem) => {
    showConfirm({
      title: 'Batch Check-Out',
      message: `Check out all members of "${item.groupName}"?`,
      confirmText: 'Check Out All',
      variant: 'primary',
      onConfirm: () => batchCheckOutMutation.mutate(
        { id: item.id, data: { checkOutMethod: 'SECURITY_DESK' } },
        { onSuccess: () => showSuccess('Batch check-out completed') },
      ),
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
