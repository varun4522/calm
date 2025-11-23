// File: app/admin/change-password.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { useProfile } from '@/api/Profile';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import { handleLogout } from '@/api/OtherMethods';

export default function AdminChangePassword() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user.id);

  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const email = session?.user?.email;

  const signInWithEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }

    // Step 1: Re-authenticate with current password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      Alert.alert('Incorrect Password', 'The current password you entered is wrong.');
      return;
    }

    // Step 2: Validate new password
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    if (password === newPassword) {
      Alert.alert('Invalid', 'New password cannot be the same as your current one.');
      return;
    }

    // Step 3: Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      Alert.alert('Update Failed', updateError.message);
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Password Changed!',
      text2: 'You have been logged out for security.',
      position: 'bottom',
    });

    setPassword('');
    setNewPassword('');
    setTimeout(() => handleLogout(), 1500);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <Text style={{ fontSize: 18, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Ionicons name="key-outline" size={28} color="white" />
            <Text style={styles.headerTitle}>Change Password</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hello, {profile?.name || 'Admin'}!</Text>

        {/* Current Password */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showCurrent}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your current password"
              placeholderTextColor="#AAA"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons
                name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter your new password"
              placeholderTextColor="#AAA"
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNew(!showNew)}>
              <Ionicons
                name={showNew ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity style={styles.changeButton} onPress={signInWithEmail}>
          <Ionicons name="shield-checkmark" size={24} color="white" />
          <Text style={styles.changeButtonText}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2C3E50',
    paddingRight: 56,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});