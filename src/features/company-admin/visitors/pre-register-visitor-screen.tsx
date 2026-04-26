/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { DropdownField } from '@/components/ui/dropdown-field';
import { useSidebar } from '@/components/ui/sidebar';
import { showSuccess, showWarning } from '@/components/ui/utils';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import { useCreateVisit } from '@/features/company-admin/api/use-visitor-mutations';
import { useVisitorTypes } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ CONSTANTS ============

const PURPOSE_OPTIONS = [
  { id: 'MEETING', name: 'Meeting' },
  { id: 'DELIVERY', name: 'Delivery' },
  { id: 'MAINTENANCE', name: 'Maintenance / Repair' },
  { id: 'AUDIT', name: 'Audit / Inspection' },
  { id: 'INTERVIEW', name: 'Interview' },
  { id: 'SITE_TOUR', name: 'Site Tour' },
  { id: 'PERSONAL', name: 'Personal' },
  { id: 'OTHER', name: 'Other' },
];

// ============ MAIN COMPONENT ============

export function PreRegisterVisitorScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();

  const createMutation = useCreateVisit();
  const { data: typesResponse } = useVisitorTypes();
  const { data: employeesResponse } = useEmployees({ limit: 500 });
  const { data: locationsResponse } = useCompanyLocations();

  const visitorTypes = React.useMemo(() => {
    const raw = (typesResponse as any)?.data ?? typesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesResponse]);

  const employeeOptions = React.useMemo(() => {
    const raw = (employeesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || e.id,
    }));
  }, [employeesResponse]);

  const locationOptions = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({
      id: l.id,
      name: l.name ?? l.code ?? l.id,
    }));
  }, [locationsResponse]);

  // Form state
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [hostEmployeeId, setHostEmployeeId] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [expectedTime, setExpectedTime] = React.useState('');
  const [selectedTypeId, setSelectedTypeId] = React.useState('');
  const [vehicleRegNumber, setVehicleRegNumber] = React.useState('');
  const [specialInstructions, setSpecialInstructions] = React.useState('');
  const [visitorPhoto, setVisitorPhoto] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showWarning('Camera permission is required to capture visitor photo');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setVisitorPhoto(result.assets[0].uri);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Visitor name is required';
    if (!phone.trim()) e.phone = 'Mobile number is required';
    else if (phone.trim().length !== 10) e.phone = 'Phone number must be exactly 10 digits';
    if (!purpose) e.purpose = 'Purpose is required';
    if (!expectedDate.trim()) e.expectedDate = 'Expected date is required';
    if (!plantId) e.plantId = 'Plant is required';
    if (!selectedTypeId) e.visitorTypeId = 'Visitor type is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createMutation.mutate(
      {
        visitorName: name.trim(),
        visitorCompany: company.trim() || undefined,
        visitorMobile: `+91${phone.trim()}`,
        visitorEmail: email.trim() || undefined,
        purpose: purpose.trim(),
        hostEmployeeId: hostEmployeeId || undefined,
        plantId,
        expectedDate: expectedDate.trim(),
        expectedTime: expectedTime.trim() || undefined,
        visitorTypeId: selectedTypeId || undefined,
        vehicleRegNumber: vehicleRegNumber.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
      },
      {
        onSuccess: () => {
          showSuccess('Visitor pre-registered successfully');
          router.back();
        },
      },
    );
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options?: {
      required?: boolean;
      error?: string;
      placeholder?: string;
      keyboardType?: TextInput['props']['keyboardType'];
      autoCapitalize?: TextInput['props']['autoCapitalize'];
      multiline?: boolean;
    },
  ) => (
    <View style={s.fieldWrap}>
      <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
        {label} {options?.required && <Text className="text-danger-500">*</Text>}
      </Text>
      <View style={[s.inputWrap, options?.multiline && { height: 80 }, !!options?.error && { borderColor: colors.danger[300] }]}>
        <TextInput
          style={[s.textInput, isDark && { color: colors.white }, options?.multiline && { textAlignVertical: 'top' }]}
          placeholder={options?.placeholder ?? label}
          placeholderTextColor={colors.neutral[400]}
          value={value}
          onChangeText={(v) => {
            onChange(v);
            if (options?.error) setErrors(prev => ({ ...prev, [label]: '' }));
          }}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize}
          multiline={options?.multiline}
        />
      </View>
      {!!options?.error && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{options.error}</Text>}
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Pre-Register Visitor" onMenuPress={toggle} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 100 }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Visitor Information */}
            <View style={s.sectionCard}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-4">Visitor Information</Text>
              {renderField('Visitor Name', name, setName, { required: true, error: errors.name, placeholder: 'Full name' })}
              {renderField('Company', company, setCompany, { placeholder: 'Organization' })}

              {/* Phone Number with country code */}
              <View style={s.fieldWrap}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
                  Phone Number <Text className="text-danger-500">*</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[s.inputWrap, { width: 80, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 10, gap: 4 }]}>
                    <Text className="font-inter text-base">{'\u{1F1EE}\u{1F1F3}'}</Text>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">+91</Text>
                  </View>
                  <View style={[s.inputWrap, { flex: 1 }, !!errors.phone && { borderColor: colors.danger[300] }]}>
                    <TextInput
                      style={[s.textInput, isDark && { color: colors.white }]}
                      placeholder="98765 43210"
                      placeholderTextColor={colors.neutral[400]}
                      value={phone}
                      onChangeText={(v) => {
                        setPhone(v.replace(/[^0-9]/g, '').slice(0, 10));
                        if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
                {!!errors.phone && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.phone}</Text>}
              </View>

              {renderField('Email', email, setEmail, { placeholder: 'Email address', keyboardType: 'email-address', autoCapitalize: 'none' })}
            </View>

            {/* Visit Details */}
            <View style={[s.sectionCard, { marginTop: 16 }]}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-4">Visit Details</Text>

              <DropdownField
                label="Purpose of Visit"
                selected={purpose}
                onSelect={(v) => {
                  setPurpose(v);
                  if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' }));
                }}
                options={PURPOSE_OPTIONS}
                placeholder="Select purpose..."
                required
                error={errors.purpose}
              />

              <DropdownField
                label="Host Employee"
                selected={hostEmployeeId}
                onSelect={setHostEmployeeId}
                options={employeeOptions}
                placeholder="Select host employee..."
              />

              <DropdownField
                label="Location (Plant)"
                selected={plantId}
                onSelect={(v) => {
                  setPlantId(v);
                  if (errors.plantId) setErrors(prev => ({ ...prev, plantId: '' }));
                }}
                options={locationOptions}
                placeholder="Select location..."
                required
                error={errors.plantId}
              />

              {renderField('Expected Date', expectedDate, setExpectedDate, { required: true, error: errors.expectedDate, placeholder: 'YYYY-MM-DD (e.g. 2026-04-25)' })}
              {renderField('Expected Time', expectedTime, setExpectedTime, { placeholder: 'HH:MM (24h)' })}

              <DropdownField
                label="Visitor Type"
                selected={selectedTypeId}
                onSelect={(v) => {
                  setSelectedTypeId(v);
                  if (errors.visitorTypeId) setErrors(prev => ({ ...prev, visitorTypeId: '' }));
                }}
                options={visitorTypes}
                placeholder="Select visitor type..."
                required
                error={errors.visitorTypeId}
              />
            </View>

            {/* Additional */}
            <View style={[s.sectionCard, { marginTop: 16 }]}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-4">Additional Information</Text>
              {renderField('Vehicle Reg Number', vehicleRegNumber, setVehicleRegNumber, { placeholder: 'License plate', autoCapitalize: 'characters' })}
              {renderField('Special Instructions', specialInstructions, setSpecialInstructions, { placeholder: 'Any special instructions...', multiline: true })}

              {/* Visitor Photo */}
              <View style={s.fieldWrap}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Visitor Photo</Text>
                {visitorPhoto ? (
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    <Image source={{ uri: visitorPhoto }} style={s.photoPreview} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable onPress={capturePhoto} style={s.photoBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-primary-600 ml-1.5">Retake</Text>
                      </Pressable>
                      <Pressable onPress={() => setVisitorPhoto(null)} style={s.photoBtn}>
                        <Svg width={16} height={16} viewBox="0 0 24 24">
                          <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text className="font-inter text-xs font-semibold text-danger-500 ml-1.5">Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={capturePhoto} style={s.captureBtn}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
                    </Svg>
                    <Text className="font-inter text-sm font-semibold text-primary-600 ml-2">Capture Photo</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Pressable onPress={() => router.back()} style={s.cancelBtn}>
                <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">CANCEL</Text>
              </Pressable>
              <Pressable onPress={handleSubmit} disabled={createMutation.isPending} style={[s.submitBtn, createMutation.isPending && { opacity: 0.5 }]}>
                <Text className="font-inter text-sm font-bold text-white">{createMutation.isPending ? 'Saving...' : 'PRE-REGISTER'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionCard: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
  submitBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', backgroundColor: isDark ? '#1E1B4B' : colors.primary[50] },
  photoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.primary[200] },
  photoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: isDark ? '#1A1730' : colors.neutral[50], borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
});
