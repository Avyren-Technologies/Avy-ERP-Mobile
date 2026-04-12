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
    Switch,
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
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useCreateUser,
    useUpdateUser,
    useUpdateUserStatus,
} from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyUsers, useRbacRoles } from '@/features/company-admin/api/use-company-admin-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface UserData {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    role?: string;
    roleName?: string;
    roleId?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt?: string;
}

interface RoleOption {
    id: string;
    name: string;
}

// ============ HELPERS ============

function getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatLastLogin(dateStr: string | undefined, fmtDate: (iso: string) => string): string {
    if (!dateStr) return 'Never';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return fmtDate(dateStr);
}

function mapApiUser(item: any): UserData {
    // Backend returns firstName + lastName separately; prefer those over fullName
    const fullName =
        (item.firstName || item.lastName)
            ? [item.firstName, item.lastName].filter(Boolean).join(' ')
            : (item.fullName ?? item.name ?? '');
    return {
        id: item.id ?? '',
        fullName,
        email: item.email ?? '',
        phone: item.phone ?? item.mobile ?? '',
        role: item.roleName ?? item.role ?? '',
        roleName: item.roleName ?? item.role ?? '',
        roleId: item.roleId ?? item.role?.id ?? '',
        isActive: item.isActive ?? (item.status ? item.status === 'active' : true),
        lastLogin: item.lastLogin ?? item.lastLoginAt ?? undefined,
        createdAt: item.createdAt ?? undefined,
    };
}

// ============ USER CARD ============

function UserCard({
    user,
    index,
    onEdit,
    onToggleStatus,
}: {
    user: UserData;
    index: number;
    onEdit: (user: UserData) => void;
    onToggleStatus: (user: UserData) => void;
}) {
    const fmt = useCompanyFormatter();
    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <View style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <LinearGradient
                            colors={
                                user.isActive
                                    ? ([colors.primary[500], colors.accent[500]] as const)
                                    : ([colors.neutral[400], colors.neutral[500]] as const)
                            }
                            style={styles.avatar}
                        >
                            <Text className="font-inter text-sm font-bold text-white">
                                {getInitials(user.fullName)}
                            </Text>
                        </LinearGradient>

                        <View style={styles.userNameContainer}>
                            <Text
                                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                numberOfLines={1}
                            >
                                {user.fullName}
                            </Text>
                            <Text
                                className="font-inter text-xs text-neutral-500 dark:text-neutral-400"
                                numberOfLines={1}
                            >
                                {user.email}
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                        <Pressable
                            onPress={() => onEdit(user)}
                            style={styles.actionBtn}
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
                        <Switch
                            value={user.isActive}
                            onValueChange={() => onToggleStatus(user)}
                            trackColor={{ false: colors.neutral[200], true: colors.success[400] }}
                            thumbColor={user.isActive ? colors.success[600] : colors.neutral[300]}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>
                </View>

                {/* Details Row */}
                <View style={styles.detailsRow}>
                    {user.roleName ? (
                        <View style={styles.roleBadge}>
                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                {user.roleName}
                            </Text>
                        </View>
                    ) : null}

                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor: user.isActive
                                    ? colors.success[50]
                                    : colors.neutral[100],
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                {
                                    backgroundColor: user.isActive
                                        ? colors.success[500]
                                        : colors.neutral[400],
                                },
                            ]}
                        />
                        <Text
                            className={`font-inter text-[10px] font-bold ${user.isActive ? 'text-success-700' : 'text-neutral-500 dark:text-neutral-400'}`}
                        >
                            {user.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>

                    <View style={styles.lastLoginContainer}>
                        <Svg width={10} height={10} viewBox="0 0 24 24">
                            <Circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                            />
                            <Path
                                d="M12 6v6l4 2"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </Svg>
                        <Text className="font-inter text-[10px] text-neutral-400">
                            {formatLastLogin(user.lastLogin, fmt.date)}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ ADD/EDIT BOTTOM SHEET ============

function UserFormSheet({
    visible,
    onClose,
    user,
    roles,
    rolesLoading,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    user?: UserData | null;
    roles: RoleOption[];
    rolesLoading: boolean;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isEdit = !!user;

    const [fullName, setFullName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [roleId, setRoleId] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [passwordVisible, setPasswordVisible] = React.useState(false);
    const [isActive, setIsActive] = React.useState(true);
    const [showRoleDropdown, setShowRoleDropdown] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    // Populate all fields when form opens, always reset password for security
    React.useEffect(() => {
        if (visible) {
            if (user) {
                setFullName(user.fullName ?? '');
                setEmail(user.email ?? '');
                setPhone(user.phone ?? '');
                setRoleId(user.roleId ?? '');
                setIsActive(user.isActive ?? true);
            } else {
                setFullName('');
                setEmail('');
                setPhone('');
                setRoleId('');
                setIsActive(true);
            }
            // Always reset these regardless of add/edit
            setPassword('');
            setPasswordVisible(false);
            setErrors({});
            setShowRoleDropdown(false);
        }
    }, [visible, user]);

    const selectedRole = roles.find((r) => r.id === roleId);

    // Clear a specific field error as soon as the user edits that field
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
        if (!fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]{2,}$/.test(email.trim()))
            newErrors.email = 'Invalid email address';
        if (!isEdit && !password.trim()) newErrors.password = 'Password is required';
        if (password) {
            if (password.length < 8)
                newErrors.password = 'Minimum 8 characters required';
            else if (!/[A-Z]/.test(password))
                newErrors.password = 'Must include at least one uppercase letter';
            else if (!/[a-z]/.test(password))
                newErrors.password = 'Must include at least one lowercase letter';
            else if (!/\d/.test(password))
                newErrors.password = 'Must include at least one number';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const data: Record<string, unknown> = {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            roleId: roleId || undefined,
            isActive,
        };
        if (password.trim()) data.password = password.trim();
        onSubmit(data);
    };

    return (
        <RNModal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[sheetStyles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={sheetStyles.header}>
                    <Pressable onPress={onClose}>
                        <Text className="font-inter text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                            Cancel
                        </Text>
                    </Pressable>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">
                        {isEdit ? 'Edit User' : 'Add User'}
                    </Text>
                    <View style={{ width: 52 }} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[
                        sheetStyles.formContent,
                        { paddingBottom: insets.bottom + 100 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Full Name */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Full Name <Text className="text-danger-500">*</Text>
                        </Text>
                        <TextInput
                            style={[
                                sheetStyles.input,
                                errors.fullName ? sheetStyles.inputError : undefined,
                            ]}
                            placeholder="Enter full name"
                            placeholderTextColor={colors.neutral[400]}
                            value={fullName}
                            onChangeText={(v) => { setFullName(v); clearError('fullName'); }}
                            autoCapitalize="words"
                        />
                        {errors.fullName ? (
                            <Text className="mt-1 font-inter text-[10px] text-danger-600">
                                {errors.fullName}
                            </Text>
                        ) : null}
                    </View>

                    {/* Email */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Email <Text className="text-danger-500">*</Text>
                        </Text>
                        <TextInput
                            style={[
                                sheetStyles.input,
                                errors.email ? sheetStyles.inputError : undefined,
                            ]}
                            placeholder="user@company.com"
                            placeholderTextColor={colors.neutral[400]}
                            value={email}
                            onChangeText={(v) => { setEmail(v); clearError('email'); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isEdit}
                        />
                        {errors.email ? (
                            <Text className="mt-1 font-inter text-[10px] text-danger-600">
                                {errors.email}
                            </Text>
                        ) : null}
                        {isEdit ? (
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                Email cannot be changed after account creation
                            </Text>
                        ) : null}
                    </View>

                    {/* Phone */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Phone
                        </Text>
                        <TextInput
                            style={sheetStyles.input}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={colors.neutral[400]}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Role Dropdown */}
                    <View style={[sheetStyles.field, { zIndex: 100 }]}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Role
                        </Text>
                        <Pressable
                            onPress={() => setShowRoleDropdown((v) => !v)}
                            style={[
                                sheetStyles.input,
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                },
                                showRoleDropdown && { borderColor: colors.primary[400] },
                            ]}
                        >
                            <Text
                                className={`font-inter text-sm ${selectedRole ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`}
                            >
                                {rolesLoading
                                    ? 'Loading roles...'
                                    : selectedRole?.name ?? 'Select role'}
                            </Text>
                            <Svg width={14} height={14} viewBox="0 0 24 24">
                                <Path
                                    d={showRoleDropdown ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                    stroke={colors.neutral[400]}
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        </Pressable>

                        {showRoleDropdown && (
                            <View style={sheetStyles.dropdown}>
                                <ScrollView
                                    nestedScrollEnabled
                                    style={{ maxHeight: 200 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {roles.map((role, idx) => {
                                        const isSelected = role.id === roleId;
                                        return (
                                            <Pressable
                                                key={role.id}
                                                onPress={() => {
                                                    setRoleId(role.id);
                                                    setShowRoleDropdown(false);
                                                }}
                                                style={[
                                                    sheetStyles.dropdownItem,
                                                    isSelected && {
                                                        backgroundColor: colors.primary[50],
                                                    },
                                                    idx > 0 && {
                                                        borderTopWidth: 1,
                                                        borderTopColor: colors.neutral[100],
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    className={`flex-1 font-inter text-sm ${isSelected ? 'font-semibold text-primary-700' : 'text-primary-950 dark:text-white'}`}
                                                >
                                                    {role.name}
                                                </Text>
                                                {isSelected && (
                                                    <Svg width={15} height={15} viewBox="0 0 24 24">
                                                        <Path
                                                            d="M5 12l5 5L20 7"
                                                            stroke={colors.primary[600]}
                                                            strokeWidth="2.5"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </Svg>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Password */}
                    <View style={sheetStyles.field}>
                        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                            Password{' '}
                            {!isEdit && <Text className="text-danger-500">*</Text>}
                        </Text>
                        <View
                            style={[
                                sheetStyles.input,
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingRight: 4,
                                },
                                errors.password ? sheetStyles.inputError : undefined,
                            ]}
                        >
                            <TextInput
                                style={[sheetStyles.textInner, { flex: 1 }]}
                                placeholder={isEdit ? 'Leave blank to keep current' : 'Set password'}
                                placeholderTextColor={colors.neutral[400]}
                                value={password}
                                onChangeText={(v) => { setPassword(v); clearError('password'); }}
                                secureTextEntry={!passwordVisible}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Pressable
                                onPress={() => setPasswordVisible((v) => !v)}
                                style={{ padding: 8 }}
                            >
                                <Svg width={18} height={18} viewBox="0 0 24 24">
                                    {passwordVisible ? (
                                        <Path
                                            d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                                            stroke={colors.neutral[400]}
                                            strokeWidth="1.8"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    ) : (
                                        <Path
                                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"
                                            stroke={colors.neutral[400]}
                                            strokeWidth="1.8"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    )}
                                </Svg>
                            </Pressable>
                        </View>
                        {errors.password ? (
                            <Text className="mt-1 font-inter text-[10px] text-danger-600">
                                {errors.password}
                            </Text>
                        ) : isEdit ? (
                            <Text className="mt-1 font-inter text-[10px] text-neutral-400">
                                Leave blank to keep the current password
                            </Text>
                        ) : null}
                    </View>

                    {/* Status Toggle */}
                    <View style={sheetStyles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                {isActive ? 'Active' : 'Inactive'}
                            </Text>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                {isActive
                                    ? 'User can log in and access the system'
                                    : 'User is disabled and cannot log in'}
                            </Text>
                        </View>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{
                                false: colors.neutral[200],
                                true: colors.primary[400],
                            }}
                            thumbColor={isActive ? colors.primary[600] : colors.neutral[300]}
                        />
                    </View>
                </ScrollView>

                {/* Submit Button */}
                <View
                    style={[sheetStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}
                >
                    <Pressable
                        style={({ pressed }) => [
                            sheetStyles.submitBtn,
                            pressed && { opacity: 0.85 },
                            isSubmitting && { opacity: 0.6 },
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-inter text-base font-bold text-white">
                                {isEdit ? 'Update User' : 'Create User'}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </RNModal>
    );
}

// ============ MAIN COMPONENT ============

export function UserManagementScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [sheetVisible, setSheetVisible] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState<UserData | null>(null);

    const confirmModal = useConfirmModal();

    // Fetch roles for the dropdown
    const { data: rolesRaw, isLoading: rolesLoading } = useRbacRoles();
    const roles: RoleOption[] = React.useMemo(() => {
        const data = (rolesRaw as any)?.data ?? rolesRaw ?? [];
        const list = Array.isArray(data) ? data : [];
        return list.map((r: any) => ({
            id: r.id ?? '',
            name: r.name ?? '',
        }));
    }, [rolesRaw]);

    // Fetch users
    const statusParam =
        activeFilter === 'active'
            ? 'active'
            : activeFilter === 'inactive'
              ? 'inactive'
              : undefined;
    const {
        data: response,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useCompanyUsers({
        search: search.trim() || undefined,
        status: statusParam,
    });

    const users: UserData[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(mapApiUser);
    }, [response]);

    const totalCount = (response as any)?.meta?.total ?? users.length;

    const filterChips = React.useMemo(
        () => [
            { key: 'all', label: 'All', count: totalCount },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
        ],
        [totalCount]
    );

    // Mutations
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const updateUserStatus = useUpdateUserStatus();

    const handleAdd = () => {
        setEditingUser(null);
        setSheetVisible(true);
    };

    const handleEdit = (user: UserData) => {
        setEditingUser(user);
        setSheetVisible(true);
    };

    const handleToggleStatus = (user: UserData) => {
        const newStatus = !user.isActive;
        confirmModal.show({
            title: newStatus ? 'Activate User' : 'Deactivate User',
            message: newStatus
                ? `Are you sure you want to activate ${user.fullName}? They will be able to log in.`
                : `Are you sure you want to deactivate ${user.fullName}? They will lose access.`,
            confirmText: newStatus ? 'Activate' : 'Deactivate',
            variant: newStatus ? 'primary' : 'warning',
            onConfirm: () => {
                updateUserStatus.mutate(
                    { id: user.id, data: { isActive: newStatus } },
                    { onSuccess: () => refetch() }
                );
            },
        });
    };

    const handleSubmit = (data: Record<string, unknown>) => {
        // Split fullName into firstName + lastName for backend
        const fullName = (data.fullName as string) ?? '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] ?? '';
        const lastName = nameParts.slice(1).join(' ') || firstName;
        const newIsActive = data.isActive as boolean;

        const payload: Record<string, unknown> = {
            ...data,
            firstName,
            lastName,
            // Pass roleId as 'role' for the backend validator
            role: data.roleId || undefined,
        };
        // Remove fields the backend doesn't expect
        delete payload.fullName;
        delete payload.roleId;
        // isActive is handled separately via updateUserStatus
        delete payload.isActive;

        if (editingUser) {
            updateUser.mutate(
                { id: editingUser.id, data: payload },
                {
                    onSuccess: () => {
                        // If isActive changed, update status separately
                        if (newIsActive !== editingUser.isActive) {
                            updateUserStatus.mutate(
                                { id: editingUser.id, data: { isActive: newIsActive } },
                                {
                                    onSuccess: () => {
                                        setSheetVisible(false);
                                        refetch();
                                    },
                                }
                            );
                        } else {
                            setSheetVisible(false);
                            refetch();
                        }
                    },
                }
            );
        } else {
            createUser.mutate(payload, {
                onSuccess: () => {
                    setSheetVisible(false);
                    refetch();
                },
            });
        }
    };

    const renderUser = ({ item, index }: { item: UserData; index: number }) => (
        <UserCard
            user={item}
            index={index}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Users"
                    subtitle={`${totalCount} user${totalCount !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name or email..."
                    filters={filterChips}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
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
                        title="Failed to load users"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="search"
                title="No users found"
                message="Try adjusting your search or filters."
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
                data={users}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
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

            <UserFormSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                user={editingUser}
                roles={roles}
                rolesLoading={rolesLoading}
                onSubmit={handleSubmit}
                isSubmitting={createUser.isPending || updateUser.isPending || updateUserStatus.isPending}
            />

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
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
    card: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    userNameContainer: {
        flex: 1,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 8,
        flexWrap: 'wrap',
    },
    roleBadge: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
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
    lastLoginContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 'auto',
    },
});
const styles = createStyles(false);

const sheetStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    formContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    field: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.primary[950],
    },
    inputError: {
        borderColor: colors.danger[400],
        borderWidth: 1.5,
    },
    textInner: {
        fontSize: 14,
        color: colors.primary[950],
        padding: 0,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 200,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    submitContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        backgroundColor: colors.white,
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
