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
  useCheckInRecurringPass,
  useCheckInVisit,
  useCheckOutVisit,
  useCreateMaterialPass,
  useCreateVehiclePass,
  useCreateVisit,
  useMarkMaterialReturned,
  useRecordMaterialEntry,
  useRecordVehicleEntry,
  useRecordVehicleExit,
} from '@/features/company-admin/api/use-visitor-mutations';
import {
  useDashboardToday,
  useGateOpsExpectedMaterials,
  useGateOpsExpectedVehicles,
  useGateOpsExpectedVisitors,
  useGateOpsRecentActivity,
  useGateOpsStats,
  useGates,
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

// ============ MAIN COMPONENT ============

// ============ SCAN CAPTURE MODAL ============

type ScanCaptureKind = 'material-entry' | 'material-return' | 'vehicle-entry' | 'vehicle-exit';

function ScanCaptureModal({
  mode,
  visible,
  onSubmit,
  onCancel,
  isSaving,
}: {
  mode: { kind: ScanCaptureKind; pass: any } | null;
  visible: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [odometer, setOdometer] = React.useState('');
  const [returnStatus, setReturnStatus] = React.useState<'PARTIAL' | 'FULLY_RETURNED'>('FULLY_RETURNED');

  React.useEffect(() => {
    if (visible && mode) {
      setNotes('');
      setOdometer('');
      // Pre-fill quantity from pass for material flows
      if (mode.kind === 'material-entry') {
        const pre = mode.pass?.quantityValue != null ? String(mode.pass.quantityValue) : '';
        setQty(pre);
      } else if (mode.kind === 'material-return') {
        const issued = mode.pass?.quantityValue != null ? String(mode.pass.quantityValue) : (mode.pass?.quantityIssued ?? '');
        setQty(issued);
        setReturnStatus('FULLY_RETURNED');
      } else {
        setQty('');
      }
    }
  }, [visible, mode]);

  if (!mode) return null;
  const kind = mode.kind;
  const pass = mode.pass;
  const isMaterial = kind === 'material-entry' || kind === 'material-return';
  const isReturn = kind === 'material-return';
  const isVehicle = kind === 'vehicle-entry' || kind === 'vehicle-exit';
  const isVehicleExit = kind === 'vehicle-exit';

  const title =
    kind === 'material-entry' ? (pass?.type === 'OUTWARD' || pass?.type === 'RETURNABLE' ? 'Record Material Exit' : 'Record Material Entry')
    : kind === 'material-return' ? 'Record Material Return'
    : kind === 'vehicle-entry' ? 'Record Vehicle Entry'
    : 'Record Vehicle Exit';

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {};
    if (notes.trim()) payload.notes = notes.trim();
    if (isMaterial && qty.trim()) {
      const n = Number(qty);
      if (!Number.isNaN(n) && n > 0) {
        if (isReturn) {
          payload.quantityReturned = qty.trim();
          payload.quantityReturnedValue = n;
          payload.returnStatus = returnStatus;
        } else {
          payload.quantityValue = n;
        }
      } else if (isReturn) {
        payload.quantityReturned = qty.trim();
        payload.returnStatus = returnStatus;
      }
    }
    if (isVehicle && odometer.trim()) payload.odometer = odometer.trim();
    onSubmit(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '85%' }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} />
          </View>
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white text-center mt-2">{title}</Text>
          <Text className="font-inter text-xs text-neutral-500 text-center mt-1">{pass?.passNumber}</Text>

          <ScrollView contentContainerStyle={{ paddingVertical: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
            {/* Identifying summary */}
            <View style={{ padding: 12, backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50], borderRadius: 12 }}>
              {isMaterial && (
                <>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{pass?.description}</Text>
                  <Text className="font-inter text-xs text-neutral-500 mt-0.5">{pass?.type}{pass?.vendorName ? ` · ${pass.vendorName}` : ''}</Text>
                </>
              )}
              {isVehicle && (
                <>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">{pass?.vehicleRegNumber}</Text>
                  <Text className="font-inter text-xs text-neutral-500 mt-0.5">{pass?.vehicleType} · Driver: {pass?.driverName}</Text>
                </>
              )}
            </View>

            {isMaterial && (
              <View>
                <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                  {isReturn ? 'Quantity Returned' : 'Quantity at Gate'}{pass?.unitOfMeasure?.abbreviation ? ` (${pass.unitOfMeasure.abbreviation})` : ''}
                </Text>
                <View style={formStyles.inputWrap}>
                  <TextInput
                    style={[formStyles.textInput, isDark && { color: colors.white }]}
                    placeholder="e.g. 1500"
                    placeholderTextColor={colors.neutral[400]}
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}

            {isReturn && (
              <View>
                <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Return Status</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['FULLY_RETURNED', 'PARTIAL'] as const).map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setReturnStatus(opt)}
                      style={[
                        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
                        returnStatus === opt
                          ? { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }
                          : { backgroundColor: 'transparent', borderColor: colors.neutral[200] },
                      ]}
                    >
                      <Text className={`font-inter text-xs font-bold ${returnStatus === opt ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                        {opt === 'FULLY_RETURNED' ? 'Fully Returned' : 'Partial'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {isVehicle && (
              <View>
                <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Odometer (optional)</Text>
                <View style={formStyles.inputWrap}>
                  <TextInput
                    style={[formStyles.textInput, isDark && { color: colors.white }]}
                    placeholder="km / miles"
                    placeholderTextColor={colors.neutral[400]}
                    value={odometer}
                    onChangeText={setOdometer}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            <View>
              <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Notes (optional)</Text>
              <View style={[formStyles.inputWrap, { height: 80, paddingTop: 10 }]}>
                <TextInput
                  style={[formStyles.textInput, isDark && { color: colors.white }, { textAlignVertical: 'top' }]}
                  placeholder={isVehicleExit ? 'Exit observations…' : 'Notes for this scan…'}
                  placeholderTextColor={colors.neutral[400]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onCancel}
              style={{ flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' }}
            >
              <Text className="font-inter text-sm font-bold text-neutral-600 dark:text-neutral-400">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={isSaving}
              style={{ flex: 2, height: 50, borderRadius: 14, backgroundColor: isVehicleExit ? colors.warning[600] : colors.success[600], justifyContent: 'center', alignItems: 'center', opacity: isSaving ? 0.5 : 1 }}
            >
              <Text className="font-inter text-sm font-bold text-white">
                {isSaving ? 'Saving…' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ QUICK-CREATE MODALS ============

const VEHICLE_TYPES = ['CAR', 'TWO_WHEELER', 'AUTO', 'TRUCK', 'VAN', 'TEMPO', 'BUS'] as const;
const MATERIAL_TYPES = ['INWARD', 'OUTWARD', 'RETURNABLE'] as const;

function QuickCreateVehicleModal({
  visible,
  onClose,
  onCreated,
  gates,
  locations,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (passId: string) => void;
  gates: { id: string; name: string; plantId?: string }[];
  locations: { id: string; name: string }[];
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateVehiclePass();
  const [reg, setReg] = React.useState('');
  const [vtype, setVtype] = React.useState<typeof VEHICLE_TYPES[number]>('CAR');
  const [driver, setDriver] = React.useState('');
  const [mobile, setMobile] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [gateId, setGateId] = React.useState('');
  const [validDays, setValidDays] = React.useState('30');

  React.useEffect(() => {
    if (visible) {
      setReg(''); setVtype('CAR'); setDriver(''); setMobile(''); setPurpose('');
      setPlantId(locations[0]?.id ?? ''); setGateId(''); setValidDays('30');
    }
  }, [visible, locations]);

  const filteredGates = React.useMemo(() => gates.filter(g => !plantId || !g.plantId || g.plantId === plantId), [gates, plantId]);
  const canSubmit = reg.trim() && driver.trim() && purpose.trim() && plantId && gateId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const now = new Date();
    const validUntil = new Date(now.getTime() + Number(validDays || 30) * 24 * 60 * 60 * 1000);
    try {
      const result = await createMutation.mutateAsync({
        vehicleRegNumber: reg.trim().toUpperCase(),
        vehicleType: vtype,
        driverName: driver.trim(),
        driverMobile: mobile.trim() || undefined,
        purpose: purpose.trim(),
        entryGateId: gateId,
        plantId,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
      });
      const passId = (result as any)?.data?.id ?? (result as any)?.id;
      showSuccess('Vehicle pass created');
      onClose();
      if (passId) onCreated(passId);
    } catch {
      showWarning('Could not create vehicle pass');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '90%' }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} /></View>
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white text-center">Quick Create Vehicle Pass</Text>
          <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <FieldText label="Vehicle Reg Number *" value={reg} onChange={(v) => setReg(v.toUpperCase())} placeholder="e.g. KA 03 AB 1234" autoCapitalize="characters" />
            <View>
              <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Vehicle Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {VEHICLE_TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setVtype(t)} style={[formStyles.chip, vtype === t && formStyles.chipActive]}>
                    <Text className={`font-inter text-[11px] font-bold ${vtype === t ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>{t.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FieldText label="Driver Name *" value={driver} onChange={setDriver} />
            <FieldText label="Driver Mobile" value={mobile} onChange={setMobile} keyboardType="phone-pad" />
            <FieldText label="Purpose *" value={purpose} onChange={setPurpose} multiline />
            <FieldDropdown label="Plant *" value={plantId} onChange={(v) => { setPlantId(v); setGateId(''); }} options={locations.map(l => ({ id: l.id, name: l.name }))} />
            <FieldDropdown label="Entry Gate *" value={gateId} onChange={setGateId} options={filteredGates.map(g => ({ id: g.id, name: g.name }))} />
            <FieldText label="Valid for (days)" value={validDays} onChange={setValidDays} keyboardType="numeric" />
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onClose} style={{ flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' }}>
              <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={{ flex: 2, height: 50, borderRadius: 14, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center', opacity: !canSubmit || createMutation.isPending ? 0.5 : 1 }}>
              <Text className="font-inter text-sm font-bold text-white">{createMutation.isPending ? 'Creating…' : 'Create Pass'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function QuickCreateMaterialModal({
  visible,
  onClose,
  onCreated,
  gates,
  locations,
  employees,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (passId: string, type: typeof MATERIAL_TYPES[number]) => void;
  gates: { id: string; name: string; plantId?: string }[];
  locations: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) {
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateMaterialPass();
  const [type, setType] = React.useState<typeof MATERIAL_TYPES[number]>('INWARD');
  const [description, setDescription] = React.useState('');
  const [qty, setQty] = React.useState('');
  const [vendor, setVendor] = React.useState('');
  const [authorizedBy, setAuthorizedBy] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [plantId, setPlantId] = React.useState('');
  const [gateId, setGateId] = React.useState('');
  const [returnDate, setReturnDate] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      setType('INWARD'); setDescription(''); setQty(''); setVendor('');
      setAuthorizedBy(''); setPurpose('');
      setPlantId(locations[0]?.id ?? ''); setGateId(''); setReturnDate('');
    }
  }, [visible, locations]);

  const filteredGates = React.useMemo(() => gates.filter(g => !plantId || !g.plantId || g.plantId === plantId), [gates, plantId]);
  const canSubmit = description.trim() && authorizedBy && purpose.trim() && plantId && gateId && (type !== 'RETURNABLE' || returnDate.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const result = await createMutation.mutateAsync({
        type,
        description: description.trim(),
        quantityValue: qty.trim() ? Number(qty) : undefined,
        quantityIssued: qty.trim() || undefined,
        vendorName: vendor.trim() || undefined,
        authorizedBy,
        purpose: purpose.trim(),
        gateId,
        plantId,
        ...(type === 'RETURNABLE' ? { expectedReturnDate: returnDate } : {}),
      });
      const passId = (result as any)?.data?.id ?? (result as any)?.id;
      showSuccess('Material pass created');
      onClose();
      if (passId) onCreated(passId, type);
    } catch {
      showWarning('Could not create material pass');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '90%' }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} /></View>
          <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white text-center">Quick Create Material Pass</Text>
          <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <View>
              <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Type *</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {MATERIAL_TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setType(t)} style={[formStyles.chip, { flex: 1, alignItems: 'center' }, type === t && formStyles.chipActive]}>
                    <Text className={`font-inter text-[11px] font-bold ${type === t ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FieldText label="Description *" value={description} onChange={setDescription} multiline />
            <FieldText label="Quantity" value={qty} onChange={setQty} keyboardType="decimal-pad" placeholder="e.g. 1500" />
            <FieldText label="Vendor / Source" value={vendor} onChange={setVendor} />
            <FieldDropdown label="Authorized By *" value={authorizedBy} onChange={setAuthorizedBy} options={employees} searchable />
            <FieldText label="Purpose *" value={purpose} onChange={setPurpose} multiline />
            <FieldDropdown label="Plant *" value={plantId} onChange={(v) => { setPlantId(v); setGateId(''); }} options={locations} />
            <FieldDropdown label="Gate *" value={gateId} onChange={setGateId} options={filteredGates} />
            {type === 'RETURNABLE' && (
              <FieldText label="Expected Return Date *" value={returnDate} onChange={setReturnDate} placeholder="YYYY-MM-DD" />
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onClose} style={{ flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' }}>
              <Text className="font-inter text-sm font-bold text-neutral-600">Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={!canSubmit || createMutation.isPending} style={{ flex: 2, height: 50, borderRadius: 14, backgroundColor: colors.success[600], justifyContent: 'center', alignItems: 'center', opacity: !canSubmit || createMutation.isPending ? 0.5 : 1 }}>
              <Text className="font-inter text-sm font-bold text-white">{createMutation.isPending ? 'Creating…' : 'Create Pass'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Tiny inline field helpers used by the quick-create modals
function FieldText(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: any; autoCapitalize?: any }) {
  const isDark = useIsDark();
  return (
    <View>
      <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{props.label}</Text>
      <View style={[formStyles.inputWrap, props.multiline ? { height: 70, paddingTop: 10 } : null]}>
        <TextInput
          style={[formStyles.textInput, isDark && { color: colors.white }, props.multiline && { textAlignVertical: 'top' }]}
          placeholder={props.placeholder}
          placeholderTextColor={colors.neutral[400]}
          value={props.value}
          onChangeText={props.onChange}
          multiline={!!props.multiline}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
        />
      </View>
    </View>
  );
}

function FieldDropdown(props: { label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; searchable?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const isDark = useIsDark();
  const filtered = props.searchable && search ? props.options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())) : props.options;
  const selected = props.options.find(o => o.id === props.value);
  return (
    <View>
      <Text className="font-inter text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{props.label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[formStyles.inputWrap, { justifyContent: 'center' }]}>
        <Text className={`font-inter text-sm ${selected ? 'text-primary-950 dark:text-white' : 'text-neutral-400'}`} numberOfLines={1}>
          {selected?.name ?? 'Select…'}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 16, width: '100%', maxWidth: 380, maxHeight: '70%' }}>
            <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mb-3">{props.label}</Text>
            {props.searchable && (
              <View style={[formStyles.inputWrap, { marginBottom: 10 }]}>
                <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Search…" placeholderTextColor={colors.neutral[400]} value={search} onChangeText={setSearch} />
              </View>
            )}
            <ScrollView>
              {filtered.length === 0 ? (
                <Text className="font-inter text-xs text-neutral-500 text-center py-6">No options</Text>
              ) : (
                filtered.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => { props.onChange(o.id); setOpen(false); setSearch(''); }}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: props.value === o.id ? colors.primary[50] : 'transparent', marginBottom: 4 }}
                  >
                    <Text className={`font-inter text-sm ${props.value === o.id ? 'text-primary-700 font-bold' : 'text-primary-950 dark:text-white'}`}>{o.name}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ============ DASHBOARD HELPER COMPONENTS ============

const ACTION_ICONS: Record<string, (color: string) => React.ReactElement> = {
  'walk-in': (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  vehicle: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M14 17H4V6h10v11zM14 9h4l3 3v5h-3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.5 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 17a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke={c} strokeWidth="2" fill="none" />
    </Svg>
  ),
  material: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  group: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  emergency: (c) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  users: (c) => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  check: (c) => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  logout: (c) => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  clock: (c) => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  hardhat: (c) => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M2 18h20M6 18v-4a6 6 0 1112 0v4M9 8V5a3 3 0 016 0v3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

function QuickActionChip({ icon, tint, bg, label, onPress }: { icon: keyof typeof ACTION_ICONS; tint: string; bg: string; label: string; onPress: () => void }) {
  const isDark = useIsDark();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: bg, borderless: false }}
      style={({ pressed }) => [
        dashboardStyles.actionChip,
        isDark && { backgroundColor: '#100D1F', borderColor: colors.primary[900] },
        pressed && dashboardStyles.actionChipPressed,
        pressed && { backgroundColor: bg },
      ]}
    >
      <View style={[dashboardStyles.actionIconBg, { backgroundColor: bg }]}>{ACTION_ICONS[icon]?.(tint)}</View>
      <Text
        className="font-inter text-[10px] font-bold text-primary-950 dark:text-white text-center"
        numberOfLines={2}
        style={{ lineHeight: 13 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatTile({ value, label, tint, bg, icon, onPress }: { value: number | string; label: string; tint: string; bg: string; icon: keyof typeof ACTION_ICONS; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[dashboardStyles.statTile, { backgroundColor: bg }]}>
      <View style={dashboardStyles.statTileHeader}>{ACTION_ICONS[icon]?.(tint)}</View>
      <Text className="font-inter text-2xl font-bold mt-1" style={{ color: tint }}>{value}</Text>
      <Text className="font-inter text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: tint }} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function ExpectedVisitorRow({ item, fmt, onCheckIn }: { item: any; fmt: ReturnType<typeof useCompanyFormatter>; onCheckIn: () => void }) {
  const initials = (item.visitorName ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={dashboardStyles.listCard}>
      <View style={[dashboardStyles.listIcon, { backgroundColor: colors.success[50] }]}>
        <Text className="font-inter text-sm font-bold text-success-700">{initials}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.visitorName}</Text>
        {item.visitorCompany ? <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.visitorCompany}</Text> : null}
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.visitNumber}{item.hostName ? ` · Host: ${item.hostName}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text className="font-inter text-[10px] font-bold text-primary-600">
          {item.expectedTime ? fmt.shiftTime(item.expectedTime) : item.expectedDate ? fmt.date(item.expectedDate) : ''}
        </Text>
        <Pressable onPress={onCheckIn} style={[dashboardStyles.statusPill, { backgroundColor: colors.success[600], marginTop: 4 }]}>
          <Text className="font-inter text-[9px] font-bold text-white">CHECK-IN</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ExpectedVehicleRow({ item, fmt }: { item: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  return (
    <View style={dashboardStyles.listCard}>
      <View style={[dashboardStyles.listIcon, { backgroundColor: colors.primary[50] }]}>
        {ACTION_ICONS.vehicle(colors.primary[700])}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.vehicleRegNumber}</Text>
        <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.vehicleType} · {item.driverName}</Text>
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.passNumber}{item.validUntil ? ` · valid till ${fmt.date(item.validUntil)}` : ''}
        </Text>
      </View>
      <View style={[dashboardStyles.statusPill, { backgroundColor: colors.success[50] }]}>
        <Text className="font-inter text-[9px] font-bold text-success-700">ACTIVE</Text>
      </View>
    </View>
  );
}

function ExpectedMaterialRow({ item, fmt }: { item: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  const qtyDisplay = item.quantityValue
    ? `${item.quantityValue} ${item.unitOfMeasure?.abbreviation ?? ''}`.trim()
    : item.quantityIssued ?? '';
  return (
    <View style={dashboardStyles.listCard}>
      <View style={[dashboardStyles.listIcon, { backgroundColor: colors.accent[50] }]}>
        {ACTION_ICONS.material(colors.accent[700])}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1}>{item.description}</Text>
        {item.vendorName ? <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>From: {item.vendorName}</Text> : null}
        <Text className="font-inter text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
          {item.passNumber}{qtyDisplay ? ` · ${qtyDisplay}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text className="font-inter text-[10px] font-bold text-primary-600">{item.createdAt ? fmt.time(item.createdAt) : ''}</Text>
        <View style={[dashboardStyles.statusPill, { backgroundColor: colors.success[50] }]}>
          <Text className="font-inter text-[9px] font-bold text-success-700">Yet to Arrive</Text>
        </View>
      </View>
    </View>
  );
}

const KIND_ICON_MAP: Record<string, { icon: keyof typeof ACTION_ICONS; tint: string; bg: string }> = {
  visit:    { icon: 'users',    tint: colors.success[700], bg: colors.success[50] },
  vehicle:  { icon: 'vehicle',  tint: colors.primary[700], bg: colors.primary[50] },
  material: { icon: 'material', tint: colors.accent[700],  bg: colors.accent[50]  },
};

function ActivityRow({ item, fmt }: { item: any; fmt: ReturnType<typeof useCompanyFormatter> }) {
  const m = KIND_ICON_MAP[item.kind] ?? KIND_ICON_MAP.visit!;
  return (
    <View style={dashboardStyles.listCard}>
      <View style={[dashboardStyles.listIcon, { backgroundColor: m.bg }]}>{ACTION_ICONS[m.icon](m.tint)}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white" numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? <Text className="font-inter text-xs text-neutral-500" numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>
      <Text className="font-inter text-[10px] font-bold text-neutral-400">{item.at ? fmt.time(item.at) : ''}</Text>
    </View>
  );
}

export function GateCheckInScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { show: confirm, modalProps: confirmModalProps } = useConfirmModal();
  const fmt = useCompanyFormatter();

  const [visitCode, setVisitCode] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);
  const [showWalkInModal, setShowWalkInModal] = React.useState(false);
  const [showVehicleModal, setShowVehicleModal] = React.useState(false);
  const [showMaterialModal, setShowMaterialModal] = React.useState(false);
  const [scanCaptureMode, setScanCaptureMode] = React.useState<null | { kind: 'material-entry' | 'material-return' | 'vehicle-entry' | 'vehicle-exit'; pass: any }>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scanProcessedRef = React.useRef(false);
  const [pendingVisit, setPendingVisit] = React.useState<any>(null);
  const [passInfo, setPassInfo] = React.useState<{ type: string; data: any } | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  const { data: typesResponse } = useVisitorTypes();
  const { data: configResponse } = useVMSConfig();
  const { data: gatesResponse } = useGates();
  const { data: locationsResponse } = useCompanyLocations();
  const { data: employeesResponse } = useEmployees({ limit: 500 });
  const { data: gateOpsStatsResp, refetch: refetchStats, isFetching: isFetchingStats } = useGateOpsStats();
  const { data: expectedMaterialsResp, refetch: refetchExpected, isFetching: isFetchingExpected } = useGateOpsExpectedMaterials({ limit: 5 });
  const { data: expectedVisitorsResp, refetch: refetchExpectedVisitors } = useGateOpsExpectedVisitors({ limit: 5 });
  const { data: expectedVehiclesResp, refetch: refetchExpectedVehicles } = useGateOpsExpectedVehicles({ limit: 5 });
  const { data: recentActivityResp, refetch: refetchActivity, isFetching: isFetchingActivity } = useGateOpsRecentActivity({ limit: 8 });
  const { refetch: refetchToday } = useDashboardToday();

  const checkInMutation = useCheckInVisit();
  const checkOutMutation = useCheckOutVisit();
  const recurringPassCheckInMutation = useCheckInRecurringPass();
  const createMutation = useCreateVisit();
  const recordMaterialEntryMutation = useRecordMaterialEntry();
  const markMaterialReturnedMutation = useMarkMaterialReturned();
  const recordVehicleEntryMutation = useRecordVehicleEntry();
  const recordVehicleExitMutation = useRecordVehicleExit();

  const vmsConfig = (configResponse as any)?.data ?? configResponse;
  const statsData: any = (gateOpsStatsResp as any)?.data ?? gateOpsStatsResp ?? {};
  const today = statsData?.today ?? {};
  const live = statsData?.live ?? {};
  const expectedMaterials: any[] = (expectedMaterialsResp as any)?.data ?? expectedMaterialsResp ?? [];
  const expectedVisitors: any[] = (expectedVisitorsResp as any)?.data ?? expectedVisitorsResp ?? [];
  const expectedVehicles: any[] = (expectedVehiclesResp as any)?.data ?? expectedVehiclesResp ?? [];
  const recentActivity: any[] = (recentActivityResp as any)?.data ?? recentActivityResp ?? [];
  const isFetchingAny = isFetchingStats || isFetchingExpected || isFetchingActivity;

  const visitorTypes = React.useMemo(() => {
    const raw = (typesResponse as any)?.data ?? typesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesResponse]);

  const gatesList = React.useMemo(() => {
    const raw = (gatesResponse as any)?.data ?? gatesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((g: any) => g.isActive !== false).map((g: any) => ({ id: g.id, name: g.name ?? g.code ?? g.id, plantId: g.plantId }));
  }, [gatesResponse]);

  const locationsList = React.useMemo(() => {
    const raw = (locationsResponse as any)?.data ?? locationsResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any) => ({ id: l.id, name: l.name ?? l.code ?? l.id }));
  }, [locationsResponse]);

  const employeesList = React.useMemo(() => {
    const raw = (employeesResponse as any)?.data ?? employeesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: e.id,
      name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || e.id,
    }));
  }, [employeesResponse]);

  const refreshAll = React.useCallback(() => {
    refetchStats();
    refetchExpected();
    refetchExpectedVisitors();
    refetchExpectedVehicles();
    refetchActivity();
    refetchToday();
  }, [refetchStats, refetchExpected, refetchExpectedVisitors, refetchExpectedVehicles, refetchActivity, refetchToday]);

  // Unified lookup — resolves visit code, recurring pass, vehicle/material pass
  const lookupAndPrepareCheckIn = async (code: string) => {
    try {
      setIsLookingUp(true);
      const lookupResult = await visitorsApi.gateLookup(code);
      const result = (lookupResult as any)?.data ?? lookupResult;
      const entityType = result?.type;
      const entity = result?.data;

      if (!entity?.id) {
        showWarning('No visit or pass found for this code');
        return;
      }

      if (entityType === 'visit') {
        if (entity.status === 'CHECKED_IN') {
          // Second scan of an already-checked-in visit → drive a check-out instead of erroring
          confirm({
            title: 'Check Out Visitor',
            message: `${entity.visitorName} is currently checked in. Check them out now?`,
            confirmText: 'Check Out',
            variant: 'primary',
            onConfirm: () => {
              checkOutMutation.mutate(
                { id: entity.id, data: { checkOutMethod: 'SECURITY_DESK' } },
                {
                  onSuccess: () => {
                    showSuccess(`${entity.visitorName} checked out`);
                    setVisitCode('');
                  },
                },
              );
            },
          });
          return;
        }
        if (['CHECKED_OUT', 'AUTO_CHECKED_OUT', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(entity.status)) {
          showWarning(`Visit is ${String(entity.status).toLowerCase().replace('_', ' ')}`);
          return;
        }
        setPendingVisit(entity);
      } else if (entityType === 'recurring_pass') {
        if (entity.status === 'REVOKED') { showWarning('This recurring pass has been revoked'); return; }
        if (entity.status === 'EXPIRED') { showWarning('This recurring pass has expired'); return; }
        setPassInfo({ type: entityType, data: entity });
      } else if (entityType === 'vehicle_pass' || entityType === 'material_pass') {
        setPassInfo({ type: entityType, data: entity });
      } else {
        showWarning('Unrecognised code type');
      }
    } catch {
      showWarning('No visit or pass found for this code');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCodeCheckIn = () => {
    if (!visitCode.trim()) return;
    lookupAndPrepareCheckIn(visitCode.trim());
  };

  // ── Scan-driven actions — open the rich capture modal ──

  const handleRecordMaterialEntry = () => {
    if (!passInfo || passInfo.type !== 'material_pass') return;
    setScanCaptureMode({ kind: 'material-entry', pass: passInfo.data });
  };

  const handleMarkMaterialReturned = () => {
    if (!passInfo || passInfo.type !== 'material_pass') return;
    setScanCaptureMode({ kind: 'material-return', pass: passInfo.data });
  };

  const handleRecordVehicleEntry = () => {
    if (!passInfo || passInfo.type !== 'vehicle_pass') return;
    setScanCaptureMode({ kind: 'vehicle-entry', pass: passInfo.data });
  };

  const handleRecordVehicleExit = () => {
    if (!passInfo || passInfo.type !== 'vehicle_pass') return;
    setScanCaptureMode({ kind: 'vehicle-exit', pass: passInfo.data });
  };

  const submitScanCapture = (payload: Record<string, unknown>) => {
    if (!scanCaptureMode) return;
    const { kind, pass } = scanCaptureMode;
    const onDone = (label: string) => {
      showSuccess(label);
      setScanCaptureMode(null);
      setPassInfo(null);
      setVisitCode('');
    };
    if (kind === 'material-entry') {
      recordMaterialEntryMutation.mutate({ id: pass.id, data: payload }, { onSuccess: () => onDone('Material entry recorded') });
    } else if (kind === 'material-return') {
      markMaterialReturnedMutation.mutate({ id: pass.id, data: payload as any }, { onSuccess: () => onDone('Material return recorded') });
    } else if (kind === 'vehicle-entry') {
      recordVehicleEntryMutation.mutate({ id: pass.id, data: payload }, { onSuccess: () => onDone('Vehicle entry recorded') });
    } else if (kind === 'vehicle-exit') {
      recordVehicleExitMutation.mutate({ id: pass.id, data: payload }, { onSuccess: () => onDone('Vehicle exit recorded') });
    }
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

      <AppTopHeader title="Gate Operations" subtitle="Main Gate" onMenuPress={toggle} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={isFetchingAny} onRefresh={refreshAll} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
          }
        >
          {/* ─── Universal Gate Scanner ─── */}
          <Animated.View entering={FadeInDown.duration(400)} style={s.scannerCard}>
            <Text style={s.sectionLabel}>UNIVERSAL GATE SCANNER</Text>
            <View style={s.scannerFrame}>
              <View style={[s.scannerCorner, s.scannerCornerTL]} />
              <View style={[s.scannerCorner, s.scannerCornerTR]} />
              <View style={[s.scannerCorner, s.scannerCornerBL]} />
              <View style={[s.scannerCorner, s.scannerCornerBR]} />
              <Pressable onPress={handleScanQR} style={s.scannerCenter}>
                <Svg width={56} height={56} viewBox="0 0 24 24">
                  <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke={colors.primary[500]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z" stroke={colors.primary[500]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="font-inter text-base font-bold text-primary-950 dark:text-white mt-3">Scan Any QR / Barcode</Text>
                <Text className="font-inter text-xs text-neutral-500 mt-1">Visitor · Vehicle · Material · Group</Text>
                <Text className="font-inter text-[10px] text-neutral-400 mt-2">Tap to scan or enter code below</Text>
              </Pressable>
            </View>
            <View style={s.codeInputRow}>
              <View style={[formStyles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={[formStyles.textInput, isDark && { color: colors.white }]}
                  placeholder="e.g. VIS-00001"
                  value={visitCode}
                  onChangeText={setVisitCode}
                  autoCapitalize="characters"
                  onSubmitEditing={handleCodeCheckIn}
                />
              </View>
              <Pressable
                onPress={handleCodeCheckIn}
                disabled={checkInMutation.isPending || isLookingUp || !visitCode.trim()}
                style={[s.codeSubmitBtn, (!visitCode.trim() || checkInMutation.isPending || isLookingUp) && { opacity: 0.5 }]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>
          </Animated.View>

          {/* ─── Quick Actions ─── */}
          {/* ─── Quick Actions ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={s.cardWrap}>
            <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
            <View style={dashboardStyles.quickActionsRow}>
              <QuickActionChip icon="walk-in"   tint={colors.success[700]} bg={colors.success[50]} label="Walk-In"  onPress={() => setShowWalkInModal(true)} />
              <QuickActionChip icon="vehicle"   tint={colors.primary[700]} bg={colors.primary[50]} label="Vehicle"  onPress={() => setShowVehicleModal(true)} />
              <QuickActionChip icon="material"  tint={colors.accent[700]}  bg={colors.accent[50]}  label="Material" onPress={() => setShowMaterialModal(true)} />
              <QuickActionChip icon="group"     tint={colors.info[700]}    bg={colors.info[50]}    label="Group"    onPress={() => router.push('/company/visitors/group-visits' as any)} />
              <QuickActionChip icon="emergency" tint={colors.danger[700]}  bg={colors.danger[50]}  label="Emergency" onPress={() => router.push('/company/visitors/emergency' as any)} />
            </View>
          </Animated.View>

          {/* ─── Today at a Glance ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={s.cardWrap}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>TODAY AT A GLANCE</Text>
              <Text className="font-inter text-[10px] text-neutral-500">{fmt.date(new Date().toISOString())}</Text>
            </View>
            <View style={dashboardStyles.tilesGrid}>
              <StatTile value={today.expectedVisitors ?? 0} label="Expected" tint={colors.success[700]} bg={colors.success[50]} icon="users" onPress={() => router.push('/company/visitors/list?status=EXPECTED' as any)} />
              <StatTile value={today.checkedInVisitors ?? 0} label="Checked-In" tint={colors.primary[700]} bg={colors.primary[50]} icon="check" onPress={() => router.push('/company/visitors/list?status=CHECKED_IN' as any)} />
              <StatTile value={today.checkedOutVisitors ?? 0} label="Checked-Out" tint={colors.warning[700]} bg={colors.warning[50]} icon="logout" onPress={() => router.push('/company/visitors/list?status=CHECKED_OUT' as any)} />
              <StatTile value={today.yetToArriveVisitors ?? 0} label="Yet to Arrive" tint={colors.accent[700]} bg={colors.accent[50]} icon="clock" onPress={() => router.push('/company/visitors/list?status=EXPECTED' as any)} />
            </View>
          </Animated.View>

          {/* ─── Live Inside Premises ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(180)} style={s.cardWrap}>
            <Text style={s.sectionLabel}>LIVE INSIDE PREMISES</Text>
            <View style={dashboardStyles.tilesGrid}>
              <StatTile value={live.visitorsInside ?? 0} label="Visitors Inside" tint={colors.success[700]} bg={colors.success[50]} icon="users" onPress={() => router.push('/company/visitors/on-site' as any)} />
              <StatTile value={live.vehiclesInside ?? 0} label="Vehicles Inside" tint={colors.primary[700]} bg={colors.primary[50]} icon="vehicle" onPress={() => router.push('/company/visitors/vehicle-passes' as any)} />
              <StatTile value={live.contractorsInside ?? 0} label="Contractors" tint={colors.warning[700]} bg={colors.warning[50]} icon="hardhat" onPress={() => router.push('/company/visitors/on-site' as any)} />
              <StatTile value={live.materialsPending ?? 0} label="Materials Pending" tint={colors.accent[700]} bg={colors.accent[50]} icon="material" onPress={() => router.push('/company/visitors/material-passes' as any)} />
            </View>
          </Animated.View>

          {/* ─── Expected Visitors ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(220)} style={s.cardWrap}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>EXPECTED VISITORS TODAY</Text>
              <Pressable onPress={() => router.push('/company/visitors/list?status=EXPECTED' as any)}>
                <Text className="font-inter text-xs font-bold text-primary-600">View All ›</Text>
              </Pressable>
            </View>
            {expectedVisitors.length === 0 ? (
              <EmptyState icon="inbox" title="No expected visitors" message="No pre-registered visitors are pending arrival." />
            ) : (
              expectedVisitors.map((v: any) => (
                <ExpectedVisitorRow
                  key={v.id}
                  item={v}
                  fmt={fmt}
                  onCheckIn={() => {
                    // Reuse the existing pre-check-in modal flow
                    setPendingVisit(v);
                  }}
                />
              ))
            )}
          </Animated.View>

          {/* ─── Expected Vehicles ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={s.cardWrap}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>EXPECTED VEHICLES</Text>
              <Pressable onPress={() => router.push('/company/visitors/vehicle-passes' as any)}>
                <Text className="font-inter text-xs font-bold text-primary-600">View All ›</Text>
              </Pressable>
            </View>
            {expectedVehicles.length === 0 ? (
              <EmptyState icon="inbox" title="No expected vehicles" message="No active vehicle passes are awaiting entry." />
            ) : (
              expectedVehicles.map((v: any) => (
                <ExpectedVehicleRow key={v.id} item={v} fmt={fmt} />
              ))
            )}
          </Animated.View>

          {/* ─── Expected Materials ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={s.cardWrap}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>EXPECTED MATERIALS</Text>
              <Pressable onPress={() => router.push('/company/visitors/material-passes' as any)}>
                <Text className="font-inter text-xs font-bold text-primary-600">View All ›</Text>
              </Pressable>
            </View>
            {expectedMaterials.length === 0 ? (
              <EmptyState icon="inbox" title="No expected materials" message="No material passes are pending entry today." />
            ) : (
              expectedMaterials.map((m: any) => (
                <ExpectedMaterialRow key={m.id} item={m} fmt={fmt} />
              ))
            )}
          </Animated.View>

          {/* ─── Recent Activity ─── */}
          <Animated.View entering={FadeInDown.duration(400).delay(340)} style={s.cardWrap}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>RECENT ACTIVITY</Text>
              <Pressable onPress={() => router.push('/company/visitors/pass-history' as any)}>
                <Text className="font-inter text-xs font-bold text-primary-600">View All ›</Text>
              </Pressable>
            </View>
            {recentActivity.length === 0 ? (
              <EmptyState icon="inbox" title="No recent activity" message="Scans and check-ins will appear here." />
            ) : (
              recentActivity.map((a: any) => (
                <ActivityRow key={a.id} item={a} fmt={fmt} />
              ))
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Walk-In Modal ─── */}
      <Modal visible={showWalkInModal} animationType="slide" onRequestClose={() => setShowWalkInModal(false)}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
          <View style={[preCheckInStyles.header, { paddingTop: insets.top + 8 }]}>
            <View style={{ flex: 1 }}>
              <Text className="font-inter text-lg font-bold text-white">Walk-In Visitor</Text>
              <Text className="font-inter text-xs text-white/70">Register and check in at the gate</Text>
            </View>
            <Pressable onPress={() => setShowWalkInModal(false)} hitSlop={12} style={preCheckInStyles.closeBtn}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
            <WalkInForm
              onSubmit={(data) => {
                handleWalkInSubmit(data);
                setShowWalkInModal(false);
              }}
              isSaving={createMutation.isPending}
              visitorTypes={visitorTypes}
            />
          </ScrollView>
        </View>
      </Modal>

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

      {/* Pass Info Modal — recurring, vehicle, material passes */}
      <Modal visible={!!passInfo} animationType="slide" onRequestClose={() => setPassInfo(null)}>
        {passInfo && (
          <View style={{ flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface }}>
            <View style={[preCheckInStyles.header, { paddingTop: insets.top + 8 }]}>
              <View style={{ flex: 1 }}>
                <Text className="font-inter text-lg font-bold text-white">
                  {passInfo.type === 'recurring_pass' ? 'Recurring Pass' : passInfo.type === 'vehicle_pass' ? 'Vehicle Pass' : 'Material Pass'}
                </Text>
                <Text className="font-inter text-xs text-white/70">{passInfo.data.passNumber}</Text>
              </View>
              <Pressable onPress={() => setPassInfo(null)} hitSlop={12} style={preCheckInStyles.closeBtn}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={colors.white} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
              <View style={preCheckInStyles.infoCard}>
                {passInfo.type === 'recurring_pass' && (
                  <>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{passInfo.data.visitorName}</Text>
                    {passInfo.data.visitorCompany ? <Text className="font-inter text-xs text-neutral-500">{passInfo.data.visitorCompany}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <View style={preCheckInStyles.codeBadge}><Text className="font-inter text-[10px] font-bold text-primary-600">{passInfo.data.passType}</Text></View>
                      <View style={[preCheckInStyles.codeBadge, { backgroundColor: passInfo.data.status === 'ACTIVE' ? colors.success[50] : colors.danger[50] }]}>
                        <Text className={`font-inter text-[10px] font-bold ${passInfo.data.status === 'ACTIVE' ? 'text-success-700' : 'text-danger-700'}`}>{passInfo.data.status}</Text>
                      </View>
                    </View>
                    {passInfo.data.validFrom && <Text className="font-inter text-xs text-neutral-500 mt-2">Valid: {fmt.date(passInfo.data.validFrom)} — {fmt.date(passInfo.data.validUntil)}</Text>}
                  </>
                )}
                {passInfo.type === 'vehicle_pass' && (
                  <>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{passInfo.data.vehicleRegNumber}</Text>
                    <Text className="font-inter text-xs text-neutral-500">{passInfo.data.vehicleType} — Driver: {passInfo.data.driverName}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mt-1">Pass: {passInfo.data.passNumber}</Text>
                  </>
                )}
                {passInfo.type === 'material_pass' && (
                  <>
                    <Text className="font-inter text-base font-bold text-primary-950 dark:text-white">{passInfo.data.description}</Text>
                    <Text className="font-inter text-xs text-neutral-500">{passInfo.data.type} — Qty: {passInfo.data.quantityIssued}</Text>
                    <Text className="font-inter text-xs text-neutral-500 mt-1">Pass: {passInfo.data.passNumber} — Status: {passInfo.data.returnStatus}</Text>
                  </>
                )}
              </View>

              {/* Recurring pass — check-in action */}
              {passInfo.type === 'recurring_pass' && passInfo.data.status === 'ACTIVE' && (
                <Pressable
                  onPress={() => {
                    recurringPassCheckInMutation.mutate(
                      { id: passInfo.data.id, data: passInfo.data.gateId ? { gateId: passInfo.data.gateId } : {} },
                      {
                        onSuccess: (result: any) => {
                          const badgeNo = result?.data?.badgeNumber ?? result?.badgeNumber;
                          showSuccess(badgeNo ? `Checked in — Badge: ${badgeNo}` : 'Recurring pass visitor checked in');
                          setPassInfo(null);
                          setVisitCode('');
                        },
                      },
                    );
                  }}
                  disabled={recurringPassCheckInMutation.isPending}
                  style={[preCheckInStyles.checkInBtn, recurringPassCheckInMutation.isPending && { opacity: 0.5 }, { marginTop: 20 }]}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text className="font-inter text-sm font-bold text-white ml-2">
                    {recurringPassCheckInMutation.isPending ? 'Checking In...' : 'Check In via Recurring Pass'}
                  </Text>
                </Pressable>
              )}

              {/* Vehicle pass — entry / exit actions based on status + last event */}
              {passInfo.type === 'vehicle_pass' && (
                <View style={{ marginTop: 16, gap: 10 }}>
                  {passInfo.data.status === 'ACTIVE' ? (
                    <>
                      <Pressable
                        onPress={handleRecordVehicleEntry}
                        disabled={recordVehicleEntryMutation.isPending}
                        style={[preCheckInStyles.checkInBtn, recordVehicleEntryMutation.isPending && { opacity: 0.5 }]}
                      >
                        <Text className="font-inter text-sm font-bold text-white">
                          {recordVehicleEntryMutation.isPending ? 'Recording…' : '↓ Record Entry'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleRecordVehicleExit}
                        disabled={recordVehicleExitMutation.isPending}
                        style={[preCheckInStyles.checkInBtn, { backgroundColor: colors.warning[600] }, recordVehicleExitMutation.isPending && { opacity: 0.5 }]}
                      >
                        <Text className="font-inter text-sm font-bold text-white">
                          {recordVehicleExitMutation.isPending ? 'Recording…' : '↑ Record Exit'}
                        </Text>
                      </Pressable>
                      <Text className="font-inter text-[11px] text-neutral-500 text-center">
                        Valid until: {passInfo.data.validUntil ? fmt.date(passInfo.data.validUntil) : '—'}
                      </Text>
                    </>
                  ) : (
                    <View style={[preCheckInStyles.sectionCard, { alignItems: 'center' as const }]}>
                      <Text className="font-inter text-xs text-neutral-500 text-center">
                        This pass is {String(passInfo.data.status ?? '').toLowerCase()} and cannot be used at the gate.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Material pass — entry / return / exit actions based on type + status */}
              {passInfo.type === 'material_pass' && (() => {
                const mtype = passInfo.data.type;
                const mstatus = passInfo.data.status;
                // Action label per material type:
                //   INWARD  ISSUED  → Record Entry (material arrives)
                //   OUTWARD ISSUED  → Record Exit  (material leaves)
                //   RETURNABLE ISSUED → Record Exit (dispatch)
                //   RETURNABLE IN_USE → Record Return (comes back)
                const showEntryAction = mstatus === 'ISSUED';
                const isOutwardLike = mtype === 'OUTWARD' || mtype === 'RETURNABLE';
                const showReturnAction = mstatus === 'IN_USE' && mtype === 'RETURNABLE';
                const isTerminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(mstatus);
                return (
                  <View style={{ marginTop: 16, gap: 10 }}>
                    {showEntryAction && (
                      <Pressable
                        onPress={handleRecordMaterialEntry}
                        disabled={recordMaterialEntryMutation.isPending}
                        style={[preCheckInStyles.checkInBtn, { backgroundColor: isOutwardLike ? colors.warning[600] : colors.success[600] }, recordMaterialEntryMutation.isPending && { opacity: 0.5 }]}
                      >
                        <Text className="font-inter text-sm font-bold text-white">
                          {recordMaterialEntryMutation.isPending ? 'Recording…' : isOutwardLike ? '↑ Record Exit' : '↓ Record Entry'}
                        </Text>
                      </Pressable>
                    )}
                    {showReturnAction && (
                      <>
                        <Pressable
                          onPress={handleMarkMaterialReturned}
                          disabled={markMaterialReturnedMutation.isPending}
                          style={[preCheckInStyles.checkInBtn, { backgroundColor: colors.success[600] }, markMaterialReturnedMutation.isPending && { opacity: 0.5 }]}
                        >
                          <Text className="font-inter text-sm font-bold text-white">
                            {markMaterialReturnedMutation.isPending ? 'Recording…' : '↓ Record Full Return'}
                          </Text>
                        </Pressable>
                        <Text className="font-inter text-[11px] text-neutral-500 text-center">
                          For partial returns, open this pass from Material Passes screen.
                        </Text>
                      </>
                    )}
                    {isTerminal && (
                      <View style={[preCheckInStyles.sectionCard, { alignItems: 'center' as const }]}>
                        <Text className="font-inter text-xs text-neutral-500 text-center">
                          This pass is {String(mstatus).toLowerCase()} and cannot be actioned at the gate.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Quick-Create Vehicle Pass */}
      <QuickCreateVehicleModal
        visible={showVehicleModal}
        onClose={() => setShowVehicleModal(false)}
        onCreated={(passId) => {
          // Auto record entry so the pass goes immediately IN_USE/active
          recordVehicleEntryMutation.mutate({ id: passId, data: { notes: 'Created at gate' } }, {
            onSuccess: () => showSuccess('Pass created and vehicle entered'),
          });
        }}
        gates={gatesList}
        locations={locationsList}
      />

      {/* Quick-Create Material Pass */}
      <QuickCreateMaterialModal
        visible={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        onCreated={(passId) => {
          // Auto record entry so the pass goes immediately COMPLETED (INWARD/OUTWARD) or IN_USE (RETURNABLE)
          recordMaterialEntryMutation.mutate({ id: passId, data: { notes: 'Created at gate' } }, {
            onSuccess: () => showSuccess('Pass created and entry recorded'),
          });
        }}
        gates={gatesList}
        locations={locationsList}
        employees={employeesList}
      />

      {/* Scan Capture Modal — quantity / notes / odometer */}
      <ScanCaptureModal
        mode={scanCaptureMode}
        visible={!!scanCaptureMode}
        onSubmit={submitScanCapture}
        onCancel={() => setScanCaptureMode(null)}
        isSaving={
          recordMaterialEntryMutation.isPending ||
          markMaterialReturnedMutation.isPending ||
          recordVehicleEntryMutation.isPending ||
          recordVehicleExitMutation.isPending
        }
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
  cardWrap: { marginHorizontal: 16, marginTop: 14, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.neutral[100], shadowColor: isDark ? '#000' : colors.primary[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.4 : 0.04, shadowRadius: 12, elevation: 2 },
  sectionLabel: { fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: isDark ? colors.neutral[400] : colors.neutral[500], textTransform: 'uppercase', marginBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  scannerCard: { marginHorizontal: 16, marginTop: 14, backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.neutral[100], shadowColor: isDark ? '#000' : colors.primary[900], shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.5 : 0.06, shadowRadius: 16, elevation: 3 },
  scannerFrame: { borderRadius: 16, backgroundColor: isDark ? '#100D1F' : colors.primary[50], padding: 28, alignItems: 'center', position: 'relative', minHeight: 210, justifyContent: 'center', marginVertical: 6, borderWidth: 1.5, borderColor: isDark ? colors.primary[800] : colors.primary[100], borderStyle: 'dashed' as const },
  scannerCenter: { alignItems: 'center', justifyContent: 'center' },
  scannerCorner: { position: 'absolute', width: 24, height: 24, borderColor: colors.primary[500], borderWidth: 3 },
  scannerCornerTL: { top: 10, left: 10, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  scannerCornerTR: { top: 10, right: 10, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  scannerCornerBL: { bottom: 10, left: 10, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  scannerCornerBR: { bottom: 10, right: 10, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
  codeInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  codeSubmitBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
});

const dashboardStyles = StyleSheet.create({
  // Quick Actions — tappable card chips ≥ 44pt with stable press state
  quickActionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' as const },
  actionChip: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    backgroundColor: colors.white,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionChipPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.1,
    elevation: 2,
  },
  actionIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },

  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 10 },
  statTile: { flexBasis: '47%', flexGrow: 1, padding: 14, borderRadius: 16, minHeight: 96, justifyContent: 'space-between' as const },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral[100] },
  listIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
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
