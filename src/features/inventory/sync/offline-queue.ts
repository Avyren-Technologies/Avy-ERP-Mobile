import { storage } from '@/lib/storage';

const QUEUE_KEY = 'inventory:offline-queue';

export interface OfflineAction {
  id: string;
  actionType: 'PUTAWAY_CONFIRM' | 'PICK_CONFIRM' | 'COUNT_ENTRY' | 'TOOL_RETURN';
  payload: Record<string, unknown>;
  capturedAt: string;
  deviceId: string;
  userId: string;
  geoLocation?: { lat: number; lng: number };
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class OfflineQueue {
  getQueue(): OfflineAction[] {
    const raw = storage.getString(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  addAction(action: Omit<OfflineAction, 'id' | 'syncStatus'>): void {
    const queue = this.getQueue();
    queue.push({ ...action, id: generateUUID(), syncStatus: 'PENDING' });
    storage.set(QUEUE_KEY, JSON.stringify(queue));
  }

  updateStatus(actionId: string, status: OfflineAction['syncStatus']): void {
    const queue = this.getQueue();
    const idx = queue.findIndex((a) => a.id === actionId);
    if (idx >= 0) {
      queue[idx].syncStatus = status;
      storage.set(QUEUE_KEY, JSON.stringify(queue));
    }
  }

  removeSynced(): void {
    const queue = this.getQueue().filter((a) => a.syncStatus !== 'SYNCED');
    storage.set(QUEUE_KEY, JSON.stringify(queue));
  }

  getPendingCount(): number {
    return this.getQueue().filter((a) => a.syncStatus === 'PENDING').length;
  }

  getConflictCount(): number {
    return this.getQueue().filter((a) => a.syncStatus === 'CONFLICT').length;
  }

  getFailedCount(): number {
    return this.getQueue().filter((a) => a.syncStatus === 'FAILED').length;
  }

  clear(): void {
    storage.remove(QUEUE_KEY);
  }
}

export const offlineQueue = new OfflineQueue();
