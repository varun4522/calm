import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

    // Save token to database
    if (token && userId) {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('✅ Push token saved successfully');
      }
    }

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
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: any
) {
  try {
    // Get push tokens for the users
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('push_token')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching push tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for users');
      return;
    }

    // Send push notifications via Expo Push API
    const messages = tokens.map((tokenData) => ({
      to: tokenData.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('✅ Push notifications sent:', result);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

/**
 * Send notification to all users of a specific type
 */
export async function sendNotificationToUserType(
  userType: 'student' | 'expert' | 'admin' | 'all',
  title: string,
  body: string,
  data?: any
) {
  try {
    let query = supabase
      .from('push_tokens')
      .select('push_token, user_id, profiles!inner(type)');

    if (userType !== 'all') {
      query = query.eq('profiles.type', userType);
    }

    const { data: tokens, error } = await query;

    if (error) {
      console.error('Error fetching push tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found');
      return;
    }

    const messages = tokens.map((tokenData) => ({
      to: tokenData.push_token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('✅ Push notifications sent to', userType, ':', result);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
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
