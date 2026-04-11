import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { client } from '@/lib/api/client';
import { createLogger } from '@/lib/logger';
import { getItem, setItem, removeItem } from '@/lib/storage';

const logger = createLogger('PushNotifications');

const PUSH_TOKEN_KEY = 'push_token';

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and send the device token to the backend.
 * Call this after the user is authenticated.
 * Returns the push token string, or null if registration failed.
 *
 * Graceful failure modes:
 *   - Not a physical device → skip silently
 *   - Permission denied → skip silently
 *   - FCM credentials missing (Android dev client) → warn with docs link, no crash
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.info('Push notifications require a physical device — skipping registration');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('Push notification permission not granted');
    return null;
  }

  // Android: set up notification channels.
  //
  // Channels are idempotent — repeat calls with the same id overwrite settings.
  // We do NOT set bypassDnd because it requires the user to grant
  // ACCESS_NOTIFICATION_POLICY, which Expo managed workflow can't request
  // automatically. Expo would silently drop the flag anyway.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
      enableVibrate: true,
      enableLights: true,
    });

    // Dedicated high-importance channel for CRITICAL notifications
    // (security alerts, salary credited, password reset, etc.).
    // Backend must set android.notification.channel_id='critical' on the
    // FCM push payload to route notifications to this channel.
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#DC2626',
      enableVibrate: true,
      enableLights: true,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      logger.error('Missing EAS project ID — cannot register for push notifications');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    const platform = Platform.OS === 'ios' ? 'MOBILE_IOS' : 'MOBILE_ANDROID';

    logger.info('Obtained push token', { platform });

    await setItem(PUSH_TOKEN_KEY, token);

    // Register with backend (extended payload with device metadata).
    // Locale/timezone come from the device — these are device metadata, not
    // formatting values (company timezone is used for formatting per CLAUDE.md).
    try {
      const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
      await client.post('/notifications/register-device', {
        fcmToken: token,
        tokenType: 'EXPO',
        platform,
        deviceName: Device.deviceName ?? Device.modelName ?? undefined,
        deviceModel: Device.modelName ?? undefined,
        osVersion: Device.osVersion ?? undefined,
        appVersion: Application.nativeApplicationVersion ?? undefined,
        locale: resolvedOptions.locale,
        timezone: resolvedOptions.timeZone,
      });
      logger.info('Device token registered with backend');
    } catch (err) {
      logger.error('Failed to register device token with backend', { error: err });
    }

    return token;
  } catch (err: unknown) {
    // Expected when FCM credentials aren't set up on the build (e.g. Expo Go
    // on SDK 53+, or a local dev build without the EAS FCM V1 service account).
    // Don't crash — warn with a docs pointer and continue.
    const msg = (err as Error)?.message ?? String(err);
    // Tolerant match: Expo has used several error strings across SDK versions.
    // We match case-insensitively on 'firebase' + 'initial' as a sentinel.
    const isFirebaseInitError = /firebase/i.test(msg) && /initial/i.test(msg);
    if (isFirebaseInitError) {
      logger.warn(
        "FCM not configured on this build. Push notifications are disabled " +
          "for this session. If this is a dev/Expo Go build that's expected. " +
          'See https://docs.expo.dev/push-notifications/fcm-credentials/',
      );
    } else {
      logger.error('Failed to get push token', { error: err });
    }
    return null;
  }
}

/**
 * Unregister the device push token on logout.
 * Removes the token from the backend and clears local storage.
 */
export async function unregisterPushNotifications(): Promise<void> {
  const token = getItem<string>(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await client.delete('/notifications/register-device', {
      data: { fcmToken: token },
    });
    logger.info('Device token unregistered from backend');
  } catch (err) {
    logger.error('Failed to unregister device token', { error: err });
  }

  removeItem(PUSH_TOKEN_KEY);
}

/**
 * Get the locally stored push token (if any).
 */
export function getStoredPushToken(): string | null {
  return getItem<string>(PUSH_TOKEN_KEY);
}

/**
 * Add a listener for when the user taps a notification (app was backgrounded or killed).
 * Use this for deep-linking to specific screens.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for notifications received while the app is in the foreground.
 */
export function addForegroundNotificationListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}
