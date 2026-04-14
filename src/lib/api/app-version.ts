import axios from 'axios';
import Env from 'env';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

type UpdateVerdict = 'force' | 'soft' | 'none';

export interface VersionCheckResult {
  updateRequired: UpdateVerdict;
  currentVersion: string;
  latestVersion: string;
  minimumVersion: string;
  recommendedVersion: string | null;
  updateUrl: string | null;
  maintenanceMode: boolean;
  message: string;
}

/**
 * Check app version against server config.
 *
 * Uses a standalone axios instance (NOT the auth-intercepted `client`)
 * because this endpoint is public and must work before the user logs in.
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  const version = Application.nativeApplicationVersion ?? Env.EXPO_PUBLIC_VERSION;

  const response = await axios.get<{ success: boolean; data: VersionCheckResult }>(
    `${Env.EXPO_PUBLIC_API_URL}/app-version/check`,
    { params: { platform, version }, timeout: 10000 },
  );

  return response.data.data;
}
