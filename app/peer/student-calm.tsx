import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function StudentCalm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ registration?: string }>();
  const [showPsychologistModal, setShowPsychologistModal] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Peer listener modal state
  const [showPeerListenerModal, setShowPeerListenerModal] = useState(false);
  const [selectedPeerListener, setSelectedPeerListener] = useState<string | null>(null);
  const [selectedPeerDate, setSelectedPeerDate] = useState<string | null>(null);
  const [selectedPeerTime, setSelectedPeerTime] = useState<string | null>(null);

  // Student info state
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    email: '',
    registration: '',
    course: '',
    username: ''
  });

  // Expert data state
  const [experts, setExperts] = useState<any[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(false);

  // Peer listener data state
  const [peerListeners, setPeerListeners] = useState<any[]>([]);
  const [loadingPeerListeners, setLoadingPeerListeners] = useState(false);

  // Add this state for tracking booked sessions
  const [bookedSessions, setBookedSessions] = useState<string[]>([]);

  // Load student info on component mount
  useEffect(() => {
    const loadStudentInfo = async () => {
      try {
        let regNo = params.registration;
        if (!regNo) {
          const storedReg = await AsyncStorage.getItem('currentStudentReg');
          if (storedReg) regNo = storedReg;
        }

        if (regNo) {
          const studentData = await AsyncStorage.getItem('currentStudentData');
          if (studentData) {
            const data = JSON.parse(studentData);
            setStudentInfo({
              name: data.name || '',
              email: data.email || '',
              registration: regNo,
              course: data.course || '',
              username: data.username || ''
            });
          } else {
            setStudentInfo(prev => ({ ...prev, registration: regNo }));
          }
        }
      } catch (error) {
        console.error('Error loading student info:', error);
      }
    };

    loadStudentInfo();
    loadBookedSessions(); // Load booked sessions when component mounts
  }, [params.registration]);

  // Load expert data from database
  useEffect(() => {
    const loadExperts = async () => {
      setLoadingExperts(true);
      try {
        const { data: expertData, error } = await supabase
          .from('experts')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error loading experts:', error);
          // Fallback to default experts if database fails
          setExperts([
            {
              id: '1',
              name: 'Parvneet Kaur',
              registration_number: 'EXP001',
              specialization: 'Clinical Psychology',
              experience: '8+ years',
              rating: '4.9'
            },
            {
              id: '2',
              name: 'Himanshi Punia',
              registration_number: 'EXP002',
              specialization: 'Counseling Psychology',
              experience: '6+ years',
              rating: '4.8'
            },
            {
              id: '3',
              name: 'Anvesha Choukesy',
              registration_number: 'EXP003',
              specialization: 'Mental Health Counselor',
              experience: '5+ years',
              rating: '4.7'
            }
          ]);
        } else if (expertData && expertData.length > 0) {
          setExperts(expertData);
        } else {
          // No experts in database, use fallback
          setExperts([
            {
              id: '1',
              name: 'Parvneet Kaur',
              registration_number: 'EXP001',
              specialization: 'Clinical Psychology',
              experience: '8+ years',
              rating: '4.9'
            },
            {
              id: '2',
              name: 'Himanshi Punia',
              registration_number: 'EXP002',
              specialization: 'Counseling Psychology',
              experience: '6+ years',
              rating: '4.8'
            },
            {
              id: '3',
              name: 'Anvesha Choukesy',
              registration_number: 'EXP003',
              specialization: 'Mental Health Counselor',
              experience: '5+ years',
              rating: '4.7'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching experts:', error);
        // Use fallback data on error
        setExperts([
          {
            id: '1',
            name: 'Parvneet Kaur',
            registration_number: 'EXP001',
            specialization: 'Clinical Psychology',
            experience: '8+ years',
            rating: '4.9'
          },
          {
            id: '2',
            name: 'Himanshi Punia',
            registration_number: 'EXP002',
            specialization: 'Counseling Psychology',
            experience: '6+ years',
            rating: '4.8'
          },
          {
            id: '3',
            name: 'Anvesha Choukesy',
            registration_number: 'EXP003',
            specialization: 'Mental Health Counselor',
            experience: '5+ years',
            rating: '4.7'
          }
        ]);
      } finally {
        setLoadingExperts(false);
      }
    };

    loadExperts();
  }, []);

  // Load peer listeners from database
  useEffect(() => {
    const loadPeerListeners = async () => {
      setLoadingPeerListeners(true);
      try {
        const { data: peerListenerData, error } = await supabase
          .from('peer_listeners')
          .select('*')
          .eq('status', 'approved') // Only show approved peer listeners
          .order('name');

        if (error) {
          console.error('Error loading peer listeners:', error);
          // Fallback to default peer listeners if database fails
          setPeerListeners([
            {
              id: '1',
              name: 'Sarah Johnson',
              student_id: 'PL001',
              course: 'Psychology',
              year: '3rd Year',
              rating: '4.8'
            },
            {
              id: '2',
              name: 'Mike Chen',
              student_id: 'PL002',
              course: 'Social Work',
              year: '4th Year',
              rating: '4.9'
            },
            {
              id: '3',
              name: 'Emma Williams',
              student_id: 'PL003',
              course: 'Counseling',
              year: '2nd Year',
              rating: '4.7'
            }
          ]);
        } else if (peerListenerData && peerListenerData.length > 0) {
          setPeerListeners(peerListenerData);
        } else {
          // No peer listeners in database, use fallback
          setPeerListeners([
            {
              id: '1',
              name: 'Sarah Johnson',
              student_id: 'PL001',
              course: 'Psychology',
              year: '3rd Year',
              rating: '4.8'
            },
            {
              id: '2',
              name: 'Mike Chen',
              student_id: 'PL002',
              course: 'Social Work',
              year: '4th Year',
              rating: '4.9'
            },
            {
              id: '3',
              name: 'Emma Williams',
              student_id: 'PL003',
              course: 'Counseling',
              year: '2nd Year',
              rating: '4.7'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching peer listeners:', error);
        // Use fallback data on error
        setPeerListeners([
          {
            id: '1',
            name: 'Sarah Johnson',
            student_id: 'PL001',
            course: 'Psychology',
            year: '3rd Year',
            rating: '4.8'
          },
          {
            id: '2',
            name: 'Mike Chen',
            student_id: 'PL002',
            course: 'Social Work',
            year: '4th Year',
            rating: '4.9'
          },
          {
            id: '3',
            name: 'Emma Williams',
            student_id: 'PL003',
            course: 'Counseling',
            year: '2nd Year',
            rating: '4.7'
          }
        ]);
      } finally {
        setLoadingPeerListeners(false);
      }
    };

    loadPeerListeners();
  }, []);

  // Load booked sessions from Supabase
  const loadBookedSessions = async () => {
    try {
      // Query Supabase for all booked sessions
      const { data: sessions, error } = await supabase
        .from('book_request')
        .select('expert_id, session_date, session_time')
        .eq('status', 'confirmed'); // Only confirmed bookings count as unavailable

      if (error) {
        console.error('Error loading booked sessions:', error);
        return;
      }

      // Create unique session identifiers
      const bookedSlots = sessions?.map(session =>
        `${session.expert_id}_${session.session_date}_${session.session_time}`
      ) || [];

      setBookedSessions(bookedSlots);
    } catch (error) {
      console.error('Error in loadBookedSessions:', error);
    }
  };

  // Check if a session is booked
  const isSessionBooked = (expertId: string, date: string, time: string) => {
    const sessionKey = `${expertId}_${date}_${time}`;
    return bookedSessions.includes(sessionKey);
  };

  // Define available time slots
  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
  ];

  const getNext7Days = (): { dateString: string; displayDate: string; dayName: string }[] => {
    const days: { dateString: string; displayDate: string; dayName: string }[] = []; // Explicitly define the type
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        dateString: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
    });
    }
    return days;
  };

  const bookSession = async () => {
    if (selectedPsychologist && selectedDate && selectedTime) {
      try {
        // Validate required student information
        if (!studentInfo.registration) {
          Alert.alert('Error', 'Student registration number is missing. Please log in again.');
          return;
        }

        if (!studentInfo.name && !studentInfo.username) {
          Alert.alert('Error', 'Student name is missing. Please log in again.');
          return;
        }

        // Check if the session is already booked before proceeding
        if (isSessionBooked(selectedPsychologist, selectedDate, selectedTime)) {
          Alert.alert('Session Unavailable', 'This time slot is already booked. Please select a different time.');
          return;
        }

        // Find the selected expert details
        const expert = experts.find(e => (e.registration_number || e.id) === selectedPsychologist);

        if (!expert) {
          Alert.alert('Error', 'Selected expert information not found. Please try again.');
          return;
        }

        // Create session request data for Supabase
        const sessionRequestData = {
          student_name: studentInfo.name || studentInfo.username || 'Student',
          student_reg: studentInfo.registration || 'Unknown',
          student_email: studentInfo.email || '',
          student_course: studentInfo.course || '',
          expert_id: selectedPsychologist,
          expert_reg: expert?.registration_number || selectedPsychologist,
          expert_registration: expert?.registration_number || selectedPsychologist,
          expert_name: expert?.name || 'Unknown Expert',
          session_date: selectedDate,
          session_time: selectedTime,
          status: 'pending',
          reason: `Session booking request from ${studentInfo.name || studentInfo.username}`,
        };

        console.log('Attempting to book session with data:', sessionRequestData);

        // Guard: prevent multiple active sessions (pending or confirmed)
        try {
          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id,status,expert_name,session_date,session_time')
            .eq('student_reg', studentInfo.registration)
            .in('status', ['pending', 'confirmed'])
            .limit(1);

          if (activeError) {
            console.error('Active session check error:', activeError);
            // Non-fatal: continue to server which will enforce as well
          }

          if (activeSessions && activeSessions.length > 0) {
            const s = activeSessions[0];
            Alert.alert(
              'Active Session Exists',
              `You already have an active session (${s.status}). Please complete or cancel it before booking another.`
            );
            return;
          }
        } catch (e) {
          console.warn('Active session pre-check failed:', e);
        }

        // First test if the book_request table exists
        const { data: tableTest, error: tableError } = await supabase
          .from('book_request')
          .select('count')
          .limit(1);

        if (tableError) {
          console.error('Table access error:', tableError);
          if (tableError.code === '42P01') {
            Alert.alert('Database Error', 'The booking system is not set up. Please run the database setup script in Supabase.');
          } else {
            Alert.alert('Database Error', `Cannot access booking table: ${tableError.message}`);
          }
          return;
        }

        // Save to Supabase book_request table
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('book_request')
          .insert([sessionRequestData])
          .select()
          .single();

    if (supabaseError) {
          console.error('Supabase error details:', supabaseError);

          // Check for specific error types
          if (supabaseError.code === '42P01') {
            Alert.alert('Database Error', 'The book_request table does not exist. Please check the database setup.');
          } else if (supabaseError.code === '23505') {
      // Matches partial unique index on (student_reg) WHERE status in ('pending','confirmed')
      Alert.alert('Booking Conflict', 'You already have an active session (pending or confirmed). Please complete or cancel it before booking another.');
          } else if (supabaseError.code === '42501') {
            Alert.alert('Permission Error', 'Database permission denied. Please check RLS policies.');
          } else {
            Alert.alert('Error', `Failed to send session request: ${supabaseError.message || supabaseError.details || 'Unknown error'}`);
          }
          return;
        }

        // Also save to AsyncStorage for backward compatibility and offline access
        const sessionRequest = {
          id: supabaseData.id || `session_${Date.now()}`,
          studentName: studentInfo.name || studentInfo.username || 'Student',
          studentReg: studentInfo.registration || 'Unknown',
          studentEmail: studentInfo.email || '',
          studentCourse: studentInfo.course || '',
          psychologistId: selectedPsychologist,
          psychologistName: expert?.name || 'Unknown Expert',
          expertRegistration: expert?.registration_number || selectedPsychologist,
          date: selectedDate,
          time: selectedTime,
          status: 'pending',
          requestedAt: new Date().toISOString(),
          notes: `Session booking request from ${studentInfo.name || studentInfo.username}`
        };

        // Save to AsyncStorage for expert to see (backward compatibility)
        const existingSessions = await AsyncStorage.getItem('psychologistSessions');
        const sessions = existingSessions ? JSON.parse(existingSessions) : [];
        sessions.push(sessionRequest);
        await AsyncStorage.setItem('psychologistSessions', JSON.stringify(sessions));

        // Also save to expert-specific storage
        const expertSessions = await AsyncStorage.getItem(`sessions_${selectedPsychologist}`);
        const expertSessionsList = expertSessions ? JSON.parse(expertSessions) : [];
        expertSessionsList.push(sessionRequest);
        await AsyncStorage.setItem(`sessions_${selectedPsychologist}`, JSON.stringify(expertSessionsList));

        // After successful booking, refresh the booked sessions
        await loadBookedSessions();

        // Reset selections and close modal
        setSelectedDate(null);
        setSelectedTime(null);
        setShowPsychologistModal(false);

        // Show success message
        Alert.alert(
          '✅ Session Request Sent Successfully!',
          `Your session request has been saved to the database.\n\n` +
          `📋 Request Details:\n` +
          `• Expert: ${expert?.name || 'Expert'}\n` +
          `• Expert ID: ${expert?.registration_number || selectedPsychologist}\n` +
          `• Date: ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
          `• Time: ${selectedTime}\n` +
          `• Request ID: ${supabaseData.id}\n` +
          `• Status: Pending\n\n` +
          `✉️ The expert will receive your request and will respond soon.\n` +
          `🔔 You will receive a confirmation once approved.`,
          [{ text: 'OK', style: 'default' }]
        );

      } catch (error) {
        console.error('Error booking session:', error);
        Alert.alert('Error', `Failed to send session request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      }
    }
  };

  const bookPeerSession = async () => {
    if (selectedPeerListener && selectedPeerDate && selectedPeerTime) {
      try {
        // Validate required student information
        if (!studentInfo.registration) {
          Alert.alert('Error', 'Student registration number is missing. Please log in again.');
          return;
        }

        if (!studentInfo.name && !studentInfo.username) {
          Alert.alert('Error', 'Student name is missing. Please log in again.');
          return;
        }

        // Check if the session is already booked before proceeding
        if (isSessionBooked(selectedPeerListener, selectedPeerDate, selectedPeerTime)) {
          Alert.alert('Session Unavailable', 'This time slot is already booked. Please select a different time.');
          return;
        }

        // Find the selected peer listener details
        const peerListener = peerListeners.find(p => (p.student_id || p.id) === selectedPeerListener);

        if (!peerListener) {
          Alert.alert('Error', 'Selected peer listener information not found. Please try again.');
          return;
        }

        // Create session request data for Supabase
        const sessionRequestData = {
          student_name: studentInfo.name || studentInfo.username || 'Student',
          student_reg: studentInfo.registration || 'Unknown',
          student_email: studentInfo.email || '',
          student_course: studentInfo.course || '',
          expert_id: selectedPeerListener,
          expert_reg: peerListener?.student_id || selectedPeerListener,
          expert_registration: peerListener?.student_id || selectedPeerListener,
          expert_name: peerListener?.name || 'Unknown Peer Listener',
          session_date: selectedPeerDate,
          session_time: selectedPeerTime,
          status: 'pending',
          session_type: 'peer_listener', // Add this to distinguish from psychologist sessions
          reason: `Peer listener session booking request from ${studentInfo.name || studentInfo.username}`,
        };

        console.log('Attempting to book peer listener session with data:', sessionRequestData);

        // Guard: prevent multiple active sessions (pending or confirmed)
        try {
          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id,status,expert_name,session_date,session_time')
            .eq('student_reg', studentInfo.registration)
            .in('status', ['pending', 'confirmed'])
            .limit(1);

          if (activeError) {
            console.error('Active session check error:', activeError);
            // Non-fatal: continue to server which will enforce as well
          }

          if (activeSessions && activeSessions.length > 0) {
            const s = activeSessions[0];
            Alert.alert(
              'Active Session Exists',
              `You already have an active session (${s.status}). Please complete or cancel it before booking another.`
            );
            return;
          }
        } catch (e) {
          console.warn('Active session pre-check failed:', e);
        }

        // Save to Supabase book_request table
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('book_request')
          .insert([sessionRequestData])
          .select()
          .single();

        if (supabaseError) {
          console.error('Supabase error details:', supabaseError);

          // Check for specific error types
          if (supabaseError.code === '42P01') {
            Alert.alert('Database Error', 'The book_request table does not exist. Please check the database setup.');
          } else if (supabaseError.code === '23505') {
            Alert.alert('Booking Conflict', 'You already have an active session (pending or confirmed). Please complete or cancel it before booking another.');
          } else if (supabaseError.code === '42501') {
            Alert.alert('Permission Error', 'Database permission denied. Please check RLS policies.');
          } else {
            Alert.alert('Error', `Failed to send session request: ${supabaseError.message || supabaseError.details || 'Unknown error'}`);
          }
          return;
        }

        // Also save to AsyncStorage for backward compatibility and offline access
        const sessionRequest = {
          id: supabaseData.id || `peer_session_${Date.now()}`,
          studentName: studentInfo.name || studentInfo.username || 'Student',
          studentReg: studentInfo.registration || 'Unknown',
          studentEmail: studentInfo.email || '',
          studentCourse: studentInfo.course || '',
          peerListenerId: selectedPeerListener,
          peerListenerName: peerListener?.name || 'Unknown Peer Listener',
          peerListenerStudentId: peerListener?.student_id || selectedPeerListener,
          date: selectedPeerDate,
          time: selectedPeerTime,
          status: 'pending',
          sessionType: 'peer_listener',
          requestedAt: new Date().toISOString(),
          notes: `Peer listener session booking request from ${studentInfo.name || studentInfo.username}`
        };

        // Save to AsyncStorage for peer listener to see (backward compatibility)
        const existingSessions = await AsyncStorage.getItem('peerListenerSessions');
        const sessions = existingSessions ? JSON.parse(existingSessions) : [];
        sessions.push(sessionRequest);
        await AsyncStorage.setItem('peerListenerSessions', JSON.stringify(sessions));

        // Also save to peer listener-specific storage
        const peerSessions = await AsyncStorage.getItem(`peer_sessions_${selectedPeerListener}`);
        const peerSessionsList = peerSessions ? JSON.parse(peerSessions) : [];
        peerSessionsList.push(sessionRequest);
        await AsyncStorage.setItem(`peer_sessions_${selectedPeerListener}`, JSON.stringify(peerSessionsList));

        // After successful booking, refresh the booked sessions
        await loadBookedSessions();

        // Reset selections and close modal
        setSelectedPeerDate(null);
        setSelectedPeerTime(null);
        setShowPeerListenerModal(false);

        // Show success message
        Alert.alert(
          '✅ Peer Listener Session Request Sent Successfully!',
          `Your session request has been saved to the database.\n\n` +
          `📋 Request Details:\n` +
          `• Peer Listener: ${peerListener?.name || 'Peer Listener'}\n` +
          `• Student ID: ${peerListener?.student_id || selectedPeerListener}\n` +
          `• Date: ${new Date(selectedPeerDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
          `• Time: ${selectedPeerTime}\n` +
          `• Request ID: ${supabaseData.id}\n` +
          `• Status: Pending\n\n` +
          `✉️ The peer listener will receive your request and will respond soon.\n` +
          `🔔 You will receive a confirmation once approved.`,
          [{ text: 'OK', style: 'default' }]
        );

      } catch (error) {
        console.error('Error booking peer listener session:', error);
        Alert.alert('Error', `Failed to send session request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      }
    }
  };

  // Add real-time subscription for booked sessions
  useEffect(() => {
    // Set up real-time subscription for book_request table
    const subscription = supabase
      .channel('book_request_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'book_request'
        },
        (payload) => {
          // Refresh booked sessions when the table changes
          loadBookedSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Add this component to show session availability legend
  const SessionAvailabilityLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Session Availability:</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4A148C' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8E24AA' }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CE93D8' }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
      </View>
    </View>
  );

  // Render time slot with booking status
  const renderTimeSlot = (time: string) => {
    const isSelected = selectedTime === time;
    const isBooked = selectedPsychologist && selectedDate ?
      isSessionBooked(selectedPsychologist, selectedDate, time) : false;

    return (
      <TouchableOpacity
        key={time}
        style={[
          styles.timeSlot,
          isSelected && styles.selectedTimeSlot,
          isBooked && styles.bookedTimeSlot,
        ]}
        onPress={() => {
          if (isBooked) {
            Alert.alert(
              'Session Unavailable',
              'This time slot is already booked. Please select a different time.',
              [{ text: 'OK' }]
            );
          } else {
            setSelectedTime(time);
          }
        }}
        disabled={isBooked}
      >
        <View style={styles.timeSlotContent}>
          <Text style={[
            styles.timeText,
            isSelected && styles.selectedTimeText,
            isBooked && styles.bookedTimeText,
          ]}>
            {time}
          </Text>
          <View style={[
            styles.statusDot,
            isBooked && styles.bookedStatusDot,
            { backgroundColor: isBooked ? '#CE93D8' : (isSelected ? '#8E24AA' : '#4A148C') }
          ]} />
          {isBooked && (
            <Text style={styles.bookedIndicatorText}>❌</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧘‍♀️ Student Calm Space</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Connection Buttons */}
        <View style={styles.connectionCard}>
          <Text style={styles.cardTitle}> Professional Support</Text>
          <Text style={styles.cardSubtitle}>Connect with mental health professionals</Text>

          <View style={styles.connectionButtons}>
            <TouchableOpacity
              style={styles.connectionButton}
              onPress={() => setShowPsychologistModal(true)}
            >
              <Text style={styles.connectionIcon}>👩‍⚕️</Text>
              <Text style={styles.connectionButtonText}>Connect with{'\n'}Psychologist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectionButton}
              onPress={() => setShowPeerListenerModal(true)}
            >
              <Text style={styles.connectionIcon}>👥</Text>
              <Text style={styles.connectionButtonText}>Connect with{'\n'}Peer Listener</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Psychologist Booking Modal */}
      <Modal
        visible={showPsychologistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPsychologistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Session with Psychologist</Text>
              <TouchableOpacity
                onPress={() => setShowPsychologistModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Expert Selection */}
              <Text style={styles.sectionTitle}>Select Expert</Text>
              {loadingExperts ? (
                <Text style={styles.loadingText}>Loading experts...</Text>
              ) : experts.length === 0 ? (
                <Text style={styles.emptyText}>No experts available at the moment.</Text>
              ) : (
                experts.map((expert) => (
                  <TouchableOpacity
                    key={expert.id || expert.registration_number}
                    style={[
                      styles.psychologistCard,
                      selectedPsychologist === (expert.registration_number || expert.id) && styles.selectedPsychologistCard
                    ]}
                    onPress={() => setSelectedPsychologist(expert.registration_number || expert.id)}
                  >
                    <View style={styles.psychologistInfo}>
                      <Text style={styles.psychologistName}>{expert.name}</Text>
                      <Text style={styles.expertId}>Expert ID: {expert.registration_number || expert.id}</Text>
                      <Text style={styles.psychologistSpecialization}>{expert.specialization || 'Mental Health Expert'}</Text>
                      <Text style={styles.psychologistDetails}>
                        Experience: {expert.experience || '5+ years'} | Rating: ⭐ {expert.rating || '4.8'}
                      </Text>
                    </View>
                    {selectedPsychologist === (expert.registration_number || expert.id) && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}

              {/* Calendar */}
              {selectedPsychologist && (
                <>
                  <Text style={styles.sectionTitle}>Select Date</Text>
                  <View style={styles.calendarContainer}>
                    {getNext7Days().map((day) => (
                      <TouchableOpacity
                        key={day.dateString}
                        style={[
                          styles.dateButton,
                          selectedDate === day.dateString && styles.selectedDateButton
                        ]}
                        onPress={() => setSelectedDate(day.dateString)}
                      >
                        <Text style={[
                          styles.dayName,
                          selectedDate === day.dateString && styles.selectedDateText
                        ]}>
                          {day.dayName}
                        </Text>
                        <Text style={[
                          styles.dateText,
                          selectedDate === day.dateString && styles.selectedDateText
                        ]}>
                          {day.displayDate}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Time Slots */}
              {selectedPsychologist && selectedDate && (
                <>
                  <Text style={styles.sectionTitle}>Available Time Slots</Text>

                  {/* Legend */}
                  <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>Status Legend:</Text>
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                        <Text style={styles.legendText}>Available</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#2196f3' }]} />
                        <Text style={styles.legendText}>Selected</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, styles.bookedStatusDot, { backgroundColor: '#f44336' }]} />
                        <Text style={styles.legendText}>Booked</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.timeSlotsContainer}>
                    {timeSlots.map((time) => {
                      const isBooked = isSessionBooked(selectedPsychologist, selectedDate, time);
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeSlot,
                            isBooked && styles.bookedTimeSlot,
                            selectedTime === time && styles.selectedTimeSlot,
                            isBooked && { opacity: 0.5 }
                          ]}
                          onPress={() => {
                            if (isBooked) {
                              Alert.alert(
                                'Session Unavailable',
                                'This time slot is already booked. Please select a different time.',
                                [{ text: 'OK' }]
                              );
                            } else {
                              setSelectedTime(time);
                            }
                          }}
                          disabled={isBooked}
                        >
                          <View style={styles.timeSlotContent}>
                            <Text style={[
                              styles.timeText,
                              isBooked && styles.bookedTimeText,
                              selectedTime === time && styles.selectedTimeText
                            ]}>
                              {time}
                            </Text>
                            <View style={[
                              styles.statusDot,
                              isBooked && styles.bookedStatusDot,
                              { backgroundColor: isBooked ? '#f44336' : (selectedTime === time ? '#2196f3' : '#4caf50') }
                            ]} />
                            {isBooked && (
                              <Text style={styles.bookedIndicatorText}>❌</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Book Button */}
              {selectedPsychologist && selectedDate && selectedTime && (
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={bookSession}
                >
                  <Text style={styles.bookButtonText}>Book Session</Text>
                </TouchableOpacity>
              )}

              {/* Session Availability Legend */}
              {selectedPsychologist && (
                <SessionAvailabilityLegend />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Peer Listener Booking Modal */}
      <Modal
        visible={showPeerListenerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPeerListenerModal(false);
          setSelectedPeerListener(null);
          setSelectedPeerDate(null);
          setSelectedPeerTime(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Session with Peer Listener</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPeerListenerModal(false);
                  setSelectedPeerListener(null);
                  setSelectedPeerDate(null);
                  setSelectedPeerTime(null);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Peer Listener Selection */}
              <Text style={styles.sectionTitle}>Select Peer Listener</Text>
              {loadingPeerListeners ? (
                <Text style={styles.loadingText}>Loading peer listeners...</Text>
              ) : peerListeners.length === 0 ? (
                <Text style={styles.emptyText}>No peer listeners available at the moment.</Text>
              ) : (
                peerListeners.map((peerListener) => (
                  <TouchableOpacity
                    key={peerListener.id || peerListener.student_id}
                    style={[
                      styles.psychologistCard,
                      selectedPeerListener === (peerListener.student_id || peerListener.id) && styles.selectedPsychologistCard
                    ]}
                    onPress={() => setSelectedPeerListener(peerListener.student_id || peerListener.id)}
                  >
                    <View style={styles.psychologistInfo}>
                      <Text style={styles.psychologistName}>{peerListener.name}</Text>
                      <Text style={styles.expertId}>Student ID: {peerListener.student_id || peerListener.id}</Text>
                      <Text style={styles.psychologistSpecialization}>{peerListener.course || 'Peer Support'}</Text>
                      <Text style={styles.psychologistDetails}>
                        Year: {peerListener.year || 'N/A'} | Rating: ⭐ {peerListener.rating || '4.8'}
                      </Text>
                    </View>
                    {selectedPeerListener === (peerListener.student_id || peerListener.id) && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}

              {/* Calendar */}
              {selectedPeerListener && (
                <>
                  <Text style={styles.sectionTitle}>Select Date</Text>
                  <View style={styles.calendarContainer}>
                    {getNext7Days().map((day) => (
                      <TouchableOpacity
                        key={day.dateString}
                        style={[
                          styles.dateButton,
                          selectedPeerDate === day.dateString && styles.selectedDateButton
                        ]}
                        onPress={() => setSelectedPeerDate(day.dateString)}
                      >
                        <Text style={[
                          styles.dayName,
                          selectedPeerDate === day.dateString && styles.selectedDateText
                        ]}>
                          {day.dayName}
                        </Text>
                        <Text style={[
                          styles.dateText,
                          selectedPeerDate === day.dateString && styles.selectedDateText
                        ]}>
                          {day.displayDate}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Time Slots */}
              {selectedPeerListener && selectedPeerDate && (
                <>
                  <Text style={styles.sectionTitle}>Available Time Slots</Text>

                  {/* Legend */}
                  <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>Status Legend:</Text>
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                        <Text style={styles.legendText}>Available</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#2196f3' }]} />
                        <Text style={styles.legendText}>Selected</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.statusDot, styles.bookedStatusDot, { backgroundColor: '#f44336' }]} />
                        <Text style={styles.legendText}>Booked</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.timeSlotsContainer}>
                    {timeSlots.map((time) => {
                      const isBooked = isSessionBooked(selectedPeerListener, selectedPeerDate, time);
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeSlot,
                            isBooked && styles.bookedTimeSlot,
                            selectedPeerTime === time && styles.selectedTimeSlot,
                            isBooked && { opacity: 0.5 }
                          ]}
                          onPress={() => {
                            if (isBooked) {
                              Alert.alert(
                                'Session Unavailable',
                                'This time slot is already booked. Please select a different time.',
                                [{ text: 'OK' }]
                              );
                            } else {
                              setSelectedPeerTime(time);
                            }
                          }}
                          disabled={isBooked}
                        >
                          <View style={styles.timeSlotContent}>
                            <Text style={[
                              styles.timeText,
                              isBooked && styles.bookedTimeText,
                              selectedPeerTime === time && styles.selectedTimeText
                            ]}>
                              {time}
                            </Text>
                            <View style={[
                              styles.statusDot,
                              isBooked && styles.bookedStatusDot,
                              { backgroundColor: isBooked ? '#f44336' : (selectedPeerTime === time ? '#2196f3' : '#4caf50') }
                            ]} />
                            {isBooked && (
                              <Text style={styles.bookedIndicatorText}>❌</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Book Button */}
              {selectedPeerListener && selectedPeerDate && selectedPeerTime && (
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={bookPeerSession}
                >
                  <Text style={styles.bookButtonText}>Book Session</Text>
                </TouchableOpacity>
              )}

              {/* Session Availability Legend */}
              {selectedPeerListener && (
                <SessionAvailabilityLegend />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fef9e7',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  // Connection buttons styles
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  connectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  connectionButton: {
    width: '48%',
    backgroundColor: '#a8e6cf',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#e8b4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  connectionIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  connectionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalCloseButton: {
    backgroundColor: '#ffb3ba',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    marginTop: 10,
  },
  // Psychologist card styles
  psychologistCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPsychologistCard: {
    backgroundColor: '#e8f8f5',
    borderColor: '#4ecdc4',
  },
  psychologistInfo: {
    flex: 1,
  },
  psychologistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  psychologistSpecialization: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  psychologistDetails: {
    fontSize: 12,
    color: '#95a5a6',
  },
  expertId: {
    fontSize: 14,
    color: '#7b1fa2',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  selectedIcon: {
    fontSize: 20,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  // Calendar styles
  calendarContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '13%',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDateButton: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  dayName: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 2,
  },
  selectedDateText: {
    color: '#FFF',
  },
  // Time slots styles
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeSlot: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    width: '30%',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeSlot: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  bookedTimeSlot: {
    backgroundColor: '#ffebee', // Light red background
    borderColor: '#f44336', // Red border
    borderWidth: 2,
    opacity: 0.6, // Make it slightly transparent
  },
  timeSlotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  selectedTimeText: {
    color: '#FFF',
  },
  bookedTimeText: {
    color: '#e74c3c',
  },
  bookedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookedStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  bookedIndicatorText: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
  },
  // Book button
  bookButton: {
    backgroundColor: '#4ecdc4',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Legend styles
  legendContainer: {
    backgroundColor: '#f1f8e9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 10,
    marginBottom: 15,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
