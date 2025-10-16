import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toByteArray } from 'base64-js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import Toast from 'react-native-toast-message';
import { useInsertNotification } from '@/api/Notifications';

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
  const [activeTab, setActiveTab] = useState<'home' | 'mood'>('home');

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
  const [dailyMoodEntries, setDailyMoodEntries] = useState<{ [key: string]: { emoji: string, label: string, time: string }[] }>({});
  const [detailedMoodEntries, setDetailedMoodEntries] = useState<{ date: string, emoji: string, label: string, time: string, notes?: string }[]>([]);
  const [nextMoodPrompt, setNextMoodPrompt] = useState<Date | null>(null);
  const [currentPromptInfo, setCurrentPromptInfo] = useState<{ timeLabel: string, scheduleKey: string } | null>(null);

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
    bubbleAnimations.forEach((_, i) => startBubbleLoop(i));
  }, [bubbleAnimations, startBubbleLoop]);


  // Load notifications when expert data is available
  useEffect(() => {
    if (expertRegNo) {
      loadNotifications();
    }
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
      const unread = (data || []).filter(notification => !notification.is_read).length;
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
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: now, updated_at: now }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mood tracking functions
  const loadMoodData = async () => {
    try {
      const regNo = expertRegNo || 'expert_default';

      // Load mood history
      const moodHistoryData = await AsyncStorage.getItem(`expertMoodHistory_${regNo}`);
      if (moodHistoryData) {
        setMoodHistory(JSON.parse(moodHistoryData));
      }

      // Load daily mood entries
      const dailyEntriesData = await AsyncStorage.getItem(`expertDailyMoodEntries_${regNo}`);
      if (dailyEntriesData) {
        setDailyMoodEntries(JSON.parse(dailyEntriesData));
      }

      // Load detailed mood entries
      const detailedEntriesData = await AsyncStorage.getItem(`expertDetailedMoodEntries_${regNo}`);
      if (detailedEntriesData) {
        setDetailedMoodEntries(JSON.parse(detailedEntriesData));
      }

      // Load next mood prompt; if not present, schedule the next one
      const nextPromptData = await AsyncStorage.getItem(`expertNextMoodPrompt_${regNo}`);
      if (nextPromptData) {
        setNextMoodPrompt(new Date(nextPromptData));
      } else {
        await setNextMoodPromptTime(regNo);
      }
    } catch (error) {
      console.error('Error loading mood data:', error);
    }
  };

  const saveMood = async (mood: string) => {
    try {
      const regNo = expertRegNo || 'expert_default';
      const today = getTodayKey();
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Update simple mood history (one per day)
      const updatedHistory = { ...moodHistory, [today]: mood };
      setMoodHistory(updatedHistory);
      await AsyncStorage.setItem(`expertMoodHistory_${regNo}`, JSON.stringify(updatedHistory));

      // Update daily mood entries (multiple per day)
      const moodData = MOOD_EMOJIS.find(m => m.emoji === mood);
      const newEntry = {
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
      };

      const updatedDailyEntries = {
        ...dailyMoodEntries,
        [today]: [...(dailyMoodEntries[today] || []), newEntry]
      };
      setDailyMoodEntries(updatedDailyEntries);
      await AsyncStorage.setItem(`expertDailyMoodEntries_${regNo}`, JSON.stringify(updatedDailyEntries));

      // Update detailed mood entries for analytics
      const detailedEntry = {
        date: today,
        emoji: mood,
        label: moodData?.label || 'Unknown',
        time: currentTime,
      };

      const updatedDetailedEntries = [...detailedMoodEntries, detailedEntry];
      setDetailedMoodEntries(updatedDetailedEntries);
      await AsyncStorage.setItem(`expertDetailedMoodEntries_${regNo}`, JSON.stringify(updatedDetailedEntries));

      console.log(`✅ Expert mood saved for ${regNo}: ${mood} at ${currentTime}`);
      setMoodModalVisible(false);
      setSelectedMood(null);

      // Set next mood prompt (6 times daily)
      await setNextMoodPromptTime(regNo);

    } catch (error) {
      console.error('Error saving expert mood:', error);
      Alert.alert('Error', 'Failed to save mood');
    }
  };

  const setNextMoodPromptTime = async (regNo: string) => {
    const now = new Date();
    const moodTimes = [
      { hour: 8, minute: 0 },   // 8:00 AM
      { hour: 11, minute: 0 },  // 11:00 AM
      { hour: 14, minute: 0 },  // 2:00 PM
      { hour: 17, minute: 0 },  // 5:00 PM
      { hour: 20, minute: 0 },  // 8:00 PM
      { hour: 22, minute: 0 },  // 10:00 PM
    ];

    let nextPrompt = null;

    // Find the next mood prompt time today
    for (const time of moodTimes) {
      const promptTime = new Date();
      promptTime.setHours(time.hour, time.minute, 0, 0);

      if (promptTime > now) {
        nextPrompt = promptTime;
        break;
      }
    }

    // If no more prompts today, set first prompt tomorrow
    if (!nextPrompt) {
      nextPrompt = new Date();
      nextPrompt.setDate(nextPrompt.getDate() + 1);
      nextPrompt.setHours(8, 0, 0, 0);
    }

    setNextMoodPrompt(nextPrompt);
    await AsyncStorage.setItem(`expertNextMoodPrompt_${regNo}`, nextPrompt.toISOString());
  };

  const checkMoodPrompt = () => {
    if (!nextMoodPrompt) return;

    const now = new Date();
    if (now >= nextMoodPrompt) {
      setMoodModalVisible(true);
      setCurrentPromptInfo({ timeLabel: 'Scheduled Check', scheduleKey: 'scheduled' });
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
        `😔 No mood entries found for this date.\n\n💡 ${isToday ? 'Start tracking your mood today!' : 'You can add mood entries for any day.'}`,
        [
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  // Load mood data on component mount
  useEffect(() => {
    if (expertRegNo) {
      loadMoodData();
    }
  }, [expertRegNo]);

  // Check for mood prompts every minute
  useEffect(() => {
    const interval = setInterval(checkMoodPrompt, 60000);
    return () => clearInterval(interval);
  }, [nextMoodPrompt]);

  // Immediately check if a prompt is due when nextMoodPrompt changes (no waiting for interval)
  useEffect(() => {
    checkMoodPrompt();
  }, [nextMoodPrompt]);

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
        encoding: FileSystem.EncodingType.Base64,
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
            {calendar.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={{ width: 45, height: 55, alignItems: 'center', justifyContent: 'center', margin: 3, backgroundColor: Colors.white, borderRadius: 12, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: Colors.border }}
                onPress={() => day && handleCalendarPress(day)}
                disabled={!day}
              >
                {day && (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {getMoodForDate(day) && (
                      <Text style={{ fontSize: 18, marginBottom: 2, textAlign: 'center' }}>{getMoodForDate(day)}</Text>
                    )}
                    <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{day}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

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

        {/* Help Floating Button removed as per requirement: Help only on Select page */}

        {/* Top Right Actions - Notification Bell and AI Button */}
        <View style={{ position: 'absolute', top: 42, right: 20, zIndex: 20, flexDirection: 'row', gap: 12 }}>
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

          {/* AI Floating Button */}
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, borderWidth: 2, borderColor: Colors.primary }}
            onPress={() => router.push('/student/ai')}
          >
            <Image source={require('../../assets/images/chat bot.png')} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
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
                onPress={() => router.push(`./consultation?expertReg=${encodeURIComponent(expertRegNo)}&studentName=General&studentReg=&studentEmail=`)}
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
      <Modal visible={moodModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primaryOverlay }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 30, alignItems: 'center', width: 360, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, borderWidth: 2, borderColor: Colors.accent }}
          >
            <Text style={{ fontSize: 28, marginBottom: 10, color: Colors.text, fontWeight: 'bold', textAlign: 'center' }}>🌟 Expert Mood Check-In</Text>
            <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 25 }}>
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
        </View>
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
