/*
 * Student Home - Database-First Mood Tracking
 * 
 * Updated to use Supabase database as primary storage for all mood data.
 * AsyncStorage is now only used for minimal offline backup and user preferences.
 * 
 * Key Changes:
 * - Mood data loaded directly from database on initialization
 * - Mood scheduling system uses database to check completed slots
 * - Export function fetches fresh data from database
 * - Real-time sync updates UI when mood data changes
 * - Minimal AsyncStorage backup for offline scenarios only
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/api/Profile';
import { useAuth } from '@/providers/AuthProvider';
import PeerScreen from './peer-screen';
import { Notification } from '@/types/Notification';
import { setupNotificationListeners, removeNotificationListeners, sendLocalNotification } from '@/lib/notificationService';
import * as Notifications from 'expo-notifications';

const profilePics = [
  require('@/assets/images/profile/pic1.png'),
  require('@/assets/images/profile/pic2.png'),
  require('@/assets/images/profile/pic3.png'),
  require('@/assets/images/profile/pic4.png'),
  require('@/assets/images/profile/pic5.png'),
  require('@/assets/images/profile/pic6.png'),
  require('@/assets/images/profile/pic7.png'),
  require('@/assets/images/profile/pic8.png'),
  require('@/assets/images/profile/pic9.png'),
  require('@/assets/images/profile/pic10.png'),
  require('@/assets/images/profile/pic11.png'),
  require('@/assets/images/profile/pic12.png'),
  require('@/assets/images/profile/pic13.png'),
];

// Base tabs for all users
const BASE_TABS = [
  { key: 'home', icon: '🏠' },
  { key: 'mood', icon: '😊' },
  { key: 'sos', icon: '0️⃣' },
  { key: 'setting', icon: '⚙️' },
];

// Peer tab (only for peer listeners)
const PEER_TAB = { key: 'peer', icon: '👥' };

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

// Helper to get greeting based on current time
function getGreeting(userName?: string) {
  const now = new Date();
  let hour = now.getHours(); // 0-23
  let greeting = '';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good evening';
  else greeting = 'Good night';

  return userName ? `${greeting}, ${userName}!` : greeting;
}

export default function StudentHome() {
  const params = useLocalSearchParams<{ registration: string }>();
  const studentRegNo = params.registration;
  const [activeTab, setActiveTab] = useState('home');
  const [input, setInput] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<{ [key: string]: string }>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [showToolkitPage, setShowToolkitPage] = useState(false);
  const [showToolkitPopup, setShowToolkitPopup] = useState(false);
  const [selectedToolkitItem, setSelectedToolkitItem] = useState<{ name: string, description: string, route: string } | null>(null);
  const [dailyMoodEntries, setDailyMoodEntries] = useState<{ [key: string]: { emoji: string, label: string, time: string, scheduled?: string, scheduleKey?: string }[] }>({});
  const [detailedMoodEntries, setDetailedMoodEntries] = useState<{ date: string, emoji: string, label: string, time: string, scheduled?: string, scheduleKey?: string, notes?: string }[]>([]);
  const [todayMoodProgress, setTodayMoodProgress] = useState<{ completed: number, total: number }>({ completed: 0, total: 6 });

  const {session } = useAuth();
  const {data:profile } = useProfile(session?.user.id);

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

  const startBubbleLoop = useCallback((index: number) => {
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

  // Initialize mood calendar data immediately on mount - Database first approach
  useEffect(() => {
    const initializeMoodData = async () => {
      try {
        // Use session user ID to load mood data from database
        const userId = session?.user?.id;
        if (!userId) {
          console.log('⏳ Waiting for user session to initialize mood data from database...');
          return;
        }

        console.log('🎯 Initializing mood calendar from database for user:', userId);
        
        // Load mood data directly from Supabase (primary source)
        const { data: moodData, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: true });

        if (error) {
          console.error('❌ Error loading mood data from database during initialization:', error);
          // Set empty state if database fails
          setMoodHistory({});
          setDailyMoodEntries({});
          setDetailedMoodEntries([]);
          return;
        }

        if (moodData && moodData.length > 0) {
          // Transform database data to local format
          const history: { [key: string]: string } = {};
          const dailyEntries: { [key: string]: any[] } = {};
          const detailed: any[] = [];

          moodData.forEach((entry: any) => {
            // Ensure date is in YYYY-MM-DD format
            const date = entry.entry_date;
            if (!date) {
              console.warn('⚠️ Mood entry missing date:', entry);
              return;
            }
            
            // Use the last mood emoji for the day (for calendar display)
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
          console.log(`✅ Mood calendar initialized from database with ${moodData.length} entries`);
        } else {
          console.log('📝 No mood data found in database - starting fresh');
          setMoodHistory({});
          setDailyMoodEntries({});
          setDetailedMoodEntries([]);
        }
      } catch (error) {
        console.error('❌ Error initializing mood data from database:', error);
        setMoodHistory({});
        setDailyMoodEntries({});
        setDetailedMoodEntries([]);
      }
    };

    // Run initialization when session is available
    if (session?.user?.id) {
      initializeMoodData();
    }
  }, [session?.user?.id]); // Depend on user session

  // Student info state
  const [studentName, setStudentName] = useState('');
  const [studentCourse, setStudentCourse] = useState('');
  const [studentReg, setStudentReg] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentUsername, setStudentUsername] = useState('');

  // App usage statistics tracking per user
  const [appUsageStats, setAppUsageStats] = useState({
    totalTimeSpent: 0, // in seconds
    lastSessionTime: '', // timestamp
    sessionCount: 0,
    lastTab: 'home'
  });
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Mood prompt system - 6 times a day
  const [lastMoodPrompt, setLastMoodPrompt] = useState<string>('');
  const [moodPromptsToday, setMoodPromptsToday] = useState<number>(0);

  // State to queue missed prompts
  const [missedPromptsQueue, setMissedPromptsQueue] = useState<{ label: string, scheduleKey: string }[]>([]);
  // State to track current prompt info
  const [currentPromptInfo, setCurrentPromptInfo] = useState<{ timeLabel: string, scheduleKey: string } | null>(null);
  const [nextMoodPromptTime, setNextMoodPromptTime] = useState<Date | null>(null);

  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bellAnimation = React.useRef(new Animated.Value(0)).current;
  const toastAnimation = React.useRef(new Animated.Value(0)).current;

  // Fixed mood prompt schedule (6 times a day at specific times)
  // Times are distributed evenly throughout the day regardless of login time
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
      promptTime.setHours(slot.start, 0, 0, 0); // Set to start of time slot

      prompts.push({
        time: promptTime,
        label: slot.label,
        intervalNumber: i + 1,
        scheduleKey: slot.scheduleKey
      });
    }

    return prompts;
  };

  // Ref to track last tab to avoid update loop
  const lastTabRef = React.useRef('home');

  const router = useRouter();

  // Dynamic tabs based on user type
  const TABS = React.useMemo(() => {
    const tabs = [...BASE_TABS];
    // Add peer tab only if user is a peer listener
    if (profile?.type === "PEER") {
      tabs.splice(2, 0, PEER_TAB); // Insert at index 2 (before SOS)
    }
    return tabs;
  }, [profile]);


  // Load student data from AsyncStorage or params
  useEffect(() => {
    const loadStudentSession = async () => {
      try {
        let regNo = studentRegNo;

        // If no registration in params, try to get from AsyncStorage
        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentStudentReg');
          if (storedReg) regNo = storedReg;
        }

        if (regNo) {
          // Update the studentReg state for use in other functions
          setStudentReg(regNo);

          // Load student data from AsyncStorage if available
          const studentData = await AsyncStorage.getItem('currentStudentData');
          if (studentData) {
            const data = JSON.parse(studentData);
            setStudentName(data.name || data.user_name || '');
            setStudentEmail(data.email || '');
            setStudentCourse(data.course || '');
            setStudentUsername(data.username || '');
          }


          // Load app usage stats for this user
          await loadAppUsageStats(regNo);

          // Initialize session start time for tracking app usage
          setSessionStartTime(Date.now());

          // Initialize mood prompt system
          await initializeMoodPromptSystem(regNo);

          // Load notifications after session is established
          await loadNotifications();

          // Register for push notifications using session user ID
          if (session?.user?.id) {
            console.log('Session user ID available for notifications');
          } else {
            console.log('⚠️ No session user ID available for push notifications');
          }

          // Setup notification listeners
          const listeners = setupNotificationListeners(
            (notification) => {
              // Notification received while app is open
              console.log('📬 New notification:', notification.request.content);
              setHasNewNotification(true);
              loadNotifications(); // Reload notifications list
            },
            (response) => {
              // User tapped on notification
              const data = response.notification.request.content.data;
              console.log('👆 Notification tapped with data:', data);
              
              // Navigate based on notification type
              if (data.type === 'community_post') {
                router.push('/student/buddy-connect');
              } else if (data.type === 'message') {
                router.push('/student/message');
              } else if (data.type === 'learning_resource') {
                router.push('/student/learning');
              } else if (data.type === 'mood_reminder') {
                // Open mood modal when tapping reminder
                setMoodModalVisible(true);
              } else if (data.type === 'mood_entry') {
                // Could navigate to mood history or analytics
                console.log('Mood entry notification tapped');
              }
            }
          );

          // Check for mood prompts after login with slight delay
          setTimeout(async () => {
            await checkForMoodPrompt(regNo);
          }, 2000);

          // Set up periodic mood prompt checking (every 30 minutes)
          const moodCheckInterval = setInterval(async () => {
            await checkForMoodPrompt(regNo);
          }, 30 * 60 * 1000); // 30 minutes

          // Clean up interval on unmount
          return () => {
            clearInterval(moodCheckInterval);
            if (listeners) {
              removeNotificationListeners(listeners);
            }
          };
        }
      } catch (error) {
        console.error('Error loading student session:', error);
      }
    };

    loadStudentSession();
  }, [studentRegNo]);

  // Load mood history from AsyncStorage - use useFocusEffect for APK compatibility
  useFocusEffect(
    useCallback(() => {
      const loadMoodHistory = async () => {
        let regNo = studentRegNo;
        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentStudentReg');
          if (storedReg) regNo = storedReg;
        }

        // Also try to get from profile
        if (!regNo && profile?.registration_number) {
          regNo = profile.registration_number.toString();
        }

        // Use session user ID to load mood data from Supabase
        const userId = session?.user?.id;
        if (!userId) {
          console.log('⏳ Waiting for user session to load mood data...');
          setMoodHistory({});
          setDailyMoodEntries({});
          setDetailedMoodEntries([]);
          return;
        }

        try {
          // Load from Supabase (primary source)
          const { data: moodData, error } = await supabase
            .from('mood_entries')
            .select('*')
            .eq('user_id', userId)
            .order('entry_date', { ascending: true });

          if (error) {
            console.error('❌ Error loading mood data from database:', error);
            // Set empty state if database fails - no AsyncStorage fallback
            setMoodHistory({});
            setDailyMoodEntries({});
            setDetailedMoodEntries([]);
            return;
          }
          
          if (moodData && moodData.length > 0) {
            // Transform Supabase data to local format
            const history: { [key: string]: string } = {};
            const dailyEntries: { [key: string]: any[] } = {};
            const detailed: any[] = [];

            moodData.forEach((entry: any) => {
              const date = entry.entry_date;
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
            console.log(`✅ Loaded ${moodData.length} mood entries from database`);
          } else {
            console.log('📝 No mood data found in database');
            setMoodHistory({});
            setDailyMoodEntries({});
            setDetailedMoodEntries([]);
          }

        } catch (error) {
          console.error('Error loading mood data:', error);
        }
      };

      loadMoodHistory();
    }, [studentRegNo, profile])
  );

  // Set up real-time subscription for mood entries
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    console.log('🔄 Setting up real-time mood sync for student');
    
    const channel = supabase
      .channel(`mood_entries_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_entries',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: DatabasePayload) => {
          console.log('🔔 Mood entry changed:', payload);
          
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
                console.warn('⚠️ Real-time sync: Mood entry missing date:', entry);
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
            
            console.log('✅ Mood data synced from real-time update');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from mood sync');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Reload mood data from Supabase when switching to mood tab
  useEffect(() => {
    const reloadMoodData = async () => {
      const userId = session?.user?.id;
      if (!userId) return;

      try {
        console.log('🔄 Reloading mood calendar data from database...');
        const { data: moodData, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: true });

        if (!error && moodData) {
          console.log(`📅 Processing ${moodData.length} mood entries for calendar`);
          const history: { [key: string]: string } = {};
          const dailyEntries: { [key: string]: any[] } = {};
          const detailed: any[] = [];

          moodData.forEach((entry: any) => {
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
          console.log('✅ Mood calendar refreshed from Supabase:', {
            totalEntries: moodData.length,
            historyKeys: Object.keys(history).length,
            dailyEntriesKeys: Object.keys(dailyEntries).length
          });
        } else {
          console.log('📅 No mood data found, setting empty calendar state');
          setMoodHistory({});
          setDailyMoodEntries({});
          setDetailedMoodEntries([]);
        }
      } catch (error) {
        console.error('❌ Error refreshing mood data:', error);
        // Set empty state on error
        setMoodHistory({});
        setDailyMoodEntries({});
        setDetailedMoodEntries([]);
      }
    };

    if (activeTab === 'mood') {
      console.log('📅 Switching to mood tab - reloading calendar data');
      reloadMoodData();
      const now = new Date();
      setCurrentMonth(now.getMonth());
      setCurrentYear(now.getFullYear());
      console.log('📅 Calendar reset to current month:', {
        month: now.getMonth(),
        year: now.getFullYear()
      });
    }
  }, [activeTab, session?.user?.id]);

  // Notification functions
  const loadNotifications = async () => {
    try {
      // Load notifications where student is the recipient or recipient_type is 'student' or 'all'
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`receiver_type.eq.STUDENTS,receiver_type.eq.ALL`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
          console.log('Network error while loading notifications');
        }
        return;
      }

      if (notificationsData) {
        setNotifications(notificationsData);
        const unread = notificationsData.filter((n: NotificationData) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications((prev: Notification[]) =>
        prev.map((n: Notification) => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Load notifications on component mount and when focused
  useEffect(() => {
    // Set up real-time subscription for notifications
    const notificationSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          // Check if this notification is for current student
          const isForCurrentStudent = async () => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const notification = payload.new;
              const isRelevant =
                notification.receiver_type === 'STUDENTS' ||
                notification.receiver_type === 'ALL';

              if (isRelevant) {
                setHasNewNotification(true);
                setToastMessage(notification.title || 'New notification received!');
                setShowToast(true);

                Animated.sequence([
                  Animated.timing(bellAnimation, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(bellAnimation, {
                    toValue: -1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(bellAnimation, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(bellAnimation, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                  })
                ]).start();

                // Start toast animation
                Animated.sequence([
                  Animated.timing(toastAnimation, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                  Animated.delay(2500),
                  Animated.timing(toastAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  })
                ]).start();

                // Reset animation flags after 3 seconds
                setTimeout(() => {
                  setHasNewNotification(false);
                  setShowToast(false);
                }, 3000);
              }
            }
          };

          isForCurrentStudent();
          // Reload notifications when any change occurs
          loadNotifications();
        }
      )
      .subscribe();

    // Set up real-time subscription for community posts
    const communityPostSubscription = supabase
      .channel('community_posts_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_post'
        },
        async (payload: DatabasePayload) => {
          console.log('📝 New community post created:', payload.new);
          
          // Send local notification
          await sendLocalNotification(
            '🎉 New Community Post',
            'Check out the latest post in BuddyConnect!',
            { type: 'community_post', postId: payload.new.id }
          );
        }
      )
      .subscribe();

    // Set up real-time subscription for messages
    const messageSubscription = supabase
      .channel('messages_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload: DatabasePayload) => {
          // Only notify if message is for current user
          if (payload.new.receiver_id === studentReg) {
            console.log('💬 New message received:', payload.new);
            
            // Send local notification
            await sendLocalNotification(
              '💬 New Message',
              'You have received a new message',
              { type: 'message', messageId: payload.new.id }
            );
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for learning resources
    const learningResourceSubscription = supabase
      .channel('learning_resources_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learning_resource'
        },
        async (payload: DatabasePayload) => {
          console.log('📚 New learning resource added:', payload.new);
          
          // Send local notification
          await sendLocalNotification(
            '📚 New Learning Resource',
            payload.new.title || 'A new learning resource is available!',
            { type: 'learning_resource', resourceId: payload.new.id }
          );
        }
      )
      .subscribe();

    // Set up real-time subscription for mood entries (for streak tracking and support notifications)
    const moodEntriesSubscription = supabase
      .channel('mood_entries_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mood_entries'
        },
        async (payload: DatabasePayload) => {
          // Only notify if it's another device of same user (for multi-device sync)
          if (payload.new.user_id === studentReg) {
            console.log('😊 Mood entry synced from another device:', payload.new);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(communityPostSubscription);
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(learningResourceSubscription);
      supabase.removeChannel(moodEntriesSubscription);
    };
  }, [profile, studentReg]);

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        loadNotifications();
      }
    }, [profile])
  );

  // Load profile picture when screen comes into focus (for instant updates from settings)
  useFocusEffect(
    useCallback(() => {
      const loadProfilePicture = async () => {
        let regNo = studentRegNo;
        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentStudentReg');
          if (storedReg) regNo = storedReg;
        }

        if (regNo) {
          try {
            const profilePicIndex = await AsyncStorage.getItem(`profilePic_${regNo}`);
            if (profilePicIndex) {
              setSelectedProfilePic(parseInt(profilePicIndex, 10));
            }
          } catch (error) {
            console.error('Error loading profile picture:', error);
          }
        }
      };

      loadProfilePicture();
    }, [studentRegNo])
  );

  // Load app usage statistics for specific user
  const loadAppUsageStats = async (regNo: string) => {
    try {
      const storedStats = await AsyncStorage.getItem(`appUsageStats_${regNo}`);
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        setAppUsageStats(stats);

        // Normalize tab names and ensure only content tabs are set as active
        let normalizedTab = stats.lastTab || 'home';

        // Fix settings vs setting mismatch
        if (normalizedTab === 'settings') {
          normalizedTab = 'setting';
        }

        // Only allow tabs that have content on this page (home and mood)
        // setting and sos tabs navigate to different pages
        const contentTabs = ['home', 'mood'];
        if (!contentTabs.includes(normalizedTab)) {
          normalizedTab = 'home';
        }

        lastTabRef.current = normalizedTab;
        setActiveTab(normalizedTab);
      } else {
        // Default to home tab if no stats found
        setActiveTab('home');
        lastTabRef.current = 'home';
      }
    } catch (error) {
      console.error('Error loading app usage stats:', error);
      // Fallback to home tab on error
      setActiveTab('home');
      lastTabRef.current = 'home';
    }
  };

  // Initialize mood prompt system with database-first approach
  const initializeMoodPromptSystem = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const userId = session?.user?.id;

      if (!userId) {
        console.log('⏳ No user session for mood prompt initialization');
        return;
      }

      // Get today's completed mood entries from database
      const { data: todayMoods, error } = await supabase
        .from('mood_entries')
        .select('schedule_key')
        .eq('user_id', userId)
        .eq('entry_date', today);

      if (error) {
        console.error('❌ Error loading today\'s moods for prompt system:', error);
        return;
      }

      const completedSlots = new Set(todayMoods?.map((m: any) => m.schedule_key).filter(Boolean) || []);
      const completedCount = completedSlots.size;

      console.log(`📊 Mood prompt system initialized: ${completedCount}/6 completed from database`);
      
      setMoodPromptsToday(completedCount);
      setTodayMoodProgress({ completed: completedCount, total: 6 });

      // Check if it's time for any prompts
      await checkForMoodPrompt(regNo);
    } catch (error) {
      console.error('Error initializing mood prompt system:', error);
    }
  };

  // Check if it's time for a mood prompt - uses database data directly
  const checkForMoodPrompt = async (regNo: string) => {
    try {
      const now = new Date();
      const today = getTodayKey();
      const userId = session?.user?.id;

      if (!userId) {
        console.log('⏳ No user session for mood check');
        return;
      }

      // Get today's mood entries from database to check which slots are filled
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
      const completedSlots = new Set(todayMoods?.map((m: any) => m.schedule_key).filter(Boolean) || []);
      console.log(`📊 Completed mood slots: ${completedSlots.size}/6`, Array.from(completedSlots));

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

      // Refresh local state with Supabase data - fetch all entries for calendar update
      const { data: allMoodData, error: allMoodError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (!allMoodError && allMoodData && allMoodData.length > 0) {
        const history: { [key: string]: string } = {};
        const dailyEntries: { [key: string]: any[] } = {};
        
        allMoodData.forEach((entry: any) => {
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

      if (missedSlots.length > 0) {
        // Show the earliest missed slot
        const nextPrompt = missedSlots[0];
        console.log(`🎯 Showing mood prompt: ${nextPrompt.label} (${nextPrompt.intervalNumber}/6) - ${missedSlots.length} pending`);
        
        // Send push notification for mood check-in reminder
        await sendLocalNotification(
          '😊 Time for Mood Check-in',
          `${nextPrompt.label} - How are you feeling right now?`,
          { type: 'mood_reminder', label: nextPrompt.label, intervalNumber: nextPrompt.intervalNumber }
        );
        
        setCurrentPromptInfo({
          timeLabel: nextPrompt.timeLabel,
          scheduleKey: nextPrompt.scheduleKey
        });
        setMissedPromptsQueue(missedSlots.map(p => ({ label: p.timeLabel, scheduleKey: p.scheduleKey })));
        setMoodModalVisible(true);
      } else {
        console.log(`✅ All ${completedSlots.size}/6 mood slots completed for today!`);
      }

    } catch (error) {
      console.error('Error checking for mood prompt:', error);
    }
  };

  // Helper function to format time nicely
  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Show welcome mood prompt for new login sessions
  const showWelcomeMoodPrompt = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const userId = session?.user?.id;

      if (!userId) return;

      // Check if user has any mood entries today from database
      const { data: todayMoods, error } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('entry_date', today)
        .limit(1);

      if (error) {
        console.error('Error checking for existing moods:', error);
        return;
      }

      // If no entries exist for today, show welcome check-in
      if (!todayMoods || todayMoods.length === 0) {
        console.log('🌟 Showing welcome mood prompt for new session');
        setCurrentPromptInfo({ timeLabel: 'Welcome Check-in', scheduleKey: 'welcome' });
        setMoodModalVisible(true);
      }
    } catch (error) {
      console.error('Error showing welcome mood prompt:', error);
    }
  };

  // Record that mood prompt was completed - check database for completion count
  const recordMoodPromptCompleted = async (regNo: string, intervalNumber: string) => {
    try {
      const today = getTodayKey();
      const userId = session?.user?.id;

      if (!userId) return;

      // Get updated count from database after mood was saved
      const { data: todayMoods, error } = await supabase
        .from('mood_entries')
        .select('schedule_key')
        .eq('user_id', userId)
        .eq('entry_date', today);

      if (error) {
        console.error('Error fetching mood completion status:', error);
        return;
      }

      const completedSlots = new Set(todayMoods?.map((m: any) => m.schedule_key).filter(Boolean) || []);
      const completedCount = completedSlots.size;

      setMoodPromptsToday(completedCount);
      setTodayMoodProgress({ completed: completedCount, total: 6 });

      console.log(`✅ Mood prompt completed: ${completedCount}/6 (${intervalNumber})`);
      
      // Show completion message
      if (completedCount === 6) {
        Alert.alert(
          '🎉 Amazing!',
          'You\'ve completed all 6 mood check-ins for today! Great job tracking your emotional wellness.',
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        // Check for next pending prompt immediately
        setTimeout(() => {
          checkForMoodPrompt(regNo);
        }, 1000);
      }
    } catch (error) {
      console.error('Error recording mood prompt completion:', error);
    }
  };

  // Set next mood prompt time based on database data
  const setNextMoodPrompt = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const userId = session?.user?.id;
      const now = new Date();

      if (!userId) return;

      // Get completed slots from database
      const { data: todayMoods, error } = await supabase
        .from('mood_entries')
        .select('schedule_key')
        .eq('user_id', userId)
        .eq('entry_date', today);

      if (error) {
        console.error('Error fetching mood data for next prompt:', error);
        return;
      }

      const completedSlots = new Set(todayMoods?.map((m: any) => m.schedule_key).filter(Boolean) || []);

      // Define time slots
      const timeSlots = [
        { start: 8, scheduleKey: 'slot_1' },
        { start: 11, scheduleKey: 'slot_2' },
        { start: 13, scheduleKey: 'slot_3' },
        { start: 15, scheduleKey: 'slot_4' },
        { start: 17, scheduleKey: 'slot_5' },
        { start: 19, scheduleKey: 'slot_6' }
      ];

      // Find next incomplete prompt
      for (const slot of timeSlots) {
        const promptTime = new Date();
        promptTime.setHours(slot.start, 0, 0, 0);
        
        if (promptTime > now && !completedSlots.has(slot.scheduleKey)) {
          setNextMoodPromptTime(promptTime);
          return;
        }
      }

      // All prompts for today are done or past
      setNextMoodPromptTime(null);
    } catch (error) {
      console.error('Error setting next mood prompt:', error);
    }
  };

  // Save app usage statistics when component unmounts or app goes to background
  const saveAppUsageStats = async () => {
    let regNo = studentRegNo;
    if (!regNo) {
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      if (storedReg) regNo = storedReg;
    }

    if (!regNo || sessionStartTime === 0) return;

    try {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000); // in seconds
      const updatedStats = {
        ...appUsageStats,
        totalTimeSpent: appUsageStats.totalTimeSpent + sessionDuration,
        lastSessionTime: new Date().toISOString(),
        sessionCount: appUsageStats.sessionCount + 1,
        lastTab: activeTab
      };

      await AsyncStorage.setItem(`appUsageStats_${regNo}`, JSON.stringify(updatedStats));
      setAppUsageStats(updatedStats);
      console.log(`📊 App usage saved: ${sessionDuration}s this session, ${updatedStats.totalTimeSpent}s total`);
    } catch (error) {
      console.error('Error saving app usage stats:', error);
    }
  };

  // Track tab changes and save stats
  useEffect(() => {
    const updateTabUsage = async () => {
      if (lastTabRef.current !== activeTab) {
        lastTabRef.current = activeTab;
        await saveAppUsageStats();
        // Reset session start time for new tab
        setSessionStartTime(Date.now());
      }
    };

    updateTabUsage();
  }, [activeTab]);

  // Save stats when component unmounts
  useEffect(() => {
    return () => {
      saveAppUsageStats();
    };
  }, []);

  // Update date and time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Save mood to AsyncStorage (per user)
  // Enhanced: Save mood with scheduled time info and handle missed prompts queue
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
      
      // Get scheduled label and key
      const timeLabel = currentPromptInfo?.timeLabel || 'Unscheduled';
      const scheduleKey = currentPromptInfo?.scheduleKey || '';
      const moodData = MOOD_EMOJIS.find(m => m.emoji === mood);
      const now = new Date();

      // Validate required data before saving
      if (!mood || !moodData) {
        console.error('❌ Invalid mood data:', { mood, moodData });
        Alert.alert('Error', 'Please select a valid mood');
        return;
      }

      // Save to Supabase first (primary storage)
      console.log('💾 Saving mood entry:', {
        user_id: userId,
        user_type: profile?.type || 'STUDENT',
        mood_emoji: mood,
        mood_label: moodData.label,
        entry_date: now.toISOString().split('T')[0],
        entry_time: now.toTimeString().split(' ')[0],
        scheduled_label: timeLabel,
        schedule_key: scheduleKey
      });

      const { error: dbError } = await supabase
        .from('mood_entries')
        .insert({
          user_id: userId,
          user_type: profile?.type || 'STUDENT',
          mood_emoji: mood,
          mood_label: moodData.label,
          entry_date: now.toISOString().split('T')[0], // YYYY-MM-DD
          entry_time: now.toTimeString().split(' ')[0], // HH:MM:SS
          scheduled_label: timeLabel,
          schedule_key: scheduleKey,
          notes: input?.trim() || null
        });
      
      if (dbError) {
        console.error('❌ Database error details:', {
          error: dbError,
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });

        // Provide specific error messages based on error type
        let errorMessage = 'Failed to save mood. ';
        if (dbError.code === '23505') {
          errorMessage += 'Duplicate entry detected. Please try again.';
        } else if (dbError.code === '23502') {
          errorMessage += 'Missing required information. Please check your profile.';
        } else if (dbError.message?.includes('permission')) {
          errorMessage += 'Permission denied. Please check your account.';
        } else if (dbError.message?.includes('connection') || dbError.message?.includes('network')) {
          errorMessage += 'Network connection issue. Please check your internet.';
        } else {
          errorMessage += `Database error: ${dbError.message}`;
        }
        
        Alert.alert('Database Error', errorMessage);
        return;
      }
      
      console.log('✅ Mood saved to Supabase database');

      // Update local state for immediate UI update
      const newEntry = {
        emoji: mood,
        label: moodData.label,
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
        label: moodData.label,
        time: currentTime,
        scheduled: timeLabel,
        scheduleKey,
        notes: input?.trim() || undefined
      };
      const updatedDetailedEntries = [...detailedMoodEntries, detailedEntry];
      setDetailedMoodEntries(updatedDetailedEntries);

      // Minimal offline backup to AsyncStorage (only for offline scenarios)
      const regNo = studentRegNo || profile?.registration_number?.toString() || userId;
      try {
        // Only backup essential mood history for offline access
        await AsyncStorage.setItem(`lastMoodEntry_${regNo}`, JSON.stringify({
          date: today,
          mood: mood,
          label: moodData.label,
          time: currentTime,
          savedAt: new Date().toISOString()
        }));
        console.log('💾 Last mood entry backed up locally for offline access');
      } catch (storageError) {
        console.error('⚠️ Minimal backup failed:', storageError);
        // Don't fail the whole operation for storage errors
      }
      
      console.log(`✅ Mood saved successfully for user ${userId}: ${mood} at ${currentTime} (${timeLabel})`);
      
      // Send push notification for mood entry
      try {
        await sendLocalNotification(
          '🎯 Mood Logged!',
          `You're feeling ${moodData.label} today. Keep tracking your emotional journey!`,
          { type: 'mood_entry', mood: mood, label: moodData.label, time: currentTime }
        );
      } catch (notifError) {
        console.error('⚠️ Notification failed:', notifError);
        // Don't fail for notification errors
      }
      
      setMoodModalVisible(false);
      setSelectedMood(null);
      setInput('');
      
      // Record that this prompt was completed
      if (currentPromptInfo && currentPromptInfo.scheduleKey !== 'welcome') {
        try {
          await recordMoodPromptCompleted(regNo, currentPromptInfo.scheduleKey);
        } catch (promptError) {
          console.error('⚠️ Failed to record prompt completion:', promptError);
        }
      }

      // Clear current prompt info
      setCurrentPromptInfo(null);

      // Update next prompt time
      try {
        await setNextMoodPrompt(regNo);
      } catch (promptError) {
        console.error('⚠️ Failed to set next mood prompt:', promptError);
      }

    } catch (error: any) {
      console.error('💥 Unexpected error in saveMood:', error);
      
      let errorMessage = 'An unexpected error occurred while saving your mood.';
      if (error?.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your account settings.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      Alert.alert('Unexpected Error', errorMessage);
    }
  };

  // Export mood data function - Fetch fresh data from database
  const exportMoodData = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert('Error', 'User session not found. Please log in again.');
      return;
    }

    try {
      // Fetch latest mood data directly from database for export
      const { data: moodData, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) {
        console.error('Error fetching mood data for export:', error);
        Alert.alert('Error', 'Failed to fetch mood data from database');
        return;
      }

      const exportData = {
        userId: userId,
        userRegistration: studentRegNo || profile?.registration_number,
        userName: studentName || studentUsername,
        exportDate: new Date().toISOString(),
        totalMoodEntries: moodData?.length || 0,
        moodEntries: moodData || [],
        appUsageStats: appUsageStats,
        dateRange: {
          firstEntry: moodData?.[0]?.entry_date || 'No entries',
          lastEntry: moodData?.[moodData.length - 1]?.entry_date || 'No entries'
        }
      };

      console.log('📁 Mood data export prepared (from database):', JSON.stringify(exportData, null, 2));
      Alert.alert(
        '📁 Data Export Ready',
        `Your mood data has been exported from database.\n\nTotal entries: ${moodData?.length || 0}\nApp usage: ${Math.floor(appUsageStats.totalTimeSpent / 60)} minutes\n\nData has been logged to console for developer access.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error exporting mood data:', error);
      Alert.alert('Error', 'Failed to export mood data');
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
    
    // Debug logging for calendar issues
    if (activeTab === 'mood' && day === 1) {
      console.log('🔍 Calendar Debug Info:', {
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

    // Debug calendar press
    console.log('📅 Calendar cell pressed:', {
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
      dayEntries.forEach((entry: any, index: number) => {
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
          { text: 'Close', style: 'cancel' },
          { text: '💾 Export All Data', onPress: exportMoodData },
          ...(isToday && dayEntries.length < 6 ? [{ text: '➕ Add Mood Now', onPress: () => setMoodModalVisible(true) }] : [])
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
          { text: 'Close', style: 'cancel' },
          { text: '➕ Add Mood Now', onPress: () => setMoodModalVisible(true) }
        ]
      );
    }
  };

  // Mood Calendar Component (Enhanced with 6-times daily tracking)
  const MoodCalendar = () => {
    const calendar = generateCalendar();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Debug calendar state
    console.log('📅 Rendering MoodCalendar:', {
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

    const emojiCounts = currentMonthEntries.reduce((counts: { [key: string]: number }, entry: any) => {
      counts[entry.emoji] = (counts[entry.emoji] || 0) + 1;
      return counts;
    }, {});

    const mostSelectedEmoji = Object.entries(emojiCounts).length > 0
      ? Object.entries(emojiCounts).reduce((a, b) => emojiCounts[a[0]] > emojiCounts[b[0]] ? a : b)[0]
      : '😐';

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 0, backgroundColor: Colors.backgroundLight, borderRadius: 20, margin: 10, paddingVertical: 20, borderWidth: 1, borderColor: Colors.border }}>
        {/* Most selected emoji display */}
        <View style={{ marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ color: Colors.text, fontSize: 40, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.50)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}>
            Mood Calendar
          </Text>
          <Text style={{ color: Colors.primary, fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>
            Most Selected Mood This Month : {mostSelectedEmoji}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: Colors.white, borderRadius: 20, padding: 10, borderWidth: 1, borderColor: Colors.border }}>
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: Colors.accent, borderRadius: 15, marginHorizontal: 10 }}
          >
            <Text style={{ color: Colors.white, fontSize: 20, fontWeight: 'bold' }}>‹</Text>
          </TouchableOpacity>

          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>
            {monthNames[currentMonth]} {currentYear}
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: Colors.accent, borderRadius: 15, marginHorizontal: 10 }}
          >
            <Text style={{ color: Colors.white, fontSize: 20, fontWeight: 'bold' }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 400 }}>
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
                  height: 55, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: 4, 
                  backgroundColor: isToday ? Colors.accent + '30' : Colors.white, 
                  borderRadius: 15, 
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
                  <>
                    {getMoodForDate(day) && (
                      <Text style={{ fontSize: 20 }}>{getMoodForDate(day)}</Text>
                    )}
                    <Text style={{ color: Colors.text, fontSize: 10, marginTop: 4, fontWeight: '600' }}>{day}</Text>
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
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Animated Bubble Background (only visible on Home tab) */}
      {activeTab === 'home' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
          {bubbleConfigs.map((cfg: any, i: number) => {
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
      )}
      {/* Floating Action Buttons - Only show on Home tab */}
      {activeTab === 'home' && (
        <View style={{ position: 'absolute', top: 42, right: 20, zIndex: 20, flexDirection: 'row', alignItems: 'center' }}>
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
              marginRight: 10,
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
            style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: hasNewNotification ? '#ffeb3b' : Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, borderWidth: 2, borderColor: hasNewNotification ? '#ff9800' : Colors.primary, marginRight: 10 }}
            onPress={() => setShowNotificationModal(true)}
          >
            <Animated.View
              style={{
                transform: [{
                  rotate: bellAnimation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-15deg', '15deg']
                  })
                }]
              }}
            >
              <Ionicons
                name={hasNewNotification ? "notifications" : "notifications"}
                size={20}
                color={hasNewNotification ? '#ff5722' : Colors.primary}
              />
            </Animated.View>
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: hasNewNotification ? '#ff5722' : 'red', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 100,
            left: 20,
            right: 20,
            backgroundColor: Colors.primary,
            borderRadius: 15,
            padding: 15,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 1000,
            elevation: 10,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            transform: [
              {
                translateY: toastAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0]
                })
              }
            ],
            opacity: toastAnimation
          }}
        >
          <Ionicons name="notifications" size={20} color={Colors.white} style={{ marginRight: 10 }} />
          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: 'bold', flex: 1 }}>
            {toastMessage}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowToast(false);
              Animated.timing(toastAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }}
            style={{ padding: 5 }}
          >
            <Ionicons name="close" size={16} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      )}

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
                      route: `./toolkit-grounding?registration=${studentRegNo}`
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
                      route: `./toolkit-breathing?registration=${studentRegNo}`
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
                      route: `./mandala-editor?registration=${studentRegNo}`
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
                      route: `./toolkit-movement?registration=${studentRegNo}`
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
                      route: `./toolkit-focus?registration=${studentRegNo}`
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

      {/* Mood Modal - Mandatory Selection */}
        <Modal visible={moodModalVisible} animationType="slide" transparent={true} onRequestClose={() => setMoodModalVisible(false)}>
        <TouchableOpacity 
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryOverlay }}
          activeOpacity={1}
          onPress={() => setMoodModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e: any) => e.stopPropagation()}>
            <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 30, alignItems: 'center', width: 360, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.accent }}
          >
            <Text style={{ fontSize: 28, marginBottom: 10, color: Colors.text, fontWeight: 'bold', textAlign: 'center' }}>🌟 Mood Check-In</Text>
            
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
              Hi {studentName || studentUsername}! How are you feeling right now?
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
      <Modal visible={showNotificationModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: Colors.white, borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.text }}>🔔 Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationModal(false)}
                style={{ padding: 8, borderRadius: 20, backgroundColor: Colors.background }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Notifications List */}
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 48, marginBottom: 15 }}>📭</Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 8 }}>No Notifications</Text>
                  <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>You&apos;re all caught up! No new notifications at the moment.</Text>
                </View>
              ) : (
                notifications.map((notification: Notification) => (
                  <View key={notification.id} style={{
                    // backgroundColor: !notification.is_read ? Colors.accent + '10' : Colors.white,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 10,
                    borderWidth: 1,
                    // borderColor: !notification.is_read ? Colors.primary : Colors.border,
                    shadowColor: Colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 5 }}>{notification.title}</Text>
                        <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 }}>{notification.message}</Text>
                        <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                          {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                      {/* <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {!notification.is_read && (
                          <TouchableOpacity
                            style={{ backgroundColor: Colors.primary, borderRadius: 15, padding: 8 }}
                            onPress={() => markNotificationAsRead(notification.id)}
                          >
                            <Ionicons name="checkmark" size={16} color={Colors.white} />
                          </TouchableOpacity>
                        )}
                      </View> */}
                    </View>
                    {notification.priority === 'HIGH' && (
                      <View style={{ backgroundColor: '#ff4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 }}>
                        <Text style={{ color: Colors.white, fontSize: 10, fontWeight: 'bold' }}>High Priority</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 }}>
        {/* Home Tab Content */}
        {activeTab === 'home' && (
          <>
            {/* Small Avatar in Home tab */}
            <View style={{ position: 'absolute', top: 40, left: 16, zIndex: 10, backgroundColor: Colors.backgroundLight, borderRadius: 20, padding: 6, borderWidth: 2, borderColor: Colors.primary, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={profilePics[selectedProfilePic]} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.accent }} />
                <Text style={{ color: Colors.text, fontSize: 13, marginLeft: 10, fontWeight: 'bold', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}>{getGreeting(profile?.name)}</Text>
              </View>
            </View>

            {/* Mood Check-In Button removed as per request */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 120, paddingHorizontal: 20 }}>
              {/* 2x3 Matrix Layout */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => setShowToolkitPage(true)}>
                  <Image source={require('@/assets/images/self help tool kit.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Self Help Toolkit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push('./student-calm')}>
                  <Image source={require('@/assets/images/calmcampanion.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>C.A.L.M Spaces</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push('./buddy-connect')}>
                  <Image source={require('@/assets/images/community.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Community</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push('./journal')}>
                  <Image source={require('@/assets/images/journal.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Journal</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push('./support')}>
                  <Image source={require('@/assets/images/supportself.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Support Shelf</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push(`./message?registration=${studentRegNo}`)}>
                  <Image source={require('@/assets/images/message.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Messages</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {activeTab === 'mood' && (
          <ScrollView 
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <MoodCalendar />
          </ScrollView>
        )}
        {activeTab === 'peer' && profile?.type === "PEER" && (
          <PeerScreen />
        )}
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: Colors.white, paddingVertical: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 6, borderTopWidth: 3, borderTopColor: Colors.primary }}>
        {TABS.map((tab: any) => (
          <TouchableOpacity
            key={tab.key}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
            activeOpacity={1}
            onPress={() => {
              if (tab.key === 'setting') {
                router.push(`./student-setting?registration=${studentRegNo}`);
              } else if (tab.key === 'sos') {
                router.push('./emergency');
              } else {
                setActiveTab(tab.key);
              }
            }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 48, height: 40, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent' }}>
              {tab.key === 'home' ? (
                <Image source={require('@/assets/images/home.png')} style={{ width: 40, height: 40 }} />
              ) : tab.key === 'mood' ? (
                <Image source={require('@/assets/images/mood calender.png')} style={{ width: 40, height: 40 }} />
              ) : tab.key === 'peer' && profile?.type === "PEER"  ? (
                <Image source={require('@/assets/images/community.png')} style={{ width: 38, height: 38 }} />
              ) : tab.key === 'sos' ? (
                <Image source={require('@/assets/images/sos.png')} style={{ width: 35, height: 35 }} />
              ) : tab.key === 'setting' ? (
                <Image source={require('@/assets/images/setting.png')} style={{ width: 35, height: 35 }} />
              ) : (
                <Text style={{ fontSize: 20, color: activeTab === tab.key ? '#333' : '#666', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{tab.icon}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
