/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { showSuccess, showErrorMessage } from '@/components/ui/utils';
import { useLogReading } from '@/features/maintenance/api/use-maintenance-mutations';
import { useAsset, useAssetMeters } from '@/features/maintenance/api/use-maintenance-queries';
import { logReadingHelp } from '@/features/maintenance/help';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ SOURCE OPTIONS ============

const SOURCE_OPTIONS = ['MANUAL', 'WORK_ORDER'] as const;

// ============ MAIN ============

export function LogReadingScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { assetId, meterId } = useLocalSearchParams<{ assetId: string; meterId?: string }>();

  // Queries
  const { data: assetRes, isLoading: assetLoading } = useAsset(assetId ?? '');
  const asset: any = (assetRes as any)?.data ?? null;

  const { data: metersRes, isLoading: metersLoading } = useAssetMeters(assetId ?? '');
  const meters: any[] = (metersRes as any)?.data ?? [];

  // State
  const [selectedMeterId, setSelectedMeterId] = React.useState(meterId ?? '');
  const [value, setValue] = React.useState('');
  const [source, setSource] = React.useState<typeof SOURCE_OPTIONS[number]>('MANUAL');
  const [isReset, setIsReset] = React.useState(false);
  const [showWarning, setShowWarning] = React.useState(false);

  // Auto-select first meter if none provided
  React.useEffect(() => {
    if (!selectedMeterId && meters.length > 0) {
      setSelectedMeterId(meters[0].id);
    }
  }, [meters, selectedMeterId]);

  const selectedMeter = meters.find((m: any) => m.id === selectedMeterId);
  const logReadingMutation = useLogReading();

  // Validate reading
  React.useEffect(() => {
    if (selectedMeter && value) {
      const numVal = parseFloat(value);
      const currentVal = Number(selectedMeter.currentValue ?? 0);
      const isCumulative = (selectedMeter.meterType ?? 'CUMULATIVE') === 'CUMULATIVE';
      if (isCumulative && !isReset && numVal < currentVal) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    } else {
      setShowWarning(false);
    }
  }, [value, selectedMeter, isReset]);

  const handleSubmit = () => {
    if (!selectedMeterId) { showErrorMessage('Please select a meter'); return; }
    if (!value.trim()) { showErrorMessage('Please enter a reading value'); return; }

    const numVal = parseFloat(value);
    if (isNaN(numVal)) { showErrorMessage('Please enter a valid number'); return; }

    logReadingMutation.mutate(
      {
        assetId: assetId ?? '',
        meterId: selectedMeterId,
        data: { value: numVal, source, isReset },
      },
      {
        onSuccess: () => {
          showSuccess('Reading Logged', `Value ${numVal} recorded successfully`);
          router.back();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Failed to log reading';
          showErrorMessage(msg);
        },
      },
    );
  };

  const isLoading = assetLoading || metersLoading;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.gradient.surface, colors.white, colors.accent[50]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text className="font-inter text-lg font-bold text-white">Log Reading</Text>
            {asset ? <Text className="font-inter text-[11px] text-white/80">{asset.name}</Text> : null}
          </View>
          <HelpDrawer help={logReadingHelp} />
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Meter Selector */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
              Select Meter
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {meters.map((m: any) => {
                const isActive = m.id === selectedMeterId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedMeterId(m.id)}
                    style={[
                      styles.meterChip,
                      {
                        backgroundColor: isActive ? colors.primary[600] : (isDark ? '#1A1730' : colors.white),
                        borderColor: isActive ? colors.primary[600] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                      },
                    ]}
                  >
                    <Text className={`font-inter text-sm font-semibold ${isActive ? 'text-white' : 'text-primary-950 dark:text-white'}`}>
                      {m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {meters.length === 0 ? (
              <Text className="mt-3 font-inter text-sm text-neutral-400">
                No meters configured for this asset
              </Text>
            ) : null}
          </Animated.View>

          {/* Meter Info */}
          {selectedMeter ? (
            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <View style={styles.infoRow}>
                  <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Type</Text>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    {selectedMeter.meterType ?? 'CUMULATIVE'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Unit</Text>
                  <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white">
                    {selectedMeter.unitOfMeasure ?? 'hrs'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">Current Value</Text>
                  <Text className="font-inter text-lg font-bold text-primary-600">
                    {Number(selectedMeter.currentValue ?? 0).toLocaleString()} {selectedMeter.unitOfMeasure ?? 'hrs'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* Reading Input */}
          {selectedMeter ? (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                  New Reading Value <Text className="text-danger-500">*</Text>
                </Text>
                {logReadingHelp.fields?.meterValue ? <InfoTooltip content={logReadingHelp.fields.meterValue} /> : null}
              </View>
              <TextInput
                style={[
                  styles.readingInput,
                  {
                    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
                    color: isDark ? colors.white : colors.primary[950],
                    borderColor: showWarning ? colors.warning[400] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                  },
                ]}
                placeholder={`Enter value in ${selectedMeter.unitOfMeasure ?? 'hrs'}`}
                placeholderTextColor={colors.neutral[400]}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                autoFocus
              />
              {showWarning ? (
                <View style={styles.warningBox}>
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={colors.warning[600]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text className="flex-1 font-inter text-xs text-warning-700">
                    Value is less than current reading ({Number(selectedMeter.currentValue ?? 0)}). Enable reset if this is a meter reset.
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {/* Source Selector */}
          {selectedMeter ? (
            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
              <Text className="mb-2 font-inter text-xs font-bold text-primary-900 dark:text-primary-100">
                Source
              </Text>
              <View style={styles.sourceRow}>
                {SOURCE_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSource(s)}
                    style={[
                      styles.sourceChip,
                      {
                        backgroundColor: source === s ? colors.primary[600] : (isDark ? '#1A1730' : colors.white),
                        borderColor: source === s ? colors.primary[600] : (isDark ? colors.neutral[700] : colors.neutral[200]),
                      },
                    ]}
                  >
                    <Text className={`font-inter text-sm font-semibold ${source === s ? 'text-white' : 'text-primary-950 dark:text-white'}`}>
                      {s.replace(/_/g, ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Reset Toggle */}
          {selectedMeter && (selectedMeter.meterType ?? 'CUMULATIVE') === 'CUMULATIVE' ? (
            <Animated.View entering={FadeInDown.duration(400).delay(500)}>
              <View style={[styles.resetRow, { backgroundColor: isDark ? '#1A1730' : colors.white, borderColor: isDark ? colors.primary[900] : colors.neutral[100] }]}>
                <View style={{ flex: 1 }}>
                  <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white">
                    Meter Reset
                  </Text>
                  <Text className="font-inter text-xs text-neutral-500 dark:text-neutral-400">
                    Enable if the meter was physically reset
                  </Text>
                </View>
                <Switch
                  value={isReset}
                  onValueChange={setIsReset}
                  trackColor={{ false: colors.neutral[300], true: colors.primary[400] }}
                  thumbColor={isReset ? colors.primary[600] : colors.neutral[100]}
                />
              </View>
            </Animated.View>
          ) : null}

          {/* Submit */}
          {selectedMeter ? (
            <Animated.View entering={FadeInDown.duration(400).delay(600)}>
              <Pressable
                onPress={handleSubmit}
                disabled={logReadingMutation.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && { opacity: 0.85 },
                  logReadingMutation.isPending && { opacity: 0.6 },
                ]}
              >
                {logReadingMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-inter text-base font-bold text-white">
                    Submit Reading
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    headerGradient: {
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24, gap: 24 },
    meterChip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    },
    infoCard: {
      borderRadius: 16, padding: 16, borderWidth: 1, gap: 8,
      shadowColor: colors.primary[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    readingInput: {
      borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 16,
      fontSize: 20, fontWeight: '700', textAlign: 'center',
    },
    warningBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
      backgroundColor: colors.warning[50], borderRadius: 10, padding: 12,
    },
    sourceRow: { flexDirection: 'row', gap: 10 },
    sourceChip: {
      flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center',
    },
    resetRow: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1,
    },
    submitBtn: {
      backgroundColor: colors.primary[600], borderRadius: 14, height: 52,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
  });
