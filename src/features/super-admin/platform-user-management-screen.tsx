/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { showError, showSuccess, showErrorMessage } from '@/components/ui/utils';

import {
  usePlatformUsers,
  usePlatformUserStats,
  usePlatformCompanies,
  useCreatePlatformUser,
  useUpdatePlatformUser,
  useResetPlatformUserPassword,
  useUpdatePlatformUserStatus,
  useDeletePlatformUser,
} from '@/features/super-admin/api/use-platform-user-queries';
import { useIsDark } from '@/hooks/use-is-dark';

import type { PlatformUser, CompanyOption } from '@/lib/api/platform-users';

// ============ TYPES ============

type RoleFilter = 'All' | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
type StatusFilter = 'All' | 'Active' | 'Inactive';

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  companyId: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'USER';
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  companyId: '',
  role: 'USER',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Company Admin',
  USER: 'User',
};

// ============ HELPERS ============

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN': return colors.warning[600];
    case 'COMPANY_ADMIN': return colors.primary[600];
    default: return colors.neutral[500];
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

// ============ STAT CARD ============

function StatCard({ label, value, color, index }: {
  label: string; value: number; color: string; index: number;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(100 + index * 60)}
      style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}
    >
      <Text className="font-inter text-xl font-extrabold text-neutral-900 dark:text-white">
        {value}
      </Text>
      <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
        {label}
      </Text>
    </Animated.View>
  );
}

// ============ USER CARD ============

function UserCard({ user, index, onEdit, onResetPassword, onToggleStatus, onDelete }: {
  user: PlatformUser;
  index: number;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const isDark = useIsDark();
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 40)}>
      <View style={[styles.userCard, isDark && styles.userCardDark]}>
        {/* Header Row */}
        <View style={styles.userCardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: isDark ? colors.accent[900] : colors.accent[100] }]}>
              <Text className="font-inter text-sm font-bold text-accent-700 dark:text-accent-400">
                {getInitials(user.firstName, user.lastName)}
              </Text>
            </View>
            <View style={styles.nameContainer}>
              <Text className="font-inter text-sm font-bold text-neutral-900 dark:text-white" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="font-inter text-xs text-primary-600 dark:text-primary-400 mt-0.5" numberOfLines={1}>
                {user.email}
              </Text>
              {user.phone ? (
                <Text className="font-inter text-[10px] text-neutral-400 mt-0.5">{user.phone}</Text>
              ) : null}
            </View>
          </View>
          <StatusBadge status={user.isActive ? 'active' : 'suspended'} size="sm" />
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text className="font-inter text-[10px] uppercase tracking-wider text-neutral-400">Company</Text>
            <Text className="font-inter text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-0.5" numberOfLines={1}>
              {user.companyName ?? '—'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text className="font-inter text-[10px] uppercase tracking-wider text-neutral-400">Platform Role</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
              <Text className="font-inter text-[10px] font-bold text-white">
                {ROLE_LABELS[user.role] ?? user.role}
              </Text>
            </View>
          </View>
          {user.tenantRoleName ? (
            <View style={styles.infoItem}>
              <Text className="font-inter text-[10px] uppercase tracking-wider text-neutral-400">Tenant Role</Text>
              <Text className="font-inter text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-0.5">
                {user.tenantRoleName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable onPress={onEdit} style={[styles.actionBtn, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
            <Text className="font-inter text-[11px] font-bold text-primary-700 dark:text-primary-400">Edit</Text>
          </Pressable>
          <Pressable onPress={onResetPassword} style={[styles.actionBtn, { backgroundColor: isDark ? '#2E1F0F' : colors.warning[50] }]}>
            <Text className="font-inter text-[11px] font-bold text-warning-700 dark:text-warning-400">Password</Text>
          </Pressable>
          <Pressable
            onPress={onToggleStatus}
            disabled={isSuperAdmin}
            style={[
              styles.actionBtn,
              { backgroundColor: isDark ? (user.isActive ? '#1F0F0F' : '#0F1F0F') : (user.isActive ? colors.danger[50] : colors.success[50]) },
              isSuperAdmin && { opacity: 0.3 },
            ]}
          >
            <Text className={`font-inter text-[11px] font-bold ${user.isActive ? 'text-danger-700 dark:text-danger-400' : 'text-success-700 dark:text-success-400'}`}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={isSuperAdmin}
            style={[styles.actionBtn, { backgroundColor: isDark ? '#1F0F0F' : colors.danger[50] }, isSuperAdmin && { opacity: 0.3 }]}
          >
            <Text className="font-inter text-[11px] font-bold text-danger-700 dark:text-danger-400">Delete</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ FORM MODAL ============

function UserFormModal({ visible, editingId, form, companies, saving, onClose, onSave, onUpdate }: {
  visible: boolean;
  editingId: string | null;
  form: UserFormState;
  companies: CompanyOption[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (key: keyof UserFormState, value: string) => void;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  const roleOptions: Array<{ value: string; label: string }> = [
    { value: 'USER', label: 'User' },
    { value: 'COMPANY_ADMIN', label: 'Company Admin' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, isDark && styles.modalContainerDark, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
          </Pressable>
          <Text className="font-inter text-base font-bold text-neutral-900 dark:text-white">
            {editingId ? 'Edit User' : 'Create User'}
          </Text>
          <Pressable onPress={onSave} disabled={saving} style={[styles.modalSaveBtn, saving && { opacity: 0.5 }]}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text className="font-inter text-sm font-bold text-white">
                {editingId ? 'Update' : 'Create'}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Name Row */}
          <View style={styles.formRow}>
            <View style={styles.formFieldHalf}>
              <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                First Name *
              </Text>
              <TextInput
                value={form.firstName}
                onChangeText={(v) => onUpdate('firstName', v)}
                placeholder="First name"
                placeholderTextColor={colors.neutral[400]}
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>
            <View style={styles.formFieldHalf}>
              <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Last Name *
              </Text>
              <TextInput
                value={form.lastName}
                onChangeText={(v) => onUpdate('lastName', v)}
                placeholder="Last name"
                placeholderTextColor={colors.neutral[400]}
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.formField}>
            <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Email *
            </Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => onUpdate('email', v)}
              placeholder="user@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.neutral[400]}
              style={[styles.input, isDark && styles.inputDark]}
            />
          </View>

          {/* Password (create only) */}
          {!editingId && (
            <View style={styles.formField}>
              <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Password *
              </Text>
              <TextInput
                value={form.password}
                onChangeText={(v) => onUpdate('password', v)}
                placeholder="Min 6 characters"
                secureTextEntry
                placeholderTextColor={colors.neutral[400]}
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>
          )}

          {/* Phone */}
          <View style={styles.formField}>
            <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Phone
            </Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => onUpdate('phone', v)}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              placeholderTextColor={colors.neutral[400]}
              style={[styles.input, isDark && styles.inputDark]}
            />
          </View>

          {/* Company Picker */}
          <View style={styles.formField}>
            <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Company *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {companies.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onUpdate('companyId', c.id)}
                  style={[
                    styles.chip,
                    form.companyId === c.id && styles.chipActive,
                    isDark && styles.chipDark,
                    form.companyId === c.id && isDark && styles.chipActiveDark,
                  ]}
                >
                  <Text
                    className={`font-inter text-xs font-semibold ${form.companyId === c.id ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Role Picker */}
          <View style={styles.formField}>
            <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Platform Role *
            </Text>
            <View style={styles.roleRow}>
              {roleOptions.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => onUpdate('role', r.value)}
                  style={[
                    styles.roleChip,
                    form.role === r.value && styles.roleChipActive,
                    isDark && styles.chipDark,
                    form.role === r.value && isDark && styles.chipActiveDark,
                  ]}
                >
                  <Text
                    className={`font-inter text-xs font-bold ${form.role === r.value ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============ PASSWORD RESET MODAL ============

function PasswordResetModal({ visible, user, onClose, onSave, saving }: {
  visible: boolean;
  user: PlatformUser | null;
  onClose: () => void;
  onSave: (password: string) => void;
  saving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = React.useState('');

  React.useEffect(() => { if (visible) setPassword(''); }, [visible]);

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, isDark && styles.modalContainerDark, { paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Text className="font-inter text-sm font-semibold text-neutral-500">Cancel</Text>
          </Pressable>
          <Text className="font-inter text-base font-bold text-neutral-900 dark:text-white">Reset Password</Text>
          <Pressable
            onPress={() => onSave(password)}
            disabled={saving || password.length < 6}
            style={[styles.modalSaveBtn, { backgroundColor: colors.warning[600] }, (saving || password.length < 6) && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text className="font-inter text-sm font-bold text-white">Reset</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.modalBody}>
          {/* Warning */}
          <View style={[styles.warningBanner, isDark && { backgroundColor: '#2E1F0F' }]}>
            <Text className="font-inter text-xs text-warning-700 dark:text-warning-400">
              Resetting password for{' '}
              <Text className="font-inter text-xs font-bold text-warning-700 dark:text-warning-400">
                {user.firstName} {user.lastName}
              </Text>
              {' '}({user.email}). This will also unlock the account if locked.
            </Text>
          </View>

          <View style={[styles.formField, { marginTop: 20 }]}>
            <Text className="font-inter text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              New Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              secureTextEntry
              placeholderTextColor={colors.neutral[400]}
              style={[styles.input, isDark && styles.inputDark]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ MAIN SCREEN ============

export function PlatformUserManagementScreen() {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(() => createStyles(isDark), [isDark]);

  // Filters
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('All');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('All');
  const [page, setPage] = React.useState(1);

  const filterChips = [
    { key: 'All', label: 'All' },
    { key: 'Active', label: 'Active' },
    { key: 'Inactive', label: 'Inactive' },
  ];

  // Queries
  const { data: statsResponse } = usePlatformUserStats();
  const stats = (statsResponse as any)?.data;

  const { data: companiesResponse } = usePlatformCompanies();
  const companies: CompanyOption[] = (companiesResponse as any)?.data ?? [];

  const params = React.useMemo(() => ({
    page,
    limit: 25,
    search: search || undefined,
    role: roleFilter === 'All' ? undefined : roleFilter,
    isActive: statusFilter === 'All' ? undefined : statusFilter === 'Active',
  }), [page, search, roleFilter, statusFilter]);

  const { data: usersResponse, isLoading, error, refetch, isFetching } = usePlatformUsers(params);
  const users: PlatformUser[] = (usersResponse as any)?.data ?? [];
  const meta = (usersResponse as any)?.meta;
  const hasNextPage = meta ? page < meta.totalPages : false;
  const isFetchingNextPage = isFetching && page > 1;

  // Accumulate pages
  const [allUsers, setAllUsers] = React.useState<PlatformUser[]>([]);
  React.useEffect(() => {
    if (users.length > 0) {
      setAllUsers(prev => page === 1 ? users : [...prev, ...users]);
    } else if (page === 1) {
      setAllUsers([]);
    }
  }, [users, page]);

  // Mutations
  const createMutation = useCreatePlatformUser();
  const updateMutation = useUpdatePlatformUser();
  const passwordMutation = useResetPlatformUserPassword();
  const statusMutation = useUpdatePlatformUserStatus();
  const deleteMutation = useDeletePlatformUser();
  const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

  // Modal state
  const [formModalVisible, setFormModalVisible] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<UserFormState>({ ...EMPTY_FORM });
  const [passwordTarget, setPasswordTarget] = React.useState<PlatformUser | null>(null);

  const updateField = (key: keyof UserFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Handlers
  const handleCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormModalVisible(true);
  };

  const handleEdit = (user: PlatformUser) => {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      password: '',
      phone: user.phone ?? '',
      companyId: user.companyId ?? '',
      role: user.role ?? 'USER',
    });
    setFormModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) { showErrorMessage('First name is required.'); return; }
    if (!form.lastName.trim()) { showErrorMessage('Last name is required.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { showErrorMessage('Valid email is required.'); return; }
    if (!editingId && form.password.length < 6) { showErrorMessage('Password must be at least 6 characters.'); return; }
    if (!form.companyId) { showErrorMessage('Company is required.'); return; }

    try {
      if (editingId) {
        const { password: _pw, ...updateData } = form;
        await updateMutation.mutateAsync({ id: editingId, data: updateData });
        showSuccess('User Updated', `${form.firstName} ${form.lastName} updated.`);
      } else {
        await createMutation.mutateAsync(form);
        showSuccess('User Created', `${form.firstName} ${form.lastName} added.`);
      }
      setFormModalVisible(false);
      setPage(1);
      setAllUsers([]);
    } catch (e: any) {
      showError(e);
    }
  };

  const handlePasswordReset = async (password: string) => {
    if (!passwordTarget) return;
    if (password.length < 6) { showErrorMessage('Password must be at least 6 characters.'); return; }
    try {
      await passwordMutation.mutateAsync({ id: passwordTarget.id, password });
      showSuccess('Password Reset', `Password for ${passwordTarget.firstName} reset.`);
      setPasswordTarget(null);
    } catch (e: any) { showError(e); }
  };

  const handleToggleStatus = (user: PlatformUser) => {
    const action = user.isActive ? 'Deactivate' : 'Activate';
    showConfirm({
      title: `${action} User`,
      message: `Are you sure you want to ${action.toLowerCase()} ${user.firstName} ${user.lastName}?`,
      confirmText: action,
      variant: user.isActive ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          await statusMutation.mutateAsync({ id: user.id, isActive: !user.isActive });
          showSuccess('Status Updated', `${user.firstName} is now ${!user.isActive ? 'active' : 'inactive'}.`);
          setPage(1);
          setAllUsers([]);
        } catch (e: any) { showError(e); }
      },
    });
  };

  const handleDelete = (user: PlatformUser) => {
    showConfirm({
      title: 'Delete User Permanently',
      message: `This will permanently delete ${user.firstName} ${user.lastName} (${user.email}). This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(user.id);
          showSuccess('User Deleted', `${user.firstName} ${user.lastName} permanently deleted.`);
          setPage(1);
          setAllUsers([]);
        } catch (e: any) { showError(e); }
      },
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  // Render
  const renderUser = ({ item, index }: { item: PlatformUser; index: number }) => (
    <UserCard
      user={item}
      index={index}
      onEdit={() => handleEdit(item)}
      onResetPassword={() => setPasswordTarget(item)}
      onToggleStatus={() => handleToggleStatus(item)}
      onDelete={() => handleDelete(item)}
    />
  );

  const renderHeader = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
        <Text className="text-2xl font-inter font-extrabold text-neutral-900 dark:text-white tracking-tight">
          User Management
        </Text>
        <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400">
          Manage all platform users across companies
        </Text>
      </Animated.View>

      {/* Stats */}
      {stats && (
        <View style={s.statsRow}>
          <StatCard label="Total" value={stats.total} color={colors.primary[500]} index={0} />
          <StatCard label="Active" value={stats.active} color={colors.success[500]} index={1} />
          <StatCard label="Inactive" value={stats.inactive} color={colors.neutral[400]} index={2} />
          <StatCard label="Companies" value={stats.companies} color={colors.accent[500]} index={3} />
        </View>
      )}

      {/* Search + Filters */}
      <Animated.View entering={FadeIn.duration(400).delay(150)} style={s.searchSection}>
        <SearchBar
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); setAllUsers([]); }}
          placeholder="Search users by name or email..."
          filters={filterChips}
          activeFilter={statusFilter}
          onFilterChange={(f) => { setStatusFilter(f as StatusFilter); setPage(1); setAllUsers([]); }}
        />
      </Animated.View>

      {/* Role filter chips */}
      <View style={s.roleFilterRow}>
        {(['All', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'USER'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => { setRoleFilter(r); setPage(1); setAllUsers([]); }}
            style={[
              styles.roleFilterChip,
              roleFilter === r && styles.roleFilterChipActive,
              isDark && styles.chipDark,
              roleFilter === r && isDark && styles.chipActiveDark,
            ]}
          >
            <Text
              className={`font-inter text-xs font-semibold ${roleFilter === r ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
            >
              {r === 'All' ? 'All Roles' : ROLE_LABELS[r]}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={{ paddingTop: 24, alignItems: 'center' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <EmptyState
            icon="error"
            title="Failed to load users"
            message="Check your connection and try again."
            action={{ label: 'Retry', onPress: () => refetch() }}
          />
        </View>
      );
    }
    return (
      <View style={{ paddingTop: 80, alignItems: 'center' }}>
        <EmptyState icon="search" title="No users found" message="Try adjusting your search or filters." />
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? ['#0F0D1A', '#0F0D1A', '#0F0D1A'] : [colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <FlashList
        data={allUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text className="font-inter text-xs text-neutral-400 ml-2">Loading more...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (hasNextPage && !isFetching) {
            setPage(prev => prev + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading && !isFetchingNextPage}
            onRefresh={() => { setPage(1); setAllUsers([]); refetch(); }}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      />

      <FAB onPress={handleCreate} />

      {/* Modals */}
      <UserFormModal
        visible={formModalVisible}
        editingId={editingId}
        form={form}
        companies={companies}
        saving={saving}
        onClose={() => setFormModalVisible(false)}
        onSave={handleSave}
        onUpdate={updateField}
      />

      <PasswordResetModal
        visible={!!passwordTarget}
        user={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSave={handlePasswordReset}
        saving={passwordMutation.isPending}
      />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  userCardDark: {
    backgroundColor: '#1A1730',
    borderColor: colors.primary[900],
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  roleBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  roleFilterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chipDark: {
    backgroundColor: '#1A1730',
    borderColor: colors.primary[900],
  },
  chipActiveDark: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chipScroll: {
    flexDirection: 'row',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContainerDark: {
    backgroundColor: '#0F0D1A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formField: {
    marginBottom: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.neutral[900],
  },
  inputDark: {
    backgroundColor: '#1A1730',
    borderColor: colors.primary[900],
    color: '#FFFFFF',
  },
  warningBanner: {
    backgroundColor: colors.warning[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    searchSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    roleFilterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 24,
      paddingBottom: 12,
    },
    listContent: {
      paddingHorizontal: 24,
    },
  });
