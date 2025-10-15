import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/api/Profile';
import { useAuth } from '@/providers/AuthProvider';

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

const alerts = [
  { id: '1', text: 'Assignment due tomorrow!' },
  { id: '2', text: 'New message from your teacher.' },
  { id: '3', text: 'Mood check-in available.' },
];

const messages = [
  { id: '1', sender: 'You', text: 'Hey, how are you?' },
  { id: '2', sender: 'Alex', text: 'I am good, thanks!' },
  { id: '3', sender: 'You', text: 'Ready for the test?' },
];

// Tabs for all users
const TABS = [
  { key: 'home', icon: '🏠' },
  { key: 'mood', icon: '😊' },
  { key: 'sos' , icon: '0️⃣' },
  { key: 'setting', icon: '⚙️' },
];

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
  const [moodHistory, setMoodHistory] = useState<{[key: string]: string}>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [showToolkitPage, setShowToolkitPage] = useState(false);
  const [showToolkitPopup, setShowToolkitPopup] = useState(false);
  const [selectedToolkitItem, setSelectedToolkitItem] = useState<{name: string, description: string, route: string} | null>(null);
  const [dailyMoodEntries, setDailyMoodEntries] = useState<{[key: string]: {emoji: string, label: string, time: string}[]}>({});
  const [detailedMoodEntries, setDetailedMoodEntries] = useState<{date: string, emoji: string, label: string, time: string, notes?: string}[]>([]);

  const {session, loading} = useAuth();
  const {data:profile, error, isLoading} = useProfile(session?.user.id);

  if (isLoading){
    return <ActivityIndicator />
  }

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
    bubbleAnimations.forEach((_, i) => startBubbleLoop(i));
  }, [bubbleAnimations, startBubbleLoop]);

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
  const [missedPromptsQueue, setMissedPromptsQueue] = useState<{label: string, scheduleKey: string}[]>([]);
  // State to track current prompt info
  const [currentPromptInfo, setCurrentPromptInfo] = useState<{timeLabel: string, scheduleKey: string} | null>(null);
  const [nextMoodPromptTime, setNextMoodPromptTime] = useState<Date | null>(null);

  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const bellAnimation = React.useRef(new Animated.Value(0)).current;
  const toastAnimation = React.useRef(new Animated.Value(0)).current;

  // Dynamic mood prompt schedule (6 times a day with equal intervals)
  // Each prompt is 4 hours apart from the first login time
  const generateMoodPromptTimes = (firstLoginTime: Date): { time: Date, label: string, intervalNumber: number }[] => {
    const prompts = [];
    const labels = ['First Check-in', 'Mid-Morning', 'Afternoon', 'Evening', 'Night', 'Late Night'];

    for (let i = 0; i < 6; i++) {
      const promptTime = new Date(firstLoginTime);
      promptTime.setHours(promptTime.getHours() + (i * 4)); // 4-hour intervals

      prompts.push({
        time: promptTime,
        label: labels[i],
        intervalNumber: i + 1
      });
    }

    return prompts;
  };

  // Ref to track last tab to avoid update loop
  const lastTabRef = React.useRef('home');

  const router = useRouter();

  // Force show mood selection for testing
  const forceShowMoodSelection = () => {
    setCurrentPromptInfo({ timeLabel: 'Manual Check-in', scheduleKey: 'manual' });
    setMoodModalVisible(true);
  };

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
          };
        }
      } catch (error) {
        console.error('Error loading student session:', error);
      }
    };

    loadStudentSession();
  }, [studentRegNo]);

  // Load mood history from AsyncStorage on mount (per user)
  useEffect(() => {
    const loadMoodHistory = async () => {
      let regNo = studentRegNo;
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentStudentReg');
        if (storedReg) regNo = storedReg;
      }

      if (!regNo) return;

      try {
        const stored = await AsyncStorage.getItem(`moodHistory_${regNo}`);
        if (stored) setMoodHistory(JSON.parse(stored));
        else setMoodHistory({});

        // Also load daily mood entries
        const dailyStored = await AsyncStorage.getItem(`dailyMoodEntries_${regNo}`);
        if (dailyStored) setDailyMoodEntries(JSON.parse(dailyStored));
        else setDailyMoodEntries({});

        // Load detailed mood entries for analytics
        const detailedStored = await AsyncStorage.getItem(`detailedMoodEntries_${regNo}`);
        if (detailedStored) setDetailedMoodEntries(JSON.parse(detailedStored));
        else setDetailedMoodEntries([]);

      } catch (error) {
        console.error('Error loading mood data:', error);
      }
    };

    loadMoodHistory();
  }, [studentRegNo]);

  // Notification functions
  const loadNotifications = async () => {
    try {
      // Try to get registration number from state first, then params, then AsyncStorage
      let regNo = studentReg || studentRegNo;
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentStudentReg');
        if (storedReg) regNo = storedReg;
      }

      // Don't proceed if regNo is still undefined/null/empty or has invalid string values
      if (!regNo || regNo === 'undefined' || regNo === 'null') {
        return;
      }

      // Load notifications where student is the recipient or recipient_type is 'student' or 'all'
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`recipient_id.eq.${regNo},recipient_type.eq.student,recipient_type.eq.all`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (notificationsData) {
        setNotifications(notificationsData);
        const unread = notificationsData.filter(n => !n.is_read).length;
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
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };





  // Load notifications on component mount and when focused
  useEffect(() => {
    // Only load notifications if we have a valid registration number
    // Skip initial load here since it's handled in loadStudentSession
    // This useEffect is mainly for setting up the real-time subscription

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
            // Try to get registration number from state first, then params, then AsyncStorage
            let regNo = studentReg || studentRegNo;
            if (!regNo) {
              const storedReg = await AsyncStorage.getItem('currentStudentReg');
              if (storedReg) regNo = storedReg;
            }

            // Skip if no valid registration number
            if (!regNo || regNo === 'undefined' || regNo === 'null') {
              return;
            }

            if (payload.eventType === 'INSERT' && payload.new) {
              const notification = payload.new;
              const isRelevant =
                notification.recipient_id === regNo ||
                notification.recipient_type === 'student' ||
                notification.recipient_type === 'all';

              if (isRelevant) {
                // Trigger bell animation for new notification
                setHasNewNotification(true);

                // Show toast notification
                setToastMessage(notification.title || 'New notification received!');
                setShowToast(true);

                // Start bell shake animation
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

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, [studentRegNo, studentReg]);

  useFocusEffect(
    useCallback(() => {
      // Only load notifications if we have a valid registration number
      if (studentReg || studentRegNo) {
        loadNotifications();
      }
    }, [studentReg, studentRegNo])
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

  // Initialize mood prompt system with equal intervals
  const initializeMoodPromptSystem = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const now = new Date();

      // Get or create today's mood schedule
      const scheduleKey = `moodSchedule_${regNo}_${today}`;
      let scheduleData = await AsyncStorage.getItem(scheduleKey);

      let dailySchedule;
      if (!scheduleData) {
        // Create new schedule starting from current time (first login of the day)
        dailySchedule = {
          firstLoginTime: now.toISOString(),
          promptTimes: generateMoodPromptTimes(now),
          completedPrompts: [],
          count: 0
        };
        await AsyncStorage.setItem(scheduleKey, JSON.stringify(dailySchedule));
      } else {
        dailySchedule = JSON.parse(scheduleData);
      }

      setMoodPromptsToday(dailySchedule.count);

      // Check if it's time for any prompts
      checkForMoodPrompt(regNo, dailySchedule);
    } catch (error) {
      console.error('Error initializing mood prompt system:', error);
    }
  };

  // Check if it's time for a mood prompt based on 4-hour intervals
  const checkForMoodPrompt = async (regNo: string, dailySchedule?: any) => {
    try {
      const now = new Date();
      const today = getTodayKey();

      // Load schedule if not provided
      let schedule = dailySchedule;
      if (!schedule) {
        const scheduleKey = `moodSchedule_${regNo}_${today}`;
        const scheduleData = await AsyncStorage.getItem(scheduleKey);
        if (!scheduleData) {
          console.log('No mood schedule found for today');
          return;
        }
        schedule = JSON.parse(scheduleData);
      }

      // Check which prompts should be shown now
      const missed: {label: string, intervalNumber: number, time: Date}[] = [];

      for (let i = 0; i < schedule.promptTimes.length; i++) {
        const promptInfo = schedule.promptTimes[i];
        const promptTime = new Date(promptInfo.time);
        const isTimeForPrompt = now >= promptTime;
        const hasCompleted = schedule.completedPrompts.includes(promptInfo.intervalNumber);

        if (isTimeForPrompt && !hasCompleted && schedule.count < 6) {
          missed.push({
            label: promptInfo.label,
            intervalNumber: promptInfo.intervalNumber,
            time: promptTime
          });
        }
      }

      if (missed.length > 0) {
        // Show the earliest missed prompt
        const nextPrompt = missed[0];
        console.log(`🎯 Showing mood prompt: ${nextPrompt.label} (${nextPrompt.intervalNumber}/6)`);
        setCurrentPromptInfo({
          timeLabel: nextPrompt.label,
          scheduleKey: nextPrompt.intervalNumber.toString()
        });
        setMoodModalVisible(true);
      }

    } catch (error) {
      console.error('Error checking for mood prompt:', error);
    }
  };

  // Show welcome mood prompt for new login sessions
  const showWelcomeMoodPrompt = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const scheduleKey = `moodSchedule_${regNo}_${today}`;
      const scheduleData = await AsyncStorage.getItem(scheduleKey);

      // If no schedule exists or no prompts completed, show welcome check-in
      if (!scheduleData) {
        console.log('🌟 Showing welcome mood prompt for new session');
        setCurrentPromptInfo({ timeLabel: 'Welcome Check-in', scheduleKey: 'welcome' });
        setMoodModalVisible(true);
      }
    } catch (error) {
      console.error('Error showing welcome mood prompt:', error);
    }
  };

  // Record that mood prompt was completed
  const recordMoodPromptCompleted = async (regNo: string, intervalNumber: string) => {
    try {
      const today = getTodayKey();
      const scheduleKey = `moodSchedule_${regNo}_${today}`;
      const scheduleData = await AsyncStorage.getItem(scheduleKey);

      if (!scheduleData) return;

      const schedule = JSON.parse(scheduleData);
      const interval = parseInt(intervalNumber);

      if (!schedule.completedPrompts.includes(interval)) {
        schedule.completedPrompts.push(interval);
        schedule.count = schedule.completedPrompts.length;

        await AsyncStorage.setItem(scheduleKey, JSON.stringify(schedule));
        setMoodPromptsToday(schedule.count);

        console.log(`✅ Mood prompt completed: ${interval}/6 for ${regNo}`);
      }
    } catch (error) {
      console.error('Error recording mood prompt completion:', error);
    }
  };

  // Set next mood prompt time based on schedule
  const setNextMoodPrompt = async (regNo: string) => {
    try {
      const today = getTodayKey();
      const scheduleKey = `moodSchedule_${regNo}_${today}`;
      const scheduleData = await AsyncStorage.getItem(scheduleKey);

      if (!scheduleData) return;

      const schedule = JSON.parse(scheduleData);
      const now = new Date();

      // Find next incomplete prompt
      for (const promptInfo of schedule.promptTimes) {
        const promptTime = new Date(promptInfo.time);
        const isCompleted = schedule.completedPrompts.includes(promptInfo.intervalNumber);

        if (promptTime > now && !isCompleted) {
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
    let regNo = studentRegNo;
    if (!regNo) {
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      if (storedReg) regNo = storedReg;
    }
    if (!regNo) {
      Alert.alert('Error', 'User registration not found');
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
    try {
      // Update simple mood history (one per day)
      const updatedHistory = { ...moodHistory, [today]: mood };
      setMoodHistory(updatedHistory);
      await AsyncStorage.setItem(`moodHistory_${regNo}`, JSON.stringify(updatedHistory));
      // Update daily mood entries (multiple per day)
      const moodData = MOOD_EMOJIS.find(m => m.emoji === mood);
      const newEntry = {
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
        scheduled: timeLabel,
        scheduleKey
      };
      const updatedDailyEntries = {
        ...dailyMoodEntries,
        [today]: [...(dailyMoodEntries[today] || []), newEntry]
      };
      setDailyMoodEntries(updatedDailyEntries);
      await AsyncStorage.setItem(`dailyMoodEntries_${regNo}`, JSON.stringify(updatedDailyEntries));
      // Update detailed mood entries for analytics
      const detailedEntry = {
        date: today,
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
        scheduled: timeLabel,
        scheduleKey,
        notes: input || undefined
      };
      const updatedDetailedEntries = [...detailedMoodEntries, detailedEntry];
      setDetailedMoodEntries(updatedDetailedEntries);
      await AsyncStorage.setItem(`detailedMoodEntries_${regNo}`, JSON.stringify(updatedDetailedEntries));
      console.log(`✅ Mood saved for ${regNo}: ${mood} at ${currentTime} (${timeLabel})`);
      setMoodModalVisible(false);
      setSelectedMood(null);
      setInput('');
      // Record that this prompt was completed
      if (currentPromptInfo && currentPromptInfo.scheduleKey !== 'welcome') {
        await recordMoodPromptCompleted(regNo, currentPromptInfo.scheduleKey);
      }

      // Clear current prompt info
      setCurrentPromptInfo(null);

      // Update next prompt time
      await setNextMoodPrompt(regNo);
    } catch (error) {
      console.error('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save mood');
    }
  };

  // Export mood data function
  const exportMoodData = async () => {
    let regNo = studentRegNo;
    if (!regNo) {
      const storedReg = await AsyncStorage.getItem('currentStudentReg');
      if (storedReg) regNo = storedReg;
    }

    if (!regNo) {
      Alert.alert('Error', 'User registration not found');
      return;
    }

    try {
      const exportData = {
        userRegistration: regNo,
        userName: studentName || studentUsername,
        exportDate: new Date().toISOString(),
        moodHistory: moodHistory,
        dailyMoodEntries: dailyMoodEntries,
        detailedMoodEntries: detailedMoodEntries,
        appUsageStats: appUsageStats,
        totalMoodEntries: detailedMoodEntries.length,
        dateRange: {
          firstEntry: detailedMoodEntries[0]?.date || 'No entries',
          lastEntry: detailedMoodEntries[detailedMoodEntries.length - 1]?.date || 'No entries'
        }
      };

      console.log('📁 Mood data export prepared:', JSON.stringify(exportData, null, 2));
      Alert.alert(
        '📁 Data Export Ready',
        `Your mood data has been prepared for export.\n\nTotal entries: ${detailedMoodEntries.length}\nApp usage: ${Math.floor(appUsageStats.totalTimeSpent / 60)} minutes\n\nData has been logged to console for developer access.`,
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
    return moodHistory[dateKey];
  };

  // Handle calendar cell press
  const handleCalendarPress = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = dailyMoodEntries[dateKey];

    if (dayEntries && dayEntries.length > 0) {
      const selectedDate = new Date(dateKey);
      const isToday = dateKey === getTodayKey();
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      let entriesText = `Mood entries for this day:\n\n`;
      dayEntries.forEach((entry, index) => {
        entriesText += `${index + 1}. ${entry.emoji} ${entry.label} at ${entry.time}\n`;
      });

      if (isToday) {
        entriesText += `\n🌟 This is today's mood journey!`;
      }

      Alert.alert(
        `${isToday ? '🌟 Today' : '📅'} ${dayName}, ${formattedDate}`,
        entriesText,
        [
          { text: 'Close', style: 'cancel' },
          { text: '💾 Export All Data', onPress: exportMoodData },
          ...(isToday ? [{ text: '➕ Add Mood Now', onPress: () => setMoodModalVisible(true) }] : [])
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
        `😔 No mood entries found for this date.\n\n💡 ${isToday ? 'Start tracking your mood today!' : 'You can add mood entries for any day.'}`,
        [
          { text: 'Close', style: 'cancel' },
          { text: '➕ Add Mood Now', onPress: () => setMoodModalVisible(true) }
        ]
      );
    }
  };

  // Mood Calendar Component (Enhanced)
  const MoodCalendar = () => {
    const calendar = generateCalendar();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate most selected emoji for current month
    const currentMonthEntries = Object.entries(dailyMoodEntries)
      .filter(([date]) => {
        const entryDate = new Date(date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .flatMap(([_, entries]) => entries);

    const emojiCounts = currentMonthEntries.reduce((counts: {[key: string]: number}, entry) => {
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
          <Text style={{ color: Colors.text, fontSize: 50, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.50)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}>
              Mood Calendar
            </Text>
          <Text style={{ color: Colors.primary, fontSize: 20, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2  }}>
            Most Selected Mood This Month : {mostSelectedEmoji}
          </Text>
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
          {calendar.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={{ width: 50, height: 60, alignItems: 'center', justifyContent: 'center', margin: 4, backgroundColor: Colors.white, borderRadius: 15, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: Colors.border }}
              onPress={() => day && handleCalendarPress(day)}
              disabled={!day}
            >
              {day && (
                <>
                  {getMoodForDate(day) && (
                    <Text style={{ fontSize: 20 }}>{getMoodForDate(day)}</Text>
                  )}
                  <Text style={{ color: Colors.text, fontSize: 10, marginTop: 4, fontWeight: '600' }}>{day}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Animated Bubble Background (only visible on Home tab) */}
      {activeTab === 'home' && (
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
      )}
      {/* Floating Action Buttons - Only show on Home tab */}
      {activeTab === 'home' && (
        <View style={{ position: 'absolute', top: 42, right: 20, zIndex: 20, flexDirection: 'row', alignItems: 'center' }}>
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

          {/* AI Button */}
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, borderWidth: 2, borderColor: Colors.primary }}
            onPress={() => router.push('./ai')}
          >
            <Image source={require('@/assets/images/chat bot.png')} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
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
      <Modal visible={moodModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryOverlay }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 30, alignItems: 'center', width: 360, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.accent }}
          >
            <Text style={{ fontSize: 28, marginBottom: 10, color: Colors.text, fontWeight: 'bold', textAlign: 'center' }}>🌟 Mood Check-In</Text>
            <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 25 }}>
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
        </View>
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
                notifications.map((notification) => (
                  <View key={notification.id} style={{
                    backgroundColor: !notification.is_read ? Colors.accent + '10' : Colors.white,
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: !notification.is_read ? Colors.primary : Colors.border,
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
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        {!notification.is_read && (
                          <TouchableOpacity
                            style={{ backgroundColor: Colors.primary, borderRadius: 15, padding: 8 }}
                            onPress={() => markNotificationAsRead(notification.id)}
                          >
                            <Ionicons name="checkmark" size={16} color={Colors.white} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {notification.priority === 'high' && (
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
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Support Self</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ width: '45%', height: 120, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary }} onPress={() => router.push(`./message?registration=${studentRegNo}`)}>
                  <Image source={require('@/assets/images/message.png')} style={{ width: 60, height: 60, marginBottom: 8 }} />
                  <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>Messages</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Setting Tab Content */}
        {activeTab === 'setting' && (
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 10, backgroundColor: Colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border }}>
            <Image source={profilePics[selectedProfilePic]} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: Colors.accent }} />
            <Text style={{ color: Colors.text, fontSize: 24, fontWeight: 'bold', marginTop: 15 }}>
              {profile?.name}
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 16, marginTop: 5 }}>
              {profile?.course}
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 5 }}>
              Registration: {profile?.registration_number}
            </Text>

            {/* Profile Picture Selector */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, width: '100%' }}>
              {profilePics.map((pic, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedProfilePic(index)}
                  style={{ margin: 5, borderRadius: 25, borderWidth: selectedProfilePic === index ? 3 : 0, borderColor: Colors.accent }}
                >
                  <Image source={pic} style={{ width: 40, height: 40, borderRadius: 20 }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* App Usage Stats */}
            <View style={{ marginTop: 20, width: '100%', backgroundColor: Colors.backgroundLight, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>📊 App Usage Statistics</Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                Total time spent: {Math.floor(appUsageStats.totalTimeSpent / 60)} minutes
              </Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                Sessions: {appUsageStats.sessionCount}
              </Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                Last active: {appUsageStats.lastSessionTime ? new Date(appUsageStats.lastSessionTime).toLocaleDateString() : 'Never'}
              </Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                Mood entries: {detailedMoodEntries.length}
              </Text>
            </View>
          </View>
        )}

        {/* Mood Calendar Tab */}
        {activeTab === 'mood' && (
          <MoodCalendar />
        )}
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: Colors.white, paddingVertical: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 5, elevation: 6, borderTopWidth: 3, borderTopColor: Colors.primary }}>
        {TABS.map(tab => (
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
