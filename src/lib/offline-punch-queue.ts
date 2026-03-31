import NetInfo from '@react-native-community/netinfo';

import { storage } from '@/lib/storage';

const QUEUE_KEY = 'offline_punch_queue';

interface PunchEntry {
  id: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
  latitude?: number;
  longitude?: number;
  shiftId?: string;
  locationId?: string;
  retries: number;
}

export function getQueue(): PunchEntry[] {
  const raw = storage.getString(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveQueue(queue: PunchEntry[]) {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueuePunch(entry: Omit<PunchEntry, 'id' | 'retries'>) {
  const queue = getQueue();
  queue.push({ ...entry, id: Date.now().toString(), retries: 0 });
  saveQueue(queue);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function syncQueue(
  apiPost: (url: string, body: Record<string, unknown>) => Promise<unknown>,
): Promise<{ synced: number; failed: number }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return { synced: 0, failed: 0 };

  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: PunchEntry[] = [];

  for (const entry of queue) {
    try {
      if (entry.type === 'check-in') {
        await apiPost('/hr/attendance/check-in', {
          latitude: entry.latitude,
          longitude: entry.longitude,
          shiftId: entry.shiftId,
          locationId: entry.locationId,
          offlineTimestamp: entry.timestamp,
        });
      } else {
        await apiPost('/hr/attendance/check-out', {
          latitude: entry.latitude,
          longitude: entry.longitude,
          offlineTimestamp: entry.timestamp,
        });
      }
      synced++;
    } catch {
      entry.retries++;
      if (entry.retries < 5) {
        remaining.push(entry);
      }
      failed++;
    }
  }

  saveQueue(remaining);
  return { synced, failed };
}
