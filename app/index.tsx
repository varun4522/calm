import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/providers/AuthProvider';

export default function FrontPage() {
  const router = useRouter();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  console.log(session);
  useEffect(() => {
    const redirectUser = async () => {
      if (session && session.user?.id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (error) {
          Toast.show({ type: 'error', text1: 'Failed to fetch profile', position: 'bottom' });
          return;
        }
        if (data.type === 'STUDENT' || data.type === 'PEER') router.replace('/student/student-home');
        else if (data.type === 'EXPERT') router.replace('/expert/expert-home');
        else router.replace('/admin/admin-home');
      }
    };
    redirectUser();
  }, [session]);


  async function signInWithEmail() {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginInput, password });
    if (error) {
      Toast.show({ type: 'error', text1: error.message, position: 'bottom', visibilityTime: 2000 });
      setIsLoading(false);
      return;
    }
    Toast.show({ type: 'success', text1: 'Login successful', position: 'bottom', visibilityTime: 1500 });
    setIsLoading(false);
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo2.png')} style={styles.logo} />
      <Text style={styles.mainTitle}>C.A.L.M</Text>
      <Text style={styles.subTitle}>Spaces</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={() => setLoginModalVisible(true)}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signupButton} onPress={() => router.push('/select2')}>
          <Text style={styles.signupButtonText}>Sign up</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={loginModalVisible} animationType="slide" transparent={true} onRequestClose={() => setLoginModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Login</Text>

            <Text style={styles.inputLabel}>Registration No / Email</Text>
            <TextInput style={styles.input} placeholder="Enter registration number or email" value={loginInput} onChangeText={setLoginInput} autoCapitalize="none" />

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Enter password" value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="#4F21A2" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setLoginModalVisible(false); setLoginInput(''); setPassword(''); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={() => { signInWithEmail(); }}>
                <Text style={styles.confirmButtonText}>{isLoading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  logo: { width: 450, height: 300, marginLeft: 25 },
  mainTitle: { textAlign: 'center', fontSize: 80, fontWeight: '600', color: '#4F21A2', fontFamily: 'Agbalumo', letterSpacing: -1 },
  subTitle: { marginTop: -19, textAlign: 'center', fontSize: 60, color: '#4F21A2', fontFamily: 'Agbalumo' },
  buttonContainer: { marginTop: 40, width: '80%', alignItems: 'center' },
  loginButton: { backgroundColor: '#4F21A2', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, marginBottom: 15, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Tinos' },
  signupButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#4F21A2', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, width: '100%', alignItems: 'center' },
  signupButtonText: { color: '#4F21A2', fontSize: 18, fontWeight: 'bold', fontFamily: 'Tinos' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#4F21A2', textAlign: 'center', marginBottom: 20, fontFamily: 'Tinos' },
  inputLabel: { fontSize: 16, color: '#666', marginBottom: 8, fontFamily: 'Tinos' },
  input: { borderWidth: 2, borderColor: '#4F21A2', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15, fontFamily: 'Tinos' },
  passwordContainer: { position: 'relative', marginBottom: 20 },
  passwordInput: { borderWidth: 2, borderColor: '#4F21A2', borderRadius: 10, padding: 12, paddingRight: 45, fontSize: 16, fontFamily: 'Tinos' },
  eyeIcon: { position: 'absolute', right: 12, top: 12, padding: 4 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#4F21A2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 0.45 },
  cancelButtonText: { color: '#4F21A2', fontSize: 16, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Tinos' },
  confirmButton: { backgroundColor: '#4F21A2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 0.45 },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Tinos' },
});
