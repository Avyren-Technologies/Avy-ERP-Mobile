/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as Location from 'expo-location';
import * as React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Circle as MapCircle, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import Constants from 'expo-constants';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { COUNTRY_CODES, GEO_RADIUS_OPTIONS } from './constants';
import { S } from './shared-styles';

// ============ FORM LABEL ============

export function FormLabel({ text, required }: { text: string; required?: boolean }) {
    return (
        <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
            {text}
            {required && <Text className="text-danger-500"> *</Text>}
        </Text>
    );
}

// ============ FORM INPUT ============

export function FormInput({
    label,
    placeholder,
    value,
    onChangeText,
    required,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    multiline = false,
    hint,
    secureTextEntry,
    rightElement,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    required?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'url' | 'numeric';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    multiline?: boolean;
    hint?: string;
    secureTextEntry?: boolean;
    rightElement?: React.ReactNode;
}) {
    return (
        <View style={S.fieldWrap}>
            <FormLabel text={label} required={required} />
            <View
                style={[
                    S.fieldInput,
                    multiline ? { height: 80, alignItems: 'flex-start' } : undefined,
                    rightElement ? { flexDirection: 'row', alignItems: 'center' } : undefined,
                ]}
            >
                <TextInput
                    style={[S.textInput, multiline && { height: 70, textAlignVertical: 'top' }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    multiline={multiline}
                    secureTextEntry={secureTextEntry}
                />
                {rightElement}
            </View>
            {hint && (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            )}
        </View>
    );
}

// ============ SECRET INPUT (masked with eye toggle) ============

export function SecretInput({
    label,
    placeholder,
    value,
    onChangeText,
    required,
    hint,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    required?: boolean;
    hint?: string;
}) {
    const [visible, setVisible] = React.useState(false);

    return (
        <View style={S.fieldWrap}>
            <FormLabel text={label} required={required} />
            <View style={S.secretInputRow}>
                <TextInput
                    style={[S.textInput]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.neutral[400]}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <Pressable onPress={() => setVisible((v) => !v)} style={S.eyeBtn}>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                        {visible ? (
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
            {hint && (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            )}
        </View>
    );
}

// ============ CHIP SELECTOR (single) ============

export function ChipSelector({
    label,
    options,
    selected,
    onSelect,
    required,
    hint,
}: {
    label: string;
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    required?: boolean;
    hint?: string;
}) {
    return (
        <View style={S.fieldWrap}>
            <FormLabel text={label} required={required} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={S.chipRow}>
                    {options.map((opt) => (
                        <Pressable
                            key={opt}
                            onPress={() => onSelect(opt)}
                            style={[S.chip, selected === opt && S.chipActive]}
                        >
                            <Text
                                className={`font-inter text-xs font-semibold ${selected === opt ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {opt}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
            {hint && (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            )}
        </View>
    );
}

// ============ MULTI CHIP SELECTOR ============

export function MultiChipSelector({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
}) {
    return (
        <View style={S.fieldWrap}>
            <FormLabel text={label} />
            <View style={S.chipGrid}>
                {options.map((opt) => {
                    const isSelected = selected.includes(opt);
                    return (
                        <Pressable
                            key={opt}
                            onPress={() => onToggle(opt)}
                            style={[S.chip, isSelected && S.chipActive]}
                        >
                            <Text
                                className={`font-inter text-xs font-semibold ${isSelected ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {opt}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

// ============ TOGGLE ROW ============

export function ToggleRow({
    label,
    subtitle,
    value,
    onToggle,
}: {
    label: string;
    subtitle?: string;
    value: boolean;
    onToggle: (v: boolean) => void;
}) {
    return (
        <View style={S.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="font-inter text-sm font-semibold text-primary-950">{label}</Text>
                {subtitle && (
                    <Text className="mt-0.5 font-inter text-xs text-neutral-500" numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: colors.neutral[200], true: colors.primary[400] }}
                thumbColor={value ? colors.primary[600] : colors.neutral[300]}
            />
        </View>
    );
}

// ============ SECTION CARD ============

export function SectionCard({ children, title }: { children: React.ReactNode; title?: string }) {
    return (
        <View style={S.sectionCard}>
            {title && (
                <Text className="mb-3 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {title}
                </Text>
            )}
            {children}
        </View>
    );
}

// ============ RADIO OPTION ============

export function RadioOption({
    label,
    subtitle,
    selected,
    onSelect,
    badge,
}: {
    label: string;
    subtitle?: string;
    selected: boolean;
    onSelect: () => void;
    badge?: string;
}) {
    return (
        <Pressable
            onPress={onSelect}
            style={[S.radioOption, selected && S.radioOptionActive]}
        >
            <View style={[S.radioCircle, selected && S.radioCircleActive]}>
                {selected && <View style={S.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
                <Text
                    className={`font-inter text-sm font-semibold ${selected ? 'text-primary-700' : 'text-primary-950'}`}
                >
                    {label}
                </Text>
                {subtitle && (
                    <Text className="font-inter text-xs text-neutral-500">{subtitle}</Text>
                )}
            </View>
            {badge && (
                <View style={S.recommendedBadge}>
                    <Text className="font-inter text-[10px] font-bold text-success-700">{badge}</Text>
                </View>
            )}
        </Pressable>
    );
}

// ============ ADD BUTTON ============

export function AddButton({ onPress, label }: { onPress: () => void; label: string }) {
    return (
        <Pressable onPress={onPress} style={S.addButton}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                    d="M12 5v14M5 12h14"
                    stroke={colors.primary[600]}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </Svg>
            <Text className="font-inter text-sm font-semibold text-primary-600">{label}</Text>
        </Pressable>
    );
}

// ============ DELETE BUTTON ============

export function DeleteButton({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={S.deleteIconBtn}>
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
    );
}

// ============ COUNTRY CODE PICKER ============

export function CountryCodePicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (code: string) => void;
}) {
    const [visible, setVisible] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const insets = useSafeAreaInsets();

    const selected = COUNTRY_CODES.find((c) => c.code === value) ?? COUNTRY_CODES[0];

    const filtered = React.useMemo(
        () =>
            COUNTRY_CODES.filter(
                (c) =>
                    c.country.toLowerCase().includes(search.toLowerCase()) ||
                    c.code.includes(search)
            ),
        [search]
    );

    return (
        <>
            <Pressable
                onPress={() => {
                    setSearch('');
                    setVisible(true);
                }}
                style={S.countryCodeBtn}
            >
                <Text style={{ fontSize: 18 }}>{selected.flag}</Text>
                <Text className="font-inter text-sm font-semibold text-primary-950">
                    {selected.code}
                </Text>
                <Svg width={12} height={12} viewBox="0 0 24 24">
                    <Path
                        d="M6 9l6 6 6-6"
                        stroke={colors.neutral[400]}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Pressable>

            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setVisible(false)}
            >
                <View
                    style={[S.countryPickerModal, { paddingTop: insets.top }]}
                >
                    <View style={S.countryPickerHeader}>
                        <Pressable onPress={() => setVisible(false)}>
                            <Text className="font-inter text-sm font-semibold text-primary-600">
                                Cancel
                            </Text>
                        </Pressable>
                        <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                            Select Country
                        </Text>
                        <View style={{ width: 52 }} />
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                        <View style={[S.geoSearchInput, { shadowOpacity: 0.06 }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path
                                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                                    stroke={colors.neutral[400]}
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </Svg>
                            <TextInput
                                style={S.geoSearchTextInput}
                                placeholder="Search country or code..."
                                placeholderTextColor={colors.neutral[400]}
                                value={search}
                                onChangeText={setSearch}
                                autoFocus
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.code}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <Pressable
                                style={[
                                    S.countryItem,
                                    item.code === value && S.countryItemActive,
                                ]}
                                onPress={() => {
                                    onChange(item.code);
                                    setVisible(false);
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                                <Text className="flex-1 font-inter text-sm text-primary-950">
                                    {item.country}
                                </Text>
                                <Text className="font-inter text-sm font-semibold text-neutral-500">
                                    {item.code}
                                </Text>
                                {item.code === value && (
                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                        <Path
                                            d="M5 12l5 5L20 7"
                                            stroke={colors.primary[600]}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                )}
                            </Pressable>
                        )}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    />
                </View>
            </Modal>
        </>
    );
}

// ============ PHONE INPUT WITH COUNTRY CODE ============

export function PhoneInput({
    label,
    countryCode,
    phone,
    onCountryCodeChange,
    onPhoneChange,
    required,
    hint,
}: {
    label: string;
    countryCode: string;
    phone: string;
    onCountryCodeChange: (c: string) => void;
    onPhoneChange: (p: string) => void;
    required?: boolean;
    hint?: string;
}) {
    return (
        <View style={S.fieldWrap}>
            <FormLabel text={label} required={required} />
            <View style={S.phoneInputRow}>
                <CountryCodePicker value={countryCode} onChange={onCountryCodeChange} />
                <View style={[S.fieldInput, { flex: 1 }]}>
                    <TextInput
                        style={S.textInput}
                        placeholder="98765 43210"
                        placeholderTextColor={colors.neutral[400]}
                        value={phone}
                        onChangeText={onPhoneChange}
                        keyboardType="phone-pad"
                    />
                </View>
            </View>
            {hint && (
                <Text className="mt-1 font-inter text-[10px] text-neutral-400">{hint}</Text>
            )}
        </View>
    );
}

// ============ GEO FENCING MODAL ============

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? '';

const DEFAULT_REGION: Region = {
    latitude: 20.5937, // India geographic center
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
};

interface GeoFencingData {
    locationName: string;
    lat: string;
    lng: string;
    radius: number;
    shape: 'circle' | 'freeform';
}

export function GeoFencingModal({
    visible,
    onClose,
    initialData,
    onConfirm,
}: {
    visible: boolean;
    onClose: () => void;
    initialData: GeoFencingData;
    onConfirm: (data: GeoFencingData) => void;
}) {
    const insets = useSafeAreaInsets();
    const mapRef = React.useRef<MapView>(null);
    const [localData, setLocalData] = React.useState<GeoFencingData>(initialData);

    React.useEffect(() => {
        if (visible) setLocalData(initialData);
    }, [visible, initialData]);

    const initialRegion = React.useMemo<Region>(() => {
        if (initialData.lat && initialData.lng) {
            return {
                latitude: parseFloat(initialData.lat),
                longitude: parseFloat(initialData.lng),
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
        }
        return DEFAULT_REGION;
    }, [initialData.lat, initialData.lng]);

    const handleRegionChangeComplete = (region: Region) => {
        setLocalData((prev) => ({
            ...prev,
            lat: region.latitude.toFixed(6),
            lng: region.longitude.toFixed(6),
        }));
    };

    const handleMyLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const region: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        mapRef.current?.animateToRegion(region, 500);
        setLocalData((prev) => ({
            ...prev,
            locationName: 'Current Location',
            lat: loc.coords.latitude.toFixed(6),
            lng: loc.coords.longitude.toFixed(6),
        }));
    };

    const handleConfirm = () => {
        onConfirm(localData);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={[geoStyles.container, { paddingTop: insets.top }]}>
                {/* ---- Header ---- */}
                <View style={S.geoHeader}>
                    <Pressable onPress={onClose} style={geoStyles.closeBtn}>
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
                    <Text className="flex-1 text-center font-inter text-base font-bold text-primary-950">
                        Set Geofencing Area
                    </Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* ---- Map Area ---- */}
                <View style={geoStyles.mapContainer}>
                    {/* Real Google Map */}
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={StyleSheet.absoluteFill}
                        initialRegion={initialRegion}
                        onRegionChangeComplete={handleRegionChangeComplete}
                        showsUserLocation
                        showsMyLocationButton={false}
                    >
                        {localData.lat !== '' && localData.lng !== '' && (
                            <MapCircle
                                center={{
                                    latitude: parseFloat(localData.lat),
                                    longitude: parseFloat(localData.lng),
                                }}
                                radius={localData.radius}
                                strokeColor={colors.primary[500]}
                                fillColor={`${colors.primary[400]}33`}
                                strokeWidth={2}
                                lineDashPattern={localData.shape === 'freeform' ? [10, 5] : undefined}
                            />
                        )}
                    </MapView>

                    {/* GooglePlacesAutocomplete floating over map */}
                    <View style={geoStyles.searchOverlay}>
                        <GooglePlacesAutocomplete
                            key={visible ? 'open' : 'closed'}
                            placeholder="Search city, area or address..."
                            fetchDetails
                            onPress={(data, details) => {
                                if (!details) return;
                                const { lat, lng } = details.geometry.location;
                                const region: Region = {
                                    latitude: lat,
                                    longitude: lng,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                };
                                mapRef.current?.animateToRegion(region, 500);
                                setLocalData((prev) => ({
                                    ...prev,
                                    locationName: data.description,
                                    lat: lat.toFixed(6),
                                    lng: lng.toFixed(6),
                                }));
                            }}
                            query={{ key: GOOGLE_MAPS_API_KEY, language: 'en' }}
                            styles={placesStyles}
                            renderLeftButton={() => (
                                <View style={geoStyles.searchIconWrap}>
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

                    {/* Center crosshair pin (fixed, non-interactive) */}
                    <View style={S.geoCrosshair} pointerEvents="none">
                        <Svg width={48} height={56} viewBox="0 0 48 56">
                            <Path
                                d="M24 2C14.06 2 6 10.06 6 20c0 13 18 34 18 34s18-21 18-34C42 10.06 33.94 2 24 2z"
                                fill={colors.primary[600]}
                                opacity={0.9}
                            />
                            <Circle cx="24" cy="20" r="8" fill="white" opacity={0.9} />
                            <Circle cx="24" cy="20" r="4" fill={colors.primary[600]} />
                        </Svg>
                    </View>

                    {/* My location button */}
                    <TouchableOpacity style={S.geoMyLocationBtn} onPress={handleMyLocation}>
                        <Svg width={22} height={22} viewBox="0 0 24 24">
                            <Path
                                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z"
                                fill={colors.primary[600]}
                            />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* ---- Bottom Control Panel ---- */}
                <View style={[S.geoBottomPanel, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={S.geoHandle} />

                    {/* Selected location display */}
                    {localData.locationName ? (
                        <View style={S.geoLocationDisplay}>
                            <Svg width={16} height={16} viewBox="0 0 24 24">
                                <Path
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                    fill={colors.primary[500]}
                                />
                            </Svg>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-primary-700">
                                    Selected Location
                                </Text>
                                <Text className="font-inter text-sm text-primary-950" numberOfLines={1}>
                                    {localData.locationName}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={S.geoLocationDisplay}>
                            <Text className="font-inter text-xs text-neutral-500">
                                Search above or drag the map to position the pin
                            </Text>
                        </View>
                    )}

                    {/* Radius selector */}
                    <Text className="mb-2 font-inter text-xs font-bold text-neutral-500">
                        GEOFENCING RADIUS
                    </Text>
                    <View style={S.geoRadiusRow}>
                        {GEO_RADIUS_OPTIONS.map((opt) => (
                            <Pressable
                                key={opt.value}
                                style={[
                                    S.geoRadiusChip,
                                    localData.radius === opt.value && S.geoRadiusChipActive,
                                ]}
                                onPress={() => setLocalData((p) => ({ ...p, radius: opt.value }))}
                            >
                                <Text
                                    className={`font-inter text-xs font-semibold ${localData.radius === opt.value ? 'text-primary-700' : 'text-neutral-600'}`}
                                >
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Shape selector */}
                    <Text className="mb-2 font-inter text-xs font-bold text-neutral-500">
                        BOUNDARY SHAPE
                    </Text>
                    <View style={S.geoShapeRow}>
                        <Pressable
                            style={[S.geoShapeBtn, localData.shape === 'circle' && S.geoShapeBtnActive]}
                            onPress={() => setLocalData((p) => ({ ...p, shape: 'circle' }))}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Circle
                                    cx="12" cy="12" r="9"
                                    stroke={localData.shape === 'circle' ? colors.primary[600] : colors.neutral[400]}
                                    strokeWidth="2"
                                    fill="none"
                                />
                            </Svg>
                            <Text className={`font-inter text-sm font-semibold ${localData.shape === 'circle' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                Circle
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[S.geoShapeBtn, localData.shape === 'freeform' && S.geoShapeBtnActive]}
                            onPress={() => setLocalData((p) => ({ ...p, shape: 'freeform' }))}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M3 12 C5 5, 12 2, 18 7 C22 10, 21 19, 15 21 C8 23, 2 19, 3 12Z"
                                    stroke={localData.shape === 'freeform' ? colors.primary[600] : colors.neutral[400]}
                                    strokeWidth="2"
                                    fill="none"
                                />
                            </Svg>
                            <Text className={`font-inter text-sm font-semibold ${localData.shape === 'freeform' ? 'text-primary-700' : 'text-neutral-500'}`}>
                                Freeform
                            </Text>
                        </Pressable>
                    </View>

                    {/* Confirm */}
                    <Pressable
                        style={[S.geoConfirmBtn, !localData.locationName && { backgroundColor: colors.neutral[300] }]}
                        onPress={handleConfirm}
                        disabled={!localData.locationName}
                    >
                        <Text className="font-inter text-base font-bold text-white">
                            {localData.locationName
                                ? `Confirm · ${localData.radius >= 1000 ? `${localData.radius / 1000}km` : `${localData.radius}m`} ${localData.shape}`
                                : 'Select a location first'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// Styles for GooglePlacesAutocomplete (passed via styles prop)
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
        height: 48,
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

const geoStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    mapContainer: { flex: 1, position: 'relative' },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
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
        height: 48,
    },
});
