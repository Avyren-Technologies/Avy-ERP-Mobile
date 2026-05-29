import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import type { ScreenHelp } from '@/features/maintenance/help/types';

interface HelpDrawerProps {
  help: ScreenHelp;
}

/**
 * HelpDrawer — A contextual help bottom-sheet modal for mobile.
 *
 * Renders two parts:
 * 1. HelpIconButton — an (i) icon to place in the HeaderBar rightSlot
 * 2. The modal itself with scrollable help content
 *
 * @example
 * ```tsx
 * import { HelpDrawer } from '@/components/ui/help-drawer';
 * import { assetRegisterHelp } from '@/features/maintenance/help';
 *
 * <AppTopHeader
 *   title="Asset Register"
 *   onMenuPress={toggle}
 *   rightSlot={<HelpDrawer help={assetRegisterHelp} />}
 * />
 * ```
 */
export function HelpDrawer({ help }: HelpDrawerProps) {
  const [visible, setVisible] = React.useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Trigger icon button */}
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.iconBtn}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} stroke="white" strokeWidth={1.8} fill="none" />
          <Path
            d="M12 16v-4M12 8h.01"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      {/* Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <Text className="font-inter text-lg font-bold text-primary-950 dark:text-white">
                  {help.page.title}
                </Text>
                <Pressable
                  onPress={() => setVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M18 6L6 18M6 6l12 12"
                      stroke={colors.neutral[400]}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* About */}
                <View style={styles.section}>
                  <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white mb-1.5">
                    About
                  </Text>
                  <Text className="font-inter text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {help.page.description}
                  </Text>
                </View>

                {/* Prerequisites */}
                {help.page.prerequisites && help.page.prerequisites.length > 0 && (
                  <View style={styles.section}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white mb-1.5">
                      Prerequisites
                    </Text>
                    {help.page.prerequisites.map((item, i) => (
                      <View key={i} style={styles.listItem}>
                        <Text className="font-inter text-amber-500 mr-2">{'●'}</Text>
                        <Text className="font-inter text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 flex-1">
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Steps */}
                {help.page.steps && help.page.steps.length > 0 && (
                  <View style={styles.section}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white mb-1.5">
                      How to Use
                    </Text>
                    {help.page.steps.map((step, i) => (
                      <View key={i} style={styles.listItem}>
                        <View style={styles.stepNumber}>
                          <Text className="font-inter text-xs font-bold text-primary-700 dark:text-primary-300">
                            {i + 1}
                          </Text>
                        </View>
                        <Text className="font-inter text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 flex-1">
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {help.page.tips && help.page.tips.length > 0 && (
                  <View style={[styles.section, { marginBottom: 8 }]}>
                    <Text className="font-inter text-sm font-semibold text-primary-950 dark:text-white mb-1.5">
                      Tips
                    </Text>
                    {help.page.tips.map((tip, i) => (
                      <View key={i} style={styles.listItem}>
                        <Text className="font-inter text-violet-500 mr-2">{'\u2726'}</Text>
                        <Text className="font-inter text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 flex-1">
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D8',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scrollContent: {
    maxHeight: 500,
  },
  section: {
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
});
