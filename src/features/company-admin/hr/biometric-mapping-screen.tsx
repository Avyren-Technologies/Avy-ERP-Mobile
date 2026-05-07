import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '@/components/ui/sidebar';
import { AppTopHeader } from '@/components/ui/app-top-header';
import colors from '@/components/ui/colors';
import { useIsDark } from '@/hooks/use-is-dark';
import Svg, { Path } from 'react-native-svg';

export function BiometricMappingScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { toggle } = useSidebar();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <AppTopHeader title="Employee Mapping" onMenuPress={toggle} />
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1F1D36' : colors.white }]}>
          <View style={styles.iconContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path
                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                stroke={colors.primary[500]}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text className="font-inter text-lg font-semibold text-neutral-900 dark:text-white" style={styles.title}>
            Employee-Device Mapping
          </Text>
          <Text className="font-inter text-sm text-neutral-500 dark:text-neutral-400" style={styles.subtitle}>
            Link employees to their biometric device user IDs and manage unmapped punches. This feature is available on the web dashboard for a better experience with large datasets.
          </Text>
          <View style={[styles.webHint, { backgroundColor: isDark ? '#312E81' : colors.primary[50] }]}>
            <Text className="font-inter text-xs text-primary-700 dark:text-primary-300" style={{ textAlign: 'center' }}>
              Open the web dashboard to manage employee-device mappings
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card: { borderRadius: 16, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, width: '100%' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { marginBottom: 8, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  webHint: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, width: '100%' },
});
