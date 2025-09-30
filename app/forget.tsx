import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function ChangePassword() {
  const router = useRouter();
  const [userType, setUserType] = useState<'student' | 'expert' | 'peer'>('student');
  const [userInput, setUserInput] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for input navigation
  const userInputRef = useRef<TextInput>(null);
  const oldPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    console.log('🚀 Starting password change process...');
    console.log('User Type:', userType);
    console.log('User Input:', userInput);
    console.log('Old Password Length:', oldPassword.length);
    console.log('New Password Length:', newPassword.length);

    // Validation
    if (!userInput.trim() || !oldPassword || !newPassword || !confirmPassword) {
      console.log('❌ Validation failed: Missing fields');
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('❌ Validation failed: Password mismatch');
      Alert.alert('Validation Error', 'New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      console.log('❌ Validation failed: Password too short');
      Alert.alert('Validation Error', 'New password must be at least 6 characters long');
      return;
    }

    if (oldPassword === newPassword) {
      console.log('❌ Validation failed: Same password');
      Alert.alert('Validation Error', 'New password must be different from old password');
      return;
    }

    console.log('✅ All validations passed');

    // Test Supabase connection
    console.log('🔌 Testing Supabase connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('user_requests')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('❌ Supabase connection test failed:', testError);
        Alert.alert(
          'Connection Error',
          'Cannot connect to database. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      } else {
        console.log('✅ Supabase connection test successful');
      }
    } catch (connectionError) {
      console.error('❌ Supabase connection exception:', connectionError);
      Alert.alert(
        'Connection Error',
        'Database connection failed. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      let userFound = false;
      let updateSuccess = false;

      // Handle different user types with comprehensive credential verification and password updates
      console.log(`🔍 Starting password update process for ${userType.toUpperCase()}...`);

      if (userType === 'student') {
        console.log('📚 STUDENT PASSWORD UPDATE PROCESS');

        // First try user_requests table for approved students
        console.log('Checking user_requests table for student...');
        try {
          const { data: userRequestData, error: userRequestError } = await supabase
            .from('user_requests')
            .select('*')
            .eq('user_type', 'Student')
            .eq('status', 'approved')
            .or(`registration_number.eq.${userInput.trim()},user_name.eq.${userInput.trim()}`)
            .eq('password', oldPassword)
            .single();

          console.log('User requests query result:', { data: userRequestData, error: userRequestError });

          if (userRequestData && !userRequestError) {
            console.log('✅ STUDENT found in user_requests table');
            console.log('🔄 Replacing old password with new password in user_requests...');

            // Replace old password with new password in user_requests table
            const { error: updateError } = await supabase
              .from('user_requests')
              .update({ password: newPassword })
              .eq('id', userRequestData.id);

            console.log('Update result:', { updateError });

            if (!updateError) {
              console.log('✅ SUCCESS: STUDENT password updated in user_requests table');
              console.log('🔐 Old password DELETED, New password SET in Supabase');
              userFound = true;
              updateSuccess = true;
            } else {
              console.error('❌ ERROR: Failed to update STUDENT password in user_requests:', updateError);
            }
          } else if (userRequestError) {
            console.log('Query error in user_requests:', userRequestError);
          }
        } catch (queryError) {
          console.error('Exception in user_requests query:', queryError);
        }

        // If not found in user_requests, try students table
        if (!userFound) {
          console.log('Checking students table...');
          try {
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('*')
              .eq('registration_number', userInput.trim())
              .eq('password', oldPassword)
              .single();

            console.log('Students query result:', { data: studentData, error: studentError });

            if (studentData && !studentError) {
              console.log('✅ STUDENT found in students table');
              console.log('🔄 Replacing old password with new password in students...');

              // Replace old password with new password in students table
              const { error: updateError } = await supabase
                .from('students')
                .update({ password: newPassword })
                .eq('id', studentData.id);

              console.log('Update result:', { updateError });

              if (!updateError) {
                console.log('✅ SUCCESS: STUDENT password updated in students table');
                console.log('🔐 Old password DELETED, New password SET in Supabase');
                userFound = true;
                updateSuccess = true;
              } else {
                console.error('❌ ERROR: Failed to update STUDENT password in students:', updateError);
              }
            } else if (studentError) {
              console.log('Query error in students:', studentError);
            }
          } catch (queryError) {
            console.error('Exception in students query:', queryError);
          }
        }

        // Additionally, if student was found in user_requests, also try to update in students table
        if (userFound && updateSuccess) {
          console.log('🔄 Also checking if student exists in students table for dual update...');
          try {
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('*')
              .eq('registration_number', userInput.trim())
              .eq('password', oldPassword)
              .single();

            if (studentData && !studentError) {
              console.log('✅ STUDENT also found in students table, updating password there too...');

              const { error: updateError } = await supabase
                .from('students')
                .update({ password: newPassword })
                .eq('id', studentData.id);

              if (!updateError) {
                console.log('✅ SUCCESS: STUDENT password also updated in students table');
              } else {
                console.error('❌ ERROR: Failed to update STUDENT password in students table:', updateError);
              }
            }
          } catch (queryError) {
            console.error('Exception in dual students update:', queryError);
          }
        }
      }
      else if (userType === 'expert') {
        console.log('👨‍⚕️ EXPERT PASSWORD UPDATE PROCESS');

        // Check experts table
        console.log('Checking experts table...');
        const { data: expertData, error: expertError } = await supabase
          .from('experts')
          .select('*')
          .eq('registration_number', userInput.trim())
          .eq('password', oldPassword)
          .single();

        if (expertData && !expertError) {
          console.log('✅ EXPERT found in experts table');
          console.log('🔄 Replacing old password with new password in experts table...');

          // Replace old password with new password in experts table
          const { error: updateError } = await supabase
            .from('experts')
            .update({ password: newPassword })
            .eq('id', expertData.id);

          if (!updateError) {
            console.log('✅ SUCCESS: EXPERT password updated in experts table');
            console.log('🔐 Old password DELETED, New password SET in Supabase');
            userFound = true;
            updateSuccess = true;
          } else {
            console.error('❌ ERROR: Failed to update EXPERT password in experts table:', updateError);
          }
        }
      }
      else if (userType === 'peer') {
        console.log('👥 PEER LISTENER PASSWORD UPDATE PROCESS');

        // Check peer_listeners table
        console.log('Checking peer_listeners table...');
        const { data: peerData, error: peerError } = await supabase
          .from('peer_listeners')
          .select('*')
          .eq('username', userInput.trim())
          .eq('password', oldPassword)
          .single();

        if (peerData && !peerError) {
          console.log('✅ PEER LISTENER found in peer_listeners table');
          console.log('🔄 Replacing old password with new password in peer_listeners table...');

          // Replace old password with new password in peer_listeners table
          const { error: updateError } = await supabase
            .from('peer_listeners')
            .update({ password: newPassword })
            .eq('id', peerData.id);

          if (!updateError) {
            console.log('✅ SUCCESS: PEER LISTENER password updated in peer_listeners table');
            console.log('🔐 Old password DELETED, New password SET in Supabase');
            userFound = true;
            updateSuccess = true;
          } else {
            console.error('❌ ERROR: Failed to update PEER LISTENER password in peer_listeners table:', updateError);
          }
        }
      }      // Check results and provide appropriate feedback
      if (!userFound) {
        console.log('User authentication failed');
        Alert.alert(
          'Authentication Failed',
          'Invalid credentials. Please check your username/registration number and current password.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!updateSuccess) {
        console.log('Password update failed');
        Alert.alert(
          'Update Failed',
          'Failed to update password in database. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Success - clear form and navigate back
      console.log(`🎉 ${userType.toUpperCase()} PASSWORD CHANGE COMPLETED SUCCESSFULLY`);
      console.log('✅ Old password has been DELETED from Supabase database');
      console.log('✅ New password has been SET in Supabase database');
      console.log('✅ Database password field now contains the NEW password only');
      console.log(`🔐 ${userType.toUpperCase()} can now login with the new password`);

      setUserInput('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password Updated Successfully!',
        `🎉 ${userType.charAt(0).toUpperCase() + userType.slice(1)} password replacement completed!\n\n✅ Old password: DELETED from Supabase\n✅ New password: SET in Supabase\n✅ Database: UPDATED for ${userType}\n\n🔐 You can now login with your new password!`,
        [{
          text: 'OK',
          onPress: () => router.back()
        }]
      );

    } catch (error) {
      console.error('🚨 CRITICAL ERROR during password change:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // More specific error handling
      let errorMessage = 'An unexpected error occurred.';

      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        errorMessage = error.message || 'Unknown error occurred.';
      }

      // Check for network/connection issues
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      }

      // Check for Supabase specific errors
      if (errorMessage.includes('supabase') || errorMessage.includes('database')) {
        errorMessage = 'Database connection error. Please try again in a moment.';
      }

      Alert.alert(
        'Password Change Error',
        `❌ ${errorMessage}\n\n🔧 Please try:\n• Check your internet connection\n• Verify your credentials\n• Try again in a few moments`,
        [{ text: 'OK' }]
      );
    } finally {
      console.log('🔄 Cleaning up: Setting loading to false');
      setIsLoading(false);
    }
  };

  async function updatePassword(userType: string, identifier: any, oldPassword: any, newPassword: any) {
    try {
      // Verify old password and update based on user type
      let userData: any = null;
      let userError: any = null;
      let updateError: any = null;

      if (userType === 'student') {
        // Check students table
        const { data, error } = await supabase
          .from('students')
          .select('id, password')
          .eq('registration_number', identifier)
          .eq('password', oldPassword)
          .single();
        userData = data;
        userError = error;

        if (userData && !userError) {
          const { error: updateErr } = await supabase
            .from('students')
            .update({ password: newPassword })
            .eq('registration_number', identifier);
          updateError = updateErr;
        }
      } else if (userType === 'expert') {
        // Check experts table
        const { data, error } = await supabase
          .from('experts')
          .select('id, password')
          .eq('registration_number', identifier)
          .eq('password', oldPassword)
          .single();
        userData = data;
        userError = error;

        if (userData && !userError) {
          const { error: updateErr } = await supabase
            .from('experts')
            .update({ password: newPassword })
            .eq('registration_number', identifier);
          updateError = updateErr;
        }
      } else if (userType === 'peer') {
        // Check peer_listeners table
        const { data, error } = await supabase
          .from('peer_listeners')
          .select('id, password')
          .eq('username', identifier)
          .eq('password', oldPassword)
          .single();
        userData = data;
        userError = error;

        if (userData && !userError) {
          const { error: updateErr } = await supabase
            .from('peer_listeners')
            .update({ password: newPassword })
            .eq('username', identifier);
          updateError = updateErr;
        }
      }

      if (userError || !userData) {
        throw new Error('Invalid credentials');
      }

      if (updateError) {
        throw new Error('Failed to update password');
      }

      Alert.alert('Success', 'Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            Select your account type and enter your credentials to change your password.
          </Text>

          {/* Account Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Account Type:</Text>
            <View style={styles.radioContainer}>
              {['student', 'expert', 'peer'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioButton,
                    userType === type && styles.radioButtonSelected,
                  ]}
                  onPress={() => setUserType(type as 'student' | 'expert' | 'peer')}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.radioText,
                      userType === type && styles.radioTextSelected,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {type === 'peer' && ' Listener'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Username/Registration Input */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {userType === 'peer' ? 'Username:' : 'Username or Registration Number:'}
            </Text>
            <TextInput
              ref={userInputRef}
              style={styles.input}
              placeholder={
                userType === 'peer'
                  ? 'Enter your username'
                  : 'Enter username or registration number'
              }
              placeholderTextColor="#999"
              value={userInput}
              onChangeText={setUserInput}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              onSubmitEditing={() => oldPasswordRef.current?.focus()}
            />
          </View>

          {/* Current Password */}
          <View style={styles.section}>
            <Text style={styles.label}>Current Password:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={oldPasswordRef}
                style={styles.passwordInput}
                placeholder="Enter your current password"
                placeholderTextColor="#999"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowOldPassword(!showOldPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>
                  {showOldPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.section}>
            <Text style={styles.label}>New Password:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={newPasswordRef}
                style={styles.passwordInput}
                placeholder="Enter your new password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>
                  {showNewPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.section}>
            <Text style={styles.label}>Confirm New Password:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={confirmPasswordRef}
                style={styles.passwordInput}
                placeholder="Confirm your new password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Text>
          </TouchableOpacity>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Password Requirements:</Text>
            <Text style={styles.helpText}>
              • Must be at least 6 characters long{'\n'}
              • Must be different from your current password{'\n'}
              • Use a combination of letters, numbers, and symbols for better security
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    backgroundColor: '#884adaff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#884adaff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#884adaff',
    borderRadius: 10,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#884adaff',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#884adaff',
  },
  radioTextSelected: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  eyeText: {
    fontSize: 18,
    color: '#884adaff',
  },
  submitButton: {
    backgroundColor: '#884adaff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },
});
