/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
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
import { useSidebar } from '@/components/ui/sidebar';
import { showSuccess } from '@/components/ui/utils';

import { useCreateVisit } from '@/features/company-admin/api/use-visitor-mutations';
import { useVisitorTypes } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ MAIN COMPONENT ============

export function PreRegisterVisitorScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();

  const createMutation = useCreateVisit();
  const { data: typesResponse } = useVisitorTypes();

  const visitorTypes = React.useMemo(() => {
    const raw = (typesResponse as any)?.data ?? typesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesResponse]);

  // Form state
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [hostName, setHostName] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [expectedTime, setExpectedTime] = React.useState('');
  const [selectedTypeId, setSelectedTypeId] = React.useState('');
  const [vehiclePlate, setVehiclePlate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Visitor name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!purpose.trim()) e.purpose = 'Purpose is required';
    if (!expectedDate.trim()) e.expectedDate = 'Expected date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const expectedArrival = expectedTime
      ? `${expectedDate}T${expectedTime}:00`
      : `${expectedDate}T09:00:00`;

    createMutation.mutate(
      {
        visitorName: name.trim(),
        visitorCompany: company.trim() || undefined,
        visitorPhone: phone.trim(),
        visitorEmail: email.trim() || undefined,
        purpose: purpose.trim(),
        hostName: hostName.trim() || undefined,
        expectedArrival,
        visitorTypeId: selectedTypeId || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        notes: notes.trim() || undefined,
        isWalkIn: false,
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
              {renderField('Phone', phone, setPhone, { required: true, error: errors.phone, placeholder: 'Phone number', keyboardType: 'phone-pad' })}
              {renderField('Email', email, setEmail, { placeholder: 'Email address', keyboardType: 'email-address', autoCapitalize: 'none' })}
            </View>

            {/* Visit Details */}
            <View style={[s.sectionCard, { marginTop: 16 }]}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-4">Visit Details</Text>
              {renderField('Purpose', purpose, setPurpose, { required: true, error: errors.purpose, placeholder: 'Purpose of visit', multiline: true })}
              {renderField('Host Employee', hostName, setHostName, { placeholder: 'Who are they visiting?' })}
              {renderField('Expected Date', expectedDate, setExpectedDate, { required: true, error: errors.expectedDate, placeholder: 'YYYY-MM-DD' })}
              {renderField('Expected Time', expectedTime, setExpectedTime, { placeholder: 'HH:MM (24h)' })}

              {/* Visitor Type Chips */}
              {visitorTypes.length > 0 && (
                <View style={s.fieldWrap}>
                  <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Visitor Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {visitorTypes.map(vt => {
                        const selected = vt.id === selectedTypeId;
                        return (
                          <Pressable key={vt.id} onPress={() => setSelectedTypeId(selected ? '' : vt.id)} style={[s.chip, selected && s.chipActive]}>
                            <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{vt.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Additional */}
            <View style={[s.sectionCard, { marginTop: 16 }]}>
              <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white mb-4">Additional Information</Text>
              {renderField('Vehicle Number', vehiclePlate, setVehiclePlate, { placeholder: 'License plate', autoCapitalize: 'characters' })}
              {renderField('Notes', notes, setNotes, { placeholder: 'Any additional notes...', multiline: true })}
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? '#1A1730' : colors.white, borderWidth: 1, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  cancelBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: isDark ? '#1E1B4B' : colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.neutral[700] : colors.neutral[200] },
  submitBtn: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
