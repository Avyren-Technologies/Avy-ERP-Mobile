import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';

import colors from '@/components/ui/colors';
import { offlineQueue } from '@/features/inventory/sync/offline-queue';
import { syncManager } from '@/features/inventory/sync/sync-manager';

interface SyncStatusIndicatorProps {
  compact?: boolean;
}

export function SyncStatusIndicator({ compact = false }: SyncStatusIndicatorProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCounts = useCallback(() => {
    setPendingCount(offlineQueue.getPendingCount());
    setConflictCount(offlineQueue.getConflictCount());
    setIsSyncing(syncManager.getIsSyncing());
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });

    // Refresh counts periodically
    const interval = setInterval(refreshCounts, 2000);
    refreshCounts();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshCounts]);

  // Determine state
  const allSynced = isOnline && pendingCount === 0 && conflictCount === 0 && !isSyncing;
  const hasConflicts = isOnline && conflictCount > 0;
  const syncing = isOnline && isSyncing;
  const offline = !isOnline;

  const handlePress = () => {
    if (hasConflicts) {
      router.push('/inventory/sync-conflicts' as any);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={!hasConflicts}
        activeOpacity={0.7}
        style={styles.compactContainer}
      >
        {/* Dot indicator */}
        <View
          style={[
            styles.dot,
            allSynced && { backgroundColor: '#22c55e' },
            syncing && { backgroundColor: '#3b82f6' },
            hasConflicts && { backgroundColor: '#f59e0b' },
            offline && { backgroundColor: '#ef4444' },
          ]}
        />
        {syncing && <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 4 }} />}
        {hasConflicts && (
          <Text className="text-[10px] font-inter font-medium text-amber-600 ml-1">
            {conflictCount}
          </Text>
        )}
        {offline && pendingCount > 0 && (
          <Text className="text-[10px] font-inter font-medium text-red-500 ml-1">
            {pendingCount}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!hasConflicts}
      activeOpacity={0.7}
      style={styles.expandedContainer}
    >
      <View style={styles.row}>
        {/* Dot */}
        <View
          style={[
            styles.dotLarge,
            allSynced && { backgroundColor: '#22c55e' },
            syncing && { backgroundColor: '#3b82f6' },
            hasConflicts && { backgroundColor: '#f59e0b' },
            offline && { backgroundColor: '#ef4444' },
          ]}
        />

        {/* Label */}
        <View style={{ marginLeft: 8, flex: 1 }}>
          {allSynced && (
            <Text className="text-xs font-inter font-medium text-green-600">Synced</Text>
          )}
          {syncing && (
            <View style={styles.row}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-xs font-inter font-medium text-blue-600 ml-1">
                Syncing...
              </Text>
            </View>
          )}
          {hasConflicts && (
            <>
              <Text className="text-xs font-inter font-medium text-amber-600">
                {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
              </Text>
              <Text className="text-[10px] font-inter text-amber-500">Tap to resolve</Text>
            </>
          )}
          {offline && (
            <>
              <Text className="text-xs font-inter font-medium text-red-500">Offline</Text>
              {pendingCount > 0 && (
                <Text className="text-[10px] font-inter text-red-400">
                  {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  expandedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
