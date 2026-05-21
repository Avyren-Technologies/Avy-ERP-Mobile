/* eslint-disable better-tailwindcss/no-unknown-classes */
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { ConfirmModal, useConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { DropdownField } from '@/components/ui/dropdown-field';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess, showWarning } from '@/components/ui/utils';

import { useCompanyLocations } from '@/features/company-admin/api/use-company-admin-queries';
import { useEmployees } from '@/features/company-admin/api/use-hr-queries';
import {
  useCheckInVisit,
  useCreateVisit,
} from '@/features/company-admin/api/use-visitor-mutations';
import {
  useDashboardToday,
  useVisitorTypes,
  useVMSConfig,
} from '@/features/company-admin/api/use-visitor-queries';
import { visitorsApi } from '@/lib/api/visitors';
import Env from 'env';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';
import QRCode from 'react-native-qrcode-svg';

/** Derive the web app base URL from the API URL for constructing public page links */
function getWebBaseUrl(): string {
  const apiUrl = Env.EXPO_PUBLIC_API_URL; // e.g. http://192.168.1.7:3030/api/v1
  try {
    const parsed = new URL(apiUrl);
    // In dev, web app runs on port 5173; in prod, same origin
    if (parsed.port === '3030') parsed.port = '5173';
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'https://app.avyerp.com';
  }
}

// ============ WALK-IN FORM ============

function WalkInForm({
  onSubmit,
  isSaving,
  visitorTypes,
}: {
  readonly onSubmit: (data: Record<string, unknown>) => void;
  readonly isSaving: boolean;
  readonly visitorTypes: { id: string; name: string }[];
}) {
  const isDark = useIsDark();
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [hostEmployeeId, setHostEmployeeId] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [selectedTypeId, setSelectedTypeId] = React.useState('');
  const [visitorPhoto, setVisitorPhoto] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: employeesResponse } = useEmployees({ limit: 500 });
  const employeeOptions = React.useMemo(() => {
    const raw = (employeesResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || e.id,
    }));
  }, [employeesResponse]);

  const { data: locationsResponse } = useCompanyLocations();
  const locationOptions = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({ id: l.id, name: l.name ?? l.code ?? l.id }));
  }, [locationsResponse]);

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
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!purpose.trim()) e.purpose = 'Purpose of visit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const today = new Date().toISOString().slice(0, 10);
    onSubmit({
      visitorName: name.trim(),
      visitorCompany: company.trim() || undefined,
      visitorMobile: phone.trim(),
      visitorEmail: email.trim() || undefined,
      purpose: purpose.trim() || 'OTHER',
      hostEmployeeId: hostEmployeeId || undefined,
      plantId: plantId || undefined,
      visitorTypeId: selectedTypeId || undefined,
      expectedDate: today,
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={formStyles.container}>
      <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-4">Walk-in Registration</Text>

      {/* Name */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
          Visitor Name <Text className="text-danger-500">*</Text>
        </Text>
        <View style={[formStyles.inputWrap, !!errors.name && { borderColor: colors.danger[300] }]}>
          <TextInput
            style={[formStyles.textInput, isDark && { color: colors.white }]}
            placeholder="Full name"
            placeholderTextColor={colors.neutral[400]}
            value={name}
            onChangeText={(v) => { setName(v); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }}
          />
        </View>
        {!!errors.name && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.name}</Text>}
      </View>

      {/* Company */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Company</Text>
        <View style={formStyles.inputWrap}>
          <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Organization" placeholderTextColor={colors.neutral[400]} value={company} onChangeText={setCompany} />
        </View>
      </View>

      {/* Phone */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
          Phone <Text className="text-danger-500">*</Text>
        </Text>
        <View style={[formStyles.inputWrap, !!errors.phone && { borderColor: colors.danger[300] }]}>
          <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Phone number" placeholderTextColor={colors.neutral[400]} value={phone} onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }} keyboardType="phone-pad" />
        </View>
        {!!errors.phone && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.phone}</Text>}
      </View>

      {/* Email */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Email</Text>
        <View style={formStyles.inputWrap}>
          <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Email address" placeholderTextColor={colors.neutral[400]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>
      </View>

      {/* Purpose */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">
          Purpose <Text className="text-danger-500">*</Text>
        </Text>
        <View style={[formStyles.inputWrap, { height: 80 }, !!errors.purpose && { borderColor: colors.danger[300] }]}>
          <TextInput style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]} placeholder="Purpose of visit" placeholderTextColor={colors.neutral[400]} value={purpose} onChangeText={(v) => { setPurpose(v); if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' })); }} multiline />
        </View>
        {!!errors.purpose && <Text className="mt-1 font-inter text-[10px] text-danger-500 font-medium">{errors.purpose}</Text>}
      </View>

      {/* Host */}
      <DropdownField
        label="Host Employee"
        selected={hostEmployeeId}
        onSelect={setHostEmployeeId}
        options={employeeOptions}
        placeholder="Select host employee..."
      />

      {/* Plant */}
      <DropdownField
        label="Location (Plant)"
        selected={plantId}
        onSelect={setPlantId}
        options={locationOptions}
        placeholder="Select location..."
      />

      {/* Visitor Type Chips */}
      {visitorTypes.length > 0 && (
        <View style={formStyles.fieldWrap}>
          <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Visitor Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {visitorTypes.map(vt => {
                const selected = vt.id === selectedTypeId;
                return (
                  <Pressable
                    key={vt.id}
                    onPress={() => setSelectedTypeId(selected ? '' : vt.id)}
                    style={[formStyles.chip, selected && formStyles.chipActive]}
                  >
                    <Text className={`font-inter text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                      {vt.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Visitor Photo */}
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Visitor Photo</Text>
        {visitorPhoto ? (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Image source={{ uri: visitorPhoto }} style={formStyles.photoPreview} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={capturePhoto} style={formStyles.photoBtn}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
                </Svg>
                <Text className="font-inter text-xs font-semibold text-primary-600 ml-1.5">Retake</Text>
              </Pressable>
              <Pressable onPress={() => setVisitorPhoto(null)} style={formStyles.photoBtn}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.danger[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-xs font-semibold text-danger-500 ml-1.5">Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={capturePhoto} style={formStyles.captureBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
            </Svg>
            <Text className="font-inter text-sm font-semibold text-primary-600 ml-2">Take Photo</Text>
          </Pressable>
        )}
      </View>

      {/* Submit */}
      <Pressable onPress={handleSubmit} disabled={isSaving} style={[formStyles.submitBtn, isSaving && { opacity: 0.5 }]}>
        <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Registering...' : 'CHECK IN WALK-IN'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ============ ID TYPES ============

const ID_TYPES = [
  { id: 'AADHAAR', name: 'Aadhaar Card' },
  { id: 'PAN', name: 'PAN Card' },
  { id: 'PASSPORT', name: 'Passport' },
  { id: 'DRIVING_LICENSE', name: 'Driving License' },
  { id: 'VOTER_ID', name: 'Voter ID' },
];

// ============ REQUIREMENT HELPERS ============

function getRequirements(config: any, visitorType: any) {
  const photoRequired = config?.photoCapture === 'ALWAYS' || (config?.photoCapture === 'PER_VISITOR_TYPE' && visitorType?.requirePhoto);
  const idRequired = config?.idVerification === 'ALWAYS' || (config?.idVerification === 'PER_VISITOR_TYPE' && visitorType?.requireIdVerification);
  const preArrivalRequired = config?.preArrivalForm === 'ALWAYS' || (config?.preArrivalForm === 'PER_VISITOR_TYPE' && visitorType?.requirePreArrivalForm);
  return { photoRequired: !!photoRequired, idRequired: !!idRequired, preArrivalRequired: !!preArrivalRequired };
}

// ============ PRE-CHECK-IN MODAL ============

function PreCheckInModal({
  visible,
  visit,
  config,
  onCheckIn,
  onCancel,
  isPending,
}: {
  readonly visible: boolean;
  readonly visit: any;
  readonly config: any;
  readonly onCheckIn: (data: Record<string, unknown>) => void;
  readonly onCancel: () => void;
  readonly isPending: boolean;
}) {
  const isDark = useIsDark();
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [idType, setIdType] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  const [idPhoto, setIdPhoto] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Reset state when visit changes
  React.useEffect(() => {
    if (visible) {
      setPhoto(null);
      setIdType('');
      setIdNumber('');
      setIdPhoto(null);
    }
  }, [visible, visit?.id]);

  const { photoRequired, idRequired, preArrivalRequired } = getRequirements(config, visit?.visitorType);

  const approvalPending = visit?.approvalStatus === 'PENDING';
  const approvalRejected = visit?.approvalStatus === 'REJECTED';
  const preArrivalPending = preArrivalRequired && !visit?.preArrivalSubmittedAt;
  const hasBlocker = approvalPending || approvalRejected || preArrivalPending;

  const photoSatisfied = !!photo || !!visit?.visitorPhoto;
  const idSatisfied = (!!idType && !!idNumber.trim()) || !!visit?.governmentIdType;
  const canSubmit = !hasBlocker && (!photoRequired || photoSatisfied) && (!idRequired || idSatisfied);

  const captureVisitorPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showWarning('Camera permission is required'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri);
    }
  };

  const captureIdDocPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showWarning('Camera permission is required'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setIdPhoto(result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    const data: Record<string, unknown> = {};
    if (photo) data.visitorPhoto = photo;
    if (idType) data.governmentIdType = idType;
    if (idNumber.trim()) data.governmentIdNumber = idNumber.trim();
    if (idPhoto) data.idDocumentPhoto = idPhoto;
    if (visit?.gateId) data.checkInGateId = visit.gateId;
    onCheckIn(data);
  };

  if (!visit) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
        {/* Header */}
        <View style={[preCheckInStyles.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-lg font-bold text-white">Pre-Check-In</Text>
            <Text className="font-inter text-xs text-white/70">Complete required steps before check-in</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={12} style={preCheckInStyles.closeBtn}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          {/* Visitor Info Card */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={preCheckInStyles.infoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={preCheckInStyles.avatar}>
                  <Text className="font-inter text-lg font-bold text-primary-600">{(visit.visitorName || '?')[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{visit.visitorName}</Text>
                  {visit.visitorCompany ? <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">{visit.visitorCompany}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View style={preCheckInStyles.codeBadge}>
                      <Text className="font-inter text-[10px] font-bold text-primary-600">{visit.visitCode}</Text>
                    </View>
                    {visit.visitorType?.name ? (
                      <View style={[preCheckInStyles.codeBadge, { backgroundColor: (visit.visitorType.badgeColour ?? colors.primary[600]) + '15' }]}>
                        <Text className="font-inter text-[10px] font-bold" style={{ color: visit.visitorType.badgeColour ?? colors.primary[600] }}>{visit.visitorType.name}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Approval Blocker */}
          {(approvalPending || approvalRejected) && (
            <Animated.View entering={FadeInDown.duration(300).delay(100)}>
              <View style={[preCheckInStyles.sectionCard, { borderColor: approvalRejected ? colors.danger[300] : colors.warning[300], borderWidth: 1.5, backgroundColor: approvalRejected ? colors.danger[50] : colors.warning[50] }]}>
                <Svg width={32} height={32} viewBox="0 0 24 24" style={{ alignSelf: 'center', marginBottom: 8 }}>
                  <Path d={approvalRejected ? "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} stroke={approvalRejected ? colors.danger[600] : colors.warning[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className={`font-inter text-sm font-bold ${approvalRejected ? 'text-danger-700' : 'text-warning-700'} text-center`}>
                  {approvalRejected ? 'Visit Rejected' : 'Awaiting Host Approval'}
                </Text>
                <Text className={`font-inter text-xs ${approvalRejected ? 'text-danger-600' : 'text-warning-600'} text-center mt-1`}>
                  {approvalRejected
                    ? 'This visit has been rejected by the host employee. The visitor cannot be checked in.'
                    : 'The host employee has not yet approved this visit. Please ask the visitor to contact their host or wait for approval.'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Pre-Arrival Form Blocker */}
          {preArrivalPending && !approvalPending && !approvalRejected && (
            <Animated.View entering={FadeInDown.duration(300).delay(100)}>
              <View style={[preCheckInStyles.sectionCard, { borderColor: colors.warning[300], borderWidth: 1.5, backgroundColor: colors.warning[50] }]}>
                <Svg width={32} height={32} viewBox="0 0 24 24" style={{ alignSelf: 'center', marginBottom: 8 }}>
                  <Path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke={colors.warning[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-sm font-bold text-warning-700 text-center">Pre-Arrival Form Required</Text>
                <Text className="font-inter text-xs text-warning-600 text-center mt-1 mb-4">
                  This visitor must complete the pre-arrival form before check-in. Ask them to check their invitation email or scan the QR code below.
                </Text>
                <View style={{ alignItems: 'center', backgroundColor: colors.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral[200] }}>
                  <QRCode value={`${getWebBaseUrl()}/visit/${visit.visitCode}`} size={150} />
                  <Text className="font-inter text-[10px] text-neutral-500 mt-2 text-center">Scan to open Pre-Arrival Form</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Photo, ID sections — only show when no blockers */}
          {!hasBlocker && (<>
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <View style={[preCheckInStyles.sectionCard, photoRequired && !photoSatisfied && preCheckInStyles.sectionRequired]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                  Visitor Photo {photoRequired ? '' : '(Optional)'}
                </Text>
                {photoRequired && (
                  <View style={preCheckInStyles.requiredBadge}>
                    <Text className="font-inter text-[10px] font-bold text-danger-600">Required</Text>
                  </View>
                )}
              </View>
              {photo ? (
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <Image source={{ uri: photo }} style={preCheckInStyles.photoPreview} />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={captureVisitorPhoto} style={formStyles.photoBtn}>
                      <Text className="font-inter text-xs font-semibold text-primary-600">Retake</Text>
                    </Pressable>
                    <Pressable onPress={() => setPhoto(null)} style={formStyles.photoBtn}>
                      <Text className="font-inter text-xs font-semibold text-danger-500">Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : visit?.visitorPhoto ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={[preCheckInStyles.satisfiedBadge]}>
                    <Text className="font-inter text-xs font-semibold text-success-700">Photo already on file</Text>
                  </View>
                  <Pressable onPress={captureVisitorPhoto} style={formStyles.photoBtn}>
                    <Text className="font-inter text-xs font-semibold text-primary-600">Take New Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={captureVisitorPhoto} style={formStyles.captureBtn}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
                  </Svg>
                  <Text className="font-inter text-sm font-semibold text-primary-600 ml-2">Capture Photo</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* ID Verification Section */}
          {(idRequired || config?.idVerification !== 'NEVER') && (
            <Animated.View entering={FadeInDown.duration(300).delay(200)}>
              <View style={[preCheckInStyles.sectionCard, idRequired && !idSatisfied && preCheckInStyles.sectionRequired]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    ID Verification {idRequired ? '' : '(Optional)'}
                  </Text>
                  {idRequired && (
                    <View style={preCheckInStyles.requiredBadge}>
                      <Text className="font-inter text-[10px] font-bold text-danger-600">Required</Text>
                    </View>
                  )}
                </View>
                {visit?.governmentIdType ? (
                  <View style={{ gap: 8 }}>
                    <View style={preCheckInStyles.satisfiedBadge}>
                      <Text className="font-inter text-xs font-semibold text-success-700">ID already verified: {visit.governmentIdType} — {visit.governmentIdNumber}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <DropdownField label="ID Type" selected={idType} onSelect={setIdType} options={ID_TYPES} placeholder="Select ID type..." />
                    <View style={formStyles.fieldWrap}>
                      <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">ID Number</Text>
                      <View style={formStyles.inputWrap}>
                        <TextInput
                          style={[formStyles.textInput, isDark && { color: colors.white }]}
                          placeholder="Enter ID number"
                          placeholderTextColor={colors.neutral[400]}
                          value={idNumber}
                          onChangeText={setIdNumber}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                    {/* ID Document Photo */}
                    <View style={formStyles.fieldWrap}>
                      <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">ID Document Photo (Optional)</Text>
                      {idPhoto ? (
                        <View style={{ alignItems: 'center', gap: 8 }}>
                          <Image source={{ uri: idPhoto }} style={{ width: 160, height: 120, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200] }} />
                          <Pressable onPress={() => setIdPhoto(null)} style={formStyles.photoBtn}>
                            <Text className="font-inter text-xs font-semibold text-danger-500">Remove</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={captureIdDocPhoto} style={formStyles.captureBtn}>
                          <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={colors.primary[600]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M12 17a4 4 0 100-8 4 4 0 000 8z" stroke={colors.primary[600]} strokeWidth="2" fill="none" />
                          </Svg>
                          <Text className="font-inter text-xs font-semibold text-primary-600 ml-2">Capture ID Photo</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Gate is auto-assigned from the QR code scanned at the gate */}
          </>)}
        </ScrollView>

        {/* Footer */}
        <View style={[preCheckInStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {!canSubmit && (
            <Text className="font-inter text-xs text-danger-500 text-center mb-2">
              {approvalPending ? 'Check-in blocked — awaiting host approval' : approvalRejected ? 'Check-in blocked — visit rejected' : preArrivalPending ? 'Check-in blocked — pre-arrival form not completed' : 'Please complete all required fields before check-in'}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={onCancel} style={preCheckInStyles.cancelBtn}>
              <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isPending}
              style={[preCheckInStyles.checkInBtn, (!canSubmit || isPending) && { opacity: 0.5 }]}
            >
              {isPending ? (
                <Text className="font-inter text-sm font-bold text-white">Checking In...</Text>
              ) : (
                <>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white ml-2">Complete Check-In</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ EXPECTED VISITOR ROW ============

function ExpectedVisitorRow({
  item,
  index,
  onCheckIn,
  isPending,
  fmt,
}: {
  readonly item: any;
  readonly index: number;
  readonly onCheckIn: () => void;
  readonly isPending: boolean;
  readonly fmt: ReturnType<typeof useCompanyFormatter>;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(350).delay(index * 60)}>
      <View style={formStyles.expectedCard}>
        <View style={{ flex: 1 }}>
          <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>
            {item.visitorName ?? item.visitor?.name ?? ''}
          </Text>
          <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
            {item.visitorCompany ?? item.visitor?.company ?? ''} {item.expectedTime ? `- Expected ${fmt.shiftTime(item.expectedTime)}` : item.expectedDate ? `- ${fmt.date(item.expectedDate)}` : ''}
          </Text>
          {item.visitCode ? (
            <Text className="font-inter text-[10px] font-bold text-primary-600 mt-1">{item.visitCode}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={onCheckIn}
          disabled={isPending}
          style={[formStyles.checkInBtn, isPending && { opacity: 0.5 }]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text className="font-inter text-xs font-bold text-white ml-1">Check In</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function GateCheckInScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const [activeTab, setActiveTab] = React.useState<'code' | 'walkin'>('code');
  const [visitCode, setVisitCode] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanProcessedRef = React.useRef(false);
  const [pendingVisit, setPendingVisit] = React.useState<any>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  const { data: todayResponse, isLoading, refetch, isFetching } = useDashboardToday();
  const { data: typesResponse } = useVisitorTypes();
  const { data: configResponse } = useVMSConfig();

  const checkInMutation = useCheckInVisit();
  const createMutation = useCreateVisit();

  const vmsConfig = (configResponse as any)?.data ?? configResponse;

  const visitorTypes = React.useMemo(() => {
    const raw = (typesResponse as any)?.data ?? typesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesResponse]);

  const expectedVisitors = React.useMemo(() => {
    const raw = (todayResponse as any)?.data?.visitors ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((v: any) => v.status === 'EXPECTED' || v.status === 'ARRIVED');
  }, [todayResponse]);

  // Look up visit by code and open pre-check-in modal
  const lookupAndPrepareCheckIn = async (code: string) => {
    try {
      setIsLookingUp(true);
      const lookupResult = await visitorsApi.getVisitByCode(code);
      const visit = (lookupResult as any)?.data ?? lookupResult;
      if (!visit?.id) {
        showWarning('No visit found for this code');
        return;
      }
      if (visit.status === 'CHECKED_IN') {
        showWarning('This visitor is already checked in');
        return;
      }
      if (!['EXPECTED', 'ARRIVED'].includes(visit.status)) {
        showWarning(`Cannot check in — visit status is ${visit.status}`);
        return;
      }
      setPendingVisit(visit);
    } catch {
      showWarning('Visit not found for this code');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCodeCheckIn = () => {
    if (!visitCode.trim()) return;
    lookupAndPrepareCheckIn(visitCode.trim());
  };

  const handleExpectedCheckIn = (visitId: string) => {
    const visit = expectedVisitors.find((v: any) => v.id === visitId);
    if (visit) setPendingVisit(visit);
  };

  const handlePreCheckInSubmit = (data: Record<string, unknown>) => {
    if (!pendingVisit?.id) return;
    checkInMutation.mutate(
      { id: pendingVisit.id, data: Object.keys(data).length > 0 ? data : undefined },
      {
        onSuccess: (result: any) => {
          const badgeNo = result?.data?.badgeNumber ?? result?.badgeNumber;
          const warning = result?.data?.watchlistWarning ?? result?.watchlistWarning;
          if (warning) showWarning(warning);
          const checkInWarnings: string[] = result?.data?.warnings ?? result?.warnings ?? [];
          if (checkInWarnings.length) checkInWarnings.forEach((w: string) => showWarning(w));
          showSuccess(badgeNo ? `Checked in — Badge: ${badgeNo}` : 'Visitor checked in successfully');
          setPendingVisit(null);
          setVisitCode('');
        },
      },
    );
  };

  const handleWalkInSubmit = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        showSuccess('Walk-in visitor registered and checked in');
      },
    });
  };

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    scanProcessedRef.current = false;
    setShowScanner(true);
  };

  const handleBarcodeScanned = (scanResult: { data: string }) => {
    if (scanProcessedRef.current) return;
    scanProcessedRef.current = true;
    setShowScanner(false);
    const scannedCode = scanResult.data.trim();
    setVisitCode(scannedCode);
    lookupAndPrepareCheckIn(scannedCode);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="Gate Check-In" onMenuPress={toggle} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
          }
        >
          {/* Tab Selector */}
          <View style={s.tabRow}>
            <Pressable onPress={() => setActiveTab('code')} style={[s.tab, activeTab === 'code' && s.tabActive]}>
              <Text className={`font-inter text-xs font-bold ${activeTab === 'code' ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>Code / QR</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('walkin')} style={[s.tab, activeTab === 'walkin' && s.tabActive]}>
              <Text className={`font-inter text-xs font-bold ${activeTab === 'walkin' ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>Walk-in</Text>
            </Pressable>
          </View>

          {activeTab === 'code' ? (
            <View style={s.sectionWrap}>
              {/* Visit Code Input */}
              <Animated.View entering={FadeInDown.duration(400)} style={s.codeCard}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">Enter Visit Code</Text>
                <View style={s.codeInputRow}>
                  <View style={[formStyles.inputWrap, { flex: 1 }]}>
                    <TextInput
                      style={[formStyles.textInput, isDark && { color: colors.white }]}
                      placeholder="e.g. VIS-00001"
                      placeholderTextColor={colors.neutral[400]}
                      value={visitCode}
                      onChangeText={setVisitCode}
                      autoCapitalize="characters"
                      onSubmitEditing={handleCodeCheckIn}
                    />
                  </View>
                  <Pressable
                    onPress={handleScanQR}
                    style={s.scanQrBtn}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z" stroke={colors.white} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                  <Pressable
                    onPress={handleCodeCheckIn}
                    disabled={checkInMutation.isPending || isLookingUp || !visitCode.trim()}
                    style={[s.codeSubmitBtn, (!visitCode.trim() || checkInMutation.isPending || isLookingUp) && { opacity: 0.5 }]}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                </View>
              </Animated.View>

              {/* Expected Visitors */}
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3 mt-6">Expected Today</Text>
                {isLoading ? (
                  <><SkeletonCard /><SkeletonCard /></>
                ) : expectedVisitors.length === 0 ? (
                  <EmptyState icon="inbox" title="No expected visitors" message="All pre-registered visitors have been checked in or none are scheduled." />
                ) : (
                  expectedVisitors.map((v: any, idx: number) => (
                    <ExpectedVisitorRow
                      key={v.id}
                      item={v}
                      index={idx}
                      onCheckIn={() => handleExpectedCheckIn(v.id)}
                      isPending={checkInMutation.isPending}
                      fmt={fmt}
                    />
                  ))
                )}
              </Animated.View>
            </View>
          ) : (
            <View style={s.sectionWrap}>
              <WalkInForm
                onSubmit={handleWalkInSubmit}
                isSaving={createMutation.isPending}
                visitorTypes={visitorTypes}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={scannerStyles.container}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          {/* Overlay with scan window */}
          <View style={scannerStyles.overlay}>
            <View style={scannerStyles.topOverlay} />
            <View style={scannerStyles.middleRow}>
              <View style={scannerStyles.sideOverlay} />
              <View style={scannerStyles.scanWindow}>
                {/* Corner markers */}
                <View style={[scannerStyles.corner, scannerStyles.cornerTL]} />
                <View style={[scannerStyles.corner, scannerStyles.cornerTR]} />
                <View style={[scannerStyles.corner, scannerStyles.cornerBL]} />
                <View style={[scannerStyles.corner, scannerStyles.cornerBR]} />
              </View>
              <View style={scannerStyles.sideOverlay} />
            </View>
            <View style={scannerStyles.bottomOverlay}>
              <Text className="font-inter text-sm text-white text-center mt-6">Align QR code within the frame</Text>
            </View>
          </View>
          {/* Close button */}
          <Pressable
            onPress={() => setShowScanner(false)}
            style={[scannerStyles.closeBtn, { top: insets.top + 12 }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
      </Modal>

      {/* Pre-Check-In Modal */}
      <PreCheckInModal
        visible={!!pendingVisit}
        visit={pendingVisit}
        config={vmsConfig}
        onCheckIn={handlePreCheckInSubmit}
        onCancel={() => setPendingVisit(null)}
        isPending={checkInMutation.isPending}
      />

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const SCAN_WINDOW_SIZE = 250;

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 16 },
  tabRow: { flexDirection: 'row', marginHorizontal: 24, marginTop: 16, backgroundColor: isDark ? '#1A1730' : colors.neutral[100], borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary[600] },
  codeCard: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
  codeInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  codeSubmitBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
  scanQrBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.accent[600], justifyContent: 'center', alignItems: 'center' },
});

const scannerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  topOverlay: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', width: '100%' },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanWindow: { width: SCAN_WINDOW_SIZE, height: SCAN_WINDOW_SIZE, borderRadius: 16, overflow: 'hidden' },
  bottomOverlay: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.6)' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.primary[400], borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 12 },
  closeBtn: { position: 'absolute', right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});

const preCheckInStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[600], paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  infoCard: { backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.primary[50], marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  codeBadge: { backgroundColor: colors.primary[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sectionCard: { backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.primary[50], marginBottom: 16 },
  sectionRequired: { borderColor: colors.danger[200], borderWidth: 1.5 },
  requiredBadge: { backgroundColor: colors.danger[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  satisfiedBadge: { backgroundColor: colors.success[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  photoPreview: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.primary[200] },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingHorizontal: 20, paddingTop: 12 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' },
  checkInBtn: { flex: 2, height: 50, borderRadius: 14, backgroundColor: colors.success[600], flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});

const formStyles = StyleSheet.create({
  container: { backgroundColor: colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.primary[50] },
  fieldWrap: { marginBottom: 16 },
  inputWrap: { backgroundColor: colors.neutral[50], borderRadius: 12, borderWidth: 1.5, borderColor: colors.neutral[200], paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  textInput: { fontFamily: 'Inter', fontSize: 14, color: colors.primary[950] },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowColor: colors.success[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  expectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.primary[50] },
  checkInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success[600], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', backgroundColor: colors.primary[50] },
  photoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.primary[200] },
  photoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[200] },
});
