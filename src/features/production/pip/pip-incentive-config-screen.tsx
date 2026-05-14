/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';

import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';
import { usePipConfig } from '@/features/production/pip/api/use-pip-queries';
import { useUpdatePipConfig } from '@/features/production/pip/api/use-pip-mutations';
import type { PipIncentiveConfig } from '@/lib/api/pip';

// ============ HELPERS ============

function getActiveMethodLabel(config: PipIncentiveConfig | null): string {
  if (!config) return 'Not configured';
  if (config.method1Enabled && config.method2Enabled) return 'Both methods active';
  if (config.method1Enabled) return config.method1Name || 'Method 1';
  if (config.method2Enabled) return config.method2Name || 'Method 2';
  return 'No method active';
}

// ============ METHOD CARD ============

function MethodCard({
  methodNumber,
  subtitle,
  name,
  enabled,
  accentColor,
  isDark,
  onNameChange,
  onToggle,
  isToggling,
  description,
  workedExample,
}: {
  methodNumber: 1 | 2;
  subtitle: string;
  name: string;
  enabled: boolean;
  accentColor: { bg: string; border: string; text: string; dot: string };
  isDark: boolean;
  onNameChange: (v: string) => void;
  onToggle: (v: boolean) => void;
  isToggling: boolean;
  description: string;
  workedExample: string;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(methodNumber === 1 ? 100 : 200)}>
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: enabled
              ? accentColor.border
              : isDark
                ? colors.neutral[700]
                : colors.neutral[200],
          },
        ]}
      >
        {/* Header */}
        <View style={cardStyles.cardHeader}>
          <View>
            <View style={[cardStyles.methodBadge, { backgroundColor: accentColor.bg }]}>
              <Text
                className="font-inter text-[10px] font-bold"
                style={{ color: accentColor.text }}
              >
                METHOD {methodNumber}
              </Text>
            </View>
            <Text className="mt-1 font-inter text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </Text>
          </View>
          <View style={cardStyles.toggleRow}>
            {isToggling ? (
              <ActivityIndicator size="small" color={accentColor.dot} />
            ) : (
              <Switch
                value={enabled}
                onValueChange={onToggle}
                trackColor={{
                  false: colors.neutral[200],
                  true: accentColor.border,
                }}
                thumbColor={enabled ? accentColor.dot : colors.neutral[300]}
              />
            )}
          </View>
        </View>

        {/* Name Input */}
        <View style={cardStyles.fieldWrap}>
          <Text className="mb-1.5 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
            Method Name
          </Text>
          <TextInput
            style={[
              cardStyles.input,
              {
                backgroundColor: isDark ? '#0F0D1A' : colors.neutral[50],
                color: isDark ? colors.white : colors.primary[950],
                borderColor: isDark ? colors.neutral[700] : colors.neutral[200],
              },
            ]}
            placeholder={`Method ${methodNumber} name`}
            placeholderTextColor={colors.neutral[400]}
            value={name}
            onChangeText={onNameChange}
          />
        </View>

        {/* Description */}
        <View style={cardStyles.descBox}>
          <View style={cardStyles.descIcon}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01"
                stroke={accentColor.text}
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-inter text-xs font-semibold text-primary-950 dark:text-white">
              Description
            </Text>
            <Text className="mt-1 font-inter text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
              {description}
            </Text>
          </View>
        </View>

        {/* Worked Example */}
        <View
          style={[
            cardStyles.exampleBox,
            { backgroundColor: isDark ? '#0F0D1A' : accentColor.bg },
          ]}
        >
          <Text
            className="font-inter text-[10px] font-bold"
            style={{ color: accentColor.text }}
          >
            WORKED EXAMPLE
          </Text>
          <Text className="mt-1 font-inter text-[11px] leading-4 text-neutral-600 dark:text-neutral-300">
            {workedExample}
          </Text>
        </View>

        {/* Status */}
        <View style={cardStyles.statusRow}>
          <View
            style={[
              cardStyles.statusDot,
              { backgroundColor: enabled ? colors.success[500] : colors.neutral[300] },
            ]}
          />
          <Text className="font-inter text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            {enabled ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ============ MAIN COMPONENT ============

export function PipIncentiveConfigScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();

  const { data: configRaw, isLoading, error, refetch, isFetching } = usePipConfig();
  const updateConfig = useUpdatePipConfig();

  const config: PipIncentiveConfig | null = React.useMemo(() => {
    const d = (configRaw as any)?.data ?? configRaw;
    if (!d || typeof d !== 'object') return null;
    return d as PipIncentiveConfig;
  }, [configRaw]);

  const [method1Name, setMethod1Name] = React.useState('');
  const [method2Name, setMethod2Name] = React.useState('');
  const [namesDirty, setNamesDirty] = React.useState(false);

  React.useEffect(() => {
    if (config) {
      setMethod1Name(config.method1Name ?? '');
      setMethod2Name(config.method2Name ?? '');
      setNamesDirty(false);
    }
  }, [config]);

  const handleToggle = (method: 1 | 2, value: boolean) => {
    const data: Record<string, unknown> = {};
    if (method === 1) {
      data.method1Enabled = value;
      // Mutual exclusion: if enabling method 1, disable method 2
      if (value && config?.method2Enabled) {
        data.method2Enabled = false;
      }
    } else {
      data.method2Enabled = value;
      if (value && config?.method1Enabled) {
        data.method1Enabled = false;
      }
    }
    updateConfig.mutate(data);
  };

  const handleSaveNames = () => {
    updateConfig.mutate(
      { method1Name: method1Name.trim(), method2Name: method2Name.trim() },
      { onSuccess: () => setNamesDirty(false) },
    );
  };

  const handleNameChange = (method: 1 | 2, value: string) => {
    if (method === 1) setMethod1Name(value);
    else setMethod2Name(value);
    setNamesDirty(true);
  };

  const neitherEnabled = config && !config.method1Enabled && !config.method2Enabled;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <AppTopHeader title="Incentive Configuration" onMenuPress={toggle} />
        <View style={{ padding: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <AppTopHeader title="Incentive Configuration" onMenuPress={toggle} />
        <EmptyState
          icon="error"
          title="Failed to load configuration"
          message="Check your connection and try again."
          action={{ label: 'Retry', onPress: () => refetch() }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppTopHeader
            title="Incentive Configuration"
            subtitle={getActiveMethodLabel(config)}
            onMenuPress={toggle}
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Active Method Indicator */}
          {config && (
            <Animated.View entering={FadeInUp.duration(400).delay(50)}>
              <View
                style={[
                  cardStyles.activeIndicator,
                  {
                    backgroundColor: isDark ? '#1A1730' : colors.primary[50],
                    borderColor: isDark ? colors.primary[900] : colors.primary[200],
                  },
                ]}
              >
                <View
                  style={[
                    cardStyles.statusDot,
                    {
                      backgroundColor: config.method1Enabled || config.method2Enabled
                        ? colors.success[500]
                        : colors.warning[500],
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                    },
                  ]}
                />
                <Text className="font-inter text-sm font-semibold text-primary-700 dark:text-primary-300">
                  {getActiveMethodLabel(config)}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Warning when both off */}
          {neitherEnabled && (
            <Animated.View entering={FadeInUp.duration(300).delay(80)}>
              <View
                style={[
                  cardStyles.warningBanner,
                  {
                    backgroundColor: isDark ? '#3D2E0A' : colors.warning[50],
                    borderColor: isDark ? colors.warning[700] : colors.warning[200],
                  },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                    stroke={colors.warning[600]}
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text className="ml-2 flex-1 font-inter text-xs font-semibold text-warning-700 dark:text-warning-300">
                  No incentive method is active. Daily entries will not calculate incentives.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Method 1 Card - Indigo accent */}
          <MethodCard
            methodNumber={1}
            subtitle="Excess Ratio Based"
            name={method1Name}
            enabled={config?.method1Enabled ?? false}
            accentColor={{
              bg: colors.primary[50],
              border: colors.primary[400],
              text: colors.primary[700],
              dot: colors.primary[600],
            }}
            isDark={isDark}
            onNameChange={(v) => handleNameChange(1, v)}
            onToggle={(v) => handleToggle(1, v)}
            isToggling={updateConfig.isPending}
            description="Individual part-level slab incentive. Each part's excess quantity beyond the shift target earns an incentive based on slab rates. Incentive is the sum of all individual part incentives."
            workedExample="Part A: target 100, produced 120. Slab 1 (101-110): Rs 2/pc = Rs 20. Slab 2 (111-120): Rs 3/pc = Rs 30. Total for Part A = Rs 50."
          />

          {/* Method 2 Card - Amber accent */}
          <MethodCard
            methodNumber={2}
            subtitle="Percentage-Based Milestone"
            name={method2Name}
            enabled={config?.method2Enabled ?? false}
            accentColor={{
              bg: colors.warning[50],
              border: colors.warning[400],
              text: colors.warning[700],
              dot: colors.warning[600],
            }}
            isDark={isDark}
            onNameChange={(v) => handleNameChange(2, v)}
            onToggle={(v) => handleToggle(2, v)}
            isToggling={updateConfig.isPending}
            description="Cumulative ratio-based incentive. The weighted average achievement across all parts must meet 100% threshold. If eligible, each part's excess earns incentive at slab rates."
            workedExample="Parts A, B worked. Cumulative ratio = (120/100 + 80/100) / 2 = 100%. Since ratio >= 100%, Part A excess 20 pcs and Part B (no excess) are calculated. Only Part A earns incentive."
          />

          {/* Save Names Button */}
          {namesDirty && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Pressable
                style={({ pressed }) => [
                  cardStyles.saveBtn,
                  pressed && { opacity: 0.85 },
                  updateConfig.isPending && { opacity: 0.6 },
                ]}
                onPress={handleSaveNames}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-inter text-base font-bold text-white">
                    Save Configuration
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          )}

          {/* Go to Daily Entry */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Pressable
              style={({ pressed }) => [
                cardStyles.secondaryBtn,
                {
                  backgroundColor: isDark ? '#1A1730' : colors.white,
                  borderColor: isDark ? colors.primary[700] : colors.primary[300],
                },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push('/(app)/pip-daily-entry' as any)}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={colors.primary[600]}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
              <Text className="ml-2 font-inter text-sm font-bold text-primary-600">
                Go to Daily Entry
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
    },
  });

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  descBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  descIcon: {
    marginTop: 2,
  },
  exampleBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  saveBtn: {
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    borderWidth: 1.5,
    marginBottom: 12,
  },
});
