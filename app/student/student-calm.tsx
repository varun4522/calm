import AsyncStorage from '@react-native-async-storage/async-storage';
import {  useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useGetProfileList, useProfile } from '@/api/Profile';

// Helper function to format date to YYYY-MM-DD in local timezone (no UTC conversion)
const formatDateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StudentCalm() {
  const router = useRouter();
  const { session } = useAuth();
  const { data: profile } = useProfile(session?.user.id);

  const [showPsychologistModal, setShowPsychologistModal] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<string | null>(null);
  const [bookingMode, setBookingMode] = useState<'online' | 'offline' | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<any[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Peer listener modal state
  const [showPeerListenerModal, setShowPeerListenerModal] = useState(false);
  const [selectedPeerListener, setSelectedPeerListener] = useState<string | null>(null);
  const [selectedPeerDate, setSelectedPeerDate] = useState<string | null>(null);
  const [selectedPeerTime, setSelectedPeerTime] = useState<string | null>(null);
  const [availablePeerTimeSlots, setAvailablePeerTimeSlots] = useState<any[]>([]);
  const [loadingPeerTimeSlots, setLoadingPeerTimeSlots] = useState(false);

  const {data: experts, isLoading: loadingExperts} = useGetProfileList("EXPERT");
  const {data: peerListeners, isLoading: loadingPeerListeners} = useGetProfileList("PEER");

  const [bookedSessions, setBookedSessions] = useState<string[]>([]);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadBookedSessions(); // Load booked sessions when component mounts
    loadSessionHistory(); // Load session history when component mounts
  }, [profile]);

  // Load booked sessions from Supabase
  const loadBookedSessions = async () => {
    try {
      // Query Supabase for all booked sessions
      const { data: sessions, error } = await supabase
        .from('book_request')
        .select('expert_registration_number, session_date, session_time')
        .eq('status', 'approved'); // Only approved bookings count as unavailable

      if (error) {
        console.error('Error loading booked sessions:', error);
        return;
      }

      const bookedSlots = sessions?.map(session =>
        `${session.expert_registration_number}_${session.session_date}_${session.session_time}`
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
      
      // Query Supabase for user's booked sessions - use only book_request table
      const { data: sessions, error } = await supabase
        .from('book_request')
        .select('*')
        .eq('student_id', profile?.id)
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
      // First, get the session details to check time and update expert_schedule if needed
      const { data: sessionData, error: fetchError } = await supabase
        .from('book_request')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching session details:', fetchError);
        Alert.alert('Error', 'Failed to fetch session details. Please try again.');
        return;
      }

      if (!sessionData) {
        Alert.alert('Error', 'Session not found.');
        return;
      }

      // Check if session is within 30 minutes
      const now = new Date();
      const sessionDate = new Date(sessionData.session_date);

      // Parse session time
      const timeMatch = sessionData.session_time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }

        sessionDate.setHours(hours, minutes, 0, 0);

        // Calculate time difference in minutes
        const timeDiffMs = sessionDate.getTime() - now.getTime();
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

        // Check if session has already started or passed
        if (timeDiffMinutes < 0) {
          Alert.alert(
            'Cannot Cancel',
            'This session has already started or passed. You cannot cancel it now.'
          );
          return;
        }

        // Check if within 30 minutes
        if (timeDiffMinutes < 30) {
          Alert.alert(
            'Cannot Cancel',
            `You cannot cancel a session starting in less than 30 minutes.\n\nTime remaining: ${timeDiffMinutes} minute${timeDiffMinutes !== 1 ? 's' : ''}.\n\nCancellations must be made at least 30 minutes before the session.`
          );
          return;
        }
      }

      // Confirm deletion
      Alert.alert(
        'Cancel Session',
        `Are you sure you want to cancel this session?\n\nExpert: ${sessionData.expert_name}\nDate: ${new Date(sessionData.session_date).toLocaleDateString()}\nTime: ${sessionData.session_time}\nStatus: ${sessionData.status}`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              // Delete the booking request
              const { error: deleteError } = await supabase
                .from('book_request')
                .delete()
                .eq('id', sessionId);

              if (deleteError) {
                console.error('Error deleting session:', deleteError);
                Alert.alert('Error', 'Failed to cancel session. Please try again.');
                return;
              }

              // If the session was approved, free the slot in expert_schedule
              if (sessionData.status === 'approved') {
                console.log('Freeing expert schedule slot for cancelled approved session');

                // Convert time format from "HH:MM AM/PM" to "HH:MM:SS"
                const convertTimeFormat = (timeStr: string): string => {
                  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                  if (!match) return timeStr;

                  let hours = parseInt(match[1]);
                  const minutes = match[2];
                  const period = match[3].toUpperCase();

                  if (period === 'PM' && hours !== 12) {
                    hours += 12;
                  } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                  }

                  return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
                };

                const startTime = convertTimeFormat(sessionData.session_time);

                // Update expert_schedule to free the slot
                const { error: scheduleError } = await supabase
                  .from('expert_schedule')
                  .update({
                    is_available: true,
                    booked_by: null
                  })
                  .eq('expert_registration_number', sessionData.expert_registration_number)
                  .eq('date', sessionData.session_date)
                  .eq('start_time', startTime);

                if (scheduleError) {
                  console.error('Warning: Could not free schedule slot:', scheduleError);
                  console.log('Session cancelled but schedule slot update failed');
                } else {
                  console.log('Successfully freed the time slot in expert schedule');
                }
              }

              Alert.alert('✅ Success', 'Session cancelled successfully. The time slot has been freed for other students.');
              // Reload session history to reflect changes
              loadSessionHistory();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in deleteSession:', error);
      Alert.alert('Error', 'Failed to cancel session. Please try again.');
    }
  };

  // Check if a session is booked
  const isSessionBooked = (expertId: string, date: string, time: string) => {
    const sessionKey = `${expertId}_${date}_${time}`;
    return bookedSessions.includes(sessionKey);
  };

  // Load available time slots from expert_schedule table
  const loadAvailableTimeSlots = async (expertRegistration: string, date: string) => {
    setLoadingTimeSlots(true);
    try {
      console.log('Loading time slots for expert:', expertRegistration, 'on date:', date);

      const { data: slots, error } = await supabase
        .from('expert_schedule')
        .select('*')
        .eq('expert_registration_number', expertRegistration)
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading time slots:', error);
        console.error('Error details:', error.message, error.details);
        setAvailableTimeSlots([]);
        Alert.alert('Error', `Failed to load time slots: ${error.message}`);
      } else {
        console.log('Time slots loaded successfully:', slots?.length || 0, 'slots');
        console.log('Slot details:', JSON.stringify(slots, null, 2));

        // Process slots based on current time
        const now = new Date();

        // Process slots and handle past time slots
        const processedSlots = slots || [];
        const bookedSlotsToFree: any[] = [];
        const unbookedSlotsToExpire: any[] = [];

        processedSlots.forEach(slot => {
          if (!slot.date || !slot.start_time) return;

          // Parse start time (HH:MM:SS format)
          const [startHours, startMinutes] = slot.start_time.split(':').map(Number);
          const slotStartDateTime = new Date(slot.date);
          slotStartDateTime.setHours(startHours, startMinutes, 0, 0);

          // Check if slot start time has passed or started
          const hasStarted = now >= slotStartDateTime;

          if (hasStarted) {
            // Case 1: Slot was booked and session ended - free it for future bookings
            if (!slot.is_available && slot.booked_by && slot.end_time) {
              const [endHours, endMinutes] = slot.end_time.split(':').map(Number);
              const slotEndDateTime = new Date(slot.date);
              slotEndDateTime.setHours(endHours, endMinutes, 0, 0);

              if (now > slotEndDateTime) {
                console.log(`Past booked session ended - freeing slot: ${slot.date} ${slot.start_time}-${slot.end_time}`);
                bookedSlotsToFree.push(slot.id);
                slot.is_available = true;
                slot.booked_by = null;
              }
            }
            // Case 2: Slot was available but time has started/passed - mark as expired
            else if (slot.is_available && !slot.booked_by) {
              console.log(`Unbooked slot expired - marking unavailable: ${slot.date} ${slot.start_time}`);
              unbookedSlotsToExpire.push(slot.id);
              slot.is_available = false;
              slot.booked_by = null;
            }
          }
        });

        // Update database for past booked slots (free them)
        if (bookedSlotsToFree.length > 0) {
          console.log(`Freeing ${bookedSlotsToFree.length} completed sessions`);
          supabase
            .from('expert_schedule')
            .update({ is_available: true, booked_by: null })
            .in('id', bookedSlotsToFree)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error freeing past slots:', updateError);
              } else {
                console.log('Successfully freed past booked slots');
              }
            });
        }

        // Update database for unbooked expired slots (mark unavailable)
        if (unbookedSlotsToExpire.length > 0) {
          console.log(`Expiring ${unbookedSlotsToExpire.length} unbooked past slots`);
          supabase
            .from('expert_schedule')
            .update({ is_available: false, booked_by: null })
            .in('id', unbookedSlotsToExpire)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error expiring unbooked slots:', updateError);
              } else {
                console.log('Successfully expired unbooked past slots');
              }
            });
        }

        setAvailableTimeSlots(processedSlots);

        if (!slots || slots.length === 0) {
          Alert.alert('No Slots', 'This expert has not set up any time slots for the selected date. Please choose a different date or contact the expert.');
        }
      }
    } catch (error) {
      console.error('Error in loadAvailableTimeSlots:', error);
      setAvailableTimeSlots([]);
      Alert.alert('Error', 'An error occurred while loading time slots.');
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Load available time slots for peer listeners from student_schedule table
  const loadAvailablePeerTimeSlots = async (peerRegistration: string, date: string) => {
    setLoadingPeerTimeSlots(true);
    try {
      console.log('Loading time slots for peer listener:', peerRegistration, 'on date:', date);

      const { data: slots, error } = await supabase
        .from('student_schedule')
        .select('*')
        .eq('peer_registration_number', peerRegistration)
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading peer time slots:', error);
        console.error('Error details:', error.message, error.details);
        setAvailablePeerTimeSlots([]);
        Alert.alert('Error', `Failed to load time slots: ${error.message}`);
      } else {
        console.log('Peer time slots loaded successfully:', slots?.length || 0, 'slots');
        console.log('Peer slot details:', JSON.stringify(slots, null, 2));

        // Process slots based on current time
        const now = new Date();

        // Process slots and handle past time slots
        const processedSlots = slots || [];
        const bookedSlotsToFree: any[] = [];
        const unbookedSlotsToExpire: any[] = [];

        processedSlots.forEach(slot => {
          if (!slot.date || !slot.start_time) return;

          // Parse start time (HH:MM or HH:MM:SS format)
          const timeParts = slot.start_time.split(':').map(Number);
          const startHours = timeParts[0];
          const startMinutes = timeParts[1];
          const slotStartDateTime = new Date(slot.date);
          slotStartDateTime.setHours(startHours, startMinutes, 0, 0);

          // Check if slot start time has passed or started
          const hasStarted = now >= slotStartDateTime;

          if (hasStarted) {
            // Case 1: Slot was booked and session ended - free it for future bookings
            if (!slot.is_available && slot.booked_by && slot.end_time) {
              const endTimeParts = slot.end_time.split(':').map(Number);
              const endHours = endTimeParts[0];
              const endMinutes = endTimeParts[1];
              const slotEndDateTime = new Date(slot.date);
              slotEndDateTime.setHours(endHours, endMinutes, 0, 0);

              if (now > slotEndDateTime) {
                console.log(`Past booked peer session ended - freeing slot: ${slot.date} ${slot.start_time}-${slot.end_time}`);
                bookedSlotsToFree.push(slot.id);
                slot.is_available = true;
                slot.booked_by = null;
              }
            }
            // Case 2: Slot was available but time has started/passed - mark as expired
            else if (slot.is_available && !slot.booked_by) {
              console.log(`Unbooked peer slot expired - marking unavailable: ${slot.date} ${slot.start_time}`);
              unbookedSlotsToExpire.push(slot.id);
              slot.is_available = false;
              slot.booked_by = null;
            }
          }
        });

        // Update database for past booked slots (free them)
        if (bookedSlotsToFree.length > 0) {
          console.log(`Freeing ${bookedSlotsToFree.length} completed peer sessions`);
          supabase
            .from('student_schedule')
            .update({ is_available: true, booked_by: null })
            .in('id', bookedSlotsToFree)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error freeing past peer slots:', updateError);
              } else {
                console.log('Successfully freed past booked peer slots');
              }
            });
        }

        // Update database for unbooked expired slots (mark unavailable)
        if (unbookedSlotsToExpire.length > 0) {
          console.log(`Expiring ${unbookedSlotsToExpire.length} unbooked past peer slots`);
          supabase
            .from('student_schedule')
            .update({ is_available: false, booked_by: null })
            .in('id', unbookedSlotsToExpire)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error expiring unbooked peer slots:', updateError);
              } else {
                console.log('Successfully expired unbooked past peer slots');
              }
            });
        }

        setAvailablePeerTimeSlots(processedSlots);

        if (!slots || slots.length === 0) {
          Alert.alert('No Slots', 'This peer listener has not set up any time slots for the selected date. Please choose a different date or contact the peer listener.');
        }
      }
    } catch (error) {
      console.error('Error in loadAvailablePeerTimeSlots:', error);
      setAvailablePeerTimeSlots([]);
      Alert.alert('Error', 'An error occurred while loading time slots.');
    } finally {
      setLoadingPeerTimeSlots(false);
    }
  };

  // Define available time slots
  const timeSlots = ['09:00 AM','10:00 AM','11:00 AM','01:00 PM','02:00 PM','03:00 PM','04:00 PM',  ];

  const getNext7Days = (): { dateString: string; displayDate: string; dayName: string }[] => {
    const days: { dateString: string; displayDate: string; dayName: string }[] = []; // Explicitly define the type
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        dateString: formatDateToLocalString(date),
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
    });
    }
    return days;
  };

  const bookSession = async () => {
    if (selectedPsychologist && selectedDate && selectedTime && bookingMode) {
      try {
        // Validate required student information
        if (!profile) {
          Alert.alert('Error', 'Student registration number is missing. Please log in again.');
          return;
        }

        // Check if the session is already booked before proceeding
        if (isSessionBooked(selectedPsychologist, selectedDate, selectedTime)) {
          Alert.alert('Session Unavailable', 'This time slot is already booked. Please select a different time.');
          return;
        }

        // Check if slot start time is within 30 minutes from now
        const now = new Date();
        const slotDateTime = new Date(selectedDate);

        // Parse time from "HH:MM AM/PM" format
        const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();

          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          slotDateTime.setHours(hours, minutes, 0, 0);

          // Calculate time difference in minutes
          const timeDiffMs = slotDateTime.getTime() - now.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

          if (timeDiffMinutes < 30) {
            if (timeDiffMinutes < 0) {
              Alert.alert(
                'Slot Expired',
                'This time slot has already started or passed. Please select a different time.'
              );
            } else {
              Alert.alert(
                'Booking Not Allowed',
                `You cannot book a session starting in less than 30 minutes.\n\nTime remaining: ${timeDiffMinutes} minute${timeDiffMinutes !== 1 ? 's' : ''}.\n\nPlease select a slot at least 30 minutes in advance.`
              );
            }
            return;
          }
        }

        // Find the selected expert details
        const expert = experts?.find(e => (e.registration_number || e.id) === selectedPsychologist);

        if (!expert) {
          Alert.alert('Error', 'Selected expert information not found. Please try again.');
          return;
        }

        // Create session request data for Supabase
        const sessionRequestData = {
          student_id: profile.id,
          student_name: profile.name,
          student_email: profile.email,
          student_course: profile.course,
          student_registration_number: profile.registration_number,
          expert_registration_number: expert?.registration_number || selectedPsychologist,
          expert_name: expert?.name || 'Unknown Expert',
          expert_id: expert?.id,
          session_date: selectedDate,
          session_time: selectedTime,
          booking_mode: bookingMode,
          status: 'pending',
        };

        console.log('Attempting to book session with data:', sessionRequestData);

        // Check for maximum active bookings (2 active sessions limit)
        // Only count future sessions that are pending or approved
        try {

          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id, status, expert_registration_number, expert_name, session_date, session_time')
            .eq('student_registration_number', profile.registration_number)
            .in('status', ['pending', 'approved']);

          if (activeError) {
            console.error('Error checking active sessions:', activeError);
            // Continue anyway - server-side validation will catch it
          } else if (activeSessions) {
            // Filter out past sessions
            const now = new Date();
            const futureSessions = activeSessions.filter(session => {
              const sessionDate = new Date(session.session_date);

              // Parse session time
              const timeMatch = session.session_time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const period = timeMatch[3].toUpperCase();

                if (period === 'PM' && hours !== 12) {
                  hours += 12;
                } else if (period === 'AM' && hours === 12) {
                  hours = 0;
                }

                sessionDate.setHours(hours, minutes, 0, 0);
              }

              // Only count future sessions
              return sessionDate > now;
            });

            console.log(`Student has ${futureSessions.length} future active sessions out of ${activeSessions.length} total active bookings`);

            if (futureSessions.length >= 2) {
              const sessionList = futureSessions.map((s, i) =>
                `${i + 1}. ${s.expert_name}\n   Date: ${new Date(s.session_date).toLocaleDateString()}\n   Time: ${s.session_time}\n   Status: ${s.status}`
              ).join('\n\n');

              Alert.alert(
                '⚠️ Maximum Active Sessions',
                `You can have a maximum of 2 active future sessions at a time.\n\nYou currently have ${futureSessions.length} active sessions:\n\n${sessionList}\n\nPlease wait for one session to complete or cancel it before booking another.`,
                [{ text: 'OK', style: 'default' }]
              );
              return;
            }
          }
        } catch (e) {
          console.warn('Error checking active sessions:', e);
          // Continue anyway - non-critical check
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
          student_name: profile.name,
          student_registration_number: profile.registration_number,
          student_email: profile.email,
          student_course: profile.course,
          expert_id: selectedPsychologist || expert?.id,
          expert_name: expert?.name,
          expert_registration_number: expert?.registration_number_number || selectedPsychologist,
          date: selectedDate,
          time: selectedTime,
          bookingMode: bookingMode,
          status: 'pending',
          requestedAt: new Date().toISOString(),
          notes: `Session booking request from ${profile.name}`
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
        setBookingMode(null);
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
          `• Mode: ${bookingMode === 'online' ? '🌐 Online' : '🏢 Offline'}\n` +
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
        if (!profile) {
          Alert.alert('Error', 'Student registration number is missing. Please log in again.');
          return;
        }

        // Check if the session is already booked before proceeding
        if (isSessionBooked(selectedPeerListener, selectedPeerDate, selectedPeerTime)) {
          Alert.alert('Session Unavailable', 'This time slot is already booked. Please select a different time.');
          return;
        }

        // Find the selected peer listener details
        const peerListener = peerListeners?.find(p => String(p.registration_number) === selectedPeerListener);

        if (!peerListener) {
          Alert.alert('Error', 'Selected peer listener information not found. Please try again.');
          return;
        }

        // Create session request data for Supabase
        const sessionRequestData = {
          student_id: profile.id,
          student_name: profile.name,
          student_registration_number: profile.registration_number,
          student_email: profile.email ,
          student_course: profile.course ,
          expert_id: peerListener.id,
          expert_registration_number: peerListener.registration_number,
          expert_name: peerListener?.name || 'Unknown Peer Listener',
          session_date: selectedPeerDate,
          session_time: selectedPeerTime,
          status: 'pending',
          session_type: 'peer_listener',
        };

        console.log('Attempting to book peer listener session with data:', sessionRequestData);

        // Guard: prevent more than 2 active sessions (pending or approved)
        try {
          const { data: activeSessions, error: activeError } = await supabase
            .from('book_request')
            .select('id,status,expert_id,expert_name,session_date,session_time')
            .eq('student_registration_number', profile.registration_number)
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
          student_name: profile.name,
          student_registration_number: profile.registration_number,
          student_email: profile.email,
          studentCourse: profile.course,
          peerListenerId: selectedPeerListener,
          peerListenerName: peerListener?.name || 'Unknown Peer Listener',
          peerListenerRegistrationNumber: peerListener.registration_number,
          date: selectedPeerDate,
          time: selectedPeerTime,
          status: 'pending',
          sessionType: 'peer_listener',
          requestedAt: new Date().toISOString(),
          notes: `Peer listener session booking request from ${profile.name}`
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
          `• Registration Number: ${peerListener.registration_number}\n` +
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
            <View>
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
            </View>
          )}
        </View>
      </ScrollView>

      {/* Psychologist Booking Modal */}
      <Modal
        visible={showPsychologistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPsychologistModal(false);
          setSelectedPsychologist(null);
          setSelectedDate(null);
          setSelectedTime(null);
          setAvailableTimeSlots([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Session with Psychologist</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPsychologistModal(false);
                  setSelectedPsychologist(null);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setAvailableTimeSlots([]);
                }}
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
              ) : experts?.length === 0 ? (
                <Text style={styles.emptyText}>No experts available at the moment.</Text>
              ) : (
                experts?.map((expert) => (
                  <TouchableOpacity
                    key={expert.id || expert.registration_number}
                    style={[
                      styles.psychologistCard,
                      selectedPsychologist === (expert.registration_number || expert.id) && styles.selectedPsychologistCard
                    ]}
                    onPress={() => {
                      setSelectedPsychologist(expert.registration_number || expert.id);
                      // Reset date and time slots when changing expert
                      setSelectedDate(null);
                      setSelectedTime(null);
                      setAvailableTimeSlots([]);
                    }}
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

              {/* Booking Mode Selection */}
              {selectedPsychologist && (
                <>
                  <Text style={styles.sectionTitle}>Select Booking Mode</Text>
                  <View style={styles.bookingModeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.bookingModeButton,
                        bookingMode === 'online' && styles.selectedBookingMode
                      ]}
                      onPress={() => setBookingMode('online')}
                    >
                      <Text style={[
                        styles.bookingModeIcon,
                        bookingMode === 'online' && styles.selectedBookingModeText
                      ]}>🌐</Text>
                      <Text style={[
                        styles.bookingModeText,
                        bookingMode === 'online' && styles.selectedBookingModeText
                      ]}>Online</Text>
                      {bookingMode === 'online' && (
                        <Text style={styles.selectedBookingIcon}>✓</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bookingModeButton,
                        bookingMode === 'offline' && styles.selectedBookingMode
                      ]}
                      onPress={() => setBookingMode('offline')}
                    >
                      <Text style={[
                        styles.bookingModeIcon,
                        bookingMode === 'offline' && styles.selectedBookingModeText
                      ]}>🏢</Text>
                      <Text style={[
                        styles.bookingModeText,
                        bookingMode === 'offline' && styles.selectedBookingModeText
                      ]}>Offline</Text>
                      {bookingMode === 'offline' && (
                        <Text style={styles.selectedBookingIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Calendar */}
              {selectedPsychologist && bookingMode && (
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
                        onPress={() => {
                          setSelectedDate(day.dateString);
                          setSelectedTime(null); // Reset selected time
                          if (selectedPsychologist) {
                            loadAvailableTimeSlots(selectedPsychologist, day.dateString);
                          }
                        }}
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
              {selectedPsychologist && bookingMode && selectedDate && (
                <>
                  <Text style={styles.sectionTitle}>Available Time Slots</Text>

                  {loadingTimeSlots ? (
                    <Text style={styles.loadingText}>Loading time slots...</Text>
                  ) : availableTimeSlots.length === 0 ? (
                    <View style={styles.emptySlotContainer}>
                      <Text style={styles.emptyText}>No time slots available for this date.</Text>
                      <Text style={styles.emptySubText}>Please select a different date or contact the expert directly.</Text>
                    </View>
                  ) : (
                    <>
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
                        {availableTimeSlots.map((slot) => {
                          // Format time from database (HH:MM:SS to HH:MM AM/PM)
                          const formatTime = (timeString: string) => {
                            const [hours, minutes] = timeString.split(':');
                            const hour = parseInt(hours);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                            return `${displayHour}:${minutes} ${ampm}`;
                          };

                          const timeDisplay = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
                          const timeKey = formatTime(slot.start_time);
                          const isSelected = selectedTime === timeKey;
                          const isAvailable = slot.is_available;

                          return (
                            <TouchableOpacity
                              key={slot.id}
                              style={[
                                styles.timeSlot,
                                !isAvailable && styles.bookedTimeSlot,
                                isSelected && styles.selectedTimeSlot,
                                !isAvailable && { opacity: 0.6 }
                              ]}
                              onPress={() => {
                                if (!isAvailable) {
                                  Alert.alert(
                                    'Slot Not Available',
                                    'This time slot is already booked. Please select a different time.',
                                    [{ text: 'OK' }]
                                  );
                                } else {
                                  setSelectedTime(timeKey);
                                }
                              }}
                              disabled={!isAvailable}
                            >
                              <View style={styles.timeSlotContent}>
                                <Text style={[
                                  styles.timeText,
                                  !isAvailable && styles.bookedTimeText,
                                  isSelected && styles.selectedTimeText
                                ]}>
                                  {timeDisplay}
                                </Text>
                                <View style={[
                                  styles.statusDot,
                                  !isAvailable && styles.bookedStatusDot,
                                  { backgroundColor: !isAvailable ? '#f44336' : (isSelected ? '#2196f3' : '#4caf50') }
                                ]} />
                                {!isAvailable && (
                                  <Text style={styles.bookedIndicatorText}>❌</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Book Button */}
              {selectedPsychologist && bookingMode && selectedDate && selectedTime && (
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
          setAvailablePeerTimeSlots([]);
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
                  setAvailablePeerTimeSlots([]);
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
              ) : peerListeners?.length === 0 ? (
                <Text style={styles.emptyText}>No peer listeners available at the moment.</Text>
              ) : (
                peerListeners?.map((peerListener) => (
                  <TouchableOpacity
                    key={peerListener.id}
                    style={[
                      styles.psychologistCard,
                      selectedPeerListener === String(peerListener.registration_number) && styles.selectedPsychologistCard
                    ]}
                    onPress={() => setSelectedPeerListener(String(peerListener.registration_number))}
                  >
                    <View style={styles.psychologistInfo}>
                      <View style={styles.nameAndChatContainer}>
                        <View style={styles.nameContainer}>
                          <Text style={styles.psychologistName}>{peerListener.name}</Text>
                          <Text style={styles.expertId}>Registration: {peerListener.registration_number}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={() => {
                            router.push(`./chat?peerId=${peerListener.id}&peerName=${peerListener.name}&userType=peer`);
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
                    {selectedPeerListener === String(peerListener.registration_number) && (
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
                        onPress={() => {
                          setSelectedPeerDate(day.dateString);
                          setSelectedPeerTime(null);
                          setAvailablePeerTimeSlots([]);
                          // Load time slots when date is selected
                          loadAvailablePeerTimeSlots(selectedPeerListener, day.dateString);
                        }}
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

                  {loadingPeerTimeSlots ? (
                    <ActivityIndicator size="large" color={Colors.primary} />
                  ) : availablePeerTimeSlots.length === 0 ? (
                    <Text style={styles.emptyText}>No time slots available for this date. Please select another date.</Text>
                  ) : (
                    <>
                      <View style={styles.timeSlotsContainer}>
                        {availablePeerTimeSlots.map((slot) => {
                          const displayTime = slot.start_time?.substring(0, 5) || slot.start_time;
                          const isAvailable = slot.is_available && !slot.booked_by;
                          const isSelected = selectedPeerTime === displayTime;
                          
                          return (
                            <TouchableOpacity
                              key={slot.id}
                              style={[
                                styles.timeSlot,
                                !isAvailable && styles.bookedTimeSlot,
                                isSelected && styles.selectedTimeSlot,
                                !isAvailable && { opacity: 0.5 }
                              ]}
                              onPress={() => {
                                if (!isAvailable) {
                                  Alert.alert(
                                    'Session Unavailable',
                                    'This time slot is already booked or unavailable. Please select a different time.',
                                    [{ text: 'OK' }]
                                  );
                                } else {
                                  setSelectedPeerTime(displayTime);
                                }
                              }}
                              disabled={!isAvailable}
                            >
                              <View style={styles.timeSlotContent}>
                                <Text style={[
                                  styles.timeText,
                                  !isAvailable && styles.bookedTimeText,
                                  isSelected && styles.selectedTimeText
                                ]}>
                                  {displayTime}
                                </Text>
                                <View style={[
                                  styles.statusDot,
                                  !isAvailable && styles.bookedStatusDot,
                                  { backgroundColor: !isAvailable ? '#f44336' : (isSelected ? '#2196f3' : '#4caf50') }
                                ]} />
                                {!isAvailable && (
                                  <Text style={styles.bookedIndicatorText}>❌</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
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
  emptySlotContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptySubText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  selectedIcon: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  // Booking mode styles
  bookingModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  bookingModeButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  selectedBookingMode: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  bookingModeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  bookingModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedBookingModeText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  selectedBookingIcon: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
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