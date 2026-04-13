/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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

// ============ MAIN COMPONENT ============

export function VMSSettingsScreen() {
  const isDark = useIsDark();
  const s = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  const { data: response, isLoading, error, refetch, isFetching } = useVMSConfig();
  const updateMutation = useUpdateVMSConfig();

  const configRaw = React.useMemo(() => (response as any)?.data ?? response ?? {}, [response]);

  const configs: ConfigToggle[] = React.useMemo(() => [
    { key: 'requireApproval', label: 'Require Approval for Pre-Registrations', description: 'Pre-registered visits must be approved by the host before the visitor can check in.', value: !!configRaw.requireApproval },
    { key: 'requireIdProof', label: 'Require ID Proof', description: 'Visitors must provide a valid ID proof during check-in.', value: !!configRaw.requireIdProof },
    { key: 'requirePhoto', label: 'Capture Visitor Photo', description: 'Capture a photo of the visitor during check-in.', value: !!configRaw.requirePhoto },
    { key: 'enableWatchlist', label: 'Enable Watchlist', description: 'Check visitors against a watchlist/blocklist during check-in.', value: configRaw.enableWatchlist !== false },
    { key: 'enableVehicleTracking', label: 'Vehicle Tracking', description: 'Track visitor vehicles including plate number and parking details.', value: !!configRaw.enableVehicleTracking },
    { key: 'enableMaterialPass', label: 'Material Pass', description: 'Enable material in/out tracking for visitors.', value: !!configRaw.enableMaterialPass },
    { key: 'enableRecurringPasses', label: 'Recurring Passes', description: 'Allow creation of recurring visitor passes for frequent visitors.', value: !!configRaw.enableRecurringPasses },
    { key: 'enableGroupVisits', label: 'Group Visits', description: 'Allow group visit registration with batch check-in.', value: !!configRaw.enableGroupVisits },
    { key: 'enableEmergencyMuster', label: 'Emergency Muster', description: 'Enable emergency muster list generation from on-site visitors.', value: configRaw.enableEmergencyMuster !== false },
    { key: 'autoCheckoutEnabled', label: 'Auto Check-Out', description: 'Automatically check out visitors at end of day.', value: !!configRaw.autoCheckoutEnabled },
    { key: 'notifyHostOnArrival', label: 'Notify Host on Arrival', description: 'Send a notification to the host when their visitor arrives.', value: configRaw.notifyHostOnArrival !== false },
    { key: 'printBadge', label: 'Print Visitor Badge', description: 'Print a visitor badge upon check-in.', value: !!configRaw.printBadge },
  ], [configRaw]);

  const handleToggle = (key: string, currentValue: boolean) => {
    updateMutation.mutate(
      { [key]: !currentValue },
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
            <View style={s.configCard}>
              {configs.map((config, idx) => (
                <React.Fragment key={config.key}>
                  <ToggleRow config={config} onToggle={() => handleToggle(config.key, config.value)} />
                  {idx < configs.length - 1 && <View style={s.divider} />}
                </React.Fragment>
              ))}
            </View>
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
  configCard: { backgroundColor: isDark ? '#1A1730' : colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: isDark ? colors.primary[900] : colors.primary[50] },
  divider: { height: 1, backgroundColor: isDark ? colors.primary[900] : colors.neutral[100], marginVertical: 4 },
});

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  track: { width: 48, height: 26, borderRadius: 13, backgroundColor: colors.neutral[300], justifyContent: 'center', padding: 2 },
  trackActive: { backgroundColor: colors.primary[600] },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  thumbActive: { alignSelf: 'flex-end' as const },
});
