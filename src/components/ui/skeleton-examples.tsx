import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar } from './skeleton';
import { Button, Text } from './';

/**
 * Example usage of skeleton components
 * This file demonstrates different ways to use the skeleton loader
 */
export function SkeletonExamples() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-4">Skeleton Examples</Text>

      <Button
        label={isLoading ? "Loading..." : "Reload"}
        onPress={() => setIsLoading(!isLoading)}
        className="mb-6"
      />

      {/* Example 1: Custom Layout Skeleton */}
      <Text className="text-lg font-semibold mb-2">Custom Layout</Text>
      <Skeleton
        isLoading={isLoading}
        layout={[
          { key: 'header', width: '100%', height: 20, marginBottom: 12 },
          { key: 'image', width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
          { key: 'title', width: '80%', height: 16, marginBottom: 8 },
          { key: 'subtitle', width: '60%', height: 14 },
        ]}
        containerStyle={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}
      >
        <View>
          <Text className="text-lg font-bold">Loaded Content</Text>
          <View className="w-full h-32 bg-blue-200 rounded-lg mb-4" />
          <Text className="text-base">This is the actual content that loads</Text>
          <Text className="text-sm text-gray-600">With subtitle text</Text>
        </View>
      </Skeleton>

      {/* Example 2: Predefined SkeletonCard */}
      <Text className="text-lg font-semibold mb-2">Skeleton Card</Text>
      <SkeletonCard />

      {/* Example 3: SkeletonText with different line counts */}
      <Text className="text-lg font-semibold mb-2">Skeleton Text</Text>
      <SkeletonText lines={2} />

      {/* Example 4: SkeletonAvatar */}
      <Text className="text-lg font-semibold mb-2">Skeleton Avatar</Text>
      <SkeletonAvatar />

      {/* Example 5: Child Layout (auto-detects dimensions) */}
      <Text className="text-lg font-semibold mb-2">Child Layout Detection</Text>
      <Skeleton
        isLoading={isLoading}
        containerStyle={{ padding: 16 }}
      >
        <View>
          <View className="w-12 h-12 bg-red-200 rounded-full mb-4" />
          <View className="w-48 h-6 bg-blue-200 rounded mb-2" />
          <View className="w-32 h-4 bg-gray-200 rounded mb-4" />
          <View className="w-full h-20 bg-green-200 rounded" />
        </View>
      </Skeleton>
    </View>
  );
}