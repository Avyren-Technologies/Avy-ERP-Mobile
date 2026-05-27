import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '@/features/inventory/sync/offline-queue';
import { inventoryApi } from '@/lib/api/inventory';

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
}

class SyncManager {
  private isSyncing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  start(): void {
    // Listen for network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isSyncing) {
        this.syncPendingActions();
      }
    });

    // Listen for app foreground
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          this.syncPendingActions();
        }
      },
    );
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  async syncPendingActions(): Promise<SyncResult> {
    if (this.isSyncing) return { synced: 0, conflicts: 0, failed: 0 };
    this.isSyncing = true;

    try {
      const pending = offlineQueue.getQueue().filter((a) => a.syncStatus === 'PENDING');
      if (pending.length === 0) return { synced: 0, conflicts: 0, failed: 0 };

      // Mark as SYNCING
      pending.forEach((a) => offlineQueue.updateStatus(a.id, 'SYNCING'));

      // Batch upload to server
      const response = await inventoryApi.uploadSyncActions({ actions: pending });
      const result = response?.data;

      // Update local statuses based on server response
      const details: Array<{ actionId: string; status: 'SYNCED' | 'CONFLICT' | 'FAILED'; conflictDetails?: unknown }> =
        result?.details || [];
      for (const d of details) {
        offlineQueue.updateStatus(d.actionId, d.status);
      }

      // Clean up synced entries
      offlineQueue.removeSynced();

      return {
        synced: result?.synced || 0,
        conflicts: result?.conflicts || 0,
        failed: result?.failed || 0,
      };
    } catch (error) {
      // Network failure — revert to PENDING
      console.warn('Inventory sync failed:', error);
      offlineQueue
        .getQueue()
        .filter((a) => a.syncStatus === 'SYNCING')
        .forEach((a) => offlineQueue.updateStatus(a.id, 'PENDING'));
      return { synced: 0, conflicts: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncManager = new SyncManager();
