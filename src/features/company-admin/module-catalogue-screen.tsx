/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';

import { useModuleCatalogue } from '@/features/company-admin/api/use-company-admin-queries';
import { useAddLocationModules, useRemoveLocationModule } from '@/features/company-admin/api/use-company-admin-mutations';

// ============ TYPES ============

interface ModuleItem {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    billingCycle: string;
    isActive: boolean;
    icon?: string;
}

// ============ HELPERS ============

function formatPrice(amount: number, currency = 'INR') {
    if (currency === 'INR') {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount}`;
}

// ============ MODULE ICON ============

function ModuleIcon({ name, color }: { name: string; color: string }) {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('hr') || lowerName.includes('people')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
            </Svg>
        );
    }
    if (lowerName.includes('inventory') || lowerName.includes('warehouse')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
                    stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
                <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        );
    }
    if (lowerName.includes('production') || lowerName.includes('manufactur')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M2 20h20M6 20V10l6 4V10l6 4V4"
                    stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
            </Svg>
        );
    }
    if (lowerName.includes('maintenance') || lowerName.includes('cmms')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                    d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                    stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
            </Svg>
        );
    }
    if (lowerName.includes('billing') || lowerName.includes('finance') || lowerName.includes('account')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth="1.8" fill="none" />
                <Path d="M1 10h22" stroke={color} strokeWidth="1.8" />
            </Svg>
        );
    }
    if (lowerName.includes('quality') || lowerName.includes('qc')) {
        return (
            <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M9 11l3 3L22 4" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        );
    }
    // Default module icon
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
            <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
            <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
            <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
            <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.8" fill="none" />
        </Svg>
    );
}

// ============ MODULE CARD ============

interface LocationModuleInfo {
    locationId: string;
    locationName: string;
    activeModuleIds: string[];
}

function ModuleCard({
    item,
    index,
    locationModules,
    isOneTimeBilling,
    isMutating,
    onAddModule,
    onRemoveModule,
}: {
    item: ModuleItem;
    index: number;
    locationModules: LocationModuleInfo[];
    isOneTimeBilling: boolean;
    isMutating: boolean;
    onAddModule: (locationId: string, moduleId: string, moduleName: string) => void;
    onRemoveModule: (locationId: string, moduleId: string, moduleName: string) => void;
}) {
    const iconColor = item.isActive ? colors.primary[600] : colors.neutral[400];
    const iconBg = item.isActive ? colors.primary[50] : colors.neutral[100];

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).springify()}
            style={styles.card}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                    <ModuleIcon name={item.name} color={iconColor} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text className="font-inter text-base font-bold text-primary-950" numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={[
                        styles.statusChip,
                        { backgroundColor: item.isActive ? colors.success[50] : colors.neutral[100] },
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: item.isActive ? colors.success[500] : colors.neutral[400] },
                        ]} />
                        <Text className={`font-inter text-[10px] font-bold ${item.isActive ? 'text-success-700' : 'text-neutral-500'}`}>
                            {item.isActive ? 'Active' : 'Not Subscribed'}
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="mt-2 font-inter text-xs leading-[18px] text-neutral-500" numberOfLines={2}>
                {item.description}
            </Text>

            <View style={styles.cardFooter}>
                <Text className="font-inter text-lg font-bold text-primary-700">
                    {formatPrice(item.price, item.currency)}
                </Text>
                <Text className="font-inter text-[10px] text-neutral-400">
                    /{item.billingCycle || 'month'}
                </Text>
            </View>

            {/* Module Actions */}
            {locationModules.length > 0 && (
                <View style={styles.locationActions}>
                    {locationModules.map((loc) => {
                        const isActiveOnLoc = loc.activeModuleIds.includes(item.id);
                        const isMasters = item.id === 'masters';
                        return (
                            <View key={loc.locationId} style={styles.locationRow}>
                                <Text className="font-inter text-xs text-neutral-500" numberOfLines={1} style={{ flex: 1 }}>
                                    {loc.locationName}
                                </Text>
                                {isMasters ? (
                                    <Text className="font-inter text-[10px] text-neutral-400">Required</Text>
                                ) : isActiveOnLoc ? (
                                    <Pressable
                                        onPress={() => onRemoveModule(loc.locationId, item.id, item.name)}
                                        disabled={isMutating}
                                        style={({ pressed }) => [
                                            styles.actionBtn,
                                            { backgroundColor: colors.danger[50], opacity: pressed || isMutating ? 0.6 : 1 },
                                        ]}
                                    >
                                        <Text className="font-inter text-[10px] font-bold text-danger-600">
                                            {isOneTimeBilling ? 'Request Remove' : 'Remove'}
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        onPress={() => onAddModule(loc.locationId, item.id, item.name)}
                                        disabled={isMutating}
                                        style={({ pressed }) => [
                                            styles.actionBtn,
                                            { backgroundColor: colors.success[50], opacity: pressed || isMutating ? 0.6 : 1 },
                                        ]}
                                    >
                                        <Text className="font-inter text-[10px] font-bold text-success-600">
                                            {isOneTimeBilling ? 'Request Add' : 'Add'}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </Animated.View>
    );
}

// ============ MAIN SCREEN ============

export function ModuleCatalogueScreen() {
    const insets = useSafeAreaInsets();
    const { toggle } = useSidebar();
    const router = useRouter();
    const { data, isLoading, refetch, isRefetching } = useModuleCatalogue();
    const addModulesMutation = useAddLocationModules();
    const removeModuleMutation = useRemoveLocationModule();
    const confirmModal = useConfirmModal();
    const isMutating = addModulesMutation.isPending || removeModuleMutation.isPending;

    const rawData = (data as any)?.data ?? data;

    const modules: ModuleItem[] = React.useMemo(() => {
        // Backend returns { data: { catalogue: [...], companyActiveModuleIds: [...] } }
        const raw = rawData?.catalogue ?? (Array.isArray(rawData) ? rawData : []);
        if (!Array.isArray(raw)) return [];
        return raw.map((m: any) => ({
            id: m.id ?? m.moduleId ?? m.name,
            name: m.name ?? m.moduleName ?? '',
            description: m.description ?? '',
            price: m.pricePerMonth ?? m.price ?? m.monthlyPrice ?? 0,
            currency: m.currency ?? 'INR',
            billingCycle: m.billingCycle ?? 'month',
            isActive: m.isActive ?? m.subscribed ?? m.enabled ?? false,
            icon: m.icon,
        }));
    }, [rawData]);

    const locationModules: LocationModuleInfo[] = React.useMemo(
        () => rawData?.locationModules ?? [],
        [rawData],
    );
    const billingType: string = rawData?.billingType ?? 'monthly';
    const isOneTimeBilling = billingType === 'one-time';

    const activeCount = modules.filter((m) => m.isActive).length;

    const handleAddModule = React.useCallback((locationId: string, moduleId: string, moduleName: string) => {
        if (isOneTimeBilling) {
            router.push({
                pathname: '/(app)/support' as any,
                params: { prefillCategory: 'MODULE_CHANGE', prefillType: 'ADD', prefillLocationId: locationId, prefillModuleId: moduleId, prefillModuleName: moduleName },
            });
            return;
        }
        confirmModal.show({
            title: `Add ${moduleName}?`,
            message: `This will add ${moduleName} to your subscription. Billing will be updated accordingly.`,
            variant: 'primary',
            confirmText: 'Add Module',
            onConfirm: () => {
                addModulesMutation.mutate(
                    { locationId, moduleIds: [moduleId] },
                    {
                        onError: (err: any) =>
                            confirmModal.show({
                                title: 'Error',
                                message: err?.message ?? 'Failed to add module',
                                variant: 'danger',
                                confirmText: 'OK',
                                onConfirm: () => {},
                            }),
                    },
                );
            },
        });
    }, [isOneTimeBilling, router, confirmModal, addModulesMutation]);

    const handleRemoveModule = React.useCallback((locationId: string, moduleId: string, moduleName: string) => {
        if (isOneTimeBilling) {
            router.push({
                pathname: '/(app)/support' as any,
                params: { prefillCategory: 'MODULE_CHANGE', prefillType: 'REMOVE', prefillLocationId: locationId, prefillModuleId: moduleId, prefillModuleName: moduleName },
            });
            return;
        }
        confirmModal.show({
            title: `Remove ${moduleName}?`,
            message: `This will remove ${moduleName} from your subscription. Any dependent modules may also be affected.`,
            variant: 'danger',
            confirmText: 'Remove Module',
            onConfirm: () => {
                removeModuleMutation.mutate(
                    { locationId, moduleId },
                    {
                        onError: (err: any) =>
                            confirmModal.show({
                                title: 'Error',
                                message: err?.message ?? 'Failed to remove module',
                                variant: 'danger',
                                confirmText: 'OK',
                                onConfirm: () => {},
                            }),
                    },
                );
            },
        });
    }, [isOneTimeBilling, router, confirmModal, removeModuleMutation]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* ── Header ── */}
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <HamburgerButton onPress={toggle} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text className="font-inter text-xl font-bold text-white">
                            Module Catalogue
                        </Text>
                        <Text className="mt-0.5 font-inter text-xs text-white/70">
                            {activeCount} of {modules.length} modules active
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* ── Content ── */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    {[0, 1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </View>
            ) : modules.length === 0 ? (
                <EmptyState
                    title="No Modules Available"
                    message="Module catalogue is currently empty."
                    icon="list"
                />
            ) : (
                <FlatList
                    data={modules}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <ModuleCard
                            item={item}
                            index={index}
                            locationModules={locationModules}
                            isOneTimeBilling={isOneTimeBilling}
                            isMutating={isMutating}
                            onAddModule={handleAddModule}
                            onRemoveModule={handleRemoveModule}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor={colors.primary[500]}
                            colors={[colors.primary[500]]}
                        />
                    }
                />
            )}

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
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 20,
        gap: 12,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
        gap: 12,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        marginTop: 4,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 2,
    },
    locationActions: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    actionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
});
