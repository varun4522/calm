import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import { handleLogout } from '@/api/OtherMethods';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user.id);

  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const email = session?.user?.email;

  async function signInWithEmail() {
    if (!email) {
      Alert.alert("Error", "Email not found in session");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert("Incorrect Password", error.message);
      return;
    }

    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters and can include letters, numbers, and symbols.");
      return;
    }

    if (password === newPassword) {
      Alert.alert("Error", "New password cannot be the same as the current password.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      Alert.alert("Error", updateError.message);
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Password updated successfully!',
      position: 'bottom',
      visibilityTime: 2000,
    });

    setPassword("");
    setNewPassword("");
    handleLogout();
  }

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Hello, {profile?.name}!</Text>

        {/* Current Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!showCurrentPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter current password"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.textInput}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity style={styles.changePasswordBtn} onPress={signInWithEmail}>
          <Ionicons name="key-outline" size={20} color={Colors.white} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  headerTitle: { color: Colors.text, fontSize: 24, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 80 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  welcomeText: { color: Colors.primary, fontSize: 22, fontWeight: 'bold', marginBottom: 40 },

  inputContainer: { width: '100%', marginBottom: 24 },
  inputLabel: { color: Colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },

  passwordWrapper: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingRight: 50, // Make space for eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 1,
  },

  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 30,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  changePasswordText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.text, fontSize: 18, fontWeight: '500' },
});