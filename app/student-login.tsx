//varun kumar
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';

export default function StudentLogin() {
  const [rainbowOpacity] = useState(1); // Default opacity value
  const router = useRouter();
  const [userInput, setUserInput] = useState(''); // Username or registration number
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized handlers for better performance
  const handleUserInputChange = useCallback((text: string) => {
    setUserInput(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleLogin = useCallback(async () => {
    if (userInput && password) {
      // Immediate UI feedback
      setIsLoading(true);

      try {
        // Check in students table for registered students
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .or(`registration_number.eq.${userInput},username.eq.${userInput}`)
          .eq('password', password)
          .single();

        if (studentData && !studentError) {
          // Update last login timestamp
          await supabase
            .from('students')
            .update({ last_login: new Date().toISOString() })
            .eq('id', studentData.id);

          // Store the registration number in AsyncStorage for session management
          await AsyncStorage.setItem('currentStudentReg', studentData.registration_number);

          // Map the data to match expected format
          const mappedData = {
            name: studentData.user_name,
            user_name: studentData.user_name,
            username: studentData.username || '', // Ensure username is included
            registration: studentData.registration_number,
            registration_number: studentData.registration_number,
            email: studentData.email,
            course: studentData.course,
            phone: studentData.phone,
            date_of_birth: studentData.dob,
            user_type: 'Student' // Set the user type as Student
          };

          await AsyncStorage.setItem('currentStudentData', JSON.stringify(mappedData));

          //Alert.alert('Login Success', `Welcome, ${studentData.user_name}!`);
          router.replace(`./student/student-home?registration=${studentData.registration_number}`);
          return;
        }

        // If no match found
        Alert.alert('Error', 'Invalid username/registration number or password, or account not approved.');
      } catch (error) {
        console.error('Login error:', error);
        Alert.alert('Error', 'An error occurred during login. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert('Error', 'Please enter username/registration number and password.');
      setIsLoading(false);
    }
  }, [userInput, password, router]);

  // Optimized navigation handlers
  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleForgotPassword = useCallback(() => {
    router.push('./forget');
  }, [router]);

  const handleRegisterPress = useCallback(() => {
    router.push('./student-register');
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      {/* Back Button - Top Left */}
      <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#884adaff',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            elevation: 4,
            shadowColor: '#e8b4ff',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
          onPress={handleBackPress}
          activeOpacity={0.3}
          delayPressIn={0}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Roboto' }}>Back</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={["#FFFFFF", "#D8BFD8"]}
        style={{ flex: 1,marginTop: -100 }}
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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24
          }}
          showsVerticalScrollIndicator={false}
        >
          <Image source={require('../assets/images/logo2.png')} style={{ width: 220, height: 170, marginBottom: 12, transform: [{ translateY: -10 }] }} />
          <Text style={{
            fontSize: 50,
            color: 'white',
            fontFamily: 'Roboto',
            marginTop: 25,
            marginBottom: 32,
            fontWeight: 'bold',
            textShadowColor: 'black',
            textShadowOffset: { width: 3, height: 3 },
            textShadowRadius: 3
          }}>
            Student Login
          </Text>
          <TextInput
            placeholder="Username or Registration Number"
            placeholderTextColor="#aaa"
            value={userInput}
            onChangeText={handleUserInputChange}
            style={{
              width: 280,
              backgroundColor: '#884adaff',
              color: 'white', // Ensures text inside the input box is white
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 16,
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="next"
          />
          <View style={{ position: 'relative', width: 280, marginBottom: 24 }}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: '#884adaff',
                color: 'white',
                borderRadius: 8,
                padding: 12,
                paddingRight: 48,
                fontSize: 16,
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: 15,
                top: '50%',
                transform: [{ translateY: -10 }],
              }}
              activeOpacity={0.3}
              delayPressIn={0}
            >
              <Text style={{ color: 'white', fontSize: 16 }}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleLogin}
            style={{
              backgroundColor: '#884adaff',
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 8,
              marginBottom: 16,
            }}
            activeOpacity={0.3}
            delayPressIn={0}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={{ marginBottom: 16 }}
            activeOpacity={0.3}
            delayPressIn={0}
          >
            <Text style={{ color: '#884adaff', fontSize: 16, textDecorationLine: 'underline' }}>
              Forgot your password?
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRegisterPress}
            activeOpacity={0.3}
            delayPressIn={0}
          >
            <Text style={{ color: 'black', fontSize: 18, fontWeight: 'bold' }}>
              Register as New User
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
