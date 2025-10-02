import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';

export default function PeerListenerRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    phone: '',
    course: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const validateForm = () => {
    const { name, email, username, password, confirmPassword, studentId, phone, course } = formData;

    if (!name.trim() || !email.trim() || !username.trim() || !password.trim() ||
        !studentId.trim() || !phone.trim() || !course.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Check if user_requests table exists and if username or email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_requests')
        .select('username, email')
        .or(`username.eq.${formData.username},email.eq.${formData.email}`);

      if (checkError) {
        console.error('Error checking existing users:', checkError);

        // If table doesn't exist, show specific error message with detailed instructions
        if (checkError.code === '42P01') {
          Alert.alert(
            '🔧 Database Setup Required',
            'The registration system is not set up yet. The database table "user_requests" does not exist.\n\n📋 What you can do:\n• Contact your administrator\n• Ask them to run the database setup\n• Try again after setup is complete',
            [
              {
                text: '📋 Setup Guide',
                onPress: () => {
                  Alert.alert(
                    '👨‍💻 Administrator Instructions',
                    'To fix this issue, the administrator needs to:\n\n1️⃣ Go to Supabase Dashboard\n2️⃣ Open SQL Editor\n3️⃣ Run this SQL command:\n\nCREATE TABLE IF NOT EXISTS user_requests (\n  id SERIAL PRIMARY KEY,\n  user_name TEXT NOT NULL,\n  email TEXT UNIQUE NOT NULL,\n  username TEXT UNIQUE NOT NULL,\n  registration_number TEXT NOT NULL,\n  user_type TEXT NOT NULL,\n  phone TEXT,\n  course TEXT,\n  dob TEXT,\n  password TEXT NOT NULL,\n  status TEXT DEFAULT \'approved\',\n  created_at TIMESTAMP DEFAULT NOW()\n);',
                    [{ text: 'Got it' }]
                  );
                }
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
          return;
        }

        Alert.alert('❌ Connection Error', 'Failed to connect to the database. Please check your internet connection and try again.');
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.username === formData.username) {
          Alert.alert('Error', 'Username already exists. Please choose a different username.');
          return;
        }
        if (existingUser.email === formData.email) {
          Alert.alert('Error', 'Email already registered. Please use a different email.');
          return;
        }
      }

      // Insert into user_requests table with auto-approved status
      const { data, error } = await supabase
        .from('user_requests')
        .insert([
          {
            user_name: formData.name.trim(),
            username: formData.username.trim(),
            user_type: 'Peer Listener',
            registration_number: formData.studentId.trim(),
            email: formData.email.trim().toLowerCase(),
            course: formData.course.trim(),
            password: formData.password,
            phone: formData.phone.trim(),
            status: 'approved',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Registration error:', error);

        // Handle specific database errors
        if (error.code === '42P01') {
          Alert.alert(
            '🔧 Database Setup Required',
            'The registration system is not configured yet. Please contact your administrator to set up the database tables.',
            [
              {
                text: '📋 Quick Fix',
                onPress: () => {
                  Alert.alert(
                    '⚡ Quick Database Setup',
                    'Administrator: Create the table with this SQL:\n\nCREATE TABLE peer_listeners (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT UNIQUE NOT NULL,\n  username TEXT UNIQUE NOT NULL,\n  student_id TEXT NOT NULL,\n  phone TEXT,\n  course TEXT,\n  status TEXT DEFAULT \'pending\',\n  created_at TIMESTAMP DEFAULT NOW()\n);',
                    [{ text: 'Copy to Clipboard' }, { text: 'OK' }]
                  );
                }
              },
              { text: 'OK' }
            ]
          );
        } else if (error.code === '42501') {
          Alert.alert(
            '🔒 Permission Error',
            'Database security policy is blocking registration. Administrator needs to fix table permissions.',
            [
              {
                text: '🔧 Fix Instructions',
                onPress: () => {
                  Alert.alert(
                    '⚡ Quick Permission Fix',
                    'Administrator: Run this SQL command in Supabase:\n\nALTER TABLE user_requests DISABLE ROW LEVEL SECURITY;\n\nOr create proper RLS policies for public registration.',
                    [{ text: 'Got it' }]
                  );
                }
              },
              { text: 'OK' }
            ]
          );
        } else if (error.code === '23505') {
          Alert.alert('❌ Already Exists', 'Username or email already exists. Please use different credentials.');
        } else {
          Alert.alert('❌ Registration Failed', `Error: ${error.message}\n\nPlease try again or contact support.`);
        }
        return;
      }

      // Store registration data locally for backup
      await AsyncStorage.setItem('pendingPeerListener', JSON.stringify(formData));

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Svg
        height="100%"
        width="100%"
        style={{ position: 'absolute', top: '20%' }}
        viewBox="0 0 100 100"
      >
        <Path
          d="M0,20 C30,40 70,0 100,20 L100,100 L0,100 Z"
          fill="#D8BFD8"
        />
      </Svg>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Peer Listener Registration</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.formCard}>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#a8a8a8"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor="#a8a8a8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#a8a8a8"
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(value) => updateFormData('username', value)}
                  placeholder="Choose a username"
                  placeholderTextColor="#a8a8a8"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  placeholder="Create a password (min 6 characters)"
                  placeholderTextColor="#a8a8a8"
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  placeholder="Confirm your password"
                  placeholderTextColor="#a8a8a8"
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Student Registration no *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.studentId}
                  onChangeText={(value) => updateFormData('studentId', value)}
                  placeholder="Enter your student registration number"
                  placeholderTextColor="#a8a8a8"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Course/Program *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.course}
                  onChangeText={(value) => updateFormData('course', value)}
                  placeholder="Enter your course or program"
                  placeholderTextColor="#a8a8a8"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, { opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Submitting Application...' : 'Submit Application'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'transparent',
  },
  backButton: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 15,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textShadowColor: Colors.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  registerButton: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 20,
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(186, 104, 200, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
