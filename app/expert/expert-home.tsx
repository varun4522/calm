import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { uploadFile } from '../../api/Library';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

// Mood tracking constants
const MOOD_EMOJIS = [
  { emoji: '😄', label: 'Happy' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
];

const TABS = [
  { key: 'home', icon: '🏠' },
  { key: 'connect', icon: '🔗' },
  { key: 'mood', icon: '😊' },
];

function getTodayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function ExpertHome() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [expertName, setExpertName] = useState('');
  const [expertRegNo, setExpertRegNo] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'connect' | 'mood'>('home');

  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'Academic Resources',
  });

  // Mood tracking states
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<{[key: string]: string}>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dailyMoodEntries, setDailyMoodEntries] = useState<{[key: string]: {emoji: string, label: string, time: string}[]}>({});
  const [detailedMoodEntries, setDetailedMoodEntries] = useState<{date: string, emoji: string, label: string, time: string, notes?: string}[]>([]);
  const [nextMoodPrompt, setNextMoodPrompt] = useState<Date | null>(null);
  const [currentPromptInfo, setCurrentPromptInfo] = useState<{timeLabel: string, scheduleKey: string} | null>(null);

  const categories = [
    'Academic Resources',
    'Study Guides',
    'Mental Health',
    'Career Support',
    'Life Skills'
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

  // Add state for expert data from user_requests table
  const [expertData, setExpertData] = useState<any>(null);
  const [expertProfile, setExpertProfile] = useState({
    specialization: '',
    experience: '',
    qualifications: '',
    bio: '',
    email: '',
    phone: '',
    rating: '0.0'
  });

  useEffect(() => {
    const loadExpertData = async () => {
      try {
        let regNo = params.registration;
        let expertName = '';

        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentExpertReg');
          if (storedReg) regNo = storedReg;
        }

        if (regNo) {
          setExpertRegNo(regNo);

          // First, try to get name from AsyncStorage for immediate display
          const storedName = await AsyncStorage.getItem('currentExpertName');
          if (storedName) {
            setExpertName(storedName);
            expertName = storedName;
          }

          // Load expert data from user_requests table
          console.log('Loading expert data from user_requests table for:', regNo);
          try {
            const { data: expertUserData, error } = await supabase
              .from('user_requests')
              .select('*')
              .eq('registration_number', regNo)
              .eq('user_type', 'Expert')
              .single();

            if (error) {
              console.error('Error loading expert from user_requests table:', error);
              // If not found in user_requests, keep using stored name
            } else if (expertUserData) {
              console.log('Successfully loaded expert data from user_requests table:', expertUserData);
              setExpertData(expertUserData);

              // Update expert name if found in database
              if (expertUserData.user_name) {
                setExpertName(expertUserData.user_name);
                expertName = expertUserData.user_name;
                // Update stored name for future use
                await AsyncStorage.setItem('currentExpertName', expertUserData.user_name);
              }

              // Set expert profile data
              setExpertProfile({
                specialization: expertUserData.specialization || expertUserData.course || 'Mental Health Expert',
                experience: expertUserData.experience || '5+ years',
                qualifications: expertUserData.qualifications || 'Licensed Professional',
                bio: expertUserData.bio || `Expert specializing in ${expertUserData.specialization || 'Mental Health'}`,
                email: expertUserData.email || '',
                phone: expertUserData.phone || '',
                rating: expertUserData.rating ? expertUserData.rating.toString() : '4.8'
              });
            }
          } catch (dbError) {
            console.error('Database error loading expert:', dbError);
            // Continue with stored data
          }
        }
      } catch (error) {
        console.error('Error loading expert data:', error);
      }
    };

    loadExpertData();
  }, [params.registration]);

  // Save expert persistent/session data
  const saveExpertDataToPersistentStorage = async (regNo: string, data: any) => {
    try {
      await AsyncStorage.setItem(`persistentExpertData_${regNo}`, JSON.stringify(data));
      await AsyncStorage.setItem('currentExpertData', JSON.stringify(data));
    } catch (err) {
      console.error('Error saving expert persistent data:', err);
    }
  };

  const loadBookedSessions = async () => {
    setLoading(true);
    try {
      // Get booked sessions from AsyncStorage (in real app, this would be from database)
      const sessionData = await AsyncStorage.getItem('psychologistSessions');
      if (sessionData) {
        const sessions = JSON.parse(sessionData);

        // Filter sessions for current expert based on name
        const expertSessions = sessions.filter((session: any) =>
          session.psychologistName === expertName ||
          session.psychologistId === expertName.toLowerCase().replace(' ', '')
        );

        setBookedSessions(expertSessions);
      } else {
        // No mock data - load real sessions from database
        console.log('No sessions found for expert:', expertName);
        setBookedSessions([]);
      }
    } catch (error) {
      console.error('Error loading booked sessions:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('currentExpertReg');
      await AsyncStorage.removeItem('currentExpertName');
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/');
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
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'image/jpeg',
          'image/png'
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file size (max 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
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
    if (!uploadForm.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the resource');
      return;
    }

    if (!uploadForm.description.trim()) {
      Alert.alert('Error', 'Please enter a description for the resource');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    try {
      setUploadLoading(true);

      // Create resource data for database
      const resourceData = {
        title: uploadForm.title,
        description: uploadForm.description,
        file_url: selectedFile.uri, // In production, this would be the cloud storage URL after upload
        file_name: selectedFile.name,
        file_type: selectedFile.mimeType || 'application/octet-stream',
        file_size: selectedFile.size || 0,
        uploaded_by: expertRegNo,
        uploaded_by_name: expertName,
        uploaded_by_type: 'expert',
        category: uploadForm.category,
        tags: [uploadForm.category.toLowerCase()],
        download_count: 0,
        created_at: new Date().toISOString(),
      };

      // Insert into learning_resources table
      const { data, error } = await supabase
        .from('learning_resources')
        .insert([resourceData])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          Alert.alert(
            'Database Setup Required',
            'The learning_resources table needs to be created in Supabase. Please contact your administrator to set up the database schema.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Upload Failed', 'Failed to save resource to database. Please try again.');
        }
        return;
      }

      Alert.alert(
        'Upload Successful!',
        `${uploadForm.title} (${selectedFile.name}) has been uploaded successfully and is now available to students in the Learning Support section. Students will see this resource immediately.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowUploadModal(false);
              setSelectedFile(null);
              setUploadForm({ title: '', description: '', category: 'Academic Resources' });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'There was an error uploading the file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const openUploadModal = () => {
    setSelectedFile(null);
    setUploadForm({ title: '', description: '', category: 'Academic Resources' });
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

    const emojiCounts = currentMonthEntries.reduce((counts: {[key: string]: number}, entry) => {
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

        {/* AI Floating Button - Only show on Home tab */}
        <View style={{ position: 'absolute', top: 42, right: 20, zIndex: 20 }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5, borderWidth: 2, borderColor: Colors.primary }}
            onPress={() => router.push('/student/ai')}
          >
            <Text style={{ fontSize: 22, color: Colors.primary }}>🤖</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, width: '100%', paddingHorizontal: 16 }}>
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 8 }}>
              Welcome, {expertName}
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
                <Text style={styles.matrixButtonText}>View Clients</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.matrixButton}
                onPress={() => router.push(`./consultation?expertReg=${encodeURIComponent(expertRegNo)}&studentName=General&studentReg=&studentEmail=`)}
              >
                <Text style={styles.buttonIcon}>💬</Text>
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
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>{expertRegNo}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Specialization:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>Mental Health Support</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: Colors.textSecondary }}>Role:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary }}>Mental Health Expert</Text>
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
  } else if (activeTab === 'connect') {

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
                    <Text style={styles.fileUploadText}>Select File (PDF, DOC, etc.)</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.fileUploadHint}>
                  Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG (Max: 10MB)
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
                onPress={async () => {
                    const uri = selectedFile?.uri;
                    let output_path = "";

                    if (uri) {
                      try {
                        const path = await uploadFile(uri);
                        console.log("OUTPUT PATH - ", path);
                        output_path = path || "";
                      } catch (err) {
                        console.log("Upload failed:", err);
                      }
                    } else {
                      Alert.alert("No file selected.");
                    }
                    const resourceDataToBeUploaded = {
                      resource_title: uploadForm.title,
                      description: uploadForm.description,
                      file_url: output_path, // In production, this would be the cloud storage URL after upload
                      category: uploadForm.category.toUpperCase().replace(" ", "_"),
                    };
                    const {data, error} = await supabase.from("library").insert(resourceDataToBeUploaded);
                    console.log("DATA - ", data);
                    console.log("ERROR - ", error);
                  }}
                disabled={uploadLoading}
                activeOpacity={0.3}
                delayPressIn={0}
              >
                {uploadLoading ? (
                  <View style={styles.uploadLoadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.modalUploadButtonText}>Uploading...</Text>
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
              Hi {expertName}! How are you feeling right now?
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
          onPress={() => router.push('./expert-connect')}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 40, borderRadius: 20, backgroundColor: 'transparent' }}>
            <Text style={{ fontSize: 35, color: activeTab === 'connect' ? Colors.primary : Colors.tertiary, textShadowColor: activeTab === 'connect' ? Colors.accentLight : 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>🔗</Text>
          </View>
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
    textAlign:'center'
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
  // Session styles for Connect tab
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});
