// File: app/expert/change-password.tsx  (or wherever your expert routes are)

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

export default function ExpertChangePassword() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user.id);

  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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
      Alert.alert("Error", "New password cannot be the same as the current one.");
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
      text1: 'Password changed successfully!',
      position: 'bottom',
      visibilityTime: 2000,
    });

    setPassword('');
    setNewPassword('');
    handleLogout();
  }

  if (isLoading) {
    return (
      <LinearGradient colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.text, fontSize: 18 }}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.backgroundLight, Colors.accentLight]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.refreshButton} />
      </View>

      <View style={styles.settingContainer}>
        {/* Greeting */}
        <Text style={styles.greetingText}>Hello, {profile?.name}!</Text>

        {/* Current Password */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showCurrent}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter current password"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity style={styles.changePasswordBtn} onPress={signInWithEmail}>
          <Ionicons name="key-outline" size={22} color="#d84315" style={{ marginRight: 10 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8 },
  backButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { color: Colors.primary, fontSize: 20, fontWeight: 'bold' },
  refreshButton: { width: 36, height: 36 }, // placeholder to balance layout

  settingContainer: {
    padding: 20,
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 30,
  },

  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },

  changePasswordBtn: {
    backgroundColor: '#ffebee',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  changePasswordText: {
    color: '#d84315',
    fontSize: 17,
    fontWeight: '600',
  },
});