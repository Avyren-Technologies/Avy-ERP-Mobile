/* eslint-disable better-tailwindcss/no-unknown-classes */
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import type { Region } from 'react-native-maps';
import MapView, { Circle as MapCircle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
    useCreateGeofence,
    useUpdateGeofence,
} from '@/features/company-admin/api/use-geofence-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

const RADIUS_OPTIONS = [
    { label: '50m', value: 50 },
    { label: '100m', value: 100 },
    { label: '200m', value: 200 },
    { label: '300m', value: 300 },
    { label: '500m', value: 500 },
    { label: '1km', value: 1000 },
];

const DEFAULT_REGION: Region = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
};

// ============ SCREEN ============

export function GeofenceEditorScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{
        locationId: string;
        companyId: string;
        geofenceId?: string;
        initialLat?: string;
        initialLng?: string;
        geofenceName?: string;
        geofenceRadius?: string;
        geofenceAddress?: string;
        geofenceIsDefault?: string;
    }>();

    const isEdit = !!params.geofenceId;
    const mapRef = React.useRef<MapView>(null);

    // ---- State ----
    const [name, setName] = React.useState(params.geofenceName ?? '');
    const [latitude, setLatitude] = React.useState(
        parseFloat(params.initialLat ?? '20.5937'),
    );
    const [longitude, setLongitude] = React.useState(
        parseFloat(params.initialLng ?? '78.9629'),
    );
    const [radius, setRadius] = React.useState(
        parseInt(params.geofenceRadius ?? '100', 10),
    );
    const [address, setAddress] = React.useState(params.geofenceAddress ?? '');
    const [isDefault, setIsDefault] = React.useState(
        params.geofenceIsDefault === 'true',
    );

    // ---- Mutations ----
    const createMutation = useCreateGeofence();
    const updateMutation = useUpdateGeofence();
    const isSaving = createMutation.isPending || updateMutation.isPending;

    // ---- Computed ----
    const initialRegion = React.useMemo<Region>(() => {
        const lat = parseFloat(params.initialLat ?? '');
        const lng = parseFloat(params.initialLng ?? '');
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
        }
        return DEFAULT_REGION;
    }, [params.initialLat, params.initialLng]);

    // ---- Handlers ----
    const animateToCoords = (lat: number, lng: number) => {
        mapRef.current?.animateToRegion(
            {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            500,
        );
    };

    const handleMyLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        animateToCoords(lat, lng);
    };

    const handleMarkerDragEnd = (e: {
        nativeEvent: { coordinate: { latitude: number; longitude: number } };
    }) => {
        const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
        setLatitude(lat);
        setLongitude(lng);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showErrorMessage('Please enter a geofence name');
            return;
        }
        const data = {
            name: name.trim(),
            lat: latitude,
            lng: longitude,
            radius,
            address: address.trim() || undefined,
            isDefault,
        };
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    locationId: params.locationId,
                    id: params.geofenceId!,
                    data,
                });
                showSuccess('Geofence updated');
            } else {
                await createMutation.mutateAsync({
                    locationId: params.locationId,
                    data,
                });
                showSuccess('Geofence created');
            }
            router.back();
        } catch (err: any) {
            showErrorMessage(err?.message ?? 'Failed to save geofence');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* ---- Header ---- */}
            <LinearGradient
                colors={
                    [
                        colors.gradient.start,
                        colors.gradient.mid,
                        colors.gradient.end,
                    ] as const
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerDecor1} />
                <View style={styles.headerDecor2} />
                <View style={styles.headerRow}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Svg width={20} height={20} viewBox="0 0 24 24">
                            <Path
                                d="M19 12H5M12 19l-7-7 7-7"
                                stroke={colors.white}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </Pressable>
                    <Text className="flex-1 text-center font-inter text-lg font-bold text-white">
                        {isEdit ? 'Edit Geofence' : 'Add Geofence'}
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ---- Map Section ---- */}
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.mapWrapper}>
                        <View style={styles.mapContainer}>
                            <MapView
                                ref={mapRef}
                                provider={
                                    Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined
                                }
                                style={StyleSheet.absoluteFill}
                                initialRegion={initialRegion}
                                showsUserLocation
                                showsMyLocationButton={false}
                            >
                                <Marker
                                    draggable
                                    coordinate={{ latitude, longitude }}
                                    onDragEnd={handleMarkerDragEnd}
                                />
                                <MapCircle
                                    center={{ latitude, longitude }}
                                    radius={radius}
                                    strokeColor={colors.primary[600]}
                                    fillColor={`${colors.primary[400]}26`}
                                    strokeWidth={2}
                                />
                            </MapView>

                            {/* Google Places Search */}
                            <View style={styles.searchOverlay}>
                                <GooglePlacesAutocomplete
                                    placeholder="Search places..."
                                    fetchDetails
                                    onPress={(_data, details) => {
                                        if (!details) return;
                                        const { lat, lng } = details.geometry.location;
                                        setLatitude(lat);
                                        setLongitude(lng);
                                        setAddress(_data.description);
                                        animateToCoords(lat, lng);
                                    }}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'en',
                                    }}
                                    styles={placesStyles}
                                    renderLeftButton={() => (
                                        <View style={styles.searchIconWrap}>
                                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                                <Path
                                                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                                                    stroke={colors.neutral[400]}
                                                    strokeWidth="2"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                />
                                            </Svg>
                                        </View>
                                    )}
                                    enablePoweredByContainer={false}
                                    keyboardShouldPersistTaps="handled"
                                    listViewDisplayed="auto"
                                />
                            </View>

                            {/* My Location button */}
                            <TouchableOpacity
                                style={styles.myLocationBtn}
                                onPress={handleMyLocation}
                            >
                                <Svg width={22} height={22} viewBox="0 0 24 24">
                                    <Path
                                        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z"
                                        fill={colors.primary[600]}
                                    />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* ---- Form Section ---- */}
                    <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.formSection}>
                        {/* Name */}
                        <View style={styles.fieldGroup}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Geofence Name <Text className="font-inter text-danger-500">*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g., Main Gate"
                                placeholderTextColor={colors.neutral[400]}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Coordinates (read-only) */}
                        <View style={styles.fieldGroup}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Coordinates
                            </Text>
                            <View style={styles.coordRow}>
                                <View style={styles.coordBox}>
                                    <Text className="font-inter text-[10px] text-neutral-400">
                                        LAT
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                        {latitude.toFixed(6)}
                                    </Text>
                                </View>
                                <View style={styles.coordBox}>
                                    <Text className="font-inter text-[10px] text-neutral-400">
                                        LNG
                                    </Text>
                                    <Text className="font-inter text-xs text-neutral-600 dark:text-neutral-400">
                                        {longitude.toFixed(6)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Radius Chip Selector */}
                        <View style={styles.fieldGroup}>
                            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Radius
                            </Text>
                            <View style={styles.radiusRow}>
                                {RADIUS_OPTIONS.map((opt) => {
                                    const isActive = radius === opt.value;
                                    return (
                                        <Pressable
                                            key={opt.value}
                                            style={[
                                                styles.radiusChip,
                                                isActive && styles.radiusChipActive,
                                            ]}
                                            onPress={() => setRadius(opt.value)}
                                        >
                                            <Text
                                                className={`font-inter text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Address */}
                        <View style={styles.fieldGroup}>
                            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                                Address
                            </Text>
                            <TextInput
                                style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                                placeholder="Auto-filled from search, or enter manually"
                                placeholderTextColor={colors.neutral[400]}
                                value={address}
                                onChangeText={setAddress}
                                multiline
                            />
                        </View>

                        {/* Set as Default */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                                    Set as Default
                                </Text>
                                <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                                    Used as the primary geofence for this location
                                </Text>
                            </View>
                            <Switch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                trackColor={{
                                    false: colors.neutral[200],
                                    true: colors.primary[400],
                                }}
                                thumbColor={isDefault ? colors.primary[600] : colors.neutral[50]}
                            />
                        </View>

                        {/* Save Button */}
                        <Pressable
                            style={[
                                styles.saveBtn,
                                isSaving && { opacity: 0.6 },
                            ]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <LinearGradient
                                colors={
                                    [
                                        colors.gradient.start,
                                        colors.gradient.mid,
                                        colors.gradient.end,
                                    ] as const
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveBtnGradient}
                            >
                                <Text className="font-inter text-base font-bold text-white">
                                    {isSaving ? 'Saving...' : 'Save Geofence'}
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============ PLACES AUTOCOMPLETE STYLES ============

const placesStyles = {
    container: { flex: 0 },
    textInputContainer: {
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden' as const,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    textInput: {
        height: 44,
        fontSize: 14,
        fontFamily: 'Inter',
        color: colors.primary[950],
        backgroundColor: 'transparent',
        marginTop: 0,
        marginBottom: 0,
    },
    listView: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 8,
        overflow: 'hidden' as const,
    },
    row: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    description: {
        fontSize: 13,
        fontFamily: 'Inter',
        color: colors.primary[950],
    },
    poweredContainer: { display: 'none' as const },
};

// ============ STYLESHEET ============

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
    },
    headerGradient: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        overflow: 'hidden',
    },
    headerDecor1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    headerDecor2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // Map
    mapWrapper: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    mapContainer: {
        height: 300,
        position: 'relative',
        backgroundColor: colors.neutral[200],
    },
    searchOverlay: {
        position: 'absolute',
        top: 8,
        left: 12,
        right: 12,
        zIndex: 999,
        elevation: 999,
    },
    searchIconWrap: {
        paddingLeft: 12,
        justifyContent: 'center',
        alignItems: 'center',
        height: 44,
    },
    myLocationBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? '#1A1730' : colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },

    // Form
    formSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    fieldGroup: {
        marginBottom: 18,
    },
    textInput: {
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Inter',
        color: colors.primary[950],
    },
    coordRow: {
        flexDirection: 'row',
        gap: 12,
    },
    coordBox: {
        flex: 1,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    radiusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    radiusChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100],
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    radiusChipActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#1A1730' : colors.white,
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
    },
    saveBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
    },
});
const styles = createStyles(false);
