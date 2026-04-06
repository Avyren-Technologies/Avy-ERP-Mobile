import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { client } from '@/lib/api/client';
import { createLogger } from '@/lib/logger';
import { getItem, setItem, removeItem } from '@/lib/storage';

const logger = createLogger('PushNotifications');

const FCM_TOKEN_KEY = 'push_fcm_token';

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
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.info('Push notifications require a physical device — skipping registration');
    return null;
  }

  // Check / request permissions
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

  // Android: set up default notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5', // primary indigo
    });
  }

  try {
    // Get the Expo project ID from the app config
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

    // Persist token locally so we can unregister on logout
    await setItem(FCM_TOKEN_KEY, token);

    // Register with backend
    try {
      await client.post('/notifications/register-device', {
        fcmToken: token,
        platform,
        deviceName: Device.modelName || undefined,
      });
      logger.info('Device token registered with backend');
    } catch (err) {
      logger.error('Failed to register device token with backend', { error: err });
    }

    return token;
  } catch (err) {
    logger.error('Failed to get push token', { error: err });
    return null;
  }
}

/**
 * Unregister the device push token on logout.
 * Removes the token from the backend and clears local storage.
 */
export async function unregisterPushNotifications(): Promise<void> {
  const token = getItem<string>(FCM_TOKEN_KEY);
  if (!token) return;

  try {
    await client.delete('/notifications/register-device', {
      data: { fcmToken: token },
    });
    logger.info('Device token unregistered from backend');
  } catch (err) {
    logger.error('Failed to unregister device token', { error: err });
  }

  removeItem(FCM_TOKEN_KEY);
}

/**
 * Get the locally stored FCM token (if any).
 */
export function getStoredPushToken(): string | null {
  return getItem<string>(FCM_TOKEN_KEY);
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
