import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function ExpertSetting() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [expertName, setExpertName] = useState('');
  const [expertRegNo, setExpertRegNo] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings states
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
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [choosePicModal, setChoosePicModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Expert data states
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

          // Load settings-specific data (profile pic)
          try {
            const picIdx = await AsyncStorage.getItem(`expertProfilePic_${regNo}`);
            if (picIdx !== null) setSelectedProfilePic(parseInt(picIdx, 10));
          } catch (e) {
            console.warn('Expert profile pic load warning:', e);
          }
        }
      } catch (error) {
        console.error('Error loading expert data:', error);
      }
    };

    loadExpertData();
  }, [params.registration]);

  // Profile pic fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleSelectExpertProfilePic = async (index: number) => {
    setSelectedProfilePic(index);
    setChoosePicModal(false);
    try {
      const regNo = expertRegNo;
      if (regNo) {
        await AsyncStorage.setItem(`expertProfilePic_${regNo}`, index.toString());
        const persistentData = await AsyncStorage.getItem(`persistentExpertData_${regNo}`);
        const data = persistentData ? JSON.parse(persistentData) : {};
        data.profilePicIndex = index;
        await AsyncStorage.setItem(`persistentExpertData_${regNo}`, JSON.stringify(data));
        await AsyncStorage.setItem('currentExpertData', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error saving expert profile pic:', err);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.exSettingContainer}>
          {/* Profile picture */}
          <Animated.View style={[styles.exProfilePicContainer, { opacity: fadeAnim }]}>
            <View style={{
              shadowColor: Colors.shadow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}>
              <Image source={profilePics[selectedProfilePic]} style={styles.exProfilePic} />
            </View>
          </Animated.View>
          <Text style={styles.exWelcomeText}>Welcome, Dr. {expertName || 'Expert'}!</Text>

          <TouchableOpacity style={styles.exEditPhotoBtn} onPress={() => setChoosePicModal(true)}>
            <Text style={styles.exEditPhotoText}>Edit your profile photo</Text>
          </TouchableOpacity>

          {/* Expert Information */}
          <View style={styles.exInfoBox}>
            <View style={styles.exSectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle" size={24} color={Colors.primary} />
                <Text style={styles.exSectionTitle}>Expert Information</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={async () => {
                  // Refresh expert data from user_requests table
                  if (expertRegNo) {
                    setLoading(true);
                    try {
                      const { data: expertUserData, error } = await supabase
                        .from('user_requests')
                        .select('*')
                        .eq('registration_number', expertRegNo)
                        .eq('user_type', 'Expert')
                        .single();

                      if (!error && expertUserData) {
                        setExpertData(expertUserData);
                        setExpertName(expertUserData.user_name);
                        setExpertProfile({
                          specialization: expertUserData.specialization || expertUserData.course || 'Mental Health Expert',
                          experience: expertUserData.experience || '5+ years',
                          qualifications: expertUserData.qualifications || 'Licensed Professional',
                          bio: expertUserData.bio || `Expert specializing in ${expertUserData.specialization || 'Mental Health'}`,
                          email: expertUserData.email || '',
                          phone: expertUserData.phone || '',
                          rating: expertUserData.rating ? expertUserData.rating.toString() : '4.8'
                        });
                        Alert.alert('Success', 'Expert data refreshed from database');
                      } else {
                        Alert.alert('Info', 'No updated data found in database');
                      }
                    } catch (error) {
                      console.error('Error refreshing expert data:', error);
                      Alert.alert('Error', 'Failed to refresh data from database');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="person-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Full Name</Text>
                <Text style={styles.exInfoValue}>{expertName || 'Not available'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="id-card-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Registration ID</Text>
                <Text style={styles.exInfoValue}>{expertRegNo || 'Not available'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="briefcase-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Specialization</Text>
                <Text style={styles.exInfoValue}>{expertProfile.specialization || 'Mental Health Expert'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="time-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Experience</Text>
                <Text style={styles.exInfoValue}>{expertProfile.experience || '5+ years'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Email</Text>
                <Text style={styles.exInfoValue}>{expertProfile.email || 'Not available'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="call-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Phone</Text>
                <Text style={styles.exInfoValue}>{expertProfile.phone || 'Not available'}</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="star-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Rating</Text>
                <Text style={styles.exInfoValue}>{expertProfile.rating || '4.8'} ⭐</Text>
              </View>
            </View>

            <View style={styles.exInfoRow}>
              <View style={styles.exStatIcon}>
                <Ionicons name="school-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.exStatContent}>
                <Text style={styles.exInfoLabel}>Qualifications</Text>
                <Text style={styles.exInfoValue}>{expertProfile.qualifications || 'Licensed Professional'}</Text>
              </View>
            </View>

          {/* Logout */}
          <TouchableOpacity style={styles.exLogoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#d84315" style={{ marginRight: 8 }} />
            <Text style={styles.exLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Profile Picture Selection Modal */}
      <Modal visible={choosePicModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.exChoosePicModalContent}>
            <Text style={styles.exModalTitle}>Choose Profile Photo</Text>
            <View style={styles.exPicGridContainer}>
              {Array.from({ length: Math.ceil(profilePics.length / 4) }).map((_, rowIdx) => (
                <View key={rowIdx} style={styles.exPicGridRow}>
                  {profilePics.slice(rowIdx * 4, rowIdx * 4 + 4).map((pic, idx) => (
                    <Pressable key={rowIdx * 4 + idx} onPress={() => handleSelectExpertProfilePic(rowIdx * 4 + idx)}>
                      <Image source={pic} style={[
                        styles.exPicOption,
                        selectedProfilePic === rowIdx * 4 + idx && styles.exSelectedPicOption,
                      ]} />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setChoosePicModal(false)} style={styles.exClosePicModalBtn}>
              <Text style={styles.exClosePicModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 20,
  },
  exSettingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 24,
    width: '100%',
  },
  exProfilePicContainer: {
    overflow: 'hidden',
    borderRadius: 65,
    width: 130,
    height: 130,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.accent,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  exProfilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    resizeMode: 'cover',
  },
  exWelcomeText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  exEditPhotoBtn: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exEditPhotoText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  exInfoBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exInfoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  exInfoValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  exInfoRow: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    color: Colors.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  exSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exStatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  exLogoutBtn: {
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  exLogoutText: {
    color: Colors.error,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  exChoosePicModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: 340,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  exModalTitle: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  exPicGridContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
  },
  exPicGridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exPicOption: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: Colors.border,
    marginHorizontal: 8,
    resizeMode: 'cover',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exSelectedPicOption: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  exClosePicModalBtn: {
    marginTop: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exClosePicModalText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Refresh button styles
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: Colors.accent + '20',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
