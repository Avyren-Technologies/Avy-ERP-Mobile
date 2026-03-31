import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

function HeaderDecoration() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
    >
      <Circle cx="110%" cy="-20%" r="120" fill="rgba(255,255,255,0.05)" />
      <Circle cx="-10%" cy="120%" r="80" fill="rgba(255,255,255,0.04)" />
      <Circle cx="85%" cy="60%" r="40" fill="rgba(255,255,255,0.04)" />
    </Svg>
  );
}

export function DashboardShell({ title, children, loading, onRefresh }: DashboardShellProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <View style={styles.container}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <HeaderDecoration />
        <View style={styles.headerContent}>
          <Text className="font-inter text-[24px] font-extrabold text-white" style={styles.headerTitle}>
            {title}
          </Text>
          <Text className="font-inter text-[12px] text-white/50" style={styles.headerSubtitle}>
            Real-time analytics & insights
          </Text>
        </View>
      </LinearGradient>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          ) : undefined
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingRing}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
            <Text className="font-inter text-[13px] font-medium text-neutral-400">
              Loading analytics...
            </Text>
          </View>
        ) : (
          children
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
