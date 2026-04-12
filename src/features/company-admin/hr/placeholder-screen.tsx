/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AppTopHeader } from '@/components/ui/app-top-header';
import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ REUSABLE HR PLACEHOLDER ============

interface HRPlaceholderScreenProps {
  title: string;
  subtitle: string;
}

export function HRPlaceholderScreen({ title, subtitle }: HRPlaceholderScreenProps) {
  const isDark = useIsDark();
  const styles = createStyles(isDark);

  const { toggle } = useSidebar();

  return (
    <View style={styles.container}>
      <AppTopHeader title={title} onMenuPress={toggle} />

      {/* Content */}
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
          <View style={styles.iconContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke={colors.primary[400]}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text className="font-inter" style={styles.title}>Coming Soon</Text>
          <Text className="font-inter" style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1A1730' : colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: isDark ? '#1E1B4B' : colors.neutral[50],
    borderRadius: 20,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[950],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});
const styles = createStyles(false);
