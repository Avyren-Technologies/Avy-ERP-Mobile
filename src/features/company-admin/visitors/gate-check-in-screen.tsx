/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
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
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import {
  useCheckInVisit,
  useCreateVisit,
} from '@/features/company-admin/api/use-visitor-mutations';
import {
  useDashboardToday,
  useVisitorTypes,
} from '@/features/company-admin/api/use-visitor-queries';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';
import { useIsDark } from '@/hooks/use-is-dark';

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
  const [hostName, setHostName] = React.useState('');
  const [selectedTypeId, setSelectedTypeId] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
    onSubmit({
      visitorName: name.trim(),
      visitorCompany: company.trim() || undefined,
      visitorPhone: phone.trim(),
      visitorEmail: email.trim() || undefined,
      purpose: purpose.trim(),
      hostName: hostName.trim() || undefined,
      visitorTypeId: selectedTypeId || undefined,
      isWalkIn: true,
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
      <View style={formStyles.fieldWrap}>
        <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100 uppercase tracking-wider">Host Employee</Text>
        <View style={formStyles.inputWrap}>
          <TextInput style={[formStyles.textInput, isDark && { color: colors.white }]} placeholder="Who are they visiting?" placeholderTextColor={colors.neutral[400]} value={hostName} onChangeText={setHostName} />
        </View>
      </View>

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

      {/* Submit */}
      <Pressable onPress={handleSubmit} disabled={isSaving} style={[formStyles.submitBtn, isSaving && { opacity: 0.5 }]}>
        <Text className="font-inter text-sm font-bold text-white">{isSaving ? 'Registering...' : 'CHECK IN WALK-IN'}</Text>
      </Pressable>
    </Animated.View>
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
            {item.visitorCompany ?? item.visitor?.company ?? ''} {item.expectedArrival ? `- Expected ${fmt.time(item.expectedArrival)}` : ''}
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

  const { data: todayResponse, isLoading, refetch, isFetching } = useDashboardToday({ status: 'PRE_REGISTERED,APPROVED' });
  const { data: typesResponse } = useVisitorTypes();

  const checkInMutation = useCheckInVisit();
  const createMutation = useCreateVisit();

  const visitorTypes = React.useMemo(() => {
    const raw = (typesResponse as any)?.data ?? typesResponse ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({ id: t.id ?? '', name: t.name ?? '' }));
  }, [typesResponse]);

  const expectedVisitors = React.useMemo(() => {
    const raw = (todayResponse as any)?.data?.visits ?? (todayResponse as any)?.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((v: any) => v.status === 'PRE_REGISTERED' || v.status === 'APPROVED');
  }, [todayResponse]);

  const handleCodeCheckIn = () => {
    if (!visitCode.trim()) return;
    checkInMutation.mutate(
      { id: visitCode.trim() },
      {
        onSuccess: () => {
          showSuccess('Visitor checked in successfully');
          setVisitCode('');
        },
      },
    );
  };

  const handleExpectedCheckIn = (visitId: string) => {
    checkInMutation.mutate(
      { id: visitId },
      {
        onSuccess: () => {
          showSuccess('Visitor checked in successfully');
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
                    onPress={handleCodeCheckIn}
                    disabled={checkInMutation.isPending || !visitCode.trim()}
                    style={[s.codeSubmitBtn, (!visitCode.trim() || checkInMutation.isPending) && { opacity: 0.5 }]}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke={colors.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                </View>
              </Animated.View>

              {/* Expected Visitors */}
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
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

      <ConfirmModal {...confirmModalProps} />
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 16 },
  tabRow: { flexDirection: 'row', marginHorizontal: 24, marginTop: 16, backgroundColor: isDark ? '#1A1730' : colors.neutral[100], borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary[600] },
  codeCard: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
  codeInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  codeSubmitBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.primary[600], justifyContent: 'center', alignItems: 'center' },
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
});
