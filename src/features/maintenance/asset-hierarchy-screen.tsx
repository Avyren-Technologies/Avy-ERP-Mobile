/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { AppTopHeader } from '@/components/ui/app-top-header';
import { HelpDrawer } from '@/components/ui/help-drawer';
import { assetHierarchyHelp } from '@/features/maintenance/help';
import colors from '@/components/ui/colors';
import { useSidebar } from '@/components/ui/sidebar';
import { useAssetHierarchy } from '@/features/maintenance/api/use-maintenance-queries';
import { AssetOperationalBadge } from '@/features/maintenance/shared/asset-status-badge';
import { useIsDark } from '@/hooks/use-is-dark';

// ============ TYPES ============

interface HierarchyNode {
  id: string;
  name: string;
  assetNumber: string;
  assetClass: string;
  operationalStatus: string;
  children?: HierarchyNode[];
}

// ============ TREE NODE ============

function TreeNode({
  node,
  level,
  isDark,
  onPress,
}: {
  node: HierarchyNode;
  level: number;
  isDark: boolean;
  onPress: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <Animated.View entering={FadeInDown.duration(250).delay(level * 30)}>
      <Pressable
        onPress={() => {
          if (hasChildren) setExpanded(!expanded);
          else onPress(node.id);
        }}
        style={[
          nodeStyles.container,
          {
            marginLeft: level * 20,
            backgroundColor: isDark ? '#1A1730' : colors.white,
            borderColor: isDark ? colors.primary[900] : colors.neutral[100],
          },
        ]}
      >
        {/* Expand/collapse arrow */}
        <View style={nodeStyles.arrowWrap}>
          {hasChildren ? (
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path
                d={expanded ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'}
                stroke={colors.neutral[400]}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <View style={nodeStyles.leafDot} />
          )}
        </View>

        {/* Node content */}
        <View style={nodeStyles.content}>
          <View style={nodeStyles.topRow}>
            <Text className="font-inter text-sm font-bold text-primary-950 dark:text-white" numberOfLines={1} style={{ flex: 1 }}>
              {node.name}
            </Text>
            <AssetOperationalBadge status={node.operationalStatus ?? 'IDLE'} />
          </View>
          <View style={nodeStyles.bottomRow}>
            <View style={[nodeStyles.codeBadge, { backgroundColor: isDark ? colors.primary[900] : colors.info[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-info-700">
                {node.assetNumber}
              </Text>
            </View>
            <View style={[nodeStyles.classBadge, { backgroundColor: isDark ? colors.accent[900] : colors.accent[50] }]}>
              <Text className="font-inter text-[10px] font-bold text-accent-700">
                {(node.assetClass ?? 'OTHER').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigate arrow */}
        <Pressable onPress={() => onPress(node.id)} style={nodeStyles.goBtn} hitSlop={10}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M9 18l6-6-6-6" stroke={colors.primary[400]} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </Pressable>

      {/* Children */}
      {expanded && hasChildren ? (
        <View>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} isDark={isDark} onPress={onPress} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ============ MAIN ============

export function AssetHierarchyScreen() {
  const isDark = useIsDark();
  const styles = createStyles(isDark);
  const insets = useSafeAreaInsets();
  const { toggle } = useSidebar();
  const router = useRouter();

  const { data: hierarchyRes, isLoading, refetch, isFetching } = useAssetHierarchy();
  const nodes: HierarchyNode[] = (hierarchyRes as any)?.data ?? [];

  const handleNodePress = (id: string) => {
    router.push(`/maintenance/asset-detail?id=${id}`);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View entering={FadeInDown.duration(400)}>
        <AppTopHeader
          title="Asset Hierarchy"
          subtitle={`${nodes.length} root asset${nodes.length !== 1 ? 's' : ''}`}
          onMenuPress={toggle}
          rightSlot={<HelpDrawer help={assetHierarchyHelp} />}
        />
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text className="mt-3 font-inter text-sm text-neutral-400">Loading hierarchy...</Text>
          </View>
        ) : nodes.length > 0 ? (
          nodes.map((node) => (
            <TreeNode key={node.id} node={node} level={0} isDark={isDark} onPress={handleNodePress} />
          ))
        ) : (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Svg width={48} height={48} viewBox="0 0 24 24">
              <Path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke={colors.neutral[300]} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text className="mt-4 font-inter text-sm font-semibold text-neutral-400">
              No assets in hierarchy
            </Text>
            <Text className="mt-1 font-inter text-xs text-neutral-400">
              Add parent-child relationships to see the tree
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0F0D1A' : colors.gradient.surface },
    scrollContent: { padding: 24 },
  });

const nodeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  arrowWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  leafDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[300],
  },
  content: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
