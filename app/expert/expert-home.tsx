import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toByteArray } from 'base64-js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList
} from 'react-native';
import * as Updates from 'expo-updates';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import Toast from 'react-native-toast-message';
import { useInsertNotification } from '@/api/Notifications';
import { formatRelativeTime, uploadMediaToSupabase, pickMediaFromGallery } from '@/lib/utils';
import { profilePics } from '@/constants/ProfilePhotos';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationListeners,
  removeNotificationListeners,
  sendLocalNotification
} from '@/lib/notificationService';

// Mood tracking constants
const MOOD_EMOJIS = [
  { emoji: '😄', label: 'Happy' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
];


function getTodayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function ExpertHome() {
  const router = useRouter();
  const [expertRegNo, setExpertRegNo] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'mood' | 'community'>('home');

  // Community states
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Comment states
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'REMEMBER BETTER',
  });

  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);
  const { mutateAsync: insertNotification } = useInsertNotification();

  // Check for OTA updates on app launch
  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) return; // Skip in development

      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            '🎉 Update Available',
            'A new version is available. Restart to apply updates?',
            [
              {
                text: 'Later',
                style: 'cancel'
              },
              {
                text: 'Restart Now',
                onPress: async () => {
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
    checkForUpdates();
  }, []);

  // Animation values for upload progress
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  // Mood tracking states
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<{ [key: string]: string }>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dailyMoodEntries, setDailyMoodEntries] = useState<{ [key: string]: { emoji: string, label: string, time: string, scheduled?: string, scheduleKey?: string }[] }>({});
  const [detailedMoodEntries, setDetailedMoodEntries] = useState<{ date: string, emoji: string, label: string, time: string, scheduled?: string, scheduleKey?: string, notes?: string }[]>([]);
  const [nextMoodPrompt, setNextMoodPrompt] = useState<Date | null>(null);
  const [currentPromptInfo, setCurrentPromptInfo] = useState<{ timeLabel: string, scheduleKey: string } | null>(null);
  const [todayMoodProgress, setTodayMoodProgress] = useState<{ completed: number, total: number }>({ completed: 0, total: 6 });
  const [moodPromptsToday, setMoodPromptsToday] = useState<number>(0);
  const [missedPromptsQueue, setMissedPromptsQueue] = useState<{ label: string, scheduleKey: string }[]>([]);

  // this is the expert registration number but studentReg no is used to not break things
  const studentRegNo = profile?.registration_number;

  const [showToolkitPage, setShowToolkitPage] = useState(false);
  const [showToolkitPopup, setShowToolkitPopup] = useState(false);
  const [selectedToolkitItem, setSelectedToolkitItem] = useState<{ name: string, description: string, route: string } | null>(null);

  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [sendingNotification, setSendingNotification] = useState(false);

  const [notificationForm, setNotificationForm] = useState({
    sender_id: session?.user.id || '',
    sender_name: profile?.name || '',
    sender_type: 'EXPERT', // default since expert is sending it
    receiver_type: 'STUDENTS', // default audience (can be changed in UI)
    title: '',
    message: '',
    priority: 'MEDIUM', // default
  });

  const categories = [
    'REMEMBER BETTER',
    'VIDEOS',
    'GUIDES'
  ];

  // Animated bubble background (home tab only)
  const { height: screenHeight } = Dimensions.get('window');
  const bubbleConfigs = React.useRef(
    Array.from({ length: 14 }).map((_, i) => {
      const size = Math.floor(Math.random() * 90) + 40; // 40 - 130
      return {
        size,
        left: Math.random() * 90, // percent
        delay: Math.random() * 4000,
        duration: 18000 + Math.random() * 10000, // 18s - 28s
        color: [
          'rgba(206,147,216,0.30)', // Colors.accent base
          'rgba(186,104,200,0.25)', // Colors.tertiary variant
          'rgba(142,36,170,0.22)',  // secondary tint
          'rgba(225,190,231,0.28)'  // accentLight tint
        ][i % 4],
        opacity: 0.35 + Math.random() * 0.25
      };
    })
  ).current;
  const bubbleAnimations = React.useRef(bubbleConfigs.map(() => new Animated.Value(0))).current;

  const startBubbleLoop = React.useCallback((index: number) => {
    const cfg = bubbleConfigs[index];
    bubbleAnimations[index].setValue(0);
    Animated.timing(bubbleAnimations[index], {
      toValue: 1,
      duration: cfg.duration,
      delay: cfg.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => startBubbleLoop(index));
  }, [bubbleConfigs, bubbleAnimations]);

  useEffect(() => {
    bubbleAnimations.forEach((_: any, i: number) => startBubbleLoop(i));
  }, [bubbleAnimations, startBubbleLoop]);


  // Load notifications when expert data is available
  useEffect(() => {
    if (expertRegNo) {
      loadNotifications();
    }
  }, [expertRegNo]);

  // Register for push notifications and setup listeners
  useEffect(() => {
    if (!expertRegNo) return;

    let notificationSubscriptions: { receivedSubscription: any; responseSubscription: any } | null = null;

    const initNotifications = async () => {
      try {
        console.log('📱 Registering expert for notifications...');
        // Use session user ID (UUID) instead of registration number
        if (session?.user?.id) {
          console.log('Expert session available:', session.user.id);
        } else {
          console.log('⚠️ No session user ID available for push notifications');
        }

        // Setup notification listeners with navigation
        const subscriptions = setupNotificationListeners(
          (notification) => {
            console.log('🔔 Expert received notification:', notification);
          },
          (response) => {
            console.log('👆 Expert tapped notification:', response);
            const data = response.notification.request.content.data;

            // Handle different notification types
            if (data.type === 'mood_reminder') {
              // Open mood modal when tapping reminder
              setMoodModalVisible(true);
            } else if (data.type === 'mood_entry') {
              // Could navigate to mood history or analytics
              console.log('Mood entry notification tapped');
            }
          }
        );

        notificationSubscriptions = subscriptions;
        console.log('✅ Expert push notification setup complete');
      } catch (error) {
        console.error('❌ Error setting up expert push notifications:', error);
      }
    };

    initNotifications();

    return () => {
      console.log('🧹 Cleaning up expert notification listeners');
      if (notificationSubscriptions) {
        removeNotificationListeners(notificationSubscriptions);
      }
    };
  }, [expertRegNo]);


  // Notification functions
  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);

      // Count unread notifications
      const unread = (data || []).filter((notification: NotificationData) => !notification.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const sendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in both title and message fields.',
      });
      return;
    }

    try {
      setSendingNotification(true);
      const notificationData = {
        sender_id: session?.user.id ?? '',
        sender_name: profile?.name ?? '',
        sender_type: 'EXPERT' as const,
        receiver_type: notificationForm.receiver_type.toUpperCase() as
          | 'STUDENTS'
          | 'EXPERTS'
          | 'PEERS'
          | 'ADMIN'
          | 'ALL',
        title: notificationForm.title,
        message: notificationForm.message,
        priority: notificationForm.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
        created_at: new Date().toISOString(),
      }
      console.log(notificationData);
      await insertNotification(notificationData);

      Toast.show({
        type: 'success',
        text1: `Notification sent successfully to ${notificationForm.receiver_type === 'ALL' ? 'all students' : 'selected recipients'}.`,
      });

      setNotificationForm({
        sender_id: session?.user.id ?? '',
        sender_name: profile?.name ?? '',
        sender_type: 'EXPERT',
        receiver_type: 'ALL',
        title: '',
        message: '',
        priority: 'MEDIUM',
      });

      setShowNotificationModal(false);
      await loadNotifications();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to send notification.',
        text2: error instanceof Error ? error.message : 'Please try again.',
      });
      console.log(error);
    } finally {
      setSendingNotification(false);
    }
  };


  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: now,
          updated_at: now
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications((prev: NotificationData[]) =>
        prev.map((notification: NotificationData) =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: now, updated_at: now }
            : notification
        )
      );

      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Fixed mood prompt schedule (6 times a day at specific times)
  const generateMoodPromptTimes = (referenceDate: Date): { time: Date, label: string, intervalNumber: number, scheduleKey: string }[] => {
    const prompts = [];
    // Fixed 6 time slots: 8-11 AM, 11 AM-1 PM, 1-3 PM, 3-5 PM, 5-7 PM, 7-9 PM
    const timeSlots = [
      { start: 8, end: 11, label: 'Morning (8-11 AM)', scheduleKey: 'slot_1' },
      { start: 11, end: 13, label: 'Late Morning (11 AM-1 PM)', scheduleKey: 'slot_2' },
      { start: 13, end: 15, label: 'Afternoon (1-3 PM)', scheduleKey: 'slot_3' },
      { start: 15, end: 17, label: 'Late Afternoon (3-5 PM)', scheduleKey: 'slot_4' },
      { start: 17, end: 19, label: 'Evening (5-7 PM)', scheduleKey: 'slot_5' },
      { start: 19, end: 21, label: 'Night (7-9 PM)', scheduleKey: 'slot_6' }
    ];

    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      const promptTime = new Date(referenceDate);
      promptTime.setHours(slot.start, 0, 0, 0);

      prompts.push({
        time: promptTime,
        label: slot.label,
        intervalNumber: i + 1,
        scheduleKey: slot.scheduleKey
      });
    }

    return prompts;
  };

  // Helper function to format time nicely
  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Mood tracking functions
  const loadMoodData = async () => {
    try {
      const userId = session?.user?.id;
      const regNo = expertRegNo || profile?.registration_number?.toString();

      if (!userId) {
        console.log('⏳ Waiting for user session to load expert mood data...');
        setMoodHistory({});
        setDailyMoodEntries({});
        setDetailedMoodEntries([]);
        return;
      }

      // Load from Supabase (primary source)
      const { data: moodData, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) {
        console.error('❌ Error loading expert mood data from Supabase:', error);
        // Fall back to AsyncStorage
        if (regNo) {
          const moodHistoryData = await AsyncStorage.getItem(`expertMoodHistory_${regNo}`);
          if (moodHistoryData) setMoodHistory(JSON.parse(moodHistoryData));
          
          const dailyEntriesData = await AsyncStorage.getItem(`expertDailyMoodEntries_${regNo}`);
          if (dailyEntriesData) setDailyMoodEntries(JSON.parse(dailyEntriesData));
          
          const detailedEntriesData = await AsyncStorage.getItem(`expertDetailedMoodEntries_${regNo}`);
          if (detailedEntriesData) setDetailedMoodEntries(JSON.parse(detailedEntriesData));
        }
      } else if (moodData && moodData.length > 0) {
        // Transform Supabase data to local format
        const history: { [key: string]: string } = {};
        const dailyEntries: { [key: string]: any[] } = {};
        const detailed: any[] = [];

        moodData.forEach((entry: any) => {
          // Ensure date is in YYYY-MM-DD format
          const date = entry.entry_date;
          if (!date) {
            console.warn('⚠️ Expert mood entry missing date:', entry);
            return;
          }
          
          // Keep only the latest mood for simple history
          history[date] = entry.mood_emoji;
          
          // Add to daily entries
          if (!dailyEntries[date]) dailyEntries[date] = [];
          dailyEntries[date].push({
            emoji: entry.mood_emoji,
            label: entry.mood_label,
            time: entry.entry_time,
            scheduled: entry.scheduled_label,
            scheduleKey: entry.schedule_key
          });

          // Add to detailed entries
          detailed.push({
            date: entry.entry_date,
            emoji: entry.mood_emoji,
            label: entry.mood_label,
            time: entry.entry_time,
            scheduled: entry.scheduled_label,
            scheduleKey: entry.schedule_key,
            notes: entry.notes
          });
        });

        setMoodHistory(history);
        setDailyMoodEntries(dailyEntries);
        setDetailedMoodEntries(detailed);
        console.log(`✅ Loaded ${moodData.length} expert mood entries from Supabase:`, {
          totalEntries: moodData.length,
          historyKeys: Object.keys(history).length,
          dailyEntriesKeys: Object.keys(dailyEntries).length
        });

        // Backup to AsyncStorage
        if (regNo) {
          await AsyncStorage.setItem(`expertMoodHistory_${regNo}`, JSON.stringify(history));
          await AsyncStorage.setItem(`expertDailyMoodEntries_${regNo}`, JSON.stringify(dailyEntries));
          await AsyncStorage.setItem(`expertDetailedMoodEntries_${regNo}`, JSON.stringify(detailed));
        }
      } else {
        console.log('📝 No expert mood data found in Supabase');
        setMoodHistory({});
        setDailyMoodEntries({});
        setDetailedMoodEntries([]);
      }

      // Initialize mood prompt system with 6-times daily schedule
      if (regNo) {
        await initializeMoodPromptSystem(regNo);
      }
    } catch (error) {
      console.error('Error loading expert mood data:', error);
    }
  };

  // Initialize mood prompt system with fixed daily times
  const initializeMoodPromptSystem = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const now = new Date();

      // Get or create today's mood schedule
      const scheduleKey = `expertMoodSchedule_${regNo}_${today}`;
      let scheduleData = await AsyncStorage.getItem(scheduleKey);

      let dailySchedule;
      if (!scheduleData) {
        // Create new schedule with fixed times for today
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        dailySchedule = {
          date: today,
          promptTimes: generateMoodPromptTimes(todayDate),
          completedPrompts: [],
          count: 0,
          lastChecked: now.toISOString()
        };
        await AsyncStorage.setItem(scheduleKey, JSON.stringify(dailySchedule));
        console.log('📅 Created new expert mood schedule for', today, 'with 6 prompts at fixed times');
      } else {
        dailySchedule = JSON.parse(scheduleData);
        console.log(`📊 Loaded expert mood schedule: ${dailySchedule.count}/6 completed`);
      }

      setMoodPromptsToday(dailySchedule.count);
      setTodayMoodProgress({ completed: dailySchedule.count, total: 6 });

      // Check if it's time for any prompts
      await checkForMoodPrompt(regNo, dailySchedule);
    } catch (error) {
      console.error('Error initializing expert mood prompt system:', error);
    }
  };

  const saveMood = async (mood: string) => {
    try {
      // Use session user ID as primary identifier
      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'Please log in to save mood data');
        return;
      }

      const today = getTodayKey();
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const moodData = MOOD_EMOJIS.find(m => m.emoji === mood);
      const timeLabel = currentPromptInfo?.timeLabel || 'Unscheduled';
      const scheduleKey = currentPromptInfo?.scheduleKey || '';
      const now = new Date();

      // Save to Supabase first (primary storage)
      const { error: supabaseError } = await supabase
        .from('mood_entries')
        .insert({
          user_id: userId,
          user_type: profile?.type || 'EXPERT',
          mood_emoji: mood,
          mood_label: moodData?.label || 'Unknown',
          entry_date: now.toISOString().split('T')[0],
          entry_time: now.toTimeString().split(' ')[0],
          scheduled_label: timeLabel,
          schedule_key: scheduleKey,
          notes: null
        });

      if (supabaseError) {
        console.error('❌ Error saving expert mood to Supabase:', supabaseError);
        Alert.alert('Error', 'Failed to save mood. Please try again.');
        return;
      }

      console.log('✅ Expert mood saved to Supabase database');

      // Send confirmation notification
      await sendLocalNotification(
        '🎯 Mood Logged!',
        `You're feeling ${moodData?.label || 'good'} today. Keep tracking your emotional journey!`,
        {
          type: 'mood_entry',
          mood,
          label: moodData?.label || 'Unknown',
          time: currentTime
        }
      );

      // Update local state for immediate UI update
      const newEntry = {
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
        scheduled: timeLabel,
        scheduleKey
      };

      const updatedHistory = { ...moodHistory, [today]: mood };
      setMoodHistory(updatedHistory);

      const updatedDailyEntries = {
        ...dailyMoodEntries,
        [today]: [...(dailyMoodEntries[today] || []), newEntry]
      };
      setDailyMoodEntries(updatedDailyEntries);

      const detailedEntry = {
        date: today,
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
        scheduled: timeLabel,
        scheduleKey
      };
      const updatedDetailedEntries = [...detailedMoodEntries, detailedEntry];
      setDetailedMoodEntries(updatedDetailedEntries);

      // Backup to AsyncStorage
      const regNo = expertRegNo || profile?.registration_number?.toString() || userId;
      await AsyncStorage.setItem(`expertMoodHistory_${regNo}`, JSON.stringify(updatedHistory));
      await AsyncStorage.setItem(`expertDailyMoodEntries_${regNo}`, JSON.stringify(updatedDailyEntries));
      await AsyncStorage.setItem(`expertDetailedMoodEntries_${regNo}`, JSON.stringify(updatedDetailedEntries));

      console.log(`✅ Expert mood saved for user ${userId}: ${mood} at ${currentTime} (${timeLabel})`);
      setMoodModalVisible(false);
      setSelectedMood(null);

      // Record that this prompt was completed
      if (currentPromptInfo && currentPromptInfo.scheduleKey !== 'welcome') {
        await recordMoodPromptCompleted(regNo, currentPromptInfo.scheduleKey);
      }

      // Clear current prompt info
      setCurrentPromptInfo(null);

    } catch (error) {
      console.error('Error saving expert mood:', error);
      Alert.alert('Error', 'Failed to save mood');
    }
  };

  // Check if it's time for a mood prompt - now shows persistently until completed
  const checkForMoodPrompt = async (regNo: string, dailySchedule?: any) => {
    try {
      const now = new Date();
      const today = getTodayKey();
      const userId = session?.user?.id;

      if (!userId) {
        console.log('⏳ No user session for mood check');
        return;
      }

      // Get today's mood entries from Supabase to check which slots are filled
      const { data: todayMoods, error } = await supabase
        .from('mood_entries')
        .select('schedule_key')
        .eq('user_id', userId)
        .eq('entry_date', today);

      if (error) {
        console.error('❌ Error fetching today\'s moods:', error);
        return;
      }

      // Get list of completed schedule keys
      const completedSlots = new Set(todayMoods?.map(m => m.schedule_key).filter(Boolean) || []);
      console.log(`📊 Expert completed mood slots: ${completedSlots.size}/6`, Array.from(completedSlots));

      // Load schedule if not provided
      let schedule = dailySchedule;
      if (!schedule) {
        const scheduleKey = `expertMoodSchedule_${regNo}_${today}`;
        const scheduleData = await AsyncStorage.getItem(scheduleKey);
        if (!scheduleData) {
          console.log('⚠️ No expert mood schedule found for today, creating new one');
          await initializeMoodPromptSystem(regNo);
          return;
        }
        schedule = JSON.parse(scheduleData);
      }

      // Update last checked time
      schedule.lastChecked = now.toISOString();
      const scheduleKey = `expertMoodSchedule_${regNo}_${today}`;
      await AsyncStorage.setItem(scheduleKey, JSON.stringify(schedule));

      // Check which time slots are due and not completed
      const currentHour = now.getHours();
      const missedSlots: { label: string, intervalNumber: number, time: Date, timeLabel: string, scheduleKey: string }[] = [];

      // Define time slots with their hour ranges
      const timeSlots = [
        { start: 8, end: 11, scheduleKey: 'slot_1', label: 'Morning (8-11 AM)' },
        { start: 11, end: 13, scheduleKey: 'slot_2', label: 'Late Morning (11 AM-1 PM)' },
        { start: 13, end: 15, scheduleKey: 'slot_3', label: 'Afternoon (1-3 PM)' },
        { start: 15, end: 17, scheduleKey: 'slot_4', label: 'Late Afternoon (3-5 PM)' },
        { start: 17, end: 19, scheduleKey: 'slot_5', label: 'Evening (5-7 PM)' },
        { start: 19, end: 21, scheduleKey: 'slot_6', label: 'Night (7-9 PM)' }
      ];

      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const isInTimeSlot = currentHour >= slot.start && currentHour < slot.end;
        const hasCompleted = completedSlots.has(slot.scheduleKey);
        const isPast = currentHour >= slot.end;

        // Show prompt if: currently in time slot OR time slot has passed, and not completed
        if ((isInTimeSlot || isPast) && !hasCompleted) {
          const promptTime = new Date();
          promptTime.setHours(slot.start, 0, 0, 0);
          
          missedSlots.push({
            label: slot.label,
            intervalNumber: i + 1,
            time: promptTime,
            timeLabel: slot.label,
            scheduleKey: slot.scheduleKey
          });
        }
      }

      // Update local progress
      setTodayMoodProgress({ completed: completedSlots.size, total: 6 });

      // Refresh local state with Supabase data
      if (todayMoods && todayMoods.length > 0) {
        const history: { [key: string]: string } = {};
        const dailyEntries: { [key: string]: any[] } = {};
        
        // Get all mood entries to update calendar
        const { data: allMoods } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: true });
        
        if (allMoods) {
          allMoods.forEach((entry: any) => {
            const date = entry.entry_date;
            history[date] = entry.mood_emoji;
            
            if (!dailyEntries[date]) dailyEntries[date] = [];
            dailyEntries[date].push({
              emoji: entry.mood_emoji,
              label: entry.mood_label,
              time: entry.entry_time,
              scheduled: entry.scheduled_label,
              scheduleKey: entry.schedule_key
            });
          });
          
          setMoodHistory(history);
          setDailyMoodEntries(dailyEntries);
        }
      }

      if (missedSlots.length > 0) {
        // Show the earliest missed slot
        const nextPrompt = missedSlots[0];
        console.log(`🎯 Showing expert mood prompt: ${nextPrompt.label} (${nextPrompt.intervalNumber}/6) - ${missedSlots.length} pending`);

        // Send push notification reminder
        await sendLocalNotification(
          '😊 Time for Mood Check-in',
          `It's time for your ${nextPrompt.label}. Take a moment to reflect on how you're feeling.`,
          {
            type: 'mood_reminder',
            label: nextPrompt.label,
            intervalNumber: nextPrompt.intervalNumber
          }
        );

        setCurrentPromptInfo({
          timeLabel: nextPrompt.timeLabel,
          scheduleKey: nextPrompt.scheduleKey
        });
        setMissedPromptsQueue(missedSlots.map(p => ({ label: p.timeLabel, scheduleKey: p.scheduleKey })));
        setMoodModalVisible(true);
      } else {
        console.log(`✅ All ${completedSlots.size}/6 expert prompts completed for today!`);
      }

    } catch (error) {
      console.error('Error checking for expert mood prompt:', error);
    }
  };

  // Record that mood prompt was completed
  const recordMoodPromptCompleted = async (regNo: string, intervalNumber: string) => {
    try {
      const today = getTodayKey();
      const scheduleKey = `expertMoodSchedule_${regNo}_${today}`;
      const scheduleData = await AsyncStorage.getItem(scheduleKey);

      if (!scheduleData) return;

      const schedule = JSON.parse(scheduleData);
      const interval = parseInt(intervalNumber);

      if (!schedule.completedPrompts.includes(interval)) {
        schedule.completedPrompts.push(interval);
        schedule.count = schedule.completedPrompts.length;
        schedule.lastCompleted = new Date().toISOString();

        await AsyncStorage.setItem(scheduleKey, JSON.stringify(schedule));
        setMoodPromptsToday(schedule.count);
        setTodayMoodProgress({ completed: schedule.count, total: 6 });

        console.log(`✅ Expert mood prompt completed: ${schedule.count}/6 (Interval ${interval})`);

        // Show completion message
        if (schedule.count === 6) {
          Alert.alert(
            '🎉 Amazing!',
            'You\'ve completed all 6 mood check-ins for today! Great job tracking your emotional wellness.',
            [{ text: 'Awesome!', style: 'default' }]
          );
        } else {
          // Check for next pending prompt immediately
          setTimeout(() => {
            checkForMoodPrompt(regNo, schedule);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error recording expert mood prompt completion:', error);
    }
  };

  // Generate calendar for current month
  const generateCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const calendar: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendar.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }

    return calendar;
  };

  // Get mood for specific date
  const getMoodForDate = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mood = moodHistory[dateKey];
    
    // Debug logging for expert calendar issues
    if (activeTab === 'mood' && day === 1) {
      console.log('🔍 Expert Calendar Debug Info:', {
        currentMonth: currentMonth,
        currentYear: currentYear,
        dateKey: dateKey,
        moodHistoryKeys: Object.keys(moodHistory).slice(0, 5),
        moodHistoryTotal: Object.keys(moodHistory).length,
        foundMood: mood
      });
    }
    
    return mood;
  };

  // Handle calendar cell press
  const handleCalendarPress = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = dailyMoodEntries[dateKey];

    // Debug expert calendar press
    console.log('📅 Expert calendar cell pressed:', {
      day: day,
      dateKey: dateKey,
      dayEntries: dayEntries,
      dailyEntriesKeys: Object.keys(dailyMoodEntries).slice(0, 5),
      totalDailyEntries: Object.keys(dailyMoodEntries).length
    });

    if (dayEntries && dayEntries.length > 0) {
      const selectedDate = new Date(dateKey);
      const isToday = dateKey === getTodayKey();
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      let entriesText = `📊 Mood check-ins for this day (${dayEntries.length}/6):\n\n`;
      dayEntries.forEach((entry, index) => {
        const scheduledInfo = entry.scheduled ? `\n   ${entry.scheduled}` : '';
        entriesText += `${index + 1}. ${entry.emoji} ${entry.label} at ${entry.time}${scheduledInfo}\n`;
      });

      if (isToday) {
        entriesText += `\n🌟 Today's progress: ${dayEntries.length}/6 check-ins completed!`;
        if (dayEntries.length < 6) {
          entriesText += `\n💪 Keep it up! ${6 - dayEntries.length} more to go.`;
        }
      }

      Alert.alert(
        `${isToday ? '🌟 Today' : '📅'} ${dayName}, ${formattedDate}`,
        entriesText,
        [
          { text: 'Close', style: 'cancel' }
        ]
      );
    } else {
      const selectedDate = new Date(dateKey);
      const isToday = dateKey === getTodayKey();
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      Alert.alert(
        `${isToday ? '🌟 Today' : '📅'} ${dayName}, ${formattedDate}`,
        `😔 No mood entries found for this date (0/6).\n\n💡 ${isToday ? 'Start tracking your mood today! We recommend 6 check-ins throughout the day.' : 'You can add mood entries for any day.'}`,
        [
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  // Load mood data on component mount and when switching tabs
  useEffect(() => {
    if (session?.user?.id) {
      loadMoodData();
    }
  }, [session?.user?.id, expertRegNo, activeTab]);

  // Set up real-time subscription for expert mood entries
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    console.log('🔄 Setting up real-time mood sync for expert');
    
    const channel = supabase
      .channel(`expert_mood_entries_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_entries',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔔 Expert mood entry changed:', payload);
          
          // Reload all mood data from Supabase
          const { data: moodData, error } = await supabase
            .from('mood_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: true });

          if (!error && moodData) {
            const history: { [key: string]: string } = {};
            const dailyEntries: { [key: string]: any[] } = {};
            const detailed: any[] = [];

            moodData.forEach((entry: any) => {
              const date = entry.entry_date;
              if (!date) {
                console.warn('⚠️ Expert real-time sync: Mood entry missing date:', entry);
                return;
              }
              
              history[date] = entry.mood_emoji;
              
              if (!dailyEntries[date]) dailyEntries[date] = [];
              dailyEntries[date].push({
                emoji: entry.mood_emoji,
                label: entry.mood_label,
                time: entry.entry_time,
                scheduled: entry.scheduled_label,
                scheduleKey: entry.schedule_key
              });

              detailed.push({
                date: entry.entry_date,
                emoji: entry.mood_emoji,
                label: entry.mood_label,
                time: entry.entry_time,
                scheduled: entry.scheduled_label,
                scheduleKey: entry.schedule_key,
                notes: entry.notes
              });
            });

            setMoodHistory(history);
            setDailyMoodEntries(dailyEntries);
            setDetailedMoodEntries(detailed);
            
            // Recheck today's progress
            const today = getTodayKey();
            const todayMoods = moodData.filter((m: any) => m.entry_date === today);
            const completedSlots = new Set(todayMoods.map((m: any) => m.schedule_key).filter(Boolean));
            setTodayMoodProgress({ completed: completedSlots.size, total: 6 });
            
            console.log('✅ Expert mood data synced from real-time update');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from expert mood sync');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Check for mood prompts every 30 minutes
  useEffect(() => {
    if (expertRegNo && session?.user?.id) {
      const interval = setInterval(async () => {
        await checkForMoodPrompt(expertRegNo);
      }, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [expertRegNo, session?.user?.id]);

  const handleFileSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          // PDF files
          'application/pdf',
          // Images - Phone, Laptop, Mac compatible
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
          'image/*',
          // Videos - Phone, Laptop, Mac compatible
          'video/mp4',
          'video/quicktime', // .mov files (Mac/iPhone)
          'video/x-msvideo', // .avi
          'video/webm',
          'video/x-matroska', // .mkv
          'video/*'
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file size (max 200MB for videos, 100MB for others)
        const isVideo = file.mimeType?.startsWith('video/');
        const maxSize = isVideo ? 200 * 1024 * 1024 : 100 * 1024 * 1024;

        if (file.size && file.size > maxSize) {
          Alert.alert(
            'File Too Large',
            `Please select a ${isVideo ? 'video' : 'file'} smaller than ${isVideo ? '200MB' : '100MB'}.`
          );
          return;
        }

        setSelectedFile(file);

        // Auto-populate title if empty
        if (!uploadForm.title.trim() && file.name) {
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          setUploadForm(prev => ({ ...prev, title: fileName }));
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleFileUpload = async () => {
    // Validate inputs
    if (!uploadForm.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!uploadForm.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadStatus('Reading file...');
      setUploadProgress(20);

      // Step 1: Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: 'base64' as any,
      });

      setUploadProgress(40);
      setUploadStatus('Converting file...');

      // Step 2: Convert base64 to bytes
      const fileBytes = toByteArray(base64Data);

      setUploadProgress(50);
      setUploadStatus('Uploading to storage...');

      // Step 3: Create unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop() || 'file';
      const storagePath = `${expertRegNo}/${timestamp}.${fileExtension}`;

      // Step 4: Upload to Supabase Storage 'resources' bucket
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(storagePath, fileBytes, {
          contentType: selectedFile.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploadProgress(70);
      setUploadStatus('Getting file URL...');

      // Step 5: Get public URL
      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get file URL');
      }

      setUploadProgress(85);
      setUploadStatus('Saving to database...');

      // Step 6: Determine category
      let category = 'DOCUMENTS';
      if (selectedFile.mimeType?.startsWith('video/')) {
        category = 'VIDEOS';
      } else if (selectedFile.mimeType?.startsWith('audio/')) {
        category = 'AUDIO';
      } else if (selectedFile.mimeType?.startsWith('image/')) {
        category = 'IMAGES';
      }

      // Step 7: Insert into library table
      const { error: dbError } = await supabase
        .from('library')
        .insert({
          resource_title: uploadForm.title,
          description: uploadForm.description,
          file_url: urlData.publicUrl,
          category: category,
          file_type: selectedFile.mimeType,
        });

      if (dbError) {
        // Clean up uploaded file
        await supabase.storage.from('resources').remove([storagePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      setUploadProgress(100);
      setUploadStatus('Complete!');

      // Success - wait briefly then show success message
      await new Promise(resolve => setTimeout(resolve, 300));

      const fileSize = selectedFile.size
        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
        : 'Unknown size';

      Alert.alert(
        'Upload Successful',
        `${uploadForm.title}\n\nFile: ${selectedFile.name}\nSize: ${fileSize}\nCategory: ${category}\n\nResource is now available in the library!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setShowUploadModal(false);
              setSelectedFile(null);
              setUploadForm({
                title: '',
                description: '',
                category: 'Academic Resources'
              });
              setUploadStatus('');
              setUploadProgress(0);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('');
      setUploadProgress(0);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error occurred';

      Alert.alert(
        'Upload Failed',
        `Could not upload file.\n\n${errorMessage}\n\nPlease check:\n• Internet connection\n• File is not corrupted\n• Storage bucket "resources" exists in Supabase`,
        [{ text: 'OK' }]
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const openUploadModal = () => {
    setSelectedFile(null);
    setUploadForm({ title: '', description: '', category: 'REMEMBERBETTER' });
    setShowUploadModal(true);
  };

  // Mood Calendar Component
  const MoodCalendar = () => {
    const calendar = generateCalendar();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Debug expert calendar state
    console.log('📅 Rendering Expert MoodCalendar:', {
      currentMonth,
      currentYear,
      calendarDays: calendar.length,
      moodHistoryEntries: Object.keys(moodHistory).length,
      dailyMoodEntries: Object.keys(dailyMoodEntries).length
    });

    // Calculate most selected emoji for current month
    const currentMonthEntries = Object.entries(dailyMoodEntries)
      .filter(([date]) => {
        const entryDate = new Date(date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .flatMap(([_, entries]) => entries);

    const emojiCounts = currentMonthEntries.reduce((counts: { [key: string]: number }, entry) => {
      counts[entry.emoji] = (counts[entry.emoji] || 0) + 1;
      return counts;
    }, {});

    const mostSelectedEmoji = Object.entries(emojiCounts).length > 0
      ? Object.entries(emojiCounts).reduce((a, b) => emojiCounts[a[0]] > emojiCounts[b[0]] ? a : b)[0]
      : '😐';

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 20, backgroundColor: Colors.backgroundLight, borderRadius: 20, margin: 10, paddingVertical: 20, borderWidth: 1, borderColor: Colors.border }}>
        {/* Most selected emoji display */}
        <View style={{ marginBottom: 20, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Text style={{ color: Colors.text, fontSize: 28, fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.50)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}>
            Expert Mood Calendar
          </Text>
          <Text style={{ color: Colors.primary, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>
            Most Selected Mood This Month: {mostSelectedEmoji}
          </Text>

          {/* Today's Progress */}
          <View style={{ marginTop: 12, backgroundColor: Colors.white, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: Colors.primary }}>
            <Text style={{ color: Colors.text, fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
              📅 Today's Progress: {todayMoodProgress.completed}/6 Check-ins
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <View
                  key={num}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: todayMoodProgress.completed >= num ? Colors.primary : Colors.backgroundLight,
                    marginHorizontal: 2,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {todayMoodProgress.completed >= num && (
                    <Text style={{ color: Colors.white, fontSize: 12 }}>✓</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Month Navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, backgroundColor: Colors.white, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: Colors.border, width: '90%', maxWidth: 350, alignSelf: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.accent, borderRadius: 15, marginHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: Colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.accent, borderRadius: 15, marginHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: Colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 350 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 }}>
            {calendar.map((day, index) => {
              const dateKey = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayEntries = dateKey ? dailyMoodEntries[dateKey] : null;
              const entryCount = dayEntries ? dayEntries.length : 0;
              const isToday = dateKey === getTodayKey();

              return (
                <TouchableOpacity
                  key={index}
                  style={{
                    width: 45,
                    height: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: 3,
                    backgroundColor: isToday ? Colors.accent + '30' : Colors.white,
                    borderRadius: 12,
                    shadowColor: Colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                    borderWidth: isToday ? 2 : 1,
                    borderColor: isToday ? Colors.primary : Colors.border
                  }}
                  onPress={() => day && handleCalendarPress(day)}
                  disabled={!day}
                >
                  {day && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {getMoodForDate(day) && (
                        <Text style={{ fontSize: 18, marginBottom: 2, textAlign: 'center' }}>{getMoodForDate(day)}</Text>
                      )}
                      <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{day}</Text>
                      {entryCount > 0 && (
                        <View style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          backgroundColor: entryCount >= 6 ? '#4caf50' : Colors.primary,
                          borderRadius: 8,
                          minWidth: 16,
                          height: 16,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>{entryCount}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Community functions
  const pickMedia = async () => {
    try {
      const result = await pickMediaFromGallery();
      if (result) {
        setSelectedMedia(result);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const createPost = async () => {
    if (!postText.trim() && !selectedMedia) {
      Alert.alert('Error', 'Please add some text or media to your post.');
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrl = null;

      if (selectedMedia) {
        try {
          mediaUrl = await uploadMediaToSupabase(selectedMedia.uri, selectedMedia.type);
        } catch (mediaError) {
          Alert.alert('Error', `Failed to upload media: ${mediaError instanceof Error ? mediaError.message : 'Unknown error'}`);
          return;
        }
      }

      const { data, error } = await supabase
        .from('community_post')
        .insert([
          {
            user_id: expertRegNo || profile?.registration_number || 'expert',
            content: postText.trim(),
            media_url: mediaUrl,
            media_type: selectedMedia?.type || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'Post created successfully!');
      setModalVisible(false);
      setPostText('');
      setSelectedMedia(null);
      fetchPosts();

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const { data, error } = await supabase
        .from('community_post')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
          Alert.alert('Network Error', 'Unable to load posts. Please check your internet connection.');
        } else {
          Alert.alert('Error', 'Failed to load posts');
        }
        return;
      }

      const postsWithUserData = await Promise.all(
        (data || []).map(async (post) => {
          try {
            let username = `User ${post.user_id}`;
            let userLabel = 'USER';

            // Check if it's admin
            if (post.user_id === 'admin' || String(post.user_id).toLowerCase().includes('admin')) {
              username = 'Admin';
              userLabel = 'ADMIN';
            } else {
              // Try to find user in profiles/user_requests table
              const { data: userData } = await supabase
                .from('profiles')
                .select('name, type, registration_number')
                .eq('registration_number', post.user_id)
                .single();

              if (userData) {
                username = userData.name || `User ${post.user_id}`;
                // Determine user type label
                if (userData.type === 'EXPERT') {
                  userLabel = 'EXPERT';
                } else if (userData.type === 'PEER') {
                  userLabel = 'PEER LISTENER';
                } else {
                  userLabel = `USER (${post.user_id})`;
                }
              } else {
                userLabel = `USER (${post.user_id})`;
              }
            }

            return {
              ...post,
              username,
              userLabel,
              profilePicIndex: Math.floor(Math.random() * profilePics.length)
            };
          } catch (error) {
            return {
              ...post,
              username: `User ${post.user_id}`,
              userLabel: `USER (${post.user_id})`,
              profilePicIndex: 0
            };
          }
        })
      );

      setPosts(postsWithUserData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const deletePost = async (post: any) => {
    // Only allow deleting own posts
    if (post.user_id !== expertRegNo && post.user_id !== profile?.registration_number) {
      Alert.alert('Error', 'You can only delete your own posts');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('community_post')
                .delete()
                .eq('id', post.id);

              if (error) throw error;

              Alert.alert('Success', 'Post deleted successfully');
              fetchPosts();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  // Comment functions
  const openComments = async (post: any) => {
    setSelectedPostForComments(post);
    setCommentsModalVisible(true);
    await fetchComments(post.id);
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comment')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user data for each comment
      const commentsWithUserData = await Promise.all(
        (data || []).map(async (comment) => {
          try {
            let username = 'Unknown User';
            let userLabel = 'USER';

            if (comment.user_id === 'admin') {
              username = 'Admin';
              userLabel = 'ADMIN';
            } else {
              // Try to get user data from profiles table
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username, name, type, registration_number')
                .eq('registration_number', comment.user_id)
                .single();

              if (profileData) {
                username = profileData.username || profileData.name || `User ${comment.user_id}`;

                if (profileData.type === 'EXPERT') {
                  userLabel = 'EXPERT';
                } else if (profileData.type === 'PEER') {
                  userLabel = 'PEER LISTENER';
                } else {
                  userLabel = profileData.registration_number ? `USER (${profileData.registration_number})` : 'USER';
                }
              }
            }

            return {
              ...comment,
              username,
              userLabel
            };
          } catch (userError) {
            console.log('Error fetching user data for comment:', comment.id);
            return {
              ...comment,
              username: `User ${comment.user_id}`,
              userLabel: 'USER'
            };
          }
        })
      );

      setComments(commentsWithUserData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedPostForComments) return;

    try {
      const { error } = await supabase
        .from('post_comment')
        .insert({
          post_id: selectedPostForComments.id,
          user_id: profile?.registration_number || expertRegNo,
          content: newComment.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedPostForComments.id);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const deleteComment = async (commentId: string, comment: any) => {
    // Only allow deleting own comments
    if (comment.user_id !== expertRegNo && comment.user_id !== profile?.registration_number) {
      Alert.alert('Error', 'You can only delete your own comments');
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('post_comment')
                .delete()
                .eq('id', commentId);

              if (error) throw error;

              if (selectedPostForComments) {
                await fetchComments(selectedPostForComments.id);
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  // Fetch posts when community tab is active
  useEffect(() => {
    if (activeTab === 'community') {
      fetchPosts();
    }
  }, [activeTab]);

  // Refresh mood data when mood tab becomes active
  useEffect(() => {
    console.log('Tab switching effect: activeTab =', activeTab);
    if (activeTab === 'mood') {
      console.log('Mood tab activated, refreshing mood data...');
      loadMoodData();
    }
  }, [activeTab]);

  let Content: React.ReactNode = null;

  if (activeTab === 'home') {
    Content = (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 60, alignItems: 'center', width: '100%' }}>
        {/* Animated Bubbles Background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
          {bubbleConfigs.map((cfg, i) => {
            const translateY = bubbleAnimations[i].interpolate({
              inputRange: [0, 1],
              outputRange: [screenHeight + cfg.size, -cfg.size],
            });
            const scale = bubbleAnimations[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1.1],
            });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: `${cfg.left}%`,
                  width: cfg.size,
                  height: cfg.size,
                  borderRadius: cfg.size / 2,
                  backgroundColor: cfg.color,
                  opacity: cfg.opacity,
                  transform: [{ translateY }, { scale }],
                }}
              />
            );
          })}
        </View>

        {/* Top Right Actions - Notification Bell */}
        <View style={{ position: 'absolute', top: 42, right: 20, zIndex: 20, flexDirection: 'row', gap: 12 }}>
          {/* Mood Progress Indicator */}
          <TouchableOpacity
            style={{
              height: 40,
              borderRadius: 22,
              backgroundColor: Colors.white,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 8,
              shadowColor: Colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.22,
              shadowRadius: 5,
              borderWidth: 2,
              borderColor: Colors.primary,
              paddingHorizontal: 12,
              flexDirection: 'row'
            }}
            onPress={() => {
              Alert.alert(
                '📊 Today\'s Mood Tracking',
                `You've completed ${todayMoodProgress.completed} out of 6 mood check-ins today.\n\n${todayMoodProgress.completed === 6 ? '🎉 Amazing! You\'ve completed all check-ins!' : `Keep going! ${6 - todayMoodProgress.completed} more to go.`}\n\nScheduled times:\n• 8:00 AM - Morning Check-in\n• 11:00 AM - Late Morning\n• 2:00 PM - Afternoon\n• 5:00 PM - Evening\n• 8:00 PM - Night\n• 11:00 PM - Before Sleep`,
                [
                  { text: 'Close', style: 'cancel' },
                  ...(todayMoodProgress.completed < 6 ? [{ text: '✏️ Add Mood Now', onPress: () => setMoodModalVisible(true) }] : [])
                ]
              );
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 4 }}>😊</Text>
            <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold' }}>
              {todayMoodProgress.completed}/6
            </Text>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 22,
              backgroundColor: Colors.white,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 8,
              shadowColor: Colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.22,
              shadowRadius: 5,
              borderWidth: 2,
              borderColor: Colors.primary
            }}
            onPress={() => setShowNotificationModal(true)}
          >
            <Ionicons name="notifications" size={20} color={Colors.primary} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ff4444',
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: Colors.white,
              }}>
                <Text style={{
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 8 }}>
              Welcome, {profile?.name}
            </Text>
            <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center' }}>
              Expert Dashboard
            </Text>
          </View>

          {/* Quick Actions - 2x2 Button Matrix */}
          <View style={styles.buttonMatrix}>
            {/* First Row */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() => router.push('./expert-client')}
              >
                <Text style={styles.buttonIcon}>👥</Text>
                <Text style={styles.matrixButtonText}>My Clients</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() => router.push(`./consultation`)}
              >
                <Image source={require('../../assets/images/message.png')} style={{ width: 48, height: 48, marginBottom: 8 }} />
                <Text style={styles.matrixButtonText}>Consultations</Text>
              </TouchableOpacity>
            </View>

            {/* Second Row */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={openUploadModal}
              >
                <Text style={styles.buttonIcon}>📁</Text>
                <Text style={styles.matrixButtonText}>Upload Resources</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() => router.push("/expert/schedule")}
              >
                <Text style={styles.buttonIcon}>📅</Text>
                <Text style={styles.matrixButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>

            {/* Third Row */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() => { router.push(`/expert/support`) }}
              >
                <Text style={styles.buttonIcon}>📚</Text>
                <Text style={styles.matrixButtonText}>Support Shelf</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() =>setShowToolkitPage(true)}
              >
                <Text style={styles.buttonIcon}>🛠️</Text>
                <Text style={styles.matrixButtonText}>Self Help Toolkit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Expert Info Card */}
          <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginTop: 20, marginBottom: 30, borderWidth: 1, borderColor: Colors.border, elevation: 3, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3.84 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.primary, marginBottom: 15, textAlign: 'center' }}>Expert Information</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Registration ID:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>{profile?.registration_number}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Specialization:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>Wellbeing expert</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Role:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>Wellbeing Expert</Text>
            </View>
          </View>

          {/* Mood Tracking Status Card */}
          <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginTop: 10, marginBottom: 30, borderWidth: 1, borderColor: Colors.border, elevation: 3, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3.84 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.primary, marginBottom: 15, textAlign: 'center' }}>🌟 Daily Mood Tracking</Text>
            <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 10 }}>
              Track your mood 6 times daily for better mental health insights
            </Text>
            {nextMoodPrompt && (
              <Text style={{ fontSize: 14, color: Colors.primary, textAlign: 'center', marginBottom: 15, fontWeight: 'bold' }}>
                Next prompt: {nextMoodPrompt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            )}
            {/* Manual add removed for automatic mood checks */}
          </View>
        </ScrollView>
      </View>
    );

  } else if (activeTab === 'mood') {
    Content = (
      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <MoodCalendar />
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      {Content}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📁 Upload Learning Resource</Text>
              <TouchableOpacity
                onPress={() => setShowUploadModal(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.3}
                delayPressIn={0}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Resource Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter resource title..."
                  value={uploadForm.title}
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, title: text }))}
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Describe the learning resource..."
                  value={uploadForm.description}
                  onChangeText={(text) => setUploadForm(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.categorySelector}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        uploadForm.category === category && styles.selectedCategoryOption
                      ]}
                      onPress={() => setUploadForm(prev => ({ ...prev, category }))}
                      activeOpacity={0.3}
                      delayPressIn={0}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        uploadForm.category === category && styles.selectedCategoryOptionText
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fileUploadSection}>
                <Text style={styles.formLabel}>File Upload *</Text>
                {selectedFile ? (
                  <View style={styles.selectedFileContainer}>
                    <View style={styles.selectedFileInfo}>
                      <Text style={styles.selectedFileIcon}>📄</Text>
                      <View style={styles.selectedFileDetails}>
                        <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                        <Text style={styles.selectedFileSize}>
                          {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.changeFileButton}
                      onPress={handleFileSelection}
                      activeOpacity={0.3}
                      delayPressIn={0}
                    >
                      <Text style={styles.changeFileButtonText}>Change File</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.fileUploadButton}
                    onPress={handleFileSelection}
                    activeOpacity={0.3}
                    delayPressIn={0}
                  >
                    <Text style={styles.fileUploadIcon}>📄</Text>
                    <Text style={styles.fileUploadText}>Select File (Photos, Videos, PDFs)</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.fileUploadHint}>
                  Supported: Photos (JPG, PNG, HEIC), Videos (MP4, MOV), PDFs • Max: 100MB (200MB for videos)
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowUploadModal(false)}
                activeOpacity={0.3}
                delayPressIn={0}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalUploadButton, uploadLoading && styles.modalUploadButtonDisabled]}
                onPress={handleFileUpload}
                disabled={uploadLoading || !selectedFile || !uploadForm.title.trim() || !uploadForm.description.trim()}
                activeOpacity={0.3}
                delayPressIn={0}
              >
                {uploadLoading ? (
                  <View style={styles.uploadLoadingContainer}>
                    <Animated.View
                      style={[
                        styles.spinnerContainer,
                        {
                          transform: [
                            {
                              rotate: spinAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            },
                            { scale: pulseAnim },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.spinnerIcon}>🚀</Text>
                    </Animated.View>
                    <View style={styles.uploadProgressInfo}>
                      <Text style={styles.uploadStatusText}>{uploadStatus}</Text>
                      <View style={styles.progressBarContainer}>
                        <Animated.View
                          style={[
                            styles.progressBarFill,
                            {
                              width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.uploadPercentText}>{uploadProgress}%</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.modalUploadButtonText}>🚀 Upload Resource</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mood Modal */}
         <Modal visible={moodModalVisible} animationType="slide" transparent={true} onRequestClose={() => setMoodModalVisible(false)}>
        <TouchableOpacity 
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryOverlay }}
          activeOpacity={1}
          onPress={() => setMoodModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 30, alignItems: 'center', width: 360, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.accent }}
          >
            <Text style={{ fontSize: 28, marginBottom: 10, color: Colors.text, fontWeight: 'bold', textAlign: 'center' }}>🌟 Expert Mood Check-In</Text>

            {/* Progress Indicator */}
            {currentPromptInfo && (
              <View style={{ width: '100%', marginBottom: 15 }}>
                <Text style={{ fontSize: 14, color: Colors.primary, textAlign: 'center', fontWeight: 'bold', marginBottom: 8 }}>
                  {currentPromptInfo.timeLabel}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5 }}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <View
                      key={num}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: todayMoodProgress.completed >= num ? Colors.primary : Colors.backgroundLight,
                        marginHorizontal: 3,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: currentPromptInfo.scheduleKey === num.toString() ? Colors.accent : 'transparent'
                      }}
                    >
                      <Text style={{ color: todayMoodProgress.completed >= num ? Colors.white : Colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>
                        {num}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: 'center' }}>
                  Check-in {todayMoodProgress.completed + 1} of 6 today
                </Text>
                {missedPromptsQueue.length > 1 && (
                  <Text style={{ fontSize: 11, color: '#ff9800', textAlign: 'center', marginTop: 5 }}>
                    ⏰ {missedPromptsQueue.length} pending check-ins
                  </Text>
                )}
              </View>
            )}

            <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 15 }}>
              Hi {profile?.name}! How are you feeling right now?
            </Text>
            <Text style={{ fontSize: 14, color: Colors.primary, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' }}>
              Please select one emoji to continue
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {MOOD_EMOJIS.map((mood) => (
                <TouchableOpacity
                  key={mood.emoji}
                  style={{ padding: 15, margin: 8, borderRadius: 15, backgroundColor: selectedMood === mood.emoji ? Colors.primary : Colors.white, borderWidth: 2, borderColor: selectedMood === mood.emoji ? Colors.white : Colors.primary, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }}
                  onPress={() => {
                    setSelectedMood(mood.emoji);
                    // Auto-save when emoji is selected
                    setTimeout(() => {
                      saveMood(mood.emoji);
                    }, 300);
                  }}
                >
                  <Text style={{ fontSize: 40 }}>{mood.emoji}</Text>
                  <Text style={{ fontSize: 12, textAlign: 'center', marginTop: 5, color: selectedMood === mood.emoji ? Colors.white : Colors.primary, fontWeight: selectedMood === mood.emoji ? 'bold' : 'normal' }}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAvoidingView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔔 Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Notification Actions */}
              <View style={{ marginBottom: 20 }}>
                {/* <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>

                  {unreadCount > 0 && (
                    <TouchableOpacity
                      style={[styles.notificationActionButton, { backgroundColor: Colors.backgroundLight }]}
                      onPress={markNotificationAsRead}
                    >
                      <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
                      <Text style={[styles.notificationActionText, { color: Colors.primary }]}>Mark All Read</Text>
                    </TouchableOpacity>
                  )}
                </View> */}

                {/* Send Notification Form */}
                <View style={styles.notificationForm}>
                  <Text style={styles.formLabel}>Send Notification</Text>

                  <TextInput
                    style={styles.formInput}
                    placeholder="Notification title..."
                    value={notificationForm.title}
                    onChangeText={(text) => setNotificationForm(prev => ({ ...prev, title: text }))}
                    maxLength={100}
                  />

                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    placeholder="Notification message..."
                    value={notificationForm.message}
                    onChangeText={(text) => setNotificationForm(prev => ({ ...prev, message: text }))}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Send To</Text>
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={styles.picker}
                          onPress={() => {
                            Alert.alert(
                              'Select Recipients',
                              'Who should receive this notification?',
                              [
                                { text: 'All Users', onPress: () => setNotificationForm(prev => ({ ...prev, receiver_type: 'ALL' })) },
                                { text: 'Students Only', onPress: () => setNotificationForm(prev => ({ ...prev, receiver_type: 'STUDENTS' })) },
                                { text: 'Experts Only', onPress: () => setNotificationForm(prev => ({ ...prev, receiver_type: 'EXPERTS' })) },
                                { text: 'Peers Only', onPress: () => setNotificationForm(prev => ({ ...prev, receiver_type: 'PEERS' })) },
                                { text: 'Cancel', style: 'cancel' }
                              ]
                            );

                          }}
                        >
                          <Text style={styles.pickerText}>
                            {notificationForm.receiver_type === 'ALL' ? 'All Users' :
                              notificationForm.receiver_type === 'STUDENTS' ? 'Students' :
                                notificationForm.receiver_type === 'EXPERTS' ? 'Experts' :
                                  notificationForm.receiver_type === 'PEERS' ? 'Peers' : 'Select...'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Priority</Text>
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={styles.picker}
                          onPress={() => {
                            Alert.alert(
                              'Select Priority',
                              'Choose notification priority level',
                              [
                                { text: 'Low', onPress: () => setNotificationForm(prev => ({ ...prev, priority: 'low' })) },
                                { text: 'Medium', onPress: () => setNotificationForm(prev => ({ ...prev, priority: 'medium' })) },
                                { text: 'High', onPress: () => setNotificationForm(prev => ({ ...prev, priority: 'high' })) },
                                { text: 'Cancel', style: 'cancel' }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.pickerText}>
                            {notificationForm.priority.charAt(0).toUpperCase() + notificationForm.priority.slice(1)}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.sendNotificationButton, sendingNotification && styles.sendNotificationButtonDisabled]}
                    onPress={sendNotification}
                    disabled={sendingNotification}
                  >
                    {sendingNotification ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color={Colors.white} />
                        <Text style={styles.sendNotificationButtonText}>Send Notification</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications List */}
              <View>
                <Text style={styles.notificationsListTitle}>
                  Recent Notifications ({notifications.length})
                </Text>

                {notifications.length === 0 ? (
                  <View style={styles.emptyNotifications}>
                    <Ionicons name="notifications-off-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.is_read && styles.notificationItemUnread
                      ]}
                      onPress={() => !notification.is_read && markNotificationAsRead(notification.id)}
                    >
                      <View style={styles.notificationHeader}>
                        <View style={styles.notificationMeta}>
                          <Text style={styles.notificationSender}>
                            {notification.sender_name} ({notification.sender_type})
                          </Text>
                          <Text style={styles.notificationTime}>
                            {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {!notification.is_read && (
                          <View style={styles.unreadIndicator} />
                        )}
                      </View>

                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>

                      <View style={styles.notificationFooter}>
                        <View style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              notification.priority === 'high' ? '#ff4444' :
                                notification.priority === 'medium' ? '#ff8800' :
                                  notification.priority === 'low' ? '#4CAF50' : '#666666'
                          }
                        ]}>
                          <Text style={styles.priorityBadgeText}>
                            {notification.priority.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.notificationType}>
                          {notification.notification_type}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Community Tab Content */}
      {activeTab === 'community' && (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 50,
            paddingBottom: 15,
            backgroundColor: Colors.primary,
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.white }}>Community</Text>
            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{
                backgroundColor: Colors.surface,
                margin: 10,
                borderRadius: 15,
                padding: 15,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <Image
                    source={profilePics[item.profilePicIndex || 0]}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 10,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.text }}>
                      {item.username}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>
                      {item.userLabel}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                  {(item.user_id === expertRegNo || item.user_id === profile?.registration_number) && (
                    <TouchableOpacity
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: Colors.error,
                      }}
                      onPress={() => deletePost(item)}
                    >
                      <Ionicons name="trash" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                </View>

                {item.content && (
                  <Text style={{
                    fontSize: 16,
                    color: Colors.text,
                    marginBottom: 10,
                    lineHeight: 22,
                  }}>
                    {item.content}
                  </Text>
                )}

                {item.media_url && (
                  <View style={{ marginBottom: 10 }}>
                    {item.media_type === 'image' ? (
                      <Image
                        source={{ uri: item.media_url }}
                        style={{
                          width: '100%',
                          height: 200,
                          borderRadius: 10,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: '#000',
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons name="videocam" size={48} color={Colors.white} />
                        <Text style={{ color: Colors.white, marginTop: 10, fontSize: 14 }}>Video</Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 8,
                    backgroundColor: '#111',
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                    marginTop: 5
                  }}
                  onPress={() => openComments(item)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#FFB347" />
                  <Text style={{ marginLeft: 5, color: '#FFB347', fontSize: 14, fontWeight: '600' }}>
                    Comments
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              loadingPosts ? (
                <View style={{ alignItems: 'center', padding: 50 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>Loading posts...</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', padding: 50 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>No posts yet. Be the first to share!</Text>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          {/* Create Post Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}>
              <View style={{
                backgroundColor: Colors.surface,
                borderRadius: 20,
                padding: 20,
                width: '90%',
                maxHeight: '80%',
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: Colors.primary,
                  marginBottom: 20,
                  textAlign: 'center',
                }}>
                  Create New Post
                </Text>

                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 10,
                    padding: 15,
                    fontSize: 16,
                    color: Colors.text,
                    minHeight: 100,
                    textAlignVertical: 'top',
                    marginBottom: 20,
                    backgroundColor: Colors.background,
                  }}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  value={postText}
                  onChangeText={setPostText}
                />

                {selectedMedia && (
                  <View style={{
                    marginBottom: 20,
                    padding: 10,
                    backgroundColor: Colors.background,
                    borderRadius: 10,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: Colors.text, fontSize: 14, marginBottom: 10 }}>
                      Selected {selectedMedia.type}:
                    </Text>
                    <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                      {selectedMedia.uri.split('/').pop()}
                    </Text>
                    <TouchableOpacity
                      style={{ marginTop: 10, padding: 5 }}
                      onPress={() => setSelectedMedia(null)}
                    >
                      <Ionicons name="close" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    padding: 15,
                    backgroundColor: Colors.background,
                    borderRadius: 15,
                    marginBottom: 20,
                  }}
                  onPress={pickMedia}
                >
                  <Ionicons name="images" size={24} color={Colors.primary} />
                  <Text style={{ color: Colors.text, marginTop: 5 }}>Add Photo/Video</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: Colors.border,
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setModalVisible(false);
                      setPostText('');
                      setSelectedMedia(null);
                    }}
                  >
                    <Text style={{ color: Colors.text, fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isPosting ? Colors.border : Colors.primary,
                      padding: 15,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={createPost}
                    disabled={isPosting}
                  >
                    <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                      {isPosting ? 'Posting...' : 'Post'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Comments Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={commentsModalVisible}
            onRequestClose={() => setCommentsModalVisible(false)}
          >
            <View style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}>
              <View style={{
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                maxHeight: '80%',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primary }}>Comments</Text>
                  <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                    <Ionicons name="close" size={28} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 400, marginBottom: 15 }}>
                  {comments.length === 0 ? (
                    <Text style={{ color: Colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No comments yet</Text>
                  ) : (
                    comments.map((comment) => (
                      <View key={comment.id} style={{
                        backgroundColor: Colors.background,
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 10
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: Colors.text, fontWeight: 'bold', fontSize: 14 }}>{comment.username}</Text>
                            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '600' }}>{comment.userLabel}</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>{formatRelativeTime(comment.created_at)}</Text>
                          </View>
                          {(comment.user_id === expertRegNo || comment.user_id === profile?.registration_number) && (
                            <TouchableOpacity
                              onPress={() => deleteComment(comment.id, comment)}
                              style={{ padding: 5 }}
                            >
                              <Ionicons name="trash" size={16} color={Colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={{ color: Colors.text, marginTop: 8, lineHeight: 20 }}>{comment.content}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, padding: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      color: Colors.text,
                      padding: 10,
                      fontSize: 14
                    }}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={addComment}
                    disabled={!newComment.trim()}
                    style={{
                      backgroundColor: newComment.trim() ? Colors.primary : Colors.border,
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                      borderRadius: 8,
                      marginLeft: 8
                    }}
                  >
                    <Ionicons name="send" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* Bottom Tab Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: Colors.white, paddingVertical: 15, borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 6, borderTopWidth: 3, borderTopColor: Colors.primary }}>
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          onPress={() => setActiveTab('home')}
        >
          <Image
            source={require('../../assets/images/home.png')}
            style={{
              width: 43,
              height: 43,
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
          onPress={() => setActiveTab('mood')}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 40, borderRadius: 20, backgroundColor: 'transparent' }}>
            <Image source={require('../../assets/images/mood calender.png')} style={{ width: 48, height: 45 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
          onPress={() => setActiveTab('community')}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 40, borderRadius: 20, backgroundColor: 'transparent' }}>
            <Ionicons name="people" size={36} color={activeTab === 'community' ? Colors.primary : Colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
          onPress={() => router.push('./expert-setting')}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 40, borderRadius: 20, backgroundColor: 'transparent' }}>
            <Image
              source={require('../../assets/images/setting.png')}
              style={{
                width: 43,
                height: 43,
              }}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Toolkit Page Modal */}
      <Modal visible={showToolkitPage} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: Colors.background, borderRadius: 25, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, width: '90%', maxWidth: 400, maxHeight: '80%', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.primary }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20, backgroundColor: Colors.white, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: Colors.border }}>
              <TouchableOpacity
                onPress={() => setShowToolkitPage(false)}
                style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.white, borderRadius: 15, marginRight: 15, borderWidth: 2, borderColor: Colors.primary, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }}
              >
                <Text style={{ color: Colors.primary, fontSize: 15, fontWeight: 'bold' }}>← Back</Text>
              </TouchableOpacity>
              <Text style={{ color: Colors.text, fontSize: 15, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 60 }}>Self-help Toolkit</Text>
            </View>

            <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }}>
              {/* 2x3 Grid Layout for Toolkit */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 5 }}>
                <TouchableOpacity
                  style={{ width: '45%', height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 5, marginVertical: 6, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }}
                  onPress={() => {
                    setSelectedToolkitItem({
                      name: 'Grounding Exercises',
                      description: 'Grounding exercises help you stay present and connected to the current moment. These techniques can reduce anxiety and help you feel more centered.',
                      route: `/expert/toolkit/toolkit-grounding?registration=${studentRegNo}`
                    });
                    setShowToolkitPopup(true);
                  }}
                >
                  <Image source={require('@/assets/images/grounding.png')} style={{ width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Grounding Exercises</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: '45%', height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 5, marginVertical: 6, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }}
                  onPress={() => {
                    setSelectedToolkitItem({
                      name: 'Breathing Exercises',
                      description: 'Breathing exercises help calm your mind and body. Practice deep, mindful breathing to reduce stress and improve focus.',
                      route: `/expert/toolkit/toolkit-breathing?registration=${studentRegNo}`
                    });
                    setShowToolkitPopup(true);
                  }}
                >
                  <Image source={require('@/assets/images/breathing.png')} style={{ width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Breathing Exercises</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 5 }}>
                <TouchableOpacity
                  style={{ width: '45%', height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 5, marginVertical: 6, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }}
                  onPress={() => {
                    setSelectedToolkitItem({
                      name: 'Color Mandala',
                      description: 'Coloring mandalas is a meditative practice that helps reduce stress and promotes mindfulness through creative expression.',
                      route: `/expert/toolkit/mandala-editor?registration=${studentRegNo}`
                    });
                    setShowToolkitPopup(true);
                  }}
                >
                  <Image source={require('@/assets/images/mandala.png')} style={{ width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Color Mandala </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: '45%', height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 5, marginVertical: 6, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }}
                  onPress={() => {
                    setSelectedToolkitItem({
                      name: 'Movement Exercise',
                      description: 'Movement exercises combine physical activity with mindfulness to help release tension and improve your mental well-being.',
                      route: `/expert/toolkit/toolkit-movement?registration=${studentRegNo}`
                    });
                    setShowToolkitPopup(true);
                  }}
                >
                  <Image source={require('@/assets/images/movement.png')} style={{ width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Movement Exercise</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 5 }}>
                <TouchableOpacity
                  style={{ width: '45%', height: 100, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 5, marginVertical: 6, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }}
                  onPress={() => {
                    setSelectedToolkitItem({
                      name: 'Focus & Concentration',
                      description: 'Focus exercises help improve your concentration and mental clarity. Practice techniques to enhance attention and productivity.',
                      route: `/expert/toolkit/toolkit-focus?registration=${studentRegNo}`
                    });
                    setShowToolkitPopup(true);
                  }}
                >
                  <Image source={require('@/assets/images/focus.png')} style={{ width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Focus & Concentration</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toolkit Information Popup */}
      <Modal visible={showToolkitPopup} animationType="fade" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: 25, width: '85%', maxWidth: 400, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.primary }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: 10 }}>
                {selectedToolkitItem?.name}
              </Text>
              <View style={{ height: 2, width: 60, backgroundColor: Colors.primary, borderRadius: 1 }} />
            </View>

            {/* Description */}
            <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 25 }}>
              {selectedToolkitItem?.description}
            </Text>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: Colors.backgroundLight, borderRadius: 15, paddingVertical: 12, marginRight: 10, borderWidth: 1, borderColor: Colors.border }}
                onPress={() => {
                  setShowToolkitPopup(false);
                  setSelectedToolkitItem(null);
                }}
              >
                <Text style={{ color: Colors.textSecondary, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: Colors.primary, borderRadius: 15, paddingVertical: 12, marginLeft: 10 }}
                onPress={() => {
                  setShowToolkitPopup(false);
                  if (selectedToolkitItem) {
                    router.push(selectedToolkitItem.route as any);
                  }
                  setSelectedToolkitItem(null);
                }}
              >
                <Text style={{ color: Colors.white, fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Start Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#a8e6cf',
    textAlign: 'center',
    marginBottom: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionCard: {
    width: '48%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
    textAlign: 'center'
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 50,
  },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  profileRole: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  profileId: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  settingText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.error,
    marginTop: 30,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 25,
    paddingBottom: 25,
    elevation: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    backgroundColor: 'transparent',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    color: Colors.secondaryLight,
  },
  activeTabIcon: {
    color: Colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.secondaryLight,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 10,
    marginVertical: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 5,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sessionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  sessionStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginLeft: 10,
  },
  sessionStatusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    marginVertical: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    minWidth: 100,
  },
  sessionValue: {
    fontSize: 14,
    color: Colors.primary,
    flex: 1,
    marginLeft: 10,
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundLight,
  },
  sessionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  sessionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Upload Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    elevation: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.backgroundLight,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedCategoryOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectedCategoryOptionText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  fileUploadSection: {
    marginBottom: 20,
  },
  fileUploadButton: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  fileUploadIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  fileUploadText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  fileUploadHint: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelButton: {
    backgroundColor: Colors.textSecondary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 0.4,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalUploadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 0.55,
    alignItems: 'center',
  },
  modalUploadButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  modalUploadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadLoadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 8,
  },
  spinnerContainer: {
    marginBottom: 8,
  },
  spinnerIcon: {
    fontSize: 32,
  },
  uploadProgressInfo: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  uploadStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '90%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  uploadPercentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedFileContainer: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedFileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedFileDetails: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedFileSize: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  changeFileButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  changeFileButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // 2x2 Button Matrix Styles
  buttonMatrix: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  matrixButton: {
    width: '48%',
    height: 120,
    backgroundColor: Colors.white,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  matrixButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Notification Modal Styles
  notificationActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  notificationActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationForm: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: {
    fontSize: 14,
    color: Colors.text,
  },
  sendNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  sendNotificationButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  sendNotificationButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  notificationsListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  notificationItem: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.border,
  },
  notificationItemUnread: {
    backgroundColor: Colors.white,
    borderLeftColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationMeta: {
    flex: 1,
  },
  notificationSender: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationType: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
