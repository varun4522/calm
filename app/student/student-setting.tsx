import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import { handleLogout } from '@/api/OtherMethods';

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

export default function StudentSetting() {
  const [selectedProfilePic, setSelectedProfilePic] = useState(0);
  const [choosePicModal, setChoosePicModal] = useState(false);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user.id);

  // Load profile picture from AsyncStorage
  useEffect(() => {
    const loadProfilePic = async () => {
      if (profile?.id) {
        try {
          const picIdx = await AsyncStorage.getItem(`profilePic_${profile.id}`);
          if (picIdx !== null) {
            setSelectedProfilePic(parseInt(picIdx, 10));
          }
        } catch (error) {
          console.error('Error loading profile pic:', error);
        }
      }
    };
    loadProfilePic();
  }, [profile?.id]);

  // Handle profile picture selection and save to AsyncStorage
  const handleSelectProfilePic = async (index: number) => {
    setSelectedProfilePic(index);
    setChoosePicModal(false);
    try {
      if (profile?.id) {
        await AsyncStorage.setItem(`profilePic_${profile.id}`, index.toString());
        console.log("Profile picture saved successfully");
      }
    } catch (error) {
      console.error('Error saving profile pic:', error);
      Alert.alert('Error', 'Failed to save profile picture');
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
        <View style={styles.headerSpacer} />
      </View>

      {/* Profile Section with ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingContainer}>
        <Animated.View style={[styles.profilePicContainer, { opacity: fadeAnim }]}>
          <Image source={profilePics[selectedProfilePic]} style={styles.profilePic} />
        </Animated.View>
        <Text style={styles.welcomeText}>Welcome, {profile?.name}!</Text>

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
              <Text style={styles.infoValue}>{profile?.name}</Text>
            </View>
          </View>

          {profile?.username && (
            <View style={styles.infoRow}>
              <View style={styles.statIcon}>
                <Ionicons name="at-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>@{profile?.username}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="id-card-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Registration Number</Text>
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

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="school-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Course</Text>
              <Text style={styles.infoValue}>{profile?.course}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.statIcon}>
              <Ionicons name="call-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone_number}</Text>
            </View>
          </View>
        </View>

        {/* CHange password Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={()=> router.push('./change-password')}>
          <Ionicons name="key-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Change Password</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
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
    backgroundColor: Colors.background,
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
    width: 80,
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
    gap: 8,
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
});
