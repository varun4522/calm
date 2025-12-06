import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated,Image, Modal, Pressable, ScrollView, StyleSheet,Text,TouchableOpacity, View} from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile, useUpdateProfilePicture } from '@/api/Profile';
import { handleLogout } from '@/api/OtherMethods';

export default function ExpertSetting() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [expertName, setExpertName] = useState('');
  const [expertRegNo, setExpertRegNo] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings states
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
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [choosePicModal, setChoosePicModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {session } = useAuth();
  const {data: profile} = useProfile(session?.user.id);
  const updateProfilePicture = useUpdateProfilePicture();

  // Load profile picture from Supabase (with AsyncStorage fallback)
  useEffect(() => {
    const loadProfilePic = async () => {
      if (profile?.id) {
        try {
          // First try to get from Supabase profile
          if (profile.profile_picture_index !== undefined && profile.profile_picture_index !== null) {
            setSelectedProfilePic(profile.profile_picture_index);
            // Also save to AsyncStorage for offline access
            await AsyncStorage.setItem(`expertProfilePic_${profile.registration_number}`, profile.profile_picture_index.toString());
          } else if (expertRegNo) {
            // Fallback to AsyncStorage if not in Supabase
            const picIdx = await AsyncStorage.getItem(`expertProfilePic_${expertRegNo}`);
            if (picIdx !== null) {
              setSelectedProfilePic(parseInt(picIdx, 10));
            }
          }
        } catch (error) {
          console.error('Error loading expert profile pic:', error);
        }
      }
    };
    loadProfilePic();
  }, [profile?.id, profile?.profile_picture_index, expertRegNo]);

  // Profile pic fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleSelectExpertProfilePic = async (index: number) => {
    setSelectedProfilePic(index);
    setChoosePicModal(false);
    try {
      if (profile?.id) {
        // Save to AsyncStorage for immediate access
        const regNo = expertRegNo || profile.registration_number;
        if (regNo) {
          await AsyncStorage.setItem(`expertProfilePic_${regNo}`, index.toString());
          const persistentData = await AsyncStorage.getItem(`persistentExpertData_${regNo}`);
          const data = persistentData ? JSON.parse(persistentData) : {};
          data.profilePicIndex = index;
          await AsyncStorage.setItem(`persistentExpertData_${regNo}`, JSON.stringify(data));
          await AsyncStorage.setItem('currentExpertData', JSON.stringify(data));
        }
        
        // Save to Supabase for persistent storage across devices
        await updateProfilePicture.mutateAsync({
          id: profile.id,
          profilePictureIndex: index,
        });
        
        console.log("✅ Expert profile picture saved to both AsyncStorage and Supabase");
      }
    } catch (err) {
      console.error('❌ Error saving expert profile pic:', err);
    }
  };


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
          disabled={loading}
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

          <TouchableOpacity style={styles.editPhotoBtn} onPress={() => setChoosePicModal(true)}>
            <Text style={styles.editPhotoText}>Edit your profile photo</Text>
          </TouchableOpacity>

          {/* Expert Information */}
          <View style={styles.infoBox}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person-circle" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Expert Information</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="person-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{profile?.name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="id-card-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Registration ID</Text>
                <Text style={styles.infoValue}>{profile?.registration_number}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile?.email}</Text>
              </View>
            </View>
          </View>

          {/* Change password Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={()=> {router.push('/expert/change-password')}}>
            <Ionicons name="key-outline" size={20} color="#d84315" style={{marginRight: 8}} />
            <Text style={styles.logoutText}>Change Password</Text>
          </TouchableOpacity>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  settingContainer: {
    padding: 20,
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    alignSelf: 'center',
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    resizeMode: 'cover',
  },
  editPhotoBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editPhotoText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  infoLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: '#ffebee',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#d84315',
    fontSize: 16,
    fontWeight: '600',
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
  exProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  exInfoGrid: {
    width: '100%',
  },
  exInfoRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  exInfoItemLeft: {
    marginRight: 8,
  },
  exInfoItemRight: {
    marginLeft: 8,
  },
  exInfoItemFull: {
    marginHorizontal: 0,
  },
  exActionRow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
