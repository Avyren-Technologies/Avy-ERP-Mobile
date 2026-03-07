/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import {
    AddButton,
    ChipSelector,
    DeleteButton,
    FormInput,
    GeoFencingModal,
    PhoneInput,
    RadioOption,
    SectionCard,
    ToggleRow,
} from '../atoms';
import { FACILITY_STATUSES, FACILITY_TYPES, INDIAN_STATES } from '../constants';
import { S } from '../shared-styles';
import type { PlantBranch, Step7Form } from '../types';

// ============ FACILITY TYPE SELECTOR WITH CUSTOM OPTION ============

function FacilityTypeSelector({
    selected,
    customValue,
    onSelect,
    onCustomChange,
    onCustomSave,
}: {
    selected: string;
    customValue: string;
    onSelect: (v: string) => void;
    onCustomChange: (v: string) => void;
    onCustomSave: () => void;
}) {
    const isCustomSelected = selected === 'Custom...' || (!FACILITY_TYPES.slice(0, -1).includes(selected) && selected !== '');
    const [customInput, setCustomInput] = React.useState(isCustomSelected ? selected : '');
    const [customError, setCustomError] = React.useState('');

    const handleSelectChip = (v: string) => {
        if (v === 'Custom...') {
            onSelect('Custom...');
        } else {
            onSelect(v);
            setCustomInput('');
            setCustomError('');
        }
    };

    const handleSaveCustom = () => {
        const trimmed = customInput.trim();
        if (trimmed.length < 3) {
            setCustomError('Type must be at least 3 characters');
            return;
        }
        setCustomError('');
        onCustomChange(trimmed);
        onCustomSave();
        onSelect(trimmed);
    };

    const displaySelected = isCustomSelected && selected !== 'Custom...' ? selected : selected;

    return (
        <View style={S.fieldWrap}>
            <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900">
                Facility Type <Text className="text-danger-500">*</Text>
            </Text>
            <ChipSelector
                label=""
                options={[...FACILITY_TYPES]}
                selected={displaySelected === 'Custom...' ? 'Custom...' : displaySelected}
                onSelect={handleSelectChip}
            />

            {(selected === 'Custom...' || (isCustomSelected && selected !== 'Custom...')) && (
                <Animated.View entering={FadeIn.duration(150)}>
                    <TextInput
                        style={S.customTypeInput}
                        placeholder="Type your facility type (e.g. Cold Storage, Co-Working)"
                        placeholderTextColor={colors.neutral[400]}
                        value={customInput}
                        onChangeText={(v) => {
                            setCustomInput(v);
                            setCustomError('');
                        }}
                        autoCapitalize="words"
                    />
                    {customError ? (
                        <Text className="mt-1 font-inter text-xs text-danger-500">
                            {customError}
                        </Text>
                    ) : null}
                    <Pressable style={S.customTypeSaveBtn} onPress={handleSaveCustom}>
                        <Text className="font-inter text-sm font-bold text-white">
                            Save & Use "{customInput || '...'}"
                        </Text>
                    </Pressable>
                    {isCustomSelected && selected !== 'Custom...' && (
                        <Text className="mt-1 font-inter text-xs text-success-600">
                            ✓ Custom type "{selected}" saved
                        </Text>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

// ============ GEO FENCING BUTTON + MODAL ============

function GeoFencingField({
    enabled,
    onToggle,
    locationName,
    lat,
    lng,
    radius,
    shape,
    onUpdate,
}: {
    enabled: boolean;
    onToggle: (v: boolean) => void;
    locationName: string;
    lat: string;
    lng: string;
    radius: number;
    shape: 'circle' | 'freeform';
    onUpdate: (data: { locationName: string; lat: string; lng: string; radius: number; shape: 'circle' | 'freeform' }) => void;
}) {
    const [modalVisible, setModalVisible] = React.useState(false);

    return (
        <View style={S.fieldWrap}>
            <ToggleRow
                label="Geo-Fencing"
                subtitle="Restrict attendance punch-in to a defined geographic area"
                value={enabled}
                onToggle={onToggle}
            />

            {enabled && (
                <Animated.View entering={FadeIn.duration(200)}>
                    {/* Current configuration display */}
                    {locationName ? (
                        <View
                            style={{
                                backgroundColor: colors.success[50],
                                borderRadius: 12,
                                padding: 12,
                                marginTop: 8,
                                borderWidth: 1,
                                borderColor: colors.success[200],
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                    fill={colors.success[500]}
                                />
                                <Path d="M12 6a3 3 0 110 6 3 3 0 010-6z" fill="white" />
                            </Svg>
                            <View style={{ flex: 1 }}>
                                <Text className="font-inter text-xs font-bold text-success-700">
                                    Location Set
                                </Text>
                                <Text className="font-inter text-sm text-neutral-700" numberOfLines={1}>
                                    {locationName}
                                </Text>
                                <Text className="font-inter text-xs text-neutral-500">
                                    {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} radius · {shape}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setModalVisible(true)}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: colors.success[100],
                                }}
                            >
                                <Text className="font-inter text-xs font-semibold text-success-700">
                                    Edit
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            onPress={() => setModalVisible(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                marginTop: 8,
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: colors.primary[200],
                                borderStyle: 'dashed',
                                backgroundColor: colors.primary[50],
                                justifyContent: 'center',
                            }}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24">
                                <Path
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                                    stroke={colors.primary[500]}
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                                <Path d="M12 6a3 3 0 110 6 3 3 0 010-6z" fill={colors.primary[500]} />
                            </Svg>
                            <Text className="font-inter text-sm font-semibold text-primary-600">
                                Set Location on Map
                            </Text>
                        </Pressable>
                    )}

                    <GeoFencingModal
                        visible={modalVisible}
                        onClose={() => setModalVisible(false)}
                        initialData={{ locationName, lat, lng, radius: radius || 200, shape: shape || 'circle' }}
                        onConfirm={(data) => {
                            onUpdate(data);
                            setModalVisible(false);
                        }}
                    />
                </Animated.View>
            )}
        </View>
    );
}

// ============ SINGLE PLANT/BRANCH CARD ============

function PlantBranchCard({
    item,
    index,
    isHQ,
    onUpdate,
    onSetHQ,
    onRemove,
    errors,
}: {
    item: PlantBranch;
    index: number;
    isHQ: boolean;
    onUpdate: (updates: Partial<PlantBranch>) => void;
    onSetHQ: () => void;
    onRemove: () => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View
            entering={FadeIn.duration(250)}
            style={[S.itemCard, isHQ && S.hqCard]}
        >
            {/* Card Header */}
            <View style={S.itemCardHeader}>
                <View style={S.itemCardBadge}>
                    <Text className="font-inter text-xs font-bold text-primary-700">
                        Location {index + 1}
                        {isHQ ? ' — HQ' : ''}
                    </Text>
                </View>
                <View style={S.rowCenter}>
                    <Pressable
                        onPress={onSetHQ}
                        style={[S.hqToggleBtn, isHQ && S.hqToggleBtnActive]}
                    >
                        <Text
                            className={`font-inter text-[10px] font-bold ${isHQ ? 'text-primary-700' : 'text-neutral-500'}`}
                        >
                            {isHQ ? '★ HQ' : 'Set HQ'}
                        </Text>
                    </Pressable>
                    <DeleteButton onPress={onRemove} />
                </View>
            </View>

            {/* ---- Basic Info ---- */}
            <Text className="mb-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Basic Information
            </Text>

            <FormInput
                label="Location Name"
                placeholder='e.g. "Bengaluru HQ", "Pune Plant"'
                value={item.name}
                onChangeText={(v) => onUpdate({ name: v })}
                required
                autoCapitalize="words"
                error={errors?.name}
            />

            <View style={S.twoColumn}>
                <View style={{ flex: 1 }}>
                    <FormInput
                        label="Location Code"
                        placeholder="BLR-HQ-001"
                        value={item.code}
                        onChangeText={(v) => onUpdate({ code: v })}
                        required
                        autoCapitalize="none"
                        error={errors?.code}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <ChipSelector
                        label="Status"
                        options={FACILITY_STATUSES}
                        selected={item.status}
                        onSelect={(v) => onUpdate({ status: v })}
                    />
                </View>
            </View>

            <FacilityTypeSelector
                selected={item.facilityType}
                customValue={item.customFacilityType}
                onSelect={(v) => onUpdate({ facilityType: v })}
                onCustomChange={(v) => onUpdate({ customFacilityType: v })}
                onCustomSave={() => {}}
            />

            {/* ---- GST ---- */}
            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                GST Details
            </Text>
            <FormInput
                label="Location GSTIN"
                placeholder="29AARCA5678F1Z3"
                value={item.gstin}
                onChangeText={(v) => onUpdate({ gstin: v.toUpperCase() })}
                autoCapitalize="none"
                hint="A separate GSTIN is required for each state of operation"
            />

            {/* ---- Address ---- */}
            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Address
            </Text>
            <FormInput
                label="Address Line 1"
                placeholder="Street, plot, building"
                value={item.addressLine1}
                onChangeText={(v) => onUpdate({ addressLine1: v })}
                required
                error={errors?.addressLine1}
            />
            <FormInput
                label="Address Line 2"
                placeholder="Area, landmark"
                value={item.addressLine2}
                onChangeText={(v) => onUpdate({ addressLine2: v })}
            />
            <View style={S.twoColumn}>
                <View style={{ flex: 1 }}>
                    <FormInput
                        label="City"
                        placeholder="City"
                        value={item.city}
                        onChangeText={(v) => onUpdate({ city: v })}
                        required
                        autoCapitalize="words"
                        error={errors?.city}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <FormInput
                        label="PIN Code"
                        placeholder="560001"
                        value={item.pin}
                        onChangeText={(v) => onUpdate({ pin: v })}
                        keyboardType="number-pad"
                        error={errors?.pin}
                    />
                </View>
            </View>
            <ChipSelector
                label="State"
                options={INDIAN_STATES}
                selected={item.state}
                onSelect={(v) => onUpdate({ state: v })}
                error={errors?.state}
            />

            {/* ---- Contact Person ---- */}
            <Text className="mb-2 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Location Contact
            </Text>
            <FormInput
                label="Contact Person Name"
                placeholder="Full name"
                value={item.contactName}
                onChangeText={(v) => onUpdate({ contactName: v })}
                autoCapitalize="words"
            />
            <FormInput
                label="Designation"
                placeholder="Branch Manager, Plant Head"
                value={item.contactDesignation}
                onChangeText={(v) => onUpdate({ contactDesignation: v })}
                autoCapitalize="words"
            />
            <FormInput
                label="Email"
                placeholder="branch@company.com"
                value={item.contactEmail}
                onChangeText={(v) => onUpdate({ contactEmail: v })}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <PhoneInput
                label="Phone Number"
                countryCode={item.contactCountryCode}
                phone={item.contactPhone}
                onCountryCodeChange={(c) => onUpdate({ contactCountryCode: c })}
                onPhoneChange={(p) => onUpdate({ contactPhone: p })}
            />

            {/* ---- Geo-Fencing ---- */}
            <Text className="mb-1 mt-2 font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
                Geo-Fencing
            </Text>
            <GeoFencingField
                enabled={item.geoEnabled}
                onToggle={(v) => onUpdate({ geoEnabled: v })}
                locationName={item.geoLocationName}
                lat={item.geoLat}
                lng={item.geoLng}
                radius={item.geoRadius}
                shape={item.geoShape}
                onUpdate={(data) =>
                    onUpdate({
                        geoLocationName: data.locationName,
                        geoLat: data.lat,
                        geoLng: data.lng,
                        geoRadius: data.radius,
                        geoShape: data.shape,
                    })
                }
            />
        </Animated.View>
    );
}

// ============ MAIN STEP ============

export function Step7PlantsBranches({
    form,
    setForm,
    locations,
    setLocations,
    errors,
}: {
    form: Step7Form;
    setForm: (f: Partial<Step7Form>) => void;
    locations: PlantBranch[];
    setLocations: (p: PlantBranch[]) => void;
    errors?: Record<string, string>;
}) {
    const addLocation = () => {
        setLocations([
            ...locations,
            {
                id: Date.now().toString(),
                name: '',
                code: '',
                facilityType: '',
                customFacilityType: '',
                status: 'Active',
                isHQ: locations.length === 0,
                gstin: '',
                stateGST: '',
                addressLine1: '',
                addressLine2: '',
                city: '',
                district: '',
                state: '',
                pin: '',
                country: 'India',
                contactName: '',
                contactDesignation: '',
                contactEmail: '',
                contactCountryCode: '+91',
                contactPhone: '',
                geoEnabled: false,
                geoLocationName: '',
                geoLat: '',
                geoLng: '',
                geoRadius: 200,
                geoShape: 'circle',
            },
        ]);
    };

    const updateLocation = (id: string, updates: Partial<PlantBranch>) => {
        setLocations(locations.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    };

    const setHQ = (id: string) => {
        setLocations(locations.map((l) => ({ ...l, isHQ: l.id === id })));
    };

    const removeLocation = (id: string) => {
        const filtered = locations.filter((l) => l.id !== id);
        // Re-assign HQ if the removed location was HQ
        if (filtered.length > 0 && !filtered.some((l) => l.isHQ)) {
            filtered[0].isHQ = true;
        }
        setLocations(filtered);
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    Define all physical locations — plants, branches, offices, and warehouses — under this company. Each location can have its own address, geo-fencing boundary, GST registration, and contact person.
                </Text>
            </View>

            <SectionCard title="Multi-Location Configuration">
                <ToggleRow
                    label="Multi-Location Mode"
                    subtitle="Enable if the company operates from multiple plants or branch locations"
                    value={form.multiLocationMode}
                    onToggle={(v) => setForm({ multiLocationMode: v })}
                />
                {form.multiLocationMode && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <Text className="mb-2 mt-3 font-inter text-xs font-bold text-neutral-500">
                            Data Management Strategy
                        </Text>
                        <RadioOption
                            label="Common Configuration"
                            subtitle="All locations share the same shift schedules, No Series, and IOT Reason lists"
                            selected={form.locationConfig === 'common'}
                            onSelect={() => setForm({ locationConfig: 'common' })}
                        />
                        <RadioOption
                            label="Per-Location Configuration"
                            subtitle="Each location has its own independent schedules and serial tracking"
                            selected={form.locationConfig === 'per-location'}
                            onSelect={() => setForm({ locationConfig: 'per-location' })}
                        />
                    </Animated.View>
                )}
            </SectionCard>

            {locations.map((location, idx) => {
                // Extract per-card errors: keys like name_0, code_0 → name, code for this card
                const cardErrors: Record<string, string> = {};
                if (errors) {
                    for (const [key, msg] of Object.entries(errors)) {
                        const suffix = `_${idx}`;
                        if (key.endsWith(suffix)) {
                            cardErrors[key.slice(0, -suffix.length)] = msg;
                        }
                    }
                }
                return (
                    <PlantBranchCard
                        key={location.id}
                        item={location}
                        index={idx}
                        isHQ={location.isHQ}
                        onUpdate={(updates) => updateLocation(location.id, updates)}
                        onSetHQ={() => setHQ(location.id)}
                        onRemove={() => removeLocation(location.id)}
                        errors={Object.keys(cardErrors).length > 0 ? cardErrors : undefined}
                    />
                );
            })}

            <AddButton onPress={addLocation} label="Add Location / Plant / Branch" />
        </Animated.View>
    );
}
