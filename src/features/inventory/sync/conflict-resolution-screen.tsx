import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { useSyncConflicts } from '@/features/inventory/api/use-inventory-queries';
import { useResolveSyncConflict } from '@/features/inventory/api/use-inventory-mutations';
import { useCompanyFormatter } from '@/hooks/use-company-formatter';

interface ConflictItem {
  id: string;
  actionType: string;
  capturedAt: string;
  conflictType: string;
  description: string;
  serverState: Record<string, unknown>;
  offlineState: Record<string, unknown>;
  autoResolvable: boolean;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  PUTAWAY_CONFIRM: 'Put-Away',
  PICK_CONFIRM: 'Pick Confirm',
  COUNT_ENTRY: 'Count Entry',
  TOOL_RETURN: 'Tool Return',
};

const CONFLICT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  STALE_BALANCE: { bg: '#fef3c7', text: '#92400e' },
  VERSION_MISMATCH: { bg: '#fce7f3', text: '#9d174d' },
  DUPLICATE_ACTION: { bg: '#e0e7ff', text: '#3730a3' },
};

function ConflictCard({
  item,
  index,
  onResolve,
  isResolving,
}: {
  item: ConflictItem;
  index: number;
  onResolve: (id: string, resolution: string) => void;
  isResolving: boolean;
}) {
  const fmt = useCompanyFormatter();
  const conflictColor = CONFLICT_TYPE_COLORS[item.conflictType] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)} style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text className="text-sm font-bold font-inter text-neutral-900">
            {ACTION_TYPE_LABELS[item.actionType] || item.actionType}
          </Text>
          <Text className="text-[10px] font-inter text-neutral-400 mt-0.5">
            Captured {fmt.dateTime(item.capturedAt)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: conflictColor.bg }]}>
          <Text style={{ color: conflictColor.text, fontSize: 10, fontWeight: '600' }}>
            {item.conflictType.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text className="text-xs font-inter text-neutral-600 mt-2">{item.description}</Text>

      {/* Comparison */}
      <View style={styles.comparison}>
        <View style={[styles.stateBox, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
          <Text className="text-[10px] font-bold font-inter text-blue-700 uppercase mb-1">
            Server State
          </Text>
          {Object.entries(item.serverState || {}).map(([key, value]) => (
            <Text key={key} className="text-[10px] font-inter text-blue-600">
              {key}: {String(value)}
            </Text>
          ))}
        </View>
        <View style={[styles.stateBox, { backgroundColor: '#fefce8', borderColor: '#fde68a' }]}>
          <Text className="text-[10px] font-bold font-inter text-amber-700 uppercase mb-1">
            Offline State
          </Text>
          {Object.entries(item.offlineState || {}).map(([key, value]) => (
            <Text key={key} className="text-[10px] font-inter text-amber-600">
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      </View>

      {/* Non-auto-resolvable warning */}
      {!item.autoResolvable && (
        <View style={styles.warningBanner}>
          <Text className="text-[10px] font-inter font-medium text-amber-700">
            Requires manual review
          </Text>
        </View>
      )}

      {/* Resolution Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => onResolve(item.id, 'SERVER_WINS')}
          disabled={isResolving}
          activeOpacity={0.7}
          style={[styles.resolveButton, styles.serverWinsButton]}
        >
          {isResolving ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <Text className="text-xs font-inter font-semibold text-neutral-600">
              Use Server Data
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onResolve(item.id, 'OFFLINE_WINS')}
          disabled={isResolving}
          activeOpacity={0.7}
          style={[styles.resolveButton, styles.offlineWinsButton]}
        >
          {isResolving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-xs font-inter font-semibold text-white">Use My Data</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function ConflictResolutionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useSyncConflicts();
  const resolveConflict = useResolveSyncConflict();

  const conflicts: ConflictItem[] = data?.data || [];

  const handleResolve = (id: string, resolution: string) => {
    resolveConflict.mutate(
      { id, data: { resolution } },
      {
        onSuccess: () => refetch(),
      },
    );
  };

  const renderItem = ({ item, index }: { item: ConflictItem; index: number }) => (
    <ConflictCard
      item={item}
      index={index}
      onResolve={handleResolve}
      isResolving={resolveConflict.isPending}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={{ fontSize: 32 }}>✓</Text>
        </View>
        <Text className="text-base font-bold font-inter text-neutral-700 mt-3">
          No conflicts to resolve
        </Text>
        <Text className="text-xs font-inter text-neutral-400 mt-1 text-center">
          All offline actions have been synced successfully
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text className="text-sm font-inter text-white/80">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white font-inter ml-3 flex-1">
            Sync Conflicts
          </Text>
          {conflicts.length > 0 && (
            <View style={styles.countBadge}>
              <Text className="text-[10px] font-bold font-inter text-white">
                {conflicts.length}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-white/70 font-inter mt-1">
          Resolve differences between offline and server data
        </Text>
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={conflicts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comparison: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stateBox: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  warningBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  resolveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  serverWinsButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  offlineWinsButton: {
    backgroundColor: colors.primary[600],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
