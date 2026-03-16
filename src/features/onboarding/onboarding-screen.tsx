/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { Text } from '@/components/ui';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;

// ─── Theme-aware color helper ────────────────────────────────────────
function useThemeColors() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  return React.useMemo(
    () => ({
      isDark,
      brandBlue: '#2D8CFF',
      headline: isDark ? '#FFFFFF' : '#0D1B3E',
      subText: isDark ? 'rgba(255,255,255,0.65)' : '#6B7280',
      activeDot: '#2D8CFF',
      inactiveDot: isDark ? 'rgba(255,255,255,0.30)' : '#D1D5DB',
      skipText: isDark ? 'rgba(255,255,255,0.80)' : '#6B7280',
      ctaText: '#FFFFFF',
      orLine: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      orLabel: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
      registerBorder: isDark
        ? 'rgba(255,255,255,0.28)'
        : 'rgba(0,0,0,0.18)',
      registerBg: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
      registerText: isDark ? '#FFFFFF' : '#0D1B3E',
      bgColor: isDark ? '#090E28' : '#F5F5F7',
      // Scrim gradient (transparent top → solid bottom)
      scrimColors: isDark
        ? ([
            'transparent',
            'transparent',
            'rgba(9,14,40,0.72)',
            'rgba(9,14,40,0.97)',
            '#090E28',
          ] as const)
        : ([
            'transparent',
            'transparent',
            'rgba(245,245,247,0.72)',
            'rgba(245,245,247,0.97)',
            '#F5F5F7',
          ] as const),
    }),
    [isDark],
  );
}

// ─── Step Data ───────────────────────────────────────────────────────
type OnboardingStep = {
  id: string;
  title: string;
  subtitle: string;
  darkImage: ImageSourcePropType;
  lightImage: ImageSourcePropType;
  darkBgColor: string;
  lightBgColor: string;
  ctaLabel: string;
  showSkip: boolean;
  showRegisterOption: boolean;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: '1',
    title: 'Your Factory,\nIn Your Pocket',
    subtitle:
      'Built for manufacturing teams of every size to manage operations on the go.',
    darkImage: require('../../../assets/illustrations/Onboarding-1.png'),
    lightImage: require('../../../assets/illustrations/Onboarding-1-Light.png'),
    darkBgColor: '#0B1535',
    lightBgColor: '#F5F5F7',
    ctaLabel: 'Get Started',
    showSkip: true,
    showRegisterOption: false,
  },
  {
    id: '2',
    title: 'Every Module.\nOne Platform.',
    subtitle:
      'From payroll and production to vendors and visitors — every department connected, with zero duplicate data entry.',
    darkImage: require('../../../assets/illustrations/Onboarding-2.png'),
    lightImage: require('../../../assets/illustrations/Onboarding-2-Light.png'),
    darkBgColor: '#0C1235',
    lightBgColor: '#F5F5F7',
    ctaLabel: 'Next',
    showSkip: true,
    showRegisterOption: false,
  },
  {
    id: '3',
    title: 'Ready to Run\nYour Operations?',
    subtitle:
      'Sign in to your company account, or register your organisation to get started with Avy ERP.',
    darkImage: require('../../../assets/illustrations/Onboarding-3.png'),
    lightImage: require('../../../assets/illustrations/Onboarding-3-Light.png'),
    darkBgColor: '#090E28',
    lightBgColor: '#F5F5F7',
    ctaLabel: 'Sign In',
    showSkip: false,
    showRegisterOption: true,
  },
];

// ─── Pagination Dot ──────────────────────────────────────────────────
function PaginationDot({
  isActive,
  colors,
}: {
  isActive: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const width = useSharedValue(isActive ? 24 : 8);

  React.useEffect(() => {
    width.value = withSpring(isActive ? 24 : 8, {
      stiffness: 200,
      damping: 22,
    });
  }, [isActive, width]);

  const activeDot = colors.activeDot;
  const inactiveDot = colors.inactiveDot;

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: isActive ? activeDot : inactiveDot,
  }));

  return <Animated.View style={animatedStyle} />;
}

function PaginationDots({
  currentIndex,
  colors,
}: {
  currentIndex: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.dotsRow}>
      {ONBOARDING_STEPS.map((step, index) => (
        <PaginationDot
          key={step.id}
          isActive={index === currentIndex}
          colors={colors}
        />
      ))}
    </View>
  );
}

// ─── Register Company Button (outlined) ─────────────────────────────
function RegisterButton({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.registerWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { stiffness: 300, damping: 18 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { stiffness: 300, damping: 18 });
        }}
        style={[
          styles.registerButton,
          {
            borderColor: colors.registerBorder,
            backgroundColor: colors.registerBg,
          },
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Register your company"
      >
        <Text
          className="font-inter text-sm font-semibold"
          style={{ color: colors.registerText }}
        >
          Register Your Company
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── CTA Button ──────────────────────────────────────────────────────
function CTAButton({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.ctaWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { stiffness: 300, damping: 18 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { stiffness: 300, damping: 18 });
        }}
        style={[styles.ctaButton, { backgroundColor: colors.brandBlue }]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          className="font-inter text-base font-semibold"
          style={{ color: colors.ctaText }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Full-Screen Slide ───────────────────────────────────────────────
function OnboardingSlide({
  step,
  currentIndex,
  onCTA,
  onRegister,
  insetsBottom,
  colors,
}: {
  step: OnboardingStep;
  currentIndex: number;
  onCTA: () => void;
  onRegister: () => void;
  insetsBottom: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const bottomPad = insetsBottom > 0 ? insetsBottom + 16 : 32;
  const bgColor = colors.isDark ? step.darkBgColor : step.lightBgColor;
  const image = colors.isDark ? step.darkImage : step.lightImage;

  return (
    <View style={[styles.slideContainer, { backgroundColor: bgColor }]}>
      {/* Illustration — full-screen background */}
      <Image
        source={image}
        style={styles.illustration}
        resizeMode="contain"
        accessible={false}
      />

      {/* Scrim: fades from transparent (over the illustration) to solid (content area) */}
      <LinearGradient
        colors={[...colors.scrimColors]}
        locations={[0, 0.44, 0.62, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Content floats at the bottom over the scrim */}
      <View style={[styles.contentSection, { paddingBottom: bottomPad }]}>
        {/* Title */}
        <Text
          className="font-inter font-bold"
          style={[styles.headline, { color: colors.headline }]}
        >
          {step.title}
        </Text>

        {/* Subtitle */}
        <Text
          className="font-inter font-normal"
          style={[styles.subtitle, { color: colors.subText }]}
        >
          {step.subtitle}
        </Text>

        {/* Pagination dots */}
        <PaginationDots currentIndex={currentIndex} colors={colors} />

        {/* Primary CTA */}
        <CTAButton label={step.ctaLabel} onPress={onCTA} colors={colors} />

        {/* Register Your Company — secondary action on last slide */}
        {step.showRegisterOption && (
          <>
            <View style={styles.orDivider}>
              <View
                style={[styles.orLine, { backgroundColor: colors.orLine }]}
              />
              <Text
                className="font-inter text-xs font-medium"
                style={[styles.orLabel, { color: colors.orLabel }]}
              >
                NEW TO AVY ERP?
              </Text>
              <View
                style={[styles.orLine, { backgroundColor: colors.orLine }]}
              />
            </View>
            <RegisterButton onPress={onRegister} colors={colors} />
          </>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────
export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [, setIsFirstTime] = useIsFirstTime();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const completeOnboarding = React.useCallback(() => {
    setIsFirstTime(false);
    router.replace('/login');
  }, [router, setIsFirstTime]);

  const handleNext = React.useCallback(() => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const handleSkip = React.useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const handleRegister = React.useCallback(() => {
    // Register flow is handled within the login screen for now
    completeOnboarding();
  }, [completeOnboarding]);

  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = React.useMemo(
    () => ({ itemVisiblePercentThreshold: 50 }),
    [],
  );

  const currentStep = ONBOARDING_STEPS[currentIndex]!;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgColor }]}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={({ item }) => (
          <OnboardingSlide
            step={item}
            currentIndex={currentIndex}
            onCTA={handleNext}
            onRegister={handleRegister}
            insetsBottom={insets.bottom}
            colors={colors}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        extraData={currentIndex}
      />

      {/* Skip — absolute overlay on top of the FlatList */}
      {currentStep.showSkip && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.skipContainer, { top: insets.top + 14 }]}
        >
          <Pressable
            onPress={handleSkip}
            style={styles.skipButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text
              className="font-inter text-sm font-normal"
              style={{ color: colors.skipText }}
            >
              Skip
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ─── Slide ───
  slideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  // ─── Illustration (full-screen background) ───
  illustration: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  // ─── Content (bottom overlay) ───
  contentSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  headline: {
    fontSize: IS_SMALL_SCREEN ? 26 : 30,
    lineHeight: IS_SMALL_SCREEN ? 33 : 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: IS_SMALL_SCREEN ? 13 : 15,
    lineHeight: IS_SMALL_SCREEN ? 20 : 23,
    marginBottom: 24,
  },
  // ─── Pagination ───
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  // ─── CTA ───
  ctaWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─── "NEW TO AVY ERP?" divider ───
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orLabel: {
    marginHorizontal: 12,
    letterSpacing: 0.6,
  },
  // ─── Register Company (outlined) ───
  registerWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  registerButton: {
    width: '100%',
    height: 52,
    borderRadius: 50,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─── Skip ───
  skipContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
