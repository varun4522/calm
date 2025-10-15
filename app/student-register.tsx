import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { FACULTY } from '@/constants/courses';
import { getAllUsernames, getAllRegistrationNumbers } from "@/api/Profile";
import Toast from 'react-native-toast-message';

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
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const validateStudentData = async ({
    name,
    username,
    registrationNumber,
    course,
    phone,
    dob,
    email,
    password
  }: {
    name: string;
    username: string;
    registrationNumber: string;
    course: string;
    phone: string;
    dob: string;
    email: string;
    password: string;
  }) => {
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{8,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Fetch existing usernames and registration numbers
    const allUsernames = await getAllUsernames();
    const allRegistrationNumbers = await getAllRegistrationNumbers();

    if (!name || !username || !registrationNumber || !course || !phone || !dob || !email || !password) {
      Alert.alert("All fields are required.");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Password must be at least 8 characters.");
      return false;
    }

    if (!passwordRegex.test(password)) {
      Alert.alert("Invalid Password", "Password must include letters, numbers, and special characters.");
      return false;
    }

    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return false;
    }

    if (allUsernames.includes(username)) {
      Alert.alert("Username taken", "Username is already taken. Try another one.");
      return false;
    }

    if (allRegistrationNumbers.includes(registrationNumber)) {
      Alert.alert("Registration Number taken", "Registration number is already taken.");
      return false;
    }

    return true;
  };

  async function signUpWithEmail() {
    // Validate data using the new validation function
    const isValidated = await validateStudentData({
      name,
      username,
      registrationNumber,
      course,
      phone,
      dob,
      email,
      password
    });

    if (!isValidated) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user) {
        const user_data = {
            id: user.id,
            username: username,
            registration_number: registrationNumber,
            name: name,
            course: 'FACULTY_OF_' + course.replace(/\s+/g, '_').toUpperCase(),
            phone_number: phone,
            email: email,
            date_of_birth: dob,
            type: "STUDENT",
          };
        console.log(user_data);
        const { error: insertError } = await supabase
          .from("profiles")
          .insert(user_data);
        console.log("ISNERTION ERROR" , insertError);
        if (insertError) {
          Toast.show({
            type: 'error',
            text1: 'Account creation unsuccessful',
            position: 'bottom',
            visibilityTime: 1500
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Account creation successful',
            position: 'bottom',
            visibilityTime: 1500
          });
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%" style={styles.svg} viewBox="0 0 100 100">
        <Path d="M0,20 C30,40 70,0 100,20 L100,100 L0,100 Z" fill="#D8BFD8" />
      </Svg>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Student Registration</Text>
        </View>

        <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContainer}>
            <View style={styles.formContainer}>
              {/* Name */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor="#a8a8a8" />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#a8a8a8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#a8a8a8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Username */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Username *</Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Choose a username" placeholderTextColor="#a8a8a8" autoCapitalize="none" />
              </View>

              {/* Registration Number */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Registration Number *</Text>
                <TextInput style={styles.input} value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="Enter your registration number" placeholderTextColor="#a8a8a8" />
              </View>

              {/* Course */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Course/Program *</Text>
                <TouchableOpacity onPress={() => setCourseModalVisible(true)} style={styles.selectCourseButton}>
                  <Text style={[styles.inputText, { color: course ? '#333' : '#a8a8a8' }]}>{'Faculty of ' + course.toLowerCase() || 'Select your course or program'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Date of Birth *</Text>
                <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="DD/MM/YYYY" placeholderTextColor="#a8a8a8" />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a password (min 6 characters)"
                    placeholderTextColor="#a8a8a8"
                    secureTextEntry={!passwordVisible}
                  />
                  <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.passwordToggle}>
                    <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity style={styles.registerButton} onPress={()=> {signUpWithEmail()}}>
                <Text style={styles.registerButtonText}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Course Modal */}
      <Modal visible={courseModalVisible} transparent={true} animationType="slide" onRequestClose={() => setCourseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Faculty</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: '100%' }}>
              {Object.entries(FACULTY).map(([key, facultyName], index) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setCourse(key);
                    setCourseModalVisible(false);
                  }}
                  style={[styles.courseItem, course === key && { backgroundColor: Colors.accentLight }]}
                >
                  <Text style={[styles.courseText, course === key && { color: Colors.primary, fontWeight: 'bold' }]}>
                    {index + 1}. {facultyName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },
  svg: { position: 'absolute', top: '20%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: 'transparent' },
  backButton: { backgroundColor: Colors.white, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 15, elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 2, borderColor: Colors.primary },
  backButtonText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  headerText: { color: Colors.white, fontSize: 20, fontWeight: 'bold', flex: 1, textShadowColor: Colors.black, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 3 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  formContainer: { backgroundColor: 'white', borderRadius: 20, padding: 25, marginTop: 20, elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  inputWrapper: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 8 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  selectCourseButton: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { fontSize: 16, flex: 1 },
  passwordWrapper: { position: 'relative' },
  passwordToggle: { position: 'absolute', right: 12, top: 14, padding: 4 },
  registerButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  courseItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: 'white' },
  courseText: { fontSize: 16, color: '#333' },
});