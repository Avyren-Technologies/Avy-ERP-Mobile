import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  return value ? JSON.parse(value) || null : null;
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.remove(key);
}

// ── Check-In UI Mode (company-wide setting from AttendanceRules) ──

const CHECK_IN_UI_MODE_KEY = 'checkInUIMode';

export function getCheckInUIMode(): 'SLIDE' | 'BUTTON' {
  const value = storage.getString(CHECK_IN_UI_MODE_KEY);
  return value === 'BUTTON' ? 'BUTTON' : 'SLIDE';
}

export function setCheckInUIMode(mode: 'SLIDE' | 'BUTTON') {
  storage.set(CHECK_IN_UI_MODE_KEY, mode);
}
