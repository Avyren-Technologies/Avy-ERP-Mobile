import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonRow}>
              <View style={[styles.skeletonCard, { flex: 1, height: 90 }]} />
              <View style={[styles.skeletonCard, { flex: 1, height: 90 }]} />
            </View>
            <View style={styles.skeletonRow}>
              <View style={[styles.skeletonCard, { flex: 1, height: 90 }]} />
              <View style={[styles.skeletonCard, { flex: 1, height: 90 }]} />
            </View>
            <View style={[styles.skeletonCard, { height: 200 }]} />
            <View style={[styles.skeletonCard, { height: 100 }]} />
            <View style={[styles.skeletonCard, { height: 100 }]} />
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
  skeletonContainer: { padding: 16, gap: 12 },
  skeletonRow: { flexDirection: 'row' as const, gap: 12 },
  skeletonCard: { backgroundColor: '#F3F4F6', borderRadius: 12, minHeight: 80 },
});
