/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { useSidebar } from '@/components/ui/sidebar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { showSuccess } from '@/components/ui/utils';

import { useUpdateVMSConfig } from '@/features/company-admin/api/use-visitor-mutations';
import { useVMSConfig } from '@/features/company-admin/api/use-visitor-queries';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface ConfigToggle {
  key: string;
  label: string;
  description: string;
  value: boolean;
}

interface ConfigRequirement {
  key: string;
  label: string;
  description: string;
  value: string; // 'ALWAYS' | 'PER_VISITOR_TYPE' | 'NEVER'
}

interface ConfigSection {
  title: string;
  toggles?: ConfigToggle[];
  requirements?: ConfigRequirement[];
}

// ============ REQUIREMENT OPTIONS ============

const REQUIREMENT_OPTIONS = [
  { value: 'ALWAYS', label: 'Always' },
  { value: 'PER_VISITOR_TYPE', label: 'Per Type' },
  { value: 'NEVER', label: 'Never' },
] as const;

const DEFAULT_NDA_TEMPLATE = `# Non-Disclosure Agreement

## Confidentiality Obligation

By entering the premises of **[Company Name]**, I ("the Visitor") acknowledge and agree to the following:

1. **Confidential Information**: Any information, whether written, oral, or visual, that I may access, observe, or receive during my visit is considered confidential.

2. **Non-Disclosure**: I agree not to disclose, publish, or otherwise reveal any confidential information to any third party during or after my visit without prior written consent.

3. **No Recording**: I will not photograph, video record, or make audio recordings of any area, equipment, process, or document without explicit written permission.

4. **Return of Materials**: I will return any documents, materials, or equipment provided to me during the visit before leaving the premises.

5. **Duration**: This obligation of confidentiality shall remain in effect indefinitely and shall survive the conclusion of my visit.

6. **Acknowledgement**: I understand that violation of this agreement may result in legal action.

**By signing below (or accepting digitally), I confirm that I have read, understood, and agree to the terms above.**`;

// ============ TOGGLE ROW ============

function ToggleRow({
  config,
  onToggle,
}: {
  readonly config: ConfigToggle;
  readonly onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={toggleStyles.row}>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{config.label}</Text>
        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{config.description}</Text>
      </View>
      <View style={[toggleStyles.track, config.value && toggleStyles.trackActive]}>
        <View style={[toggleStyles.thumb, config.value && toggleStyles.thumbActive]} />
      </View>
    </Pressable>
  );
}

// ============ REQUIREMENT ROW ============

function RequirementRow({
  config,
  onSelect,
}: {
  readonly config: ConfigRequirement;
  readonly onSelect: (value: string) => void;
}) {
  return (
    <View style={toggleStyles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">{config.label}</Text>
        <Text className="mt-1 font-inter text-xs text-neutral-500 dark:text-neutral-400">{config.description}</Text>
      </View>
      <View style={requirementStyles.optionsRow}>
        {REQUIREMENT_OPTIONS.map((opt) => {
          const selected = config.value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[requirementStyles.chip, selected && requirementStyles.chipActive]}
            >
              <Text className={`font-inter text-[10px] font-bold ${selected ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ============ SECTION CARD ============

function SectionCard({
  title,
  isDark,
  children,
}: {
  readonly title: string;
  readonly isDark: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text className="mb-3 font-inter text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">{title}</Text>
      <View style={[sectionStyles.card, isDark && sectionStyles.cardDark]}>
        {children}
      </View>
    </View>
  );
}

// ============ MAIN COMPONENT ============

export function VMSSettingsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const { data: response, isLoading, error, refetch, isFetching } = useVMSConfig();
  const updateMutation = useUpdateVMSConfig();

  const configRaw = React.useMemo(() => (response as any)?.data ?? response ?? {}, [response]);

  const [ndaContent, setNdaContent] = React.useState<string | null>(null);
  const ndaInitialized = React.useRef(false);

  React.useEffect(() => {
    if (configRaw && Object.keys(configRaw).length > 0 && !ndaInitialized.current) {
      setNdaContent(configRaw.ndaTemplateContent ?? null);
      ndaInitialized.current = true;
    }
  }, [configRaw]);

  const sections: ConfigSection[] = React.useMemo(() => [
    {
      title: 'Registration',
      toggles: [
        { key: 'walkInAllowed', label: 'Allow Walk-In', description: 'Enable walk-in visitors at the gate.', value: configRaw.walkInAllowed ?? true },
        { key: 'qrSelfRegistrationEnabled', label: 'QR Self-Registration', description: 'Visitors can self-register via QR code.', value: configRaw.qrSelfRegistrationEnabled ?? true },
        { key: 'preRegistrationEnabled', label: 'Pre-Registration', description: 'Enable pre-registration of visits.', value: configRaw.preRegistrationEnabled ?? true },
      ],
    },
    {
      title: 'Verification & Compliance',
      requirements: [
        { key: 'photoCapture', label: 'Photo Capture', description: 'When to capture visitor photo.', value: configRaw.photoCapture ?? 'PER_VISITOR_TYPE' },
        { key: 'idVerification', label: 'ID Verification', description: 'When to require ID verification.', value: configRaw.idVerification ?? 'PER_VISITOR_TYPE' },
        { key: 'safetyInduction', label: 'Safety Induction', description: 'When to require safety induction.', value: configRaw.safetyInduction ?? 'PER_VISITOR_TYPE' },
        { key: 'ndaRequired', label: 'NDA Required', description: 'When to require NDA signing.', value: configRaw.ndaRequired ?? 'PER_VISITOR_TYPE' },
      ],
    },
    {
      title: 'Badges',
      toggles: [
        { key: 'badgePrintingEnabled', label: 'Badge Printing', description: 'Print physical visitor badges.', value: configRaw.badgePrintingEnabled ?? true },
        { key: 'digitalBadgeEnabled', label: 'Digital Badge', description: 'Issue digital visitor badges.', value: configRaw.digitalBadgeEnabled ?? true },
      ],
    },
    {
      title: 'Approval',
      toggles: [
        { key: 'walkInApprovalRequired', label: 'Walk-In Approval', description: 'Walk-in visits require host approval.', value: configRaw.walkInApprovalRequired ?? true },
        { key: 'qrSelfRegApprovalRequired', label: 'QR Self-Reg Approval', description: 'QR self-registered visits require approval.', value: configRaw.qrSelfRegApprovalRequired ?? true },
      ],
    },
    {
      title: 'Check-Out & Overstay',
      toggles: [
        { key: 'overstayAlertEnabled', label: 'Overstay Alert', description: 'Alert when visitors exceed expected duration.', value: configRaw.overstayAlertEnabled ?? true },
        { key: 'autoCheckOutEnabled', label: 'Auto Check-Out', description: 'Automatically check out visitors at a set time.', value: configRaw.autoCheckOutEnabled ?? false },
      ],
    },
    {
      title: 'Features',
      toggles: [
        { key: 'vehicleGatePassEnabled', label: 'Vehicle Gate Pass', description: 'Track vehicle entry and exit.', value: configRaw.vehicleGatePassEnabled ?? true },
        { key: 'materialGatePassEnabled', label: 'Material Gate Pass', description: 'Track material in/out with visitors.', value: configRaw.materialGatePassEnabled ?? true },
        { key: 'recurringPassEnabled', label: 'Recurring Passes', description: 'Allow recurring visitor passes.', value: configRaw.recurringPassEnabled ?? true },
        { key: 'groupVisitEnabled', label: 'Group Visits', description: 'Allow batch visitor registrations.', value: configRaw.groupVisitEnabled ?? true },
        { key: 'emergencyMusterEnabled', label: 'Emergency Muster', description: 'Emergency evacuation visitor tracking.', value: configRaw.emergencyMusterEnabled ?? true },
      ],
    },
  ], [configRaw]);

  const handleToggle = (key: string, currentValue: boolean) => {
    updateMutation.mutate(
      { [key]: !currentValue },
      { onSuccess: () => showSuccess('Setting updated') },
    );
  };

  const handleRequirementChange = (key: string, value: string) => {
    updateMutation.mutate(
      { [key]: value },
      { onSuccess: () => showSuccess('Setting updated') },
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <AppTopHeader title="VMS Settings" onMenuPress={toggle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
        }
      >
        <Animated.View entering={FadeInDown.duration(400)} style={s.sectionWrap}>
          <Text className="font-inter text-2xl font-bold text-primary-950 dark:text-white">Configuration</Text>
          <Text className="mt-1 font-inter text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Manage visitor management system settings
          </Text>

          {isLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : error ? (
            <EmptyState icon="error" title="Failed to load" message="Check your connection and try again." action={{ label: 'Retry', onPress: () => refetch() }} />
          ) : (
            <>
              {sections.map((section) => (
                <SectionCard key={section.title} title={section.title} isDark={isDark}>
                  {section.toggles?.map((t, idx) => (
                    <React.Fragment key={t.key}>
                      <ToggleRow config={t} onToggle={() => handleToggle(t.key, t.value)} />
                      {idx < (section.toggles?.length ?? 0) - 1 && <View style={s.divider} />}
                    </React.Fragment>
                  ))}
                  {section.requirements?.map((r, idx) => (
                    <React.Fragment key={r.key}>
                      <RequirementRow config={r} onSelect={(v) => handleRequirementChange(r.key, v)} />
                      {idx < (section.requirements?.length ?? 0) - 1 && <View style={s.divider} />}
                    </React.Fragment>
                  ))}
                </SectionCard>
              ))}

              {/* NDA Template Section */}
              {configRaw.ndaRequired !== 'NEVER' && (
                <SectionCard title="NDA Template" isDark={isDark}>
                  <View style={{ paddingVertical: 8 }}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">NDA Content</Text>
                    <Text className="mt-1 mb-3 font-inter text-xs text-neutral-500 dark:text-neutral-400">
                      Write the NDA in markdown format. Visitors will see this before signing.
                    </Text>
                    <TextInput
                      value={ndaContent ?? DEFAULT_NDA_TEMPLATE}
                      onChangeText={(text) => setNdaContent(text)}
                      multiline
                      numberOfLines={12}
                      textAlignVertical="top"
                      style={[
                        ndaStyles.textarea,
                        isDark && ndaStyles.textareaDark,
                      ]}
                    />
                    <View style={ndaStyles.buttonRow}>
                      <Pressable
                        onPress={() => setNdaContent(DEFAULT_NDA_TEMPLATE)}
                        style={[ndaStyles.resetButton, isDark && ndaStyles.resetButtonDark]}
                      >
                        <Text className="font-inter text-xs font-bold text-neutral-600 dark:text-neutral-300">Reset to Default</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          updateMutation.mutate(
                            { ndaTemplateContent: ndaContent ?? DEFAULT_NDA_TEMPLATE },
                            { onSuccess: () => showSuccess('NDA template saved') },
                          );
                        }}
                        style={ndaStyles.saveButton}
                      >
                        <Text className="font-inter text-xs font-bold text-white">Save Template</Text>
                      </Pressable>
                    </View>
                  </View>
                </SectionCard>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
  sectionWrap: { paddingHorizontal: 24, marginTop: 16 },
  divider: { height: 1, backgroundColor: isDark ? colors.primary[900] : colors.neutral[100], marginVertical: 4 },
});

const sectionStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.primary[50] },
  cardDark: { backgroundColor: '#1A1730', borderColor: colors.primary[900] },
});

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  track: { width: 48, height: 26, borderRadius: 13, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  trackActive: { backgroundColor: colors.primary[600] },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  thumbActive: { alignSelf: 'flex-end' as const },
});

const requirementStyles = StyleSheet.create({
  optionsRow: { flexDirection: 'row', gap: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200] },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
});

const ndaStyles = StyleSheet.create({
  textarea: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.primary[950],
    minHeight: 200,
    textAlignVertical: 'top',
  },
  textareaDark: {
    borderColor: colors.primary[900],
    backgroundColor: '#1A1730',
    color: colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  resetButtonDark: {
    backgroundColor: '#1A1730',
    borderColor: colors.primary[900],
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary[600],
  },
});
