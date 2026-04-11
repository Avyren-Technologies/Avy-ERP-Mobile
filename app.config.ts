import type { ConfigContext, ExpoConfig } from '@expo/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { AppIconBadgeConfig } from 'app-icon-badge/types';

import 'tsx/cjs';

// adding lint exception as we need to import tsx/cjs before env.ts is imported
// eslint-disable-next-line perfectionist/sort-imports
import Env from './env';

const EXPO_ACCOUNT_OWNER = 'avyrentechnologies';
const EAS_PROJECT_ID = 'f53c2a58-f3c7-4947-8fb7-9820829c8b63';

/**
 * Firebase Android client config — required for getExpoPushTokenAsync on Android
 * (in addition to FCM V1 key in EAS).
 *
 * Use one file per app id (matches EXPO_PUBLIC_APP_ENV / EAS profile):
 *   google-services.development.json  → com.avyren.erp.development
 *   google-services.preview.json      → com.avyren.erp.preview
 *   google-services.production.json   → com.avyren.erp
 *
 * Alternatively, a single merged `google-services.json` from Firebase (all clients
 * in one project) also works — it is used if no env-specific file exists.
 */
const GOOGLE_SERVICES_BY_ENV: Record<
  typeof Env.EXPO_PUBLIC_APP_ENV,
  string
> = {
  development: 'google-services.development.json',
  preview: 'google-services.preview.json',
  production: 'google-services.production.json',
};

function resolveGoogleServicesFile(): string | undefined {
  const env = Env.EXPO_PUBLIC_APP_ENV;
  const envRelative = GOOGLE_SERVICES_BY_ENV[env];
  const envPath = join(process.cwd(), envRelative);
  if (existsSync(envPath)) {
    return `./${envRelative}`;
  }

  const mergedPath = join(process.cwd(), 'google-services.json');
  if (existsSync(mergedPath)) {
    return './google-services.json';
  }

  return undefined;
}

const androidGoogleServicesFile = resolveGoogleServicesFile();

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== 'production',
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: 'banner',
      color: 'white',
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: 'ribbon',
      color: 'white',
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  owner: EXPO_ACCOUNT_OWNER,
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: 'avy-erpapp',
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  runtimeVersion: {
    policy: 'appVersion',
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/f53c2a58-f3c7-4947-8fb7-9820829c8b63',
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: 'Allow Avy ERP to use your location to set geofencing areas.',
      NSPhotoLibraryUsageDescription: 'Allow Avy ERP to access your photos to upload company logos.',
      NSCameraUsageDescription: 'Allow Avy ERP to use the camera to photograph company logos.',
    },
    config: {
      googleMapsApiKey: Env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
    ...(androidGoogleServicesFile
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
    config: {
      googleMaps: {
        apiKey: Env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/splash-icon.png',
        imageWidth: 150,
      },
    ],
    [
      'expo-font',
      {
        ios: {
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: 'Inter',
              fontDefinitions: [
                {
                  path: 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
                  weight: 400,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
                  weight: 500,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
                  weight: 600,
                },
                {
                  path: 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
                  weight: 700,
                },
              ],
            },
          ],
        },
      },
    ],
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#4F46E5',
      },
    ],
    'expo-router',
    ['app-icon-badge', appIconBadgeConfig],
    ['react-native-edge-to-edge'],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Avy ERP to access your photos to upload company logos.',
        cameraPermission: 'Allow Avy ERP to use the camera to photograph company logos.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Allow Avy ERP to use your location to set geofencing areas.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
    googleMapsApiKey: Env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  },
});
