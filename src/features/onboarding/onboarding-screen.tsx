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
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingStep = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: ImageSourcePropType;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: '1',
    title: 'Streamline Your\nOperations',
    subtitle: 'ALL-IN-ONE ERP',
    description:
            'Manage HR, Production, Inventory, Sales, and more — all from a single, powerful mobile platform.',
    image: require('../../../assets/illustrations/illustrations-1.jpeg'),
  },
  {
    id: '2',
    title: 'Real-Time\nInsights',
    subtitle: 'SMART ANALYTICS',
    description:
            'Track OEE, monitor machine health, view KPIs, and make data-driven decisions instantly from anywhere.',
    image: require('../../../assets/illustrations/illustration-2.jpeg'),
  },
  {
    id: '3',
    title: 'Built for\nManufacturing',
    subtitle: 'INDUSTRY READY',
    description:
            'Offline-first design for shop floors, multi-plant support, and role-based access for every team member.',
    image: require('../../../assets/illustrations/illustrations-3.jpeg'),
  },
];

// Pagination Dots
function PaginationDots({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.paginationContainer}>
      {ONBOARDING_STEPS.map((_, index) => {
        const isActive = index === currentIndex;
        return (
          <Animated.View
            key={ONBOARDING_STEPS[index]?.id || index.toString()}
            style={[
              styles.dot,
              {
                width: isActive ? 28 : 8,
                backgroundColor: isActive ? colors.primary[500] : colors.primary[200],
                opacity: isActive ? 1 : 0.6,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// Onboarding Page
function OnboardingPage({
  step,
}: {
  step: OnboardingStep;
}) {
  return (
    <View style={styles.page}>
      <Image source={step.image} style={styles.image} resizeMode="contain" />
    </View>
  );
}

function BackgroundGradient() {
  return (
    <LinearGradient
      colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
  );
}

function Controls({
  currentIndex,
  handleNext,
  handleSkip,
  isLastStep,
  insetsBottom,
}: {
  currentIndex: number;
  handleNext: () => void;
  handleSkip: () => void;
  isLastStep: boolean;
  insetsBottom: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(400)}
      style={[styles.bottomSection, { paddingBottom: insetsBottom + 32 }]}
    >
      <PaginationDots currentIndex={currentIndex} />

      {/* CTA and Sign In Wrapper */}
      <View style={styles.ctaContainer}>
        {/* CTA Button */}
        <Pressable onPress={handleNext} style={styles.ctaButtonWrapper}>
          <LinearGradient
            colors={[colors.gradient.start, colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text className="font-inter text-base font-bold text-white">
              {isLastStep ? 'Get Started' : 'Continue'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Already have an account */}
        {isLastStep && (
          <Pressable onPress={handleSkip} style={styles.alreadyMemberButton}>
            <Text className="font-inter text-sm font-medium text-primary-500 backdrop-blur-sm">
              Already have an account?
              {' '}
              <Text className="font-semibold text-primary-600">Sign In</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [, setIsFirstTime] = useIsFirstTime();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const handleSkip = React.useCallback(() => {
    setIsFirstTime(false);
    router.replace('/login');
  }, [router, setIsFirstTime]);

  const handleNext = React.useCallback(() => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
    else {
      setIsFirstTime(false);
      router.replace('/login');
    }
  }, [currentIndex, router, setIsFirstTime]);

  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const viewabilityConfig = React.useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
    }),
    [],
  );

  const isLastStep = currentIndex === ONBOARDING_STEPS.length - 1;

  return (
    <View style={styles.container}>
      <BackgroundGradient />

      {/* Skip Button */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.skipContainer, { top: insets.top + 16 }]}
      >
        {!isLastStep && (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text className="font-inter text-sm font-semibold text-primary-500">
              Skip
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={({ item }) => (
          <OnboardingPage
            step={item}
          />
        )}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
      />

      <Controls
        currentIndex={currentIndex}
        handleNext={handleNext}
        handleSkip={handleSkip}
        isLastStep={isLastStep}
        insetsBottom={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradient.surface,
  },
  skipContainer: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    alignItems: 'center',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingBottom: 60,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alreadyMemberButton: {
    position: 'absolute',
    top: 64, // Positioned safely below the 56px tall CTA button
    paddingVertical: 4,
  },
});
