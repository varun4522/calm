import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || params.type !== 'recovery') {
        Toast.show({ type: 'error', text1: 'Invalid or expired link' });
        router.replace('/');
      }
      setIsChecking(false);
    };
    checkSession();
  }, []);

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      Toast.show({ type: 'error', text1: error.message });
    } else {
      Toast.show({ type: 'success', text1: 'Password updated successfully!' });
      router.replace('/');
    }
    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F21A2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Reset Password</Text>

        <Text style={styles.inputLabel}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
            <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="#4F21A2" />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!confirmVisible}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setConfirmVisible(!confirmVisible)} style={styles.eyeIcon}>
            <Ionicons name={confirmVisible ? 'eye-off' : 'eye'} size={24} color="#4F21A2" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalButtonsRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.replace('/')}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleResetPassword} disabled={isLoading}>
            <Text style={styles.confirmButtonText}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#4F21A2', textAlign: 'center', marginBottom: 20, fontFamily: 'Tinos' },
  inputLabel: { fontSize: 16, color: '#666', marginBottom: 8, fontFamily: 'Tinos' },
  passwordContainer: { position: 'relative', marginBottom: 20 },
  passwordInput: { borderWidth: 2, borderColor: '#4F21A2', borderRadius: 10, padding: 12, paddingRight: 45, fontSize: 16, fontFamily: 'Tinos', color: '#000' },
  eyeIcon: { position: 'absolute', right: 12, top: 12, padding: 4 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#4F21A2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 0.45 },
  cancelButtonText: { color: '#4F21A2', fontSize: 16, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Tinos' },
  confirmButton: { backgroundColor: '#4F21A2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 0.45 },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Tinos' },
});