/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { HamburgerButton, useSidebar } from '@/components/ui/sidebar';

export function RatingsScreen() {
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <HamburgerButton onPress={toggle} />
          <Text className="font-inter text-white text-lg font-bold ml-3">Ratings & Calibration</Text>
        </View>
      </LinearGradient>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.content}>
        <Text className="font-inter text-neutral-400 text-base text-center">
          Screen pending implementation
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gradient.surface },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
