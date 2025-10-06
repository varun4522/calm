import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';

export default function StudentRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [course, setCourse] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleNameChange = useCallback((text: string) => setName(text), []);
  const handleUsernameChange = useCallback((text: string) => setUsername(text), []);
  const handleRegistrationChange = useCallback((text: string) => setRegistrationNumber(text), []);
  const handleCourseChange = useCallback((text: string) => setCourse(text), []);
  const handlePhoneChange = useCallback((text: string) => setPhone(text), []);
  const handleDobChange = useCallback((text: string) => setDob(text), []);
  const handleEmailChange = useCallback((text: string) => setEmail(text), []);
  const handlePasswordChange = useCallback((text: string) => setPassword(text), []);

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleRegister = async () => {
    if (name && username && registrationNumber && course && phone && dob && email && password) {
      try {
        // Check if registration number, email, or username already exists in user_requests table
        const { data: existingUser, error: userError } = await supabase
          .from('user_requests')
          .select('*')
          .or(`registration_number.eq.${registrationNumber},email.eq.${email},username.eq.${username}`);

        if (userError) {
          Alert.alert('Error', userError.message);
          return;
        }

        if (existingUser && existingUser.length > 0) {
          Alert.alert('Error', 'Registration number, email, or username already exists.');
          return;
        }

        // Check if there's already a request for this registration number
        const { data: existingRequest, error: requestError } = await supabase
          .from('user_requests')
          .select('*')
          .eq('registration_number', registrationNumber);

        if (requestError) {
          Alert.alert('Error', requestError.message);
          return;
        }

        if (existingRequest && existingRequest.length > 0) {
          Alert.alert('Already Registered', 'This registration number is already registered. Please try logging in.');
          return;
        }

        // Insert into user_requests table with auto-approved status
        const { error: requestInsertError } = await supabase
          .from('user_requests')
          .insert([
            {
              user_name: name,
              username: username,
              user_type: 'Student',
              registration_number: registrationNumber,
              email: email,
              course: course,
              password: password,
              phone: phone,
              dob: dob,
              status: 'approved',
              created_at: new Date().toISOString()
            }
          ]);

        if (requestInsertError) {
          Alert.alert('Error', requestInsertError.message);
          return;
        }

        Alert.alert('Registration Successful', `Welcome ${name}! Your student account has been created successfully. You can now log in.`);
        router.replace('./student-login');
      } catch (error) {
        console.error('Registration error:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Please fill all fields.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Back Button - Top Left */}
      <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.white,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            elevation: 4,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            borderWidth: 2,
            borderColor: Colors.primary,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'Roboto' }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={["#FFFFFF", "#D8BFD8"]}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
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
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={40}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{
              fontSize: 40,
              color: Colors.white,
              fontFamily: 'Roboto',
              marginBottom: 32,
              fontWeight: 'bold',
              textShadowColor: Colors.black,
              textShadowOffset: { width: 3, height: 3 },
              textShadowRadius: 3
            }}>
              Student Register
            </Text>
            <TextInput
              placeholder="Name"
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
            />
            <TextInput
              placeholder="Username"
              placeholderTextColor={Colors.textLight}
              value={username}
              onChangeText={setUsername}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Registration Number"
              placeholderTextColor={Colors.textLight}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Course"
              placeholderTextColor={Colors.textLight}
              value={course}
              onChangeText={setCourse}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
            />
            <TextInput
              placeholder="Phone Number"
              placeholderTextColor={Colors.textLight}
              value={phone}
              onChangeText={setPhone}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor={Colors.textLight}
              value={dob}
              onChangeText={setDob}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              style={{
                width: 280,
                backgroundColor: Colors.secondary,
                color: 'white',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ position: 'relative', marginBottom: 24, width: 280 }}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                style={{
                  width: 280,
                  backgroundColor: Colors.secondary,
                  color: 'white',
                  borderRadius: 8,
                  padding: 12,
                  paddingRight: 45,
                  fontSize: 16,
                }}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  padding: 4
                }}
              >
                <Ionicons
                  name={passwordVisible ? 'eye-off' : 'eye'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleRegister}
              style={{
                backgroundColor: Colors.white,
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 25,
                marginBottom: 24,
                elevation: 4,
                shadowColor: Colors.shadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 5,
                borderWidth: 2,
                borderColor: Colors.primary,
              }}
            >
              <Text style={{ color: Colors.primary, fontSize: 18, fontWeight: 'bold', fontFamily: 'Roboto' }}>Register</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

