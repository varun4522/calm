import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
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

  // Add state for session history
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    loadSessionHistory(); // Load session history when component mounts
  }, [params.registration]);

  // Load expert data from user_requests table
  useEffect(() => {
    const loadExperts = async () => {
      setLoadingExperts(true);
      try {
        console.log('Loading experts from user_requests table...');
        const { data: expertData, error } = await supabase
          .from('user_requests')
          .select('*')
          .eq('user_type', 'Expert')
          .order('user_name');

        if (error) {
          console.error('Error loading experts from user_requests table:', error);
          console.error('Error details:', error.message);
          setExperts([]);
        } else if (expertData && expertData.length > 0) {
          // Transform data to match expected format
          const transformedExperts = expertData.map(expert => ({
            id: expert.id?.toString() || expert.registration_number || `expert_${Math.random()}`,
            name: expert.user_name || 'Unknown Expert',
            registration_number: expert.registration_number || expert.id?.toString() || 'N/A',
            specialization: expert.specialization || expert.course || 'Mental Health Expert',
            experience: expert.experience || '5+ years',
            rating: expert.rating ? expert.rating.toString() : '4.8',
            email: expert.email || '',
            phone: expert.phone || '',
            qualifications: expert.qualifications || '',
            bio: expert.bio || `Expert in ${expert.specialization || 'Mental Health'}`,
            username: expert.username || ''
          }));
          setExperts(transformedExperts);
          console.log('Successfully loaded experts from user_requests table:', transformedExperts.length);
        } else {
          // No experts in database
          console.log('No experts found in user_requests table');
          setExperts([]);
        }
      } catch (error) {
        console.error('Error fetching experts:', error);
        setExperts([]);
      } finally {
        setLoadingExperts(false);
      }
    };

    loadExperts();
  }, []);

  // Load peer listeners from user_requests table
  useEffect(() => {
    const loadPeerListeners = async () => {
      setLoadingPeerListeners(true);
      try {
        console.log('Loading peer listeners from user_requests table...');
        const { data: peerListenerData, error } = await supabase
          .from('user_requests')
          .select('*')
          .eq('user_type', 'Peer Listener')
          .order('user_name');

        if (error) {
          console.error('Error loading peer listeners from user_requests table:', error);
          console.error('Error details:', error.message);
          setPeerListeners([]);
        } else if (peerListenerData && peerListenerData.length > 0) {
          // Transform data to match expected format
          const transformedPeerListeners = peerListenerData.map(peerListener => ({
            id: peerListener.id?.toString() || peerListener.registration_number || `peer_${Math.random()}`,
            name: peerListener.user_name || 'Unknown Peer Listener',
            student_id: peerListener.registration_number || peerListener.id?.toString() || 'N/A',
            course: peerListener.course || 'General Studies',
            year: peerListener.year || 'Not specified',
            rating: peerListener.rating ? peerListener.rating.toString() : '4.5',
            email: peerListener.email || '',
            phone: peerListener.phone || '',
            username: peerListener.username || '',
            bio: peerListener.bio || `${peerListener.course || 'Student'} peer listener ready to help`
          }));
          setPeerListeners(transformedPeerListeners);
          console.log('Successfully loaded peer listeners from user_requests table:', transformedPeerListeners.length);
        } else {
          // No peer listeners in database
          console.log('No peer listeners found in user_requests table');
          setPeerListeners([]);
        }
      } catch (error) {
        console.error('Error fetching peer listeners:', error);
        setPeerListeners([]);
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
        .eq('status', 'approved'); // Only approved bookings count as unavailable

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

  // Load session history for current user
  const loadSessionHistory = async () => {
    try {
      setLoadingHistory(true);
      let regNo = studentInfo.registration;
      if (!regNo) {
        const storedReg = await AsyncStorage.getItem('currentStudentReg');
        if (storedReg) regNo = storedReg;
      }

      if (!regNo) {
        console.log('No registration number found for session history');
        setLoadingHistory(false);
        return;
      }

      console.log('Loading session history for:', regNo);

      // Query Supabase for user's booked sessions - use only book_request table
      const { data: sessions, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('student_reg', regNo)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading session history:', error);
        setSessionHistory([]);
      } else {
        console.log('Session history loaded:', sessions);
        setSessionHistory(sessions || []);
      }
    } catch (error) {
      console.error('Error in loadSessionHistory:', error);
      setSessionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Delete a session from history
  const deleteSession = async (sessionId: number) => {
    try {
      const { error } = await supabase
        .from('book_request')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        Alert.alert('Error', 'Failed to delete session. Please try again.');
      } else {
        Alert.alert('Success', 'Session deleted successfully.');
        // Reload session history to reflect changes
        loadSessionHistory();
      }
    } catch (error) {
      console.error('Error in deleteSession:', error);
      Alert.alert('Error', 'Failed to delete session. Please try again.');
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
          user_name: studentInfo.username || studentInfo.name || 'Student',
          registration_number: studentInfo.registration || 'Unknown',
          book_title: 'Session Booking',
          expert_id: selectedPsychologist,
          expert_registration: expert?.registration_number || selectedPsychologist,
          expert_name: expert?.name || 'Unknown Expert',
          session_date: selectedDate,
          session_time: selectedTime,
          status: 'pending',
          reason: `Session booking request from ${studentInfo.name || studentInfo.username}`,
        };

        console.log('Attempting to book session with data:', sessionRequestData);

        // Guard: prevent more than 2 active sessions (pending or approved)
        try {
          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id,status,expert_id,expert_name,session_date,session_time')
            .eq('student_reg', studentInfo.registration)
            .in('status', ['pending', 'approved']);

          if (activeError) {
            console.error('Active session check error:', activeError);
            // Non-fatal: continue to server which will enforce as well
          }

          if (activeSessions && activeSessions.length >= 2) {
            Alert.alert(
              'Maximum Sessions Reached',
              `You already have ${activeSessions.length} active sessions. Please complete or cancel at least one before booking another.\n\nActive Sessions:\n${activeSessions.map((s, i) => `${i + 1}. ${s.expert_name} - ${s.status}`).join('\n')}`
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
      // Unique constraint violation - student already has maximum sessions
      Alert.alert('Maximum Sessions Reached', 'You already have 2 active sessions (pending or approved). Please complete or cancel at least one before booking another.');
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
        await loadSessionHistory();

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

        // Guard: prevent more than 2 active sessions (pending or approved)
        try {
          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id,status,expert_id,expert_name,session_date,session_time')
            .eq('student_reg', studentInfo.registration)
            .in('status', ['pending', 'approved']);

          if (activeError) {
            console.error('Active session check error:', activeError);
            // Non-fatal: continue to server which will enforce as well
          }

          if (activeSessions && activeSessions.length >= 2) {
            Alert.alert(
              'Maximum Sessions Reached',
              `You already have ${activeSessions.length} active sessions. Please complete or cancel at least one before booking another.\n\nActive Sessions:\n${activeSessions.map((s, i) => `${i + 1}. ${s.expert_name} - ${s.status}`).join('\n')}`
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
            Alert.alert('Maximum Sessions Reached', 'You already have 2 active sessions (pending or approved). Please complete or cancel at least one before booking another.');
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
        await loadSessionHistory();

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
  // const renderTimeSlot = (time: string) => {
  //   const isSelected = selectedTime === time;
  //   const isBooked = selectedPsychologist && selectedDate ?
  //     isSessionBooked(selectedPsychologist, selectedDate, time) : false;

  //   return (
  //     <TouchableOpacity
  //       key={time}
  //       style={[
  //         styles.timeSlot,
  //         isSelected && styles.selectedTimeSlot,
  //         isBooked && styles.bookedTimeSlot,
  //       ]}
  //       onPress={() => {
  //         if (isBooked) {
  //           Alert.alert(
  //             'Session Unavailable',
  //             'This time slot is already booked. Please select a different time.',
  //             [{ text: 'OK' }]
  //           );
  //         } else {
  //           setSelectedTime(time);
  //         }
  //       }}
  //       disabled={isBooked}
  //     >
  //       <View style={styles.timeSlotContent}>
  //         <Text style={[
  //           styles.timeText,
  //           isSelected && styles.selectedTimeText,
  //           isBooked && styles.bookedTimeText,
  //         ]}>
  //           {time}
  //         </Text>
  //         <View style={[
  //           styles.statusDot,
  //           isBooked && styles.bookedStatusDot,
  //           { backgroundColor: isBooked ? '#CE93D8' : (isSelected ? '#8E24AA' : '#4A148C') }
  //         ]} />
  //         {isBooked && (
  //           <Text style={styles.bookedIndicatorText}>❌</Text>
  //         )}
  //       </View>
  //     </TouchableOpacity>
  //   );
  // };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}> ← </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Calm Space</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Professional Support Card */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 25, margin: 20, elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1.3, shadowRadius: 50 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 8 }}>Professional Support</Text>
          <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>Connect with health professionals</Text>

          {/* Connection Buttons in 2x1 layout */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 10 }}>
            <TouchableOpacity
              style={{ width: '45%', height: 100, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white }}
              onPress={() => setShowPsychologistModal(true)}
            >
              <Image source={require('../../assets/images/connect.png')} style={{ width: 50, height: 50, marginBottom: 8, resizeMode: 'contain' }} />
              <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>Connect with{'\n'}Psychologist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ width: '45%', height: 100, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, marginHorizontal: 10, marginVertical: 8, backgroundColor: Colors.white }}
              onPress={() => setShowPeerListenerModal(true)}
            >
              <Image source={require('../../assets/images/connect.png')} style={{ width: 50, height: 50, marginBottom: 8, resizeMode: 'contain' }} />
              <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>Connect with{'\n'}Peer Listener</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Session History Card */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 25, padding: 25, margin: 20, elevation: 8, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1.3, shadowRadius: 50 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: 8 }}>Session History</Text>
          <Text style={{ fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>Your booked sessions</Text>

          {loadingHistory ? (
            <Text style={{ textAlign: 'center', color: Colors.textSecondary, fontSize: 16 }}>Loading session history...</Text>
          ) : sessionHistory.length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.textSecondary, fontSize: 16 }}>No sessions booked yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 300 }}>
              {sessionHistory.map((session) => (
                <View key={session.id} style={{ backgroundColor: Colors.backgroundLight, borderRadius: 15, padding: 15, marginBottom: 10, elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 }}>
                        {session.expert_name || 'Unknown Expert'}
                      </Text>
                      <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 2 }}>
                        {session.session_type === 'peer_listener' ? '👥 Peer Listener Session' : '🩺 Expert Consultation'}
                      </Text>
                      <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 2 }}>
                        Expert ID: {session.expert_registration || session.expert_id || 'N/A'}
                      </Text>
                      <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 2 }}>
                        Date: {new Date(session.session_date).toLocaleDateString()}
                      </Text>
                      <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 4 }}>
                        Time: {session.session_time}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: session.status === 'approved' ? Colors.success : session.status === 'pending' ? Colors.warning : Colors.error, fontWeight: 'bold' }}>
                          Status: {session.status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: Colors.error, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 }}
                      onPress={() => {
                        Alert.alert(
                          'Delete Session',
                          'Are you sure you want to delete this session?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session.id) }
                          ]
                        );
                      }}
                    >
                      <Text style={{ color: Colors.white, fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
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
                      <View style={styles.nameAndChatContainer}>
                        <View style={styles.nameContainer}>
                          <Text style={styles.psychologistName}>{expert.name}</Text>
                          <Text style={styles.expertId}>Expert ID: {expert.registration_number || expert.id}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={() => {
                            router.push(`./chat?expertId=${expert.registration_number || expert.id}&expertName=${expert.name}&userType=expert`);
                          }}
                        >
                          <Text style={styles.chatButtonText}>💬 Chat</Text>
                        </TouchableOpacity>
                      </View>
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
                      <View style={styles.nameAndChatContainer}>
                        <View style={styles.nameContainer}>
                          <Text style={styles.psychologistName}>{peerListener.name}</Text>
                          <Text style={styles.expertId}>Student ID: {peerListener.student_id || peerListener.id}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={() => {
                            router.push(`./chat?peerId=${peerListener.student_id || peerListener.id}&peerName=${peerListener.name}&userType=peer`);
                          }}
                        >
                          <Text style={styles.chatButtonText}>💬 Chat</Text>
                        </TouchableOpacity>
                      </View>
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
    backgroundColor: Colors.background,
  },
  backButton: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 15,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Colors.text,
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
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  // Connection buttons styles
  connectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  connectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  connectionButton: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  connectionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  connectionIconImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  connectionButtonText: {
    color: Colors.primary,
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
    color: Colors.text,
  },
  modalCloseButton: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
    marginTop: 10,
  },
  // Psychologist card styles
  psychologistCard: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.accentLight,
    borderColor: Colors.primary,
  },
  psychologistInfo: {
    flex: 1,
  },
  psychologistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  psychologistSpecialization: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  psychologistDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expertId: {
    fontSize: 14,
    color: Colors.primary,
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
    color: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '13%',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDateButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 2,
  },
  selectedDateText: {
    color: Colors.white,
  },
  // Time slots styles
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeSlot: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    width: '30%',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeSlot: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bookedTimeSlot: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
    borderWidth: 2,
    opacity: 0.6,
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
    color: Colors.text,
  },
  selectedTimeText: {
    color: Colors.white,
  },
  bookedTimeText: {
    color: Colors.accent,
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
    backgroundColor: Colors.primary,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookButtonText: {
    color: Colors.white,
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
    color: Colors.text,
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
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 15,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  debugCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#F57F17',
    marginBottom: 10,
  },
  debugButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nameAndChatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  chatButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
