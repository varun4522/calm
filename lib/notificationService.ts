import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior only if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface PushNotificationToken {
  user_id: string;
  push_token: string;
  platform: string;
  created_at?: string;
}

/**
 * Register for push notifications and save token to database
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  try {
    // Skip push notifications in Expo Go since they're not supported in SDK 53+
    if (isExpoGo) {
      console.log('ℹ️ Push notifications are not available in Expo Go. Use a development build for full functionality.');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get push token
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: '766744c8-deca-4ae4-b33e-04085a5d31b2', // Updated
    });
    token = pushToken.data;
    console.log('📱 Push token obtained:', token.substring(0, 20) + '...');

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFB347',
      });
    }

  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }

  return token;
}

/**
 * Send a local notification (appears immediately)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  // Skip local notifications in Expo Go to avoid warnings
  if (isExpoGo) {
    console.log(`📱 Local notification (Expo Go): ${title} - ${body}`);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

/**
 * Send push notification to specific users
 * Note: Push tokens table removed - this function is disabled
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: any
) {
  console.log('Push notifications disabled - push_tokens table removed');
  return;
}

/**
 * Send notification to all users of a specific type
 * Note: Push tokens table removed - this function is disabled
 */
export async function sendNotificationToUserType(
  userType: 'student' | 'expert' | 'admin' | 'all',
  title: string,
  body: string,
  data?: any
) {
  console.log('Push notifications disabled - push_tokens table removed');
  return;

}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Notification received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('📬 Notification received:', notification);
      onNotificationReceived?.(notification);
    }
  );

  // User tapped on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('👆 Notification tapped:', response);
      onNotificationResponse?.(response);
    }
  );

  return {
    receivedSubscription,
    responseSubscription,
  };
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners(subscriptions: {
  receivedSubscription: Notifications.Subscription;
  responseSubscription: Notifications.Subscription;
}) {
  subscriptions.receivedSubscription.remove();
  subscriptions.responseSubscription.remove();
}
