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
    { key: 'student', label: 'Student', table: 'students', route: '/student/student-home' },
    { key: 'expert', label: 'Expert', table: 'experts', route: '/expert/expert-home' },
    { key: 'peer_listener', label: 'Peer Listener', table: 'peer_listeners', route: '/peer-listener-login' },
    { key: 'admin', label: 'Admin', table: null, route: '/admin/admin-home' }
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
          fontSize: 60,
          color: '#4F21A2',
          fontFamily: 'Agbalumo'
        }}>
          Companion
        </Text>
        <Text
          style={{
            marginTop: 15,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#4F21A2',
            textAlign: 'center',
            fontFamily: 'Tinos'
          }}
        >
          Powered By{"\n"}
          C.A.L.M Spaces{"\n"}
          CEAPS, SGT UNIVERSITY{"\n"}
          Cultivating Awareness, Lightness & Movement
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

              {/* User Type Selector */}
              <Text style={{
                fontSize: 16,
                color: '#666',
                marginBottom: 8,
                fontFamily: 'Tinos'
              }}>
                Login as
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: 20,
                justifyContent: 'space-between'
              }}>
                {userTypes.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={{
                      backgroundColor: selectedUserType === type.key ? '#4F21A2' : 'transparent',
                      borderWidth: 2,
                      borderColor: '#4F21A2',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                      minWidth: '47%',
                      alignItems: 'center'
                    }}
                    onPress={() => setSelectedUserType(type.key)}
                  >
                    <Text style={{
                      color: selectedUserType === type.key ? 'white' : '#4F21A2',
                      fontSize: 14,
                      fontWeight: 'bold',
                      fontFamily: 'Tinos'
                    }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                        const selectedType = userTypes.find(type => type.key === selectedUserType);

                        // Handle admin login (hardcoded credentials)
                        if (selectedUserType === 'admin') {
                          if (loginInput.trim() === '241302262' && password.trim() === 'Calmspaces@741') {
                            await AsyncStorage.setItem('userType', 'admin');
                            await AsyncStorage.setItem('currentAdminData', JSON.stringify({
                              registration: '241302262',
                              role: 'admin'
                            }));
                            setLoginModalVisible(false);
                            setLoginInput('');
                            setPassword('');
                            setSelectedUserType('student');
                            router.push('/admin/admin-home');
                            setIsLoading(false);
                            return;
                          } else {
                            Alert.alert('Login Failed', 'Invalid admin credentials.');
                            setIsLoading(false);
                            return;
                          }
                        }

                        // Handle database-based authentication for other user types
                        if (selectedType && selectedType.table) {
                          console.log(`Attempting login for ${selectedUserType} with input: ${loginInput.trim()}`);

                          // First, let's check if the user exists at all by registration (for debugging)
                          const { data: regCheck, error: regError } = await supabase
                            .from(selectedType.table)
                            .select('registration, email')
                            .eq('registration', loginInput.trim())
                            .single();

                          // Also check by email
                          const { data: emailCheck, error: emailError } = await supabase
                            .from(selectedType.table)
                            .select('registration, email')
                            .eq('email', loginInput.trim())
                            .single();

                          console.log('Registration check:', regCheck, regError);
                          console.log('Email check:', emailCheck, emailError);

                          // Step 1: Check if user exists by registration (without password check)
                          let userExists = regCheck || null;
                          let loginField = 'registration';

                          // Step 2: If not found by registration, check by email
                          if (!userExists && emailCheck) {
                            userExists = emailCheck;
                            loginField = 'email';
                          }

                          let userData = null;
                          let userError = null;

                          if (userExists) {
                            // User exists, now check password
                            const { data: authData, error: authError } = await supabase
                              .from(selectedType.table)
                              .select('*')
                              .eq(loginField, loginInput.trim())
                              .eq('password', password.trim())
                              .single();

                            userData = authData;
                            userError = authError;

                            if (!userData && !authError) {
                              // User exists but password is wrong
                              Alert.alert('Login Failed', 'Incorrect password. Please try again.');
                              setIsLoading(false);
                              return;
                            }
                          } else {
                            // User doesn't exist
                            Alert.alert('Login Failed', `No ${selectedType?.label.toLowerCase()} account found with this registration number or email.`);
                            setIsLoading(false);
                            return;
                          }

                          if (userData && !userError) {
                            // Store user data based on type
                            await AsyncStorage.setItem('userType', selectedUserType);

                            if (selectedUserType === 'student') {
                              await AsyncStorage.setItem('currentStudentData', JSON.stringify(userData));
                              await AsyncStorage.setItem('currentStudentReg', userData.registration);
                            } else if (selectedUserType === 'expert') {
                              await AsyncStorage.setItem('currentExpertData', JSON.stringify(userData));
                              await AsyncStorage.setItem('currentExpertReg', userData.registration);
                            } else if (selectedUserType === 'peer_listener') {
                              await AsyncStorage.setItem('currentPeerData', JSON.stringify(userData));
                              await AsyncStorage.setItem('currentPeerReg', userData.registration);
                            }

                            // Clear form and navigate
                            setLoginModalVisible(false);
                            setLoginInput('');
                            setPassword('');
                            setSelectedUserType('student');

                            // Navigate to appropriate route
                            if (selectedUserType === 'student') {
                              router.push(`/student/student-home?registration=${userData.registration}`);
                            } else if (selectedUserType === 'expert') {
                              router.push(`/expert/expert-home?registration=${userData.registration}`);
                            } else if (selectedUserType === 'peer_listener') {
                              router.push('/peer-listener-login');
                            }

                            setIsLoading(false);
                            return;
                          } else {
                            // This shouldn't happen with the new logic, but just in case
                            console.log('Unexpected authentication failure for:', selectedUserType);
                            console.log('Login input:', loginInput.trim());
                            console.log('Error:', userError);
                            console.log('Table:', selectedType?.table);
                            Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
                            setIsLoading(false);
                          }
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
