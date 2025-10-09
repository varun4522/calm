import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

const profilePics = [
  require('../../assets/images/profile/pic1.png'),
  require('../../assets/images/profile/pic2.png'),
  require('../../assets/images/profile/pic3.png'),
  require('../../assets/images/profile/pic4.png'),
  require('../../assets/images/profile/pic5.png'),
  require('../../assets/images/profile/pic6.png'),
  require('../../assets/images/profile/pic7.png'),
  require('../../assets/images/profile/pic8.png'),
  require('../../assets/images/profile/pic9.png'),
  require('../../assets/images/profile/pic10.png'),
  require('../../assets/images/profile/pic11.png'),
  require('../../assets/images/profile/pic12.png'),
  require('../../assets/images/profile/pic13.png'),
];

export default function StudentSetting() {
  const params = useLocalSearchParams<{ registration: string }>();
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [choosePicModal, setChoosePicModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentCourse, setStudentCourse] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentYear, setStudentYear] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [accountCreatedAt, setAccountCreatedAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [studentRegNo, setStudentRegNo] = useState(params.registration || '');
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial value for opacity: 0

  // Save student data to persistent storage
  const saveStudentDataToPersistentStorage = async (regNo: string, data: any) => {
    try {
      // Save to user-specific storage (persistent across sessions)
      await AsyncStorage.setItem(`persistentStudentData_${regNo}`, JSON.stringify(data));
      // Also update current session data
      await AsyncStorage.setItem('currentStudentData', JSON.stringify(data));
      console.log("Student data saved to persistent storage");
    } catch (error) {
      console.error('Error saving student data to persistent storage:', error);
    }
  };

  // Load all user data using the registration number from params
  useEffect(() => {
    let regNo = params.registration;
    const loadStudentData = async () => {
      if (!regNo) {
        // Try to get from AsyncStorage if not in params
        regNo = (await AsyncStorage.getItem('currentStudentReg')) ?? '';
      }
      if (!regNo) {
        console.log("No registration number provided in params or AsyncStorage");
        setStudentRegNo('');
        setIsLoading(false);
        return;
      }
      setStudentRegNo(regNo);
      setIsLoading(true);
      try {
        console.log(`Loading data for student: ${regNo}`);
        // Batch load from AsyncStorage - check persistent data first
        const [picIdx, persistentData, sessionData] = await Promise.all([
          AsyncStorage.getItem(`profilePic_${regNo}`),
          AsyncStorage.getItem(`persistentStudentData_${regNo}`),
          AsyncStorage.getItem('currentStudentData')
        ]);

        if (picIdx !== null) {
          setSelectedProfilePic(parseInt(picIdx, 10));
        }

        // Use persistent data first, then session data, then fetch from Supabase
        let studentData = null;
        if (persistentData) {
          studentData = JSON.parse(persistentData);
          console.log("Loaded student data from persistent storage");
        } else if (sessionData) {
          studentData = JSON.parse(sessionData);
          console.log("Loaded student data from session storage");
        }

        if (studentData) {
          setStudentName(studentData.name || studentData.user_name || '');
          setStudentUsername(studentData.username || '');
          setStudentEmail(studentData.email || '');
          setStudentCourse(studentData.course || '');
          setStudentPhone(studentData.phone || '');
          setStudentYear(studentData.year || '');
          setStudentStatus(studentData.status || '');
          setAccountCreatedAt(studentData.created_at || '');
          // Ensure registration number is correctly set
          if (studentData.registration_number && !studentData.registration) {
            studentData.registration = studentData.registration_number;
          }
          // Save to persistent storage for future use
          await saveStudentDataToPersistentStorage(regNo, studentData);
        } else {
          console.log("No cached data found, fetching from Supabase user_requests table");
          // Fetch fresh student data from user_requests table in Supabase
          const { data, error } = await supabase
            .from('user_requests')
            .select('*')
            .eq('registration_number', regNo)
            .eq('user_type', 'Student')
            .eq('status', 'approved')
            .maybeSingle();

          if (error) {
            console.error('Error fetching student data from user_requests:', error);
            Alert.alert('Database Error', `Failed to load student data: ${error.message}`);
          } else if (data) {
            console.log('Successfully fetched student data from user_requests table:', data);
            const formattedData = {
              name: data.name || data.user_name || 'Unknown Student',
              user_name: data.name || data.user_name || 'Unknown Student',
              username: data.username || '',
              registration: data.registration_number,
              registration_number: data.registration_number,
              email: data.email || '',
              course: data.course || '',
              phone: data.phone || '',
              year: data.year || '',
              user_type: data.user_type,
              status: data.status,
              created_at: data.created_at,
              updated_at: data.updated_at
            };
            setStudentName(formattedData.name);
            setStudentUsername(formattedData.username);
            setStudentEmail(formattedData.email);
            setStudentCourse(formattedData.course);
            setStudentPhone(formattedData.phone);
            setStudentYear(formattedData.year);
            setStudentStatus(formattedData.status);
            setAccountCreatedAt(formattedData.created_at);
            // Save fetched data to persistent storage
            await saveStudentDataToPersistentStorage(regNo, formattedData);
          } else {
            console.log('No student data found in user_requests table for registration:', regNo);
            Alert.alert('No Data', 'No student record found in the database');
          }
        }
      } catch (error) {
        console.error('Error loading student data:', error);
        Alert.alert('Error', 'Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [params.registration]);

  // Handle profile picture selection and save to AsyncStorage
  const handleSelectProfilePic = async (index: number) => {
    setSelectedProfilePic(index);
    setChoosePicModal(false);
    try {
      const regNo = studentRegNo; // Use the state value instead of params
      if (regNo) {
        // Save profile picture index
        await AsyncStorage.setItem(`profilePic_${regNo}`, index.toString());

        // Update persistent student data with current profile picture
        const persistentData = await AsyncStorage.getItem(`persistentStudentData_${regNo}`);
        if (persistentData) {
          const data = JSON.parse(persistentData);
          data.profilePicIndex = index;
          await saveStudentDataToPersistentStorage(regNo, data);
        }

        console.log("Profile picture saved successfully");
        // Navigate to home page after changing profile picture
        router.replace(`./student-home?registration=${regNo}`);
      }
    } catch (error) {
      console.error('Error saving profile pic:', error);
      Alert.alert('Error', 'Failed to save profile picture');
    }
  };

  // Refresh data from user_requests table
  const refreshStudentData = async () => {
    if (!studentRegNo) return;

    setIsLoading(true);
    try {
      console.log('Refreshing student data from user_requests table...');
      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .eq('registration_number', studentRegNo)
        .eq('user_type', 'Student')
        .eq('status', 'approved')
        .maybeSingle();

      if (error) {
        console.error('Error refreshing student data:', error);
        Alert.alert('Database Error', `Failed to refresh student data: ${error.message}`);
      } else if (data) {
        console.log('Successfully refreshed student data:', data);
        const formattedData = {
          name: data.name || data.user_name || 'Unknown Student',
          user_name: data.name || data.user_name || 'Unknown Student',
          username: data.username || '',
          registration: data.registration_number,
          registration_number: data.registration_number,
          email: data.email || '',
          course: data.course || '',
          phone: data.phone || '',
          user_type: data.user_type,
          created_at: data.created_at,
          updated_at: data.updated_at
        };

        // Update state with fresh data
        setStudentName(formattedData.user_name);
        setStudentUsername(formattedData.username);
        setStudentEmail(formattedData.email);
        setStudentCourse(formattedData.course);
        setStudentPhone(formattedData.phone);
        setAccountCreatedAt(formattedData.created_at);

        // Save refreshed data to storage
        await saveStudentDataToPersistentStorage(studentRegNo, formattedData);
        Alert.alert('Success', 'Student data refreshed successfully!');
      } else {
        Alert.alert('No Data', 'No student record found in the database');
      }
    } catch (error) {
      console.error('Error refreshing student data:', error);
      Alert.alert('Error', 'An error occurred while refreshing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Only clear current session data, keep persistent data for future logins
      await AsyncStorage.removeItem('currentStudentReg');
      await AsyncStorage.removeItem('currentStudentData');

      console.log("Logout successful - persistent data preserved");
      // Navigate back to index screen
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      router.replace('/');
    }
  };

  // Fade in animation for profile picture
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (isLoading) {
    return (
      <LinearGradient
        colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshStudentData}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Section with ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingContainer}>
        <Animated.View style={[styles.profilePicContainer, { opacity: fadeAnim }]}>
          <View style={{
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}>
            <Image source={profilePics[selectedProfilePic]} style={styles.profilePic} />
          </View>
        </Animated.View>
        <Text style={styles.welcomeText}>Welcome, {studentName}!</Text>

        <TouchableOpacity style={styles.editPhotoBtn} onPress={() => setChoosePicModal(true)}>
          <Text style={styles.editPhotoText}>Edit your profile photo</Text>
        </TouchableOpacity>

        {/* Student Information */}
        <View style={styles.infoBox}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person-circle" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Student Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="person-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{studentName || 'Not available'}</Text>
            </View>
          </View>

          {studentUsername && (
            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="at-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>@{studentUsername}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="id-card-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Registration Number</Text>
              <Text style={styles.infoValue}>{studentRegNo || params.registration || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{studentEmail || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="school-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{studentCourse || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="call-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{studentPhone || 'Not provided'}</Text>
            </View>
          </View>

          {studentYear && (
            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Year</Text>
                <Text style={styles.infoValue}>{studentYear}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text style={[styles.infoValue, styles.statusText]}>
                {studentStatus ? studentStatus.charAt(0).toUpperCase() + studentStatus.slice(1) : 'Active'}
              </Text>
            </View>
          </View>

          {accountCreatedAt && (
            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="time-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(accountCreatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#d84315" style={{marginRight: 8}} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Profile Picture Selection Modal */}
      <Modal visible={choosePicModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.choosePicModalContent}>
            <Text style={styles.modalTitle}>Choose Profile Photo</Text>
            <View style={styles.picGridContainer}>
              {Array.from({ length: Math.ceil(profilePics.length / 4) }).map((_, rowIdx) => (
                <View key={rowIdx} style={styles.picGridRow}>
                  {profilePics.slice(rowIdx * 4, rowIdx * 4 + 4).map((pic, idx) => (
                    <Pressable
                      key={rowIdx * 4 + idx}
                      onPress={() => handleSelectProfilePic(rowIdx * 4 + idx)}
                    >
                      <Image source={pic} style={[
                        styles.picOption,
                        selectedProfilePic === rowIdx * 4 + idx && styles.selectedPicOption
                      ]} />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setChoosePicModal(false)} style={styles.closePicModalBtn}>
              <Text style={styles.closePicModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Light purple background
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSpacer: {
    width: 60, // Same width as the back button to balance the layout
  },
  settingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 24,
    width: '100%',
  },
  profilePicContainer: {
    overflow: 'hidden',
    borderRadius: 65,
    width: 130,
    height: 130,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.accent,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    resizeMode: 'cover',
  },
  username: {
    color: '#60a5fa', // Vibrant blue
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  welcomeText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  editPhotoBtn: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editPhotoText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoRow: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoutBtn: {
    backgroundColor: Colors.white,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.error,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  logoutText: {
    color: Colors.error,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.primaryOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choosePicModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: 340,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  picGridContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
  },
  picGridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  picOption: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: Colors.border,
    marginHorizontal: 8,
    resizeMode: 'cover',
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedPicOption: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  closePicModalBtn: {
    marginTop: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closePicModalText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    color: Colors.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '500',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dataSourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dataSourceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  statusText: {
    color: '#4caf50',
    fontWeight: '600',
  },
});
