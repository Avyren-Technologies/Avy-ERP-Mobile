/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
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
import { useIsDark } from '@/hooks/use-is-dark';

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

interface SubModule {
    key: string;
    label: string;
    group: string;
    actions: string[];
}

interface PermissionModule {
    module: string;
    label: string;
    actions: string[];
    subModules?: SubModule[];
}

interface PermissionCatalogueResponse {
    permissions: string[];
    modules: PermissionModule[];
}

// ============ CONSTANTS ============

const IMPLEMENTED_MODULES = new Set([
    'hr', 'visitors', 'ess', 'attendance', 'user', 'role', 'company',
    'analytics', 'reports', 'audit', 'billing', 'docdiff',
]);

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

function isSubModuleActionEnabled(
  perms: string[],
  parentModule: string,
  subKey: string,
  action: string,
): boolean {
  if (perms.includes(`${subKey}:${action}`)) return true;
  if (perms.includes(`${parentModule}:${action}`)) return true;
  if (perms.includes(`${parentModule}:*`)) return true;
  return false;
}

function isInheritedFromParent(
  perms: string[],
  parentModule: string,
  action: string,
): boolean {
  return perms.includes(`${parentModule}:${action}`) || perms.includes(`${parentModule}:*`);
}

function groupSubModules(subModules: SubModule[]): Record<string, SubModule[]> {
  const groups: Record<string, SubModule[]> = {};
  for (const sub of subModules) {
    const group = sub.group || 'General';
    if (!groups[group]) groups[group] = [];
    groups[group].push(sub);
  }
  return groups;
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
                                className="font-inter text-sm font-bold text-primary-950 dark:text-white"
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
                                    <Text className="font-inter text-[9px] font-bold text-neutral-500 dark:text-neutral-400">
                                        System
                                    </Text>
                                </View>
                            )}
                        </View>
                        {role.description ? (
                            <Text
                                className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400"
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
                        <Text className="font-inter text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
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
                        <Text className="font-inter text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
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
    error,
    isDark,
}: {
    visible: boolean;
    onClose: () => void;
    role?: RoleData | null;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
    error?: string | null;
    isDark: boolean;
}) {
    const insets = useSafeAreaInsets();
    const isEdit = !!role;
    const fStyles = React.useMemo(() => createFormStyles(isDark), [isDark]);

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
        // API envelope: { success, data: { permissions, modules } }
        // After mobile interceptor (response.data): catalogueRaw = the envelope
        const raw = (catalogueRaw as any)?.data ?? catalogueRaw;
        const modules: any[] | undefined = raw?.modules;
        if (!modules || !Array.isArray(modules)) return [];

        return modules
          .filter((m: any) => IMPLEMENTED_MODULES.has(m.module))
          .map((m: any): PermissionModule => ({
            module: m.module,
            label: m.label,
            actions: Array.isArray(m.actions) ? m.actions : [],
            ...(Array.isArray(m.subModules) && m.subModules.length > 0
              ? { subModules: m.subModules }
              : {}),
          }));
    }, [catalogueRaw]);

    const referenceRoles: RoleData[] = React.useMemo(() => {
        const raw = (refRolesRaw as any)?.data ?? refRolesRaw;
        if (!raw) return [];
        
        // Handle array format
        if (Array.isArray(raw)) {
            return raw.map(mapApiRole);
        }
        
        // Handle object format { roleName: { permissions: [], description: '' } }
        if (typeof raw === 'object') {
            return Object.entries(raw).map(([name, value]: [string, any]) => ({
                id: name,
                name: name,
                description: value.description || '',
                permissions: Array.isArray(value.permissions) ? value.permissions : [],
                isSystem: true,
                userCount: 0,
            }));
        }
        
        return [];
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
            setExpandedSubGroups([]);
            setShowTemplates(false);
            setErrors({});
        }
    }, [visible, role]);

    // Auto-template logic: If typing a role that matches a reference role name, auto-apply it
    React.useEffect(() => {
        if (!visible || isEdit || !name || name.length < 2 || referenceRoles.length === 0) return;
        
        const timer = setTimeout(() => {
            const lowerName = name.toLowerCase();
            const match = referenceRoles.find(r => 
                r.name.toLowerCase() === lowerName || 
                (lowerName.includes('hr') && r.name.toLowerCase().includes('hr')) ||
                (lowerName.includes('plant') && r.name.toLowerCase().includes('plant')) ||
                (lowerName.includes('manager') && r.name.toLowerCase().includes('manager'))
            );
            
            // Only auto-apply if permissions are currently empty or only has 1-2 default ones
            // to avoid overwriting a user's intentional setup.
            if (match && (permissions.length === 0)) {
                setPermissions([...match.permissions]);
                if (!description) setDescription(match.description);
                // Also expand modules that now have permissions
                const modulesToExpand = new Set<string>();
                match.permissions.forEach(p => {
                    const [mod] = p.split(':');
                    if (mod) modulesToExpand.add(mod);
                });
                setExpandedModules(Array.from(modulesToExpand));
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [name, visible, isEdit, referenceRoles, description, permissions.length]);

    const togglePermission = (perm: string) => {
        setPermissions((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
        );
    };

    const toggleModule = (moduleKey: string) => {
        setExpandedModules((prev) => {
            const isCollapsing = prev.includes(moduleKey);
            if (isCollapsing) {
                // Collapse module and its sub-groups
                setExpandedSubGroups((sg) => sg.filter((g) => !g.startsWith(`${moduleKey}::`)));
                return prev.filter((m) => m !== moduleKey);
            }
            // Expand module and auto-expand all its sub-groups
            const mod = permissionModules.find((m) => m.module === moduleKey);
            if (mod?.subModules) {
                const groups = [...new Set(mod.subModules.map((s) => s.group || 'General'))];
                const groupKeys = groups.map((g) => `${moduleKey}::${g}`);
                setExpandedSubGroups((sg) => [...new Set([...sg, ...groupKeys])]);
            }
            return [...prev, moduleKey];
        });
    };

    const toggleAllModulePerms = (moduleKey: string) => {
        const mod = permissionModules.find((m) => m.module === moduleKey);
        if (!mod) return;
        const parentPerms = mod.actions.map((a) => `${moduleKey}:${a}`);
        const allParentSelected = parentPerms.every((p) => permissions.includes(p));
        if (allParentSelected) {
            // Remove parent-level perms and any sub-module perms
            const subKeys = (mod.subModules ?? []).map((s) => s.key);
            setPermissions((prev) =>
              prev.filter((p) => {
                if (parentPerms.includes(p)) return false;
                if (subKeys.some((sk) => p.startsWith(`${sk}:`))) return false;
                return true;
              })
            );
        } else {
            // Add parent shortcuts and clean up any orphaned sub-module permissions
            const subKeys = (mod.subModules ?? []).map((s) => s.key);
            setPermissions((prev) => [
                ...prev.filter((p) => {
                    if (parentPerms.includes(p)) return false;
                    if (subKeys.some((sk) => p.startsWith(`${sk}:`))) return false;
                    return true;
                }),
                ...parentPerms,
            ]);
        }
    };

    const applyTemplate = (template: ReferenceRole) => {
        setPermissions([...template.permissions]);
        setShowTemplates(false);
    };

    const getModulePermCount = (mod: PermissionModule): number => {
        let count = permissions.filter((p) => p.startsWith(`${mod.module}:`)).length;
        if (mod.subModules) {
            for (const sub of mod.subModules) {
                count += permissions.filter((p) => p.startsWith(`${sub.key}:`)).length;
            }
        }
        return count;
    };

    const toggleSubModuleAction = (parentModule: string, subKey: string, action: string, allSubModules: SubModule[]) => {
        const perm = `${subKey}:${action}`;
        const parentPerm = `${parentModule}:${action}`;

        // If inherited from parent shortcut, expand parent into individual sub-modules minus this one
        if (isInheritedFromParent(permissions, parentModule, action)) {
            const otherSubPerms = allSubModules
                .filter((s) => s.key !== subKey && s.actions.includes(action))
                .map((s) => `${s.key}:${action}`);
            setPermissions((prev) => [
                ...prev.filter((p) => p !== parentPerm),
                ...otherSubPerms,
            ]);
            return;
        }

        // Toggle direct sub-module perm
        const isRemoving = permissions.includes(perm);
        setPermissions((prev) => {
            const next = isRemoving ? prev.filter((p) => p !== perm) : [...prev, perm];

            // Auto-collapse: if all sub-modules for this action are now checked, replace with parent shortcut
            if (!isRemoving) {
                const subsWithAction = allSubModules.filter((s) => s.actions.includes(action));
                const allChecked = subsWithAction.every((s) => s.key === subKey || next.includes(`${s.key}:${action}`));
                if (allChecked && subsWithAction.length > 0) {
                    return [
                        ...next.filter((p) => !subsWithAction.some((s) => p === `${s.key}:${action}`)),
                        parentPerm,
                    ];
                }
            }

            return next;
        });
    };

    const [expandedSubGroups, setExpandedSubGroups] = React.useState<string[]>([]);

    const toggleSubGroup = (groupKey: string) => {
        setExpandedSubGroups((prev) =>
          prev.includes(groupKey) ? prev.filter((g) => g !== groupKey) : [...prev, groupKey]
        );
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'Role name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        // Deduplicate: remove sub-module perms that are already covered by parent shortcuts
        const deduped = permissions.filter((p) => {
            const [moduleOrSub, action] = p.split(':');
            if (!moduleOrSub?.includes('.') || !action) return true; // keep parent-level perms
            const parentModule = moduleOrSub.split('.')[0]!;
            // If parent shortcut or wildcard covers this, skip it
            if (permissions.includes(`${parentModule}:${action}`)) return false;
            if (permissions.includes(`${parentModule}:*`)) return false;
            return true;
        });
        onSubmit({
            name: name.trim(),
            description: description.trim(),
            permissions: deduped,
        });
    };

    if (!visible) return null;

    return (
        <View style={fStyles.container}>
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={isDark ? ['#0F0D1A', '#1A1730'] : [colors.gradient.surface, colors.white]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(300)} style={[fStyles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={onClose} style={fStyles.backBtn}>
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
                <Text className="flex-1 font-inter text-lg font-bold text-primary-950 dark:text-white">
                    {isEdit ? 'Edit Role' : 'Create Role'}
                </Text>
            </Animated.View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    fStyles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* Role Name */}
                <View style={fStyles.field}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Role Name <Text className="text-danger-500">*</Text>
                    </Text>
                    <TextInput
                        style={[
                            fStyles.input,
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
                <View style={fStyles.field}>
                    <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Description
                    </Text>
                    <TextInput
                        style={[fStyles.input, { height: 80, textAlignVertical: 'top' }]}
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
                    style={fStyles.templateBtn}
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
                    <Animated.View entering={FadeIn.duration(200)} style={fStyles.templateList}>
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
                                        fStyles.templateItem,
                                        idx > 0 && {
                                            borderTopWidth: 1,
                                            borderTopColor: colors.neutral[100],
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                            {tpl.name}
                                        </Text>
                                        {tpl.description ? (
                                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
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
                <View style={fStyles.permSection}>
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
                        const hasSubModules = mod.subModules && mod.subModules.length > 0;
                        const isExpanded = expandedModules.includes(mod.module);
                        const permCount = getModulePermCount(mod);
                        const parentPerms = mod.actions.map((a) => `${mod.module}:${a}`);
                        const allParentSelected = parentPerms.every((p) => permissions.includes(p));
                        const someSelected = !allParentSelected && (
                          parentPerms.some((p) => permissions.includes(p)) ||
                          (mod.subModules ?? []).some((sub) =>
                            sub.actions.some((a) => permissions.includes(`${sub.key}:${a}`))
                          )
                        );

                        // Calculate total action slots for badge
                        const totalActionSlots = hasSubModules
                          ? (mod.subModules ?? []).reduce((sum, s) => sum + s.actions.length, 0)
                          : mod.actions.length;

                        // Modules WITHOUT subModules: compact card with inline action chips
                        if (!hasSubModules) {
                          return (
                            <View key={mod.module} style={fStyles.moduleCard}>
                              <View style={fStyles.moduleHeader}>
                                {/* Select-all checkbox */}
                                <Pressable
                                  onPress={() => toggleAllModulePerms(mod.module)}
                                  hitSlop={6}
                                  style={{ marginRight: 10 }}
                                >
                                  <View
                                    style={[
                                      fStyles.checkbox,
                                      allParentSelected && fStyles.checkboxActive,
                                      someSelected && fStyles.checkboxIndeterminate,
                                    ]}
                                  >
                                    {allParentSelected && (
                                      <Svg width={10} height={10} viewBox="0 0 24 24">
                                        <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                      </Svg>
                                    )}
                                    {someSelected && (
                                      <Svg width={10} height={10} viewBox="0 0 24 24">
                                        <Path d="M5 12h14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                                      </Svg>
                                    )}
                                  </View>
                                </Pressable>

                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                      {mod.label}
                                    </Text>
                                    {permCount > 0 && (
                                      <View style={fStyles.permCountBadge}>
                                        <Text className="font-inter text-[9px] font-bold text-primary-700 dark:text-primary-300">
                                          {permCount} perms
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={fStyles.permGrid}>
                                    {mod.actions.map((action) => {
                                      const perm = `${mod.module}:${action}`;
                                      const isSelected = permissions.some(p => p.toLowerCase() === perm.toLowerCase());
                                      return (
                                        <Pressable
                                          key={action}
                                          onPress={() => togglePermission(perm)}
                                          style={[
                                            fStyles.permChip,
                                            isSelected && fStyles.permChipActive,
                                          ]}
                                        >
                                          <Text
                                            className={`font-inter text-xs ${isSelected ? 'font-semibold text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
                                          >
                                            {action.charAt(0).toUpperCase() + action.slice(1)}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                </View>
                              </View>
                            </View>
                          );
                        }

                        // Modules WITH subModules: expandable card
                        return (
                            <View key={mod.module} style={fStyles.moduleCard}>
                                <Pressable
                                    onPress={() => toggleModule(mod.module)}
                                    style={fStyles.moduleHeader}
                                >
                                    {/* Select-all checkbox */}
                                    <Pressable
                                        onPress={(e) => {
                                          e.stopPropagation();
                                          toggleAllModulePerms(mod.module);
                                        }}
                                        hitSlop={6}
                                        style={{ marginRight: 10 }}
                                    >
                                        <View
                                            style={[
                                                fStyles.checkbox,
                                                allParentSelected && fStyles.checkboxActive,
                                                someSelected && fStyles.checkboxIndeterminate,
                                            ]}
                                        >
                                            {allParentSelected && (
                                                <Svg width={10} height={10} viewBox="0 0 24 24">
                                                    <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            )}
                                            {someSelected && (
                                                <Svg width={10} height={10} viewBox="0 0 24 24">
                                                    <Path d="M5 12h14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                </Svg>
                                            )}
                                        </View>
                                    </Pressable>

                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                            {mod.label}
                                        </Text>
                                        {permCount > 0 && (
                                            <View style={fStyles.permCountBadge}>
                                                <Text className="font-inter text-[9px] font-bold text-primary-700 dark:text-primary-300">
                                                    {permCount} perms
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
                                    <Animated.View entering={FadeIn.duration(150)} style={fStyles.moduleBody}>
                                        {/* Select All (parent shortcut) */}
                                        <Pressable
                                            onPress={() => toggleAllModulePerms(mod.module)}
                                            style={fStyles.selectAllRow}
                                        >
                                            <View
                                                style={[
                                                    fStyles.checkbox,
                                                    allParentSelected && fStyles.checkboxActive,
                                                ]}
                                            >
                                                {allParentSelected && (
                                                    <Svg width={10} height={10} viewBox="0 0 24 24">
                                                        <Path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    </Svg>
                                                )}
                                            </View>
                                            <Text className="font-inter text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                                Select All
                                            </Text>
                                            {allParentSelected && (
                                                <View style={fStyles.inheritedBadge}>
                                                    <Text className="font-inter text-[8px] font-bold text-primary-500">
                                                        ALL INHERITED
                                                    </Text>
                                                </View>
                                            )}
                                        </Pressable>

                                        {/* Grouped sub-modules */}
                                        {Object.entries(groupSubModules(mod.subModules!)).map(([groupName, subs]) => {
                                            const groupKey = `${mod.module}::${groupName}`;
                                            const isGroupExpanded = expandedSubGroups.includes(groupKey);
                                            return (
                                                <View key={groupKey} style={fStyles.subGroupContainer}>
                                                    <Pressable
                                                        onPress={() => toggleSubGroup(groupKey)}
                                                        style={fStyles.subGroupHeader}
                                                    >
                                                        <Text className="font-inter text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                                                            {groupName}
                                                        </Text>
                                                        <Svg width={10} height={10} viewBox="0 0 24 24">
                                                            <Path
                                                                d={isGroupExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                                                                stroke={colors.neutral[400]}
                                                                strokeWidth="2"
                                                                fill="none"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </Svg>
                                                    </Pressable>

                                                    {isGroupExpanded && subs.map((sub) => (
                                                        <Animated.View
                                                            key={sub.key}
                                                            entering={FadeInDown.duration(150)}
                                                            style={fStyles.subModuleRow}
                                                        >
                                                            <Text className="font-inter text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                                {sub.label}
                                                            </Text>
                                                            <View style={fStyles.permGrid}>
                                                                {sub.actions.map((action) => {
                                                                    const isEnabled = isSubModuleActionEnabled(
                                                                      permissions, mod.module, sub.key, action
                                                                    );
                                                                    const inherited = isInheritedFromParent(
                                                                      permissions, mod.module, action
                                                                    );
                                                                    return (
                                                                        <Pressable
                                                                            key={action}
                                                                            onPress={() => toggleSubModuleAction(mod.module, sub.key, action, mod.subModules ?? [])}
                                                                            style={[
                                                                                fStyles.permChip,
                                                                                isEnabled && !inherited && fStyles.permChipActive,
                                                                                isEnabled && inherited && fStyles.permChipInherited,
                                                                            ]}
                                                                        >
                                                                            <Text
                                                                                className={`font-inter text-xs ${
                                                                                  isEnabled && inherited
                                                                                    ? 'font-medium text-primary-600'
                                                                                    : isEnabled
                                                                                      ? 'font-semibold text-white'
                                                                                      : 'text-neutral-500 dark:text-neutral-400'
                                                                                }`}
                                                                            >
                                                                                {action.charAt(0).toUpperCase() + action.slice(1)}
                                                                            </Text>
                                                                        </Pressable>
                                                                    );
                                                                })}
                                                            </View>
                                                        </Animated.View>
                                                    ))}
                                                </View>
                                            );
                                        })}
                                    </Animated.View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Permission Summary */}
                <View style={fStyles.summaryCard}>
                    <Text className="font-inter text-xs font-bold text-neutral-400">
                        SUMMARY
                    </Text>
                    <Text className="mt-1 font-inter text-sm font-semibold text-primary-950 dark:text-white">
                        {permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <Animated.View entering={FadeIn.duration(200)} style={fStyles.errorBanner}>
                        <Text className="font-inter text-xs font-semibold text-danger-600 text-center">
                            {error}
                        </Text>
                    </Animated.View>
                ) : null}

                {/* Save Button */}
                <Pressable
                    style={({ pressed }) => [
                        fStyles.submitBtn,
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
                            {isEdit ? 'Save Changes' : 'Save Role'}
                        </Text>
                    )}
                </Pressable>
            </ScrollView>
        </View>
    );
}

// ============ MAIN COMPONENT ============

export function RoleManagementScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

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
                isDark={isDark}
                error={
                    ((createRole.error as any)?.response?.data?.message || createRole.error?.message) ||
                    ((updateRole.error as any)?.response?.data?.message || updateRole.error?.message)
                }
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

            <FlashList
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

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
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
    cardSystem: {
        opacity: 0.75,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
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
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
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
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
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
const styles = createStyles(false);

const createFormStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
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
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
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
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.neutral[200],
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: isDark ? colors.white : colors.primary[950],
    },
    templateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: isDark ? colors.primary[950] : colors.primary[50],
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[800] : colors.primary[100],
        borderStyle: 'dashed',
    },
    templateList: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.neutral[200],
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
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.primary[50],
        marginBottom: 10,
        overflow: 'hidden',
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    moduleBody: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: isDark ? colors.primary[900] : colors.neutral[100],
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
        gap: 6,
    },
    permChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: isDark ? '#252240' : colors.neutral[100],
        borderWidth: 1,
        borderColor: isDark ? colors.primary[800] : colors.neutral[200],
    },
    permChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    permChipInherited: {
        backgroundColor: isDark ? colors.primary[950] : colors.primary[50],
        borderColor: isDark ? colors.primary[700] : colors.primary[200],
        opacity: 0.85,
    },
    errorBanner: {
        backgroundColor: isDark ? '#2D1F1F' : colors.danger[50],
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.danger[100],
    },
    permCountBadge: {
        backgroundColor: isDark ? colors.primary[950] : colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: isDark ? colors.neutral[600] : colors.neutral[300],
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
    checkboxIndeterminate: {
        backgroundColor: colors.primary[400],
        borderColor: colors.primary[400],
    },
    checkboxInherited: {
        backgroundColor: colors.primary[300],
        borderColor: colors.primary[300],
    },
    inheritedBadge: {
        backgroundColor: isDark ? colors.primary[950] : colors.primary[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 'auto',
    },
    subGroupContainer: {
        marginTop: 8,
    },
    subGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 4,
        backgroundColor: isDark ? '#16132A' : colors.neutral[50],
        borderRadius: 8,
        marginBottom: 4,
        paddingLeft: 10,
        paddingRight: 10,
    },
    subModuleRow: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? colors.primary[900] : colors.neutral[100],
    },
    summaryCard: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.primary[900] : colors.neutral[200],
        marginBottom: 20,
    },
    submitContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: isDark ? colors.primary[900] : colors.neutral[100],
        backgroundColor: isDark ? '#0F0D1A' : colors.white,
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
