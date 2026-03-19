/* eslint-disable better-tailwindcss/no-unknown-classes */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

import { FormDatePicker, FormInput, FormSelect, RadioOption, SectionCard } from '../atoms';
import type { Step1Form } from '../types';
import { BUSINESS_TYPES, COMPANY_STATUSES, INDUSTRIES } from '../constants';
import { S } from '../shared-styles';

export function Step1Identity({
    form,
    setForm,
    errors,
}: {
    form: Step1Form;
    setForm: (f: Partial<Step1Form>) => void;
    errors?: Record<string, string>;
}) {
    const [showOptions, setShowOptions] = React.useState(false);
    const [permissionError, setPermissionError] = React.useState('');

    const pickFromGallery = async () => {
        setShowOptions(false);
        setPermissionError('');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setPermissionError('Photo library access is required. Please enable it in Settings.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            const base64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '';
            setForm({ logoUri: asset.uri, logoBase64: base64 || asset.uri });
        }
    };

    const takePhoto = async () => {
        setShowOptions(false);
        setPermissionError('');
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            setPermissionError('Camera access is required. Please enable it in Settings.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            const base64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '';
            setForm({ logoUri: asset.uri, logoBase64: base64 || asset.uri });
        }
    };

    const removeLogo = () => {
        setForm({ logoUri: '', logoBase64: '' });
        setShowOptions(false);
    };

    const isCorporate = ['Private Limited (Pvt. Ltd.)', 'Public Limited'].includes(form.businessType);

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Company Logo">
                {/* ---- Original upload button (now functional) ---- */}
                <Pressable
                    style={S.logoUpload}
                    onPress={() => setShowOptions((v) => !v)}
                >
                    <View style={S.logoPlaceholder}>
                        {form.logoUri ? (
                            <Image
                                source={{ uri: form.logoUri }}
                                style={ls.logoThumb}
                                contentFit="cover"
                            />
                        ) : (
                            <Svg width={28} height={28} viewBox="0 0 24 24">
                                <Path
                                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                                    stroke={colors.primary[400]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        )}
                    </View>
                    <View style={S.logoUploadText}>
                        {form.logoUri ? (
                            <>
                                <Text className="font-inter text-sm font-semibold text-success-600">
                                    Logo Uploaded
                                </Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-400">
                                    Tap to change or remove
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text className="font-inter text-sm font-semibold text-primary-600">
                                    Upload Company Logo
                                </Text>
                                <Text className="mt-0.5 font-inter text-xs text-neutral-400">
                                    PNG, JPG · Max 2MB · 200×200px Recommended
                                </Text>
                            </>
                        )}
                    </View>
                    {/* Chevron to indicate tappable */}
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path
                            d={showOptions ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                            stroke={colors.neutral[400]}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </Pressable>

                {/* ---- Inline options panel ---- */}
                {showOptions && (
                    <Animated.View entering={FadeIn.duration(180)} style={ls.optionsPanel}>
                        <Pressable style={ls.optionRow} onPress={pickFromGallery}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    stroke={colors.primary[600]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                            <Text className="font-inter text-sm font-semibold text-primary-800">
                                Photo Library
                            </Text>
                        </Pressable>

                        <View style={ls.divider} />

                        <Pressable style={ls.optionRow} onPress={takePhoto}>
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                                    stroke={colors.primary[600]}
                                    strokeWidth="1.8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <Path
                                    d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                                    stroke={colors.primary[600]}
                                    strokeWidth="1.8"
                                    fill="none"
                                />
                            </Svg>
                            <Text className="font-inter text-sm font-semibold text-primary-800">
                                Take Photo
                            </Text>
                        </Pressable>

                        {form.logoUri && (
                            <>
                                <View style={ls.divider} />
                                <Pressable style={ls.optionRow} onPress={removeLogo}>
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path
                                            d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                            stroke={colors.danger[500]}
                                            strokeWidth="1.8"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                    <Text className="font-inter text-sm font-semibold text-danger-600">
                                        Remove Logo
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </Animated.View>
                )}

                {permissionError ? (
                    <View style={S.logoPermissionError}>
                        <Text className="font-inter text-xs text-danger-700">
                            {permissionError}
                        </Text>
                    </View>
                ) : null}
            </SectionCard>

            <SectionCard title="Core Identity">
                <FormInput
                    label="Display Name"
                    placeholder="e.g. Apex Manufacturing"
                    value={form.displayName}
                    onChangeText={(v) => setForm({ displayName: v })}
                    required
                    error={errors?.displayName}
                />
                <FormInput
                    label="Legal / Registered Name"
                    placeholder="Full name as per incorporation documents"
                    value={form.legalName}
                    onChangeText={(v) => setForm({ legalName: v })}
                    required
                    error={errors?.legalName}
                />
                <FormSelect
                    label="Business Type"
                    options={BUSINESS_TYPES}
                    selected={form.businessType}
                    onSelect={(v) => setForm({ businessType: v })}
                    required
                    error={errors?.businessType}
                />
                <FormSelect
                    label="Nature of Industry"
                    options={INDUSTRIES}
                    selected={form.industry}
                    onSelect={(v) => setForm({ industry: v })}
                    required
                    error={errors?.industry}
                />
                <FormInput
                    label="Company Code"
                    placeholder="e.g. ABC-IN-001 (auto-generated)"
                    value={form.companyCode}
                    onChangeText={(v) => setForm({ companyCode: v })}
                    required
                    autoCapitalize="none"
                    hint="Auto-generated based on company name. Override if needed."
                    error={errors?.companyCode}
                />
                <FormInput
                    label="Short Name"
                    placeholder="Abbreviated name for headers"
                    value={form.shortName}
                    onChangeText={(v) => setForm({ shortName: v })}
                />
                <FormDatePicker
                    label={isCorporate ? 'Date of Incorporation' : form.businessType === 'Partnership' ? 'Partnership Deed Date' : 'Business Registration Date'}
                    value={form.incorporationDate}
                    onChange={(v) => setForm({ incorporationDate: v })}
                    required
                    error={errors?.incorporationDate}
                />
                <FormInput
                    label="Approx Employee Count"
                    placeholder="e.g. 120"
                    value={form.employees}
                    onChangeText={(v) => setForm({ employees: v })}
                    keyboardType="number-pad"
                    hint="Used to derive initial company size bucket"
                    error={errors?.employees}
                />
                {isCorporate && (
                    <FormInput
                        label="CIN Number"
                        placeholder="U72900KA2019PTC312847"
                        value={form.cin}
                        onChangeText={(v) => setForm({ cin: v })}
                        autoCapitalize="none"
                        error={errors?.cin}
                    />
                )}
                <FormInput
                    label="Official Website"
                    placeholder="https://company.com"
                    value={form.website}
                    onChangeText={(v) => setForm({ website: v })}
                    keyboardType="url"
                    autoCapitalize="none"
                    error={errors?.website}
                />
                <FormInput
                    label="Corporate Email Domain"
                    placeholder="company.com"
                    value={form.emailDomain}
                    onChangeText={(v) => setForm({ emailDomain: v })}
                    required
                    keyboardType="email-address"
                    autoCapitalize="none"
                    hint="Used for auto-provisioning employee email IDs."
                    error={errors?.emailDomain}
                />
            </SectionCard>

            <SectionCard title="Company Status">
                {COMPANY_STATUSES.map((s) => (
                    <RadioOption
                        key={s}
                        label={s}
                        selected={form.status === s}
                        onSelect={() => setForm({ status: s })}
                        badge={s === 'Draft' ? 'DEFAULT' : undefined}
                    />
                ))}
            </SectionCard>
        </Animated.View>
    );
}

const ls = StyleSheet.create({
    logoThumb: {
        width: 56,
        height: 56,
        borderRadius: 14,
    },
    optionsPanel: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary[100],
        backgroundColor: colors.white,
        overflow: 'hidden',
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[100],
        marginHorizontal: 16,
    },
});
