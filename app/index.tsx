import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function FrontPage() {
  const router = useRouter();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('student');

  const userTypes = [
    { key: 'student', label: 'Student', dbValue: 'Student', route: '/student/student-home' },
    { key: 'expert', label: 'Expert', dbValue: 'Expert', route: '/expert/expert-home' },
    { key: 'peer_listener', label: 'Peer Listener', dbValue: 'Peer Listener', route: '/peer-listener-login' },
    { key: 'admin', label: 'Admin', dbValue: 'Admin', route: '/admin/admin-home' }
  ];

  const [loaded] = useFonts({
    Agbalumo: require('../assets/fonts/Agbalumo-Regular.ttf'),
    Tinos: require('../assets/fonts/Tinos-Regular.ttf'),
    IrishGrover: require('../assets/fonts/IrishGrover-Regular.ttf'),
    Roboto: require('../assets/fonts/Roboto.ttf'),
  });

  useEffect(() => {
    // Fonts loaded, but navigation is now handled by buttons
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7965AF" />
      </View>
    );
  }

  return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
        <Image
          source={require('../assets/images/logo2.png')}
          style={{ width: 250, height: 200, marginTop: 50 }}
        />
        <Text style={{
          textAlign: 'center',
          fontSize: 60,
          fontWeight: '600',
          color: '#4F21A2',
          fontFamily: 'Agbalumo',
          letterSpacing: -1,
        }}>
          C.A.L.M
        </Text>
        <Text style={{
          marginTop: -19,
          textAlign: 'center',
          fontSize:60,
          color: '#4F21A2',
          fontFamily: 'Agbalumo'
        }}>
          Spaces
        </Text>

        {/* Login and Register Buttons */}
        <View style={{ marginTop: 40, width: '80%', alignItems: 'center' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#4F21A2',
              paddingVertical: 15,
              paddingHorizontal: 40,
              borderRadius: 25,
              marginBottom: 15,
              width: '100%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={() => setLoginModalVisible(true)}
          >
            <Text style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Tinos'
            }}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: '#4F21A2',
              paddingVertical: 15,
              paddingHorizontal: 40,
              borderRadius: 25,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={() => router.push('/select2')}
          >
            <Text style={{
              color: '#4F21A2',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'Tinos'
            }}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Modal */}
        <Modal
          visible={loginModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setLoginModalVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 30,
              width: '90%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#4F21A2',
                textAlign: 'center',
                marginBottom: 20,
                fontFamily: 'Tinos'
              }}>
                Login
              </Text>

              <Text style={{
                fontSize: 16,
                color: '#666',
                marginBottom: 8,
                fontFamily: 'Tinos'
              }}>
                Registration No / Email
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: '#4F21A2',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 15,
                  fontFamily: 'Tinos'
                }}
                placeholder="Enter registration number or email"
                value={loginInput}
                onChangeText={setLoginInput}
                autoCapitalize="none"
              />

              <Text style={{
                fontSize: 16,
                color: '#666',
                marginBottom: 8,
                fontFamily: 'Tinos'
              }}>
                Password
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: '#4F21A2',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 20,
                  fontFamily: 'Tinos'
                }}
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: '#4F21A2',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 10,
                    flex: 0.45,
                  }}
                  onPress={() => {
                    setLoginModalVisible(false);
                    setLoginInput('');
                    setPassword('');
                    setSelectedUserType('student');
                  }}
                >
                  <Text style={{
                    color: '#4F21A2',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Tinos'
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#4F21A2',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 10,
                    flex: 0.45,
                  }}
                  onPress={async () => {
                    if (loginInput.trim() && password.trim()) {
                      setIsLoading(true);

                      try {
                        // Handle database-based authentication using user_requests table
                        console.log(`Attempting login with input: ${loginInput.trim()}`);

                        // Check user_requests table for authentication
                        const { data: userData, error: userError } = await supabase
                          .from('user_requests')
                          .select('*')
                          .or(`registration_number.eq.${loginInput.trim()},email.eq.${loginInput.trim()}`)
                          .eq('password', password.trim())
                          .single();

                        if (userData && !userError) {
                          console.log('User found:', userData);

                          // User authentication successful - no need to check selected type since we removed the selector

                          // Store user data based on actual user_type from database
                          const actualUserType = userData.user_type.toLowerCase().replace(' ', '_');
                          await AsyncStorage.setItem('userType', actualUserType);
                          await AsyncStorage.setItem('currentUserData', JSON.stringify(userData));
                          await AsyncStorage.setItem('currentUserReg', userData.registration_number);

                          // Store user-specific data for backward compatibility
                          if (userData.user_type === 'Student') {
                            await AsyncStorage.setItem('currentStudentData', JSON.stringify(userData));
                            await AsyncStorage.setItem('currentStudentReg', userData.registration_number);
                          } else if (userData.user_type === 'Expert') {
                            // Check if this expert account should be treated as admin
                            if (userData.username === 'admin' || userData.registration_number === 'ADMIN001') {
                              await AsyncStorage.setItem('currentAdminData', JSON.stringify(userData));
                              await AsyncStorage.setItem('currentAdminReg', userData.registration_number);
                            } else {
                              await AsyncStorage.setItem('currentExpertData', JSON.stringify(userData));
                              await AsyncStorage.setItem('currentExpertReg', userData.registration_number);
                            }
                          } else if (userData.user_type === 'Peer Listener') {
                            await AsyncStorage.setItem('currentPeerData', JSON.stringify(userData));
                            await AsyncStorage.setItem('currentPeerReg', userData.registration_number);
                          } else if (userData.user_type === 'Admin') {
                            await AsyncStorage.setItem('currentAdminData', JSON.stringify(userData));
                            await AsyncStorage.setItem('currentAdminReg', userData.registration_number);
                          }

                          // Clear form and navigate
                          setLoginModalVisible(false);
                          setLoginInput('');
                          setPassword('');
                          setSelectedUserType('student');

                          // Navigate based on user_type from database
                          if (userData.user_type === 'Student') {
                            router.push(`/student/student-home?registration=${userData.registration_number}`);
                          } else if (userData.user_type === 'Expert') {
                            // Check if this expert account should be treated as admin
                            if (userData.username === 'admin' || userData.registration_number === 'ADMIN001') {
                              router.push('/admin/admin-home');
                            } else {
                              router.push(`/expert/expert-home?registration=${userData.registration_number}`);
                            }
                          } else if (userData.user_type === 'Peer Listener') {
                            router.push('/peer/peer-home'); // Navigate to main page for peer listeners
                          } else if (userData.user_type === 'Admin') {
                            router.push('/admin/admin-home');
                          }

                          setIsLoading(false);
                          return;
                        } else {
                          // Authentication failed
                          console.log('Authentication failed');
                          console.log('Login input:', loginInput.trim());
                          console.log('Error:', userError);
                          Alert.alert('Login Failed', 'Invalid credentials. Please check your registration number/email and password.');
                          setIsLoading(false);
                        }

                      } catch (error) {
                        console.error('Login error:', error);
                        Alert.alert('Error', 'An error occurred during login. Please try again.');
                        setIsLoading(false);
                      }
                    } else {
                      Alert.alert('Error', 'Please fill in both fields');
                    }
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Tinos'
                  }}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
  );
}
