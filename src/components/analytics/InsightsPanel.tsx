import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import colors from '@/components/ui/colors';
import { Text } from '@/components/ui/text';

export interface Insight {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category?: string;
  drilldownType?: string;
  metadata?: Record<string, unknown>;
}

interface InsightsPanelProps {
  insights: Insight[];
  onDrilldown?: (type: string, metadata?: Record<string, unknown>) => void;
  maxVisible?: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: colors.danger[600],
  high: colors.danger[400],
  medium: colors.warning[500],
  low: colors.info[500],
  info: colors.primary[400],
};

const SEVERITY_BG: Record<string, string> = {
  critical: colors.danger[50],
  high: colors.danger[50],
  medium: colors.warning[50],
  low: colors.info[50],
  info: colors.primary[50],
};

function InsightCard({
  insight,
  index,
  onDrilldown,
}: {
  insight: Insight;
  index: number;
  onDrilldown?: (type: string, metadata?: Record<string, unknown>) => void;
}) {
  const borderColor = SEVERITY_COLORS[insight.severity] ?? colors.neutral[300];
  const bgColor = SEVERITY_BG[insight.severity] ?? colors.neutral[50];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        style={[styles.insightCard, { borderLeftColor: borderColor, backgroundColor: bgColor }]}
        onPress={() =>
          insight.drilldownType &&
          onDrilldown?.(insight.drilldownType, insight.metadata)
        }
        disabled={!insight.drilldownType}
      >
        <View style={styles.insightHeader}>
          <View
            style={[
              styles.severityDot,
              { backgroundColor: borderColor },
            ]}
          />
          <Text className="font-inter text-[14px] font-semibold text-neutral-800" style={styles.insightTitle}>
            {insight.title}
          </Text>
        </View>
        <Text className="font-inter text-[13px] text-neutral-600" style={styles.insightDescription}>
          {insight.description}
        </Text>
        {insight.category && (
          <View style={styles.categoryBadge}>
            <Text className="font-inter text-[11px] font-medium text-neutral-500">
              {insight.category}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function InsightsPanel({
  insights,
  onDrilldown,
  maxVisible = 3,
}: InsightsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleInsights = expanded ? insights : insights.slice(0, maxVisible);
  const hasMore = insights.length > maxVisible;

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Lightbulb size={18} color={colors.warning[500]} />
        <Text className="font-inter text-[16px] font-bold text-neutral-800">
          Insights
        </Text>
        <View style={styles.countBadge}>
          <Text className="font-inter text-[11px] font-bold text-primary-600">
            {insights.length}
          </Text>
        </View>
      </View>

      {/* Insight cards */}
      <View style={styles.insightsList}>
        {visibleInsights.map((insight, index) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            index={index}
            onDrilldown={onDrilldown}
          />
        ))}
      </View>

      {/* Expand/Collapse toggle */}
      {hasMore && (
        <Animated.View entering={FadeInUp.duration(200)}>
          <Pressable onPress={() => setExpanded(!expanded)} style={styles.toggleButton}>
            <Text className="font-inter text-[13px] font-semibold text-primary-600">
              {expanded ? 'Show less' : `Show ${insights.length - maxVisible} more`}
            </Text>
            {expanded ? (
              <ChevronUp size={16} color={colors.primary[600]} />
            ) : (
              <ChevronDown size={16} color={colors.primary[600]} />
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: colors.primary[50],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  insightsList: {
    gap: 10,
  },
  insightCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightTitle: {
    flex: 1,
  },
  insightDescription: {
    paddingLeft: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
});
