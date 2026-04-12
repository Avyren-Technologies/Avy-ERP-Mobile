/* eslint-disable better-tailwindcss/no-unknown-classes */
// Location Management Screen — Edit & Delete only (NO Add)

import type { PlantBranch } from '@/features/super-admin/tenant-onboarding/types';
import BottomSheet, {
    BottomSheetBackdrop,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, {
    FadeIn,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchBar } from '@/components/ui/search-bar';
import { useSidebar } from '@/components/ui/sidebar';

import { SkeletonCard } from '@/components/ui/skeleton';
import {
    useDeleteLocation,
    useUpdateLocation,
} from '@/features/company-admin/api/use-company-admin-mutations';
import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import {
    useGeofences,
    useDeleteGeofence,
} from '@/features/company-admin/api/use-geofence-queries';
import {
    FormInput,
    FormSelect,
    ToggleRow,
} from '@/features/super-admin/tenant-onboarding/atoms';
import {
    FACILITY_STATUSES,
    FACILITY_TYPES,
    GEO_RADIUS_OPTIONS,
    INDIAN_STATES,
} from '@/features/super-admin/tenant-onboarding/constants';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ HELPERS ============

type LocationStatus = 'Active' | 'Inactive' | 'Under Construction';

function toLocationBadge(status: string) {
    switch (status) {
        case 'Active':
            return { bg: colors.success[50], text: colors.success[700], dot: colors.success[500] };
        case 'Inactive':
            return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
        case 'Under Construction':
            return { bg: colors.warning[50], text: colors.warning[700], dot: colors.warning[500] };
        default:
            return { bg: colors.neutral[100], text: colors.neutral[600], dot: colors.neutral[400] };
    }
}

function mapApiLocation(item: any): PlantBranch {
    return {
        id: item.id ?? '',
        name: item.name ?? '',
        code: item.code ?? '',
        facilityType: item.facilityType ?? '',
        customFacilityType: item.customFacilityType ?? '',
        status: item.status ?? 'Active',
        isHQ: item.isHQ ?? false,
        gstin: item.gstin ?? '',
        stateGST: item.stateGST ?? '',
        addressLine1: item.addressLine1 ?? '',
        addressLine2: item.addressLine2 ?? '',
        city: item.city ?? '',
        district: item.district ?? '',
        state: item.state ?? '',
        pin: item.pin ?? '',
        country: item.country ?? 'India',
        contactName: item.contactName ?? '',
        contactDesignation: item.contactDesignation ?? '',
        contactEmail: item.contactEmail ?? '',
        contactCountryCode: item.contactCountryCode ?? '+91',
        contactPhone: item.contactPhone ?? '',
        geoEnabled: item.geoEnabled ?? false,
        geoLocationName: item.geoLocationName ?? '',
        geoLat: item.geoLat ?? '',
        geoLng: item.geoLng ?? '',
        geoRadius: item.geoRadius ?? 200,
        geoShape: item.geoShape ?? 'circle',
    };
}

// ============ LOCATION CARD ============

function LocationCard({
    location,
    index,
    onEdit,
    onDelete,
}: {
    location: PlantBranch;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const badge = toLocationBadge(location.status);
    const facilityLabel =
        location.facilityType === 'Custom...'
            ? location.customFacilityType || 'Custom'
            : location.facilityType;

    return (
        <Animated.View entering={FadeInUp.duration(350).delay(80 + index * 50)}>
            <View style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <View style={styles.nameSection}>
                        <LinearGradient
                            colors={
                                location.isHQ
                                    ? ([colors.primary[500], colors.accent[500]] as const)
                                    : ([colors.neutral[400], colors.neutral[500]] as const)
                            }
                            style={styles.avatar}
                        >
                            <Text className="font-inter text-xs font-bold text-white">
                                {location.name.substring(0, 2).toUpperCase() || '--'}
                            </Text>
                        </LinearGradient>

                        <View style={styles.nameContainer}>
                            <View style={styles.nameRow}>
                                <Text
                                    className="font-inter text-sm font-bold text-primary-950 dark:text-white"
                                    numberOfLines={1}
                                    style={{ flex: 1 }}
                                >
                                    {location.name || 'Unnamed'}
                                </Text>
                                {location.isHQ && (
                                    <View style={styles.hqBadge}>
                                        <Text className="font-inter text-[9px] font-bold text-primary-700">
                                            HQ
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                {location.code || 'No code'}
                            </Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
                        <Text
                            style={{ color: badge.text }}
                            className="font-inter text-[10px] font-bold"
                        >
                            {location.status}
                        </Text>
                    </View>
                </View>

                {/* Facility Type */}
                {facilityLabel ? (
                    <View style={styles.facilityTag}>
                        <Text className="font-inter text-[10px] font-semibold text-accent-700">
                            {facilityLabel}
                        </Text>
                    </View>
                ) : null}

                {/* Location Details */}
                <View style={styles.detailsRow}>
                    {(location.city || location.state) ? (
                        <View style={styles.detailItem}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path
                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <Circle
                                    cx="12"
                                    cy="10"
                                    r="3"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </Svg>
                            <Text className="font-inter text-[11px] text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
                                {[location.city, location.state].filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    ) : null}

                    {location.contactName ? (
                        <View style={styles.detailItem}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                                <Path
                                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                                <Circle
                                    cx="12"
                                    cy="7"
                                    r="4"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </Svg>
                            <Text className="font-inter text-[11px] text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                                {location.contactName}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <Pressable
                        onPress={onEdit}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            styles.editBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path
                                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                stroke={colors.primary[600]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Path
                                d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                stroke={colors.primary[600]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-primary-600">
                            Edit
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={onDelete}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            styles.deleteBtn,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Svg width={14} height={14} viewBox="0 0 24 24">
                            <Path
                                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                stroke={colors.danger[500]}
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-danger-500">
                            Delete
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

// ============ GEOFENCES SECTION ============

interface GeofenceItem {
    id: string;
    name: string;
    address?: string | null;
    lat: number;
    lng: number;
    radius: number;
    isDefault: boolean;
    _count?: { employees?: number };
}

function GeofencesSection({
    location,
}: {
    location: PlantBranch;
}) {
    const router = useRouter();
    const { data: gfResponse, isLoading: gfLoading } = useGeofences(location.id);
    const deleteMutation = useDeleteGeofence();
    const { show: showDeleteConfirm, modalProps: deleteConfirmProps } = useConfirmModal();

    const geofences: GeofenceItem[] = React.useMemo(() => {
        const raw = (gfResponse as any)?.data ?? gfResponse ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [gfResponse]);

    const handleAddGeofence = () => {
        router.push({
            pathname: '/company/geofence-editor' as any,
            params: {
                locationId: location.id,
                companyId: (location as any).companyId ?? '',
                initialLat: location.geoLat ?? '',
                initialLng: location.geoLng ?? '',
            },
        });
    };

    const handleEditGeofence = (gf: GeofenceItem) => {
        router.push({
            pathname: '/company/geofence-editor' as any,
            params: {
                locationId: location.id,
                companyId: (location as any).companyId ?? '',
                geofenceId: gf.id,
                initialLat: String(gf.lat),
                initialLng: String(gf.lng),
                geofenceName: gf.name,
                geofenceRadius: String(gf.radius),
                geofenceAddress: gf.address ?? '',
                geofenceIsDefault: String(gf.isDefault),
            },
        });
    };

    const handleDeleteGeofence = (gf: GeofenceItem) => {
        showDeleteConfirm({
            title: 'Delete Geofence',
            message: `Are you sure you want to delete "${gf.name}"? Employees assigned to this geofence will be unassigned.`,
            variant: 'danger',
            confirmText: 'Delete',
            onConfirm: () => {
                deleteMutation.mutate({ locationId: location.id, id: gf.id });
            },
        });
    };

    return (
        <>
            {/* Header */}
            <View style={gfStyles.header}>
                <View style={gfStyles.headerLeft}>
                    <Text className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Geofences
                    </Text>
                    {geofences.length > 0 && (
                        <View style={gfStyles.countBadge}>
                            <Text className="font-inter text-[10px] font-bold text-primary-700">
                                {geofences.length}
                            </Text>
                        </View>
                    )}
                </View>
                <Pressable
                    onPress={handleAddGeofence}
                    hitSlop={8}
                    style={({ pressed }) => [gfStyles.addBtn, pressed && { opacity: 0.7 }]}
                >
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M12 5v14M5 12h14"
                            stroke={colors.primary[600]}
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    </Svg>
                    <Text className="font-inter text-[11px] font-bold text-primary-600">
                        Add
                    </Text>
                </Pressable>
            </View>

            {/* List */}
            {gfLoading ? (
                <View style={gfStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary[400]} />
                </View>
            ) : geofences.length === 0 ? (
                <View style={gfStyles.emptyContainer}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                            stroke={colors.neutral[300]}
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <Circle cx="12" cy="10" r="3" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" />
                    </Svg>
                    <Text className="font-inter mt-2 text-xs text-neutral-400">
                        No geofences configured
                    </Text>
                    <Pressable onPress={handleAddGeofence} style={({ pressed }) => [gfStyles.emptyAddBtn, pressed && { opacity: 0.7 }]}>
                        <Text className="font-inter text-xs font-semibold text-primary-600">
                            + Add first geofence
                        </Text>
                    </Pressable>
                </View>
            ) : (
                geofences.map((gf) => {
                    const empCount = gf._count?.employees ?? 0;
                    return (
                        <Pressable
                            key={gf.id}
                            onPress={() => handleEditGeofence(gf)}
                            onLongPress={() => handleDeleteGeofence(gf)}
                            style={({ pressed }) => [gfStyles.card, pressed && { opacity: 0.85 }]}
                        >
                            <View style={gfStyles.cardTop}>
                                <View style={gfStyles.cardNameRow}>
                                    <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flexShrink: 1 }}>
                                        {gf.name}
                                    </Text>
                                    {gf.isDefault && (
                                        <View style={gfStyles.defaultBadge}>
                                            <Text className="font-inter text-[9px] font-bold text-success-700">
                                                Default
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={gfStyles.badges}>
                                    <View style={gfStyles.radiusBadge}>
                                        <Text className="font-inter text-[10px] font-semibold text-accent-700">
                                            {gf.radius}m
                                        </Text>
                                    </View>
                                    {empCount > 0 && (
                                        <View style={gfStyles.empBadge}>
                                            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                                                <Path
                                                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                                                    stroke={colors.neutral[500]}
                                                    strokeWidth="2"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                />
                                                <Circle cx="12" cy="7" r="4" stroke={colors.neutral[500]} strokeWidth="2" fill="none" />
                                            </Svg>
                                            <Text className="font-inter text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                                                {empCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {gf.address ? (
                                <Text className="font-inter mt-1 text-[11px] text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                                    {gf.address}
                                </Text>
                            ) : null}
                        </Pressable>
                    );
                })
            )}

            <ConfirmModal {...deleteConfirmProps} />
        </>
    );
}

// ============ EDIT BOTTOM SHEET ============

function EditLocationSheet({
    sheetRef,
    location,
    onSave,
    isSaving,
}: {
    sheetRef: React.RefObject<BottomSheet | null>;
    location: PlantBranch | null;
    onSave: (data: Partial<PlantBranch>) => void;
    isSaving: boolean;
}) {
    const insets = useSafeAreaInsets();
    const [form, setForm] = React.useState<PlantBranch | null>(null);
    const snapPoints = React.useMemo(() => ['85%'], []);

    React.useEffect(() => {
        if (location) {
            setForm({ ...location });
        }
    }, [location]);

    const update = (updates: Partial<PlantBranch>) => {
        setForm((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    const handleSave = () => {
        if (!form) return;
        const { id, name, code, ...rest } = form;
        onSave(rest);
    };

    const renderBackdrop = React.useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        [],
    );

    if (!form) return null;

    const radiusOptions = GEO_RADIUS_OPTIONS.map((r) => r.label);
    const currentRadiusLabel =
        GEO_RADIUS_OPTIONS.find((r) => r.value === form.geoRadius)?.label ?? '200 m';

    return (
        <BottomSheet
            ref={sheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBg}
            handleIndicatorStyle={styles.sheetHandle}
        >
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.sheetContent,
                    { paddingBottom: insets.bottom + 80 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
            >
                {/* Sheet Header */}
                <Text className="mb-1 font-inter text-lg font-bold text-primary-950 dark:text-white">
                    Edit Location
                </Text>
                <Text className="mb-4 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                    {form.name} ({form.code})
                </Text>

                {/* Name & Code (read-only display) */}
                <View style={styles.readOnlyField}>
                    <Text className="mb-1 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Name
                    </Text>
                    <View style={styles.readOnlyValue}>
                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">
                            {form.name}
                        </Text>
                    </View>
                </View>
                <View style={styles.readOnlyField}>
                    <Text className="mb-1 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                        Code
                    </Text>
                    <View style={styles.readOnlyValue}>
                        <Text className="font-inter text-sm text-neutral-600 dark:text-neutral-400">
                            {form.code}
                        </Text>
                    </View>
                </View>

                {/* Facility Type */}
                <FormSelect
                    label="Facility Type"
                    options={[...FACILITY_TYPES]}
                    selected={form.facilityType}
                    onSelect={(v) => update({ facilityType: v })}
                />

                {/* Status */}
                <FormSelect
                    label="Status"
                    options={FACILITY_STATUSES}
                    selected={form.status}
                    onSelect={(v) => update({ status: v })}
                />

                {/* Address Section */}
                <Text className="mb-2 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Address
                </Text>
                <FormInput
                    label="Address Line 1"
                    placeholder="Street, plot, building"
                    value={form.addressLine1}
                    onChangeText={(v) => update({ addressLine1: v })}
                />
                <FormInput
                    label="Address Line 2"
                    placeholder="Area, landmark"
                    value={form.addressLine2}
                    onChangeText={(v) => update({ addressLine2: v })}
                />
                <FormInput
                    label="City"
                    placeholder="City"
                    value={form.city}
                    onChangeText={(v) => update({ city: v })}
                    autoCapitalize="words"
                />
                <FormInput
                    label="District"
                    placeholder="District"
                    value={form.district}
                    onChangeText={(v) => update({ district: v })}
                    autoCapitalize="words"
                />
                <FormSelect
                    label="State"
                    options={INDIAN_STATES}
                    selected={form.state}
                    onSelect={(v) => update({ state: v })}
                />
                <FormInput
                    label="PIN Code"
                    placeholder="560001"
                    value={form.pin}
                    onChangeText={(v) => update({ pin: v })}
                    keyboardType="number-pad"
                />

                {/* GSTIN */}
                <Text className="mb-2 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    GST
                </Text>
                <FormInput
                    label="GSTIN"
                    placeholder="29AARCA5678F1Z3"
                    value={form.gstin}
                    onChangeText={(v) => update({ gstin: v.toUpperCase() })}
                    autoCapitalize="none"
                />

                {/* Contact Section */}
                <Text className="mb-2 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Contact Person
                </Text>
                <FormInput
                    label="Name"
                    placeholder="Full name"
                    value={form.contactName}
                    onChangeText={(v) => update({ contactName: v })}
                    autoCapitalize="words"
                />
                <FormInput
                    label="Designation"
                    placeholder="Branch Manager"
                    value={form.contactDesignation}
                    onChangeText={(v) => update({ contactDesignation: v })}
                    autoCapitalize="words"
                />
                <FormInput
                    label="Email"
                    placeholder="contact@company.com"
                    value={form.contactEmail}
                    onChangeText={(v) => update({ contactEmail: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <FormInput
                    label="Phone"
                    placeholder="9876543210"
                    value={form.contactPhone}
                    onChangeText={(v) => update({ contactPhone: v })}
                    keyboardType="phone-pad"
                />

                {/* Geo-fencing Section */}
                <Text className="mb-2 mt-4 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Geo-Fencing
                </Text>
                <ToggleRow
                    label="Enable Geo-Fencing"
                    subtitle="Restrict attendance to geographic boundary"
                    value={form.geoEnabled}
                    onToggle={(v) => update({ geoEnabled: v })}
                />
                {form.geoEnabled && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <FormSelect
                            label="Radius"
                            options={radiusOptions}
                            selected={currentRadiusLabel}
                            onSelect={(label) => {
                                const found = GEO_RADIUS_OPTIONS.find((r) => r.label === label);
                                if (found) update({ geoRadius: found.value });
                            }}
                        />
                    </Animated.View>
                )}

                {/* Geofences Section */}
                <View style={{ marginTop: 16 }}>
                    <GeofencesSection location={form} />
                </View>

                {/* Save Button */}
                <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    style={({ pressed }) => [
                        styles.saveBtn,
                        pressed && { opacity: 0.85 },
                        isSaving && { opacity: 0.6 },
                    ]}
                >
                    {isSaving ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <Text className="font-inter text-sm font-bold text-white">
                            Save Changes
                        </Text>
                    )}
                </Pressable>

                {/* Bottom spacing fallback */}
                <View style={{ height: 40 }} />
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============ MAIN COMPONENT ============

export function LocationManagementScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { toggle } = useSidebar();
    const [search, setSearch] = React.useState('');
    const [editingLocation, setEditingLocation] = React.useState<PlantBranch | null>(null);
    const editSheetRef = React.useRef<BottomSheet>(null);

    const { data: response, isLoading, error, refetch, isFetching } = useCompanyLocations();
    const updateMutation = useUpdateLocation();
    const deleteMutation = useDeleteLocation();
    const { show: showConfirm, modalProps: confirmModalProps } = useConfirmModal();

    // Map API data
    const rawData = (response as any)?.data ?? response ?? [];
    const locations: PlantBranch[] = React.useMemo(() => {
        if (!Array.isArray(rawData)) return [];
        return rawData.map(mapApiLocation);
    }, [rawData]);

    // Filter by search
    const filtered = React.useMemo(() => {
        if (!search.trim()) return locations;
        const q = search.trim().toLowerCase();
        return locations.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                l.code.toLowerCase().includes(q),
        );
    }, [locations, search]);

    // ---- Handlers ----

    const handleEdit = (location: PlantBranch) => {
        setEditingLocation(location);
        editSheetRef.current?.snapToIndex(0);
    };

    const handleSave = (data: Partial<PlantBranch>) => {
        if (!editingLocation) return;
        updateMutation.mutate(
            { id: editingLocation.id, data: data as Record<string, unknown> },
            {
                onSuccess: () => {
                    editSheetRef.current?.close();
                    setEditingLocation(null);
                },
            },
        );
    };

    const handleDelete = (location: PlantBranch) => {
        if (location.isHQ) {
            showConfirm({
                title: 'Cannot Delete HQ',
                message:
                    'The headquarters location cannot be deleted. Reassign HQ to another location first.',
                variant: 'warning',
                confirmText: 'OK',
                onConfirm: () => {},
            });
            return;
        }
        showConfirm({
            title: 'Delete Location',
            message: `Are you sure you want to delete "${location.name}"? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete',
            onConfirm: () => {
                deleteMutation.mutate(location.id);
            },
        });
    };

    // ---- Render helpers ----

    const renderHeader = () => (
        <>
            <AppTopHeader
                title="Locations"
                subtitle={`${locations.length} ${locations.length === 1 ? 'location' : 'locations'}`}
                onMenuPress={toggle}
            />

            {/* Search */}
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.searchSection}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name or code..."
                />
            </Animated.View>
        </>
    );

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                    <EmptyState
                        icon="error"
                        title="Failed to load locations"
                        message="Check your connection and try again."
                        action={{ label: 'Retry', onPress: () => refetch() }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon="search"
                    title="No locations found"
                    message={
                        search.trim()
                            ? 'Try adjusting your search term.'
                            : 'No locations have been configured for this company yet.'
                    }
                />
            </View>
        );
    };

    const renderLocation = ({ item, index }: { item: PlantBranch; index: number }) => (
        <LocationCard
            location={item}
            index={index}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
        />
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <FlashList
                data={filtered}
                renderItem={renderLocation}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
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

            {/* Edit Bottom Sheet */}
            <EditLocationSheet
                sheetRef={editSheetRef}
                location={editingLocation}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
            />

            {/* Delete Confirm Modal */}
            <ConfirmModal {...confirmModalProps} />
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
        alignItems: 'flex-start',
    },
    nameSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    nameContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hqBadge: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    facilityTag: {
        alignSelf: 'flex-start',
        backgroundColor: colors.accent[50],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 10,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[100],
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
    },
    editBtn: {
        backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    deleteBtn: {
        backgroundColor: colors.danger[50],
        borderWidth: 1,
        borderColor: colors.danger[200],
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    // Bottom sheet
    sheetBg: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    sheetHandle: {
        backgroundColor: colors.neutral[300],
        width: 40,
    },
    sheetContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    readOnlyField: {
        marginBottom: 12,
    },
    readOnlyValue: {
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    saveBtn: {
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
});
const styles = createStyles(false);

const gfStyles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    loadingContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptyAddBtn: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.primary[50],
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    card: {
        backgroundColor: colors.neutral[50],
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: colors.success[50],
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    badges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    radiusBadge: {
        backgroundColor: colors.accent[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    empBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.neutral[100],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
});
