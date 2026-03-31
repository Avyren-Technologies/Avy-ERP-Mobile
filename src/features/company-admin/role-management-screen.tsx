/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/fab';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useCreateRole,
    useDeleteRole,
    useUpdateRole,
} from '@/features/company-admin/api/use-company-admin-mutations';
import {
    usePermissionCatalogue,
    useRbacReferenceRoles,
    useRbacRoles,
} from '@/features/company-admin/api/use-company-admin-queries';

// ============ TYPES ============

interface RoleData {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: string[];
    userCount: number;
}

interface ReferenceRole {
    id: string;
    name: string;
    description: string;
    permissions: string[];
}

interface PermissionModule {
    module: string;
    label: string;
    actions: string[];
}

interface PermissionCatalogueResponse {
    permissions: string[];
    modules: PermissionModule[];
}

// ============ HELPERS ============

function mapApiRole(item: any): RoleData {
    return {
        id: item.id ?? '',
        name: item.name ?? '',
        description: item.description ?? '',
        isSystem: item.isSystem ?? item.system ?? false,
        permissions: item.permissions ?? [],
        userCount: item._count?.users ?? item.userCount ?? 0,
    };
}

function mapReferenceRole(item: any): ReferenceRole {
    return {
        id: item.id ?? '',
        name: item.name ?? '',
        description: item.description ?? '',
        permissions: item.permissions ?? [],
    };
}

// ============ ROLE CARD ============

function RoleCard({
    role,
    index,
    onEdit,
    onDelete,
}: {
    role: RoleData;
    index: number;
    onEdit: (role: RoleData) => void;
    onDelete: (role: RoleData) => void;
}) {
    const permissionCount = role.permissions.length;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <View style={[styles.card, role.isSystem && styles.cardSystem]}>
                <View style={styles.cardHeader}>
                    <View style={styles.roleInfo}>
                        <View style={styles.roleNameRow}>
                            <Text
                                className="font-inter text-sm font-bold text-primary-950"
                                numberOfLines={1}
                                style={{ flex: 1 }}
                            >
                                {role.name}
                            </Text>
                            {role.isSystem && (
                                <View style={styles.systemBadge}>
                                    <Svg width={10} height={10} viewBox="0 0 24 24">
                                        <Rect
                                            x="3"
                                            y="11"
                                            width="18"
                                            height="11"
                                            rx="2"
                                            ry="2"
                                            stroke={colors.neutral[500]}
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                        <Path
                                            d="M7 11V7a5 5 0 0110 0v4"
                                            stroke={colors.neutral[500]}
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                    </Svg>
                                    <Text className="font-inter text-[9px] font-bold text-neutral-500">
                                        System
                                    </Text>
                                </View>
                            )}
                        </View>
                        {role.description ? (
                            <Text
                                className="mt-1 font-inter text-xs text-neutral-500"
                                numberOfLines={2}
                            >
                                {role.description}
                            </Text>
                        ) : null}
                    </View>

                    {/* Actions (only for custom roles) */}
                    {!role.isSystem && (
                        <View style={styles.cardActions}>
                            <Pressable
                                onPress={() => onEdit(role)}
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
                            <Pressable
                                onPress={() => onDelete(role)}
                                style={[styles.actionBtn, { backgroundColor: colors.danger[50] }]}
                                hitSlop={8}
                            >
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path
                                        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                        stroke={colors.danger[500]}
                                        strokeWidth="1.8"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                            <Path
                                d="M9 12l2 2 4-4m6 2a10 10 0 11-20 0 10 10 0 0120 0z"
                                stroke={colors.primary[500]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text className="font-inter text-[11px] font-semibold text-neutral-600">
                            {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <Svg width={12} height={12} viewBox="0 0 24 24">
                            <Path
                                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <Circle
                                cx="9"
                                cy="7"
                                r="4"
                                stroke={colors.neutral[400]}
                                strokeWidth="2"
                                fill="none"
                            />
                        </Svg>
                        <Text className="font-inter text-[11px] font-semibold text-neutral-600">
                            {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ ROLE FORM (Full Screen) ============

function RoleFormScreen({
    visible,
    onClose,
    role,
    onSubmit,
    isSubmitting,
}: {
    visible: boolean;
    onClose: () => void;
    role?: RoleData | null;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isEdit = !!role;

    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [permissions, setPermissions] = React.useState<string[]>([]);
    const [expandedModules, setExpandedModules] = React.useState<string[]>([]);
    const [showTemplates, setShowTemplates] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const {
        data: refRolesRaw,
        isLoading: refRolesLoading,
    } = useRbacReferenceRoles();

    // Fetch permission catalogue from API
    const { data: catalogueRaw, isLoading: catalogueLoading } = usePermissionCatalogue();

    const permissionModules: PermissionModule[] = React.useMemo(() => {
        const raw = (catalogueRaw as any)?.data ?? catalogueRaw;
        const catalogue = raw as PermissionCatalogueResponse | undefined;
        if (!catalogue?.modules || !Array.isArray(catalogue.modules)) return [];
        // Filter out 'platform' module (admin-only)
        return catalogue.modules.filter((m) => m.module !== 'platform');
    }, [catalogueRaw]);

    const referenceRoles: ReferenceRole[] = React.useMemo(() => {
        const data = (refRolesRaw as any)?.data ?? refRolesRaw ?? [];
        if (!Array.isArray(data)) return [];
        return data.map(mapReferenceRole);
    }, [refRolesRaw]);

    React.useEffect(() => {
        if (visible) {
            if (role) {
                setName(role.name);
                setDescription(role.description || '');
                setPermissions([...role.permissions]);
            } else {
                setName('');
                setDescription('');
                setPermissions([]);
            }
            setExpandedModules([]);
            setShowTemplates(false);
            setErrors({});
        }
    }, [visible, role]);

    const togglePermission = (perm: string) => {
        setPermissions((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
        );
    };

    const toggleModule = (moduleKey: string) => {
        setExpandedModules((prev) =>
            prev.includes(moduleKey)
                ? prev.filter((m) => m !== moduleKey)
                : [...prev, moduleKey]
        );
    };

    const toggleAllModulePerms = (moduleKey: string) => {
        const mod = permissionModules.find((m) => m.module === moduleKey);
        if (!mod) return;
        const modulePerms = mod.actions.map((a) => `${moduleKey}:${a}`);
        const allSelected = modulePerms.every((p) => permissions.includes(p));
        if (allSelected) {
            setPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
        } else {
            setPermissions((prev) => [
                ...prev.filter((p) => !modulePerms.includes(p)),
                ...modulePerms,
            ]);
        }
    };

    const applyTemplate = (template: ReferenceRole) => {
        setPermissions([...template.permissions]);
        setShowTemplates(false);
    };

    const getModulePermCount = (moduleKey: string): number => {
        return permissions.filter((p) => p.startsWith(`${moduleKey}:`)).length;
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Role name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit({
            name: name.trim(),
            description: description.trim(),
            permissions,
        });
    };

    if (!visible) return null;

    return (
        <View style={[formStyles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(300)} style={formStyles.header}>
                <Pressable onPress={onClose} style={formStyles.backBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                            d="M19 12H5M12 19l-7-7 7-7"
                            stroke={colors.primary[600]}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>
                <Text className="flex-1 font-inter text-lg font-bold text-primary-950">
                    {isEdit ? 'Edit Role' : 'Create Role'}
                </Text>
            </Animated.View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    formStyles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Role Name */}
                <View style={formStyles.field}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                        Role Name <Text className="text-danger-500">*</Text>
                    </Text>
                    <TextInput
                        style={[
                            formStyles.input,
                            errors.name && { borderColor: colors.danger[400], borderWidth: 1.5 },
                        ]}
                        placeholder="e.g. HR Manager"
                        placeholderTextColor={colors.neutral[400]}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
                    {errors.name && (
                        <Text className="mt-1 font-inter text-[10px] text-danger-600">
                            {errors.name}
                        </Text>
                    )}
                </View>

                {/* Description */}
                <View style={formStyles.field}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                        Description
                    </Text>
                    <TextInput
                        style={[formStyles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Describe the role's purpose..."
                        placeholderTextColor={colors.neutral[400]}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>

                {/* Template Button */}
                <Pressable
                    onPress={() => setShowTemplates((v) => !v)}
                    style={formStyles.templateBtn}
                >
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path
                            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                            stroke={colors.primary[500]}
                            strokeWidth="1.8"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <Path
                            d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                            stroke={colors.primary[500]}
                            strokeWidth="1.8"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    <Text className="font-inter text-sm font-semibold text-primary-600">
                        Start from Template
                    </Text>
                </Pressable>

                {/* Templates List */}
                {showTemplates && (
                    <Animated.View entering={FadeIn.duration(200)} style={formStyles.templateList}>
                        {refRolesLoading ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator color={colors.primary[500]} />
                            </View>
                        ) : referenceRoles.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text className="font-inter text-xs text-neutral-400">
                                    No templates available
                                </Text>
                            </View>
                        ) : (
                            referenceRoles.map((tpl, idx) => (
                                <Pressable
                                    key={tpl.id}
                                    onPress={() => applyTemplate(tpl)}
                                    style={[
                                        formStyles.templateItem,
                                        idx > 0 && {
                                            borderTopWidth: 1,
                                            borderTopColor: colors.neutral[100],
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">
                                            {tpl.name}
                                        </Text>
                                        {tpl.description ? (
                                            <Text className="font-inter text-xs text-neutral-500">
                                                {tpl.description}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Text className="font-inter text-[10px] font-semibold text-primary-500">
                                        {tpl.permissions.length} perms
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </Animated.View>
                )}

                {/* Permission Matrix */}
                <View style={formStyles.permSection}>
                    <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Permissions
                    </Text>

                    {catalogueLoading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator color={colors.primary[500]} />
                            <Text className="mt-2 font-inter text-xs text-neutral-400">
                                Loading permissions...
                            </Text>
                        </View>
                    ) : permissionModules.map((mod) => {
                        const isExpanded = expandedModules.includes(mod.module);
                        const permCount = getModulePermCount(mod.module);
                        const modulePerms = mod.actions.map((a) => `${mod.module}:${a}`);
                        const allSelected = modulePerms.every((p) => permissions.includes(p));

                        return (
                            <View key={mod.module} style={formStyles.moduleCard}>
                                <Pressable
                                    onPress={() => toggleModule(mod.module)}
                                    style={formStyles.moduleHeader}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950">
                                            {mod.label}
                                        </Text>
                                        {permCount > 0 && (
                                            <View style={formStyles.permCountBadge}>
                                                <Text className="font-inter text-[9px] font-bold text-primary-700">
                                                    {permCount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Svg width={14} height={14} viewBox="0 0 24 24">
                                        <Path
                                            d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                            stroke={colors.neutral[400]}
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </Pressable>

                                {isExpanded && (
                                    <Animated.View entering={FadeIn.duration(150)} style={formStyles.moduleBody}>
                                        {/* Select all for this module */}
                                        <Pressable
                                            onPress={() => toggleAllModulePerms(mod.module)}
                                            style={formStyles.selectAllRow}
                                        >
                                            <View
                                                style={[
                                                    formStyles.checkbox,
                                                    allSelected && formStyles.checkboxActive,
                                                ]}
                                            >
                                                {allSelected && (
                                                    <Svg width={10} height={10} viewBox="0 0 24 24">
                                                        <Path
                                                            d="M5 12l5 5L20 7"
                                                            stroke="#fff"
                                                            strokeWidth="3"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </Svg>
                                                )}
                                            </View>
                                            <Text className="font-inter text-xs font-semibold text-neutral-500">
                                                Select All
                                            </Text>
                                        </Pressable>

                                        <View style={formStyles.permGrid}>
                                            {mod.actions.map((action) => {
                                                const perm = `${mod.module}:${action}`;
                                                const isSelected = permissions.includes(perm);
                                                return (
                                                    <Pressable
                                                        key={action}
                                                        onPress={() => togglePermission(perm)}
                                                        style={[
                                                            formStyles.permChip,
                                                            isSelected && formStyles.permChipActive,
                                                        ]}
                                                    >
                                                        <View
                                                            style={[
                                                                formStyles.checkbox,
                                                                formStyles.checkboxSmall,
                                                                isSelected && formStyles.checkboxActive,
                                                            ]}
                                                        >
                                                            {isSelected && (
                                                                <Svg width={8} height={8} viewBox="0 0 24 24">
                                                                    <Path
                                                                        d="M5 12l5 5L20 7"
                                                                        stroke="#fff"
                                                                        strokeWidth="3"
                                                                        fill="none"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                </Svg>
                                                            )}
                                                        </View>
                                                        <Text
                                                            className={`font-inter text-xs ${isSelected ? 'font-semibold text-primary-700' : 'text-neutral-600'}`}
                                                        >
                                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </Animated.View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Permission Summary */}
                <View style={formStyles.summaryCard}>
                    <Text className="font-inter text-xs font-bold text-neutral-400">
                        SUMMARY
                    </Text>
                    <Text className="mt-1 font-inter text-sm font-semibold text-primary-950">
                        {permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected
                    </Text>
                </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[formStyles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                    style={({ pressed }) => [
                        formStyles.submitBtn,
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
                            {isEdit ? 'Update Role' : 'Create Role'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function RoleManagementScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const [showForm, setShowForm] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState<RoleData | null>(null);

    const confirmModal = useConfirmModal();

    const { data: response, isLoading, error, refetch, isFetching } = useRbacRoles();

    const roles: RoleData[] = React.useMemo(() => {
        const raw = (response as any)?.data ?? response ?? [];
        if (!Array.isArray(raw)) return [];
        return raw.map(mapApiRole);
    }, [response]);

    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const deleteRole = useDeleteRole();

    const handleAdd = () => {
        setEditingRole(null);
        setShowForm(true);
    };

    const handleEdit = (role: RoleData) => {
        setEditingRole(role);
        setShowForm(true);
    };

    const handleDelete = (role: RoleData) => {
        if (role.userCount > 0) {
            confirmModal.show({
                title: 'Cannot Delete Role',
                message: `This role is assigned to ${role.userCount} user${role.userCount > 1 ? 's' : ''}. Reassign them first.`,
                confirmText: 'OK',
                variant: 'warning',
                onConfirm: () => {},
            });
            return;
        }
        confirmModal.show({
            title: 'Delete Role',
            message: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                deleteRole.mutate(role.id, { onSuccess: () => refetch() });
            },
        });
    };

    const handleSubmit = (data: Record<string, unknown>) => {
        if (editingRole) {
            updateRole.mutate(
                { id: editingRole.id, data },
                {
                    onSuccess: () => {
                        setShowForm(false);
                        refetch();
                    },
                }
            );
        } else {
            createRole.mutate(data, {
                onSuccess: () => {
                    setShowForm(false);
                    refetch();
                },
            });
        }
    };

    const renderRole = ({ item, index }: { item: RoleData; index: number }) => (
        <RoleCard
            role={item}
            index={index}
            onEdit={handleEdit}
            onDelete={handleDelete}
        />
    );

    const renderHeader = () => (
        <>
            <Animated.View entering={FadeInDown.duration(400)}>
                <AppTopHeader
                    title="Roles"
                    subtitle={`${roles.length} role${roles.length !== 1 ? 's' : ''}`}
                    onMenuPress={toggle}
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={{ paddingTop: 24, paddingHorizontal: 24 }}>
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
                        title="Failed to load roles"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }
        return (
            <EmptyState
                icon="inbox"
                title="No roles found"
                message="Create your first custom role to get started."
            />
        );
    };

    if (showForm) {
        return (
            <RoleFormScreen
                visible={showForm}
                onClose={() => setShowForm(false)}
                role={editingRole}
                onSubmit={handleSubmit}
                isSubmitting={createRole.isPending || updateRole.isPending}
            />
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlatList
                data={roles}
                renderItem={renderRole}
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

            <ConfirmModal {...confirmModal.modalProps} />
        </View>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    listContent: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: colors.white,
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
    cardSystem: {
        opacity: 0.75,
        borderColor: colors.neutral[200],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    roleInfo: {
        flex: 1,
        marginRight: 8,
    },
    roleNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    systemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[100],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 3,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 6,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 14,
        backgroundColor: colors.neutral[200],
    },
});

const formStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gradient.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    field: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.primary[950],
    },
    templateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary[50],
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.primary[100],
        borderStyle: 'dashed',
    },
    templateList: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginBottom: 20,
        overflow: 'hidden',
    },
    templateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    permSection: {
        marginBottom: 20,
    },
    moduleCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginBottom: 8,
        overflow: 'hidden',
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    moduleBody: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingBottom: 6,
    },
    permGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    permChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.neutral[50],
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    permChipActive: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[200],
    },
    permCountBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.neutral[300],
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSmall: {
        width: 16,
        height: 16,
    },
    checkboxActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    summaryCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        marginBottom: 20,
    },
    submitContainer: {
        paddingHorizontal: 24,
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
