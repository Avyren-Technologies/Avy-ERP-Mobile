import React from 'react';
import { View, ViewStyle } from 'react-native';
import ReanimatedSkeleton from 'react-native-reanimated-skeleton';

interface SkeletonProps {
  isLoading: boolean;
  children: React.ReactNode;
  layout?: any[];
  containerStyle?: ViewStyle;
  boneColor?: string;
  highlightColor?: string;
  animationType?: 'shiver' | 'pulse';
  duration?: number;
}

/**
 * Skeleton loader component using react-native-reanimated-skeleton
 * Provides a smooth loading placeholder with shimmer animation
 */
export function Skeleton({
  isLoading,
  children,
  layout,
  containerStyle,
  boneColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
  animationType = 'shiver',
  duration = 1200,
}: SkeletonProps) {
  return (
    <ReanimatedSkeleton
      isLoading={isLoading}
      layout={layout}
      containerStyle={containerStyle}
      boneColor={boneColor}
      highlightColor={highlightColor}
      animationType={animationType}
      duration={duration}
    >
      {children}
    </ReanimatedSkeleton>
  );
}

// Predefined skeleton layouts for common use cases

export function SkeletonCard() {
  return (
    <Skeleton
      isLoading={true}
      layout={[
        { key: 'avatar', width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
        { key: 'title', width: '80%', height: 16, marginBottom: 4 },
        { key: 'subtitle', width: '60%', height: 14, marginBottom: 8 },
        { key: 'content', width: '100%', height: 12, marginBottom: 4 },
        { key: 'content2', width: '90%', height: 12, marginBottom: 4 },
        { key: 'content3', width: '70%', height: 12 },
      ]}
      containerStyle={{ padding: 16, marginBottom: 16 }}
    >
      <View />
    </Skeleton>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const layout = Array.from({ length: lines }, (_, i) => ({
    key: `line${i}`,
    width: `${100 - i * 10}%`,
    height: 14,
    marginBottom: i < lines - 1 ? 8 : 0,
  }));

  return (
    <Skeleton
      isLoading={true}
      layout={layout}
      containerStyle={{ padding: 8 }}
    >
      <View />
    </Skeleton>
  );
}

export function SkeletonAvatar() {
  return (
    <Skeleton
      isLoading={true}
      layout={[{ key: 'avatar', width: 50, height: 50, borderRadius: 25 }]}
    >
      <View />
    </Skeleton>
  );
}